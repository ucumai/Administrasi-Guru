import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  PackageSearch, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  Edit, 
  Package, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  FileUp, 
  Check, 
  AlertCircle, 
  MinusCircle, 
  Calendar, 
  Info,
  Layers,
  User as UserIcon,
  Tag,
  History
} from "lucide-react";
import { BhpKelas, PemakaianBhp, User, Pengaturan, StatusBhp } from "../types";
import { saveDocument, batchSaveDocuments, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses } from "../lib/accessControl";
import { getLocalDateStr } from "../lib/dateUtils";
import { KopSuratDinas } from "./KopSuratDinas";

interface StokOpnameBhpViewProps {
  bhpList: BhpKelas[];
  pemakaianList: PemakaianBhp[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const StokOpnameBhpView: React.FC<StokOpnameBhpViewProps> = ({
  bhpList,
  pemakaianList,
  config,
  currentUser
}) => {
  const allowedClasses = getAllowedClasses(currentUser);
  const isAdmin = currentUser?.role === "admin";
  const isGuruKelas = currentUser?.role === "guru_kelas";

  const [selectedKelas, setSelectedKelas] = useState<string>(
    isAdmin ? "Semua" : (allowedClasses[0] || "Kelas 1")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [activeTab, setActiveTab] = useState<"stok" | "pemakaian">("stok");

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BhpKelas | null>(null);

  // Item Form State
  const [idBarang, setIdBarang] = useState("");
  const [tanggalTerima, setTanggalTerima] = useState(() => getLocalDateStr());
  const [namaBarang, setNamaBarang] = useState("");
  const [itemKelas, setItemKelas] = useState(allowedClasses[0] || "Kelas 1");
  const [jumlahStok, setJumlahStok] = useState<number | "">(10);
  const [satuan, setSatuan] = useState("Pcs");
  const [keterangan, setKeterangan] = useState("");

  // Usage (Pemakaian) Form State
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [selectedBhpId, setSelectedBhpId] = useState("");
  const [usageTanggal, setUsageTanggal] = useState(() => getLocalDateStr());
  const [usageJumlah, setUsageJumlah] = useState<number | "">(1);
  const [usageKeterangan, setUsageKeterangan] = useState("");
  const [usagePenginput, setUsagePenginput] = useState(currentUser?.name || config.Nama_Guru || "Guru Kelas");

  // Import Excel State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewList, setImportPreviewList] = useState<BhpKelas[]>([]);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Access Guard
  if (!isAdmin && !isGuruKelas) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
        <PackageSearch className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Akses Terbatas</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Fitur Stok Opname Barang Habis Pakai (BHP) Kelas hanya dapat diakses oleh Admin Sekolah dan Guru Kelas.
        </p>
      </div>
    );
  }

  // Filter BHP Items
  const filteredBhpList = bhpList.filter((item) => {
    const matchKelas = selectedKelas === "Semua" || item.kelas === selectedKelas;
    const matchSearch = 
      item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.idBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.keterangan || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
    return matchKelas && matchSearch && matchStatus;
  });

  // Filter Usage Records
  const filteredPemakaianList = pemakaianList.filter((item) => {
    const matchKelas = selectedKelas === "Semua" || item.kelas === selectedKelas;
    const matchSearch = 
      item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.idBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.keterangan || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.namaPenginput || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchKelas && matchSearch;
  });

  // Open Add Item Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    const nextNum = bhpList.length + 1;
    setIdBarang(`BHP-${nextNum.toString().padStart(3, "0")}`);
    setTanggalTerima(getLocalDateStr());
    setNamaBarang("");
    setItemKelas(selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas);
    setJumlahStok(10);
    setSatuan("Pcs");
    setKeterangan("");
    setIsItemModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditModal = (item: BhpKelas) => {
    setEditingItem(item);
    setIdBarang(item.idBarang);
    setTanggalTerima(item.tanggalTerima);
    setNamaBarang(item.namaBarang);
    setItemKelas(item.kelas);
    setJumlahStok(item.jumlahStok);
    setSatuan(item.satuan || "Pcs");
    setKeterangan(item.keterangan || "");
    setIsItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang.trim()) {
      alert("Nama barang wajib diisi!");
      return;
    }

    const numericStok = Number(jumlahStok) || 0;
    const computedStatus: StatusBhp = numericStok > 0 ? "Tersedia" : "Habis";

    const payload: BhpKelas = {
      id: editingItem ? editingItem.id : `bhp_${Date.now()}`,
      idBarang: idBarang.trim() || `BHP-${Date.now().toString().slice(-4)}`,
      tanggalTerima,
      namaBarang: namaBarang.trim(),
      kelas: itemKelas,
      jumlahStok: Math.max(0, numericStok),
      satuan: satuan.trim() || "Pcs",
      status: computedStatus,
      keterangan: keterangan.trim(),
      updatedAt: Date.now()
    };

    try {
      await saveDocument(COLLECTIONS.BHP_KELAS, payload.id, payload);
      setIsItemModalOpen(false);
    } catch (err) {
      alert("Gagal menyimpan data barang BHP: " + err);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data BHP "${nama}"?`)) {
      try {
        await deleteDocument(COLLECTIONS.BHP_KELAS, id);
      } catch (err) {
        alert("Gagal menghapus data: " + err);
      }
    }
  };

  // Open Usage (Pemakaian) Modal
  const handleOpenUsageModal = (targetItem?: BhpKelas) => {
    const defaultItem = targetItem || filteredBhpList.find((i) => i.jumlahStok > 0) || bhpList[0];
    if (defaultItem) {
      setSelectedBhpId(defaultItem.id);
    } else {
      setSelectedBhpId("");
    }
    setUsageTanggal(getLocalDateStr());
    setUsageJumlah(1);
    setUsageKeterangan("");
    setUsagePenginput(currentUser?.name || config.Nama_Guru || "Guru Kelas");
    setIsUsageModalOpen(true);
  };

  // Save Pemakaian (Input Usage & Deduct Stock)
  const handleSaveUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBhpId) {
      alert("Pilih barang BHP terlebih dahulu!");
      return;
    }

    const targetBhp = bhpList.find((b) => b.id === selectedBhpId);
    if (!targetBhp) {
      alert("Barang BHP tidak ditemukan!");
      return;
    }

    const numericJumlah = Number(usageJumlah) || 0;
    if (numericJumlah <= 0) {
      alert("Jumlah pemakaian harus lebih dari 0!");
      return;
    }

    if (numericJumlah > targetBhp.jumlahStok) {
      alert(`Stok tidak mencukupi! Stok ${targetBhp.namaBarang} saat ini hanya sisa ${targetBhp.jumlahStok} ${targetBhp.satuan}.`);
      return;
    }

    const remainingStok = targetBhp.jumlahStok - numericJumlah;
    const newStatus: StatusBhp = remainingStok > 0 ? "Tersedia" : "Habis";

    // Create Pemakaian Log
    const usagePayload: PemakaianBhp = {
      id: `pmp_${Date.now()}`,
      idBhp: targetBhp.id,
      idBarang: targetBhp.idBarang,
      namaBarang: targetBhp.namaBarang,
      kelas: targetBhp.kelas,
      tanggal: usageTanggal,
      jumlahDipakai: numericJumlah,
      satuan: targetBhp.satuan || "Pcs",
      keterangan: usageKeterangan.trim(),
      namaPenginput: usagePenginput.trim() || currentUser?.name || "Guru Kelas",
      updatedAt: Date.now()
    };

    // Update BHP Item Stock
    const updatedBhp: BhpKelas = {
      ...targetBhp,
      jumlahStok: remainingStok,
      status: newStatus,
      updatedAt: Date.now()
    };

    try {
      await saveDocument(COLLECTIONS.PEMAKAIAN_BHP, usagePayload.id, usagePayload);
      await saveDocument(COLLECTIONS.BHP_KELAS, updatedBhp.id, updatedBhp);
      setIsUsageModalOpen(false);
      alert(`Pemakaian ${numericJumlah} ${targetBhp.satuan} ${targetBhp.namaBarang} berhasil dicatat. Sisa stok: ${remainingStok} ${targetBhp.satuan}.`);
    } catch (err) {
      alert("Gagal mencatat pemakaian BHP: " + err);
    }
  };

  // Delete Pemakaian Record (Optionally restore stock)
  const handleDeletePemakaian = async (item: PemakaianBhp) => {
    const shouldRestore = confirm(
      `Hapus catatan pemakaian "${item.namaBarang}" sebanyak ${item.jumlahDipakai} ${item.satuan}?\n\nKlik OK untuk mengembalikan stok ke inventaris, atau Cancel jika tidak ingin mengembalikan stok.`
    );

    try {
      if (shouldRestore) {
        const targetBhp = bhpList.find((b) => b.id === item.idBhp || b.idBarang === item.idBarang);
        if (targetBhp) {
          const restoredStok = targetBhp.jumlahStok + item.jumlahDipakai;
          await saveDocument(COLLECTIONS.BHP_KELAS, targetBhp.id, {
            ...targetBhp,
            jumlahStok: restoredStok,
            status: restoredStok > 0 ? "Tersedia" : "Habis",
            updatedAt: Date.now()
          });
        }
      }
      await deleteDocument(COLLECTIONS.PEMAKAIAN_BHP, item.id);
    } catch (err) {
      alert("Gagal menghapus riwayat pemakaian: " + err);
    }
  };

  // Excel Download Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID Barang": "BHP-001",
        "Tanggal Terima": new Date().toISOString().split("T")[0],
        "Nama Barang": "Kertas HVS A4 80gr PaperOne",
        "Kelas": selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas,
        "Jumlah Stok": 5,
        "Satuan": "Rim",
        "Status Barang": "Tersedia",
        "Keterangan": "Untuk cetak soal ujian dan administrasi"
      },
      {
        "ID Barang": "BHP-002",
        "Tanggal Terima": new Date().toISOString().split("T")[0],
        "Nama Barang": "Spidol Hitam Boardmarker Snowman",
        "Kelas": selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas,
        "Jumlah Stok": 12,
        "Satuan": "Pcs",
        "Status Barang": "Tersedia",
        "Keterangan": "Perlengkapan mengajar harian"
      },
      {
        "ID Barang": "BHP-003",
        "Tanggal Terima": new Date().toISOString().split("T")[0],
        "Nama Barang": "Kertas Lipat Origami 15x15",
        "Kelas": selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas,
        "Jumlah Stok": 0,
        "Satuan": "Pak",
        "Status Barang": "Habis",
        "Keterangan": "Praktek Hasta Karya SBdP"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 35 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 15 },
      { wch: 38 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template BHP");
    const fileName = `Template_Import_BHP_${(selectedKelas === "Semua" ? "Umum" : selectedKelas).replace(/\s+/g, "_")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Handle Upload Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

        if (rawRows.length === 0) {
          alert("File Excel kosong atau format tidak sesuai.");
          return;
        }

        const parsed: BhpKelas[] = rawRows.map((row, idx) => {
          const getVal = (possibleKeys: string[]) => {
            for (const key of Object.keys(row)) {
              if (possibleKeys.some((p) => p.toLowerCase() === key.trim().toLowerCase())) {
                return String(row[key] || "").trim();
              }
            }
            return "";
          };

          const idBarang = getVal(["ID Barang", "idBarang", "Kode", "ID"]) || `BHP-${(bhpList.length + idx + 1).toString().padStart(3, "0")}`;
          const tanggalTerima = getVal(["Tanggal Terima", "tanggalTerima", "Tanggal", "Tgl Terima"]) || new Date().toISOString().split("T")[0];
          const namaBarang = getVal(["Nama Barang", "namaBarang", "Nama", "Barang"]) || `Barang BHP ${idx + 1}`;
          const rawKelas = getVal(["Kelas", "kelas", "Ruangan"]);
          const kelas = rawKelas || (selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas);
          
          const rawStok = getVal(["Jumlah Stok", "jumlahStok", "Stok", "Jumlah", "Qty"]);
          const jumlahStokNum = Math.max(0, Number(rawStok) || 0);
          const satuan = getVal(["Satuan", "satuan", "Unit"]) || "Pcs";

          const rawStatus = getVal(["Status Barang", "statusBarang", "Status"]);
          let status: StatusBhp = jumlahStokNum > 0 ? "Tersedia" : "Habis";
          if (["Tersedia", "Habis"].includes(rawStatus)) {
            status = rawStatus as StatusBhp;
          }

          const keterangan = getVal(["Keterangan", "keterangan", "Ket"]);

          return {
            id: `bhp_imp_${Date.now()}_${idx}`,
            idBarang,
            tanggalTerima,
            namaBarang,
            kelas,
            jumlahStok: jumlahStokNum,
            satuan,
            status,
            keterangan
          };
        });

        setImportPreviewList(parsed);
      } catch (err) {
        alert("Gagal membaca file Excel: " + err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save Bulk Import
  const handleSaveImport = async () => {
    if (importPreviewList.length === 0) return;
    setIsSubmittingImport(true);

    try {
      await batchSaveDocuments(COLLECTIONS.BHP_KELAS, importPreviewList);
      alert(`Berhasil mengimpor ${importPreviewList.length} item Barang Habis Pakai (BHP)!`);
      setIsImportModalOpen(false);
      setImportPreviewList([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert("Gagal menyimpan data import BHP: " + err);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Statistics
  const totalItems = filteredBhpList.length;
  const totalTersedia = filteredBhpList.filter((i) => i.status === "Tersedia").length;
  const totalHabis = filteredBhpList.filter((i) => i.status === "Habis").length;
  const totalPemakaian = filteredPemakaianList.length;

  return (
    <div className="space-y-6">
      {/* Printable CSS Header setup */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-bhp-area, #printable-bhp-area * {
            visibility: visible;
          }
          #printable-bhp-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 font-bold">
            <PackageSearch className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span>Stok Opname Barang Habis Pakai (BHP)</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {selectedKelas}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pencatatan inventaris, stok masuk, dan riwayat pemakaian barang habis pakai kelas
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang BHP</span>
          </button>

          <button
            onClick={() => handleOpenUsageModal()}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <MinusCircle className="w-4 h-4" />
            <span>Input Pemakaian BHP</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            title="Download Template Excel BHP"
            className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Template</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* STATISTICAL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{totalItems}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jenis BHP</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalTersedia}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stok Tersedia</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalHabis}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stok Habis</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalPemakaian}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riwayat Pemakaian</div>
          </div>
        </div>
      </div>

      {/* FILTER & TAB BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        {/* Tab Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab("stok")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === "stok"
                ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Daftar Stok Opname BHP ({filteredBhpList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pemakaian")}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === "pemakaian"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Pemakaian ({filteredPemakaianList.length})</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Select */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Kelas:</span>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {isAdmin && <option value="Semua">Semua Kelas</option>}
              {allowedClasses.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select (Only for Stok Tab) */}
          {activeTab === "stok" && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Tersedia">Tersedia</option>
                <option value="Habis">Habis</option>
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID / Nama Barang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* PRINTABLE AREA CONTAINER */}
      <div id="printable-bhp-area">
        {/* Printable Header Kop */}
        <div className="hidden print:block mb-6">
          <KopSuratDinas
            config={config}
            judul={activeTab === "stok" ? "LAPORAN STOK OPNAME BARANG HABIS PAKAI (BHP)" : "LAPORAN RIWAYAT PEMAKAIAN BARANG HABIS PAKAI (BHP)"}
            kelas={selectedKelas}
            tanggalCetak={new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          />
        </div>

        {/* TAB 1: DAFTAR STOK OPNAME BHP TABLE */}
        {activeTab === "stok" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black border-b border-slate-200 dark:border-slate-800">
                    <th className="py-4 px-4 text-center w-12">No</th>
                    <th className="py-4 px-4 w-28">ID Barang</th>
                    <th className="py-4 px-4 w-32">Tanggal Terima</th>
                    <th className="py-4 px-4">Nama Barang</th>
                    <th className="py-4 px-4 w-24">Kelas</th>
                    <th className="py-4 px-4 text-center w-28">Jumlah / Stok</th>
                    <th className="py-4 px-4 text-center w-32">Status Barang</th>
                    <th className="py-4 px-4">Keterangan</th>
                    <th className="py-4 px-4 text-center w-36 no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {filteredBhpList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-sm">Belum ada data Barang Habis Pakai (BHP)</p>
                        <p className="text-xs mt-1">Klik "Tambah Barang BHP" atau "Import Excel" untuk menambahkan data.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBhpList.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">{item.idBarang}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{item.tanggalTerima}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-800 dark:text-white">
                          {item.namaBarang}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                            {item.kelas}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-sm">
                          <span className={item.jumlahStok > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {item.jumlahStok} {item.satuan || "Pcs"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.status === "Tersedia" ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Tersedia</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>Habis</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.keterangan || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center no-print whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenUsageModal(item)}
                              disabled={item.jumlahStok <= 0}
                              title="Input Pemakaian Barang"
                              className="p-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 disabled:opacity-30 rounded-xl transition-all cursor-pointer font-bold text-[11px] flex items-center space-x-1"
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span>Pakai</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Item"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-600 dark:text-slate-300 hover:text-teal-600 rounded-xl transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(item.id, item.namaBarang)}
                              title="Hapus Item"
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: RIWAYAT PEMAKAIAN BHP TABLE */}
        {activeTab === "pemakaian" && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black border-b border-slate-200 dark:border-slate-800">
                    <th className="py-4 px-4 text-center w-12">No</th>
                    <th className="py-4 px-4 w-32">Tanggal Pemakaian</th>
                    <th className="py-4 px-4 w-28">ID Barang</th>
                    <th className="py-4 px-4">Nama Barang</th>
                    <th className="py-4 px-4 w-24">Kelas</th>
                    <th className="py-4 px-4 text-center w-28">Jumlah Dipakai</th>
                    <th className="py-4 px-4">Keterangan / Keperluan</th>
                    <th className="py-4 px-4 w-36">Penginput / Petugas</th>
                    <th className="py-4 px-4 text-center w-20 no-print">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {filteredPemakaianList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-sm">Belum ada riwayat pemakaian barang habis pakai</p>
                        <p className="text-xs mt-1">Klik "Input Pemakaian BHP" untuk mencatat pemakaian barang.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPemakaianList.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-white">
                          {item.tanggal}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">{item.idBarang}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-800 dark:text-white">
                          {item.namaBarang}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                            {item.kelas}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-black text-amber-600 dark:text-amber-400 text-sm">
                          -{item.jumlahDipakai} {item.satuan || "Pcs"}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs text-slate-600 dark:text-slate-300">
                          {item.keterangan || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200">
                          {item.namaPenginput || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center no-print whitespace-nowrap">
                          <button
                            onClick={() => handleDeletePemakaian(item)}
                            title="Hapus / Batalkan Pemakaian"
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-300 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Printable Signatures Footer */}
        <div className="hidden print:grid grid-cols-2 gap-8 mt-12 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-black underline">{config.Nama_Kepsek || "...................................."}</p>
            <p>NIP. {config.NIP_Kepsek || "...................................."}</p>
          </div>
          <div>
            <p>{config.Tempat_Tanda_Tangan || "Bogor"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="font-bold">Guru Kelas / Pengelola Inventaris</p>
            <div className="h-16"></div>
            <p className="font-black underline">{config.Nama_Guru || "...................................."}</p>
            <p>NIP. {config.NIP_Guru || "...................................."}</p>
          </div>
        </div>
      </div>

      {/* MODAL 1: TAMBAH / EDIT BARANG BHP */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  {editingItem ? "Edit Data Barang BHP" : "Tambah Barang Habis Pakai (BHP)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ID / Kode Barang
                  </label>
                  <input
                    type="text"
                    value={idBarang}
                    onChange={(e) => setIdBarang(e.target.value)}
                    placeholder="BHP-001"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Terima
                  </label>
                  <input
                    type="date"
                    value={tanggalTerima}
                    onChange={(e) => setTanggalTerima(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Barang Habis Pakai
                </label>
                <input
                  type="text"
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  placeholder="Misal: Kertas HVS A4 80gr, Spidol Boardmarker..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kelas / Lokasi
                  </label>
                  <select
                    value={itemKelas}
                    onChange={(e) => setItemKelas(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                  >
                    {allowedClasses.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={jumlahStok}
                    onChange={(e) => setJumlahStok(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-black"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="Pcs / Rim / Box"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Catatan
                </label>
                <textarea
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Catatan tambahan mengenai kondisi atau peruntukan barang..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Barang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INPUT PEMAKAIAN BHP */}
      {isUsageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <MinusCircle className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Input Pemakaian Barang Habis Pakai (BHP)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUsageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUsage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Barang BHP
                </label>
                <select
                  value={selectedBhpId}
                  onChange={(e) => setSelectedBhpId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold cursor-pointer"
                  required
                >
                  <option value="">-- Pilih Barang Habis Pakai --</option>
                  {bhpList
                    .filter((b) => selectedKelas === "Semua" || b.kelas === selectedKelas)
                    .map((b) => (
                      <option key={b.id} value={b.id} disabled={b.jumlahStok <= 0}>
                        [{b.idBarang}] {b.namaBarang} - {b.kelas} (Sisa Stok: {b.jumlahStok} {b.satuan}) {b.jumlahStok <= 0 ? " - [HABIS]" : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pemakaian
                  </label>
                  <input
                    type="date"
                    value={usageTanggal}
                    onChange={(e) => setUsageTanggal(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Barang Dipakai
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={usageJumlah}
                    onChange={(e) => setUsageJumlah(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-black"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Penginput / Petugas
                </label>
                <input
                  type="text"
                  value={usagePenginput}
                  onChange={(e) => setUsagePenginput(e.target.value)}
                  placeholder="Nama penginput..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Peruntukan Pemakaian
                </label>
                <textarea
                  value={usageKeterangan}
                  onChange={(e) => setUsageKeterangan(e.target.value)}
                  placeholder="Misal: Dipakai untuk praktek Seni Budaya, Ujian SBdP, Operasional kelas..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-medium"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUsageModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pemakaian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORT EXCEL DATA BHP */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Import Data Barang Habis Pakai (BHP) dari Excel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreviewList([]);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 text-emerald-900 dark:text-emerald-200">
                <p className="font-bold flex items-center space-x-1">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Petunjuk Format Excel BHP:</span>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Kolom wajib: <strong>ID Barang</strong>, <strong>Tanggal Terima</strong>, <strong>Nama Barang</strong>, <strong>Kelas</strong>, <strong>Jumlah Stok</strong>, <strong>Satuan</strong>, <strong>Status Barang</strong>, <strong>Keterangan</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shrink-0 shadow-xs cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template</span>
              </button>
            </div>

            {/* File Upload Area */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-bhp-upload-modal"
              />
              <label
                htmlFor="excel-bhp-upload-modal"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl cursor-pointer transition-all group"
              >
                <FileUp className="w-10 h-10 text-emerald-600 group-hover:scale-110 transition-transform mb-2" />
                <span className="font-bold text-slate-800 dark:text-white text-xs">
                  Klik untuk Memilih File Excel (.xlsx / .csv)
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Pilih file hasil pengisian template Excel BHP di perangkat Anda
                </span>
              </label>
            </div>

            {/* Preview Table */}
            {importPreviewList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Preview Data Hasil Baca ({importPreviewList.length} Barang):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImportPreviewList([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset File
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold sticky top-0">
                      <tr>
                        <th className="p-2.5 text-center">No</th>
                        <th className="p-2.5">ID Barang</th>
                        <th className="p-2.5">Nama Barang</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5 text-center">Stok</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {importPreviewList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono text-teal-600 dark:text-teal-400">{item.idBarang}</td>
                          <td className="p-2.5 font-bold text-slate-800 dark:text-white">{item.namaBarang}</td>
                          <td className="p-2.5">{item.kelas}</td>
                          <td className="p-2.5 text-center font-bold">{item.jumlahStok} {item.satuan}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreviewList([]);
                }}
                className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={importPreviewList.length === 0 || isSubmittingImport}
                onClick={handleSaveImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center space-x-2"
              >
                {isSubmittingImport ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan {importPreviewList.length} Data Import</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
