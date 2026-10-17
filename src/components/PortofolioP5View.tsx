import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  Upload, 
  Printer, 
  Eye, 
  Search, 
  Filter, 
  Camera, 
  Image as ImageIcon, 
  CheckCircle2, 
  Award, 
  BookOpen, 
  Layers, 
  Users, 
  Calendar, 
  FileText, 
  Compass, 
  Check, 
  Heart,
  Share2,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { 
  Siswa, 
  Pengaturan, 
  User, 
  P5Projek, 
  P5PenilaianRecord, 
  P5PortofolioKarya, 
  P5Tema, 
  P5Dimensi, 
  P5Skala,
  P5SubElemenTarget
} from "../types";
import { KopSuratDinas } from "./KopSuratDinas";
import { 
  subscribeCollection, 
  saveDocument, 
  deleteDocument, 
  batchSaveDocuments, 
  COLLECTIONS 
} from "../lib/firebase";
import { compressImage } from "../lib/imageCompressor";
import { getAllowedClasses } from "../lib/accessControl";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  showToastSuccess, 
  confirmDeleteAlert,
  showSuccessAlert
} from "../lib/swal";

const DAFTAR_TEMA_P5: P5Tema[] = [
  "Gaya Hidup Berkelanjutan",
  "Kearifan Lokal",
  "Bhinneka Tunggal Ika",
  "Bangunlah Jiwa dan Raganya",
  "Suara Demokrasi",
  "Rekayasa dan Teknologi",
  "Kewirausahaan",
  "Kebekerjaan"
];

const DAFTAR_DIMENSI_P5: { dimensi: P5Dimensi; elemenList: { elemen: string; subElemen: string; capaian: string }[] }[] = [
  {
    dimensi: "Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia",
    elemenList: [
      { elemen: "Akhlak Beragama", subElemen: "Mengenal dan Mencintai Tuhan YME", capaian: "Memahami kehadiran Tuhan dalam kehidupan sehari-hari serta menyayangi ciptaan-Nya." },
      { elemen: "Akhlak Pribadi", subElemen: "Integritas & Merawat Diri", capaian: "Menjaga kebersihan dan kesehatan diri secara mandiri serta jujur." },
      { elemen: "Akhlak kepada Alam", subElemen: "Menjaga Lingkungan Alam Sekitar", capaian: "Terbiasa merawat tanaman, tidak membuang sampah sembarangan, dan hemat energi." }
    ]
  },
  {
    dimensi: "Berkebinekaan Global",
    elemenList: [
      { elemen: "Mengenal dan Menghargai Budaya", subElemen: "Identitas Budaya Nusantara", capaian: "Mengenal dan bangga terhadap tradisi, bahasa daerah, dan budaya nusantara." },
      { elemen: "Komunikasi dan Interaksi Antar Budaya", subElemen: "Menghargai Keberagaman", capaian: "Menghargai perbedaan suku, agama, dan latar belakang teman tanpa diskriminasi." }
    ]
  },
  {
    dimensi: "Bergotong Royong",
    elemenList: [
      { elemen: "Kolaborasi", subElemen: "Kerja Sama Tim", capaian: "Mampu bekerja sama dalam kelompok untuk menyelesaikan projek bersama secara aktif." },
      { elemen: "Kepedulian", subElemen: "Tanggap terhadap Lingkungan", capaian: "Peka terhadap kebutuhan teman dan lingkungan sekolah serta siap menolong." }
    ]
  },
  {
    dimensi: "Mandiri",
    elemenList: [
      { elemen: "Pemahaman Diri", subElemen: "Mengenali Potensi Diri", capaian: "Mengidentifikasi kelebihan dan minat diri dalam mengerjakan karya projek." },
      { elemen: "Regulasi Diri", subElemen: "Disiplin & Percaya Diri", capaian: "Menyelesaikan tugas projek tepat waktu dengan penuh tanggung jawab." }
    ]
  },
  {
    dimensi: "Bernalar Kritis",
    elemenList: [
      { elemen: "Memperoleh Informasi", subElemen: "Mengajukan Pertanyaan", capaian: "Kritis dalam mengumpulkan data, bertanya, dan mencari solusi atas permasalahan." },
      { elemen: "Analisis dan Evaluasi", subElemen: "Menalar Solusi Masalah", capaian: "Menganalisis ide dan alternatif tindakan dalam menyelesaikan tantangan projek." }
    ]
  },
  {
    dimensi: "Kreatif",
    elemenList: [
      { elemen: "Menghasilkan Gagasan Orisinal", subElemen: "Kreativitas Ide", capaian: "Mengekspresikan ide dan gagasan baru dalam bentuk karya nyata yang inovatif." },
      { elemen: "Menghasilkan Karya & Tindakan", subElemen: "Eksplorasi Karya", capaian: "Menciptakan karya bernilai guna dari bahan ramah lingkungan atau media digital." }
    ]
  }
];

// Starter Default Projects
const DEFAULT_P5_PROJECTS: P5Projek[] = [
  {
    id: "projek-p5-sampah-organik",
    judul: "Pilah Sampah Berkah: Pembuatan Kompos Organik Sekolah",
    tema: "Gaya Hidup Berkelanjutan",
    deskripsi: "Projek pembiasaan memilah sampah organik sisa makanan dan daun kering di lingkungan sekolah menjadi pupuk kompos bernutrisi tinggi.",
    fase: "Fase C (Kelas 5-6)",
    kelas: "Kelas 5",
    semester: "Ganjil",
    tahunAjaran: "2024/2025",
    fasilitator: "Guru Kelas 5",
    subElemenList: [
      {
        id: "sub-1",
        dimensi: "Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia",
        elemen: "Akhlak kepada Alam",
        subElemen: "Menjaga Lingkungan Alam Sekitar",
        capaianFase: "Terbiasa merawat tanaman dan memilah sampah secara mandiri untuk menjaga kelestarian alam."
      },
      {
        id: "sub-2",
        dimensi: "Bergotong Royong",
        elemen: "Kolaborasi",
        subElemen: "Kerja Sama Tim",
        capaianFase: "Bekerja sama dalam tim membuat media pengomposan dan memantau proses pembusukan aerobik."
      },
      {
        id: "sub-3",
        dimensi: "Bernalar Kritis",
        elemen: "Analisis dan Evaluasi",
        subElemen: "Menalar Solusi Masalah",
        capaianFase: "Mengamati perubahan fisik kompos, mengukur kelembapan, dan mencatat siklus kematangan kompos."
      }
    ]
  },
  {
    id: "projek-p5-kuliner-nusantara",
    judul: "Cita Rasa Nusantara: Festival Jajanan Tradisional Sunda",
    tema: "Kearifan Lokal",
    deskripsi: "Eksplorasi resep, bahan pangan lokal singkong dan ubi, serta pameran bazar kuliner tradisional khas Jawa Barat.",
    fase: "Fase B (Kelas 3-4)",
    kelas: "Kelas 4",
    semester: "Genap",
    tahunAjaran: "2024/2025",
    fasilitator: "Guru Kelas 4",
    subElemenList: [
      {
        id: "sub-k-1",
        dimensi: "Berkebinekaan Global",
        elemen: "Mengenal dan Menghargai Budaya",
        subElemen: "Identitas Budaya Nusantara",
        capaianFase: "Mengenal dan menghargai sejarah serta filosofi makanan tradisional nusantara."
      },
      {
        id: "sub-k-2",
        dimensi: "Kreatif",
        elemen: "Menghasilkan Karya & Tindakan",
        subElemen: "Eksplorasi Karya",
        capaianFase: "Membuat kreasi jajanan tradisional dengan penyajian modern dan kemasan ramah lingkungan."
      },
      {
        id: "sub-k-3",
        dimensi: "Mandiri",
        elemen: "Regulasi Diri",
        subElemen: "Disiplin & Percaya Diri",
        capaianFase: "Mempresentasikan hasil karya dan melayani pengunjung bazar dengan sopan dan percaya diri."
      }
    ]
  }
];

interface PortofolioP5ViewProps {
  siswaList: Siswa[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const PortofolioP5View: React.FC<PortofolioP5ViewProps> = ({
  siswaList,
  config,
  currentUser = null
}) => {
  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));

  // Tabs: 'projek' | 'penilaian' | 'portofolio' | 'cetak_rapor'
  const [activeTab, setActiveTab] = useState<"projek" | "penilaian" | "portofolio" | "cetak_rapor">("projek");

  // Collections State
  const [projekList, setProjekList] = useState<P5Projek[]>([]);
  const [penilaianList, setPenilaianList] = useState<P5PenilaianRecord[]>([]);
  const [portofolioList, setPortofolioList] = useState<P5PortofolioKarya[]>([]);

  // Selection Filters
  const [selectedProjekId, setSelectedProjekId] = useState<string>("");
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>("");

  // Modals & Editors
  const [showProjekModal, setShowProjekModal] = useState<boolean>(false);
  const [editingProjek, setEditingProjek] = useState<P5Projek | null>(null);

  const [showPortoModal, setShowPortoModal] = useState<boolean>(false);
  const [editingPorto, setEditingPorto] = useState<Partial<P5PortofolioKarya> | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; desc: string } | null>(null);

  // Subscribe to Firebase P5 Collections
  useEffect(() => {
    const unsubProjek = subscribeCollection<P5Projek>(COLLECTIONS.P5_PROJEK, (data) => {
      if (data.length > 0) {
        setProjekList(data);
      } else {
        DEFAULT_P5_PROJECTS.forEach((p) => {
          saveDocument(COLLECTIONS.P5_PROJEK, p.id, p).catch(console.warn);
        });
        setProjekList(DEFAULT_P5_PROJECTS);
      }
    });

    const unsubPenilaian = subscribeCollection<P5PenilaianRecord>(COLLECTIONS.P5_PENILAIAN, (data) => {
      setPenilaianList(data);
    });

    const unsubPorto = subscribeCollection<P5PortofolioKarya>(COLLECTIONS.P5_PORTOFOLIO, (data) => {
      setPortofolioList(data);
    });

    return () => {
      unsubProjek();
      unsubPenilaian();
      unsubPorto();
    };
  }, []);

  // Sync initial class & project selections
  useEffect(() => {
    if (allowedClasses.length > 0 && !selectedKelas) {
      setSelectedKelas(allowedClasses[0]);
    }
  }, [allowedClasses, selectedKelas]);

  useEffect(() => {
    if (projekList.length > 0 && !selectedProjekId) {
      setSelectedProjekId(projekList[0].id);
    }
  }, [projekList, selectedProjekId]);

  const activeProjek = useMemo(() => {
    return projekList.find((p) => p.id === selectedProjekId) || projekList[0] || null;
  }, [projekList, selectedProjekId]);

  const classStudents = useMemo(() => {
    return siswaList.filter((s) => s.kelas === selectedKelas);
  }, [siswaList, selectedKelas]);

  useEffect(() => {
    if (classStudents.length > 0 && !selectedSiswaId) {
      setSelectedSiswaId(classStudents[0].id);
    }
  }, [classStudents, selectedSiswaId]);

  const activeSiswa = useMemo(() => {
    return classStudents.find((s) => s.id === selectedSiswaId) || classStudents[0] || null;
  }, [classStudents, selectedSiswaId]);

  // Handle Create or Edit Projek
  const handleOpenNewProjek = () => {
    setEditingProjek({
      id: `p5-projek-${Date.now()}`,
      judul: "Projek P5 Baru",
      tema: "Gaya Hidup Berkelanjutan",
      deskripsi: "Deskripsi singkat latar belakang dan tujuan projek penguatan profil pelajar pancasila...",
      fase: "Fase C (Kelas 5-6)",
      kelas: selectedKelas || "Kelas 5",
      semester: "Ganjil",
      tahunAjaran: "2024/2025",
      fasilitator: currentUser?.nama || config.Nama_Guru || "Guru Fasilitator",
      subElemenList: [
        {
          id: `sub-${Date.now()}-1`,
          dimensi: "Bergotong Royong",
          elemen: "Kolaborasi",
          subElemen: "Kerja Sama Tim",
          capaianFase: "Bekerja sama secara aktif dan kompak menyelesaikan tahapan projek."
        },
        {
          id: `sub-${Date.now()}-2`,
          dimensi: "Kreatif",
          elemen: "Menghasilkan Karya & Tindakan",
          subElemen: "Eksplorasi Karya",
          capaianFase: "Menciptakan karya nyata yang bermanfaat dan orisinal."
        }
      ]
    });
    setShowProjekModal(true);
  };

  const handleSaveProjek = async () => {
    if (!editingProjek || !editingProjek.judul.trim()) {
      notifySimpanError("Judul projek tidak boleh kosong!");
      return;
    }
    try {
      const updated: P5Projek = {
        ...editingProjek,
        updatedAt: Date.now()
      };
      await saveDocument(COLLECTIONS.P5_PROJEK, updated.id, updated);
      setShowProjekModal(false);
      setSelectedProjekId(updated.id);
      notifySimpanSuccess("Projek P5 berhasil disimpan!");
    } catch {
      notifySimpanError("Gagal menyimpan Projek P5.");
    }
  };

  const handleDeleteProjek = async (projekId: string) => {
    const isConfirmed = await confirmDeleteAlert("Hapus Projek P5?", "Seluruh data projek ini akan dihapus.");
    if (isConfirmed) {
      await deleteDocument(COLLECTIONS.P5_PROJEK, projekId);
      showToastSuccess("Projek P5 berhasil dihapus.");
    }
  };

  // Assessment Handling (Matrix Penilaian)
  const getPenilaianForStudent = (studentId: string): P5PenilaianRecord => {
    const found = penilaianList.find((p) => p.projekId === selectedProjekId && p.idSiswa === studentId);
    if (found) return found;

    const studentInfo = siswaList.find((s) => s.id === studentId);
    const initialNilai: Record<string, P5Skala> = {};
    activeProjek?.subElemenList.forEach((sub) => {
      initialNilai[sub.id] = "BSH";
    });

    return {
      id: `p5-nilai-${selectedProjekId}-${studentId}`,
      projekId: selectedProjekId,
      idSiswa: studentId,
      namaSiswa: studentInfo?.nama || "",
      kelas: selectedKelas,
      nilaiSubElemen: initialNilai,
      catatanProses: `Ananda telah menunjukkan perkembangan yang sangat baik (Berkembang Sesuai Harapan) dalam mengikuti setiap tahapan projek ${activeProjek?.judul || ""}.`
    };
  };

  const handleUpdateStudentNilai = async (studentId: string, subElemenId: string, skala: P5Skala) => {
    if (!activeProjek) return;
    const currentRecord = getPenilaianForStudent(studentId);
    const updatedValues = {
      ...currentRecord.nilaiSubElemen,
      [subElemenId]: skala
    };

    const updatedRecord: P5PenilaianRecord = {
      ...currentRecord,
      nilaiSubElemen: updatedValues,
      updatedAt: Date.now()
    };

    try {
      await saveDocument(COLLECTIONS.P5_PENILAIAN, updatedRecord.id, updatedRecord);
    } catch {
      console.warn("Failed to update P5 score realtime");
    }
  };

  const handleUpdateStudentCatatan = async (studentId: string, text: string) => {
    if (!activeProjek) return;
    const currentRecord = getPenilaianForStudent(studentId);
    const updatedRecord: P5PenilaianRecord = {
      ...currentRecord,
      catatanProses: text,
      updatedAt: Date.now()
    };
    try {
      await saveDocument(COLLECTIONS.P5_PENILAIAN, updatedRecord.id, updatedRecord);
    } catch {
      console.warn("Failed to update P5 catatan");
    }
  };

  const handleSetAllBSH = async () => {
    if (!activeProjek || classStudents.length === 0) return;
    const recordsToSave: P5PenilaianRecord[] = classStudents.map((st) => {
      const rec = getPenilaianForStudent(st.id);
      const allBSH: Record<string, P5Skala> = {};
      activeProjek.subElemenList.forEach((s) => {
        allBSH[s.id] = "BSH";
      });
      return {
        ...rec,
        nilaiSubElemen: allBSH,
        updatedAt: Date.now()
      };
    });

    await batchSaveDocuments(COLLECTIONS.P5_PENILAIAN, recordsToSave);
    showToastSuccess("Semua siswa berhasil disetel capaian: BSH (Berkembang Sesuai Harapan)");
  };

  // Export Matrix Penilaian to Excel
  const handleExportPenilaianExcel = () => {
    if (!activeProjek || classStudents.length === 0) return;

    const dataRows = classStudents.map((st, idx) => {
      const rec = getPenilaianForStudent(st.id);
      const row: Record<string, string | number> = {
        "No": idx + 1,
        "NISN": st.nisn || "-",
        "Nama Siswa": st.nama,
        "Kelas": selectedKelas,
        "Judul Projek P5": activeProjek.judul,
        "Tema": activeProjek.tema
      };

      activeProjek.subElemenList.forEach((sub, sIdx) => {
        const val = rec.nilaiSubElemen[sub.id] || "BSH";
        row[`${sIdx + 1}. ${sub.subElemen} (${sub.dimensi})`] = val;
      });

      row["Catatan Proses Fasilitator"] = rec.catatanProses || "-";
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Penilaian P5");
    XLSX.writeFile(wb, `Rekap_Nilai_P5_${activeProjek.judul.replace(/\s+/g, "_")}_${selectedKelas}.xlsx`);
    showToastSuccess("File Excel Nilai P5 berhasil diunduh!");
  };

  // Portfolio Item Handling & Photo Upload
  const handleOpenNewPorto = () => {
    setEditingPorto({
      id: `porto-${Date.now()}`,
      projekId: selectedProjekId,
      judulProjek: activeProjek?.judul || "",
      idSiswa: activeSiswa?.id || "",
      namaSiswa: activeSiswa?.nama || "",
      kelas: selectedKelas,
      judulKarya: "",
      deskripsiKarya: "",
      fotoUrl: "",
      tanggal: new Date().toISOString().split("T")[0],
      refleksiSiswa: "",
      umpanBalikGuru: "Karya yang sangat menginspirasi dan menunjukkan kreativitas serta kemandirian.",
      tagDimensi: ["Kreatif", "Bergotong Royong"]
    });
    setShowPortoModal(true);
  };

  const handleUploadPortoImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Compress image to 500px max to keep Firestore doc well under 1MB
      const base64 = await compressImage(file, 500, 0.75);
      setEditingPorto((prev) => prev ? { ...prev, fotoUrl: base64 } : prev);
      showToastSuccess("Foto karya berhasil diunggah & dikompresi!");
    } catch (err) {
      console.error(err);
      notifySimpanError("Gagal mengompresi gambar karya.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSavePorto = async () => {
    if (!editingPorto || !editingPorto.judulKarya?.trim() || !editingPorto.idSiswa) {
      notifySimpanError("Nama siswa dan judul karya wajib diisi!");
      return;
    }

    const studentInfo = siswaList.find((s) => s.id === editingPorto.idSiswa);

    const recordToSave: P5PortofolioKarya = {
      id: editingPorto.id || `porto-${Date.now()}`,
      projekId: editingPorto.projekId || selectedProjekId,
      judulProjek: editingPorto.judulProjek || activeProjek?.judul || "",
      idSiswa: editingPorto.idSiswa,
      namaSiswa: studentInfo?.nama || editingPorto.namaSiswa || "",
      kelas: selectedKelas,
      judulKarya: editingPorto.judulKarya,
      deskripsiKarya: editingPorto.deskripsiKarya || "",
      fotoUrl: editingPorto.fotoUrl || "",
      tanggal: editingPorto.tanggal || new Date().toISOString().split("T")[0],
      refleksiSiswa: editingPorto.refleksiSiswa || "",
      umpanBalikGuru: editingPorto.umpanBalikGuru || "",
      tagDimensi: editingPorto.tagDimensi || [],
      updatedAt: Date.now()
    };

    try {
      await saveDocument(COLLECTIONS.P5_PORTOFOLIO, recordToSave.id, recordToSave);
      setShowPortoModal(false);
      notifySimpanSuccess("Karya portofolio berhasil disimpan!");
    } catch {
      notifySimpanError("Gagal menyimpan portofolio karya.");
    }
  };

  const handleDeletePorto = async (portoId: string) => {
    const isConfirmed = await confirmDeleteAlert("Hapus Karya Portofolio?", "Dokumentasi karya ini akan dihapus permanen.");
    if (isConfirmed) {
      await deleteDocument(COLLECTIONS.P5_PORTOFOLIO, portoId);
      showToastSuccess("Karya portofolio telah dihapus.");
    }
  };

  // PDF Export for Official P5 Report
  const handleExportRaporP5Pdf = () => {
    if (!activeProjek || !activeSiswa) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const studentNilai = getPenilaianForStudent(activeSiswa.id);

    // Kop Surat Dinas Resmi
    let topY = 12;
    if (config.Logo_Kiri) {
      try {
        doc.addImage(config.Logo_Kiri, "PNG", 14, 10, 16, 16);
      } catch (e) {}
    }
    if (config.Logo_Kanan) {
      try {
        doc.addImage(config.Logo_Kanan, "PNG", 180, 10, 16, 16);
      } catch (e) {}
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text((config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR").toUpperCase(), 105, topY, { align: "center" });
    doc.text((config.Dinas || "DINAS PENDIDIKAN").toUpperCase(), 105, topY + 4.5, { align: "center" });
    doc.setFontSize(13);
    doc.text((config.Nama_Sekolah || "SD NEGERI BABAKAN 04").toUpperCase(), 105, topY + 9.5, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const alamatFull = `${config.Alamat_Sekolah || "Alamat Sekolah"}${config.NPSN ? ` • NPSN: ${config.NPSN}` : ""}${config.Email_Sekolah ? ` • Email: ${config.Email_Sekolah}` : ""}`;
    doc.text(alamatFull, 105, topY + 14, { align: "center" });
    
    // Garis Ganda Kop Surat
    doc.setLineWidth(0.6);
    doc.line(14, topY + 17, 196, topY + 17);
    doc.setLineWidth(0.2);
    doc.line(14, topY + 18, 196, topY + 18);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("RAPOR PROJEK PENGUATAN PROFIL PELAJAR PANCASILA (P5)", 105, 36, { align: "center" });

    // Student & Project Info Table
    autoTable(doc, {
      startY: 40,
      body: [
        ["Nama Peserta Didik", `: ${activeSiswa.nama}`, "Kelas", `: ${selectedKelas}`],
        ["NISN / NIS", `: ${activeSiswa.nisn || "-"} / ${activeSiswa.nis || "-"}`, "Fase", `: ${activeProjek.fase}`],
        ["Nama Sekolah", `: ${config.Nama_Sekolah}`, "Semester", `: ${activeProjek.semester}`],
        ["Alamat", `: ${config.Alamat_Sekolah}`, "Tahun Pelajaran", `: ${activeProjek.tahunAjaran}`]
      ],
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: "bold" },
        1: { cellWidth: 70 },
        2: { cellWidth: 30, fontStyle: "bold" },
        3: { cellWidth: 55 }
      }
    });

    const afterInfoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // Project Header Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Projek 1: ${activeProjek.judul}`, 14, afterInfoY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(`Tema: ${activeProjek.tema}`, 14, afterInfoY + 5);

    // Project Description Text
    doc.setFontSize(8);
    const splitDesc = doc.splitTextToSize(activeProjek.deskripsi, 180);
    doc.text(splitDesc, 14, afterInfoY + 10);

    const afterDescY = afterInfoY + 12 + splitDesc.length * 3.5;

    // Table Rubric Matrix (MB, SB, BSH, SAB)
    const tableBody = activeProjek.subElemenList.map((sub, i) => {
      const score = studentNilai.nilaiSubElemen[sub.id] || "BSH";
      return [
        i + 1,
        `${sub.dimensi}\n- Elemen: ${sub.elemen}\n- Sub-Elemen: ${sub.subElemen}`,
        sub.capaianFase,
        score === "MB" ? "✓" : "",
        score === "SB" ? "✓" : "",
        score === "BSH" ? "✓" : "",
        score === "SAB" ? "✓" : ""
      ];
    });

    autoTable(doc, {
      startY: afterDescY,
      head: [
        [
          { content: "No", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
          { content: "Dimensi & Sub-Elemen P5", rowSpan: 2, styles: { valign: "middle" } },
          { content: "Target Capaian Fase", rowSpan: 2, styles: { valign: "middle" } },
          { content: "Capaian Siswa", colSpan: 4, styles: { halign: "center" } }
        ],
        ["MB", "SB", "BSH", "SAB"]
      ],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: "center", fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { cellWidth: 55 },
        2: { cellWidth: 65 },
        3: { halign: "center", cellWidth: 13, fontStyle: "bold" },
        4: { halign: "center", cellWidth: 13, fontStyle: "bold" },
        5: { halign: "center", cellWidth: 13, fontStyle: "bold" },
        6: { halign: "center", cellWidth: 13, fontStyle: "bold" }
      }
    });

    const afterRubricY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // Catatan Proses Fasilitator Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Catatan Perkembangan & Proses:", 14, afterRubricY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitCatatan = doc.splitTextToSize(studentNilai.catatanProses || "-", 180);
    doc.text(splitCatatan, 14, afterRubricY + 5);

    const signY = Math.max(afterRubricY + 12 + splitCatatan.length * 3.5, 235);

    // Keterangan Skala Singkat
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("Keterangan: MB = Mulai Berkembang | SB = Sedang Berkembang | BSH = Berkembang Sesuai Harapan | SAB = Sangat Berkembang", 14, signY - 6);
    doc.setTextColor(0);

    // Signatures
    doc.setFontSize(8.5);
    doc.text(`Mengetahui,`, 20, signY);
    doc.text(`Orang Tua / Wali Murid,`, 20, signY + 5);
    doc.text(`( ..................................... )`, 20, signY + 25);

    doc.text(`${config.Tempat_Tanda_Tangan || "Bogor"}, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, 130, signY);
    doc.text(`Guru Fasilitator Projek / Wali Kelas,`, 130, signY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(currentUser?.nama || config.Nama_Guru, 130, signY + 25);
    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${config.NIP_Guru || "-"}`, 130, signY + 29);

    doc.text(`Kepala Sekolah,`, 80, signY + 12);
    doc.setFont("helvetica", "bold");
    doc.text(config.Nama_Kepsek, 80, signY + 32);
    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${config.NIP_Kepsek || "-"}`, 80, signY + 36);

    doc.save(`Rapor_P5_${activeSiswa.nama.replace(/\s+/g, "_")}_${selectedKelas}.pdf`);
    showToastSuccess("Rapor P5 PDF berhasil diunduh!");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm tracking-wide flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              KURIKULUM MERDEKA RESMI
            </span>
            <span className="bg-amber-400 text-gray-950 px-2.5 py-0.5 rounded-full text-xs font-black">
              P5 Profil Pelajar Pancasila
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Compass className="w-8 h-8 text-yellow-300" />
            Portofolio Digital & Rekam Jejak P5
          </h1>
          <p className="text-teal-100 text-sm mt-1 max-w-2xl">
            Kelola tema projek P5, asesmen capaian 6 dimensi (MB, SB, BSH, SAB), galeri dokumentasi karya digital siswa, dan cetak Lembar Rapor P5 standar Kemdikbudristek!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenNewPorto}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
          >
            <Camera className="w-4 h-4" />
            + Unggah Karya Siswa
          </button>
        </div>
      </div>

      {/* Selector & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilih Projek P5 */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              Projek P5:
            </label>
            <select
              value={selectedProjekId}
              onChange={(e) => setSelectedProjekId(e.target.value)}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500 max-w-sm"
            >
              {projekList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.judul} ({p.tema})
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Kelas */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Kelas:
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-teal-500"
            >
              {allowedClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} ({siswaList.filter((s) => s.kelas === cls).length} Siswa)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenNewProjek}
          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Projek P5
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("projek")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "projek"
              ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Layers className="w-4 h-4" />
          🌟 Perencanaan & Tema Projek P5 ({projekList.length})
        </button>

        <button
          onClick={() => setActiveTab("penilaian")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "penilaian"
              ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          📝 Matriks Penilaian Dimensi P5 ({classStudents.length} Siswa)
        </button>

        <button
          onClick={() => setActiveTab("portofolio")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "portofolio"
              ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Camera className="w-4 h-4 text-yellow-500" />
          🖼️ Galeri Portofolio & Dokumentasi Karya ({portofolioList.length})
        </button>

        <button
          onClick={() => setActiveTab("cetak_rapor")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "cetak_rapor"
              ? "border-teal-600 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Printer className="w-4 h-4 text-purple-500" />
          🖨️ Cetak Lembar Rapor P5 Resmi
        </button>
      </div>

      {/* TAB 1: KELOLA PROJEK P5 */}
      {activeTab === "projek" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projekList.map((projek) => (
              <div
                key={projek.id}
                className={`p-6 rounded-2xl border transition-all ${
                  projek.id === selectedProjekId
                    ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-400/40 shadow-md"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5" />
                    Tema: {projek.tema}
                  </span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-md text-xs font-bold">
                    {projek.fase} • {projek.semester}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-gray-900 dark:text-white mb-2">
                  {projek.judul}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 mb-4">
                  {projek.deskripsi}
                </p>

                {/* Sub-elements count */}
                <div className="space-y-2 mb-4">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block uppercase">
                    Target Dimensi & Sub-Elemen ({projek.subElemenList.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {projek.subElemenList.map((sub) => (
                      <span
                        key={sub.id}
                        className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 truncate max-w-xs"
                      >
                        {sub.dimensi.split(",")[0]} • {sub.subElemen}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Fasilitator: <strong className="text-gray-800 dark:text-gray-200">{projek.fasilitator}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedProjekId(projek.id);
                        setActiveTab("penilaian");
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition"
                    >
                      Buka Penilaian
                    </button>
                    <button
                      onClick={() => {
                        setEditingProjek(projek);
                        setShowProjekModal(true);
                      }}
                      className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Edit Projek"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProjek(projek.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Hapus Projek"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MATRIKS PENILAIAN DIMENSI P5 */}
      {activeTab === "penilaian" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  Matriks Asesmen Dimensi P5 Siswa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Projek: <strong>{activeProjek?.judul}</strong> ({activeProjek?.tema}) • Kelas: {selectedKelas}
                </p>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSetAllBSH}
                  className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  ✓ Set Semua BSH
                </button>
                <button
                  onClick={handleExportPenilaianExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  Ekspor Excel
                </button>
              </div>
            </div>

            {/* Rubric Legend */}
            <div className="my-4 flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300">Skala Kurikulum Merdeka:</span>
              <span className="flex items-center gap-1 font-semibold text-rose-600">
                <span className="w-3 h-3 rounded-full bg-rose-500" /> MB (Mulai Berkembang)
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> SB (Sedang Berkembang)
              </span>
              <span className="flex items-center gap-1 font-semibold text-blue-600">
                <span className="w-3 h-3 rounded-full bg-blue-500" /> BSH (Berkembang Sesuai Harapan)
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> SAB (Sangat Berkembang)
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto my-4">
              <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold uppercase">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 min-w-[170px]">Nama Siswa</th>
                    {activeProjek?.subElemenList.map((sub, idx) => (
                      <th key={sub.id} className="p-3 text-center min-w-[150px]">
                        <div className="font-bold text-teal-700 dark:text-teal-300">{sub.subElemen}</div>
                        <div className="text-[10px] text-gray-500 font-normal truncate max-w-[150px]">{sub.dimensi.split(",")[0]}</div>
                      </th>
                    ))}
                    <th className="p-3 min-w-[220px]">Catatan Proses & Deskripsi Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-medium">
                  {classStudents.map((st, idx) => {
                    const rec = getPenilaianForStudent(st.id);

                    return (
                      <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="p-3 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          {st.nama}
                          <div className="text-[10px] text-gray-400 font-normal">NISN: {st.nisn || "-"}</div>
                        </td>

                        {/* Sub-element score toggles */}
                        {activeProjek?.subElemenList.map((sub) => {
                          const currentSkala = rec.nilaiSubElemen[sub.id] || "BSH";
                          return (
                            <td key={sub.id} className="p-2 text-center">
                              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-800">
                                {(["MB", "SB", "BSH", "SAB"] as P5Skala[]).map((skala) => {
                                  const isSelected = currentSkala === skala;
                                  let bgClass = "bg-teal-600 text-white shadow";
                                  if (skala === "MB") bgClass = "bg-rose-600 text-white shadow";
                                  if (skala === "SB") bgClass = "bg-amber-500 text-white shadow";
                                  if (skala === "BSH") bgClass = "bg-blue-600 text-white shadow";
                                  if (skala === "SAB") bgClass = "bg-emerald-600 text-white shadow";

                                  return (
                                    <button
                                      key={skala}
                                      onClick={() => handleUpdateStudentNilai(st.id, sub.id, skala)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold transition-all ${
                                        isSelected
                                          ? bgClass
                                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      {skala}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}

                        {/* Catatan Proses Textarea */}
                        <td className="p-2">
                          <textarea
                            value={rec.catatanProses || ""}
                            onChange={(e) => handleUpdateStudentCatatan(st.id, e.target.value)}
                            placeholder="Catatan keaktifan dan perkembangan proses peserta didik..."
                            rows={2}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-xs text-gray-900 dark:text-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GALERI PORTOFOLIO & DOKUMENTASI KARYA */}
      {activeTab === "portofolio" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-teal-600" />
                  Dokumentasi Karya & Refleksi Siswa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Arsip digital foto produk, poster, prototipe, atau aksi nyata projek peserta didik.
                </p>
              </div>

              <button
                onClick={handleOpenNewPorto}
                className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Unggah Karya Baru
              </button>
            </div>

            {/* Gallery Cards Grid */}
            {portofolioList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-6">
                {portofolioList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition group"
                  >
                    {/* Photo area */}
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.judulKarya}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                          onClick={() => setLightboxImage({ url: item.fotoUrl!, title: item.judulKarya, desc: item.deskripsiKarya })}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="w-10 h-10 mb-1" />
                          <span className="text-[11px]">Tidak ada foto</span>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          onClick={() => handleDeletePorto(item.id)}
                          className="p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition"
                          title="Hapus Karya"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2.5 py-0.5 rounded-md text-[10px] backdrop-blur-sm font-semibold">
                        {item.tanggal}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                          {item.namaSiswa} ({item.kelas})
                        </span>
                        <span className="text-[10px] text-gray-400">{item.judulProjek}</span>
                      </div>

                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white line-clamp-1">
                        {item.judulKarya}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {item.deskripsiKarya}
                      </p>

                      {item.refleksiSiswa && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                          <strong className="block text-amber-700 dark:text-amber-400">Refleksi Siswa:</strong>
                          "{item.refleksiSiswa}"
                        </div>
                      )}

                      {item.umpanBalikGuru && (
                        <div className="bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200">
                          <strong className="block text-teal-700 dark:text-teal-400">Umpan Balik Guru:</strong>
                          "{item.umpanBalikGuru}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl my-6">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2 opacity-50" />
                <p className="text-gray-500 dark:text-gray-400 text-xs">Belum ada karya portofolio yang diunggah.</p>
                <button
                  onClick={handleOpenNewPorto}
                  className="mt-3 bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Unggah Karya Pertama
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CETAK LEMBAR RAPOR P5 RESMI */}
      {activeTab === "cetak_rapor" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Pilih Siswa:</label>
                <select
                  value={selectedSiswaId}
                  onChange={(e) => setSelectedSiswaId(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-white"
                >
                  {classStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.nisn || "-"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Browser
                </button>
                <button
                  onClick={handleExportRaporP5Pdf}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  Unduh Dokumen PDF
                </button>
              </div>
            </div>

            {/* Visual Preview of Official P5 Report Sheet */}
            {activeSiswa && activeProjek && (
              <div className="mt-6 bg-white text-gray-900 p-8 md:p-12 rounded-2xl border-2 border-gray-300 shadow-2xl max-w-4xl mx-auto font-serif">
                {/* Header Kop */}
                <KopSuratDinas config={config} showDoubleLine={true} className="mb-6" />

                <div className="text-center mb-6">
                  <h3 className="text-base font-extrabold tracking-wide uppercase underline">
                    RAPOR PROJEK PENGUATAN PROFIL PELAJAR PANCASILA
                  </h3>
                </div>

                {/* Info Identitas */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-6 font-sans">
                  <div className="space-y-1">
                    <div className="flex"><span className="w-36 font-semibold">Nama Peserta Didik</span>: <strong>{activeSiswa.nama}</strong></div>
                    <div className="flex"><span className="w-36 font-semibold">NISN / NIS</span>: {activeSiswa.nisn || "-"} / {activeSiswa.nis || "-"}</div>
                    <div className="flex"><span className="w-36 font-semibold">Nama Sekolah</span>: {config.Nama_Sekolah}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex"><span className="w-32 font-semibold">Kelas</span>: {selectedKelas}</div>
                    <div className="flex"><span className="w-32 font-semibold">Fase</span>: {activeProjek.fase}</div>
                    <div className="flex"><span className="w-32 font-semibold">Semester / T.A.</span>: {activeProjek.semester} / {activeProjek.tahunAjaran}</div>
                  </div>
                </div>

                {/* Deskripsi Projek */}
                <div className="mb-6 font-sans bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-extrabold text-xs text-gray-900 mb-1">
                    Projek 1: {activeProjek.judul} (Tema: {activeProjek.tema})
                  </h4>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {activeProjek.deskripsi}
                  </p>
                </div>

                {/* Tabel Rubrik Matriks Capaian */}
                <div className="overflow-x-auto mb-6 font-sans">
                  <table className="w-full text-left text-xs border border-gray-400">
                    <thead className="bg-gray-100 text-gray-900 border-b border-gray-400">
                      <tr>
                        <th className="p-2 border-r border-gray-400 w-8 text-center" rowSpan={2}>No</th>
                        <th className="p-2 border-r border-gray-400" rowSpan={2}>Dimensi & Sub-Elemen P5</th>
                        <th className="p-2 border-r border-gray-400" rowSpan={2}>Target Capaian Fase</th>
                        <th className="p-2 border-b border-gray-400 text-center" colSpan={4}>Capaian Siswa</th>
                      </tr>
                      <tr>
                        <th className="p-1 border-r border-gray-400 text-center w-10">MB</th>
                        <th className="p-1 border-r border-gray-400 text-center w-10">SB</th>
                        <th className="p-1 border-r border-gray-400 text-center w-10">BSH</th>
                        <th className="p-1 text-center w-10">SAB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {activeProjek.subElemenList.map((sub, i) => {
                        const rec = getPenilaianForStudent(activeSiswa.id);
                        const score = rec.nilaiSubElemen[sub.id] || "BSH";
                        return (
                          <tr key={sub.id}>
                            <td className="p-2 text-center border-r border-gray-300 font-bold">{i + 1}</td>
                            <td className="p-2 border-r border-gray-300">
                              <strong className="block text-gray-900">{sub.dimensi}</strong>
                              <span className="text-[11px] text-gray-600">Sub: {sub.subElemen}</span>
                            </td>
                            <td className="p-2 border-r border-gray-300 text-[11px] text-gray-700">
                              {sub.capaianFase}
                            </td>
                            <td className="p-1 text-center border-r border-gray-300 font-bold text-rose-600">{score === "MB" ? "✓" : ""}</td>
                            <td className="p-1 text-center border-r border-gray-300 font-bold text-amber-600">{score === "SB" ? "✓" : ""}</td>
                            <td className="p-1 text-center border-r border-gray-300 font-bold text-blue-600">{score === "BSH" ? "✓" : ""}</td>
                            <td className="p-1 text-center font-bold text-emerald-600">{score === "SAB" ? "✓" : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Catatan Proses */}
                <div className="mb-8 font-sans bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                  <span className="font-bold block text-gray-900 mb-1">Catatan Perkembangan & Proses:</span>
                  <p className="text-gray-800 leading-relaxed">
                    {getPenilaianForStudent(activeSiswa.id).catatanProses || "-"}
                  </p>
                </div>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-3 gap-4 text-center text-xs font-sans mt-10">
                  <div>
                    <p>Mengetahui,</p>
                    <p>Orang Tua / Wali Murid</p>
                    <div className="h-16" />
                    <p className="font-bold">( ..................................... )</p>
                  </div>
                  <div>
                    <p>Kepala Sekolah,</p>
                    <p>{config.Nama_Sekolah}</p>
                    <div className="h-16" />
                    <p className="font-bold underline">{config.Nama_Kepsek}</p>
                    <p className="text-[10px] text-gray-600">NIP. {config.NIP_Kepsek || "-"}</p>
                  </div>
                  <div>
                    <p>{config.Tempat_Tanda_Tangan || "Bogor"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                    <p>Guru Fasilitator Projek / Wali</p>
                    <div className="h-16" />
                    <p className="font-bold underline">{currentUser?.nama || config.Nama_Guru}</p>
                    <p className="text-[10px] text-gray-600">NIP. {config.NIP_Guru || "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-xl w-full text-center shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage.url} alt={lightboxImage.title} className="w-full max-h-[60vh] object-contain rounded-2xl mx-auto" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{lightboxImage.title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">{lightboxImage.desc}</p>
            <button
              onClick={() => setLightboxImage(null)}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2 rounded-xl text-xs font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Editor Modal for Projek */}
      {showProjekModal && editingProjek && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" />
                {editingProjek.id.startsWith("p5-projek-") ? "Edit Projek P5" : "Buat Projek P5 Baru"}
              </h3>
              <button onClick={() => setShowProjekModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Judul Projek P5</label>
                <input
                  type="text"
                  value={editingProjek.judul}
                  onChange={(e) => setEditingProjek({ ...editingProjek, judul: e.target.value })}
                  placeholder="Contoh: Pembuatan Kompos Organik Sekolah"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Tema P5 Resmi</label>
                <select
                  value={editingProjek.tema}
                  onChange={(e) => setEditingProjek({ ...editingProjek, tema: e.target.value as P5Tema })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                >
                  {DAFTAR_TEMA_P5.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Fase & Kelas</label>
                <input
                  type="text"
                  value={editingProjek.fase}
                  onChange={(e) => setEditingProjek({ ...editingProjek, fase: e.target.value })}
                  placeholder="Contoh: Fase C (Kelas 5-6)"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Fasilitator Projek</label>
                <input
                  type="text"
                  value={editingProjek.fasilitator}
                  onChange={(e) => setEditingProjek({ ...editingProjek, fasilitator: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Deskripsi Singkat Projek</label>
              <textarea
                value={editingProjek.deskripsi}
                onChange={(e) => setEditingProjek({ ...editingProjek, deskripsi: e.target.value })}
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
              />
            </div>

            {/* Sub-elements Target Selector */}
            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Target Dimensi & Elemen/Sub-Elemen ({editingProjek.subElemenList.length})
                </h4>
                <button
                  onClick={() => {
                    const sample = DAFTAR_DIMENSI_P5[0].elemenList[0];
                    const newSub: P5SubElemenTarget = {
                      id: `sub-${Date.now()}`,
                      dimensi: DAFTAR_DIMENSI_P5[0].dimensi,
                      elemen: sample.elemen,
                      subElemen: sample.subElemen,
                      capaianFase: sample.capaian
                    };
                    setEditingProjek({
                      ...editingProjek,
                      subElemenList: [...editingProjek.subElemenList, newSub]
                    });
                  }}
                  className="bg-teal-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Sub-Elemen
                </button>
              </div>

              {editingProjek.subElemenList.map((sub, idx) => (
                <div key={sub.id || idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-600">Sub-Elemen #{idx + 1}</span>
                    {editingProjek.subElemenList.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = editingProjek.subElemenList.filter((_, i) => i !== idx);
                          setEditingProjek({ ...editingProjek, subElemenList: updated });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Dimensi</label>
                      <select
                        value={sub.dimensi}
                        onChange={(e) => {
                          const chosenDim = DAFTAR_DIMENSI_P5.find((d) => d.dimensi === e.target.value);
                          const firstElem = chosenDim?.elemenList[0];
                          const updated = [...editingProjek.subElemenList];
                          updated[idx].dimensi = e.target.value;
                          if (firstElem) {
                            updated[idx].elemen = firstElem.elemen;
                            updated[idx].subElemen = firstElem.subElemen;
                            updated[idx].capaianFase = firstElem.capaian;
                          }
                          setEditingProjek({ ...editingProjek, subElemenList: updated });
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs font-medium"
                      >
                        {DAFTAR_DIMENSI_P5.map((d) => (
                          <option key={d.dimensi} value={d.dimensi}>{d.dimensi}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Sub-Elemen</label>
                      <input
                        type="text"
                        value={sub.subElemen}
                        onChange={(e) => {
                          const updated = [...editingProjek.subElemenList];
                          updated[idx].subElemen = e.target.value;
                          setEditingProjek({ ...editingProjek, subElemenList: updated });
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Target Capaian Akhir Fase</label>
                    <textarea
                      value={sub.capaianFase}
                      onChange={(e) => {
                        const updated = [...editingProjek.subElemenList];
                        updated[idx].capaianFase = e.target.value;
                        setEditingProjek({ ...editingProjek, subElemenList: updated });
                      }}
                      rows={2}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowProjekModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveProjek}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                Simpan Projek P5
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Portofolio Item */}
      {showPortoModal && editingPorto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-600" />
                Unggah Karya Portofolio Siswa
              </h3>
              <button onClick={() => setShowPortoModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Pilih Siswa Pembuat Karya</label>
              <select
                value={editingPorto.idSiswa}
                onChange={(e) => setEditingPorto({ ...editingPorto, idSiswa: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
              >
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Judul Karya / Aksi Projek</label>
              <input
                type="text"
                value={editingPorto.judulKarya || ""}
                onChange={(e) => setEditingPorto({ ...editingPorto, judulKarya: e.target.value })}
                placeholder="Contoh: Poster Kampanye Hemat Energi Ramah Lingkungan"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
              />
            </div>

            {/* Photo Upload with auto compress */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Foto Dokumentasi Karya</label>
              <div className="flex items-center gap-3">
                {editingPorto.fotoUrl ? (
                  <img src={editingPorto.fotoUrl} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-gray-300" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadPortoImage}
                    disabled={isUploadingImage}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400 block mt-1">Otomatis dikompresi & dioptimalkan ke resolusi ramah database.</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Deskripsi Karya</label>
              <textarea
                value={editingPorto.deskripsiKarya || ""}
                onChange={(e) => setEditingPorto({ ...editingPorto, deskripsiKarya: e.target.value })}
                rows={2}
                placeholder="Deskripsi bahan, proses pembuatan, dan manfaat karya..."
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Refleksi Pribadi Siswa</label>
              <textarea
                value={editingPorto.refleksiSiswa || ""}
                onChange={(e) => setEditingPorto({ ...editingPorto, refleksiSiswa: e.target.value })}
                rows={2}
                placeholder="Apa yang saya pelajari & rasakan saat membuat karya ini..."
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Umpan Balik / Apresiasi Guru Fasilitator</label>
              <textarea
                value={editingPorto.umpanBalikGuru || ""}
                onChange={(e) => setEditingPorto({ ...editingPorto, umpanBalikGuru: e.target.value })}
                rows={2}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPortoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleSavePorto}
                className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                Simpan Portofolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
