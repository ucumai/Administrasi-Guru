import React, { useState, useMemo, useRef } from "react";
import {
  BookmarkCheck,
  Plus,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  BookOpen,
  Layers,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  ChevronRight,
  Database,
  Table,
  LayoutGrid
} from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { BankTpItem, Mapel, Pengaturan, User } from "../types";
import { saveDocument, deleteDocument, batchSaveDocuments, COLLECTIONS } from "../lib/firebase";
import { getClassActiveSubjects } from "../lib/classSubjectUtils";

export const INITIAL_DEFAULT_TPS: Omit<BankTpItem, "id">[] = [
  // Matematika
  {
    mapel: "Matematika",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Bilangan Cacah & Operasi Hitung",
    tujuanPembelajaran: "Memahami dan menyelesaikan operasi hitung penjumlahan, pengurangan, perkalian, dan pembagian bilangan cacah."
  },
  {
    mapel: "Matematika",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.2",
    materiPokok: "Pecahan Sederhana",
    tujuanPembelajaran: "Menyelesaikan masalah kontekstual yang berkaitan dengan pecahan senilai dan operasi aritmatika pecahan."
  },
  {
    mapel: "Matematika",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Pengukuran Panjang, Luas & Keliling",
    tujuanPembelajaran: "Mengukur, menghitung keliling dan luas bangun datar menggunakan satuan baku dengan cermat."
  },
  {
    mapel: "Matematika",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.2",
    materiPokok: "Analisis & Penyajian Data",
    tujuanPembelajaran: "Menganalisis, menyajikan, dan menginterpretasikan data dalam bentuk diagram batang, tabel frekuensi, dan piktogram."
  },

  // Bahasa Indonesia
  {
    mapel: "Bahasa Indonesia",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Menyimak & Ide Pokok Teks",
    tujuanPembelajaran: "Menyimak, menganalisis, dan menemukan ide pokok serta gagasan pendukung dalam berbagai teks informasi dan fiksi."
  },
  {
    mapel: "Bahasa Indonesia",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.2",
    materiPokok: "Diskusi & Komunikasi Lisan",
    tujuanPembelajaran: "Menyampaikan pendapat, sanggahan, dan hasil telaah secara runtut, logis, dan santun dalam interaksi diskusi kelas."
  },
  {
    mapel: "Bahasa Indonesia",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Menulis Teks Narasi & Deskripsi",
    tujuanPembelajaran: "Menulis teks deskripsi dan narasi menggunakan kosa kata baku, konjungsi, serta kaidah tanda baca yang tepat."
  },
  {
    mapel: "Bahasa Indonesia",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.2",
    materiPokok: "Membaca Indah & Presentasi",
    tujuanPembelajaran: "Membaca teks informasi dan karya sastra dengan intonasi, ekspresi, dan artikulasi yang jelas serta percaya diri."
  },

  // IPAS
  {
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Bagian Tubuh Tumbuhan & Hewan",
    tujuanPembelajaran: "Menganalisis hubungan antara bentuk serta fungsi bagian tubuh tumbuhan dan adaptasi hewan terhadap lingkungannya."
  },
  {
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.2",
    materiPokok: "Wujud Zat & Perubahan Energi",
    tujuanPembelajaran: "Mengidentifikasi wujud zat, sifat materi, dan transformasi bentuk energi dalam kehidupan sehari-hari."
  },
  {
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Bentang Alam & Keanekaragaman Hayati",
    tujuanPembelajaran: "Menjelaskan keragaman bentang alam, kekayaan hayati, serta dampak interaksi manusia terhadap kelestarian lingkungan."
  },
  {
    mapel: "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.2",
    materiPokok: "Kearifan Lokal & Kegiatan Ekonomi",
    tujuanPembelajaran: "Mengenal kearifan lokal daerah setempat dan menganalisis peran kegiatan ekonomi dalam pemenuhan kebutuhan masyarakat."
  },

  // Pendidikan Pancasila
  {
    mapel: "Pendidikan Pancasila",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Nilai-Nilai Sila Pancasila",
    tujuanPembelajaran: "Menerapkan nilai-nilai luhur Pancasila dalam interaksi keseharian di lingkungan keluarga, sekolah, dan masyarakat."
  },
  {
    mapel: "Pendidikan Pancasila",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.2",
    materiPokok: "Bhinneka Tunggal Ika & Keberagaman",
    tujuanPembelajaran: "Menghargai keragaman suku, agama, bahasa, dan budaya dalam bingkai persatuan Negara Kesatuan Republik Indonesia."
  },
  {
    mapel: "Pendidikan Pancasila",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Hak dan Kewajiban Warga Negara",
    tujuanPembelajaran: "Melaksanakan hak dan kewajiban sebagai peserta didik dan warga masyarakat dengan penuh disiplin dan tanggung jawab."
  },
  {
    mapel: "Pendidikan Pancasila",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.2",
    materiPokok: "Norma & Musyawarah Mufakat",
    tujuanPembelajaran: "Menunjukkan sikap patuh terhadap norma sosial dan mengutamakan musyawarah untuk mencapai mufakat dalam memecahkan masalah."
  },

  // Pendidikan Agama dan Budi Pekerti
  {
    mapel: "Pendidikan Agama dan Budi Pekerti",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Kitab Suci & Pemahaman Ayat",
    tujuanPembelajaran: "Membaca, menghafal, dan memahami makna ayat-ayat suci serta teladan nilai kebaikan dalam kehidupan sehari-hari."
  },
  {
    mapel: "Pendidikan Agama dan Budi Pekerti",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Praktik Ibadah & Akhlak Mulia",
    tujuanPembelajaran: "Mempraktikkan tata cara ibadah dengan tertib serta menunjukkan akhlak terpuji, toleransi, dan kasih sayang terhadap sesama."
  },

  // PJOK
  {
    mapel: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Pola Gerak Dasar & Permainan Beregu",
    tujuanPembelajaran: "Mempraktikkan variasi dan kombinasi gerak dasar lokomotor, non-lokomotor, dan manipulatif dengan koordinasi yang baik."
  },
  {
    mapel: "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Kebugaran Jasmani & Pola Hidup Sehat",
    tujuanPembelajaran: "Menerapkan latihan kebugaran jasmani dasar, sportivitas tim, dan pembiasaan pola hidup bersih dan sehat secara mandiri."
  },

  // Seni Budaya dan Prakarya
  {
    mapel: "Seni Budaya dan Prakarya",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Eksplorasi Seni Rupa 2D & 3D",
    tujuanPembelajaran: "Mengeksplorasi unsur garis, warna, bentuk, dan tekstur dalam berkarya seni rupa menggunakan media alami atau sintetis."
  },
  {
    mapel: "Seni Budaya dan Prakarya",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Kriya & Apresiasi Seni Musik/Tari",
    tujuanPembelajaran: "Menciptakan karya kriya fungsional bernilai guna dan mengapresiasi keunikan seni budaya nusantara dengan rasa bangga."
  },

  // Bahasa Inggris
  {
    mapel: "Bahasa Inggris",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Greetings, Self-Introduction & Daily Words",
    tujuanPembelajaran: "Mengidentifikasi, merespons ungkapan sapaan, dan memperkenalkan diri serta benda sekitar dalam bahasa Inggris sederhana."
  },
  {
    mapel: "Bahasa Inggris",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Descriptive Sentences & Simple Actions",
    tujuanPembelajaran: "Mendeskripsikan ciri-ciri hewan, benda, serta aktivitas sehari-hari menggunakan kosakata dan struktur kalimat sederhana."
  },

  // Muatan Lokal
  {
    mapel: "Muatan Lokal (Bahasa Daerah)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "Undak-Usuk Basa & Paguneman",
    tujuanPembelajaran: "Memahami dan mempraktikkan tingkatan tutur bahasa daerah dalam percakapan santun di keluarga dan sekolah."
  },
  {
    mapel: "Muatan Lokal (Bahasa Daerah)",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Genap",
    kodeTp: "TP 2.1",
    materiPokok: "Cerita Rakyat & Aksara/Karya Sastra Daerah",
    tujuanPembelajaran: "Menyimak serta menceritakan kembali kisah legenda daerah dan mengapresiasi tembang/pupuh tradisional daerah."
  }
];

interface BankTpViewProps {
  bankTpList: BankTpItem[];
  mapelList: Mapel[];
  currentUser?: User | null;
  config: Pengaturan;
  onNavigateToRaport?: () => void;
}

export const BankTpView: React.FC<BankTpViewProps> = ({
  bankTpList,
  mapelList,
  currentUser,
  config,
  onNavigateToRaport
}) => {
  const isGuruKelas = currentUser?.role === "guru_kelas";
  const teacherClass = currentUser?.kelasUtama || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMapelFilter, setSelectedMapelFilter] = useState("Semua");
  const [selectedFaseFilter, setSelectedFaseFilter] = useState(() => (isGuruKelas && teacherClass ? teacherClass : "Semua"));
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("Semua");
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isGuruKelas && teacherClass) {
      setSelectedFaseFilter(teacherClass);
    }
  }, [isGuruKelas, teacherClass]);

  // View Mode: Table (default) or Cards
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTpId, setEditingTpId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    mapel: string;
    kelas: string;
    fase: string;
    semester: "Ganjil" | "Genap" | "Semua";
    kodeTp: string;
    materiPokok: string;
    tujuanPembelajaran: string;
  }>({
    mapel: "Matematika",
    kelas: "Semua Kelas",
    fase: "Fase B",
    semester: "Ganjil",
    kodeTp: "TP 1.1",
    materiPokok: "",
    tujuanPembelajaran: ""
  });

  const getCurrentSelectedKelasFase = () => {
    const k = formData.kelas || "";
    const f = formData.fase || "";

    if (k === "Semua Kelas" && f === "Semua Fase") return "Semua Kelas|Semua Fase";
    if (k === "Semua Kelas" && f === "Fase A") return "Semua Kelas|Fase A";
    if (k === "Semua Kelas" && f === "Fase B") return "Semua Kelas|Fase B";
    if (k === "Semua Kelas" && f === "Fase C") return "Semua Kelas|Fase C";

    if (k && f) {
      const matchKey = `${k}|${f}`;
      const validOptions = [
        "Kelas 1|Fase A", "Kelas 2|Fase A", "Kelas 3|Fase B", "Kelas 4|Fase B",
        "Kelas 5|Fase C", "Kelas 6|Fase C", "Kelas 7|Fase D", "Kelas 8|Fase D",
        "Kelas 9|Fase D", "Kelas 10|Fase E", "Kelas 11|Fase F", "Kelas 12|Fase F"
      ];
      if (validOptions.includes(matchKey)) return matchKey;
    }

    if (k.includes("1") || k.toLowerCase().includes("satu")) return "Kelas 1|Fase A";
    if (k.includes("2") || k.toLowerCase().includes("dua")) return "Kelas 2|Fase A";
    if (k.includes("3") || k.toLowerCase().includes("tiga")) return "Kelas 3|Fase B";
    if (k.includes("4") || k.toLowerCase().includes("empat")) return "Kelas 4|Fase B";
    if (k.includes("5") || k.toLowerCase().includes("lima")) return "Kelas 5|Fase C";
    if (k.includes("6") || k.toLowerCase().includes("enam")) return "Kelas 6|Fase C";
    if (k.includes("7")) return "Kelas 7|Fase D";
    if (k.includes("8")) return "Kelas 8|Fase D";
    if (k.includes("9")) return "Kelas 9|Fase D";
    if (k.includes("10")) return "Kelas 10|Fase E";
    if (k.includes("11")) return "Kelas 11|Fase F";
    if (k.includes("12")) return "Kelas 12|Fase F";

    if (f === "Fase A") return "Kelas 1|Fase A";
    if (f === "Fase B") return "Kelas 4|Fase B";
    if (f === "Fase C") return "Kelas 5|Fase C";
    if (f === "Fase D") return "Kelas 7|Fase D";
    if (f === "Fase E") return "Kelas 10|Fase E";
    if (f === "Fase F") return "Kelas 11|Fase F";

    return "Kelas 4|Fase B";
  };

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiForm, setAiForm] = useState({
    mapel: "Matematika",
    fase: "Fase B",
    kelas: "Kelas 4",
    semester: "Ganjil",
    materiPokok: "",
    jumlah: 4
  });

  // Extract unique mapel list
  const availableMapels = useMemo(() => {
    const list = new Set<string>();
    mapelList.forEach((m) => list.add(m.namaMapel));
    INITIAL_DEFAULT_TPS.forEach((tp) => list.add(tp.mapel));
    bankTpList.forEach((tp) => list.add(tp.mapel));
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [mapelList, bankTpList]);

  // Active checked mapels specifically for selected class
  const activeClassMapels = useMemo(() => {
    if (selectedFaseFilter && selectedFaseFilter !== "Semua") {
      return getClassActiveSubjects(selectedFaseFilter, availableMapels);
    }
    return availableMapels;
  }, [selectedFaseFilter, availableMapels]);

  // Filtered TP List
  const filteredTps = useMemo(() => {
    return bankTpList.filter((item) => {
      // Guru Kelas strict class restriction
      if (isGuruKelas && teacherClass) {
        const itemK = (item.kelas || "").toLowerCase().trim();
        const teachK = teacherClass.toLowerCase().trim();
        const isMatch =
          !itemK ||
          itemK === "semua kelas" ||
          itemK === "semua" ||
          itemK === teachK ||
          itemK.includes(teachK) ||
          teachK.includes(itemK);
        if (!isMatch) return false;
      }

      if (selectedMapelFilter !== "Semua" && item.mapel !== selectedMapelFilter) {
        return false;
      }
      if (selectedFaseFilter !== "Semua") {
        if (selectedFaseFilter.startsWith("Kelas ")) {
          const matchKelas = item.kelas === selectedFaseFilter || (item.kelas && item.kelas.toLowerCase().includes(selectedFaseFilter.toLowerCase()));
          if (!matchKelas) return false;
        } else if (item.fase !== selectedFaseFilter) {
          return false;
        }
      }
      if (selectedSemesterFilter !== "Semua" && item.semester !== "Semua" && item.semester !== selectedSemesterFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTp = item.tujuanPembelajaran?.toLowerCase().includes(q);
        const inMateri = item.materiPokok?.toLowerCase().includes(q);
        const inKode = item.kodeTp?.toLowerCase().includes(q);
        const inMapel = item.mapel?.toLowerCase().includes(q);
        if (!inTp && !inMateri && !inKode && !inMapel) return false;
      }
      return true;
    });
  }, [bankTpList, selectedMapelFilter, selectedFaseFilter, selectedSemesterFilter, searchQuery, isGuruKelas, teacherClass]);

  // Grouped by Mapel for display
  const groupedTps = useMemo(() => {
    const map: Record<string, BankTpItem[]> = {};
    filteredTps.forEach((tp) => {
      if (!map[tp.mapel]) {
        map[tp.mapel] = [];
      }
      map[tp.mapel].push(tp);
    });
    return map;
  }, [filteredTps]);

  // Open Form Modal for Create
  const handleOpenCreateModal = () => {
    setEditingTpId(null);
    setFormData({
      mapel: availableMapels[0] || "Matematika",
      kelas: "Semua Kelas",
      fase: "Fase B",
      semester: "Ganjil",
      kodeTp: `TP 1.${bankTpList.length + 1}`,
      materiPokok: "",
      tujuanPembelajaran: ""
    });
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEditModal = (item: BankTpItem) => {
    setEditingTpId(item.id);
    setFormData({
      mapel: item.mapel,
      kelas: item.kelas || "Semua Kelas",
      fase: item.fase || "Fase B",
      semester: item.semester || "Ganjil",
      kodeTp: item.kodeTp || "",
      materiPokok: item.materiPokok || "",
      tujuanPembelajaran: item.tujuanPembelajaran
    });
    setIsFormModalOpen(true);
  };

  // Save TP (Create or Edit)
  const handleSaveTp = async (e: React.FormEvent) => {
    e.preventDefault();
    const tpText = formData.tujuanPembelajaran.trim();
    if (!tpText) {
      Swal.fire("Peringatan", "Kalimat Tujuan Pembelajaran tidak boleh kosong.", "warning");
      return;
    }

    try {
      const id = editingTpId || `tp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const tpItem: BankTpItem = {
        id,
        mapel: formData.mapel,
        kelas: formData.kelas,
        fase: formData.fase,
        semester: formData.semester,
        kodeTp: formData.kodeTp.trim() || undefined,
        materiPokok: formData.materiPokok.trim() || undefined,
        tujuanPembelajaran: tpText,
        createdBy: currentUser?.nama || "Guru Pengampu",
        updatedAt: Date.now(),
        createdAt: editingTpId ? undefined : Date.now()
      };

      // 1. Save to Firestore
      await saveDocument(COLLECTIONS.BANK_TP, id, tpItem);

      // 2. Also cache in localStorage for instant offline access
      try {
        const cached = localStorage.getItem("edadmin_bank_tp_cache");
        const list: BankTpItem[] = cached ? JSON.parse(cached) : [];
        const updatedCache = list.filter((x) => x.id !== id).concat(tpItem);
        localStorage.setItem("edadmin_bank_tp_cache", JSON.stringify(updatedCache));
      } catch {}

      setIsFormModalOpen(false);
      Swal.fire({
        icon: "success",
        title: editingTpId ? "Tujuan Pembelajaran Diperbarui!" : "TP Berhasil Disimpan!",
        text: `Tujuan Pembelajaran untuk ${formData.mapel} telah disimpan permanen ke Bank TP.`,
        timer: 1700,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire("Gagal", "Gagal menyimpan TP: " + (err?.message || "Error"), "error");
    }
  };

  // Delete TP
  const handleDeleteTp = async (item: BankTpItem) => {
    const result = await Swal.fire({
      title: "Hapus Tujuan Pembelajaran?",
      text: `Apakah Anda yakin ingin menghapus "${item.kodeTp ? item.kodeTp + ': ' : ''}${item.tujuanPembelajaran.substring(0, 50)}..."?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        await deleteDocument(COLLECTIONS.BANK_TP, item.id);
        // update localStorage cache
        try {
          const cached = localStorage.getItem("edadmin_bank_tp_cache");
          if (cached) {
            const list: BankTpItem[] = JSON.parse(cached);
            localStorage.setItem("edadmin_bank_tp_cache", JSON.stringify(list.filter((x) => x.id !== item.id)));
          }
        } catch {}

        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Tujuan pembelajaran berhasil dihapus dari Bank TP.",
          timer: 1400,
          showConfirmButton: false
        });
      } catch (err: any) {
        Swal.fire("Gagal", "Gagal menghapus TP: " + (err?.message || "Error"), "error");
      }
    }
  };

  // Copy TP text to clipboard
  const handleCopyTp = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      Swal.fire({
        icon: "success",
        title: "Teks Disalin!",
        text: "Kalimat TP telah disalin ke clipboard.",
        timer: 1200,
        showConfirmButton: false
      });
    }
  };

  // Seed default Kemendikbud TPs
  const handleSeedDefaults = async () => {
    const confirm = await Swal.fire({
      title: "Muat Contoh TP Standar?",
      text: "Sistem akan menambahkan paket Tujuan Pembelajaran resmi Kurikulum Merdeka (Matematika, B. Indonesia, IPAS, Pancasila, PAI, dll) ke dalam Bank TP Anda.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Muat Contoh TP",
      cancelButtonText: "Batal"
    });

    if (!confirm.isConfirmed) return;

    try {
      const itemsToSave: BankTpItem[] = INITIAL_DEFAULT_TPS.map((item, idx) => ({
        ...item,
        id: `tp_std_${idx}_${item.mapel.replace(/\s+/g, "_").toLowerCase()}`,
        createdBy: "Pemerintah / Kemendikbudristek",
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

      await batchSaveDocuments(COLLECTIONS.BANK_TP, itemsToSave);

      // Save to localStorage cache
      try {
        localStorage.setItem("edadmin_bank_tp_cache", JSON.stringify(itemsToSave));
      } catch {}

      Swal.fire({
        icon: "success",
        title: "Paket Bank TP Berhasil Dimuat!",
        text: `${itemsToSave.length} Tujuan Pembelajaran standar Kurikulum Merdeka siap digunakan di Raport dan Asesmen.`,
        confirmButtonColor: "#2563eb"
      });
    } catch (err: any) {
      Swal.fire("Gagal", "Gagal memuat TP standar: " + (err?.message || "Error"), "error");
    }
  };

  // AI Generate TP
  const handleGenerateAiTp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingAi(true);

    try {
      const resp = await fetch("/api/ai/generate-bank-tp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapel: aiForm.mapel,
          fase: aiForm.fase,
          kelas: aiForm.kelas,
          semester: aiForm.semester,
          materiPokok: aiForm.materiPokok,
          jumlah: aiForm.jumlah
        })
      });

      if (!resp.ok) {
        throw new Error("Gagal menghubungi server AI generator.");
      }

      const data = await resp.json();
      if (data.status === "success" && Array.isArray(data.tps) && data.tps.length > 0) {
        const newItems: BankTpItem[] = data.tps.map((raw: any, index: number) => ({
          id: `tp_ai_${Date.now()}_${index}`,
          mapel: aiForm.mapel,
          kelas: aiForm.kelas,
          fase: aiForm.fase,
          semester: aiForm.semester as any,
          kodeTp: raw.kodeTp || `TP ${index + 1}.1`,
          materiPokok: raw.materiPokok || aiForm.materiPokok || "Materi Pokok",
          tujuanPembelajaran: raw.tujuanPembelajaran,
          createdBy: "AI Asisten Kurikulum",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));

        await batchSaveDocuments(COLLECTIONS.BANK_TP, newItems);

        // Also update localStorage cache
        try {
          const cached = localStorage.getItem("edadmin_bank_tp_cache");
          const list: BankTpItem[] = cached ? JSON.parse(cached) : [];
          localStorage.setItem("edadmin_bank_tp_cache", JSON.stringify([...list, ...newItems]));
        } catch {}

        setIsAiModalOpen(false);
        Swal.fire({
          icon: "success",
          title: "Generate AI Berhasil!",
          text: `${newItems.length} Tujuan Pembelajaran baru untuk ${aiForm.mapel} telah dirumuskan dan disimpan ke Bank TP!`,
          confirmButtonColor: "#2563eb"
        });
      } else {
        throw new Error("Format respons AI tidak sesuai.");
      }
    } catch (err: any) {
      Swal.fire("Gagal AI", "Gagal merumuskan TP dengan AI: " + (err?.message || "Error"), "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (bankTpList.length === 0) {
      Swal.fire("Info", "Belum ada data Tujuan Pembelajaran untuk diekspor.", "info");
      return;
    }

    try {
      const rows = bankTpList.map((item, idx) => ({
        "No": idx + 1,
        "Mata Pelajaran": item.mapel,
        "Kelas": item.kelas,
        "Fase": item.fase,
        "Semester": item.semester,
        "Kode TP": item.kodeTp || "-",
        "Materi Pokok": item.materiPokok || "-",
        "Tujuan Pembelajaran": item.tujuanPembelajaran,
        "Penulis / Sumber": item.createdBy || "Guru"
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bank TP");
      XLSX.writeFile(wb, `Bank_TP_Kurikulum_Merdeka_${new Date().toISOString().split("T")[0]}.xlsx`);

      Swal.fire({
        icon: "success",
        title: "Ekspor Berhasil",
        text: "File Excel Bank TP berhasil diunduh.",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire("Gagal", "Gagal mengekspor file: " + (err?.message || "Error"), "error");
    }
  };

  // Import from Excel
  const handleImportExcelClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = wb.SheetNames[0];
      const worksheet = wb.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonRows || jsonRows.length === 0) {
        Swal.fire("Peringatan", "File Excel kosong atau tidak terdeteksi data baris.", "warning");
        return;
      }

      const importedItems: BankTpItem[] = [];
      let skippedCount = 0;

      jsonRows.forEach((row, idx) => {
        // Look for column names flexibly
        const tpText =
          row["Tujuan Pembelajaran"] ||
          row["TP"] ||
          row["Kalimat TP"] ||
          row["Deskripsi TP"] ||
          row["tujuanPembelajaran"] ||
          row["Deskripsi"] ||
          "";

        if (!tpText || String(tpText).trim().length < 3) {
          skippedCount++;
          return;
        }

        const mapel =
          row["Mata Pelajaran"] ||
          row["Mapel"] ||
          row["mapel"] ||
          "Matematika";

        const kodeTp =
          row["Kode TP"] ||
          row["Kode"] ||
          row["kodeTp"] ||
          `TP ${idx + 1}.1`;

        const fase =
          row["Fase"] ||
          row["fase"] ||
          "Fase B";

        const kelas =
          row["Kelas"] ||
          row["kelas"] ||
          "Semua Kelas";

        const semesterRaw =
          row["Semester"] ||
          row["semester"] ||
          "Ganjil";

        const semester =
          String(semesterRaw).toLowerCase().includes("genap") ? "Genap" : "Ganjil";

        const materiPokok =
          row["Materi Pokok"] ||
          row["Materi"] ||
          row["materiPokok"] ||
          "";

        const newItem: BankTpItem = {
          id: `tp_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          mapel: String(mapel).trim(),
          kelas: String(kelas).trim(),
          fase: String(fase).trim(),
          semester,
          kodeTp: String(kodeTp).trim(),
          materiPokok: String(materiPokok).trim(),
          tujuanPembelajaran: String(tpText).trim(),
          createdBy: currentUser?.nama ? `${currentUser.nama} (Import Excel)` : "Import Excel",
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        importedItems.push(newItem);
      });

      if (importedItems.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Import Gagal",
          text: "Tidak ada baris yang valid dengan kolom 'Tujuan Pembelajaran' atau 'TP'. Silakan periksa format file Excel."
        });
        return;
      }

      // Save to Firestore
      await batchSaveDocuments(COLLECTIONS.BANK_TP, importedItems);

      // Update local storage cache
      try {
        const cached = localStorage.getItem("edadmin_bank_tp_cache");
        const list: BankTpItem[] = cached ? JSON.parse(cached) : [];
        const combined = [...list, ...importedItems];
        localStorage.setItem("edadmin_bank_tp_cache", JSON.stringify(combined));
      } catch {}

      Swal.fire({
        icon: "success",
        title: "Import Excel Berhasil!",
        text: `Berhasil mengimpor ${importedItems.length} Tujuan Pembelajaran ke Bank TP Cloud.${
          skippedCount > 0 ? ` (${skippedCount} baris dikosongkan/diabaikan)` : ""
        }`,
        confirmButtonColor: "#2563eb"
      });
    } catch (err: any) {
      console.error("Error importing TP Excel:", err);
      Swal.fire("Gagal Import", "Terjadi kesalahan saat membaca file Excel: " + (err?.message || "Error"), "error");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleDownloadTpTemplate = () => {
    try {
      const templateData = [
        {
          "Kode TP": "TP 1.1",
          "Mata Pelajaran": "Matematika",
          "Fase": "Fase B",
          "Kelas": "Kelas 4",
          "Semester": "Ganjil",
          "Materi Pokok": "Operasi Hitung Bilangan Cacah",
          "Tujuan Pembelajaran": "Memahami dan menyelesaikan operasi hitung penjumlahan dan pengurangan bilangan cacah sampai 10.000."
        },
        {
          "Kode TP": "TP 1.2",
          "Mata Pelajaran": "Bahasa Indonesia",
          "Fase": "Fase B",
          "Kelas": "Kelas 4",
          "Semester": "Ganjil",
          "Materi Pokok": "Ide Pokok Teks Narasi",
          "Tujuan Pembelajaran": "Menyimak dan menemukan ide pokok serta gagasan pendukung dalam teks narasi secara mandiri."
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Bank TP");
      XLSX.writeFile(wb, "Template_Import_Bank_TP_Kurikulum_Merdeka.xlsx");
    } catch (err: any) {
      Swal.fire("Gagal", "Gagal mengunduh template: " + (err?.message || "Error"), "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-blue-100 text-xs font-semibold uppercase tracking-wider">
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Kurikulum Merdeka • Manajemen Asesmen & Raport</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bank Tujuan Pembelajaran (Bank TP)
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Simpan utuh seluruh Tujuan Pembelajaran (TP) resmi sekolah ke database cloud. Saat mengisi nilai raport, guru dapat langsung memilih TP dari bank ini atau merumuskan baru dengan bantuan AI secara permanen tanpa takut hilang atau kembali ke default.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-blue-800 font-bold text-sm shadow-md hover:bg-blue-50 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-blue-700" />
              <span>+ Tambah TP</span>
            </button>

            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm shadow-md transition transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-amber-900" />
              <span>Generate AI</span>
            </button>

            {onNavigateToRaport && (
              <button
                onClick={onNavigateToRaport}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm backdrop-blur-md transition"
              >
                <GraduationCap className="w-4 h-4 text-blue-200" />
                <span>Buka Raport</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Database className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-blue-200 font-medium">Total TP Tersimpan</p>
              <p className="text-lg font-bold">{bankTpList.length} Butir TP</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <p className="text-blue-200 font-medium">Mata Pelajaran</p>
              <p className="text-lg font-bold">{Object.keys(groupedTps).length} Mapel Aktif</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <CheckCircle2 className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <p className="text-blue-200 font-medium">Status Penyimpanan</p>
              <p className="text-sm font-bold text-emerald-300">Cloud & Offline 100%</p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-white/10">
              <Sparkles className="w-4 h-4 text-pink-300" />
            </div>
            <div>
              <p className="text-blue-200 font-medium">Integrasi Raport</p>
              <p className="text-sm font-bold text-white">Sinkron Otomatis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kalimat TP, materi pokok, kode, atau mapel..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mapel Filter */}
          <select
            value={selectedMapelFilter}
            onChange={(e) => setSelectedMapelFilter(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Mapel ({activeClassMapels.length})</option>
            {activeClassMapels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Fase & Kelas Filter */}
          <div className="flex items-center space-x-1">
            <select
              value={selectedFaseFilter}
              disabled={isGuruKelas && Boolean(teacherClass)}
              onChange={(e) => setSelectedFaseFilter(e.target.value)}
              className={`text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium ${
                isGuruKelas && teacherClass ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold" : ""
              }`}
            >
              {isGuruKelas && teacherClass ? (
                <option value={teacherClass}>🔒 Hak Akses: {teacherClass}</option>
              ) : (
                <>
                  <option value="Semua">Semua Kelas & Fase</option>
                  <optgroup label="SD / MI (Per-Kelas)">
                    <option value="Kelas 1">Kelas 1 (Fase A)</option>
                    <option value="Kelas 2">Kelas 2 (Fase A)</option>
                    <option value="Kelas 3">Kelas 3 (Fase B)</option>
                    <option value="Kelas 4">Kelas 4 (Fase B)</option>
                    <option value="Kelas 5">Kelas 5 (Fase C)</option>
                    <option value="Kelas 6">Kelas 6 (Fase C)</option>
                  </optgroup>
                  <optgroup label="SD / MI (Per-Fase)">
                    <option value="Fase A">Semua Fase A (Kelas 1 - 2)</option>
                    <option value="Fase B">Semua Fase B (Kelas 3 - 4)</option>
                    <option value="Fase C">Semua Fase C (Kelas 5 - 6)</option>
                  </optgroup>
                  <optgroup label="SMP / MTs">
                    <option value="Kelas 7">Kelas 7 (Fase D)</option>
                    <option value="Kelas 8">Kelas 8 (Fase D)</option>
                    <option value="Kelas 9">Kelas 9 (Fase D)</option>
                    <option value="Fase D">Semua Fase D (SMP)</option>
                  </optgroup>
                  <optgroup label="SMA / SMK / MA">
                    <option value="Kelas 10">Kelas 10 (Fase E)</option>
                    <option value="Kelas 11">Kelas 11 (Fase F)</option>
                    <option value="Kelas 12">Kelas 12 (Fase F)</option>
                    <option value="Fase E">Semua Fase E (SMA)</option>
                    <option value="Fase F">Semua Fase F (SMA)</option>
                  </optgroup>
                </>
              )}
            </select>
          </div>

          {/* Semester Filter */}
          <select
            value={selectedSemesterFilter}
            onChange={(e) => setSelectedSemesterFilter(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Semester</option>
            <option value="Ganjil">Semester Ganjil</option>
            <option value="Genap">Semester Genap</option>
          </select>

          {/* View Mode Toggle: Table vs Cards */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Tampilan Tabel Utama"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Bank TP</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
              title="Tampilan Kartu per Mapel"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kartu Mapel</span>
            </button>
          </div>

          {/* Export, Import & Preset Buttons */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-xs font-semibold transition cursor-pointer"
            title="Ekspor Seluruh Bank TP ke Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ekspor</span>
          </button>

          <button
            onClick={handleImportExcelClick}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold transition cursor-pointer shadow-2xs"
            title="Import File Excel Bank TP (.xlsx / .xls)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleDownloadTpTemplate}
            className="inline-flex items-center space-x-1.5 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 text-[11px] font-medium transition cursor-pointer"
            title="Unduh Contoh Template Excel Import Bank TP"
          >
            <span>Format Template</span>
          </button>

          {bankTpList.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition border border-blue-200 dark:border-blue-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Contoh TP</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State Banner if no TPs exist */}
      {bankTpList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <BookmarkCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Bank Tujuan Pembelajaran Masih Kosong
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mulai isi Bank TP dengan contoh standar Kurikulum Merdeka atau gunakan generator AI untuk merumuskan TP sesuai kebutuhan kelas Anda.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedDefaults}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Paket Contoh Kurikulum Merdeka</span>
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rumuskan dengan AI</span>
            </button>
          </div>
        </div>
      ) : filteredTps.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-slate-500 border border-slate-200 dark:border-slate-700">
          Tidak ditemukan Tujuan Pembelajaran dengan filter atau pencarian "{searchQuery}".
        </div>
      ) : (
        /* Content Display: Clean Table View (Default) or Cards View */
        viewMode === "table" ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    Tabel Bank Tujuan Pembelajaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Menampilkan {filteredTps.length} butir TP aktif (Tanpa Kategori)
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah TP</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-700">No</th>
                    <th className="py-3 px-4 min-w-[170px] border-r border-slate-200 dark:border-slate-700">Mata Pelajaran</th>
                    <th className="py-3 px-3 min-w-[110px] border-r border-slate-200 dark:border-slate-700">Kelas</th>
                    <th className="py-3 px-3 min-w-[90px] border-r border-slate-200 dark:border-slate-700">Semester</th>
                    <th className="py-3 px-3 min-w-[85px] border-r border-slate-200 dark:border-slate-700">Kode TP</th>
                    <th className="py-3 px-4 min-w-[170px] border-r border-slate-200 dark:border-slate-700">Materi Pokok</th>
                    <th className="py-3 px-4 min-w-[280px] border-r border-slate-200 dark:border-slate-700">Tujuan Pembelajaran</th>
                    <th className="py-3 px-3 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredTps.map((tp, idx) => (
                    <tr
                      key={tp.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-700/40 transition duration-150"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold border-r border-slate-200/60 dark:border-slate-700/60">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200/60 dark:border-slate-700/60">{tp.mapel}</td>
                      <td className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-700/60">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {tp.kelas && tp.kelas !== "Semua Kelas" ? `${tp.kelas} (${tp.fase || "Fase B"})` : (tp.fase || "Semua")}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-700/60">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                          {tp.semester}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-blue-700 dark:text-blue-400 border-r border-slate-200/60 dark:border-slate-700/60">{tp.kodeTp || "-"}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium border-r border-slate-200/60 dark:border-slate-700/60">{tp.materiPokok || "-"}</td>
                      <td className="py-3 px-4 font-medium leading-relaxed text-slate-800 dark:text-slate-100 max-w-md border-r border-slate-200/60 dark:border-slate-700/60">{tp.tujuanPembelajaran}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleCopyTp(tp.tujuanPembelajaran)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Salin Kalimat TP"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(tp)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                            title="Edit TP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTp(tp)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                            title="Hapus TP"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grouped Cards per Mata Pelajaran */
          <div className="space-y-6">
            {(Object.entries(groupedTps) as [string, BankTpItem[]][]).map(([mapelName, items]) => (
              <div
                key={mapelName}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden"
              >
                {/* Group Header */}
                <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                      {items.length}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                        {mapelName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {items.length} Tujuan Pembelajaran tersimpan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingTpId(null);
                        setFormData({
                          mapel: mapelName,
                          kelas: "Semua Kelas",
                          fase: "Fase B",
                          semester: "Ganjil",
                          kodeTp: `TP 1.${items.length + 1}`,
                          materiPokok: "",
                          tujuanPembelajaran: ""
                        });
                        setIsFormModalOpen(true);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah di Mapel Ini</span>
                    </button>
                  </div>
                </div>

                {/* Items Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((tp) => (
                    <div
                      key={tp.id}
                      className="group relative p-4 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        {/* Badges Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {tp.kodeTp && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold">
                                {tp.kodeTp}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                              {tp.kelas && tp.kelas !== "Semua Kelas" ? `${tp.kelas} (${tp.fase || "Fase B"})` : (tp.fase || "Fase B")}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium">
                              {tp.semester}
                            </span>
                          </div>
                        </div>

                        {/* Materi Pokok */}
                        {tp.materiPokok && (
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Materi: <span className="text-slate-700 dark:text-slate-300">{tp.materiPokok}</span>
                          </p>
                        )}

                        {/* Main TP Text */}
                        <p className="text-sm text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                          {tp.tujuanPembelajaran}
                        </p>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate max-w-[150px] text-[10px]">
                          {tp.createdBy || "Guru"}
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleCopyTp(tp.tujuanPembelajaran)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Salin Kalimat TP"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(tp)}
                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                            title="Edit TP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTp(tp)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                            title="Hapus TP"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Form Tambah / Edit TP */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    {editingTpId ? "Edit Tujuan Pembelajaran" : "Tambah Tujuan Pembelajaran"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tersimpan permanen di cloud dan langsung muncul di opsi Raport Siswa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Mapel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.mapel}
                    onChange={(e) => setFormData({ ...formData, mapel: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {activeClassMapels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Kelas & Fase */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Target Kelas & Fase Kurikulum <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={getCurrentSelectedKelasFase()}
                    onChange={(e) => {
                      const [k, f] = e.target.value.split("|");
                      setFormData({ ...formData, kelas: k, fase: f });
                    }}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  >
                    <optgroup label="Sekolah Dasar (SD / MI)">
                      <option value="Kelas 1|Fase A">Kelas 1 (Fase A)</option>
                      <option value="Kelas 2|Fase A">Kelas 2 (Fase A)</option>
                      <option value="Kelas 3|Fase B">Kelas 3 (Fase B)</option>
                      <option value="Kelas 4|Fase B">Kelas 4 (Fase B)</option>
                      <option value="Kelas 5|Fase C">Kelas 5 (Fase C)</option>
                      <option value="Kelas 6|Fase C">Kelas 6 (Fase C)</option>
                    </optgroup>
                    <optgroup label="SMP / MTs">
                      <option value="Kelas 7|Fase D">Kelas 7 (Fase D SMP)</option>
                      <option value="Kelas 8|Fase D">Kelas 8 (Fase D SMP)</option>
                      <option value="Kelas 9|Fase D">Kelas 9 (Fase D SMP)</option>
                    </optgroup>
                    <optgroup label="SMA / SMK / MA">
                      <option value="Kelas 10|Fase E">Kelas 10 (Fase E SMA)</option>
                      <option value="Kelas 11|Fase F">Kelas 11 (Fase F SMA)</option>
                      <option value="Kelas 12|Fase F">Kelas 12 (Fase F SMA)</option>
                    </optgroup>
                    <optgroup label="Fleksibel / Lintas Kelas">
                      <option value="Semua Kelas|Fase A">Semua Kelas - Fase A (Kelas 1-2)</option>
                      <option value="Semua Kelas|Fase B">Semua Kelas - Fase B (Kelas 3-4)</option>
                      <option value="Semua Kelas|Fase C">Semua Kelas - Fase C (Kelas 5-6)</option>
                      <option value="Semua Kelas|Semua Fase">Semua Kelas & Semua Fase</option>
                    </optgroup>
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value as any })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                    <option value="Semua">Semua Semester (Fleksibel)</option>
                  </select>
                </div>

                {/* Kode TP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Kode TP (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.kodeTp}
                    onChange={(e) => setFormData({ ...formData, kodeTp: e.target.value })}
                    placeholder="Contoh: TP 1.1 atau TP A.1"
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Materi Pokok */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Materi Pokok / Lingkup Materi
                </label>
                <input
                  type="text"
                  value={formData.materiPokok}
                  onChange={(e) => setFormData({ ...formData, materiPokok: e.target.value })}
                  placeholder="Contoh: Operasi Hitung Bilangan Cacah, Teks Narasi, Bentang Alam..."
                  className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Kalimat Tujuan Pembelajaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Kalimat Tujuan Pembelajaran (TP) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.tujuanPembelajaran}
                  onChange={(e) => setFormData({ ...formData, tujuanPembelajaran: e.target.value })}
                  placeholder="Gunakan Kata Kerja Operasional (KKO), contoh: Memahami dan menyelesaikan operasi hitung pecahan senilai serta mengaplikasikannya dalam masalah kontekstual."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Sistem Multi-TP Otomatis (Tanpa Kategori) */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                <span className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                  ✨ Simple Multi-TP Auto-Concatenation
                </span>
                <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300/90 leading-relaxed">
                  Guru tidak perlu lagi mengelompokkan kategori bobot. Cukup inputkan 1 atau beberapa TP yang diajarkan pada mata pelajaran & kelas ini, sistem otomatis menggabungkannya secara alami ke dalam deskripsi rapor siswa.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
                >
                  {editingTpId ? "Perbarui TP" : "Simpan ke Bank TP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Generate AI TP */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                    Rumuskan TP Otomatis dengan AI
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sesuai Standar Taksonomi Bloom & Kurikulum Merdeka Kemendikbudristek.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
                disabled={isGeneratingAi}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleGenerateAiTp} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={aiForm.mapel}
                    onChange={(e) => setAiForm({ ...aiForm, mapel: e.target.value })}
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {activeClassMapels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Target Kelas & Fase
                    </label>
                    <select
                      value={`${aiForm.kelas || "Kelas 4"}|${aiForm.fase || "Fase B"}`}
                      onChange={(e) => {
                        const [k, f] = e.target.value.split("|");
                        setAiForm({ ...aiForm, kelas: k, fase: f });
                      }}
                      className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="Kelas 1|Fase A">Kelas 1 (Fase A)</option>
                      <option value="Kelas 2|Fase A">Kelas 2 (Fase A)</option>
                      <option value="Kelas 3|Fase B">Kelas 3 (Fase B)</option>
                      <option value="Kelas 4|Fase B">Kelas 4 (Fase B)</option>
                      <option value="Kelas 5|Fase C">Kelas 5 (Fase C)</option>
                      <option value="Kelas 6|Fase C">Kelas 6 (Fase C)</option>
                      <option value="Kelas 7|Fase D">Kelas 7 (Fase D SMP)</option>
                      <option value="Kelas 8|Fase D">Kelas 8 (Fase D SMP)</option>
                      <option value="Kelas 9|Fase D">Kelas 9 (Fase D SMP)</option>
                      <option value="Kelas 10|Fase E">Kelas 10 (Fase E SMA)</option>
                      <option value="Kelas 11|Fase F">Kelas 11 (Fase F SMA)</option>
                      <option value="Kelas 12|Fase F">Kelas 12 (Fase F SMA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Semester
                    </label>
                    <select
                      value={aiForm.semester}
                      onChange={(e) => setAiForm({ ...aiForm, semester: e.target.value })}
                      className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Materi Pokok / Topik Pembelajaran (Opsional)
                  </label>
                  <input
                    type="text"
                    value={aiForm.materiPokok}
                    onChange={(e) => setAiForm({ ...aiForm, materiPokok: e.target.value })}
                    placeholder="Contoh: Pengukuran & Data, Cerita Fantasi, Norma & Aturan..."
                    className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Jika dikosongkan, AI akan merumuskan TP dari materi-materi esensial standar semester tersebut.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Jumlah Butir TP yang Dibuat
                  </label>
                  <div className="flex items-center space-x-2">
                    {[3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAiForm({ ...aiForm, jumlah: num })}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                          aiForm.jumlah === num
                            ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {num} TP
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  disabled={isGeneratingAi}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Merumuskan TP dengan AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Mulai Rumuskan & Simpan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
