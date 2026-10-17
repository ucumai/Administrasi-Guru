import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  FileQuestion,
  Sparkles,
  Printer,
  Download,
  Save,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  Copy,
  CheckCircle2,
  Layers,
  BookOpen,
  Calendar,
  Clock,
  Award,
  CheckSquare,
  HelpCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Sparkle,
  Sliders,
  Eye,
  ListOrdered,
  Lightbulb,
  Share2,
  ChevronDown,
  X,
  User as UserIcon
} from "lucide-react";
import {
  BankSoalPaket,
  ButirSoal,
  KisiKisiItem,
  Pengaturan,
  User,
  TipeSoal,
  LevelKognitif,
  BentukAsesmen
} from "../types";
import { KopSuratDinas } from "./KopSuratDinas";
import {
  saveDocument,
  deleteDocument,
  COLLECTIONS
} from "../lib/firebase";
import { getLocalDateStr } from "../lib/dateUtils";
import {
  notifySimpanSuccess,
  notifySimpanError,
  notifyHapusSuccess,
  notifyHapusError,
  notifyCetakSuccess,
  notifyUnduhSuccess,
  notifyUnduhError,
  confirmDeleteAlert
} from "../lib/swal";

interface GeneratorSoalAIViewProps {
  config: Pengaturan;
  currentUser?: User | null;
  bankSoalList: BankSoalPaket[];
}

export const GeneratorSoalAIView: React.FC<GeneratorSoalAIViewProps> = ({
  config,
  currentUser,
  bankSoalList
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"generator" | "bank" | "preview">("generator");
  const [previewSubTab, setPreviewSubTab] = useState<"naskah" | "ljk" | "kunci" | "kisikisi" | "rubrik">("naskah");

  // Generator Form State
  const [mataPelajaran, setMataPelajaran] = useState<string>("IPAS");
  const [kelas, setKelas] = useState<string>("Kelas 4");
  const [fase, setFase] = useState<string>("Fase B (Kelas 3-4)");
  const [semester, setSemester] = useState<string>("1 (Ganjil)");
  const [tahunAjaran, setTahunAjaran] = useState<string>("2026/2027");
  const [bentukAsesmen, setBentukAsesmen] = useState<BentukAsesmen>("Sumatif Lingkup Materi");
  const [topikMateri, setTopikMateri] = useState<string>("Wujud Zat dan Perubahannya");
  const [subTopik, setSubTopik] = useState<string>("Perubahan Wujud Benda dalam Kehidupan Sehari-hari");
  const [capaianPembelajaran, setCapaianPembelajaran] = useState<string>("");
  const [materiRangkuman, setMateriRangkuman] = useState<string>("");
  const [alokasiWaktu, setAlokasiWaktu] = useState<string>("60 Menit");
  const [namaGuru, setNamaGuru] = useState<string>(currentUser?.nama || config.Nama_Guru || "");
  const [nipGuru, setNipGuru] = useState<string>(currentUser?.nip || config.NIP_Guru || "");

  // Sync teacher data with current logged in user or global config
  useEffect(() => {
    if (currentUser?.nama) {
      setNamaGuru(currentUser.nama);
    } else if (config.Nama_Guru && !namaGuru) {
      setNamaGuru(config.Nama_Guru);
    }
    if (currentUser?.nip) {
      setNipGuru(currentUser.nip);
    } else if (config.NIP_Guru && !nipGuru) {
      setNipGuru(config.NIP_Guru);
    }
  }, [currentUser, config]);

  // Question counts
  const [jumlahPG, setJumlahPG] = useState<number>(10);
  const [jumlahIsian, setJumlahIsian] = useState<number>(5);
  const [jumlahUraian, setJumlahUraian] = useState<number>(3);
  const [jumlahMenjodohkan, setJumlahMenjodohkan] = useState<number>(0);
  const [jumlahBenarSalah, setJumlahBenarSalah] = useState<number>(0);

  // Cognitive distribution
  const [persenLots, setPersenLots] = useState<number>(30);
  const [persenMots, setPersenMots] = useState<number>(40);
  const [persenHots, setPersenHots] = useState<number>(30);
  const [includeStimulus, setIncludeStimulus] = useState<boolean>(true);

  // Active generated/loaded package
  const [activePaket, setActivePaket] = useState<BankSoalPaket | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Edit Single Question Modal
  const [editingSoal, setEditingSoal] = useState<ButirSoal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Variasi Soal Modal
  const [variasiSourceSoal, setVariasiSourceSoal] = useState<ButirSoal | null>(null);
  const [variasiList, setVariasiList] = useState<any[]>([]);
  const [isVariasiLoading, setIsVariasiLoading] = useState<boolean>(false);
  const [isVariasiModalOpen, setIsVariasiModalOpen] = useState<boolean>(false);

  // Bank Soal Filter
  const [filterKelas, setFilterKelas] = useState<string>("Semua");
  const [filterMapel, setFilterMapel] = useState<string>("Semua");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // Mapel suggestions by Class
  const mapelOptions = [
    "Pendidikan Pancasila",
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pendidikan Agama Islam & BP",
    "PJOK",
    "Seni Rupa",
    "Seni Musik",
    "Bahasa Sunda",
    "Bahasa Inggris"
  ];

  // Auto set Fase when Kelas changes
  const handleKelasChange = (val: string) => {
    setKelas(val);
    if (val === "Kelas 1" || val === "Kelas 2") {
      setFase("Fase A (Kelas 1-2)");
    } else if (val === "Kelas 3" || val === "Kelas 4") {
      setFase("Fase B (Kelas 3-4)");
    } else {
      setFase("Fase C (Kelas 5-6)");
    }
  };

  // Preset Topics based on selection
  const topicPresets: { [key: string]: { [key: string]: string[] } } = {
    "IPAS": {
      "Fase B (Kelas 3-4)": [
        "Wujud Zat dan Perubahannya",
        "Bagian Tubuh Tumbuhan dan Fungsinya",
        "Gaya di Sekitar Kita (Otot, Gesek, Magnet, Gravitasi)",
        "Energi yang Mengubah Bentuk",
        "Siklus Hidup Hewan dan Metamorfosis"
      ],
      "Fase C (Kelas 5-6)": [
        "Sistem Organ Tubuh Manusia (Pencernaan & Pernapasan)",
        "Ekosistem dan Rantai Makanan",
        "Siklus Air dan Kelestarian Alam",
        "Listrik dan Magnet dalam Kehidupan Modern",
        "Tata Surya dan Gerak Bumi"
      ]
    },
    "Matematika": {
      "Fase A (Kelas 1-2)": [
        "Bilangan Cacah sampai 100 dan Nilai Tempat",
        "Penjumlahan dan Pengurangan Bersusun",
        "Bentuk Bangun Datar dan Pola Gambar",
        "Pengukuran Panjang dan Berat dengan Satuan Tidak Baku"
      ],
      "Fase B (Kelas 3-4)": [
        "Operasi Hitung Perkalian dan Pembagian",
        "Pecahan Senilai dan Perbandingan Pecahan",
        "Keliling dan Luas Persegi & Persegi Panjang",
        "Penyajian Data dalam Diagram Gambar dan Batang"
      ],
      "Fase C (Kelas 5-6)": [
        "Operasi Hitung Pecahan dan Desimal",
        "Perbandingan, Rasio, dan Skala Denah",
        "Volume Kubus, Balok, dan Bangun Ruang Gabungan",
        "Pengolahan Data (Mean, Median, Modus)"
      ]
    },
    "Bahasa Indonesia": {
      "Fase B (Kelas 3-4)": [
        "Ide Pokok dan Informasi Tersurat dalam Paragraf",
        "Teks Petunjuk (Prosedur) Sederhana",
        "Penggunaan Tanda Baca Titik, Koma, dan Huruf Kapital",
        "Menulis Paragraf Deskripsi Lingkungan Sekitar"
      ],
      "Fase C (Kelas 5-6)": [
        "Teks Eksplanasi Ilmiah dan Fakta vs Opini",
        "Unsur Intrinsik Cerita Fiksi (Tokoh, Latar, Amanat)",
        "Surat Resmi dan Surat Pribadi",
        "Membuat Ringkasan Teks Non-fiksi dan Informasi Penting"
      ]
    },
    "Pendidikan Pancasila": {
      "Fase B (Kelas 3-4)": [
        "Simbol dan Sila-Sila Pancasila dalam Keseharian",
        "Hak dan Kewajiban Anak di Rumah dan Sekolah",
        "Keberagaman Suku, Agama, dan Budaya di Lingkungan Sekitar",
        "Musyawarah untuk Mufakat di Lingkungan Sekolah"
      ],
      "Fase C (Kelas 5-6)": [
        "Nilai-Nilai Pancasila sebagai Pandangan Hidup Bangsa",
        "Norma, Hak, dan Kewajiban dalam Masyarakat",
        "Gotong Royong dan Kebhinekaan Global",
        "Menjaga Persatuan dan Kesatuan Wilayah NKRI"
      ]
    }
  };

  const currentTopicSuggestions =
    topicPresets[mataPelajaran]?.[fase] || [
      "Konsep Dasar dan Pemahaman Materi",
      "Penerapan Konsep dalam Kehidupan Sehari-hari",
      "Analisis Kasus dan Penyelesaian Masalah"
    ];

  // Generate Package Handler
  const handleGenerateSoal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const totalSoalCount = jumlahPG + jumlahIsian + jumlahUraian + jumlahMenjodohkan + jumlahBenarSalah;
    if (totalSoalCount <= 0) {
      notifySimpanError("Pilih minimal 1 butir soal untuk digenerate.");
      return;
    }

    if (!topikMateri.trim()) {
      notifySimpanError("Mohon masukkan Topik / Bab Materi yang akan diuji.");
      return;
    }

    setIsGenerating(true);

    try {
      const payload = {
        mataPelajaran,
        kelas,
        fase,
        semester,
        tahunAjaran,
        bentukAsesmen,
        topikMateri,
        subTopik,
        capaianPembelajaran,
        materiRangkuman,
        alokasiWaktu,
        jumlahPilihanGanda: jumlahPG,
        jumlahIsian,
        jumlahUraian,
        jumlahMenjodohkan,
        jumlahBenarSalah,
        persenLots,
        persenMots,
        persenHots,
        includeStimulus,
        namaGuru: namaGuru.trim() || currentUser?.nama || config.Nama_Guru || "Guru Pengampu",
        nipGuru: nipGuru.trim() || currentUser?.nip || config.NIP_Guru || "-",
        namaSekolah: config.Nama_Sekolah || "SD NEGERI BABAKAN 04"
      };

      const response = await fetch("/api/ai/generate-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.status === "success" && data.paket) {
        const paketResult: BankSoalPaket = {
          ...data.paket,
          id: `paket_${Date.now()}`,
          namaGuru: namaGuru.trim() || currentUser?.nama || config.Nama_Guru || "Guru Pengampu",
          nipGuru: nipGuru.trim() || currentUser?.nip || config.NIP_Guru || "-",
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        setActivePaket(paketResult);
        setActiveTab("preview");
        setPreviewSubTab("naskah");
        notifySimpanSuccess("Paket Soal AI berhasil disusun beserta Kisi-Kisi & Kunci Jawaban!");
      } else {
        throw new Error(data.message || "Gagal membuat naskah soal.");
      }
    } catch (err: any) {
      console.error("Error generating soal:", err);
      notifySimpanError(err?.message || "Terjadi kesalahan saat menyusun soal AI. Silakan coba kembali.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Current Package to Firestore Bank Soal
  const handleSaveToBankSoal = async () => {
    if (!activePaket) return;
    setIsSaving(true);
    try {
      const docId = activePaket.id.startsWith("paket_") ? activePaket.id : `paket_${Date.now()}`;
      const toSave: BankSoalPaket = {
        ...activePaket,
        id: docId,
        updatedAt: Date.now()
      };

      await saveDocument(COLLECTIONS.BANK_SOAL, docId, toSave);
      setActivePaket(toSave);
      notifySimpanSuccess("Paket Soal berhasil disimpan permanen ke Bank Soal Database!");
    } catch (err: any) {
      console.error("Error saving bank soal:", err);
      notifySimpanError("Gagal menyimpan ke Bank Soal: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Package from Firestore
  const handleDeletePaket = async (paket: BankSoalPaket) => {
    const isConfirmed = await confirmDeleteAlert(
      `Hapus Paket Soal "${paket.judul}"?`,
      "Paket soal dan kisi-kisi terkait akan dihapus dari Bank Soal."
    );
    if (!isConfirmed) return;

    try {
      await deleteDocument(COLLECTIONS.BANK_SOAL, paket.id);
      if (activePaket?.id === paket.id) {
        setActivePaket(null);
        setActiveTab("bank");
      }
      notifyHapusSuccess("Paket Soal berhasil dihapus.");
    } catch (err: any) {
      notifyHapusError("Gagal menghapus: " + err.message);
    }
  };

  // Load Package from Bank
  const handleLoadPaket = (paket: BankSoalPaket) => {
    setActivePaket(paket);
    setActiveTab("preview");
    setPreviewSubTab("naskah");
  };

  // Copy Clean Text to Clipboard
  const handleCopyText = () => {
    if (!activePaket) return;

    let text = `${config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}\n`;
    text += `${activePaket.judul.toUpperCase()}\n`;
    text += `Mata Pelajaran: ${activePaket.mataPelajaran} | Kelas: ${activePaket.kelas}\n`;
    text += `Guru Pengampu: ${activePaket.namaGuru || currentUser?.nama || config.Nama_Guru || "-"}\n`;
    text += `Semester: ${activePaket.semester} | Tahun Ajaran: ${activePaket.tahunAjaran} | Waktu: ${activePaket.alokasiWaktu}\n\n`;
    text += `PETUNJUK UMUM:\n${activePaket.petunjukUmum || "1. Berdoalah sebelum mulai."}\n\n`;

    const pgSoal = activePaket.daftarSoal.filter((s) => s.tipe === "pilihan_ganda");
    if (pgSoal.length > 0) {
      text += `A. PILIHAN GANDA\n`;
      pgSoal.forEach((s) => {
        text += `${s.nomor}. ${s.stimulus ? `(${s.stimulus})\n` : ""}${s.pertanyaan}\n`;
        if (s.pilihanJawaban) {
          Object.entries(s.pilihanJawaban).forEach(([k, v]) => {
            text += `   ${k}. ${v}\n`;
          });
        }
        text += `\n`;
      });
    }

    const isianSoal = activePaket.daftarSoal.filter((s) => s.tipe === "isian");
    if (isianSoal.length > 0) {
      text += `\nB. ISIAN SINGKAT\n`;
      isianSoal.forEach((s) => {
        text += `${s.nomor}. ${s.pertanyaan}\n\n`;
      });
    }

    const uraianSoal = activePaket.daftarSoal.filter((s) => s.tipe === "uraian");
    if (uraianSoal.length > 0) {
      text += `\nC. URAIAN / ESAI\n`;
      uraianSoal.forEach((s) => {
        text += `${s.nomor}. ${s.pertanyaan}\n\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Export to Word (.doc)
  const handleExportDoc = () => {
    if (!activePaket) return;

    try {
      const content = document.getElementById("printable-soal-area");
      if (!content) throw new Error("Area naskah tidak ditemukan.");

      const headerHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${activePaket.judul}</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.3; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th, td { border: 1px solid #333; padding: 6px; font-size: 10pt; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px; }
            .kop h2 { margin: 0; font-size: 14pt; }
            .kop h1 { margin: 2px 0; font-size: 16pt; font-weight: bold; }
            .kop p { margin: 2px 0; font-size: 9pt; }
            .identity-box { border: 1px solid #000; padding: 8px; margin-bottom: 15px; }
            .soal-item { margin-bottom: 14px; }
            .pilihan-grid { margin-left: 18px; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
        </html>
      `;

      const blob = new Blob(["\ufeff" + headerHtml], {
        type: "application/msword"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Naskah_Soal_${activePaket.mataPelajaran}_${activePaket.kelas}_${activePaket.topikMateri.replace(/\s+/g, "_")}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifyUnduhSuccess("Dokumen Naskah Soal berhasil diexport ke Word (.doc)!");
    } catch (err: any) {
      notifyUnduhError("Gagal export Word: " + err.message);
    }
  };

  // Export Kisi-Kisi & Kunci to Excel
  const handleExportExcel = () => {
    if (!activePaket) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Kisi-kisi Soal
      const kisiData = activePaket.kisiKisi.map((k) => ({
        "No Soal": k.nomorSoal,
        "Capaian / Tujuan Pembelajaran": k.tujuanPembelajaran,
        "Materi": k.materi,
        "Indikator Soal": k.indikatorSoal,
        "Level Kognitif": k.levelKognitif,
        "Bentuk Soal": k.bentukSoal,
        "Kunci": k.nomorKunci,
        "Skor": k.skor
      }));
      const wsKisi = XLSX.utils.json_to_sheet(kisiData);
      XLSX.utils.book_append_sheet(wb, wsKisi, "Kisi-Kisi Asesmen");

      // Sheet 2: Kunci & Pembahasan
      const kunciData = activePaket.daftarSoal.map((s) => ({
        "No Soal": s.nomor,
        "Tipe Soal": s.tipe,
        "Level": s.level,
        "Pertanyaan": s.pertanyaan,
        "Kunci Jawaban": s.kunciJawaban,
        "Pembahasan": s.pembahasan,
        "Skor Maksimal": s.skorMaksimal
      }));
      const wsKunci = XLSX.utils.json_to_sheet(kunciData);
      XLSX.utils.book_append_sheet(wb, wsKunci, "Kunci & Pembahasan");

      XLSX.writeFile(
        wb,
        `Kisi_Kisi_${activePaket.mataPelajaran}_${activePaket.kelas}_${activePaket.topikMateri.replace(/\s+/g, "_")}.xlsx`
      );
      notifyUnduhSuccess("Kisi-kisi & Kunci Jawaban berhasil diexport ke Excel!");
    } catch (err: any) {
      notifyUnduhError("Gagal export Excel: " + err.message);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Edit Soal Handlers
  const handleOpenEditModal = (soal: ButirSoal) => {
    setEditingSoal(JSON.parse(JSON.stringify(soal)));
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSoal = () => {
    if (!editingSoal || !activePaket) return;

    const updatedDaftar = activePaket.daftarSoal.map((s) =>
      s.nomor === editingSoal.nomor ? editingSoal : s
    );

    setActivePaket({
      ...activePaket,
      daftarSoal: updatedDaftar,
      updatedAt: Date.now()
    });

    setIsEditModalOpen(false);
    setEditingSoal(null);
    notifySimpanSuccess(`Butir soal No. ${editingSoal.nomor} berhasil diperbarui!`);
  };

  // Generate Variasi Soal Handler
  const handleOpenVariasiModal = async (soal: ButirSoal) => {
    setVariasiSourceSoal(soal);
    setVariasiList([]);
    setIsVariasiModalOpen(true);
    setIsVariasiLoading(true);

    try {
      const res = await fetch("/api/ai/variasi-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soalAsli: soal,
          tingkatKesulitan: "Setara",
          mataPelajaran: activePaket?.mataPelajaran || mataPelajaran,
          kelas: activePaket?.kelas || kelas
        })
      });

      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.variasi)) {
        setVariasiList(data.variasi);
      }
    } catch (err: any) {
      console.error("Gagal generate variasi:", err);
    } finally {
      setIsVariasiLoading(false);
    }
  };

  // Replace Soal with Variasi
  const handleReplaceWithVariasi = (variasi: any) => {
    if (!variasiSourceSoal || !activePaket) return;

    const newSoal: ButirSoal = {
      ...variasiSourceSoal,
      tipe: variasi.tipe || variasiSourceSoal.tipe,
      level: variasi.level || variasiSourceSoal.level,
      stimulus: variasi.stimulus || "",
      pertanyaan: variasi.pertanyaan,
      pilihanJawaban: variasi.pilihanJawaban || variasiSourceSoal.pilihanJawaban,
      kunciJawaban: variasi.kunciJawaban,
      pembahasan: variasi.pembahasan || "",
      skorMaksimal: variasi.skorMaksimal || variasiSourceSoal.skorMaksimal
    };

    const updatedDaftar = activePaket.daftarSoal.map((s) =>
      s.nomor === variasiSourceSoal.nomor ? newSoal : s
    );

    setActivePaket({
      ...activePaket,
      daftarSoal: updatedDaftar,
      updatedAt: Date.now()
    });

    setIsVariasiModalOpen(false);
    notifySimpanSuccess(`Soal No. ${variasiSourceSoal.nomor} telah digantikan dengan variasi pilihan!`);
  };

  // Delete Single Soal from current active paket
  const handleDeleteSingleSoal = (soalNomor: number) => {
    if (!activePaket) return;
    if (activePaket.daftarSoal.length <= 1) {
      notifySimpanError("Paket harus memiliki minimal 1 butir soal.");
      return;
    }

    const filtered = activePaket.daftarSoal
      .filter((s) => s.nomor !== soalNomor)
      .map((s, idx) => ({ ...s, nomor: idx + 1 }));

    const updatedKisi = activePaket.kisiKisi
      .filter((k) => k.nomorSoal !== soalNomor)
      .map((k, idx) => ({ ...k, nomorSoal: idx + 1 }));

    setActivePaket({
      ...activePaket,
      totalSoal: filtered.length,
      daftarSoal: filtered,
      kisiKisi: updatedKisi,
      updatedAt: Date.now()
    });

    notifySimpanSuccess(`Butir soal No. ${soalNomor} berhasil dihapus.`);
  };

  // Filtered Bank Soal List
  const filteredBankSoal = bankSoalList.filter((item) => {
    const matchKelas = filterKelas === "Semua" || item.kelas === filterKelas;
    const matchMapel = filterMapel === "Semua" || item.mataPelajaran === filterMapel;
    const matchSearch =
      !searchKeyword.trim() ||
      item.judul.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.topikMateri.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.bentukAsesmen.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchKelas && matchMapel && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-blue-800/80 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 bg-yellow-400 text-slate-950 font-black px-3.5 py-1 rounded-full text-xs tracking-wider uppercase shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Question & Assessment Suite • 100% Free & Fast</span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Generator Soal AI & <span className="text-yellow-300">Bank Soal Digital</span>
            </h1>

            <p className="text-slate-200 text-sm md:text-base leading-relaxed">
              Susun naskah soal asesmen Kurikulum Merdeka (Fase A, B, C) secara otomatis, lengkap dengan stimulus literasi/numerasi, HOTS/LOTS, kunci jawaban, pembahasan, dan matriks kisi-kisi resmi SDN Babakan 04.
            </p>
          </div>

          {/* Tab Selection Buttons */}
          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab("generator")}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center space-x-2.5 transition-all cursor-pointer ${
                activeTab === "generator"
                  ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/30 scale-102"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700"
              }`}
            >
              <Sparkle className="w-4 h-4" />
              <span>1. Buat Soal AI</span>
            </button>

            <button
              onClick={() => setActiveTab("bank")}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center justify-between space-x-3 transition-all cursor-pointer ${
                activeTab === "bank"
                  ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/30 scale-102"
                  : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4" />
                <span>2. Bank Soal</span>
              </div>
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {bankSoalList.length}
              </span>
            </button>

            {activePaket && (
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center space-x-2.5 transition-all cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30 scale-102"
                    : "bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 border border-emerald-700"
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>3. Pratinjau & Cetak</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERATOR SOAL AI FORM */}
      {/* ========================================================================= */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          {/* Left / Main Configuration Form (2 Columns) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-white">
                    Parameter Asesmen & Materi Kurikulum Merdeka
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tentukan fase, mata pelajaran, topik bahasan, dan komposisi butir soal.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleGenerateSoal} className="space-y-6">
              {/* Row 1: Kelas, Fase, Mapel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Kelas SD <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={kelas}
                    onChange={(e) => handleKelasChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Kelas 1">Kelas 1 (Fase A)</option>
                    <option value="Kelas 2">Kelas 2 (Fase A)</option>
                    <option value="Kelas 3">Kelas 3 (Fase B)</option>
                    <option value="Kelas 4">Kelas 4 (Fase B)</option>
                    <option value="Kelas 5">Kelas 5 (Fase C)</option>
                    <option value="Kelas 6">Kelas 6 (Fase C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Fase Belajar
                  </label>
                  <input
                    type="text"
                    value={fase}
                    readOnly
                    className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Mata Pelajaran <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mataPelajaran}
                    onChange={(e) => setMataPelajaran(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {mapelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Bentuk Asesmen, Semester, Alokasi Waktu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Bentuk Asesmen <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bentukAsesmen}
                    onChange={(e) => setBentukAsesmen(e.target.value as BentukAsesmen)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Formatif (Ulangan Harian)">Formatif (Ulangan Harian / Kuis)</option>
                    <option value="Sumatif Lingkup Materi">Sumatif Lingkup Materi (Akhir Bab)</option>
                    <option value="Sumatif Akhir Semester (SAS / ASAS)">Sumatif Akhir Semester (SAS / ASAS)</option>
                    <option value="Sumatif Tengah Semester (STS)">Sumatif Tengah Semester (STS)</option>
                    <option value="Asesmen Diagnostik">Asesmen Diagnostik (Pre-Test)</option>
                    <option value="Remedial & Pengayaan">Remedial & Pengayaan</option>
                    <option value="Latihan Mandiri / PR">Latihan Mandiri / PR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Semester & Tahun Ajaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="1 (Ganjil)">Sem 1 (Ganjil)</option>
                      <option value="2 (Genap)">Sem 2 (Genap)</option>
                    </select>
                    <input
                      type="text"
                      value={tahunAjaran}
                      onChange={(e) => setTahunAjaran(e.target.value)}
                      placeholder="2026/2027"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Alokasi Waktu
                  </label>
                  <input
                    type="text"
                    value={alokasiWaktu}
                    onChange={(e) => setAlokasiWaktu(e.target.value)}
                    placeholder="Contoh: 60 Menit (2 JP)"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Topik Utama & Rekomendasi Cepat */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Topik / Bab Utama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topikMateri}
                  onChange={(e) => setTopikMateri(e.target.value)}
                  placeholder="Contoh: Siklus Air dan Perubahan Wujud Benda"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />

                {/* Preset Topic Pills */}
                <div className="pt-1">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Rekomendasi Topik {mataPelajaran} ({fase}):</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTopicSuggestions.map((tp, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setTopikMateri(tp)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                          topikMateri === tp
                            ? "bg-blue-600 text-white font-bold shadow-xs"
                            : "bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 4: Sub-Topik & Capaian Pembelajaran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Sub-Topik / Materi Spesifik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={subTopik}
                    onChange={(e) => setSubTopik(e.target.value)}
                    placeholder="Contoh: Evaporasi, Kondensasi, dan Presipitasi"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Tujuan Pembelajaran / CP Tertentu (Opsional)
                  </label>
                  <input
                    type="text"
                    value={capaianPembelajaran}
                    onChange={(e) => setCapaianPembelajaran(e.target.value)}
                    placeholder="Contoh: Peserta didik dapat menganalisis tahapan siklus air..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Catatan Guru / Rangkuman Materi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Tempelkan Rangkuman Materi / Catatan Modul Ajar (Opsional)</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                    AI akan membuat soal murni dari rangkuman ini
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={materiRangkuman}
                  onChange={(e) => setMateriRangkuman(e.target.value)}
                  placeholder="Jika ada teks catatan materi, ringkasan bab, atau modul ajar yang ingin dijadikan sumber soal, tempelkan di sini..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Row 6: Identitas Guru Pengampu Sesuai Akun Login */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/70 dark:bg-slate-900/60 border border-blue-200 dark:border-slate-700 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nama Guru Pengampu</span>
                  </label>
                  <input
                    type="text"
                    value={namaGuru}
                    onChange={(e) => setNamaGuru(e.target.value)}
                    placeholder="Nama Lengkap & Gelar Guru"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {currentUser?.nama && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                      ✓ Sesuai Akun Login: <strong>{currentUser.nama}</strong>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    <span>NIP / NUPTK Guru</span>
                  </label>
                  <input
                    type="text"
                    value={nipGuru}
                    onChange={(e) => setNipGuru(e.target.value)}
                    placeholder="NIP / NUPTK Guru"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 flex items-center justify-center space-x-3 text-base transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Sedang Merumuskan Butir Soal, Kisi-Kisi & Kunci Jawaban...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      <span>🚀 Generate Paket Soal + Kisi-Kisi + Kunci Jawaban (AI)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Question Composition & Cognitive Level Settings */}
          <div className="space-y-6">
            {/* Box 1: Question Formats Count */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ListOrdered className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                    Jumlah Butir Soal
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Total Soal: <span className="font-bold text-blue-600">{jumlahPG + jumlahIsian + jumlahUraian + jumlahMenjodohkan + jumlahBenarSalah} Butir</span>
                  </p>
                </div>
              </div>

              {/* PG */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Pilihan Ganda
                  </span>
                  <span className="text-[10px] text-slate-500">Opsi A-D (1 Poin/Soal)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setJumlahPG(Math.max(0, jumlahPG - 5))}
                    className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={jumlahPG}
                    onChange={(e) => setJumlahPG(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center bg-transparent font-bold text-sm text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setJumlahPG(jumlahPG + 5)}
                    className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Isian */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Isian Singkat
                  </span>
                  <span className="text-[10px] text-slate-500">Jawaban Tepat (2 Poin/Soal)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setJumlahIsian(Math.max(0, jumlahIsian - 1))}
                    className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={jumlahIsian}
                    onChange={(e) => setJumlahIsian(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center bg-transparent font-bold text-sm text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setJumlahIsian(jumlahIsian + 1)}
                    className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Uraian */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Uraian / Esai
                  </span>
                  <span className="text-[10px] text-slate-500">Penalaran (3-5 Poin/Soal)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setJumlahUraian(Math.max(0, jumlahUraian - 1))}
                    className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={jumlahUraian}
                    onChange={(e) => setJumlahUraian(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center bg-transparent font-bold text-sm text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setJumlahUraian(jumlahUraian + 1)}
                    className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Box 2: Level Kognitif & Stimulus */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                      Distribusi Level Kognitif
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Atur manual porsi Bloom Taxonomy
                    </p>
                  </div>
                </div>

                {/* Total Indicator */}
                <div className="text-right">
                  <span
                    className={`inline-block text-[11px] font-black px-2.5 py-1 rounded-lg ${
                      persenLots + persenMots + persenHots === 100
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    Total: {persenLots + persenMots + persenHots}%
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pilihan Cepat (Preset):
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPersenLots(30);
                      setPersenMots(40);
                      setPersenHots(30);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                      persenLots === 30 && persenMots === 40 && persenHots === 30
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Standar (30-40-30)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPersenLots(20);
                      setPersenMots(30);
                      setPersenHots(50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                      persenLots === 20 && persenMots === 30 && persenHots === 50
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Fokus HOTS (20-30-50)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPersenLots(50);
                      setPersenMots(35);
                      setPersenHots(15);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                      persenLots === 50 && persenMots === 35 && persenHots === 15
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Dasar LOTS (50-35-15)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPersenLots(34);
                      setPersenMots(33);
                      setPersenHots(33);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition text-center cursor-pointer ${
                      persenLots === 34 && persenMots === 33 && persenHots === 33
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Seimbang (34-33-33)
                  </button>
                </div>
              </div>

              {/* Manual Sliders & Number Adjusters */}
              <div className="space-y-4 pt-2">
                {/* 1. LOTS (Mudah C1-C2) */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Mudah (LOTS / C1-C2)
                      </span>
                      <span className="text-[10px] text-slate-500">Mengingat & Memahami</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setPersenLots(Math.max(0, persenLots - 5))}
                        className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-100"
                      >
                        -
                      </button>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={persenLots}
                          onChange={(e) => setPersenLots(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="w-12 text-center bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-md font-black text-xs text-blue-700 dark:text-blue-300 py-1 outline-none"
                        />
                        <span className="absolute right-1 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPersenLots(Math.min(100, persenLots + 5))}
                        className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={persenLots}
                    onChange={(e) => setPersenLots(Number(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 2. MOTS (Sedang C3) */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Sedang (MOTS / C3)
                      </span>
                      <span className="text-[10px] text-slate-500">Penerapan / Mengaplikasikan</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setPersenMots(Math.max(0, persenMots - 5))}
                        className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-100"
                      >
                        -
                      </button>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={persenMots}
                          onChange={(e) => setPersenMots(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="w-12 text-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-md font-black text-xs text-indigo-700 dark:text-indigo-300 py-1 outline-none"
                        />
                        <span className="absolute right-1 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPersenMots(Math.min(100, persenMots + 5))}
                        className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={persenMots}
                    onChange={(e) => setPersenMots(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 3. HOTS (Sukar C4-C6) */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Sukar / Analisis (HOTS / C4-C6)
                      </span>
                      <span className="text-[10px] text-slate-500">Analisis, Evaluasi & Kreasi</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setPersenHots(Math.max(0, persenHots - 5))}
                        className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-100"
                      >
                        -
                      </button>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={persenHots}
                          onChange={(e) => setPersenHots(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="w-12 text-center bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-md font-black text-xs text-amber-700 dark:text-amber-300 py-1 outline-none"
                        />
                        <span className="absolute right-1 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPersenHots(Math.min(100, persenHots + 5))}
                        className="w-6 h-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={persenHots}
                    onChange={(e) => setPersenHots(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Warning or Auto-balance if not 100% */}
              {persenLots + persenMots + persenHots !== 100 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                    ⚠️ Total saat ini {persenLots + persenMots + persenHots}% (Bukan 100%)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const sum = (persenLots || 0) + (persenMots || 0) + (persenHots || 0);
                      if (sum === 0) {
                        setPersenLots(30);
                        setPersenMots(40);
                        setPersenHots(30);
                        return;
                      }
                      const rLots = Math.round((persenLots / sum) * 100);
                      const rMots = Math.round((persenMots / sum) * 100);
                      const rHots = 100 - rLots - rMots;
                      setPersenLots(Math.max(0, rLots));
                      setPersenMots(Math.max(0, rMots));
                      setPersenHots(Math.max(0, rHots));
                    }}
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                  >
                    Seimbangkan ke 100%
                  </button>
                </div>
              )}

              {/* Stimulus Checkbox */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStimulus}
                    onChange={(e) => setIncludeStimulus(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Sertakan Stimulus Kontekstual
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Menyisipkan cerita pendek, kasus kehidupan nyata, atau dialog pada soal.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BANK SOAL DATABASE LIST */}
      {/* ========================================================================= */}
      {activeTab === "bank" && (
        <div className="space-y-6 print:hidden">
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Cari berdasarkan judul, topik materi, atau bentuk asesmen..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Kelas */}
              <div>
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="Semua">Semua Kelas</option>
                  <option value="Kelas 1">Kelas 1</option>
                  <option value="Kelas 2">Kelas 2</option>
                  <option value="Kelas 3">Kelas 3</option>
                  <option value="Kelas 4">Kelas 4</option>
                  <option value="Kelas 5">Kelas 5</option>
                  <option value="Kelas 6">Kelas 6</option>
                </select>
              </div>

              {/* Filter Mapel */}
              <div>
                <select
                  value={filterMapel}
                  onChange={(e) => setFilterMapel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="Semua">Semua Mapel</option>
                  {mapelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredBankSoal.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileQuestion className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Belum Ada Paket Soal Tersimpan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Gunakan menu "1. Buat Soal AI" untuk menyusun paket soal evaluasi pertama Anda dan simpan ke Bank Soal.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("generator")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition inline-flex items-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buat Paket Soal Baru Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBankSoal.map((paket) => (
                <div
                  key={paket.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold px-3 py-1 rounded-full">
                        {paket.kelas} • {paket.mataPelajaran}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {paket.tanggalDibuat || "Baru"}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white group-hover:text-blue-600 transition line-clamp-2">
                      {paket.judul}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Topik: <span className="font-bold">{paket.topikMateri}</span>
                    </p>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bentuk Asesmen:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{paket.bentukAsesmen}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jumlah Soal:</span>
                        <span className="font-bold text-blue-600">{paket.totalSoal} Butir</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Pengampu:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{paket.namaGuru}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleLoadPaket(paket)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka & Cetak</span>
                    </button>

                    <button
                      onClick={() => handleDeletePaket(paket)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition cursor-pointer"
                      title="Hapus dari Bank Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRATINJAU & CETAK SIAP UJIAN */}
      {/* ========================================================================= */}
      {activeTab === "preview" && activePaket && (
        <div className="space-y-6">
          {/* Action Toolbar (Hidden during print) */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Sub-tab Navigation */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPreviewSubTab("naskah")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    previewSubTab === "naskah"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Naskah Soal Siswa</span>
                </button>

                <button
                  onClick={() => setPreviewSubTab("ljk")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    previewSubTab === "ljk"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>2. Lembar Jawaban (LJK)</span>
                </button>

                <button
                  onClick={() => setPreviewSubTab("kunci")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    previewSubTab === "kunci"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>3. Kunci & Pembahasan</span>
                </button>

                <button
                  onClick={() => setPreviewSubTab("kisikisi")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    previewSubTab === "kisikisi"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>4. Matriks Kisi-Kisi</span>
                </button>

                <button
                  onClick={() => setPreviewSubTab("rubrik")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    previewSubTab === "rubrik"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>5. Rubrik & Penskoran</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSaveToBankSoal}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Menyimpan..." : "Simpan ke Bank Soal"}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </button>

                <button
                  onClick={handleExportDoc}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  title="Export Naskah Soal ke Word (.doc)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Word</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  title="Export Kisi-Kisi ke Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={handleCopyText}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Salin Naskah Teks"
                >
                  {copiedNotification ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SUB-VIEW 1: NASKAH SOAL SISWA */}
          {/* ================================================================= */}
          {previewSubTab === "naskah" && (
            <div
              id="printable-soal-area"
              className="bg-white text-black p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-transparent shadow-xl max-w-4xl mx-auto font-sans leading-relaxed print:p-0 print:border-0 print:shadow-none"
            >
              {/* Kop Resmi Sekolah */}
              <KopSuratDinas
                config={config}
                judul={activePaket.judul}
                tahunAjaran={activePaket.tahunAjaran}
                semester={activePaket.semester}
                mataPelajaran={activePaket.mataPelajaran}
                kelas={activePaket.kelas}
                className="mb-6"
              />

              {/* Identitas Siswa Box */}
              <div className="border border-black p-3 mb-6 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-28">Nama Siswa</span>
                    <span>: ............................................................</span>
                  </div>
                  <div className="flex">
                    <span className="w-28">Kelas</span>
                    <span>: {activePaket.kelas}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28">Mata Pelajaran</span>
                    <span>: {activePaket.mataPelajaran}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex">
                    <span className="w-28">No. Absen</span>
                    <span>: ....................</span>
                  </div>
                  <div className="flex">
                    <span className="w-28">Hari / Tanggal</span>
                    <span>: ............................................................</span>
                  </div>
                  <div className="flex">
                    <span className="w-28">Guru Pengampu</span>
                    <span>: {activePaket.namaGuru || currentUser?.nama || config.Nama_Guru || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28">Waktu</span>
                    <span>: {activePaket.alokasiWaktu}</span>
                  </div>
                </div>
              </div>

              {/* Petunjuk Umum */}
              <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs leading-relaxed print:bg-transparent print:border-black">
                <span className="font-bold block mb-1">PETUNJUK UMUM:</span>
                <p className="whitespace-pre-line text-slate-700 print:text-black">
                  {activePaket.petunjukUmum}
                </p>
              </div>

              {/* ============================================================= */}
              {/* BAGIAN A: PILIHAN GANDA */}
              {/* ============================================================= */}
              {activePaket.daftarSoal.some((s) => s.tipe === "pilihan_ganda") && (
                <div className="mb-8 space-y-4">
                  <div className="border-b border-black pb-1">
                    <h3 className="font-bold text-sm uppercase">
                      A. PILIHAN GANDA
                    </h3>
                    <p className="text-xs italic text-slate-600 print:text-black">
                      Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!
                    </p>
                  </div>

                  <div className="space-y-6 text-xs md:text-sm">
                    {activePaket.daftarSoal
                      .filter((s) => s.tipe === "pilihan_ganda")
                      .map((soal) => (
                        <div key={soal.nomor} className="space-y-2 group relative">
                          {/* Stimulus Context Text if Any */}
                          {soal.stimulus && (
                            <div className="p-3 bg-blue-50/60 dark:bg-transparent border-l-4 border-blue-600 text-xs italic leading-relaxed print:border-black print:bg-transparent">
                              {soal.stimulus}
                            </div>
                          )}

                          {/* Question Text */}
                          <div className="flex items-start space-x-2">
                            <span className="font-bold shrink-0">{soal.nomor}.</span>
                            <div className="flex-1 font-medium">{soal.pertanyaan}</div>

                            {/* Quick Action buttons (hidden in print) */}
                            <div className="hidden group-hover:flex items-center space-x-1 shrink-0 print:hidden">
                              <button
                                onClick={() => handleOpenVariasiModal(soal)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold flex items-center space-x-0.5"
                                title="Buat 3 Variasi Soal Serupa (AI)"
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>Variasi AI</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(soal)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                title="Edit Soal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingleSoal(soal.nomor)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Hapus Soal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Options */}
                          {soal.pilihanJawaban && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pl-6">
                              {Object.entries(soal.pilihanJawaban).map(([key, val]) => (
                                <div key={key} className="flex items-start space-x-2">
                                  <span className="font-bold">{key}.</span>
                                  <span>{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* BAGIAN B: ISIAN SINGKAT */}
              {/* ============================================================= */}
              {activePaket.daftarSoal.some((s) => s.tipe === "isian") && (
                <div className="mb-8 space-y-4">
                  <div className="border-b border-black pb-1">
                    <h3 className="font-bold text-sm uppercase">
                      B. ISIAN SINGKAT
                    </h3>
                    <p className="text-xs italic text-slate-600 print:text-black">
                      Isilah titik-titik di bawah ini dengan jawaban yang tepat dan benar!
                    </p>
                  </div>

                  <div className="space-y-4 text-xs md:text-sm">
                    {activePaket.daftarSoal
                      .filter((s) => s.tipe === "isian")
                      .map((soal) => (
                        <div key={soal.nomor} className="flex items-start space-x-2 group">
                          <span className="font-bold shrink-0">{soal.nomor}.</span>
                          <div className="flex-1 font-medium">{soal.pertanyaan}</div>

                          <div className="hidden group-hover:flex items-center space-x-1 shrink-0 print:hidden">
                            <button
                              onClick={() => handleOpenVariasiModal(soal)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold flex items-center space-x-0.5"
                              title="Buat Variasi Serupa (AI)"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Variasi AI</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(soal)}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleSoal(soal.nomor)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* BAGIAN C: URAIAN / ESAI */}
              {/* ============================================================= */}
              {activePaket.daftarSoal.some((s) => s.tipe === "uraian") && (
                <div className="mb-8 space-y-4">
                  <div className="border-b border-black pb-1">
                    <h3 className="font-bold text-sm uppercase">
                      C. URAIAN / ESAI
                    </h3>
                    <p className="text-xs italic text-slate-600 print:text-black">
                      Jawablah pertanyaan-pertanyaan berikut ini dengan uraian yang jelas dan lengkap!
                    </p>
                  </div>

                  <div className="space-y-6 text-xs md:text-sm">
                    {activePaket.daftarSoal
                      .filter((s) => s.tipe === "uraian")
                      .map((soal) => (
                        <div key={soal.nomor} className="space-y-2 group">
                          <div className="flex items-start space-x-2">
                            <span className="font-bold shrink-0">{soal.nomor}.</span>
                            <div className="flex-1 font-medium">{soal.pertanyaan}</div>

                            <div className="hidden group-hover:flex items-center space-x-1 shrink-0 print:hidden">
                              <button
                                onClick={() => handleOpenVariasiModal(soal)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold flex items-center space-x-0.5"
                                title="Buat Variasi Serupa (AI)"
                              >
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>Variasi AI</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(soal)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingleSoal(soal.nomor)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Dotted lines for student written answer space */}
                          <div className="pl-6 space-y-3 pt-2">
                            <div className="border-b border-dotted border-slate-400 h-4"></div>
                            <div className="border-b border-dotted border-slate-400 h-4"></div>
                            <div className="border-b border-dotted border-slate-400 h-4"></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-VIEW 2: LEMBAR JAWABAN SISWA (LJK / LJS) */}
          {/* ================================================================= */}
          {previewSubTab === "ljk" && (
            <div className="bg-white text-black p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl max-w-4xl mx-auto font-sans text-xs print:p-0 print:border-0 print:shadow-none space-y-6">
              <KopSuratDinas
                config={config}
                judul="LEMBAR JAWABAN SISWA (LJS)"
                subjudul={activePaket.judul}
                tahunAjaran={activePaket.tahunAjaran}
                semester={activePaket.semester}
                mataPelajaran={activePaket.mataPelajaran}
                kelas={activePaket.kelas}
              />

              {/* Student Identity Box */}
              <div className="border border-black p-3 grid grid-cols-2 gap-4 font-semibold text-xs">
                <div className="space-y-1">
                  <p>Nama Siswa : ............................................................</p>
                  <p>Kelas : {activePaket.kelas}</p>
                  <p>Mata Pelajaran: {activePaket.mataPelajaran}</p>
                </div>
                <div className="space-y-1">
                  <p>No. Absen : ....................</p>
                  <p>Hari / Tanggal : ............................................................</p>
                  <p>Guru Pengampu : {activePaket.namaGuru || currentUser?.nama || config.Nama_Guru || "-"}</p>
                  <p>Nilai / Skor : ....................</p>
                </div>
              </div>

              {/* Bagian A Pilihan Ganda Bubbles Table */}
              {activePaket.daftarSoal.some((s) => s.tipe === "pilihan_ganda") && (
                <div>
                  <h4 className="font-bold border-b border-black pb-1 mb-3">
                    A. LEMBAR JAWABAN PILIHAN GANDA (Beri tanda silang X pada huruf pilihanmu)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {activePaket.daftarSoal
                      .filter((s) => s.tipe === "pilihan_ganda")
                      .map((soal) => (
                        <div
                          key={soal.nomor}
                          className="flex items-center space-x-2 p-1.5 border border-slate-300 rounded"
                        >
                          <span className="font-bold w-6 text-center">{soal.nomor}.</span>
                          <div className="flex space-x-1.5 font-bold">
                            <span className="w-5 h-5 border border-black rounded-full flex items-center justify-center">A</span>
                            <span className="w-5 h-5 border border-black rounded-full flex items-center justify-center">B</span>
                            <span className="w-5 h-5 border border-black rounded-full flex items-center justify-center">C</span>
                            <span className="w-5 h-5 border border-black rounded-full flex items-center justify-center">D</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Bagian B Isian Singkat Blank Lines */}
              {activePaket.daftarSoal.some((s) => s.tipe === "isian") && (
                <div>
                  <h4 className="font-bold border-b border-black pb-1 mb-3">
                    B. LEMBAR JAWABAN ISIAN SINGKAT
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                    {activePaket.daftarSoal
                      .filter((s) => s.tipe === "isian")
                      .map((soal) => (
                        <div key={soal.nomor} className="flex items-center space-x-2">
                          <span className="font-bold w-6">{soal.nomor}.</span>
                          <div className="flex-1 border-b border-black h-5"></div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Bagian C Uraian Lines */}
              {activePaket.daftarSoal.some((s) => s.tipe === "uraian") && (
                <div>
                  <h4 className="font-bold border-b border-black pb-1 mb-3">
                    C. LEMBAR JAWABAN URAIAN / ESAI
                  </h4>
                  <div className="space-y-4">
                    {activePaket.daftarSoal
                      .filter((s) => s.tipe === "uraian")
                      .map((soal) => (
                        <div key={soal.nomor} className="space-y-1">
                          <span className="font-bold">{soal.nomor}. Jawaban:</span>
                          <div className="border-b border-dotted border-slate-400 h-4"></div>
                          <div className="border-b border-dotted border-slate-400 h-4"></div>
                          <div className="border-b border-dotted border-slate-400 h-4"></div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-VIEW 3: KUNCI JAWABAN & PEMBAHASAN */}
          {/* ================================================================= */}
          {previewSubTab === "kunci" && (
            <div className="bg-white text-black p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl max-w-4xl mx-auto font-sans text-xs print:p-0 print:border-0 print:shadow-none space-y-6">
              <KopSuratDinas
                config={config}
                judul="KUNCI JAWABAN & PEMBAHASAN ASESMEN"
                subjudul={activePaket.judul}
                tahunAjaran={activePaket.tahunAjaran}
                semester={activePaket.semester}
                mataPelajaran={activePaket.mataPelajaran}
                kelas={activePaket.kelas}
              />

              {/* Table of Quick Keys */}
              <div>
                <h4 className="font-bold text-sm mb-2 text-blue-900 border-b pb-1">
                  1. Rekapitulasi Kunci Jawaban Singkat
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {activePaket.daftarSoal.map((soal) => (
                    <div
                      key={soal.nomor}
                      className="p-2 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between"
                    >
                      <span className="font-bold">No. {soal.nomor}</span>
                      <span className="font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {soal.kunciJawaban}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Explanation per Question */}
              <div className="space-y-4 pt-4">
                <h4 className="font-bold text-sm text-blue-900 border-b pb-1">
                  2. Pembahasan Mendalam & Rasional Jawaban
                </h4>
                {activePaket.daftarSoal.map((soal) => (
                  <div
                    key={soal.nomor}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>
                        Soal No. {soal.nomor} ({soal.tipe.toUpperCase()} - {soal.level})
                      </span>
                      <span className="text-blue-700 font-extrabold">
                        Kunci: {soal.kunciJawaban} | Skor: {soal.skorMaksimal}
                      </span>
                    </div>

                    <p className="font-medium text-slate-800">{soal.pertanyaan}</p>

                    <div className="bg-white p-3 rounded-lg border border-blue-100 text-slate-700 space-y-1">
                      <span className="font-bold text-blue-800 text-[11px] block">
                        💡 Pembahasan & Konsep Dasar:
                      </span>
                      <p className="leading-relaxed">{soal.pembahasan || "Jawaban sesuai dengan kompetensi dasar kurikulum."}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-VIEW 4: MATRIKS KISI-KISI SOAL KURIKULUM MERDEKA */}
          {/* ================================================================= */}
          {previewSubTab === "kisikisi" && (
            <div className="bg-white text-black p-8 rounded-3xl border border-slate-200 shadow-xl max-w-5xl mx-auto font-sans text-xs print:p-0 print:border-0 print:shadow-none space-y-6">
              <KopSuratDinas
                config={config}
                judul="MATRIKS KISI-KISI PENULISAN SOAL ASESMEN"
                subjudul={activePaket.judul}
                tahunAjaran={activePaket.tahunAjaran}
                semester={activePaket.semester}
                mataPelajaran={activePaket.mataPelajaran}
                kelas={activePaket.kelas}
              />

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold border-b border-black text-center">
                      <th className="p-2 border-r border-black w-10">No</th>
                      <th className="p-2 border-r border-black w-48">Tujuan Pembelajaran (TP)</th>
                      <th className="p-2 border-r border-black w-36">Materi Pokok</th>
                      <th className="p-2 border-r border-black">Indikator Soal</th>
                      <th className="p-2 border-r border-black w-24">Level</th>
                      <th className="p-2 border-r border-black w-28">Bentuk</th>
                      <th className="p-2 border-r border-black w-14">Kunci</th>
                      <th className="p-2 w-12">Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePaket.kisiKisi.map((k, idx) => (
                      <tr key={idx} className="border-b border-black hover:bg-slate-50">
                        <td className="p-2 border-r border-black text-center font-bold">{k.nomorSoal}</td>
                        <td className="p-2 border-r border-black">{k.tujuanPembelajaran || activePaket.topikMateri}</td>
                        <td className="p-2 border-r border-black">{k.materi || activePaket.topikMateri}</td>
                        <td className="p-2 border-r border-black">{k.indikatorSoal || "-"}</td>
                        <td className="p-2 border-r border-black text-center font-medium">{k.levelKognitif}</td>
                        <td className="p-2 border-r border-black text-center">{k.bentukSoal}</td>
                        <td className="p-2 border-r border-black text-center font-bold text-blue-700">{k.nomorKunci}</td>
                        <td className="p-2 text-center font-bold">{k.skor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan Kisi-Kisi */}
              <div className="grid grid-cols-2 gap-8 mt-10 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-16"></div>
                  <p className="font-black underline">{config.Nama_Kepsek || "SUBUR, S.Pd.SD."}</p>
                  <p>NIP. {config.NIP_Kepsek || "197002111993081001"}</p>
                </div>
                <div>
                  <p>{config.Tempat_Tanda_Tangan || "Bogor"}, {getLocalDateStr()}</p>
                  <p className="font-bold">Guru Pengampu</p>
                  <div className="h-16"></div>
                  <p className="font-black underline">{activePaket.namaGuru || currentUser?.nama || config.Nama_Guru || "Guru Pengampu"}</p>
                  <p>NIP. {activePaket.nipGuru || currentUser?.nip || config.NIP_Guru || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-VIEW 5: RUBRIK & PEDOMAN PENSKORAN */}
          {/* ================================================================= */}
          {previewSubTab === "rubrik" && (
            <div className="bg-white text-black p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl max-w-4xl mx-auto font-sans text-xs print:p-0 print:border-0 print:shadow-none space-y-6">
              <KopSuratDinas
                config={config}
                judul="PEDOMAN PENSKORAN & RUBRIK EVALUASI"
                subjudul={activePaket.judul}
                tahunAjaran={activePaket.tahunAjaran}
                semester={activePaket.semester}
                mataPelajaran={activePaket.mataPelajaran}
                kelas={activePaket.kelas}
              />

              {/* Scoring Formula Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-sm text-blue-900">
                  Pedoman Perhitungan Nilai Akhir (NA):
                </h4>
                <p className="whitespace-pre-line text-slate-800 font-medium">
                  {activePaket.pedomanPenskoran}
                </p>
              </div>

              {/* Essay Rubrics */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 border-b pb-1">
                  Kriteria Penilaian Soal Uraian / Penalaran Tinggi:
                </h4>
                {activePaket.daftarSoal
                  .filter((s) => s.tipe === "uraian")
                  .map((soal) => (
                    <div
                      key={soal.nomor}
                      className="p-4 border border-slate-200 rounded-xl space-y-2 bg-slate-50"
                    >
                      <span className="font-bold text-slate-800 block">
                        Soal No. {soal.nomor}: {soal.pertanyaan}
                      </span>
                      <table className="w-full border-collapse border border-slate-300 text-[11px] bg-white">
                        <thead>
                          <tr className="bg-slate-100 font-bold border-b border-slate-300">
                            <th className="p-2 border-r border-slate-300 w-24 text-center">Kriteria Skor</th>
                            <th className="p-2">Deskriptor Jawaban Siswa</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-300">
                            <td className="p-2 border-r border-slate-300 font-bold text-center text-emerald-700">Skor Penuh ({soal.skorMaksimal})</td>
                            <td className="p-2">Jawaban sangat lengkap, argumen logis, konsep ilmiah tepat, dan menyertakan contoh/langkah penyelesaian dengan benar.</td>
                          </tr>
                          <tr className="border-b border-slate-300">
                            <td className="p-2 border-r border-slate-300 font-bold text-center text-blue-700">Skor Sebagian ({(soal.skorMaksimal / 2).toFixed(1)})</td>
                            <td className="p-2">Jawaban benar namun penjelasan kurang lengkap atau terdapat kekeliruan kecil dalam langkah penyelesaian.</td>
                          </tr>
                          <tr>
                            <td className="p-2 border-r border-slate-300 font-bold text-center text-red-600">Skor Minimal (0-1)</td>
                            <td className="p-2">Jawaban tidak sesuai konsep atau hanya menuliskan ulang pertanyaan.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT SINGLE QUESTION MODAL */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingSoal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Butir Soal No. {editingSoal.nomor}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Stimulus / Narasi Kontekstual (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editingSoal.stimulus || ""}
                  onChange={(e) => setEditingSoal({ ...editingSoal, stimulus: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Teks Pertanyaan Soal
                </label>
                <textarea
                  rows={3}
                  value={editingSoal.pertanyaan}
                  onChange={(e) => setEditingSoal({ ...editingSoal, pertanyaan: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 font-semibold"
                />
              </div>

              {/* Options if PG */}
              {editingSoal.tipe === "pilihan_ganda" && editingSoal.pilihanJawaban && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Pilihan Jawaban (A, B, C, D)
                  </label>
                  {Object.entries(editingSoal.pilihanJawaban).map(([k, v]) => (
                    <div key={k} className="flex items-center space-x-2">
                      <span className="font-bold w-6 text-center">{k}.</span>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) => {
                          const updated = { ...editingSoal.pilihanJawaban, [k]: e.target.value };
                          setEditingSoal({ ...editingSoal, pilihanJawaban: updated });
                        }}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Kunci Jawaban & Skor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kunci Jawaban
                  </label>
                  <input
                    type="text"
                    value={editingSoal.kunciJawaban}
                    onChange={(e) => setEditingSoal({ ...editingSoal, kunciJawaban: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Skor Maksimal
                  </label>
                  <input
                    type="number"
                    value={editingSoal.skorMaksimal}
                    onChange={(e) => setEditingSoal({ ...editingSoal, skorMaksimal: Number(e.target.value) || 1 })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Pembahasan */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pembahasan Konsep
                </label>
                <textarea
                  rows={2}
                  value={editingSoal.pembahasan || ""}
                  onChange={(e) => setEditingSoal({ ...editingSoal, pembahasan: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedSoal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VARIASI SOAL AI MODAL (Paraphrase / Remedial / Paket B) */}
      {/* ========================================================================= */}
      {isVariasiModalOpen && variasiSourceSoal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                    Variasi Soal Serupa (AI Paraphrase)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menghasilkan alternatif soal dengan kompetensi setara untuk remedial atau paket paralel.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVariasiModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Original Question Info */}
            <div className="p-3.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-bold text-slate-500 block">Soal Asli Saat Ini (No. {variasiSourceSoal.nomor}):</span>
              <p className="font-medium text-slate-800 dark:text-slate-200">{variasiSourceSoal.pertanyaan}</p>
            </div>

            {/* Loading Indicator */}
            {isVariasiLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Sedang merumuskan 3 butir variasi soal baru...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih salah satu variasi di bawah untuk menggantikan soal No. {variasiSourceSoal.nomor}:
                </p>

                {variasiList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 hover:border-blue-500 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-600">Variasi Pilihan {idx + 1}</span>
                      <span className="text-slate-500 font-medium">Kunci: {item.kunciJawaban}</span>
                    </div>

                    {item.stimulus && (
                      <p className="text-xs italic text-slate-600 dark:text-slate-400 border-l-2 border-blue-500 pl-2">
                        {item.stimulus}
                      </p>
                    )}

                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.pertanyaan}
                    </p>

                    {item.pilihanJawaban && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 pl-4">
                        {Object.entries(item.pilihanJawaban).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-bold">{k}.</span> {v as string}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{item.pembahasan}</span>
                      <button
                        type="button"
                        onClick={() => handleReplaceWithVariasi(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Gunakan Variasi Ini</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
