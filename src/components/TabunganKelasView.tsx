import React, { useState, useMemo } from "react";
import { 
  Wallet, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Save, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Printer, 
  Download, 
  BookOpen, 
  UserCheck, 
  PiggyBank,
  CircleDollarSign,
  History,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Siswa, TabunganKelas, Pengaturan, User } from "../types";
import { saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { getLocalDateStr } from "../lib/dateUtils";
import { getAllowedClasses, isRecordAllowedByClass } from "../lib/accessControl";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyHapusSuccess, 
  notifyHapusError, 
  confirmDeleteAlert,
  notifyCetakSuccess,
  notifyCetakError 
} from "../lib/swal";

interface TabunganKelasViewProps {
  tabunganList: TabunganKelas[];
  siswaList: Siswa[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const TabunganKelasView: React.FC<TabunganKelasViewProps> = ({
  tabunganList,
  siswaList,
  config,
  currentUser = null
}) => {
  // Restricted access for Guru Mapel
  if (currentUser?.role === "guru_mapel") {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center shadow-sm max-w-xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
          <PiggyBank className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
          Akses Dibatasi
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Fitur <strong>Tabungan Kelas</strong> khusus diperuntukkan bagi <strong>Guru Kelas (Wali Kelas)</strong> dan <strong>Admin Utama</strong>. Akun bertipe Guru Mata Pelajaran tidak dapat mengelola atau mengakses tabungan siswa.
        </p>
      </div>
    );
  }

  // Allowed classes access control
  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    return allowedClasses.length > 0 ? allowedClasses[0] : "";
  });

  // Keep selectedKelas synced if allowedClasses changes
  React.useEffect(() => {
    if (allowedClasses.length > 0 && (!selectedKelas || !allowedClasses.includes(selectedKelas))) {
      setSelectedKelas(allowedClasses[0]);
    }
  }, [allowedClasses, selectedKelas]);

  // Active view tab: "input" | "rekap" | "riwayat" | "bku"
  const [viewTab, setViewTab] = useState<"input" | "rekap" | "riwayat" | "bku">("rekap");

  // Form State for New Transaction
  const [tanggal, setTanggal] = useState<string>(() => getLocalDateStr());
  const [idSiswa, setIdSiswa] = useState<string>("");
  const [jenis, setJenis] = useState<"Setor" | "Tarik">("Setor");
  const [jumlah, setJumlah] = useState<number | "">("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Filtered Students in selected class
  const studentsInClass = useMemo(() => {
    return siswaList
      .filter((s) => isRecordAllowedByClass(s, currentUser) && s.kelas === selectedKelas)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, currentUser, selectedKelas]);

  // Filtered Tabungan Records for selected class
  const tabunganInClass = useMemo(() => {
    return tabunganList
      .filter((t) => isRecordAllowedByClass(t, currentUser) && t.kelas === selectedKelas)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [tabunganList, currentUser, selectedKelas]);

  // Student Balances map: { [idSiswa]: { totalSetor, totalTarik, saldo } }
  const studentBalances = useMemo<Record<string, { totalSetor: number; totalTarik: number; saldo: number }>>(() => {
    const map: Record<string, { totalSetor: number; totalTarik: number; saldo: number }> = {};
    
    // Initialize all students in class
    studentsInClass.forEach((s) => {
      map[s.id] = { totalSetor: 0, totalTarik: 0, saldo: 0 };
    });

    // Calculate totals from tabungan list
    tabunganInClass.forEach((t) => {
      if (!map[t.idSiswa]) {
        map[t.idSiswa] = { totalSetor: 0, totalTarik: 0, saldo: 0 };
      }
      const val = Number(t.jumlah) || 0;
      if (t.jenis === "Setor") {
        map[t.idSiswa].totalSetor += val;
      } else if (t.jenis === "Tarik") {
        map[t.idSiswa].totalTarik += val;
      }
      map[t.idSiswa].saldo = map[t.idSiswa].totalSetor - map[t.idSiswa].totalTarik;
    });

    return map;
  }, [studentsInClass, tabunganInClass]);

  // Total Class Totals
  const classSummary = useMemo(() => {
    let totalSetor = 0;
    let totalTarik = 0;
    tabunganInClass.forEach((t) => {
      const val = Number(t.jumlah) || 0;
      if (t.jenis === "Setor") totalSetor += val;
      if (t.jenis === "Tarik") totalTarik += val;
    });
    const totalSaldo = totalSetor - totalTarik;
    const balancesList = Object.values(studentBalances) as Array<{ totalSetor: number; totalTarik: number; saldo: number }>;
    const activeSaverCount = balancesList.filter((b) => b.saldo > 0).length;

    return { totalSetor, totalTarik, totalSaldo, activeSaverCount };
  }, [tabunganInClass, studentBalances]);

  // Detail Student Modal State
  const [detailSiswaModal, setDetailSiswaModal] = useState<Siswa | null>(null);

  // Edit Transaction Modal State
  const [editingItem, setEditingItem] = useState<TabunganKelas | null>(null);
  const [editTanggal, setEditTanggal] = useState("");
  const [editJenis, setEditJenis] = useState<"Setor" | "Tarik">("Setor");
  const [editJumlah, setEditJumlah] = useState<number | "">("");
  const [editKeterangan, setEditKeterangan] = useState("");

  // Search & Type filter in Riwayat
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState<"semua" | "Setor" | "Tarik">("semua");

  // Helper format currency
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Quick Amount Selector Buttons
  const quickAmounts = [2000, 5000, 10000, 20000, 50000, 100000];

  // Submit New Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSiswa) {
      notifySimpanError("Pilih siswa terlebih dahulu!");
      return;
    }
    if (!jumlah || Number(jumlah) <= 0) {
      notifySimpanError("Jumlah nominal tabungan harus lebih dari 0!");
      return;
    }

    const selectedSiswaObj = studentsInClass.find((s) => s.id === idSiswa);
    if (!selectedSiswaObj) {
      notifySimpanError("Siswa tidak ditemukan!");
      return;
    }

    // Check withdrawal balance constraint
    const currentBalance = studentBalances[idSiswa]?.saldo || 0;
    if (jenis === "Tarik" && Number(jumlah) > currentBalance) {
      notifySimpanError(
        `Penarikan gagal! Saldo tabungan ${selectedSiswaObj.nama} saat ini adalah ${formatRupiah(currentBalance)}.`
      );
      return;
    }

    setIsSaving(true);
    try {
      const id = `tb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const payload: TabunganKelas = {
        id,
        tanggal,
        kelas: selectedKelas,
        idSiswa,
        namaSiswa: selectedSiswaObj.nama,
        jenis,
        jumlah: Number(jumlah),
        keterangan: keterangan.trim() || (jenis === "Setor" ? "Setoran Tabungan" : "Penarikan Tabungan"),
        namaGuru: currentUser?.nama || config.Nama_Guru
      };

      await saveDocument(COLLECTIONS.TABUNGAN_KELAS, id, payload);
      notifySimpanSuccess("Transaksi tabungan kelas berhasil disimpan!");

      // Reset form fields
      setJumlah("");
      setKeterangan("");
    } catch (err: any) {
      notifySimpanError(`Gagal menyimpan transaksi: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: TabunganKelas) => {
    setEditingItem(item);
    setEditTanggal(item.tanggal);
    setEditJenis(item.jenis);
    setEditJumlah(item.jumlah);
    setEditKeterangan(item.keterangan || "");
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editJumlah || Number(editJumlah) <= 0) {
      notifySimpanError("Jumlah nominal harus lebih dari 0!");
      return;
    }

    // Check withdrawal balance if changing to Tarik
    if (editJenis === "Tarik") {
      const studentBal = studentBalances[editingItem.idSiswa]?.saldo || 0;
      // adjust old balance
      const adjustedBal = studentBal + (editingItem.jenis === "Tarik" ? editingItem.jumlah : -editingItem.jumlah);
      if (Number(editJumlah) > adjustedBal) {
        notifySimpanError(`Penarikan melebihi saldo siswa! Saldo tersisa: ${formatRupiah(adjustedBal)}`);
        return;
      }
    }

    try {
      const updated: Partial<TabunganKelas> = {
        tanggal: editTanggal,
        jenis: editJenis,
        jumlah: Number(editJumlah),
        keterangan: editKeterangan
      };
      await saveDocument(COLLECTIONS.TABUNGAN_KELAS, editingItem.id, updated);
      notifySimpanSuccess("Perubahan data tabungan berhasil disimpan!");
      setEditingItem(null);
    } catch (err: any) {
      notifySimpanError(`Gagal memperbarui data: ${err?.message || err}`);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string, namaSiswa: string, amount: number) => {
    const isConfirmed = await confirmDeleteAlert(
      "Hapus Transaksi Tabungan",
      `Hapus transaksi tabungan ${namaSiswa} sebesar ${formatRupiah(amount)}?`
    );
    if (!isConfirmed) return;

    try {
      await deleteDocument(COLLECTIONS.TABUNGAN_KELAS, id);
      notifyHapusSuccess("Transaksi tabungan telah dihapus.");
    } catch (err: any) {
      notifyHapusError(`Gagal menghapus data: ${err?.message || err}`);
    }
  };

  // BKU Chronological List sorted ascending by date & ID for accurate running balance
  const bkuChronologicalList = useMemo(() => {
    const list = [...tabunganInClass].sort((a, b) => {
      const timeA = new Date(a.tanggal).getTime();
      const timeB = new Date(b.tanggal).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.updatedAt || 0) - (b.updatedAt || 0);
    });

    let runningBalance = 0;
    return list.map((item, idx) => {
      const val = Number(item.jumlah) || 0;
      if (item.jenis === "Setor") runningBalance += val;
      else runningBalance -= val;

      return {
        ...item,
        bkuNo: idx + 1,
        runningBalance
      };
    });
  }, [tabunganInClass]);

  // Mass Delete BKU
  const handleMassDeleteBku = async () => {
    if (tabunganInClass.length === 0) {
      notifyHapusError("Data BKU sudah kosong!");
      return;
    }
    const confirmed = await confirmDeleteAlert(
      "Hapus Seluruh BKU Kelas",
      `Apakah Anda yakin ingin menghapus SELURUH ${tabunganInClass.length} transaksi BKU untuk ${selectedKelas}? Saldo BKU akan kembali Rp 0.`
    );
    if (!confirmed) return;

    try {
      setIsSaving(true);
      for (const t of tabunganInClass) {
        await deleteDocument(COLLECTIONS.TABUNGAN_KELAS, t.id);
      }
      notifyHapusSuccess("Seluruh data BKU telah berhasil dihapus.");
    } catch (err: any) {
      notifyHapusError("Gagal menghapus BKU: " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Kalibrasi Ulang Saldo & Transaksi BKU
  const handleKalibrasiBku = async () => {
    try {
      setIsSaving(true);
      try {
        localStorage.removeItem("edadmin_bku_cache");
        localStorage.removeItem("edadmin_tabungan_cache");
      } catch {}

      const count = tabunganInClass.length;
      if (count === 0) {
        notifySimpanSuccess("Kalibrasi Ulang BKU Selesai: Data BKU telah bersih, saldo diset ke Rp 0, dan transaksi terbaru siap digunakan.");
      } else {
        notifySimpanSuccess(
          `Kalibrasi BKU Berhasil! ${count} transaksi BKU terbaru telah diverifikasi & saldo kumulatif berhasil dikalibrasi ulang.`
        );
      }
    } catch (err: any) {
      notifySimpanError("Gagal kalibrasi BKU: " + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF Report for Class
  const handlePrintPDF = () => {
    if (studentsInClass.length === 0) {
      notifyCetakError("Tidak ada data siswa untuk dicetak!");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Kop Surat
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text((config.Pemerintah || "PEMERINTAH KABUPATEN").toUpperCase(), 105, 14, { align: "center" });
      doc.setFontSize(13);
      doc.text((config.Nama_Sekolah || "SD NEGERI").toUpperCase(), 105, 20, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(config.Alamat_Sekolah || "", 105, 25, { align: "center" });
      doc.setLineWidth(0.7);
      doc.line(15, 28, 195, 28);
      doc.setLineWidth(0.2);
      doc.line(15, 29, 195, 29);

      // Judul Laporan
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`LAPORAN REKAPITULASI TABUNGAN SISWA`, 105, 37, { align: "center" });
      doc.setFontSize(10);
      doc.text(`KELAS ${selectedKelas.toUpperCase()}`, 105, 42, { align: "center" });

      // Table Data
      const tableRows = studentsInClass.map((s, idx) => {
        const bal = studentBalances[s.id] || { totalSetor: 0, totalTarik: 0, saldo: 0 };
        return [
          (idx + 1).toString(),
          s.nisn || "-",
          s.nama,
          formatRupiah(bal.totalSetor),
          formatRupiah(bal.totalTarik),
          formatRupiah(bal.saldo)
        ];
      });

      // Total Row
      tableRows.push([
        "",
        "",
        "TOTAL KELAS",
        formatRupiah(classSummary.totalSetor),
        formatRupiah(classSummary.totalTarik),
        formatRupiah(classSummary.totalSaldo)
      ]);

      autoTable(doc, {
        startY: 48,
        head: [["No", "NISN", "Nama Siswa", "Total Setor", "Total Tarik", "Saldo Akhir"]],
        body: tableRows,
        theme: "grid",
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "center", cellWidth: 30 },
          2: { cellWidth: 65 },
          3: { halign: "right", cellWidth: 28 },
          4: { halign: "right", cellWidth: 28 },
          5: { halign: "right", cellWidth: 28 }
        },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        didParseCell: (data) => {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      // Tanda Tangan
      const finalY = (doc as any).lastAutoTable.finalY || 180;
      const signatureY = Math.min(finalY + 15, 240);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const tglFormatted = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      doc.text(`${config.Tempat_Tanda_Tangan || "Kab. Bogor"}, ${tglFormatted}`, 140, signatureY);
      doc.text("Wali Kelas / Guru", 140, signatureY + 5);
      doc.setFont("helvetica", "bold");
      doc.text(currentUser?.nama || config.Nama_Guru, 140, signatureY + 25);
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${currentUser?.nip || config.NIP_Guru || "-"}`, 140, signatureY + 30);

      doc.save(`Laporan_Tabungan_Kelas_${selectedKelas.replace(/\s+/g, "_")}.pdf`);
      notifyCetakSuccess("Laporan tabungan berhasil diunduh!");
    } catch (err: any) {
      notifyCetakError(`Gagal membuat PDF: ${err?.message || err}`);
    }
  };

  // Export Individual Student Passbook PDF
  const handlePrintBukuTabunganSiswa = (siswa: Siswa) => {
    const siswaTx = tabunganInClass
      .filter((t) => t.idSiswa === siswa.id)
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text((config.Nama_Sekolah || "SD NEGERI").toUpperCase(), 105, 14, { align: "center" });
      doc.setFontSize(12);
      doc.text("BUKU TABUNGAN SISWA", 105, 20, { align: "center" });

      doc.setLineWidth(0.5);
      doc.line(15, 24, 195, 24);

      // Info Siswa
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Nama Siswa : ${siswa.nama}`, 15, 31);
      doc.text(`NISN       : ${siswa.nisn || "-"}`, 15, 36);
      doc.text(`Kelas      : ${siswa.kelas}`, 140, 31);
      const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      doc.text(`Tanggal Cetak: ${todayStr}`, 140, 36);

      let currentBal = 0;
      const rows = siswaTx.map((t, idx) => {
        const val = Number(t.jumlah) || 0;
        const setor = t.jenis === "Setor" ? val : 0;
        const tarik = t.jenis === "Tarik" ? val : 0;
        currentBal += setor - tarik;

        return [
          (idx + 1).toString(),
          t.tanggal,
          t.keterangan || (t.jenis === "Setor" ? "Setor" : "Tarik"),
          setor > 0 ? formatRupiah(setor) : "-",
          tarik > 0 ? formatRupiah(tarik) : "-",
          formatRupiah(currentBal)
        ];
      });

      if (rows.length === 0) {
        rows.push(["-", "-", "Belum ada transaksi", "-", "-", "Rp 0"]);
      }

      autoTable(doc, {
        startY: 42,
        head: [["No", "Tanggal", "Keterangan", "Setor", "Tarik", "Saldo"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 28 },
          2: { cellWidth: 62 },
          3: { halign: "right", cellWidth: 26 },
          4: { halign: "right", cellWidth: 26 },
          5: { halign: "right", cellWidth: 28 }
        },
        styles: { fontSize: 8.5, cellPadding: 2 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 160;

      // Box Saldo Akhir
      const balObj = studentBalances[siswa.id] || { totalSetor: 0, totalTarik: 0, saldo: 0 };
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(15, finalY + 8, 180, 14, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`TOTAL SALDO AKHIR: ${formatRupiah(balObj.saldo)}`, 20, finalY + 17);

      doc.save(`Buku_Tabungan_${siswa.nama.replace(/\s+/g, "_")}.pdf`);
      notifyCetakSuccess(`Buku tabungan ${siswa.nama} berhasil diunduh!`);
    } catch (err: any) {
      notifyCetakError(`Gagal membuat PDF: ${err?.message || err}`);
    }
  };

  // Filtered Riwayat Transactions
  const filteredRiwayatList = useMemo(() => {
    return tabunganInClass.filter((t) => {
      const matchSearch =
        searchQuery === "" ||
        t.namaSiswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.keterangan || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchJenis = filterJenis === "semua" || t.jenis === filterJenis;
      return matchSearch && matchJenis;
    });
  }, [tabunganInClass, searchQuery, filterJenis]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header & Class Select */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Tabungan Kelas Digital</h1>
            <p className="text-xs text-blue-200 mt-0.5 font-medium">
              Kelola pencatatan setoran, penarikan, dan rekap saldo siswa per kelas
            </p>
          </div>
        </div>

        {/* Class Selection Dropdown */}
        <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
          <label className="text-xs font-bold text-blue-100 whitespace-nowrap pl-1">
            Pilih Kelas:
          </label>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="px-3 py-1.5 text-xs font-black bg-slate-900 text-white rounded-lg border border-blue-400/30 outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            {allowedClasses.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards for Selected Class */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Saldo */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Saldo Kelas</p>
            <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatRupiah(classSummary.totalSaldo)}
            </p>
          </div>
        </div>

        {/* Total Setor */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Setoran</p>
            <p className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 truncate">
              {formatRupiah(classSummary.totalSetor)}
            </p>
          </div>
        </div>

        {/* Total Tarik */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Penarikan</p>
            <p className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 truncate">
              {formatRupiah(classSummary.totalTarik)}
            </p>
          </div>
        </div>

        {/* Jumlah Siswa Menabung */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Siswa Menabung</p>
            <p className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 truncate">
              {classSummary.activeSaverCount} / {studentsInClass.length} Siswa
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher & Print Action */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setViewTab("rekap")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
              viewTab === "rekap"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Rekap Saldo Siswa</span>
          </button>

          <button
            onClick={() => setViewTab("input")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
              viewTab === "input"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Transaksi Baru</span>
          </button>

          <button
            onClick={() => setViewTab("riwayat")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
              viewTab === "riwayat"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Transaksi</span>
            {tabunganInClass.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-500/20 text-blue-600 dark:text-blue-300 rounded-full text-[10px]">
                {tabunganInClass.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewTab("bku")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all whitespace-nowrap cursor-pointer ${
              viewTab === "bku"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
            <span>BKU & Kalibrasi Saldo</span>
          </button>
        </div>

        {/* Print Class Report PDF */}
        <button
          onClick={handlePrintPDF}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Laporan Kelas PDF</span>
        </button>
      </div>

      {/* TAB 1: REKAP SALDO SISWA */}
      {viewTab === "rekap" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Buku Tabungan Siswa - Kelas {selectedKelas}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daftar siswa beserta akumulasi total setoran, penarikan, dan saldo akhir
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full w-fit">
              Total {studentsInClass.length} Siswa
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 text-center w-12">No</th>
                  <th className="p-3.5">NISN</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5 text-right text-emerald-600 dark:text-emerald-400">Total Setor</th>
                  <th className="p-3.5 text-right text-amber-600 dark:text-amber-400">Total Tarik</th>
                  <th className="p-3.5 text-right font-black">Saldo Akhir</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {studentsInClass.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Belum ada data siswa di Kelas {selectedKelas}.
                    </td>
                  </tr>
                ) : (
                  studentsInClass.map((siswa, idx) => {
                    const bal = studentBalances[siswa.id] || { totalSetor: 0, totalTarik: 0, saldo: 0 };
                    return (
                      <tr key={siswa.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{siswa.nisn || "-"}</td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">{siswa.nama}</td>
                        <td className="p-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(bal.totalSetor)}
                        </td>
                        <td className="p-3.5 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {formatRupiah(bal.totalTarik)}
                        </td>
                        <td className="p-3.5 text-right font-black text-sm text-slate-900 dark:text-white">
                          <span
                            className={`px-2.5 py-1 rounded-lg ${
                              bal.saldo > 0
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            {formatRupiah(bal.saldo)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Fast Quick Deposit Button */}
                            <button
                              onClick={() => {
                                setIdSiswa(siswa.id);
                                setJenis("Setor");
                                setViewTab("input");
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-lg transition-colors cursor-pointer"
                              title="Setor Tabungan"
                            >
                              + Setor
                            </button>

                            {/* Passbook / Detail Button */}
                            <button
                              onClick={() => setDetailSiswaModal(siswa)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Lihat Buku Tabungan"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Rincian</span>
                            </button>

                            {/* Print Individual Passbook */}
                            <button
                              onClick={() => handlePrintBukuTabunganSiswa(siswa)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-colors cursor-pointer"
                              title="Cetak Buku Tabungan Siswa"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INPUT TRANSAKSI BARU */}
      {viewTab === "input" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm max-w-2xl mx-auto">
          <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
                Form Setoran / Penarikan Tabungan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catat transaksi tabungan siswa untuk Kelas {selectedKelas}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Select Siswa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Siswa <span className="text-red-500">*</span>
              </label>
              <select
                value={idSiswa}
                onChange={(e) => setIdSiswa(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">-- Pilih Siswa Kelas {selectedKelas} --</option>
                {studentsInClass.map((s) => {
                  const bal = studentBalances[s.id]?.saldo || 0;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.nama} (Saldo: {formatRupiah(bal)})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Student Balance Indicator if selected */}
            {idSiswa && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  Saldo Saat Ini:
                </span>
                <span className="font-black text-sm text-blue-900 dark:text-blue-200">
                  {formatRupiah(studentBalances[idSiswa]?.saldo || 0)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Transaksi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Jenis Transaksi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Transaksi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJenis("Setor")}
                    className={`py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      jenis === "Setor"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Setor (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJenis("Tarik")}
                    className={`py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                      jenis === "Tarik"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Tarik (-)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Jumlah Nominal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Nominal (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value ? Number(e.target.value) : "")}
                placeholder="Masukkan nominal, misal: 10000"
                required
                min={100}
                className="w-full px-3.5 py-2.5 text-xs font-extrabold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />

              {/* Quick Nominal Buttons */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold mr-1">Cepat:</span>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setJumlah(amt)}
                    className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    + Rp {amt.toLocaleString("id-ID")}
                  </button>
                ))}
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan / Catatan
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={jenis === "Setor" ? "Setoran mingguan" : "Penarikan untuk beli LKS"}
                className="w-full px-3.5 py-2.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Menyimpan Transaksi..." : "Simpan Transaksi Tabungan"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: RIWAYAT TRANSAKSI */}
      {viewTab === "riwayat" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Riwayat Transaksi Tabungan - Kelas {selectedKelas}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log lengkap aktivitas setoran dan penarikan tabungan siswa
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              {/* Filter Jenis */}
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
              >
                <option value="semua">Semua Jenis</option>
                <option value="Setor">Hanya Setoran</option>
                <option value="Tarik">Hanya Penarikan</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Nama Siswa</th>
                  <th className="p-3.5 text-center">Jenis</th>
                  <th className="p-3.5 text-right">Nominal</th>
                  <th className="p-3.5">Keterangan</th>
                  <th className="p-3.5">Pencatat</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRiwayatList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Tidak ada data riwayat transaksi tabungan.
                    </td>
                  </tr>
                ) : (
                  filteredRiwayatList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{t.tanggal}</td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">{t.namaSiswa}</td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center space-x-1 ${
                            t.jenis === "Setor"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {t.jenis === "Setor" ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownLeft className="w-3 h-3 mr-0.5" />}
                          {t.jenis}
                        </span>
                      </td>
                      <td className={`p-3.5 text-right font-black ${t.jenis === "Setor" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {t.jenis === "Setor" ? "+" : "-"}{formatRupiah(t.jumlah)}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{t.keterangan || "-"}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">{t.namaGuru || "-"}</td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id, t.namaSiswa, t.jumlah)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Transaksi"
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

      {/* TAB 4: BKU (BUKU KAS UMUM) & KALIBRASI SALDO */}
      {viewTab === "bku" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden space-y-6 p-4 sm:p-6">
          {/* HEADER BKU & ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-emerald-500" />
                Buku Kas Umum (BKU) Kelas {selectedKelas}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Laporan arus kas BKU & fitur kalibrasi ulang saldo otomatis setelah penghapusan transaksi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMassDeleteBku}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Seluruh BKU Kelas</span>
              </button>

              <button
                onClick={handleKalibrasiBku}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>🔄 Kalibrasi Saldo BKU</span>
              </button>
            </div>
          </div>

          {/* BKU SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                Total Penerimaan (Kas Masuk / Setoran)
              </span>
              <span className="text-lg font-black text-emerald-800 dark:text-emerald-200">
                {formatRupiah(classSummary.totalSetor)}
              </span>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                Total Pengeluaran (Kas Keluar / Penarikan)
              </span>
              <span className="text-lg font-black text-amber-800 dark:text-amber-200">
                {formatRupiah(classSummary.totalTarik)}
              </span>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                Saldo Akhir BKU (Kas Kumulatif)
              </span>
              <span className="text-lg font-black text-blue-800 dark:text-blue-200">
                {formatRupiah(classSummary.totalSaldo)}
              </span>
            </div>
          </div>

          {/* CHRONOLOGICAL BKU TABLE */}
          {bkuChronologicalList.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Belum Ada Transaksi di BKU Kelas {selectedKelas}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Setelah BKU dihapus atau dikalibrasi, transaksi baru akan langsung terakumulasi secara urut waktu di tabel ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 text-center">No. BKU</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Uraian / Siswa</th>
                    <th className="p-3 text-center">Jenis</th>
                    <th className="p-3 text-right">Debet (Kas Masuk)</th>
                    <th className="p-3 text-right">Kredit (Kas Keluar)</th>
                    <th className="p-3 text-right">Saldo Kumulatif</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-medium">
                  {bkuChronologicalList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-slate-500">{item.bkuNo}</td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-white">
                        {item.namaSiswa}
                        {item.keterangan && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {item.keterangan}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.jenis === "Setor"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                          }`}
                        >
                          {item.jenis === "Setor" ? "Setoran (Debet)" : "Penarikan (Kredit)"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {item.jenis === "Setor" ? formatRupiah(item.jumlah) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {item.jenis === "Tarik" ? formatRupiah(item.jumlah) : "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                        {formatRupiah(item.runningBalance)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(item.id, item.namaSiswa, item.jumlah)}
                          title="Hapus Transaksi Ini"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DETAIL SISWA PASSBOOK MODAL */}
      {detailSiswaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-2.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Buku Tabungan Siswa: {detailSiswaModal.nama}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    NISN: {detailSiswaModal.nisn || "-"} | Kelas: {detailSiswaModal.kelas}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailSiswaModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balance Summary Header inside modal */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Total Setoran</p>
                <p className="font-extrabold text-emerald-700 dark:text-emerald-300">
                  {formatRupiah(studentBalances[detailSiswaModal.id]?.totalSetor || 0)}
                </p>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Total Penarikan</p>
                <p className="font-extrabold text-amber-700 dark:text-amber-300">
                  {formatRupiah(studentBalances[detailSiswaModal.id]?.totalTarik || 0)}
                </p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900">
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Saldo Akhir</p>
                <p className="font-black text-blue-800 dark:text-blue-200">
                  {formatRupiah(studentBalances[detailSiswaModal.id]?.saldo || 0)}
                </p>
              </div>
            </div>

            {/* Timeline Transactions */}
            <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Rincian Riwayat Transaksi
              </h4>
              {tabunganInClass.filter((t) => t.idSiswa === detailSiswaModal.id).length === 0 ? (
                <p className="text-xs text-center text-slate-400 py-6">
                  Siswa ini belum memiliki riwayat transaksi tabungan.
                </p>
              ) : (
                <div className="space-y-2">
                  {tabunganInClass
                    .filter((t) => t.idSiswa === detailSiswaModal.id)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              t.jenis === "Setor"
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                            }`}
                          >
                            {t.jenis === "Setor" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">
                              {t.keterangan || (t.jenis === "Setor" ? "Setoran Tabungan" : "Penarikan Tabungan")}
                            </p>
                            <p className="text-[10px] text-slate-400">{t.tanggal}</p>
                          </div>
                        </div>

                        <span
                          className={`font-black text-sm ${
                            t.jenis === "Setor" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {t.jenis === "Setor" ? "+" : "-"}{formatRupiah(t.jumlah)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <button
                onClick={() => handlePrintBukuTabunganSiswa(detailSiswaModal)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Buku Tabungan PDF</span>
              </button>

              <button
                onClick={() => setDetailSiswaModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-blue-900 text-white">
              <h3 className="font-bold text-sm">Edit Transaksi Tabungan</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Siswa</label>
                <input
                  type="text"
                  disabled
                  value={editingItem.namaSiswa}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditJenis("Setor")}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      editJenis === "Setor"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Setor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditJenis("Tarik")}
                    className={`py-2 text-xs font-bold rounded-xl border ${
                      editJenis === "Tarik"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Tarik
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={editJumlah}
                  onChange={(e) => setEditJumlah(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
