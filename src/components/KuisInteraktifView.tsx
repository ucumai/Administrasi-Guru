import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import confetti from "canvas-confetti";
import { 
  Gamepad2, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Clock, 
  Sparkles, 
  Award, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  Upload, 
  Eye, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  FileText, 
  Search,
  Filter,
  Users,
  Check,
  Zap,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  QrCode,
  GraduationCap,
  Image,
  Film,
  Video,
  ZoomIn,
  Wand2,
  ExternalLink,
  Link as LinkIcon,
  PlayCircle,
  Layers,
  FileQuestion,
  Loader2
} from "lucide-react";
import { 
  Siswa, 
  Mapel, 
  DataNilai, 
  Pengaturan, 
  User, 
  KuisPaket, 
  KuisSoalItem, 
  KuisSesiRecord, 
  KuisHasilSiswa,
  KuisMediaType
} from "../types";
import { 
  subscribeCollection, 
  saveDocument, 
  deleteDocument, 
  batchSaveDocuments, 
  COLLECTIONS 
} from "../lib/firebase";
import { getAllowedClasses } from "../lib/accessControl";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  showToastSuccess, 
  confirmDeleteAlert,
  showSuccessAlert
} from "../lib/swal";

// Helper to convert YouTube URL to embed format
export function formatVideoEmbedUrl(url: string): string {
  if (!url) return "";
  try {
    if (url.includes("/embed/")) return url;
    const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (youtuBeMatch && youtuBeMatch[1]) {
      return `https://www.youtube.com/embed/${youtuBeMatch[1]}`;
    }
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }
  } catch {}
  return url;
}

// Preset Educational Media Collection for Quick Selection
export const MEDIA_PRESETS = [
  {
    kategori: "IPAS / Sains",
    nama: "Ekosistem & Rantai Makanan Sawah (Gambar)",
    type: "image" as KuisMediaType,
    url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
    caption: "Ekosistem persawahan dan flora produsen hayati"
  },
  {
    kategori: "IPAS / Sains",
    nama: "Rotasi Bumi & Tata Surya (GIF Gerak)",
    type: "gif" as KuisMediaType,
    url: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif",
    caption: "Animasi gerak rotasi bumi pada porosnya mengelilingi matahari"
  },
  {
    kategori: "IPAS / Sains",
    nama: "Metamorfosis Kupu-Kupu (Gambar Gerak)",
    type: "gif" as KuisMediaType,
    url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
    caption: "Siklus metamorfosis sempurna ulat menjadi kupu-kupu"
  },
  {
    kategori: "IPAS / Sains",
    nama: "Siklus Air & Hujan (Video Pembelajaran)",
    type: "video" as KuisMediaType,
    url: "https://www.youtube.com/watch?v=ncORPosDrjI",
    caption: "Video animasi edukasi proses terjadinya siklus air dan hujan"
  },
  {
    kategori: "Matematika",
    nama: "Konsep Pecahan Lingkaran (Gambar)",
    type: "image" as KuisMediaType,
    url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80",
    caption: "Diagram pembagian bidang dan nilai pecahan bagian"
  },
  {
    kategori: "Matematika",
    nama: "Bangun Ruang Kubus & Balok (GIF Gerak)",
    type: "gif" as KuisMediaType,
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Cube_rotation.gif",
    caption: "Animasi rotasi 3D bidang bangun ruang kubus beraturan"
  },
  {
    kategori: "Matematika",
    nama: "Operasi Pecahan Ceria (Video Pembelajaran)",
    type: "video" as KuisMediaType,
    url: "https://www.youtube.com/watch?v=v3vG1r2d4_w",
    caption: "Video panduan mudah menjumlahkan pecahan berbeda penyebut"
  },
  {
    kategori: "Pancasila / IPS",
    nama: "Peta Wilayah Nusantara Indonesia (Gambar)",
    type: "image" as KuisMediaType,
    url: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&auto=format&fit=crop&q=80",
    caption: "Peta bentang alam gugusan kepulauan Indonesia"
  }
];

// Web Audio API Sound Synthesizer for Interactive Game-Show sounds
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playTick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio not permitted or suspended
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {}
  }

  playFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.15, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.6);
      });
    } catch {}
  }
}

const sfx = new SoundEffects();

// Default starter quizzes
const DEFAULT_STARTER_KUIS: KuisPaket[] = [
  {
    id: "kuis-ipas-ekosistem",
    judul: "Kuis Cerdas IPAS: Ekosistem & Rantai Makanan",
    mapel: "IPAS (Ilmu Pengetahuan Alam & Sosial)",
    kelas: "Kelas 5",
    deskripsi: "Asesmen formatif interaktif seputar produsen, konsumen, dekomposer, dan keseimbangan jaring-jaring makanan.",
    pinCode: "8821",
    totalSoal: 5,
    topikMateri: "Ekosistem & Rantai Makanan",
    dibuatOleh: "Guru Kelas / Administrator",
    tanggalDibuat: new Date().toISOString().split("T")[0],
    daftarSoal: [
      {
        id: "soal-1",
        nomor: 1,
        pertanyaan: "Dalam sebuah ekosistem sawah pada gambar di bawah, organisme manakah yang bertindak sebagai produsen utama yang mampu menghasilkan makanan sendiri?",
        opsiA: "Belalang",
        opsiB: "Padi",
        opsiC: "Katak",
        opsiD: "Burung Elang",
        kunci: "B",
        pembahasan: "Padi adalah tumbuhan hijau yang memiliki klorofil dan mampu melakukan fotosintesis untuk menghasilkan energi sendiri (Produsen).",
        waktuDetik: 30,
        poin: 20,
        mediaType: "image",
        mediaUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
        mediaCaption: "Ilustrasi hamparan ekosistem persawahan hijau sebagai habitat produsen dan konsumen"
      },
      {
        id: "soal-2",
        nomor: 2,
        pertanyaan: "Perhatikan animasi rantai makanan berikut! Jika populasi katak di sawah menurun drastis karena diburu manusia, kemungkinan yang akan terjadi pada populasi belalang adalah...",
        opsiA: "Populasi belalang akan meningkat drastis",
        opsiB: "Populasi belalang akan punah",
        opsiC: "Populasi belalang tidak terpengaruh",
        opsiD: "Belalang akan berubah menjadi karnivora",
        kunci: "A",
        pembahasan: "Katak memangsa belalang. Jika predator (katak) berkurang drastis, populasi mangsa (belalang) akan bertambah pesat tanpa kendali.",
        waktuDetik: 30,
        poin: 20,
        mediaType: "gif",
        mediaUrl: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
        mediaCaption: "Animasi interaksi gerak rantai makanan dan predator di alam"
      },
      {
        id: "soal-3",
        nomor: 3,
        pertanyaan: "Simak tayangan edukatif berikut! Organisme yang berperan menguraikan sisa-sisa makhluk hidup yang telah mati menjadi zat hara penyubur tanah disebut...",
        opsiA: "Konsumen Primer",
        opsiB: "Konsumen Tersier",
        opsiC: "Dekomposer (Pengurai)",
        opsiD: "Parasit Obligat",
        kunci: "C",
        pembahasan: "Pengurai (dekomposer) seperti jamur dan bakteri menguraikan materi organik mati menjadi unsur hara yang dibutuhkan tanah.",
        waktuDetik: 35,
        poin: 20,
        mediaType: "video",
        mediaUrl: "https://www.youtube.com/watch?v=ncORPosDrjI",
        mediaCaption: "Video edukasi peran jamur dan bakteri pengurai dalam siklus biogeokimia"
      },
      {
        id: "soal-4",
        nomor: 4,
        pertanyaan: "Hubungan timbal balik antara dua makhluk hidup di mana satu pihak diuntungkan dan pihak lain tidak dirugikan disebut simbiosis...",
        opsiA: "Mutualisme",
        opsiB: "Parasitisme",
        opsiC: "Komensalisme",
        opsiD: "Kompetisi",
        kunci: "C",
        pembahasan: "Simbiosis Komensalisme adalah interaksi di mana satu pihak untung dan pihak lain netral (contoh: ikan remora dan hiu, anggrek pada pohon inang).",
        waktuDetik: 30,
        poin: 20
      },
      {
        id: "soal-5",
        nomor: 5,
        pertanyaan: "Manakah tindakan nyata yang paling tepat untuk menjaga kelestarian ekosistem dan keseimbangan rantai makanan di lingkungan sekitar?",
        opsiA: "Menggunakan pestisida kimia dalam jumlah sangat banyak",
        opsiB: "Melakukan reboisasi dan tidak memburu satwa liar pemangsa alami",
        opsiC: "Membuang limbah plastik langsung ke sungai",
        opsiD: "Menebang semua pohon untuk lahan beton",
        kunci: "B",
        pembahasan: "Reboisasi dan menjaga satwa liar membantu menjaga rantai makanan tetap seimbang dan lingkungan lestari.",
        waktuDetik: 30,
        poin: 20
      }
    ]
  },
  {
    id: "kuis-mat-pecahan",
    judul: "Kuis Kilat Matematika: Pecahan & Operasi Hitung",
    mapel: "Matematika",
    kelas: "Kelas 4",
    deskripsi: "Asesmen cepat operasi pecahan senilai, penjumlahan, dan pengurangan.",
    pinCode: "5412",
    totalSoal: 4,
    dibuatOleh: "Guru Kelas / Administrator",
    tanggalDibuat: new Date().toISOString().split("T")[0],
    daftarSoal: [
      {
        id: "soal-m-1",
        nomor: 1,
        pertanyaan: "Bentuk pecahan paling sederhana dari 8/12 adalah...",
        opsiA: "4/6",
        opsiB: "2/3",
        opsiC: "3/4",
        opsiD: "1/2",
        kunci: "B",
        pembahasan: "Bagi pembilang dan penyebut dengan FPB(8, 12) yaitu 4: 8:4 = 2, 12:4 = 3 -> 2/3.",
        waktuDetik: 30,
        poin: 25
      },
      {
        id: "soal-m-2",
        nomor: 2,
        pertanyaan: "Hasil dari 1/4 + 2/4 adalah...",
        opsiA: "3/8",
        opsiB: "2/4",
        opsiC: "3/4",
        opsiD: "1/2",
        kunci: "C",
        pembahasan: "Karena penyebut sama (4), langsung jumlahkan pembilang: 1 + 2 = 3. Hasil = 3/4.",
        waktuDetik: 25,
        poin: 25
      },
      {
        id: "soal-m-3",
        nomor: 3,
        pertanyaan: "Ibu memiliki sebuah semangka yang dipotong menjadi 8 bagian sama besar. Budi memakan 3 bagian. Berapa bagian semangka yang tersisa?",
        opsiA: "5/8 bagian",
        opsiB: "3/8 bagian",
        opsiC: "8/5 bagian",
        opsiD: "1/2 bagian",
        kunci: "A",
        pembahasan: "Sisa semangka = 8/8 - 3/8 = 5/8 bagian.",
        waktuDetik: 30,
        poin: 25
      },
      {
        id: "soal-m-4",
        nomor: 4,
        pertanyaan: "Manakah di antara pecahan berikut yang nilainya paling besar?",
        opsiA: "1/2",
        opsiB: "1/3",
        opsiC: "1/4",
        opsiD: "1/5",
        kunci: "A",
        pembahasan: "Jika pembilang sama (1), semakin kecil nilai penyebutnya, maka semakin besar nilai pecahan tersebut (1/2 = 0,5).",
        waktuDetik: 30,
        poin: 25
      }
    ]
  }
];

interface KuisInteraktifViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  dataNilaiList: DataNilai[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const KuisInteraktifView: React.FC<KuisInteraktifViewProps> = ({
  siswaList,
  mapelList,
  dataNilaiList,
  config,
  currentUser = null
}) => {
  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));
  const isGuruKelas = currentUser?.role === "guru_kelas";

  // Tab State
  const [activeTab, setActiveTab] = useState<"host" | "grader" | "manage" | "analisis">("host");

  // Firebase Subscriptions
  const [kuisList, setKuisList] = useState<KuisPaket[]>([]);
  const [sesiList, setSesiList] = useState<KuisSesiRecord[]>([]);

  // Selected Quiz and Class
  const [selectedKuisId, setSelectedKuisId] = useState<string>("");
  const [selectedKelas, setSelectedKelas] = useState<string>("");

  // Host Mode States
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);
  const hostContainerRef = useRef<HTMLDivElement>(null);

  // Student Responses (In-memory & persisted for Grader & Live Host)
  // Map of studentId -> { 0: 'A', 1: 'B', ... }
  const [studentAnswers, setStudentAnswers] = useState<Record<string, Record<number, string>>>({});
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Quiz Editor Form Modal
  const [showEditorModal, setShowEditorModal] = useState<boolean>(false);
  const [editingKuis, setEditingKuis] = useState<KuisPaket | null>(null);

  // AI Quiz Generator States
  const [isAiQuizModalOpen, setIsAiQuizModalOpen] = useState<boolean>(false);
  const [aiMateri, setAiMateri] = useState<string>("");
  const [aiMapel, setAiMapel] = useState<string>("");
  const [aiKelas, setAiKelas] = useState<string>("");
  const [aiJumlahSoal, setAiJumlahSoal] = useState<number>(5);
  const [aiTingkatKesulitan, setAiTingkatKesulitan] = useState<string>("campuran");
  const [aiSertakanMedia, setAiSertakanMedia] = useState<boolean>(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiProgressText, setAiProgressText] = useState<string>("");
  const [aiGeneratedPreview, setAiGeneratedPreview] = useState<KuisPaket | null>(null);

  // Single Question AI Assistant State
  const [isGeneratingSingleQIndex, setIsGeneratingSingleQIndex] = useState<number | null>(null);

  // Media Zoom & Preset Pickers
  const [zoomedMedia, setZoomedMedia] = useState<{ url: string; type: string; caption?: string } | null>(null);
  const [presetPickerTargetIndex, setPresetPickerTargetIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputTargetQIndex, setFileInputTargetQIndex] = useState<number | null>(null);

  // Subscribe to Kuis and Sesi
  useEffect(() => {
    const unsubKuis = subscribeCollection<KuisPaket>(COLLECTIONS.KUIS_PAKET, (data) => {
      if (data.length > 0) {
        setKuisList(data);
      } else {
        // Populate default starter quizzes if empty
        DEFAULT_STARTER_KUIS.forEach((starter) => {
          saveDocument(COLLECTIONS.KUIS_PAKET, starter.id, starter).catch(console.warn);
        });
        setKuisList(DEFAULT_STARTER_KUIS);
      }
    });

    const unsubSesi = subscribeCollection<KuisSesiRecord>(COLLECTIONS.KUIS_SESI, (data) => {
      setSesiList(data);
    });

    return () => {
      unsubKuis();
      unsubSesi();
    };
  }, []);

  // Sync initial class selection
  useEffect(() => {
    if (allowedClasses.length > 0 && !selectedKelas) {
      setSelectedKelas(allowedClasses[0]);
    }
  }, [allowedClasses, selectedKelas]);

  // Sync initial quiz selection
  useEffect(() => {
    if (kuisList.length > 0 && !selectedKuisId) {
      setSelectedKuisId(kuisList[0].id);
    }
  }, [kuisList, selectedKuisId]);

  const activeKuis = useMemo(() => {
    return kuisList.find((k) => k.id === selectedKuisId) || kuisList[0] || null;
  }, [kuisList, selectedKuisId]);

  const currentQuestion = useMemo(() => {
    if (!activeKuis || !activeKuis.daftarSoal || activeKuis.daftarSoal.length === 0) return null;
    return activeKuis.daftarSoal[currentQuestionIndex] || activeKuis.daftarSoal[0];
  }, [activeKuis, currentQuestionIndex]);

  const classStudents = useMemo(() => {
    return siswaList.filter((s) => s.kelas === selectedKelas);
  }, [siswaList, selectedKelas]);

  // Generate QR Code data url for PIN & Room
  useEffect(() => {
    if (activeKuis) {
      import("qrcode").then((QRCode) => {
        const joinInfo = JSON.stringify({
          app: "EduAdmin-Kuis",
          pin: activeKuis.pinCode,
          judul: activeKuis.judul,
          kelas: selectedKelas
        });
        QRCode.toDataURL(joinInfo, { width: 280, margin: 2 })
          .then(setQrCodeDataUrl)
          .catch(console.warn);
      }).catch(console.warn);
    }
  }, [activeKuis, selectedKelas]);

  // Timer logic for Host Game Show
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (isSoundOn) sfx.playTick();
            return 0;
          }
          if (prev <= 6 && isSoundOn) {
            sfx.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, isSoundOn]);

  // Reset timer on question switch
  useEffect(() => {
    if (currentQuestion) {
      setTimerSeconds(currentQuestion.waktuDetik || 30);
      setIsTimerRunning(false);
      setIsAnswerRevealed(false);
    }
  }, [currentQuestionIndex, currentQuestion]);

  // Calculate live results per student
  const studentResults: KuisHasilSiswa[] = useMemo(() => {
    if (!activeKuis || !activeKuis.daftarSoal) return [];
    return classStudents.map((siswa) => {
      const answers = studentAnswers[siswa.id] || {};
      let totalBenar = 0;
      let totalSalah = 0;
      let scoreSum = 0;
      const totalPossiblePoints = activeKuis.daftarSoal.reduce((acc, q) => acc + (q.poin || 20), 0);

      activeKuis.daftarSoal.forEach((q, idx) => {
        const studentChoice = answers[idx];
        if (studentChoice) {
          if (studentChoice.toUpperCase() === q.kunci.toUpperCase()) {
            totalBenar++;
            scoreSum += (q.poin || 20);
          } else {
            totalSalah++;
          }
        }
      });

      const skorAkhir = totalPossiblePoints > 0 ? Math.round((scoreSum / totalPossiblePoints) * 100) : 0;

      return {
        idSiswa: siswa.id,
        namaSiswa: siswa.nama,
        kelas: siswa.kelas,
        jawaban: answers,
        totalBenar,
        totalSalah,
        skorAkhir
      };
    }).sort((a, b) => b.skorAkhir - a.skorAkhir);
  }, [activeKuis, classStudents, studentAnswers]);

  // Answer distribution for current question
  const currentAnswerDistribution = useMemo(() => {
    if (!currentQuestion) return { A: 0, B: 0, C: 0, D: 0, total: 0 };
    let a = 0, b = 0, c = 0, d = 0;
    classStudents.forEach((st) => {
      const ans = studentAnswers[st.id]?.[currentQuestionIndex];
      if (ans === "A") a++;
      else if (ans === "B") b++;
      else if (ans === "C") c++;
      else if (ans === "D") d++;
    });
    return { A: a, B: b, C: c, D: d, total: a + b + c + d };
  }, [studentAnswers, currentQuestionIndex, classStudents, currentQuestion]);

  // Handlers for Live Host Mode
  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
    setIsTimerRunning(false);
    if (isSoundOn) sfx.playCorrect();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleNextQuestion = () => {
    if (!activeKuis) return;
    if (currentQuestionIndex < activeKuis.daftarSoal.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Finished all questions!
      if (isSoundOn) sfx.playFanfare();
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 }
      });
      showSuccessAlert(
        "🎉 Kuis Telah Selesai!",
        `Seluruh ${activeKuis.daftarSoal.length} soal telah selesai dijawab. Anda dapat melihat Peringkat Kelas di bawah atau berpindah ke Tab Grader & Buku Nilai.`
      );
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      hostContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Quick Grader: Set Answer for Student
  const handleSetStudentAnswer = (studentId: string, questionIdx: number, choice: string) => {
    setStudentAnswers((prev) => {
      const studentMap = { ...(prev[studentId] || {}) };
      if (studentMap[questionIdx] === choice) {
        delete studentMap[questionIdx]; // toggle off
      } else {
        studentMap[questionIdx] = choice;
      }
      return {
        ...prev,
        [studentId]: studentMap
      };
    });
  };

  // Quick Grader: Auto simulate response / quick fill
  const handleAutoFillAnswers = (type: "perfect" | "realistic" | "reset") => {
    if (!activeKuis) return;
    if (type === "reset") {
      setStudentAnswers({});
      showToastSuccess("Respon siswa telah direset.");
      return;
    }

    const newMap: Record<string, Record<number, string>> = {};
    classStudents.forEach((st) => {
      const answers: Record<number, string> = {};
      activeKuis.daftarSoal.forEach((q, idx) => {
        if (type === "perfect") {
          answers[idx] = q.kunci;
        } else {
          // 80% chance correct, 20% random
          const isCorrect = Math.random() < 0.8;
          if (isCorrect) {
            answers[idx] = q.kunci;
          } else {
            const options = ["A", "B", "C", "D"].filter((o) => o !== q.kunci);
            answers[idx] = options[Math.floor(Math.random() * options.length)];
          }
        }
      });
      newMap[st.id] = answers;
    });
    setStudentAnswers(newMap);
    showToastSuccess(type === "perfect" ? "Semua siswa diisi jawaban benar 100%!" : "Simulasi jawaban kelas berhasil diisi!");
  };

  // Save Sesi & Sync to Data Nilai
  const handleSaveToDataNilai = async () => {
    if (!activeKuis || classStudents.length === 0) {
      notifySimpanError("Pilih kuis dan pastikan ada siswa di kelas ini!");
      return;
    }

    try {
      const now = new Date();
      const tanggalStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().split(" ")[0];

      // 1. Save Session Record
      const sessionDocId = `sesi-${activeKuis.id}-${selectedKelas}-${Date.now()}`;
      const avgScore = Math.round(studentResults.reduce((sum, s) => sum + s.skorAkhir, 0) / (studentResults.length || 1));
      const highestScore = Math.max(...studentResults.map((s) => s.skorAkhir), 0);
      const lowestScore = Math.min(...studentResults.map((s) => s.skorAkhir), 0);

      const sessionRecord: KuisSesiRecord = {
        id: sessionDocId,
        kuisId: activeKuis.id,
        judulKuis: activeKuis.judul,
        mapel: activeKuis.mapel,
        kelas: selectedKelas,
        tanggal: tanggalStr,
        pinCode: activeKuis.pinCode,
        guruPengampu: currentUser?.nama || config.Nama_Guru || "Guru Pengampu",
        totalPeserta: studentResults.length,
        rataRataKelas: avgScore,
        nilaiTertinggi: highestScore,
        nilaiTerendah: lowestScore,
        hasilSiswa: studentResults,
        updatedAt: Date.now()
      };

      await saveDocument(COLLECTIONS.KUIS_SESI, sessionDocId, sessionRecord);

      // 2. Batch Save into DATA_NILAI
      const dataNilaiToSave: DataNilai[] = studentResults.map((res) => {
        const studentInfo = classStudents.find((s) => s.id === res.idSiswa);
        return {
          id: `nilai-kuis-${activeKuis.id}-${res.idSiswa}-${tanggalStr}`,
          waktu: `${tanggalStr} ${timeStr}`,
          jenis: `Kuis: ${activeKuis.judul.substring(0, 20)}`,
          mapel: activeKuis.mapel,
          kelas: selectedKelas,
          idSiswa: res.idSiswa,
          namaSiswa: res.namaSiswa || studentInfo?.nama || "",
          nilai: res.skorAkhir,
          namaGuru: currentUser?.nama || config.Nama_Guru || "Guru Pengampu",
          updatedAt: Date.now()
        };
      });

      await batchSaveDocuments(COLLECTIONS.DATA_NILAI, dataNilaiToSave);

      notifySimpanSuccess(`Nilai kuis untuk ${dataNilaiToSave.length} siswa berhasil disimpan ke Buku Nilai resmi!`);
    } catch (err) {
      console.error(err);
      notifySimpanError("Gagal menyimpan nilai kuis ke database.");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!activeKuis || studentResults.length === 0) return;

    const dataRows = studentResults.map((res, index) => {
      const row: Record<string, string | number> = {
        "No": index + 1,
        "Nama Siswa": res.namaSiswa,
        "Kelas": selectedKelas,
        "Mata Pelajaran": activeKuis.mapel,
        "Total Benar": res.totalBenar,
        "Total Salah": res.totalSalah,
        "Skor Akhir (0-100)": res.skorAkhir,
        "Status": res.skorAkhir >= 75 ? "Tuntas (KKTP)" : "Perlu Remedial"
      };

      activeKuis.daftarSoal.forEach((q, qIdx) => {
        const ans = res.jawaban[qIdx] || "-";
        const isRight = ans.toUpperCase() === q.kunci.toUpperCase();
        row[`Soal ${qIdx + 1} (${q.kunci})`] = `${ans} ${isRight ? "✓" : "✗"}`;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Kuis");
    XLSX.writeFile(workbook, `Hasil_Kuis_${activeKuis.judul.replace(/\s+/g, "_")}_${selectedKelas}.xlsx`);
    showToastSuccess("File Excel berhasil diunduh!");
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (!activeKuis) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text((config.Nama_Sekolah || "SD NEGERI").toUpperCase(), 105, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`REKAPITULASI HASIL ASESMEN KUIS CEPAT`, 105, 21, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Judul Kuis: ${activeKuis.judul} | Mapel: ${activeKuis.mapel} | Kelas: ${selectedKelas}`, 105, 27, { align: "center" });
    doc.line(14, 30, 196, 30);

    const tableData = studentResults.map((r, idx) => [
      idx + 1,
      r.namaSiswa,
      r.totalBenar,
      r.totalSalah,
      r.skorAkhir,
      r.skorAkhir >= 75 ? "Tuntas" : "Remedial"
    ]);

    autoTable(doc, {
      startY: 34,
      head: [["No", "Nama Siswa", "Benar", "Salah", "Nilai Akhir", "Keterangan"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: "center" },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { halign: "center", cellWidth: 20 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 25, fontStyle: "bold" },
        5: { halign: "center", cellWidth: 35 }
      }
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 160;
    doc.setFontSize(9);
    doc.text(`${config.Tempat_Tanda_Tangan || "Tempat"}, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, 140, finalY + 12);
    doc.text(`Guru Pengampu,`, 140, finalY + 18);
    doc.text(currentUser?.nama || config.Nama_Guru || "( .................................. )", 140, finalY + 38);

    doc.save(`Rekap_Kuis_${activeKuis.judul.replace(/\s+/g, "_")}.pdf`);
    showToastSuccess("Dokumen PDF berhasil diunduh!");
  };

  // Create or Edit Quiz Handlers
  const handleOpenNewQuiz = () => {
    setEditingKuis({
      id: `kuis-${Date.now()}`,
      judul: "Kuis Baru",
      mapel: isGuruKelas ? "Tematik / Guru Kelas" : (mapelList[0]?.namaMapel || "IPAS"),
      kelas: selectedKelas || "Kelas 5",
      deskripsi: "Deskripsi singkat kuis pembelajaran",
      pinCode: Math.floor(1000 + Math.random() * 9000).toString(),
      totalSoal: 1,
      dibuatOleh: currentUser?.nama || config.Nama_Guru || "Guru",
      tanggalDibuat: new Date().toISOString().split("T")[0],
      daftarSoal: [
        {
          id: `soal-${Date.now()}`,
          nomor: 1,
          pertanyaan: "Tuliskan pertanyaan soal di sini...",
          opsiA: "Pilihan Jawaban A",
          opsiB: "Pilihan Jawaban B",
          opsiC: "Pilihan Jawaban C",
          opsiD: "Pilihan Jawaban D",
          kunci: "A",
          pembahasan: "Penjelasan pembahasan soal...",
          waktuDetik: 30,
          poin: 20
        }
      ]
    });
    setShowEditorModal(true);
  };

  const handleSaveQuiz = async () => {
    if (!editingKuis || !editingKuis.judul.trim()) {
      notifySimpanError("Judul kuis tidak boleh kosong!");
      return;
    }
    try {
      const updated: KuisPaket = {
        ...editingKuis,
        totalSoal: editingKuis.daftarSoal.length,
        updatedAt: Date.now()
      };
      await saveDocument(COLLECTIONS.KUIS_PAKET, updated.id, updated);
      setShowEditorModal(false);
      setSelectedKuisId(updated.id);
      notifySimpanSuccess("Paket kuis berhasil disimpan ke bank kuis!");
    } catch {
      notifySimpanError("Gagal menyimpan kuis.");
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const isConfirmed = await confirmDeleteAlert("Hapus Paket Kuis?", "Paket kuis ini akan dihapus dari bank kuis.");
    if (isConfirmed) {
      await deleteDocument(COLLECTIONS.KUIS_PAKET, quizId);
      showToastSuccess("Paket kuis telah dihapus.");
    }
  };

  // Open AI Quiz Generator Modal
  const handleOpenAiQuizModal = () => {
    setAiMateri("");
    setAiMapel(isGuruKelas ? "IPAS" : (mapelList[0]?.namaMapel || "IPAS"));
    setAiKelas(selectedKelas || "Kelas 5");
    setAiJumlahSoal(5);
    setAiTingkatKesulitan("campuran");
    setAiSertakanMedia(true);
    setAiGeneratedPreview(null);
    setIsAiQuizModalOpen(true);
  };

  // Generate Full Quiz Package with AI
  const handleGenerateAiQuiz = async () => {
    if (!aiMateri.trim()) {
      notifySimpanError("Silakan masukkan topik materi kuis yang ingin dibuat!");
      return;
    }

    setIsGeneratingAi(true);
    setAiProgressText("Menganalisis materi kurikulum & merumuskan paket kuis...");

    const progressTimer1 = setTimeout(() => {
      setAiProgressText("Menyusun butir soal berbobot & menyiapkan stimulus media visual...");
    }, 2000);
    const progressTimer2 = setTimeout(() => {
      setAiProgressText("Memvalidasi kunci jawaban & menyusun pembahasan mendalam...");
    }, 4500);

    try {
      const res = await fetch("/api/ai/generate-kuis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materi: aiMateri.trim(),
          mapel: aiMapel || "IPAS",
          kelas: aiKelas || "Kelas 5",
          jumlahSoal: aiJumlahSoal || 5,
          tingkatKesulitan: aiTingkatKesulitan,
          sertakanMedia: aiSertakanMedia
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Gagal menghubungi layanan AI.");
      }

      const generated: KuisPaket = {
        id: `kuis-ai-${Date.now()}`,
        judul: data.kuis.judul || `Kuis AI: ${aiMateri}`,
        deskripsi: data.kuis.deskripsi || `Kuis asesmen formatif interaktif ${aiMateri}`,
        mapel: data.kuis.mapel || aiMapel,
        kelas: data.kuis.kelas || aiKelas,
        pinCode: data.kuis.pinCode || String(Math.floor(1000 + Math.random() * 9000)),
        totalSoal: (data.kuis.daftarSoal || []).length,
        daftarSoal: data.kuis.daftarSoal || [],
        dibuatOleh: currentUser?.nama || config.Nama_Guru || "Guru (AI Assisted)",
        tanggalDibuat: new Date().toISOString().split("T")[0],
        topikMateri: aiMateri.trim(),
        aiGenerated: true
      };

      setAiGeneratedPreview(generated);
      showToastSuccess(`Berhasil membuat ${generated.daftarSoal.length} soal kuis dengan AI!`);
    } catch (err: any) {
      console.error(err);
      notifySimpanError(err?.message || "Gagal membuat kuis dengan AI. Pastikan server terhubung.");
    } finally {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setIsGeneratingAi(false);
      setAiProgressText("");
    }
  };

  // Save AI Generated Quiz to Firestore and make active
  const handleSaveAiGeneratedQuiz = async () => {
    if (!aiGeneratedPreview) return;
    try {
      await saveDocument(COLLECTIONS.KUIS_PAKET, aiGeneratedPreview.id, aiGeneratedPreview);
      setSelectedKuisId(aiGeneratedPreview.id);
      if (aiGeneratedPreview.kelas) {
        setSelectedKelas(aiGeneratedPreview.kelas);
      }
      setIsAiQuizModalOpen(false);
      setAiGeneratedPreview(null);
      notifySimpanSuccess("Paket kuis AI berhasil disimpan ke Bank Kuis dan siap dimainkan!");
      setActiveTab("host");
    } catch {
      notifySimpanError("Gagal menyimpan paket kuis AI.");
    }
  };

  // Generate / Refine Single Question with AI in Editor Modal
  const handleGenerateSingleQuestionAi = async (qIndex: number) => {
    if (!editingKuis) return;
    const targetQ = editingKuis.daftarSoal[qIndex];
    const defaultTopic = editingKuis.topikMateri || editingKuis.judul || "Materi Pembelajaran";

    setIsGeneratingSingleQIndex(qIndex);
    try {
      const res = await fetch("/api/ai/generate-kuis-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materi: targetQ.pertanyaan?.trim() || defaultTopic,
          mapel: editingKuis.mapel,
          kelas: editingKuis.kelas,
          nomor: qIndex + 1,
          tingkatKesulitan: "sedang",
          mediaType: targetQ.mediaType || "image"
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Gagal membuat soal dengan AI.");
      }

      const updated = [...editingKuis.daftarSoal];
      updated[qIndex] = {
        ...updated[qIndex],
        pertanyaan: data.soal.pertanyaan,
        opsiA: data.soal.opsiA,
        opsiB: data.soal.opsiB,
        opsiC: data.soal.opsiC,
        opsiD: data.soal.opsiD,
        kunci: data.soal.kunci,
        pembahasan: data.soal.pembahasan,
        waktuDetik: data.soal.waktuDetik || 30,
        poin: data.soal.poin || 20,
        mediaType: data.soal.mediaType || updated[qIndex].mediaType || "none",
        mediaUrl: data.soal.mediaUrl || updated[qIndex].mediaUrl || "",
        mediaCaption: data.soal.mediaCaption || updated[qIndex].mediaCaption || ""
      };

      setEditingKuis({ ...editingKuis, daftarSoal: updated });
      showToastSuccess(`Soal #${qIndex + 1} berhasil dilengkapi AI!`);
    } catch (err: any) {
      console.error(err);
      notifySimpanError(err?.message || "Gagal membuat butir soal dengan AI.");
    } finally {
      setIsGeneratingSingleQIndex(null);
    }
  };

  // Handle Local Image/GIF Upload
  const handleTriggerFileUpload = (qIndex: number) => {
    setFileInputTargetQIndex(qIndex);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || fileInputTargetQIndex === null || !editingKuis) return;

    if (file.size > 8 * 1024 * 1024) {
      notifySimpanError("Ukuran file maksimal 8MB!");
      return;
    }

    const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      const updated = [...editingKuis.daftarSoal];
      const target = updated[fileInputTargetQIndex];
      if (target) {
        target.mediaUrl = base64Url;
        target.mediaType = isGif ? "gif" : "image";
        target.mediaCaption = target.mediaCaption || `File media: ${file.name}`;
      }
      setEditingKuis({ ...editingKuis, daftarSoal: updated });
      showToastSuccess(isGif ? "Gambar gerak (GIF) berhasil diunggah!" : "Gambar ilustrasi berhasil diunggah!");
    };
    reader.readAsDataURL(file);
  };

  // Apply Preset Media to Question
  const handleApplyMediaPreset = (preset: typeof MEDIA_PRESETS[0], qIndex: number) => {
    if (!editingKuis) return;
    const updated = [...editingKuis.daftarSoal];
    if (updated[qIndex]) {
      updated[qIndex].mediaType = preset.type;
      updated[qIndex].mediaUrl = preset.url;
      updated[qIndex].mediaCaption = preset.caption;
    }
    setEditingKuis({ ...editingKuis, daftarSoal: updated });
    setPresetPickerTargetIndex(null);
    showToastSuccess(`Media preset "${preset.nama}" berhasil diterapkan!`);
  };

  // Item analysis metrics
  const itemAnalysis = useMemo(() => {
    if (!activeKuis) return [];
    return activeKuis.daftarSoal.map((q, idx) => {
      let correctCount = 0;
      let totalAnswered = 0;
      classStudents.forEach((st) => {
        const ans = studentAnswers[st.id]?.[idx];
        if (ans) {
          totalAnswered++;
          if (ans.toUpperCase() === q.kunci.toUpperCase()) {
            correctCount++;
          }
        }
      });
      const percent = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
      let difficulty = "Sedang";
      if (percent >= 75) difficulty = "Mudah";
      else if (percent < 45) difficulty = "Sukar";

      return {
        nomor: idx + 1,
        pertanyaan: q.pertanyaan,
        kunci: q.kunci,
        correctCount,
        totalAnswered,
        percent,
        difficulty
      };
    });
  }, [activeKuis, classStudents, studentAnswers]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 px-3 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm tracking-wide flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              INTERACTIVE CLASSROOM SUITE
            </span>
            <span className="bg-emerald-500/80 px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-sm">
              Live Game-Show
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-yellow-300" />
            Mode Asesmen Cepat & Kuis Interaktif di Kelas
          </h1>
          <p className="text-indigo-100 text-sm mt-1 max-w-2xl">
            Tampilkan kuis seru bergaya game-show di proyektor kelas, input respon siswa dengan 1-klik, dan sinkronkan otomatis nilai langsung ke Buku Nilai Kurikulum Merdeka!
          </p>
        </div>

        {/* Global Controls & Sound */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsSoundOn(!isSoundOn);
              sfx.enabled = !isSoundOn;
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              isSoundOn ? "bg-white/20 hover:bg-white/30 text-white" : "bg-red-500/80 text-white"
            }`}
          >
            {isSoundOn ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4" />}
            {isSoundOn ? "Suara Aktif" : "Suara Hening"}
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
          >
            <QrCode className="w-4 h-4" />
            PIN & QR Kuis: {activeKuis?.pinCode || "8821"}
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Pilih Paket Kuis */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              Paket Kuis:
            </label>
            <select
              value={selectedKuisId}
              onChange={(e) => {
                setSelectedKuisId(e.target.value);
                setCurrentQuestionIndex(0);
              }}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 max-w-xs"
            >
              {kuisList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.judul} ({k.daftarSoal.length} Soal - {k.mapel})
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Kelas */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              Kelas:
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {allowedClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} ({siswaList.filter((s) => s.kelas === cls).length} Siswa)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAiQuizModal}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>✨ Buat Paket Kuis AI</span>
          </button>
          <button
            onClick={handleOpenNewQuiz}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Manual</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("host")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "host"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          🎮 Mode Layar Proyektor (Live Host)
        </button>

        <button
          onClick={() => setActiveTab("grader")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "grader"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ⚡ Input Nilai / Grader Cepat ({studentResults.length} Siswa)
        </button>

        <button
          onClick={() => setActiveTab("manage")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "manage"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <FileText className="w-4 h-4 text-blue-500" />
          📋 Bank Kuis & Soal ({kuisList.length})
        </button>

        <button
          onClick={() => setActiveTab("analisis")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "analisis"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-pink-500" />
          📊 Analisis Butir Soal & Remedial
        </button>
      </div>

      {/* TAB 1: LIVE CLASSROOM HOST (GAME-SHOW PROJECTOR SCREEN) */}
      {activeTab === "host" && (
        <div ref={hostContainerRef} className="space-y-6">
          {activeKuis && currentQuestion ? (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl border-4 border-indigo-500/30 relative overflow-hidden">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Host Top Navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-800/60 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-600 text-white font-extrabold px-4 py-1.5 rounded-xl text-sm md:text-base shadow-lg tracking-wider">
                    SOAL #{currentQuestionIndex + 1} DARI {activeKuis.daftarSoal.length}
                  </span>
                  <div className="hidden sm:block">
                    <h3 className="text-sm font-semibold text-indigo-200">{activeKuis.judul}</h3>
                    <p className="text-xs text-indigo-400">{activeKuis.mapel} • {selectedKelas}</p>
                  </div>
                </div>

                {/* Big Countdown Timer */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-5 py-2 rounded-2xl font-mono text-xl md:text-2xl font-black shadow-inner transition-colors ${
                    timerSeconds <= 5 
                      ? "bg-red-600 text-white animate-pulse" 
                      : timerSeconds <= 10 
                      ? "bg-amber-500 text-white" 
                      : "bg-indigo-800/80 text-yellow-300"
                  }`}>
                    <Clock className="w-5 h-5" />
                    <span>{timerSeconds}s</span>
                  </div>

                  {/* Timer Controls */}
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className={`p-2.5 rounded-xl text-white font-bold transition shadow-md ${
                      isTimerRunning ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                    title={isTimerRunning ? "Jeda Timer" : "Mulai Timer"}
                  >
                    {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => {
                      setTimerSeconds(currentQuestion.waktuDetik || 30);
                      setIsTimerRunning(false);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold transition"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 transition"
                    title="Layar Penuh"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-indigo-950 h-2 rounded-full my-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 via-pink-500 to-indigo-400 h-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / activeKuis.daftarSoal.length) * 100}%` }}
                />
              </div>

              {/* Question Text Box */}
              <div className="my-6 bg-slate-800/90 border border-indigo-500/40 rounded-2xl p-6 md:p-8 shadow-xl text-center relative z-10">
                <p className="text-lg md:text-2xl font-bold text-white leading-relaxed tracking-wide">
                  {currentQuestion.pertanyaan}
                </p>
              </div>

              {/* Media Display Box (Gambar Statis, GIF Gerak, atau Video Player) */}
              {currentQuestion.mediaUrl && currentQuestion.mediaType && currentQuestion.mediaType !== "none" && (
                <div className="my-5 bg-slate-950/70 border-2 border-indigo-500/40 rounded-3xl p-4 md:p-6 shadow-2xl relative z-10 overflow-hidden flex flex-col items-center">
                  {/* Media Type Badge & Controls */}
                  <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-indigo-900/50">
                    <div className="flex items-center gap-2">
                      {currentQuestion.mediaType === "image" && (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <Image className="w-3.5 h-3.5 text-blue-400" />
                          🖼️ Gambar Ilustrasi
                        </span>
                      )}
                      {currentQuestion.mediaType === "gif" && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs animate-pulse">
                          <Film className="w-3.5 h-3.5 text-pink-400" />
                          🎞️ Gambar Gerak (Animasi GIF)
                        </span>
                      )}
                      {currentQuestion.mediaType === "video" && (
                        <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <Video className="w-3.5 h-3.5 text-red-400" />
                          🎥 Video Pembelajaran
                        </span>
                      )}
                    </div>

                    {(currentQuestion.mediaType === "image" || currentQuestion.mediaType === "gif") && (
                      <button
                        type="button"
                        onClick={() => setZoomedMedia({
                          url: currentQuestion.mediaUrl!,
                          type: currentQuestion.mediaType!,
                          caption: currentQuestion.mediaCaption
                        })}
                        className="bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                        title="Perbesar Media"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        Perbesar
                      </button>
                    )}
                  </div>

                  {/* Actual Media Content */}
                  {currentQuestion.mediaType === "image" && (
                    <div 
                      onClick={() => setZoomedMedia({
                        url: currentQuestion.mediaUrl!,
                        type: "image",
                        caption: currentQuestion.mediaCaption
                      })}
                      className="cursor-pointer group relative max-h-80 overflow-hidden rounded-2xl border border-indigo-800/40 bg-slate-900 flex items-center justify-center shadow-lg"
                    >
                      <img
                        src={currentQuestion.mediaUrl}
                        alt={currentQuestion.mediaCaption || "Ilustrasi soal"}
                        className="max-h-72 max-w-full object-contain rounded-2xl group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <ZoomIn className="w-3.5 h-3.5 text-yellow-300" /> Klik untuk Perbesar
                        </span>
                      </div>
                    </div>
                  )}

                  {currentQuestion.mediaType === "gif" && (
                    <div 
                      onClick={() => setZoomedMedia({
                        url: currentQuestion.mediaUrl!,
                        type: "gif",
                        caption: currentQuestion.mediaCaption
                      })}
                      className="cursor-pointer group relative max-h-80 overflow-hidden rounded-2xl border-2 border-purple-500/40 bg-slate-900 flex items-center justify-center shadow-lg"
                    >
                      <img
                        src={currentQuestion.mediaUrl}
                        alt={currentQuestion.mediaCaption || "Animasi gerak"}
                        className="max-h-72 max-w-full object-contain rounded-2xl"
                        loading="lazy"
                      />
                      <div className="absolute bottom-2 right-2 bg-purple-900/80 text-purple-200 text-[10px] px-2 py-0.5 rounded font-bold backdrop-blur-xs">
                        GIF Loop
                      </div>
                    </div>
                  )}

                  {currentQuestion.mediaType === "video" && (
                    <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border-2 border-indigo-700/60 shadow-2xl bg-black">
                      {currentQuestion.mediaUrl.includes("youtube") || currentQuestion.mediaUrl.includes("youtu.be") ? (
                        <iframe
                          src={formatVideoEmbedUrl(currentQuestion.mediaUrl)}
                          title={currentQuestion.mediaCaption || "Video Kuis"}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={currentQuestion.mediaUrl}
                          controls
                          className="w-full h-full object-contain"
                        >
                          Browser Anda tidak mendukung tag video.
                        </video>
                      )}
                    </div>
                  )}

                  {/* Caption */}
                  {currentQuestion.mediaCaption && (
                    <p className="mt-3 text-xs md:text-sm text-indigo-200/90 italic text-center font-medium">
                      📌 {currentQuestion.mediaCaption}
                    </p>
                  )}
                </div>
              )}

              {/* Answer Choices Grid (Game Show Look) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 my-6">
                {[
                  { key: "A", text: currentQuestion.opsiA, color: "from-red-600 to-rose-700", border: "border-red-500", badge: "bg-red-500" },
                  { key: "B", text: currentQuestion.opsiB, color: "from-blue-600 to-indigo-700", border: "border-blue-500", badge: "bg-blue-500" },
                  { key: "C", text: currentQuestion.opsiC, color: "from-amber-500 to-yellow-600", border: "border-yellow-400", badge: "bg-yellow-500 text-gray-900" },
                  { key: "D", text: currentQuestion.opsiD, color: "from-emerald-600 to-teal-700", border: "border-emerald-500", badge: "bg-emerald-500" }
                ].map((opt) => {
                  const isCorrect = isAnswerRevealed && opt.key === currentQuestion.kunci;
                  const countAnswered = currentAnswerDistribution[opt.key as keyof typeof currentAnswerDistribution] || 0;
                  const pct = currentAnswerDistribution.total > 0 
                    ? Math.round((countAnswered / currentAnswerDistribution.total) * 100) 
                    : 0;

                  return (
                    <div
                      key={opt.key}
                      className={`relative p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between ${
                        isAnswerRevealed 
                          ? isCorrect 
                            ? "bg-gradient-to-r from-emerald-600 to-green-700 border-emerald-300 ring-4 ring-emerald-400/50 scale-[1.02] shadow-2xl" 
                            : "bg-slate-800/40 border-slate-700 opacity-40 grayscale"
                          : `bg-gradient-to-r ${opt.color} ${opt.border} hover:brightness-110 shadow-lg`
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-md ${opt.badge}`}>
                          {opt.key}
                        </span>
                        <span className="text-base md:text-lg font-bold text-white">
                          {opt.text}
                        </span>
                      </div>

                      {/* Revealed answer badge & vote count */}
                      <div className="flex items-center gap-2">
                        {isAnswerRevealed && (
                          <div className="bg-black/30 px-3 py-1 rounded-xl text-xs font-mono font-bold text-white">
                            {countAnswered} Siswa ({pct}%)
                          </div>
                        )}
                        {isCorrect && (
                          <CheckCircle2 className="w-7 h-7 text-yellow-300 animate-bounce" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Box (Appears on Reveal) */}
              {isAnswerRevealed && currentQuestion.pembahasan && (
                <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-5 my-4 text-emerald-100 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Pembahasan & Kunci Jawaban Resmi: (Opsi {currentQuestion.kunci})
                  </div>
                  <p className="text-sm md:text-base leading-relaxed text-emerald-50">
                    {currentQuestion.pembahasan}
                  </p>
                </div>
              )}

              {/* Host Navigation Buttons Bottom */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-indigo-800/60 relative z-10">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-sm flex items-center gap-2 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Soal Sebelumnya
                </button>

                <div className="flex items-center gap-3">
                  {!isAnswerRevealed ? (
                    <button
                      onClick={handleRevealAnswer}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black text-sm md:text-base flex items-center gap-2 shadow-xl transition-transform hover:scale-105"
                    >
                      <Sparkles className="w-5 h-5" />
                      Buka Kunci Jawaban (Reveal)
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm md:text-base flex items-center gap-2 shadow-xl transition-transform hover:scale-105"
                    >
                      <span>{currentQuestionIndex === activeKuis.daftarSoal.length - 1 ? "Selesaikan Kuis 🎉" : "Soal Berikutnya"}</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-indigo-300 font-medium">
                  Respon Masuk: <span className="font-bold text-yellow-300">{currentAnswerDistribution.total}</span> / {classStudents.length} Siswa
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <Gamepad2 className="w-12 h-12 text-indigo-500 mx-auto mb-3 opacity-50" />
              <p className="text-gray-600 dark:text-gray-300 font-semibold">Belum ada paket kuis yang dipilih.</p>
              <button
                onClick={handleOpenNewQuiz}
                className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Buat Kuis Sekarang
              </button>
            </div>
          )}

          {/* Live Leaderboard Podium (Top 3 & Class Ranking) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  Papan Peringkat Kelas (Live Leaderboard)
                </h3>
              </div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {classStudents.length} Siswa di {selectedKelas}
              </span>
            </div>

            {/* Podium Top 3 */}
            {studentResults.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto my-6 text-center">
                {/* 2nd Place */}
                <div className="flex flex-col items-center justify-end">
                  <div className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-[100px]">
                    {studentResults[1]?.namaSiswa}
                  </div>
                  <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-1">
                    {studentResults[1]?.skorAkhir} Poin
                  </div>
                  <div className="w-full bg-slate-300 dark:bg-slate-700 h-20 rounded-t-2xl flex items-center justify-center font-black text-2xl text-slate-700 dark:text-slate-200 shadow-md">
                    🥈 2
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center justify-end">
                  <div className="text-xs font-extrabold text-yellow-600 dark:text-yellow-400 truncate max-w-[120px]">
                    👑 {studentResults[0]?.namaSiswa}
                  </div>
                  <div className="text-xs font-black text-yellow-600 dark:text-yellow-300 mb-1">
                    {studentResults[0]?.skorAkhir} Poin
                  </div>
                  <div className="w-full bg-gradient-to-t from-yellow-500 to-amber-400 h-28 rounded-t-2xl flex items-center justify-center font-black text-3xl text-yellow-950 shadow-xl border-t-2 border-yellow-200">
                    🥇 1
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center justify-end">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-500 truncate max-w-[100px]">
                    {studentResults[2]?.namaSiswa}
                  </div>
                  <div className="text-xs font-extrabold text-amber-700 dark:text-amber-400 mb-1">
                    {studentResults[2]?.skorAkhir} Poin
                  </div>
                  <div className="w-full bg-amber-200 dark:bg-amber-900/60 h-16 rounded-t-2xl flex items-center justify-center font-black text-2xl text-amber-800 dark:text-amber-300 shadow-md">
                    🥉 3
                  </div>
                </div>
              </div>
            )}

            {/* Top Table List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold uppercase">
                  <tr>
                    <th className="p-3 w-12 text-center">Rank</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center">Benar</th>
                    <th className="p-3 text-center">Salah</th>
                    <th className="p-3 text-center">Skor Akhir</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-medium">
                  {studentResults.map((st, idx) => (
                    <tr key={st.idSiswa} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="p-3 text-center font-extrabold">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">
                        {st.namaSiswa}
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">{st.totalBenar}</td>
                      <td className="p-3 text-center text-red-500 font-bold">{st.totalSalah}</td>
                      <td className="p-3 text-center">
                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg font-black text-xs">
                          {st.skorAkhir}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {st.skorAkhir >= 75 ? (
                          <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            Tuntas (KKTP)
                          </span>
                        ) : (
                          <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            Perlu Remedial
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUICK GRADER & SYNC TO DATA NILAI */}
      {activeTab === "grader" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Lembar Jawaban & Input Nilai Cepat Kelas
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Ketuk opsi (A/B/C/D) per siswa untuk menginput respon cepat. Skor terhitung instan dan siap disimpan ke Buku Nilai resmi.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAutoFillAnswers("realistic")}
                  className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  🎲 Simulasi Respon Siswa
                </button>
                <button
                  onClick={() => handleAutoFillAnswers("perfect")}
                  className="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  ✓ Set Benar Semua
                </button>
                <button
                  onClick={() => handleAutoFillAnswers("reset")}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Quick Answer Sheet Table */}
            <div className="overflow-x-auto my-4">
              <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold uppercase">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3 min-w-[160px]">Nama Siswa</th>
                    {activeKuis?.daftarSoal.map((q, qIdx) => (
                      <th key={q.id} className="p-3 text-center min-w-[130px]">
                        Soal {qIdx + 1} <span className="text-indigo-500 font-black">({q.kunci})</span>
                      </th>
                    ))}
                    <th className="p-3 text-center w-20">Benar</th>
                    <th className="p-3 text-center w-24">Skor (0-100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-medium">
                  {classStudents.map((st, sIdx) => {
                    const ansMap = studentAnswers[st.id] || {};
                    const res = studentResults.find((r) => r.idSiswa === st.id);

                    return (
                      <tr key={st.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="p-3 text-center font-bold text-gray-500">{sIdx + 1}</td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">
                          {st.nama}
                          <div className="text-[10px] text-gray-400 font-normal">NISN: {st.nisn || "-"}</div>
                        </td>

                        {activeKuis?.daftarSoal.map((q, qIdx) => {
                          const chosen = ansMap[qIdx];
                          return (
                            <td key={q.id} className="p-2 text-center">
                              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-800">
                                {["A", "B", "C", "D"].map((opt) => {
                                  const isSelected = chosen === opt;
                                  const isCorrectKey = opt === q.kunci;
                                  return (
                                    <button
                                      key={opt}
                                      onClick={() => handleSetStudentAnswer(st.id, qIdx, opt)}
                                      className={`w-6 h-6 rounded text-[11px] font-bold transition-all ${
                                        isSelected
                                          ? isCorrectKey
                                            ? "bg-emerald-600 text-white shadow"
                                            : "bg-red-500 text-white shadow"
                                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}

                        <td className="p-3 text-center font-bold text-emerald-600">
                          {res?.totalBenar || 0} / {activeKuis?.daftarSoal.length || 0}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                            (res?.skorAkhir || 0) >= 75
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                          }`}>
                            {res?.skorAkhir || 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Sync and Export Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  Ekspor ke Excel (.xlsx)
                </button>

                <button
                  onClick={handleExportPdf}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <FileText className="w-4 h-4" />
                  Cetak PDF Rekap Kuis
                </button>
              </div>

              <button
                onClick={handleSaveToDataNilai}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
              >
                <Save className="w-4 h-4" />
                💾 Simpan ke Buku Nilai Siswa (Data Nilai Resmi)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUIZ MANAGEMENT & BANK SOAL */}
      {activeTab === "manage" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Daftar Paket Kuis Interaktif
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Buat kuis kustom untuk setiap mata pelajaran atau gunakan template kuis Kurikulum Merdeka.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAiQuizModal}
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Buat Paket Kuis dengan AI
                </button>
                <button
                  onClick={handleOpenNewQuiz}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Manual
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              {kuisList.map((quiz) => {
                const mediaQuestions = quiz.daftarSoal.filter(q => q.mediaUrl && q.mediaType && q.mediaType !== "none");
                return (
                <div
                  key={quiz.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    quiz.id === selectedKuisId
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-400/50 shadow-md"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                        {quiz.mapel}
                      </span>
                      <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                        {quiz.kelas}
                      </span>
                      {quiz.aiGenerated && (
                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-500" />
                          AI
                        </span>
                      )}
                      {mediaQuestions.length > 0 && (
                        <span className="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Film className="w-3 h-3 text-sky-500" />
                          {mediaQuestions.length} Media
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-md font-bold">
                      PIN: {quiz.pinCode}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white mb-1">
                    {quiz.judul}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                    {quiz.deskripsi || "Tidak ada deskripsi"}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {quiz.daftarSoal.length} Butir Soal
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedKuisId(quiz.id);
                          setActiveTab("host");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Mulai Host
                      </button>
                      <button
                        onClick={() => {
                          setEditingKuis(quiz);
                          setShowEditorModal(true);
                        }}
                        className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit Kuis"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ITEM ANALYSIS & REMEDIAL */}
      {activeTab === "analisis" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                  Analisis Tingkat Kesukaran & Daya Serap Siswa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Analisis otomatis butir soal yang paling banyak dijawab salah oleh siswa di kelas {selectedKelas}.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold uppercase">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Pertanyaan Soal</th>
                    <th className="p-3 text-center w-20">Kunci</th>
                    <th className="p-3 text-center w-32">Daya Serap (% Benar)</th>
                    <th className="p-3 text-center w-28">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-medium">
                  {itemAnalysis.map((item) => (
                    <tr key={item.nomor} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="p-3 text-center font-bold">{item.nomor}</td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white max-w-md">
                        {item.pertanyaan}
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {item.kunci}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                item.percent >= 75 ? "bg-emerald-500" : item.percent >= 50 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="font-bold">{item.percent}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.difficulty === "Mudah"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : item.difficulty === "Sedang"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}>
                          {item.difficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QR Code / PIN Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl border border-gray-200 dark:border-gray-700 animate-scaleUp">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
              Bergabung ke Kuis Kelas
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Scan QR Code atau gunakan PIN berikut di gawai siswa / proyektor
            </p>

            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Kuis" className="mx-auto w-48 h-48 rounded-2xl shadow-md p-2 bg-white" />
            ) : (
              <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 mx-auto rounded-2xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            )}

            <div className="mt-4 bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold block">PIN ROOM KUIS:</span>
              <span className="font-mono text-3xl font-black text-indigo-900 dark:text-indigo-200 tracking-widest">
                {activeKuis?.pinCode || "8821"}
              </span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="mt-5 w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-2.5 rounded-xl font-bold text-xs hover:opacity-90 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Editor Modal for Quiz */}
      {showEditorModal && editingKuis && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                {editingKuis.id.startsWith("kuis-") ? "Edit Paket Kuis" : "Buat Paket Kuis Baru"}
              </h3>
              <button
                onClick={() => setShowEditorModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Quiz Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Judul Kuis</label>
                <input
                  type="text"
                  value={editingKuis.judul}
                  onChange={(e) => setEditingKuis({ ...editingKuis, judul: e.target.value })}
                  placeholder="Contoh: Kuis IPAS Bab 3 Ekosistem"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Mata Pelajaran</label>
                <input
                  type="text"
                  value={editingKuis.mapel}
                  onChange={(e) => setEditingKuis({ ...editingKuis, mapel: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Kelas Sasaran</label>
                <input
                  type="text"
                  value={editingKuis.kelas}
                  onChange={(e) => setEditingKuis({ ...editingKuis, kelas: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">PIN Code</label>
                <input
                  type="text"
                  value={editingKuis.pinCode}
                  onChange={(e) => setEditingKuis({ ...editingKuis, pinCode: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium font-mono"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Daftar Soal ({editingKuis.daftarSoal.length})
                </h4>
                <button
                  onClick={() => {
                    const newIdx = editingKuis.daftarSoal.length + 1;
                    const newQuestion: KuisSoalItem = {
                      id: `soal-${Date.now()}-${newIdx}`,
                      nomor: newIdx,
                      pertanyaan: "",
                      opsiA: "",
                      opsiB: "",
                      opsiC: "",
                      opsiD: "",
                      kunci: "A",
                      pembahasan: "",
                      waktuDetik: 30,
                      poin: 20
                    };
                    setEditingKuis({
                      ...editingKuis,
                      daftarSoal: [...editingKuis.daftarSoal, newQuestion]
                    });
                  }}
                  className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Soal
                </button>
              </div>

              {editingKuis.daftarSoal.map((q, idx) => (
                <div key={q.id || idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                        Soal Nomor #{idx + 1}
                      </span>

                      {/* Single Question AI Generator */}
                      <button
                        type="button"
                        onClick={() => handleGenerateSingleQuestionAi(idx)}
                        disabled={isGeneratingSingleQIndex === idx}
                        className="bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs transition"
                        title="Generate isi soal, pilihan jawaban, kunci & stimulus media dengan AI"
                      >
                        {isGeneratingSingleQIndex === idx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                        )}
                        <span>{isGeneratingSingleQIndex === idx ? "Menyusun..." : "✨ AI Bantu Soal Ini"}</span>
                      </button>
                    </div>

                    {editingKuis.daftarSoal.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingKuis.daftarSoal.filter((_, i) => i !== idx);
                          setEditingKuis({ ...editingKuis, daftarSoal: updated });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        Hapus Soal
                      </button>
                    )}
                  </div>

                  <textarea
                    value={q.pertanyaan}
                    onChange={(e) => {
                      const updated = [...editingKuis.daftarSoal];
                      updated[idx].pertanyaan = e.target.value;
                      setEditingKuis({ ...editingKuis, daftarSoal: updated });
                    }}
                    placeholder="Tuliskan teks pertanyaan soal..."
                    rows={2}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white"
                  />

                  {/* Media Configuration for Question (Gambar Statis, GIF Gerak, Video) */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-indigo-500" />
                        Media Soal (Gambar, GIF Gerak, atau Video):
                      </label>

                      {/* Type Pills */}
                      <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900 text-xs">
                        {[
                          { id: "none", label: "🚫 Tanpa Media" },
                          { id: "image", label: "🖼️ Gambar" },
                          { id: "gif", label: "🎞️ GIF Gerak" },
                          { id: "video", label: "🎥 Video" },
                        ].map((mt) => (
                          <button
                            key={mt.id}
                            type="button"
                            onClick={() => {
                              const updated = [...editingKuis.daftarSoal];
                              updated[idx].mediaType = mt.id as KuisMediaType;
                              if (mt.id === "none") {
                                updated[idx].mediaUrl = "";
                                updated[idx].mediaCaption = "";
                              }
                              setEditingKuis({ ...editingKuis, daftarSoal: updated });
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                              (q.mediaType || "none") === mt.id
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            {mt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {q.mediaType && q.mediaType !== "none" && (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={q.mediaUrl || ""}
                            onChange={(e) => {
                              const updated = [...editingKuis.daftarSoal];
                              updated[idx].mediaUrl = e.target.value;
                              setEditingKuis({ ...editingKuis, daftarSoal: updated });
                            }}
                            placeholder={
                              q.mediaType === "video"
                                ? "Link Video YouTube (misal: https://www.youtube.com/watch?v=... atau direct mp4)"
                                : q.mediaType === "gif"
                                ? "URL Gambar Gerak GIF atau klik Upload File di samping..."
                                : "URL Gambar (JPG, PNG, WebP) atau klik Upload File..."
                            }
                            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white"
                          />

                          <div className="flex items-center gap-1.5 shrink-0">
                            {q.mediaType !== "video" && (
                              <button
                                type="button"
                                onClick={() => handleTriggerFileUpload(idx)}
                                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-300 dark:border-slate-600"
                                title="Upload file dari komputer / HP"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Upload File
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setPresetPickerTargetIndex(idx)}
                              className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                              title="Pilih dari koleksi edukasi siap pakai"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Preset Edukasi
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={q.mediaCaption || ""}
                          onChange={(e) => {
                            const updated = [...editingKuis.daftarSoal];
                            updated[idx].mediaCaption = e.target.value;
                            setEditingKuis({ ...editingKuis, daftarSoal: updated });
                          }}
                          placeholder="Keterangan / Kapsi Media (misal: Ilustrasi siklus rantai makanan persawahan)"
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white"
                        />

                        {/* Live Mini Preview in Editor */}
                        {q.mediaUrl && (
                          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700 flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 font-semibold mb-1">Pratinjau Media Soal:</span>
                            {(q.mediaType === "image" || q.mediaType === "gif") && (
                              <img
                                src={q.mediaUrl}
                                alt="Pratinjau"
                                className="max-h-36 max-w-full object-contain rounded-lg shadow-xs"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            {q.mediaType === "video" && (
                              <div className="w-full max-w-md aspect-video rounded-lg overflow-hidden bg-black">
                                {q.mediaUrl.includes("youtube") || q.mediaUrl.includes("youtu.be") ? (
                                  <iframe
                                    src={formatVideoEmbedUrl(q.mediaUrl)}
                                    title="Pratinjau Video"
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                  />
                                ) : (
                                  <video src={q.mediaUrl} controls className="w-full h-full object-contain" />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {["A", "B", "C", "D"].map((opt) => (
                      <div key={opt} className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold text-xs">
                          {opt}
                        </span>
                        <input
                          type="text"
                          value={q[`opsi${opt}` as keyof KuisSoalItem] as string}
                          onChange={(e) => {
                            const updated = [...editingKuis.daftarSoal];
                            (updated[idx] as unknown as Record<string, string>)[`opsi${opt}`] = e.target.value;
                            setEditingKuis({ ...editingKuis, daftarSoal: updated });
                          }}
                          placeholder={`Pilihan ${opt}`}
                          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Kunci Jawaban</label>
                      <select
                        value={q.kunci}
                        onChange={(e) => {
                          const updated = [...editingKuis.daftarSoal];
                          updated[idx].kunci = e.target.value as "A" | "B" | "C" | "D";
                          setEditingKuis({ ...editingKuis, daftarSoal: updated });
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs font-bold text-indigo-600"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Waktu (Detik)</label>
                      <input
                        type="number"
                        value={q.waktuDetik || 30}
                        onChange={(e) => {
                          const updated = [...editingKuis.daftarSoal];
                          updated[idx].waktuDetik = Number(e.target.value);
                          setEditingKuis({ ...editingKuis, daftarSoal: updated });
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Poin Soal</label>
                      <input
                        type="number"
                        value={q.poin || 20}
                        onChange={(e) => {
                          const updated = [...editingKuis.daftarSoal];
                          updated[idx].poin = Number(e.target.value);
                          setEditingKuis({ ...editingKuis, daftarSoal: updated });
                        }}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 block">Pembahasan</label>
                    <input
                      type="text"
                      value={q.pembahasan || ""}
                      onChange={(e) => {
                        const updated = [...editingKuis.daftarSoal];
                        updated[idx].pembahasan = e.target.value;
                        setEditingKuis({ ...editingKuis, daftarSoal: updated });
                      }}
                      placeholder="Penjelasan pembahasan materi soal..."
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-1.5 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleSaveQuiz}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" />
                Simpan Paket Kuis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image/GIF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* MODAL 1: AI QUIZ GENERATOR MODAL */}
      {isAiQuizModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 p-6 text-white rounded-t-3xl relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black tracking-tight">
                      Generator Paket Kuis AI Interaktif
                    </h3>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Cukup ketik materi & jumlah soal. AI menyusun paket kuis lengkap dengan gambar, animasi GIF & video!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAiQuizModalOpen(false);
                    setAiGeneratedPreview(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 flex-1">
              {!aiGeneratedPreview ? (
                <>
                  {/* Topic / Materi Input */}
                  <div>
                    <label className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-500" />
                      Materi / Topik Pembelajaran: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={aiMateri}
                      onChange={(e) => setAiMateri(e.target.value)}
                      placeholder="Contoh: Siklus Air & Hujan, Ekosistem Sawah, Pecahan Senilai, Tata Surya & Planet..."
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 shadow-xs"
                      disabled={isGeneratingAi}
                    />

                    {/* Quick Topics Suggestion Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400 font-semibold">Contoh Cepat:</span>
                      {[
                        "Siklus Air & Hujan",
                        "Ekosistem & Rantai Makanan",
                        "Operasi Pecahan Senilai",
                        "Tata Surya & Rotasi Bumi",
                        "Gaya Gesek & Gravitasi",
                        "Pancasila Nilai Kebhinekaan"
                      ].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setAiMateri(sug)}
                          className="bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[10px] px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 transition"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject and Target Class */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Mata Pelajaran</label>
                      <select
                        value={aiMapel}
                        onChange={(e) => setAiMapel(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                        disabled={isGeneratingAi}
                      >
                        <option value="IPAS">IPAS (Ilmu Pengetahuan Alam & Sosial)</option>
                        <option value="Matematika">Matematika</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Pendidikan Pancasila">Pendidikan Pancasila</option>
                        <option value="Seni Budaya & Prakarya">Seni Budaya & Prakarya (SBdP)</option>
                        <option value="PJOK">PJOK</option>
                        <option value="Pendidikan Agama">Pendidikan Agama</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="Tematik">Tematik Umum</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Kelas Sasaran</label>
                      <select
                        value={aiKelas}
                        onChange={(e) => setAiKelas(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                        disabled={isGeneratingAi}
                      >
                        <option value="Kelas 1">Kelas 1 (Fase A)</option>
                        <option value="Kelas 2">Kelas 2 (Fase A)</option>
                        <option value="Kelas 3">Kelas 3 (Fase B)</option>
                        <option value="Kelas 4">Kelas 4 (Fase B)</option>
                        <option value="Kelas 5">Kelas 5 (Fase C)</option>
                        <option value="Kelas 6">Kelas 6 (Fase C)</option>
                      </select>
                    </div>
                  </div>

                  {/* Question Count and Difficulty */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                        Jumlah Soal Kuis: <span className="text-purple-600 font-extrabold">{aiJumlahSoal} Butir</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[3, 5, 10, 15].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setAiJumlahSoal(cnt)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition ${
                              aiJumlahSoal === cnt
                                ? "bg-purple-600 text-white shadow-xs"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                          >
                            {cnt} Soal
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">Tingkat Kesulitan</label>
                      <select
                        value={aiTingkatKesulitan}
                        onChange={(e) => setAiTingkatKesulitan(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white font-medium"
                        disabled={isGeneratingAi}
                      >
                        <option value="campuran">Campuran Berimbang (Mudah, Sedang, HOTS)</option>
                        <option value="mudah">Dasar / Pemahaman Konsep (Mudah)</option>
                        <option value="sedang">Standar / Penerapan (Sedang)</option>
                        <option value="hots">Penalaran Kritis / HOTS (Tinggi)</option>
                      </select>
                    </div>
                  </div>

                  {/* Media Support Toggle */}
                  <div className="bg-purple-50/70 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="toggleMedia"
                      checked={aiSertakanMedia}
                      onChange={(e) => setAiSertakanMedia(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="toggleMedia" className="cursor-pointer">
                      <span className="text-xs font-extrabold text-purple-900 dark:text-purple-200 block">
                        🎬 Dukungan Media Visual Lengkap (Gambar, GIF Gerak & Video)
                      </span>
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed block mt-0.5">
                        AI akan menyertakan rekomendasi stimulus gambar diagram, animasi gerak (GIF loop), atau video edukatif YouTube yang sesuai dengan materi untuk setiap soal.
                      </span>
                    </label>
                  </div>

                  {/* Loading Box */}
                  {isGeneratingAi && (
                    <div className="p-5 bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 dark:from-purple-950/40 dark:to-indigo-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-center space-y-2 animate-fadeIn">
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                      <p className="text-xs font-extrabold text-purple-900 dark:text-purple-200">
                        {aiProgressText || "Sedang merumuskan paket kuis edukatif dengan Google Gemini AI..."}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Harap tunggu beberapa detik sementara soal, kunci, pembahasan & media disusun.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* AI Generated Preview Review */
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                          Paket Kuis Berhasil Digenerate oleh AI!
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                        {aiGeneratedPreview.judul}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        {aiGeneratedPreview.deskripsi} • {aiGeneratedPreview.daftarSoal.length} Soal • PIN: {aiGeneratedPreview.pinCode}
                      </p>
                    </div>
                  </div>

                  <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Pratinjau Butir Soal & Media:
                  </h5>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {aiGeneratedPreview.daftarSoal.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            #{qIdx + 1} • Waktu: {q.waktuDetik}s • Kunci: {q.kunci}
                          </span>
                          {q.mediaType && q.mediaType !== "none" && (
                            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {q.mediaType === "image" ? "🖼️ Gambar" : q.mediaType === "gif" ? "🎞️ GIF Gerak" : "🎥 Video"}
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-gray-900 dark:text-white leading-relaxed">
                          {q.pertanyaan}
                        </p>

                        {/* Media Preview in Review */}
                        {q.mediaUrl && q.mediaType && q.mediaType !== "none" && (
                          <div className="p-2 bg-slate-900/50 rounded-lg flex items-center gap-3">
                            {(q.mediaType === "image" || q.mediaType === "gif") && (
                              <img src={q.mediaUrl} alt="Thumbnail" className="w-14 h-14 object-cover rounded" />
                            )}
                            {q.mediaType === "video" && (
                              <div className="w-14 h-14 bg-black rounded flex items-center justify-center text-white text-[10px]">
                                ▶ Video
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-300 font-semibold truncate">
                                {q.mediaCaption || q.mediaUrl}
                              </p>
                              <span className="text-[9px] text-indigo-300 font-mono truncate block">
                                {q.mediaUrl}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          {["A", "B", "C", "D"].map((opt) => (
                            <div
                              key={opt}
                              className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
                                opt === q.kunci
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 font-bold text-emerald-800 dark:text-emerald-200"
                                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <span className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                                {opt}
                              </span>
                              <span className="truncate">{q[`opsi${opt}` as keyof KuisSoalItem] as string}</span>
                            </div>
                          ))}
                        </div>

                        {q.pembahasan && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pt-1 border-t border-gray-200 dark:border-gray-600">
                            💡 Pembahasan: {q.pembahasan}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-3xl flex items-center justify-between">
              {!aiGeneratedPreview ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAiQuizModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                    disabled={isGeneratingAi}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAiQuiz}
                    disabled={isGeneratingAi || !aiMateri.trim()}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sedang Merumuskan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>🚀 Generate Paket Kuis Sekarang</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAiGeneratedPreview(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ubah Parameter / Generate Ulang</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKuis(aiGeneratedPreview);
                        setIsAiQuizModalOpen(false);
                        setAiGeneratedPreview(null);
                        setShowEditorModal(true);
                      }}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit di Form Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAiGeneratedQuiz}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
                    >
                      <Save className="w-4 h-4" />
                      <span>💾 Simpan & Mulai Mainkan!</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDUCATIONAL MEDIA PRESET PICKER */}
      {presetPickerTargetIndex !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                Pilih Media Edukasi Siap Pakai
              </h3>
              <button
                type="button"
                onClick={() => setPresetPickerTargetIndex(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Klik salah satu media ilustrasi, animasi GIF, atau video pembelajaran di bawah untuk langsung menerapkannya pada Soal #{presetPickerTargetIndex + 1}:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {MEDIA_PRESETS.map((preset, pIdx) => (
                <div
                  key={pIdx}
                  onClick={() => handleApplyMediaPreset(preset, presetPickerTargetIndex)}
                  className="cursor-pointer group p-3 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        {preset.kategori}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        preset.type === "image"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : preset.type === "gif"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}>
                        {preset.type === "image" ? "🖼️ Gambar" : preset.type === "gif" ? "🎞️ GIF Gerak" : "🎥 Video"}
                      </span>
                    </div>

                    <div className="h-28 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center relative">
                      {(preset.type === "image" || preset.type === "gif") && (
                        <img src={preset.url} alt={preset.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                      {preset.type === "video" && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white bg-slate-950">
                          <PlayCircle className="w-8 h-8 text-red-500 mb-1" />
                          <span className="text-[10px]">Video YouTube</span>
                        </div>
                      )}
                    </div>

                    <h5 className="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">
                      {preset.nama}
                    </h5>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                      {preset.caption}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full bg-indigo-600 group-hover:bg-indigo-700 text-white py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    Gunakan Media Ini
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MEDIA LIGHTBOX ZOOM */}
      {zoomedMedia && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedMedia(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col items-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs text-slate-300 font-bold">
                {zoomedMedia.caption || "Pratinjau Media Soal"}
              </span>
              <button
                type="button"
                onClick={() => setZoomedMedia(null)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕ Tutup
              </button>
            </div>
            <img
              src={zoomedMedia.url}
              alt="Zoomed"
              className="max-h-[75vh] max-w-full object-contain rounded-2xl"
            />
            {zoomedMedia.caption && (
              <p className="text-xs text-slate-400 mt-2 text-center italic">
                📌 {zoomedMedia.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
