import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  Boxes, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Printer, 
  ArrowRightLeft, 
  ShieldAlert, 
  FileText, 
  User as UserIcon, 
  Tag, 
  Info,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  FileUp
} from "lucide-react";
import { AsetKelas, PeminjamanAset, User, Pengaturan, StatusAset } from "../types";
import { saveDocument, batchSaveDocuments, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses } from "../lib/accessControl";
import { getLocalDateStr } from "../lib/dateUtils";

interface AsetKelasViewProps {
  asetList: AsetKelas[];
  peminjamanList: PeminjamanAset[];
  config: Pengaturan;
  currentUser: User | null;
}

export const AsetKelasView: React.FC<AsetKelasViewProps> = ({
  asetList,
  peminjamanList,
  config,
  currentUser
}) => {
  const isAdmin = currentUser?.role === "admin";
  const isGuruKelas = currentUser?.role === "guru_kelas";
  const allowedClasses = getAllowedClasses(currentUser);

  // Default class selection
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    if (isGuruKelas && currentUser?.kelasUtama) {
      return currentUser.kelasUtama;
    }
    return allowedClasses[0] || "Kelas 1";
  });

  const [activeTab, setActiveTab] = useState<"aset" | "peminjaman">("aset");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");

  // Modal states for Aset
  const [isAsetModalOpen, setIsAsetModalOpen] = useState(false);
  const [editingAset, setEditingAset] = useState<AsetKelas | null>(null);
  const [formIdBarang, setFormIdBarang] = useState("");
  const [formTanggalTerima, setFormTanggalTerima] = useState(() => getLocalDateStr());
  const [formNamaBarang, setFormNamaBarang] = useState("");
  const [formKelasAset, setFormKelasAset] = useState(selectedKelas);
  const [formStatusAset, setFormStatusAset] = useState<StatusAset>("Tersedia");
  const [formKeteranganAset, setFormKeteranganAset] = useState("");

  // Modal states for Peminjaman
  const [isPinjamModalOpen, setIsPinjamModalOpen] = useState(false);
  const [selectedAsetForPinjam, setSelectedAsetForPinjam] = useState<AsetKelas | null>(null);
  const [pinjamTanggal, setPinjamTanggal] = useState(() => getLocalDateStr());
  const [pinjamAsetId, setPinjamAsetId] = useState("");
  const [pinjamKondisiAwal, setPinjamKondisiAwal] = useState("Baik");
  const [pinjamNamaPeminjam, setPinjamNamaPeminjam] = useState("");
  const [pinjamKeterangan, setPinjamKeterangan] = useState("");

  // Modal states for Pengembalikan
  const [isKembaliModalOpen, setIsKembaliModalOpen] = useState(false);
  const [activePeminjaman, setActivePeminjaman] = useState<PeminjamanAset | null>(null);
  const [kembaliTanggal, setKembaliTanggal] = useState(() => getLocalDateStr());
  const [kembaliNamaPengembali, setKembaliNamaPengembali] = useState("");
  const [kembaliKondisi, setKembaliKondisi] = useState("Baik");
  const [kembaliStatusAkhir, setKembaliStatusAkhir] = useState<StatusAset>("Tersedia");
  const [kembaliKeterangan, setKembaliKeterangan] = useState("");

  // Modal states & ref for Import Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewList, setImportPreviewList] = useState<AsetKelas[]>([]);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Restrict access if not Admin or Guru Kelas
  if (!isAdmin && !isGuruKelas) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 text-center py-16">
        <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
          Akses Dibatasi
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Menu <strong>Aset Kelas</strong> khusus diperuntukkan bagi <strong>Guru Kelas</strong> dan <strong>Admin Utama</strong> untuk mengelola sarana serta barang inventaris kelas.
        </p>
      </div>
    );
  }

  // Filter Aset based on Selected Class & Search & Status
  const filteredAset = asetList.filter((item) => {
    const matchKelas = selectedKelas === "Semua" || item.kelas === selectedKelas;
    const matchSearch =
      item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.idBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.keterangan || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "Semua" || item.status === statusFilter;
    return matchKelas && matchSearch && matchStatus;
  });

  // Filter Peminjaman based on Selected Class & Search
  const filteredPeminjaman = peminjamanList.filter((item) => {
    const matchKelas = selectedKelas === "Semua" || item.kelas === selectedKelas;
    const matchSearch =
      item.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.idBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.namaPeminjam.toLowerCase().includes(searchTerm.toLowerCase());
    return matchKelas && matchSearch;
  });

  // Summary Metrics
  const totalItems = filteredAset.length;
  const tersediaCount = filteredAset.filter((a) => a.status === "Tersedia").length;
  const dipinjamCount = filteredAset.filter((a) => a.status === "Dipinjam").length;
  const rusakCount = filteredAset.filter((a) => a.status === "Rusak").length;
  const hilangCount = filteredAset.filter((a) => a.status === "Hilang").length;

  // Open Aset Modal for Create/Edit
  const handleOpenAsetModal = (item?: AsetKelas) => {
    if (item) {
      setEditingAset(item);
      setFormIdBarang(item.idBarang);
      setFormTanggalTerima(item.tanggalTerima || getLocalDateStr());
      setFormNamaBarang(item.namaBarang);
      setFormKelasAset(item.kelas);
      setFormStatusAset(item.status);
      setFormKeteranganAset(item.keterangan || "");
    } else {
      setEditingAset(null);
      // Auto-generate ID Barang if new
      const nextNum = (asetList.length + 1).toString().padStart(3, "0");
      setFormIdBarang(`AST-${nextNum}`);
      setFormTanggalTerima(getLocalDateStr());
      setFormNamaBarang("");
      setFormKelasAset(selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas);
      setFormStatusAset("Tersedia");
      setFormKeteranganAset("");
    }
    setIsAsetModalOpen(true);
  };

  // Save Aset
  const handleSaveAset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaBarang.trim()) {
      alert("Nama barang harus diisi!");
      return;
    }

    const docId = editingAset ? editingAset.id : `ast_${Date.now()}`;
    const payload: AsetKelas = {
      id: docId,
      idBarang: formIdBarang.trim() || `AST-${Date.now().toString().slice(-4)}`,
      tanggalTerima: formTanggalTerima,
      namaBarang: formNamaBarang.trim(),
      kelas: formKelasAset,
      status: formStatusAset,
      keterangan: formKeteranganAset.trim()
    };

    try {
      await saveDocument(COLLECTIONS.ASET_KELAS, docId, payload);
      setIsAsetModalOpen(false);
    } catch (err) {
      alert("Gagal menyimpan data aset: " + err);
    }
  };

  // Delete Aset
  const handleDeleteAset = async (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus aset "${nama}"?`)) {
      try {
        await deleteDocument(COLLECTIONS.ASET_KELAS, id);
      } catch (err) {
        alert("Gagal menghapus aset: " + err);
      }
    }
  };

  // Open Pinjam Modal
  const handleOpenPinjamModal = (targetItem?: AsetKelas) => {
    const item = targetItem || filteredAset.find((a) => a.status === "Tersedia");
    if (!item && !targetItem) {
      alert("Tidak ada barang dengan status 'Tersedia' untuk dipinjam saat ini.");
      return;
    }

    if (item) {
      setSelectedAsetForPinjam(item);
      setPinjamAsetId(item.id);
    }
    setPinjamTanggal(getLocalDateStr());
    setPinjamKondisiAwal("Baik");
    setPinjamNamaPeminjam("");
    setPinjamKeterangan("");
    setIsPinjamModalOpen(true);
  };

  // Save Pinjam Aset
  const handleSavePinjam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinjamAsetId) {
      alert("Pilih barang yang akan dipinjam!");
      return;
    }
    if (!pinjamNamaPeminjam.trim()) {
      alert("Masukkan nama peminjam!");
      return;
    }

    const targetAset = asetList.find((a) => a.id === pinjamAsetId);
    if (!targetAset) {
      alert("Barang tidak ditemukan.");
      return;
    }

    const pinjamDocId = `pjm_${Date.now()}`;
    const newPeminjaman: PeminjamanAset = {
      id: pinjamDocId,
      idAset: targetAset.id,
      idBarang: targetAset.idBarang,
      namaBarang: targetAset.namaBarang,
      kelas: targetAset.kelas,
      tanggalPinjam: pinjamTanggal,
      kondisiAwal: pinjamKondisiAwal.trim(),
      namaPeminjam: pinjamNamaPeminjam.trim(),
      statusPeminjaman: "Dipinjam",
      keterangan: pinjamKeterangan.trim(),
      namaPetugas: currentUser?.nama || "Guru Kelas"
    };

    try {
      // 1. Save borrowing log
      await saveDocument(COLLECTIONS.PEMINJAMAN_ASET, pinjamDocId, newPeminjaman);

      // 2. Automatically update asset status to 'Dipinjam'
      await saveDocument(COLLECTIONS.ASET_KELAS, targetAset.id, {
        ...targetAset,
        status: "Dipinjam"
      });

      setIsPinjamModalOpen(false);
    } catch (err) {
      alert("Gagal memproses peminjaman: " + err);
    }
  };

  // Open Return (Kembali) Modal
  const handleOpenKembaliModal = (peminjaman: PeminjamanAset) => {
    setActivePeminjaman(peminjaman);
    setKembaliTanggal(getLocalDateStr());
    setKembaliNamaPengembali(peminjaman.namaPeminjam || "");
    setKembaliKondisi(peminjaman.kondisiAwal || "Baik");
    setKembaliStatusAkhir("Tersedia");
    setKembaliKeterangan("");
    setIsKembaliModalOpen(true);
  };

  // Save Return (Kembali) Aset
  const handleSaveKembali = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeminjaman) return;

    try {
      // 1. Update borrowing log to 'Dikembalikan'
      await saveDocument(COLLECTIONS.PEMINJAMAN_ASET, activePeminjaman.id, {
        ...activePeminjaman,
        tanggalKembali: kembaliTanggal,
        namaPengembali: kembaliNamaPengembali.trim(),
        kondisiKembali: kembaliKondisi.trim(),
        statusPeminjaman: "Dikembalikan",
        keterangan: kembaliKeterangan.trim()
          ? `${activePeminjaman.keterangan ? activePeminjaman.keterangan + " | " : ""}Ket. Pengembalian: ${kembaliKeterangan.trim()}`
          : activePeminjaman.keterangan
      });

      // 2. Automatically update asset status back to 'Tersedia' (or selected status) in Aset Kelas
      const targetAset = asetList.find((a) => a.id === activePeminjaman.idAset || a.idBarang === activePeminjaman.idBarang);
      if (targetAset) {
        await saveDocument(COLLECTIONS.ASET_KELAS, targetAset.id, {
          ...targetAset,
          status: kembaliStatusAkhir
        });
      }

      setIsKembaliModalOpen(false);
    } catch (err) {
      alert("Gagal memproses pengembalian: " + err);
    }
  };

  // Delete Peminjaman Log
  const handleDeletePeminjaman = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus catatan peminjaman ini?")) {
      try {
        await deleteDocument(COLLECTIONS.PEMINJAMAN_ASET, id);
      } catch (err) {
        alert("Gagal menghapus data peminjaman: " + err);
      }
    }
  };

  // Download Excel Template for Aset Kelas
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "ID Barang": "AST-001",
        "Tanggal Terima": new Date().toISOString().split("T")[0],
        "Nama Barang": "Proyektor InFocus & Kabel HDMI",
        "Kelas": selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas,
        "Status Barang": "Tersedia",
        "Keterangan": "Kondisi baik, tersimpan di lemari kelas"
      },
      {
        "ID Barang": "AST-002",
        "Tanggal Terima": new Date().toISOString().split("T")[0],
        "Nama Barang": "Kipas Angin Dinding Cosmos",
        "Kelas": selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas,
        "Status Barang": "Tersedia",
        "Keterangan": "Terpasang di sudut depan"
      },
      {
        "ID Barang": "AST-003",
        "Tanggal Terima": new Date().toISOString().split("T")[0],
        "Nama Barang": "Whiteboard 120x240cm",
        "Kelas": selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas,
        "Status Barang": "Tersedia",
        "Keterangan": "Lengkap dengan spidol & penghapus"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 15 }, // ID Barang
      { wch: 16 }, // Tanggal Terima
      { wch: 32 }, // Nama Barang
      { wch: 12 }, // Kelas
      { wch: 16 }, // Status Barang
      { wch: 38 }  // Keterangan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Aset");
    const fileName = `Template_Import_Aset_Kelas_${(selectedKelas === "Semua" ? "Umum" : selectedKelas).replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Upload and Parse Excel File
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
          alert("File Excel kosong atau tidak memiliki baris data yang terbaca.");
          return;
        }

        const parsed: AsetKelas[] = rawRows.map((row, idx) => {
          const getVal = (possibleKeys: string[]) => {
            for (const key of Object.keys(row)) {
              if (possibleKeys.some((p) => p.toLowerCase() === key.trim().toLowerCase())) {
                return String(row[key] || "").trim();
              }
            }
            return "";
          };

          const idBarang = getVal(["ID Barang", "idBarang", "ID", "Kode Barang", "No Barang"]) || `AST-${(asetList.length + idx + 1).toString().padStart(3, "0")}`;
          const tanggalTerima = getVal(["Tanggal Terima", "tanggalTerima", "Tanggal", "Tgl Terima"]) || new Date().toISOString().split("T")[0];
          const namaBarang = getVal(["Nama Barang", "namaBarang", "Nama", "Barang"]) || `Barang Aset ${idx + 1}`;
          const rawKelas = getVal(["Kelas", "kelas", "Ruangan", "Lokasi"]);
          const kelas = rawKelas || (selectedKelas === "Semua" ? (allowedClasses[0] || "Kelas 1") : selectedKelas);
          
          const rawStatus = getVal(["Status Barang", "statusBarang", "Status"]);
          let status: StatusAset = "Tersedia";
          if (["Tersedia", "Dipinjam", "Rusak", "Hilang"].includes(rawStatus)) {
            status = rawStatus as StatusAset;
          }

          const keterangan = getVal(["Keterangan", "keterangan", "Catatan", "Ket"]);

          return {
            id: `ast_imp_${Date.now()}_${idx}`,
            idBarang,
            tanggalTerima,
            namaBarang,
            kelas,
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

  // Save Bulk Import Data
  const handleSaveImport = async () => {
    if (importPreviewList.length === 0) return;
    setIsSubmittingImport(true);

    try {
      await batchSaveDocuments(COLLECTIONS.ASET_KELAS, importPreviewList);
      alert(`Berhasil mengimpor ${importPreviewList.length} barang aset kelas ke database!`);
      setIsImportModalOpen(false);
      setImportPreviewList([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert("Gagal menyimpan data import aset: " + err);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Area Header (Only visible when printing) */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-4">
        <h3 className="text-base font-bold uppercase">{config.Pemerintah}</h3>
        <h2 className="text-xl font-black uppercase">{config.Nama_Sekolah}</h2>
        <p className="text-xs text-slate-600">{config.Alamat_Sekolah}</p>
        <div className="mt-4 pt-2 border-t border-slate-400">
          <h4 className="text-lg font-bold uppercase underline">
            {activeTab === "aset" ? "LAPORAN INVENTARIS ASET KELAS" : "CATATAN PEMINJAMAN ASET KELAS"}
          </h4>
          <p className="text-xs font-semibold">Kelas: {selectedKelas}</p>
        </div>
      </div>

      {/* Main Screen Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Boxes className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Aset & Inventaris Kelas
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kelola daftar sarana, barang kelas, dan pencatatan peminjaman secara terintegrasi
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "aset" ? (
            <>
              <button
                onClick={() => handleOpenAsetModal()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Aset</span>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={handleDownloadTemplate}
                title="Download Template Excel Aset Kelas"
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Template Excel</span>
              </button>

              <button
                onClick={() => handleOpenPinjamModal()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Input Peminjaman</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleOpenPinjamModal()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Peminjaman Baru</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Total Aset</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{totalItems}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Tersedia</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{tersediaCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Dipinjam</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{dipinjamCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">Rusak / Hilang</p>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300">{rusakCount + hilangCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Sub-Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("aset")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === "aset"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              📦 Daftar Aset Kelas ({filteredAset.length})
            </button>
            <button
              onClick={() => setActiveTab("peminjaman")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeTab === "peminjaman"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🔄 Riwayat Peminjaman ({filteredPeminjaman.length})
            </button>
          </div>

          {/* Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kelas */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {isAdmin && <option value="Semua">Semua Kelas</option>}
                {allowedClasses.map((kls) => (
                  <option key={kls} value={kls}>
                    {kls}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status (Only for Aset Tab) */}
            {activeTab === "aset" && (
              <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Tersedia">Tersedia</option>
                  <option value="Dipinjam">Dipinjam</option>
                  <option value="Rusak">Rusak</option>
                  <option value="Hilang">Hilang</option>
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: DAFTAR ASET KELAS */}
      {activeTab === "aset" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">ID Barang</th>
                  <th className="p-4">Tanggal Terima</th>
                  <th className="p-4">Nama Barang</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4">Status Barang</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
                {filteredAset.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                      <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data aset untuk kelas ini. Klik "+ Tambah Aset" untuk membuat baru.
                    </td>
                  </tr>
                ) : (
                  filteredAset.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{item.idBarang}</td>
                      <td className="p-4 whitespace-nowrap">{item.tanggalTerima || "-"}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{item.namaBarang}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[11px]">
                          {item.kelas}
                        </span>
                      </td>
                      <td className="p-4">
                        {item.status === "Tersedia" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Tersedia</span>
                          </span>
                        )}
                        {item.status === "Dipinjam" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Dipinjam</span>
                          </span>
                        )}
                        {item.status === "Rusak" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Rusak</span>
                          </span>
                        )}
                        {item.status === "Hilang" && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" />
                            <span>Hilang</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{item.keterangan || "-"}</td>
                      <td className="p-4 text-center print:hidden">
                        <div className="flex items-center justify-center space-x-1.5">
                          {item.status === "Tersedia" && (
                            <button
                              onClick={() => handleOpenPinjamModal(item)}
                              title="Pinjam Aset ini"
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                            >
                              Pinjam
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenAsetModal(item)}
                            title="Edit Aset"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAset(item.id, item.namaBarang)}
                            title="Hapus Aset"
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* VIEW TAB 2: CATATAN PEMINJAMAN ASET */}
      {activeTab === "peminjaman" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Tanggal Pinjam</th>
                  <th className="p-4">ID & Nama Barang</th>
                  <th className="p-4">Kondisi Awal</th>
                  <th className="p-4">Nama Peminjam</th>
                  <th className="p-4">Tanggal Kembali</th>
                  <th className="p-4">Kondisi Saat Dikembalikan</th>
                  <th className="p-4">Status Peminjaman</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4 text-center print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
                {filteredPeminjaman.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                      <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada catatan peminjaman barang untuk kelas ini.
                    </td>
                  </tr>
                ) : (
                  filteredPeminjaman.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4 whitespace-nowrap">{item.tanggalPinjam}</td>
                      <td className="p-4">
                        <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                          {item.idBarang}
                        </div>
                        <div className="font-bold text-slate-800 dark:text-white">{item.namaBarang}</div>
                      </td>
                      <td className="p-4">{item.kondisiAwal}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-white">{item.namaPeminjam}</td>
                      <td className="p-4 whitespace-nowrap">
                        {item.tanggalKembali ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-white">{item.tanggalKembali}</div>
                            {item.namaPengembali && (
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                Oleh: {item.namaPengembali}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">Belum Kembali</span>
                        )}
                      </td>
                      <td className="p-4">{item.kondisiKembali || "-"}</td>
                      <td className="p-4">
                        {item.statusPeminjaman === "Dipinjam" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200">
                            Masih Dipinjam
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200">
                            Dikembalikan
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{item.keterangan || "-"}</td>
                      <td className="p-4 text-center print:hidden">
                        <div className="flex items-center justify-center space-x-1.5">
                          {item.statusPeminjaman === "Dipinjam" && (
                            <button
                              onClick={() => handleOpenKembaliModal(item)}
                              title="Kembalikan Aset"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Kembalikan</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePeminjaman(item.id)}
                            title="Hapus Catatan"
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Official Signature Area for Printed Laporan */}
      <div className="hidden print:grid grid-cols-2 gap-8 mt-12 text-center text-xs">
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Kepala Sekolah</p>
          <div className="h-16"></div>
          <p className="font-bold underline">{config.Nama_Kepsek}</p>
          <p>NIP. {config.NIP_Kepsek}</p>
        </div>
        <div>
          <p>{config.Tempat_Tanda_Tangan || "Kab. Bogor"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="font-bold">Guru Kelas / Pengelola Barang</p>
          <div className="h-16"></div>
          <p className="font-bold underline">{currentUser?.nama || config.Nama_Guru}</p>
          <p>NIP. {currentUser?.nip || config.NIP_Guru}</p>
        </div>
      </div>

      {/* MODAL 1: TAMBAH / EDIT ASET */}
      {isAsetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                {editingAset ? "Edit Data Aset Kelas" : "Tambah Aset Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAsetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAset} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ID Barang
                  </label>
                  <input
                    type="text"
                    value={formIdBarang}
                    onChange={(e) => setFormIdBarang(e.target.value)}
                    placeholder="Contoh: AST-001"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Terima
                  </label>
                  <input
                    type="date"
                    value={formTanggalTerima}
                    onChange={(e) => setFormTanggalTerima(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Barang / Sarana
                </label>
                <input
                  type="text"
                  value={formNamaBarang}
                  onChange={(e) => setFormNamaBarang(e.target.value)}
                  placeholder="Contoh: Proyektor InFocus, Kipas Angin, Whiteboard"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi Kelas
                  </label>
                  <select
                    value={formKelasAset}
                    onChange={(e) => setFormKelasAset(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  >
                    {allowedClasses.map((kls) => (
                      <option key={kls} value={kls}>
                        {kls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Barang
                  </label>
                  <select
                    value={formStatusAset}
                    onChange={(e) => setFormStatusAset(e.target.value as StatusAset)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Dipinjam">Dipinjam</option>
                    <option value="Rusak">Rusak</option>
                    <option value="Hilang">Hilang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan (Opsional)
                </label>
                <textarea
                  value={formKeteranganAset}
                  onChange={(e) => setFormKeteranganAset(e.target.value)}
                  placeholder="Merk, spesifikasi, atau catatan kondisi..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAsetModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INPUT PEMINJAMAN ASET */}
      {isPinjamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                Form Input Peminjaman Aset
              </h3>
              <button
                type="button"
                onClick={() => setIsPinjamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePinjam} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pinjam
                  </label>
                  <input
                    type="date"
                    value={pinjamTanggal}
                    onChange={(e) => setPinjamTanggal(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Barang Aset
                  </label>
                  <select
                    value={pinjamAsetId}
                    onChange={(e) => {
                      setPinjamAsetId(e.target.value);
                      const found = asetList.find((a) => a.id === e.target.value);
                      if (found) setSelectedAsetForPinjam(found);
                    }}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                    required
                  >
                    <option value="">-- Pilih Barang --</option>
                    {asetList
                      .filter((a) => selectedKelas === "Semua" || a.kelas === selectedKelas)
                      .map((a) => (
                        <option key={a.id} value={a.id} disabled={a.status !== "Tersedia"}>
                          [{a.idBarang}] {a.namaBarang} ({a.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Peminjam
                </label>
                <input
                  type="text"
                  value={pinjamNamaPeminjam}
                  onChange={(e) => setPinjamNamaPeminjam(e.target.value)}
                  placeholder="Nama Siswa / Guru / Staf yang meminjam"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kondisi Sebelum Dipinjam
                </label>
                <input
                  type="text"
                  value={pinjamKondisiAwal}
                  onChange={(e) => setPinjamKondisiAwal(e.target.value)}
                  placeholder="Contoh: Baik, Lengkap dengan kabel, Cacat halus"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea
                  value={pinjamKeterangan}
                  onChange={(e) => setPinjamKeterangan(e.target.value)}
                  placeholder="Keperluan peminjaman atau catatan penanggung jawab..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Memproses form ini akan secara otomatis mengubah status barang terkait menjadi <strong>"Dipinjam"</strong> di daftar inventaris utama.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinjamModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Peminjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PENGEMBALIAN ASET */}
      {isKembaliModalOpen && activePeminjaman && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Pengembalian Aset Barang
                </h3>
                <p className="text-xs text-slate-500">
                  [{activePeminjaman.idBarang}] {activePeminjaman.namaBarang} - Peminjam: {activePeminjaman.namaPeminjam}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsKembaliModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKembali} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pengembalian
                  </label>
                  <input
                    type="date"
                    value={kembaliTanggal}
                    onChange={(e) => setKembaliTanggal(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Akhir Barang
                  </label>
                  <select
                    value={kembaliStatusAkhir}
                    onChange={(e) => setKembaliStatusAkhir(e.target.value as StatusAset)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  >
                    <option value="Tersedia">Tersedia (Siap Pakai)</option>
                    <option value="Rusak">Rusak (Perlu Perbaikan)</option>
                    <option value="Hilang">Hilang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengembali Barang
                </label>
                <input
                  type="text"
                  value={kembaliNamaPengembali}
                  onChange={(e) => setKembaliNamaPengembali(e.target.value)}
                  placeholder="Masukkan nama orang yang mengembalikan barang..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kondisi Saat Dikembalikan
                </label>
                <input
                  type="text"
                  value={kembaliKondisi}
                  onChange={(e) => setKembaliKondisi(e.target.value)}
                  placeholder="Contoh: Baik, Mulus, Ada goresan sedikit"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan / Catatan Pengembalian
                </label>
                <textarea
                  value={kembaliKeterangan}
                  onChange={(e) => setKembaliKeterangan(e.target.value)}
                  placeholder="Catatan tambahan saat pengembalian..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>
                  Pengembalian ini akan memperbarui status peminjaman menjadi <strong>"Dikembalikan"</strong> dan mengembalikan status inventaris ke <strong>"{kembaliStatusAkhir}"</strong>.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKembaliModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
                >
                  Konfirmasi Pengembalian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: IMPORT EXCEL DATA ASET KELAS */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Import Data Aset Kelas dari Excel
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

            {/* Instruction Banner & Download Template */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 text-emerald-900 dark:text-emerald-200">
                <p className="font-bold flex items-center space-x-1">
                  <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Petunjuk Format File Excel:</span>
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Kolom wajib: <strong>ID Barang</strong>, <strong>Tanggal Terima</strong>, <strong>Nama Barang</strong>, <strong>Kelas</strong>, <strong>Status Barang</strong>, <strong>Keterangan</strong>.
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

            {/* File Upload Zone */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-asset-upload-modal"
              />
              <label
                htmlFor="excel-asset-upload-modal"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl cursor-pointer transition-all group"
              >
                <FileUp className="w-10 h-10 text-emerald-600 group-hover:scale-110 transition-transform mb-2" />
                <span className="font-bold text-slate-800 dark:text-white text-xs">
                  Klik untuk Memilih File Excel (.xlsx / .csv)
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Pilih file hasil pengisian template Excel di perangkat Anda
                </span>
              </label>
            </div>

            {/* Preview Table if file loaded */}
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
                        <th className="p-2.5">No</th>
                        <th className="p-2.5">ID Barang</th>
                        <th className="p-2.5">Nama Barang</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {importPreviewList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400">{item.idBarang}</td>
                          <td className="p-2.5 font-bold text-slate-800 dark:text-white">{item.namaBarang}</td>
                          <td className="p-2.5">{item.kelas}</td>
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
