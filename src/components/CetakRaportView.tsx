import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  GraduationCap, 
  Printer, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Save, 
  Search, 
  FileText, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Calendar, 
  Layers, 
  Edit3, 
  Eye, 
  Copy, 
  Users, 
  Sparkles,
  BookOpen,
  BookmarkCheck,
  ArrowRight,
  RefreshCw,
  Trash2,
  FileCheck,
  ChevronDown,
  ChevronUp,
  ArrowDownUp,
  CheckSquare,
  Square,
  Plus,
  Wand2,
  ListChecks,
  Check,
  MapPin,
  Table,
  Filter
} from "lucide-react";

import { 
  Siswa, 
  Mapel, 
  DataNilai, 
  LogAbsensi, 
  Pengaturan, 
  User, 
  BukuIndukSiswa,
  PeriodeRaportType,
  RaportRecord,
  BankTpItem
} from "../types";
import { KopSuratDinas } from "./KopSuratDinas";
import { saveDocument, deleteDocument, batchSaveDocuments, subscribeCollection, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses } from "../lib/accessControl";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyUnduhSuccess, 
  notifyUnduhError, 
  confirmDeleteAlert 
} from "../lib/swal";
import Swal from "sweetalert2";

interface CetakRaportViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  dataNilaiList: DataNilai[];
  logAbsensiList: LogAbsensi[];
  bukuIndukList?: BukuIndukSiswa[];
  bankTpList?: BankTpItem[];
  config: Pengaturan;
  currentUser?: User | null;
  onNavigateToBankTp?: () => void;
}

const DEFAULT_MAPEL_LIST = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Seni Budaya dan Prakarya",
  "Bahasa Inggris",
  "Muatan Lokal (Bahasa Daerah)"
];

const PERIODE_OPTIONS: { id: PeriodeRaportType; label: string; semester: 'Ganjil' | 'Genap'; short: string; badge: string; desc: string }[] = [
  {
    id: "pts_ganjil",
    label: "Penilaian Tengah Semester (PTS / STS) - Semester Ganjil",
    semester: "Ganjil",
    short: "PTS Ganjil",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    desc: "Laporan hasil belajar capaian kompetensi tengah semester ganjil (Bulan September/Oktober)"
  },
  {
    id: "pas_ganjil",
    label: "Penilaian / Sumatif Akhir Semester (PAS / SAS) - Semester Ganjil",
    semester: "Ganjil",
    short: "PAS Ganjil",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    desc: "Raport resmi akhir semester ganjil lengkap dengan capaian kompetensi (Bulan Desember)"
  },
  {
    id: "pts_genap",
    label: "Penilaian Tengah Semester (PTS / STS) - Semester Genap",
    semester: "Genap",
    short: "PTS Genap",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    desc: "Laporan hasil belajar capaian kompetensi tengah semester genap (Bulan Maret/April)"
  },
  {
    id: "pat_genap",
    label: "Penilaian Akhir Tahun / Kenaikan Kelas (PAT / SAT / UKK) - Semester Genap",
    semester: "Genap",
    short: "PAT / Kenaikan Kelas",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    desc: "Raport resmi kenaikan kelas / kelulusan akhir tahun ajaran (Bulan Juni)"
  },
  {
    id: "ujian_sekolah",
    label: "Asesmen Sumatif Akhir Jenjang / Ujian Sekolah (Kelulusan)",
    semester: "Genap",
    short: "Ujian Sekolah",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    desc: "Rekapitulasi kelulusan dan nilai akhir asesmen sekolah jenjang akhir"
  },
  {
    id: "asesmen_formatif_sumatif",
    label: "Raport Asesmen Formatif & Sumatif Lingkup Materi",
    semester: "Ganjil",
    short: "Formatif & Sumatif",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    desc: "Laporan perkembangan capaian tujuan pembelajaran per lingkup materi"
  }
];

function getFaseByClass(kelas: string): string {
  const k = kelas.toLowerCase();
  if (k.includes("1") || k.includes("2") || k.includes("i ") || k.includes("ii ")) return "Fase A";
  if (k.includes("3") || k.includes("4") || k.includes("iii") || k.includes("iv")) return "Fase B";
  if (k.includes("5") || k.includes("6") || k.includes("v") || k.includes("vi")) return "Fase C";
  if (k.includes("7") || k.includes("8") || k.includes("9") || k.includes("vii") || k.includes("viii") || k.includes("ix")) return "Fase D";
  if (k.includes("10") || k.includes("x")) return "Fase E";
  if (k.includes("11") || k.includes("12") || k.includes("xi") || k.includes("xii")) return "Fase F";
  return "Fase A";
}

export function isMatchingMapel(mapelA?: string, mapelB?: string): boolean {
  if (!mapelA || !mapelB) return false;
  const a = mapelA.toLowerCase().trim();
  const b = mapelB.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const cleanA = a.replace(/[^a-z0-9]/g, "");
  const cleanB = b.replace(/[^a-z0-9]/g, "");
  if (cleanA && cleanB && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;

  // Flexible Subject Matching
  const isAgama = (s: string) => s.includes("agama") || s.includes("pai") || s.includes("budi pekerti") || s.includes("islam") || s.includes("kristen") || s.includes("katolik") || s.includes("hindu") || s.includes("buddha");
  if (isAgama(a) && isAgama(b)) return true;

  const isPancasila = (s: string) => s.includes("pancasila") || s.includes("pkn") || s.includes("ppkn") || s.includes("kewarganegaraan");
  if (isPancasila(a) && isPancasila(b)) return true;

  const isIndo = (s: string) => s.includes("indo") || s.includes("indonesia") || s.includes("bind");
  if (isIndo(a) && isIndo(b)) return true;

  const isMtk = (s: string) => s.includes("mtk") || s.includes("matematika") || s.includes("math") || s.includes("berhitung");
  if (isMtk(a) && isMtk(b)) return true;

  const isIpas = (s: string) => s.includes("ipas") || s.includes("alam dan sosial") || s.includes("ipa") || s.includes("ips");
  if (isIpas(a) && isIpas(b)) return true;

  const isPjok = (s: string) => s.includes("pjok") || s.includes("jasmani") || s.includes("olahraga") || s.includes("penjas") || s.includes("penjaskes");
  if (isPjok(a) && isPjok(b)) return true;

  const isSeni = (s: string) => s.includes("seni") || s.includes("sbdp") || s.includes("prakarya") || s.includes("budaya") || s.includes("rupa") || s.includes("musik") || s.includes("tari");
  if (isSeni(a) && isSeni(b)) return true;

  const isInggris = (s: string) => s.includes("inggris") || s.includes("english") || s.includes("bing");
  if (isInggris(a) && isInggris(b)) return true;

  const isMulok = (s: string) => s.includes("muatan lokal") || s.includes("daerah") || s.includes("mulok") || s.includes("sunda") || s.includes("jawa") || s.includes("madura") || s.includes("bali");
  if (isMulok(a) && isMulok(b)) return true;

  return false;
}

export function isMatchingClass(itemClass?: string, targetClass?: string): boolean {
  if (!itemClass || !targetClass) return true;
  const ic = itemClass.toLowerCase().trim();
  const tc = targetClass.toLowerCase().trim();
  if (ic === "semua kelas" || ic === "semua" || ic === "" || tc === "semua kelas" || tc === "semua" || tc === "") return true;
  if (ic === tc) return true;
  if (ic.includes(tc) || tc.includes(ic)) return true;

  const numI = ic.replace(/[^0-9]/g, "");
  const numT = tc.replace(/[^0-9]/g, "");
  if (numI && numT && numI === numT) return true;

  const faseI = getFaseByClass(ic);
  const faseT = getFaseByClass(tc);
  if (faseI && faseT && faseI === faseT) return true;

  return false;
}

export function isGenericDummyDesc(text?: string | null): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  return (
    lower.includes("penerapan capaian pembelajaran") ||
    lower.includes("seluruh materi pokok dan tujuan pembelajaran") ||
    lower.includes("kriteria ketuntasan minimal pada mata pelajaran") ||
    lower.includes("pada konsep pengenalan materi") ||
    lower.includes("pendalaman materi yang lebih kompleks") ||
    lower.includes("indikator soal dan pemecahan masalah") ||
    lower.includes("remedial untuk mencapai tujuan pembelajaran pokok") ||
    lower.includes("diisi otomatis sesuai nilai dan keterangan") ||
    lower.includes("mampu bernalar kritis secara mandiri") ||
    lower.includes("mampu mengaplikasikan konsep dengan cermat")
  );
}

// Memeriksa apakah deskripsi tersimpan merupakan deskripsi lama 1 TP yang belum tergabung secara multi-TP atau belum sesuai KKTP
export function isOutdatedSingleTp(currentDesc: string | undefined | null, freshFullDesc: string): boolean {
  if (!currentDesc) return true;
  const cur = currentDesc.trim();
  const fresh = freshFullDesc.trim();
  if (cur === fresh) return false;
  if (isGenericDummyDesc(cur)) return true;

  // Jika status ketuntasan fresh berbeda dari cur (misal fresh butuh "Perlu peningkatan..." tapi cur masih "Menunjukkan...")
  if (fresh.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam") && !cur.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam")) {
    return true;
  }
  if (fresh.startsWith("Menunjukkan penguasaan sangat baik dalam") && !cur.startsWith("Menunjukkan penguasaan sangat baik dalam")) {
    return true;
  }

  // Jika fresh description memiliki multiple TP yang digabungkan (" serta " atau koma), sedangkan cur belum
  if (fresh.includes(" serta ") && !cur.includes(" serta ")) return true;
  if ((fresh.match(/,/g) || []).length > (cur.match(/,/g) || []).length) return true;

  // Jika masih menggunakan format lama "Menunjukkan kemauan belajar..."
  if (cur.startsWith("Menunjukkan kemauan belajar")) return true;

  // Format baku sesuai KKTP
  const isTargetFormat = cur.startsWith("Menunjukkan penguasaan sangat baik dalam") ||
                        cur.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam");
  if (!isTargetFormat) return true;

  // Jika isi TP di Bank TP berbeda dari yang tersimpan di cur
  if (cur !== fresh) return true;

  return false;
}

// Memeriksa apakah deskripsi rapor tersimpan perlu di-refresh secara real-time dari Bank TP
export function shouldRefreshDeskripsi(
  currentDesc: string | undefined | null,
  freshFullDesc: string,
  bankTpCount: number = 0
): boolean {
  if (!currentDesc || !currentDesc.trim()) return true;
  const cur = currentDesc.trim();
  const fresh = freshFullDesc.trim();
  if (cur === fresh) return false;
  if (isGenericDummyDesc(cur)) return true;
  if (isOutdatedSingleTp(cur, fresh)) return true;

  // Jika teks saat ini berformat otomatis Kurikulum Merdeka lama atau berbeda dengan susunan TP terbaru
  const isAutoStandard =
    cur.startsWith("Menunjukkan penguasaan") ||
    cur.startsWith("Menunjukkan kemauan") ||
    cur.startsWith("Pertahankan prestasi") ||
    cur.startsWith("Perlu peningkatan") ||
    cur.startsWith("Sangat baik dalam") ||
    cur.startsWith("Telah mencapai");

  if (isAutoStandard && cur !== fresh) return true;

  // Jika di Bank TP terdapat TP aktif dan fresh terbentuk dari TP tersebut, timpa deskripsi lama yang berbeda
  if (bankTpCount > 0 && cur !== fresh) {
    if (fresh.includes(" serta ") || fresh.includes(",")) return true;
  }

  return false;
}

// Master Katalog TP Kurikulum Merdeka Resmi Kemendikbudristek per Fase / Kelas
export const CLASS_PHASE_TP_TEMPLATES: Record<string, Record<string, string[]>> = {
  "Fase A": { // Kelas 1 & 2
    "Pendidikan Agama dan Budi Pekerti": [
      "mengenal rukun iman, rukun Islam, dan melafalkan huruf hijaiyah berharakat secara lancar",
      "melafalkan surah pendek Al-Fatihah dan Al-Ikhlas dengan makhraj yang benar",
      "mempraktikkan adab makan, minum, dan berdoa harian dalam kehidupan sehari-hari",
      "mempraktikkan tata cara bersuci (wudhu) dan gerakan salat secara tertib"
    ],
    "Pendidikan Pancasila": [
      "mengenal dan menceritakan simbol serta sila-sila Pancasila dalam lambang negara Garuda Pancasila",
      "mengidentifikasi dan menaati aturan di rumah dan di sekolah secara disiplin",
      "menghargai identitas diri dan teman serta keragaman fisik di lingkungan sekitar",
      "menunjukkan sikap gotong royong dan tolong-menolong dalam kegiatan kelas"
    ],
    "Bahasa Indonesia": [
      "menyimak dan menceritakan kembali isi teks narasi pendek yang dibacakan dengan runtut",
      "membaca kata-kata berima dan frasa sederhana dengan lafal dan intonasi yang tepat",
      "menulis huruf, suku kata, dan kalimat sederhana dengan tegak bersambung dan tanda baca dasar",
      "menyampaikan perasaan, gagasan, dan pertanyaan dengan kosa kata santun"
    ],
    "Matematika": [
      "membilang, membandingkan, dan mengurutkan bilangan cacah sampai dengan 100",
      "melakukan operasi penjumlahan dan pengurangan bilangan cacah secara mandiri dan cermat",
      "mengenal, mengelompokkan, dan menyusun pola bangun datar dan bangun ruang sederhana",
      "mengukur dan membandingkan panjang serta berat benda menggunakan satuan tidak baku"
    ],
    "Ilmu Pengetahuan Alam dan Sosial (IPAS)": [
      "mengenal anggota tubuh, panca indra, dan cara merawat kebersihan serta kesehatan diri",
      "mengamati dan menceritakan ciri benda, cuaca, dan kenampakan lingkungan sekitar",
      "mengidentifikasi peran anggota keluarga dan silsilah keluarga di lingkungan rumah",
      "membiasakan perilaku hemat energi dan peduli kebersihan lingkungan sekolah"
    ],
    "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)": [
      "mempraktikkan pola gerak dasar lokomotor, non-lokomotor, dan manipulatif dalam aktivitas permainan",
      "mengenal dan membiasakan pola hidup bersih, sehat, dan menjaga kebersihan pakaian",
      "menunjukkan perilaku tertib, percaya diri, dan sportif saat berolahraga bersama teman"
    ],
    "Seni Budaya dan Prakarya": [
      "mengenal dan mengeksplorasi garis, bentuk, dan warna primer dalam menggambar ekspresi",
      "membuat karya kerajinan sederhana menggunakan teknik menggunting, melipat, dan menempel",
      "menirukan irama, ketukan, dan menyanyikan lagu anak-anak dengan gembira"
    ],
    "Bahasa Inggris": [
      "mengidentifikasi dan menirukan pengucapan kosakata benda, warna, dan angka sederhana",
      "merespons instruksi lisan sederhana dan salam perkenalan diri dengan percaya diri",
      "menyanyikan lagu sederhana berbahasa Inggris dengan lafal yang jelas"
    ],
    "Muatan Lokal (Bahasa Daerah)": [
      "mengenal kosakata dasar sapaan santun dan anggota tubuh dalam bahasa daerah setempat",
      "melafalkan dan menyanyikan tembang dolanan atau kakawihan anak dengan gembira",
      "menirukan percakapan sederhana bahasa daerah dengan intonasi yang ramah"
    ]
  },
  "Fase B": { // Kelas 3 & 4
    "Pendidikan Agama dan Budi Pekerti": [
      "membaca Q.S. Al-Hujurat ayat 13 dan Al-Ma'un dengan tartil sesuai kaidah tajwid",
      "memahami dan meneladani asmaulhusna Al-Malik, Al-Aziz, Al-Quddus dalam akhlak terpuji",
      "mempraktikkan tata cara salat fardhu, salat berjamaah, dan zikir secara benar dan khusyuk",
      "menunjukkan sikap toleransi, tolong-menolong, dan menghargai keragaman antarsesama"
    ],
    "Pendidikan Pancasila": [
      "menerapkan makna dan nilai-nilai luhur sila Pancasila dalam interaksi keseharian di sekolah dan masyarakat",
      "menghargai keragaman suku bangsa, sosial budaya, dan bahasa dalam bingkai Bhinneka Tunggal Ika",
      "melaksanakan hak dan kewajiban sebagai peserta didik dan warga masyarakat dengan bertanggung jawab",
      "menunjukkan sikap musyawarah mufakat dan kepatuhan terhadap norma yang berlaku di lingkungan sekitar"
    ],
    "Bahasa Indonesia": [
      "menyimak dan menemukan ide pokok serta gagasan pendukung dalam berbagai teks bacaan",
      "menyampaikan pendapat dan tanggapan secara santun dan logis dalam forum diskusi kelompok",
      "menulis teks deskripsi dan narasi menggunakan kosa kata baku serta kaidah ejaan yang tepat",
      "membaca teks fiksi dan nonfiksi dengan intonasi ekspresif serta pemahaman isi yang mendalam"
    ],
    "Matematika": [
      "memahami dan menyelesaikan operasi hitung bilangan cacah, pecahan senilai, dan desimal sederhana",
      "menyelesaikan masalah kontekstual yang berkaitan dengan keliling dan luas bangun datar",
      "menganalisis, menyajikan, dan menginterpretasikan data dalam bentuk diagram batang dan tabel frekuensi",
      "mengukur sudut, waktu, dan berat menggunakan satuan baku secara akurat"
    ],
    "Ilmu Pengetahuan Alam dan Sosial (IPAS)": [
      "menganalisis bentuk dan fungsi bagian tubuh tumbuhan serta adaptasi hewan terhadap lingkungannya",
      "mengidentifikasi wujud zat, sifat materi, dan proses transformasi bentuk energi dalam keseharian",
      "menjelaskan keragaman bentang alam serta interaksi sosial dan kegiatan ekonomi masyarakat sekitar",
      "melakukan penyelidikan ilmiah sederhana dan mencatat hasil pengamatan secara sistematis"
    ],
    "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)": [
      "mempraktikkan variasi dan kombinasi gerak dasar permainan bola besar, bola kecil, dan senam lantai",
      "menerapkan latihan kebugaran jasmani dasar, sportivitas, dan kerjasama dalam aktivitas beregu",
      "menerapkan pola istirahat, gizi seimbang, dan menjaga keselamatan diri di lingkungan sekolah"
    ],
    "Seni Budaya dan Prakarya": [
      "mengeksplorasi unsur garis, tekstur, ruang, dan warna dalam berkarya seni rupa 2D dan 3D",
      "menciptakan karya kriya fungsional berbahan daur ulang dengan teknik konstruksi sederhana",
      "menampilkan apresiasi terhadap keunikan seni budaya nusantara dengan rasa bangga dan santun"
    ],
    "Bahasa Inggris": [
      "mengidentifikasi, merespons ungkapan sapaan, dan mendeskripsikan aktivitas harian sederhana",
      "membaca kata dan kalimat pendek berbahasa Inggris dengan pelafalan yang tepat dan jelas",
      "menulis kata dan frasa sederhana tentang benda di kelas, makanan, dan hobi kegemaran"
    ],
    "Muatan Lokal (Bahasa Daerah)": [
      "memahami undak-usuk basa atau tingkatan kesantunan bahasa daerah dalam percakapan sehari-hari",
      "menyimak, membaca, dan menceritakan kembali dongeng atau cerita rakyat daerah dengan percaya diri",
      "menulis kalimat sederhana menggunakan kosa kata bahasa daerah dengan ejaan yang benar"
    ]
  },
  "Fase C": { // Kelas 5 & 6
    "Pendidikan Agama dan Budi Pekerti": [
      "membaca dan menganalisis kandungan pesan pokok Q.S. At-Tin serta hukum tajwid nun sukun",
      "memahami makna iman kepada hari akhir, qada, dan qadar dalam membangun keteguhan hati",
      "mempraktikkan ketentuan zakat, infak, dan sedekah serta kepedulian sosial di lingkungan masyarakat",
      "meneladani perjuangan Rasulullah SAW dan para sahabat dalam menyebarkan nilai-nilai perdamaian"
    ],
    "Pendidikan Pancasila": [
      "menganalisis penerapan nilai-nilai Pancasila dalam kehidupan berbangsa dan bernegara secara kritis",
      "menyajikan hasil telaah norma sosial, konstitusi, dan pentingnya penegakan hukum yang adil",
      "merancang aksi nyata dalam menjaga persatuan dan keutuhan Negara Kesatuan Republik Indonesia",
      "menghargai keragaman budaya bangsa serta kearifan lokal dalam memperkuat jati diri nasional"
    ],
    "Bahasa Indonesia": [
      "menganalisis teks eksplanasi, pidato, dan eksposisi dengan membedakan fakta dan opini secara kritis",
      "berbicara dan mempresentasikan laporan hasil pengamatan dengan artikulasi jelas dan meyakinkan",
      "menulis teks laporan investigasi, formulir, dan ulasan karya sastra dengan struktur yang runtut",
      "mengidentifikasi pesan tersirat dalam teks sastra dan puisi modern dengan apresiasi mendalam"
    ],
    "Matematika": [
      "melakukan operasi hitung campuran bilangan bulat, pecahan, desimal, dan persentase dengan tepat",
      "menghitung keliling lingkaran, luas bangun gabungan, dan volume bangun ruang (kubus, balok, prisma)",
      "menganalisis dan menyajikan data statistik (mean, median, modus) dalam pemecahan masalah kontekstual",
      "memahami perbandingan dan skala pada denah dan peta dengan penalaran matematis"
    ],
    "Ilmu Pengetahuan Alam dan Sosial (IPAS)": [
      "menganalisis sistem organ pernapasan, pencernaan, dan peredaran darah manusia serta pemeliharaannya",
      "menjelaskan hubungan rantai makanan, jaring-jaring makanan, dan keseimbangan ekosistem hayati",
      "menjelaskan sifat gaya, gelombang bunyi, cahaya, dan pemanfaatan energi listrik alternatif",
      "menganalisis letak geografis Indonesia dan warisan budaya bangsa dalam interaksi antarnegara"
    ],
    "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)": [
      "mempraktikkan variasi dan kombinasi keterampilan teknik dasar olahraga atletik dan bela diri",
      "mengukur komponen kebugaran jasmani dan mempraktikkan pencegahan cedera saat berolahraga",
      "menganalisis pentingnya menjaga kesehatan reproduksi dan menghindari zat berbahaya (NAPZA)"
    ],
    "Seni Budaya dan Prakarya": [
      "menciptakan karya seni rupa murni dan terapan dengan memperhatikan prinsip komposisi dan proporsi",
      "merancang dan membuat produk kriya bernilai estetis dan ekonomis dari potensi bahan lokal",
      "menganalisis makna simbolis ragam motif hias dan warisan seni rupa tradisional nusantara"
    ],
    "Bahasa Inggris": [
      "memahami ide pokok dan informasi spesifik dari teks dialog atau cerita pendek berbahasa Inggris",
      "mengungkapkan ide, preferensi, dan tanya-jawab sederhana dalam situasi interaksi keseharian",
      "menulis teks deskriptif pendek dengan tata bahasa dan kosa kata yang tepat dan komunikatif"
    ],
    "Muatan Lokal (Bahasa Daerah)": [
      "menganalisis pesan moral dalam cerita pendek, carita pondok, atau aksara tradisional daerah",
      "berkomunikasi lisan menggunakan tatakrama bahasa daerah yang luwes, santun, dan komunikatif",
      "menulis karangan deskripsi atau pidato singkat (biantara/sesorah) dalam bahasa daerah"
    ]
  }
};

export const DEFAULT_TP_TEMPLATES: Record<string, string[]> = {
  "Matematika": [
    "Memahami dan menyelesaikan operasi hitung bilangan cacah dan pecahan.",
    "Menyelesaikan masalah kontekstual yang berkaitan dengan operasi aritmatika.",
    "Menganalisis, menyajikan, dan menginterpretasikan data dalam bentuk diagram batang dan tabel.",
    "Mengukur keliling dan luas bangun datar menggunakan satuan baku dengan cermat."
  ],
  "Bahasa Indonesia": [
    "Menyimak dan memahami ide pokok serta gagasan pendukung dalam teks bacaan.",
    "Menyampaikan pendapat dan hasil telaah secara runtut, logis, dan santun dalam diskusi.",
    "Menulis teks deskripsi dan narasi dengan kosakata baku serta tanda baca yang tepat.",
    "Membaca teks dengan lafal, intonasi, dan ekspresi yang tepat serta penuh percaya diri."
  ],
  "Ilmu Pengetahuan Alam dan Sosial (IPAS)": [
    "Menganalisis hubungan antara bentuk serta fungsi bagian tubuh tumbuhan dan hewan.",
    "Mengidentifikasi wujud zat dan perubahan bentuk energi dalam kehidupan sehari-hari.",
    "Menjelaskan keragaman bentang alam serta interaksi manusia dengan lingkungan sekitar.",
    "Melakukan penyelidikan ilmiah sederhana dan mencatat hasil pengamatan secara sistematis."
  ],
  "Pendidikan Pancasila": [
    "Menerapkan nilai-nilai luhur Pancasila dalam interaksi di lingkungan sekolah dan rumah.",
    "Menghargai keragaman suku, agama, dan budaya dalam bingkai Bhinneka Tunggal Ika.",
    "Melaksanakan hak dan kewajiban sebagai warga sekolah dengan penuh tanggung jawab.",
    "Mengenal aturan dan norma sosial yang berlaku di lingkungan sekitar dengan disiplin."
  ],
  "Pendidikan Agama dan Budi Pekerti": [
    "Membaca, menghafal, dan memahami makna ayat-ayat suci serta hadis pilihan.",
    "Meneladani kisah keteladanan tokoh dan nabi dalam kehidupan sehari-hari.",
    "Mempraktikkan tata cara ibadah wajib dan sunah dengan tertib dan benar.",
    "Menunjukkan sikap toleransi, kasih sayang, dan saling menghormati antar sesama."
  ],
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)": [
    "Mempraktikkan variasi gerak dasar lokomotor, non-lokomotor, dan manipulatif dalam olahraga.",
    "Menunjukkan sportivitas, disiplin, dan kerjasama dalam aktivitas permainan beregu.",
    "Menerapkan pola hidup bersih dan sehat serta menjaga kebersihan lingkungan secara mandiri."
  ],
  "Seni Budaya dan Prakarya": [
    "Mengeksplorasi unsur rupa (garis, bentuk, warna, tekstur) dalam kreasi seni rupa dua/tiga dimensi.",
    "Membuat karya kerajinan tangan fungsional berbahan alami atau daur ulang secara kreatif.",
    "Menampilkan apresiasi karya seni dengan percaya diri dan santun."
  ],
  "Bahasa Inggris": [
    "Mengidentifikasi dan merespons kosakata instruksi sederhana sehari-hari.",
    "Mendeskripsikan benda, warna, dan aktivitas rutin dalam kalimat sederhana.",
    "Membaca kata dan frasa pendek dalam bahasa Inggris dengan pengucapan yang jelas."
  ],
  "Muatan Lokal (Bahasa Daerah)": [
    "Memahami undak-usuk basa / tingkatan bahasa daerah dalam komunikasi santun.",
    "Menyimak dan mengapresiasi cerita rakyat atau tembang/pupuh daerah.",
    "Menulis kalimat sederhana menggunakan kosa kata bahasa daerah secara santun."
  ]
};

export function getFallbackTpsForClassAndMapel(kelas?: string, mapel?: string): string[] {
  if (!mapel) return [];
  const fase = getFaseByClass(kelas || "");
  const faseGroup = CLASS_PHASE_TP_TEMPLATES[fase] || CLASS_PHASE_TP_TEMPLATES["Fase B"];
  
  if (faseGroup) {
    const matchedKey = Object.keys(faseGroup).find((k) => isMatchingMapel(k, mapel));
    if (matchedKey && faseGroup[matchedKey] && faseGroup[matchedKey].length > 0) {
      return faseGroup[matchedKey];
    }
  }

  const defKey = Object.keys(DEFAULT_TP_TEMPLATES).find((k) => isMatchingMapel(k, mapel));
  if (defKey && DEFAULT_TP_TEMPLATES[defKey] && DEFAULT_TP_TEMPLATES[defKey].length > 0) {
    return DEFAULT_TP_TEMPLATES[defKey];
  }

  return [
    `memahami materi pokok dan capaian pembelajaran ${mapel}`,
    `menerapkan pemahaman materi dalam menyelesaikan tugas kontekstual`,
    `berpikir kritis dan menyajikan hasil belajar secara mandiri`
  ];
}

export function cleanTpText(text: string, mapelFallback: string = ""): string {
  let t = (text || "").trim();
  t = t.replace(/^(TP\s*[\d.]*[:\s-]*|\d+[\.\)]\s*)/i, "").trim();
  if (t.endsWith(".")) t = t.slice(0, -1);
  if (!t) return `konsep materi ${mapelFallback}`.trim();
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/**
 * Penggabungan Seluruh TP secara Alami (Smart Concatenation)
 * - 1 TP: "...[TP 1]"
 * - 2 TP: "...[TP 1] serta [TP 2]"
 * - >=3 TP: "...[TP 1], [TP 2], serta [TP 3]"
 */
export function concatenateTpListNaturally(tps: string[], mapelFallback: string = ""): string {
  const cleanedList = (tps || [])
    .map((t) => cleanTpText(t, mapelFallback))
    .filter(Boolean);

  // Ambil butir unik
  const uniqueList: string[] = [];
  cleanedList.forEach((item) => {
    if (!uniqueList.some((u) => u.toLowerCase() === item.toLowerCase())) {
      uniqueList.push(item);
    }
  });

  if (uniqueList.length === 0) {
    return `materi pokok dan capaian pembelajaran ${mapelFallback}`.trim();
  }
  if (uniqueList.length === 1) {
    return uniqueList[0];
  }
  if (uniqueList.length === 2) {
    return `${uniqueList[0]} serta ${uniqueList[1]}`;
  }
  const last = uniqueList[uniqueList.length - 1];
  const initial = uniqueList.slice(0, -1).join(", ");
  return `${initial}, serta ${last}`;
}

// Simple Multi-TP Auto-Concatenation & Logika Standar Ketuntasan (KKTP)
// Jika Nilai >= KKTP (Tuntas / Sangat Baik) -> "Menunjukkan penguasaan sangat baik dalam [Daftar Seluruh TP dari Bank TP Kelas]."
// Jika Nilai < KKTP (Belum Tuntas / Perlu Pendampingan) -> "Perlu peningkatan konsistensi pemahaman dan pendampingan dalam [Daftar Seluruh TP dari Bank TP Kelas]."
export function generateFallbackDeskripsiFromTp(
  mapel: string,
  nilaiNum: number | string | undefined | null,
  tps?: string[],
  bankItems?: BankTpItem[],
  kelas?: string,
  kktpThreshold: number | string = 75
): { tinggi: string; perluBimbingan: string } {
  const scoreVal = (nilaiNum !== undefined && nilaiNum !== null && nilaiNum !== "" && !isNaN(Number(nilaiNum)))
    ? Number(nilaiNum)
    : 80;
  const kktpVal = (kktpThreshold !== undefined && kktpThreshold !== null && kktpThreshold !== "" && !isNaN(Number(kktpThreshold)))
    ? Number(kktpThreshold)
    : 75;

  let candidateTps: string[] = [];

  // 1. Ambil seluruh TP yang ada di Bank TP untuk Mapel & Kelas tersebut (Tanpa Kategori)
  if (bankItems && bankItems.length > 0) {
    candidateTps = bankItems.map((b) => b.tujuanPembelajaran).filter(Boolean);
  }

  // 2. Jika belum ada di bankItems, gunakan tps param jika tersedia
  if (candidateTps.length === 0 && tps && tps.length > 0) {
    candidateTps = [...tps];
  }

  // 3. Jika masih kosong, ambil otomatis dari Master Katalog TP Kurikulum Merdeka per Kelas
  if (candidateTps.length === 0) {
    candidateTps = getFallbackTpsForClassAndMapel(kelas, mapel);
  }

  // Penggabungan Seluruh TP secara Alami (Smart Concatenation)
  const mergedTpsText = concatenateTpListNaturally(candidateTps, mapel);

  // 3. Logika Deskripsi Rapor Berdasarkan Standar Ketuntasan (KKTP)
  if (scoreVal >= kktpVal) {
    const textTuntas = `Menunjukkan penguasaan sangat baik dalam ${mergedTpsText}.`;
    return {
      tinggi: textTuntas,
      perluBimbingan: `Pertahankan prestasi dan tingkatkan kemandirian dalam pendalaman ${mergedTpsText}.`
    };
  } else {
    const textBelumTuntas = `Perlu peningkatan konsistensi pemahaman dan pendampingan dalam ${mergedTpsText}.`;
    return {
      tinggi: textBelumTuntas,
      perluBimbingan: textBelumTuntas
    };
  }
}

export function generateDefaultDeskripsi(mapel: string, nilaiNum: number | string, kelas?: string): { tinggi: string; perluBimbingan: string } {
  return generateFallbackDeskripsiFromTp(mapel, nilaiNum, [], undefined, kelas);
}

/**
 * Format tanggal dalam format resmi Indonesia: Tanggal, Nama Bulan Utuh, Tahun (contoh: 20 Oktober 2024)
 */
export function formatTanggalIndonesia(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const str = String(dateInput).trim();
  // Jika sudah mengandung salah satu nama bulan lengkap bahasa Indonesia
  if (months.some((m) => str.toLowerCase().includes(m.toLowerCase()))) {
    return str;
  }

  // Format ISO / input type="date": YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      return `${d} ${months[m - 1]} ${y}`;
    }
  }

  // Format DD/MM/YYYY atau DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(str)) {
    const separator = str.includes("/") ? "/" : "-";
    const [d, m, y] = str.split(separator).map(Number);
    if (m >= 1 && m <= 12) {
      return `${d} ${months[m - 1]} ${y}`;
    }
  }

  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  return str;
}

export const CetakRaportView: React.FC<CetakRaportViewProps> = ({
  siswaList,
  mapelList,
  dataNilaiList,
  logAbsensiList,
  bukuIndukList = [],
  bankTpList = [],
  config,
  currentUser,
  onNavigateToBankTp
}) => {
  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));
  const isAdmin = currentUser?.role === "admin";
  const isGuruKelas = currentUser?.role === "guru_kelas";

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<"cetak" | "input" | "leger" | "import">(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_subtab");
      if (saved) return saved as any;
    } catch {}
    return "cetak";
  });

  // Mode Tampilan Input Nilai: "table" (Matriks Spreadsheet sesuai gambar) atau "accordion" (Kartu)
  const [inputViewMode, setInputViewMode] = useState<"table" | "accordion">(() => {
    try {
      const saved = localStorage.getItem("edadmin_input_view_mode");
      if (saved) return saved as "table" | "accordion";
    } catch {}
    return "table";
  });

  // Filter Mapel untuk Tampilan Matriks Tabel (memudahkan pengisian fokus 1 mapel)
  const [selectedTableMapelFilter, setSelectedTableMapelFilter] = useState<string>("Semua");

  // Selection Filters
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_selected_kelas");
      if (saved) return saved;
    } catch {}
    return allowedClasses.length > 0 ? allowedClasses[0] : "Kelas 1";
  });
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeRaportType>(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_selected_periode");
      if (saved) return saved as PeriodeRaportType;
    } catch {}
    return "pas_ganjil";
  });
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_selected_tahun");
      if (saved) return saved;
    } catch {}
    return config.Tahun_Ajaran || "2024/2025";
  });
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_selected_siswa_id");
      if (saved) return saved;
    } catch {}
    return "all";
  });
  const [printMode, setPrintMode] = useState<"full" | "lembar_nilai" | "cover">("full");
  
  // Raport Meta Settings
  const [tanggalRaport, setTanggalRaport] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [tempatTitimangsa, setTempatTitimangsa] = useState<string>(config.Tempat_Tanda_Tangan || "Kab. Bogor");
  const [showTtdKepsek, setShowTtdKepsek] = useState<boolean>(true);
  const [showKopSekolah, setShowKopSekolah] = useState<boolean>(true);

  // Auto-persist filter state changes
  useEffect(() => {
    try { localStorage.setItem("edadmin_raport_subtab", activeSubTab); } catch {}
  }, [activeSubTab]);

  useEffect(() => {
    try { localStorage.setItem("edadmin_raport_selected_kelas", selectedKelas); } catch {}
  }, [selectedKelas]);

  useEffect(() => {
    try { localStorage.setItem("edadmin_raport_selected_periode", selectedPeriode); } catch {}
  }, [selectedPeriode]);

  useEffect(() => {
    try { localStorage.setItem("edadmin_raport_selected_tahun", selectedTahunAjaran); } catch {}
  }, [selectedTahunAjaran]);

  useEffect(() => {
    try { localStorage.setItem("edadmin_raport_selected_siswa_id", selectedSiswaId); } catch {}
  }, [selectedSiswaId]);

  // Editable Raport Store (In Memory & Synced with Firestore & localStorage)
  const [raportRecords, setRaportRecords] = useState<{ [docId: string]: RaportRecord }>(() => {
    try {
      const saved = localStorage.getItem("edadmin_persisted_raport_records");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);

  // Debounced auto-save timer ref
  const saveTimeoutRef = useRef<{ [docId: string]: NodeJS.Timeout }>({});

  // Subscribe to real-time RAPORT_RECORDS collection from Firestore
  useEffect(() => {
    const unsub = subscribeCollection<RaportRecord>(COLLECTIONS.RAPORT_RECORDS, (data) => {
      if (data && data.length > 0) {
        setRaportRecords((prev) => {
          const next = { ...prev };
          let changed = false;
          data.forEach((rec) => {
            if (rec && rec.id) {
              const current = prev[rec.id];
              if (!current || (rec.updatedAt || 0) >= (current.updatedAt || 0)) {
                next[rec.id] = rec;
                changed = true;
              }
            }
          });
          if (changed) {
            try {
              localStorage.setItem("edadmin_persisted_raport_records", JSON.stringify(next));
            } catch {}
            return next;
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, []);

  // Also import existing Raport records from bukuIndukList if present
  useEffect(() => {
    if (bukuIndukList && bukuIndukList.length > 0) {
      setRaportRecords((prev) => {
        let changed = false;
        const next = { ...prev };
        bukuIndukList.forEach((bi: any) => {
          if (bi && bi.id && bi.id.startsWith("raport_") && Array.isArray(bi.nilaiMapel)) {
            if (!next[bi.id]) {
              next[bi.id] = bi as RaportRecord;
              changed = true;
            }
          }
        });
        if (changed) {
          try {
            localStorage.setItem("edadmin_persisted_raport_records", JSON.stringify(next));
          } catch {}
          return next;
        }
        return prev;
      });
    }
  }, [bukuIndukList]);

  // TP Picker Modal State (for applying Bank TP to a specific student's subject)
  const [tpPickerState, setTpPickerState] = useState<{
    isOpen: boolean;
    studentId: string;
    studentName: string;
    studentNilai?: number;
    mapel: string;
    targetIdx: number;
    targetField: "tinggi" | "bimbingan";
  }>({
    isOpen: false,
    studentId: "",
    studentName: "",
    studentNilai: 80,
    mapel: "",
    targetIdx: -1,
    targetField: "tinggi"
  });

  // Mode Auto-Sesuaikan Deskripsi TP dengan Nilai yang Diinput (Kurikulum Merdeka)
  const [autoSyncTpWithNilai, setAutoSyncTpWithNilai] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_auto_sync_tp");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoSyncTp = (checked: boolean) => {
    setAutoSyncTpWithNilai(checked);
    try {
      localStorage.setItem("edadmin_raport_auto_sync_tp", JSON.stringify(checked));
    } catch {}
  };

  // Import State
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current selected periode info
  const currentPeriodeInfo = useMemo(() => {
    return PERIODE_OPTIONS.find((p) => p.id === selectedPeriode) || PERIODE_OPTIONS[1];
  }, [selectedPeriode]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return siswaList.filter((s) => s.kelas === selectedKelas);
  }, [siswaList, selectedKelas]);

  // Custom Mapels added manually and persisted locally & in Firestore
  const [customMapels, setCustomMapels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("edadmin_custom_raport_mapels");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subject list for the class (merge default + custom from mapelList + manually added customMapels)
  const activeMapelNames = useMemo(() => {
    const list = new Set<string>();
    DEFAULT_MAPEL_LIST.forEach((m) => list.add(m));
    mapelList.forEach((m) => {
      if (m.namaMapel && m.namaMapel.trim()) {
        list.add(m.namaMapel.trim());
      }
    });
    customMapels.forEach((m) => {
      if (m && m.trim()) {
        list.add(m.trim());
      }
    });
    return Array.from(list);
  }, [mapelList, customMapels]);

  // Hidden mapel names specifically for selectedKelas
  const [hiddenMapelNames, setHiddenMapelNames] = useState<string[]>([]);

  // Selected subjects to display on raport (Checkboxes) - strictly isolated per class (selectedKelas)
  const [selectedMapelNames, setSelectedMapelNames] = useState<string[]>([]);

  // Sync selectedMapelNames and hiddenMapelNames whenever selectedKelas changes
  useEffect(() => {
    if (!selectedKelas) return;

    // 1. Load hidden mapels for selectedKelas
    try {
      const hiddenKey = `edadmin_hidden_raport_mapels_${selectedKelas}`;
      const savedHidden = localStorage.getItem(hiddenKey);
      if (savedHidden) {
        const parsedHidden = JSON.parse(savedHidden);
        if (Array.isArray(parsedHidden)) {
          setHiddenMapelNames(parsedHidden);
        } else {
          setHiddenMapelNames([]);
        }
      } else {
        setHiddenMapelNames([]);
      }
    } catch {
      setHiddenMapelNames([]);
    }

    // 2. Load selected mapels for selectedKelas
    try {
      const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedMapelNames(parsed);
          return;
        }
      }
    } catch {}

    // Default mapels for class if never configured
    setSelectedMapelNames([...DEFAULT_MAPEL_LIST]);
  }, [selectedKelas]);

  // Active mapel list available for this class (excluding hidden mapels)
  const classActiveMapelNames = useMemo(() => {
    return activeMapelNames.filter((m) => !hiddenMapelNames.includes(m));
  }, [activeMapelNames, hiddenMapelNames]);

  // Displayed Mapels (filtered by checkboxes, excluding hidden ones, preserving user sequence)
  const displayMapelNames = useMemo(() => {
    return selectedMapelNames.filter((m) => classActiveMapelNames.includes(m));
  }, [classActiveMapelNames, selectedMapelNames]);

  // Visible Mapels in Matrix Table mode (supports filtering to specific subject or all)
  const visibleMapelNames = useMemo(() => {
    if (!selectedTableMapelFilter || selectedTableMapelFilter === "Semua") {
      return displayMapelNames;
    }
    return displayMapelNames.filter((m) => m === selectedTableMapelFilter);
  }, [displayMapelNames, selectedTableMapelFilter]);

  // Set specific order number (1-based)
  const handleSetMapelOrder = (mapelName: string, targetOrder: number) => {
    const currentIndex = selectedMapelNames.indexOf(mapelName);
    if (currentIndex === -1) return;
    const targetIndex = Math.max(0, Math.min(selectedMapelNames.length - 1, targetOrder - 1));
    if (currentIndex === targetIndex) return;

    setSelectedMapelNames((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(currentIndex, 1);
      updated.splice(targetIndex, 0, item);
      try {
        const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Move mapel up or down in order
  const handleMoveMapel = (mapelName: string, direction: "up" | "down") => {
    const currentIndex = selectedMapelNames.indexOf(mapelName);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= selectedMapelNames.length) return;

    setSelectedMapelNames((prev) => {
      const updated = [...prev];
      const temp = updated[currentIndex];
      updated[currentIndex] = updated[targetIndex];
      updated[targetIndex] = temp;
      try {
        const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Reset to official standard order (Kurikulum Merdeka)
  const handleResetToStandardOrder = () => {
    setSelectedMapelNames((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const idxA = DEFAULT_MAPEL_LIST.indexOf(a);
        const idxB = DEFAULT_MAPEL_LIST.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });
      try {
        const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
        localStorage.setItem(key, JSON.stringify(sorted));
      } catch {}
      return sorted;
    });
    Swal.fire({
      icon: "success",
      title: "Urutan Standar Diterapkan!",
      text: `Urutan mapel untuk ${selectedKelas} telah diatur sesuai standar kurikulum.`,
      timer: 1600,
      showConfirmButton: false
    });
  };

  // Ordered chips for selection panel: active ones first in exact sequence, followed by inactive
  const orderedChips = useMemo(() => {
    const selected = selectedMapelNames.filter((m) => classActiveMapelNames.includes(m));
    const unselected = classActiveMapelNames.filter((m) => !selectedMapelNames.includes(m));
    return [...selected, ...unselected];
  }, [classActiveMapelNames, selectedMapelNames]);

  // Toggle single mapel selection
  const handleToggleMapel = (mapelName: string) => {
    setSelectedMapelNames((prev) => {
      let updated: string[];
      if (prev.includes(mapelName)) {
        if (prev.length <= 1) {
          Swal.fire({
            icon: "warning",
            title: "Minimal 1 Mapel",
            text: "Setidaknya harus ada 1 mata pelajaran yang dipilih untuk dicetak pada raport.",
            timer: 1800,
            showConfirmButton: false
          });
          return prev;
        }
        updated = prev.filter((m) => m !== mapelName);
      } else {
        updated = [...prev, mapelName];
      }
      try {
        const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Delete mapel specifically from selected class (hides completely for this class)
  const handleDeleteMapelFromClass = (mapelName: string) => {
    Swal.fire({
      title: `Hapus Mapel "${mapelName}"?`,
      text: `Mata pelajaran "${mapelName}" akan dihapus khusus untuk ${selectedKelas}. Mapel ini tidak akan muncul di Cetak Raport maupun Bank TP ${selectedKelas}. Kelas lain tidak terpengaruh.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus dari Kelas Ini",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        // Add to hidden mapels for selectedKelas
        setHiddenMapelNames((prevHidden) => {
          const updatedHidden = Array.from(new Set([...prevHidden, mapelName]));
          try {
            const hiddenKey = `edadmin_hidden_raport_mapels_${selectedKelas}`;
            localStorage.setItem(hiddenKey, JSON.stringify(updatedHidden));
          } catch {}
          return updatedHidden;
        });

        // Remove from selected mapels for selectedKelas
        setSelectedMapelNames((prevSelected) => {
          const updatedSelected = prevSelected.filter((m) => m !== mapelName);
          try {
            const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
            localStorage.setItem(key, JSON.stringify(updatedSelected));
          } catch {}
          return updatedSelected;
        });

        Swal.fire({
          icon: "success",
          title: "Berhasil Dihapus",
          text: `Mapel "${mapelName}" telah dihapus khusus untuk ${selectedKelas}.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  // Restore a previously hidden mapel for selectedKelas
  const handleRestoreMapelMenu = () => {
    if (hiddenMapelNames.length === 0) {
      Swal.fire("Info", `Tidak ada mapel yang tersembunyi/dihapus untuk ${selectedKelas}.`, "info");
      return;
    }

    const options = hiddenMapelNames.reduce((acc, curr) => {
      acc[curr] = curr;
      return acc;
    }, {} as Record<string, string>);

    Swal.fire({
      title: `Pulihkan Mapel (${selectedKelas})`,
      text: "Pilih mata pelajaran yang ingin dikembalikan ke daftar aktif kelas ini:",
      input: "select",
      inputOptions: options,
      showCancelButton: true,
      confirmButtonText: "Pulihkan Mapel",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb"
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const restoredMapel = res.value;

        // Remove from hidden
        setHiddenMapelNames((prev) => {
          const updatedHidden = prev.filter((m) => m !== restoredMapel);
          try {
            const hiddenKey = `edadmin_hidden_raport_mapels_${selectedKelas}`;
            localStorage.setItem(hiddenKey, JSON.stringify(updatedHidden));
          } catch {}
          return updatedHidden;
        });

        // Add to selected
        setSelectedMapelNames((prev) => {
          const updatedSel = Array.from(new Set([...prev, restoredMapel]));
          try {
            const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
            localStorage.setItem(key, JSON.stringify(updatedSel));
          } catch {}
          return updatedSel;
        });

        Swal.fire({
          icon: "success",
          title: "Mapel Dipulihkan!",
          text: `Mapel "${restoredMapel}" telah dikembalikan ke ${selectedKelas}.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  // Select all mapels
  const handleSelectAllMapels = () => {
    setSelectedMapelNames([...classActiveMapelNames]);
    try {
      const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
      localStorage.setItem(key, JSON.stringify(classActiveMapelNames));
    } catch {}
  };

  // Deselect all (keep only first)
  const handleDeselectAllMapels = () => {
    if (classActiveMapelNames.length > 0) {
      const onlyFirst = [classActiveMapelNames[0]];
      setSelectedMapelNames(onlyFirst);
      try {
        const key = `edadmin_selected_raport_mapels_${selectedKelas}`;
        localStorage.setItem(key, JSON.stringify(onlyFirst));
      } catch {}
    }
  };

  // Manual Mapel Addition State & Handlers
  const [isAddMapelModalOpen, setIsAddMapelModalOpen] = useState(false);
  const [newMapelNama, setNewMapelNama] = useState("");
  const [newMapelSemester, setNewMapelSemester] = useState<"Ganjil" | "Genap">("Ganjil");

  const handleSaveNewMapel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newMapelNama.trim();
    if (!trimmed) {
      Swal.fire("Peringatan", "Silakan masukkan nama mata pelajaran baru.", "warning");
      return;
    }

    if (activeMapelNames.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      Swal.fire("Info", `Mata pelajaran "${trimmed}" sudah ada dalam daftar.`, "info");
      if (!selectedMapelNames.includes(trimmed)) {
        handleToggleMapel(trimmed);
      }
      setIsAddMapelModalOpen(false);
      setNewMapelNama("");
      return;
    }

    try {
      const id = Date.now().toString();
      const newMapelObj: Mapel = {
        id,
        namaMapel: trimmed,
        semester: newMapelSemester,
        tahunAjaran: selectedTahunAjaran
      };

      // 1. Save to Firestore COLLECTIONS.MAPEL for system-wide persistence
      await saveDocument(COLLECTIONS.MAPEL, id, newMapelObj);

      // 2. Add to local customMapels state & localStorage
      const updatedCustom = Array.from(new Set([...customMapels, trimmed]));
      setCustomMapels(updatedCustom);
      try {
        localStorage.setItem("edadmin_custom_raport_mapels", JSON.stringify(updatedCustom));
      } catch {}

      // 3. Auto-check this newly added mapel
      setSelectedMapelNames((prev) => {
        const next = Array.from(new Set([...prev, trimmed]));
        try {
          localStorage.setItem("edadmin_selected_raport_mapels", JSON.stringify(next));
        } catch {}
        return next;
      });

      // 4. Update in-memory raport records for all students
      const defaultDesc = generateDefaultDeskripsi(trimmed, 80);
      setRaportRecords((prev) => {
        const nextRecs = { ...prev };
        Object.keys(nextRecs).forEach((docId) => {
          const rec = nextRecs[docId];
          if (!rec.nilaiMapel.some((nm) => nm.mapel.toLowerCase() === trimmed.toLowerCase())) {
            nextRecs[docId] = {
              ...rec,
              nilaiMapel: [
                ...rec.nilaiMapel,
                {
                  mapel: trimmed,
                  kktp: 75,
                  nilaiAkhir: 80,
                  capaianKompetensiTinggi: defaultDesc.tinggi,
                  capaianKompetensiPerluBimbingan: defaultDesc.perluBimbingan,
                  deskripsi: defaultDesc.tinggi
                }
              ]
            };
          }
        });
        return nextRecs;
      });

      setIsAddMapelModalOpen(false);
      setNewMapelNama("");

      Swal.fire({
        icon: "success",
        title: "Mata Pelajaran Berhasil Ditambahkan!",
        text: `Mapel "${trimmed}" telah ditambahkan, langsung dicentang pada raport, dan tersimpan permanen di database sekolah.`,
        timer: 2300,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire("Gagal", "Gagal menyimpan mata pelajaran: " + (err?.message || "Error"), "error");
    }
  };

  // TP (Tujuan Pembelajaran) Bank & AI Generator State
  const [tpBank, setTpBank] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("edadmin_raport_tp_bank");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TP_TEMPLATES;
  });

  // Blacklist of deleted TP texts per mapel to ensure deleted items never reappear
  const [deletedTpTexts, setDeletedTpTexts] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem("edadmin_deleted_tp_texts");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const saveTpBank = (newBank: Record<string, string[]>) => {
    setTpBank(newBank);
    try {
      localStorage.setItem("edadmin_raport_tp_bank", JSON.stringify(newBank));
    } catch {}
  };

  const saveDeletedTpTexts = (newRecord: Record<string, string[]>) => {
    setDeletedTpTexts(newRecord);
    try {
      localStorage.setItem("edadmin_deleted_tp_texts", JSON.stringify(newRecord));
    } catch {}
  };

  // Combine Bank TP from Firestore strictly filtered by selectedKelas
  const effectiveTpBank = useMemo(() => {
    const combined: Record<string, string[]> = {};

    // 1. Initialize all active mapel names with empty arrays
    activeMapelNames.forEach((m) => {
      combined[m] = [];
    });
    DEFAULT_MAPEL_LIST.forEach((m) => {
      if (!combined[m]) combined[m] = [];
    });

    // 2. Merge Firestore Bank TP list (filtered strictly by active class)
    if (bankTpList && bankTpList.length > 0) {
      bankTpList.forEach((item) => {
        if (!item.mapel || !item.tujuanPembelajaran) return;

        // Flexible class filter: verify match with selectedKelas
        if (selectedKelas && !isMatchingClass(item.kelas, selectedKelas)) {
          return;
        }

        const tpText = item.tujuanPembelajaran.trim();

        if (!combined[item.mapel]) {
          combined[item.mapel] = [];
        }
        if (!combined[item.mapel].includes(tpText)) {
          combined[item.mapel].push(tpText);
        }

        activeMapelNames.forEach((targetMapel) => {
          if (isMatchingMapel(targetMapel, item.mapel)) {
            if (!combined[targetMapel]) {
              combined[targetMapel] = [];
            }
            if (!combined[targetMapel].includes(tpText)) {
              combined[targetMapel].push(tpText);
            }
          }
        });
      });
    }

    // 2b. Auto-populate from Kurikulum Merdeka Master TP per class if Bank TP is empty for this mapel
    activeMapelNames.forEach((m) => {
      if (!combined[m] || combined[m].length === 0) {
        combined[m] = getFallbackTpsForClassAndMapel(selectedKelas, m);
      }
    });
    DEFAULT_MAPEL_LIST.forEach((m) => {
      if (!combined[m] || combined[m].length === 0) {
        combined[m] = getFallbackTpsForClassAndMapel(selectedKelas, m);
      }
    });

    // 3. Strict exclusion filter for blacklisted deleted TPs
    Object.keys(combined).forEach((m) => {
      const deletedForThisMapel = (deletedTpTexts[m] || []).map((t) => t.toLowerCase().trim());
      const globalDeleted = (deletedTpTexts["_all_"] || []).map((t) => t.toLowerCase().trim());

      combined[m] = combined[m].filter((tp) => {
        const tpLower = tp.toLowerCase().trim();
        return !deletedForThisMapel.includes(tpLower) && !globalDeleted.includes(tpLower);
      });
    });

    return combined;
  }, [bankTpList, activeMapelNames, deletedTpTexts, selectedKelas]);

  const [isTpModalOpen, setIsTpModalOpen] = useState(false);
  const [activeTpMapel, setActiveTpMapel] = useState<string>(() => DEFAULT_MAPEL_LIST[0]);

  // Ensure activeTpMapel remains valid within displayMapelNames
  useEffect(() => {
    if (displayMapelNames.length > 0 && !displayMapelNames.includes(activeTpMapel)) {
      setActiveTpMapel(displayMapelNames[0]);
    }
  }, [displayMapelNames, activeTpMapel]);

  const [newTpText, setNewTpText] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSelectedStudentId, setAiSelectedStudentId] = useState<string>("all");
  const [aiPreviewTinggi, setAiPreviewTinggi] = useState("");
  const [aiPreviewBimbingan, setAiPreviewBimbingan] = useState("");

  const currentMapelTps = useMemo(() => {
    return effectiveTpBank[activeTpMapel] || [];
  }, [effectiveTpBank, activeTpMapel]);

  const handleAddTp = async () => {
    const trimmed = newTpText.trim();
    if (!trimmed) return;

    // Remove from blacklist if previously deleted
    const currentDeleted = deletedTpTexts[activeTpMapel] || [];
    if (currentDeleted.some((t) => t.toLowerCase().trim() === trimmed.toLowerCase())) {
      const updatedDeleted = currentDeleted.filter((t) => t.toLowerCase().trim() !== trimmed.toLowerCase());
      saveDeletedTpTexts({ ...deletedTpTexts, [activeTpMapel]: updatedDeleted });
    }

    const currentList = effectiveTpBank[activeTpMapel] || [];
    const updatedList = Array.from(new Set([...currentList, trimmed]));
    const updatedBank = { ...tpBank, [activeTpMapel]: updatedList };
    saveTpBank(updatedBank);

    // Sync to Firestore COLLECTIONS.BANK_TP so it's stored permanently in Bank TP!
    try {
      const tpId = `tp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newTpItem: BankTpItem = {
        id: tpId,
        mapel: activeTpMapel,
        kelas: selectedKelas,
        fase: getFaseByClass(selectedKelas),
        semester: currentPeriodeInfo.semester,
        tujuanPembelajaran: trimmed,
        kategori: "Tinggi",
        createdBy: currentUser?.nama || "Guru Pengampu",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await saveDocument(COLLECTIONS.BANK_TP, tpId, newTpItem);
    } catch (e) {
      console.warn("Failed to sync TP to Cloud Bank TP:", e);
    }

    setNewTpText("");
  };

  const handleDeleteTp = async (index: number) => {
    const targetText = currentMapelTps[index]?.trim();
    if (!targetText) return;

    // 1. Blacklist this TP text so default templates or Firestore merges won't restore it
    const currentDeleted = deletedTpTexts[activeTpMapel] || [];
    const newDeletedList = Array.from(new Set([...currentDeleted, targetText]));
    const updatedDeletedRecords = { ...deletedTpTexts, [activeTpMapel]: newDeletedList };
    saveDeletedTpTexts(updatedDeletedRecords);

    // 2. Remove from local tpBank
    const currentList = tpBank[activeTpMapel] || DEFAULT_TP_TEMPLATES[activeTpMapel] || [];
    const updatedList = currentList.filter((item) => item.trim().toLowerCase() !== targetText.toLowerCase());
    const updatedBank = { ...tpBank, [activeTpMapel]: updatedList };
    saveTpBank(updatedBank);

    // 3. Delete matching entries from Cloud Firestore COLLECTIONS.BANK_TP
    if (bankTpList && bankTpList.length > 0) {
      const matchingDocs = bankTpList.filter(
        (b) => b.tujuanPembelajaran?.trim().toLowerCase() === targetText.toLowerCase()
      );
      for (const doc of matchingDocs) {
        try {
          await deleteDocument(COLLECTIONS.BANK_TP, doc.id);
        } catch (err) {
          console.warn("Error deleting Firestore TP document:", err);
        }
      }
    }
  };

  const handleLoadDefaultTps = () => {
    const defaultForThis = DEFAULT_TP_TEMPLATES[activeTpMapel] || [
      `Memahami konsep pokok dan materi utama ${activeTpMapel}.`,
      `Menerapkan pemahaman materi dalam menyelesaikan masalah kontekstual.`,
      `Menunjukkan sikap mandiri dan bernalar kritis pada ${activeTpMapel}.`
    ];

    // Clear blacklist for this active mapel so defaults can be restored
    const updatedDeleted = { ...deletedTpTexts, [activeTpMapel]: [] };
    saveDeletedTpTexts(updatedDeleted);

    const updatedBank = { ...tpBank, [activeTpMapel]: defaultForThis };
    saveTpBank(updatedBank);

    Swal.fire({
      icon: "success",
      title: "Contoh TP Kurikulum Merdeka Dimuat!",
      text: `Contoh Tujuan Pembelajaran untuk ${activeTpMapel} berhasil dimuat.`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // AI Generator Function inside Modal
  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      const currentTps = currentMapelTps;

      if (aiSelectedStudentId === "all") {
        const studentsPayload = classStudents.map((s) => {
          const rec = getRaportForStudent(s);
          const mapelObj = rec.nilaiMapel.find((nm) => nm.mapel.toLowerCase() === activeTpMapel.toLowerCase());
          const score = typeof mapelObj?.nilaiAkhir === "number" ? mapelObj.nilaiAkhir : 80;
          return {
            id: s.id,
            nama: s.nama,
            nilai: score
          };
        });

        let results: Array<{ id: string; capaianTinggi: string; perluBimbingan: string }> = [];

        try {
          const resp = await fetch("/api/ai/generate-deskripsi-raport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mapel: activeTpMapel,
              kelas: selectedKelas,
              fase: getFaseByClass(selectedKelas),
              tujuanPembelajaran: currentTps,
              students: studentsPayload
            })
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.status === "success" && Array.isArray(data.results)) {
              results = data.results;
            }
          }
        } catch (e) {
          console.warn("AI server error, using fallback:", e);
        }

        if (results.length === 0) {
          results = studentsPayload.map((s) => {
            const studentItem = classStudents.find((st) => st.id === s.id);
            const sKelas = studentItem?.kelas || selectedKelas;
            const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, activeTpMapel) && isMatchingClass(b.kelas, sKelas));
            const fb = generateFallbackDeskripsiFromTp(activeTpMapel, s.nilai, currentTps, mapelBankItems, sKelas, 75);
            return {
              id: s.id,
              capaianTinggi: fb.tinggi,
              perluBimbingan: fb.perluBimbingan
            };
          });
        }

        const newRecords = { ...raportRecords };
        results.forEach((res) => {
          const student = classStudents.find((s) => s.id === res.id);
          if (!student) return;
          const currentRec = getRaportForStudent(student);
          const updatedNilai = currentRec.nilaiMapel.map((nm) => {
            if (nm.mapel.toLowerCase() === activeTpMapel.toLowerCase()) {
              return {
                ...nm,
                capaianKompetensiTinggi: res.capaianTinggi,
                capaianKompetensiPerluBimbingan: res.perluBimbingan,
                deskripsi: res.capaianTinggi
              };
            }
            return nm;
          });
          newRecords[currentRec.id] = {
            ...currentRec,
            nilaiMapel: updatedNilai,
            updatedAt: Date.now()
          };
        });

        setRaportRecords(newRecords);
        Swal.fire({
          icon: "success",
          title: "Generate AI Berhasil!",
          text: `Deskripsi capaian berbasis TP untuk ${results.length} siswa pada mata pelajaran ${activeTpMapel} berhasil diterapkan ke raport!`,
          confirmButtonColor: "#2563eb"
        });
      } else {
        const targetStudent = classStudents.find((s) => s.id === aiSelectedStudentId);
        if (!targetStudent) return;
        const currentRec = getRaportForStudent(targetStudent);
        const mapelObj = currentRec.nilaiMapel.find((nm) => nm.mapel.toLowerCase() === activeTpMapel.toLowerCase());
        const score = typeof mapelObj?.nilaiAkhir === "number" ? mapelObj.nilaiAkhir : 80;

        let resTinggi = "";
        let resBimbingan = "";

        try {
          const resp = await fetch("/api/ai/generate-deskripsi-raport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mapel: activeTpMapel,
              kelas: selectedKelas,
              fase: getFaseByClass(selectedKelas),
              tujuanPembelajaran: currentTps,
              nilai: score,
              namaSiswa: targetStudent.nama
            })
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data.status === "success") {
              resTinggi = data.capaianTinggi;
              resBimbingan = data.perluBimbingan;
            }
          }
        } catch (e) {
          console.warn("AI server error, using fallback:", e);
        }

        if (!resTinggi) {
          const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, activeTpMapel) && isMatchingClass(b.kelas, targetStudent.kelas));
          const fb = generateFallbackDeskripsiFromTp(activeTpMapel, score, currentTps, mapelBankItems, targetStudent.kelas, 75);
          resTinggi = fb.tinggi;
          resBimbingan = fb.perluBimbingan;
        }

        setAiPreviewTinggi(resTinggi);
        setAiPreviewBimbingan(resBimbingan);
      }
    } catch (err: any) {
      Swal.fire("Error", "Gagal generate AI: " + (err?.message || "Error"), "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplySingleAiToRaport = () => {
    const targetStudent = classStudents.find((s) => s.id === aiSelectedStudentId);
    if (!targetStudent) return;
    const currentRec = getRaportForStudent(targetStudent);
    const updatedNilai = currentRec.nilaiMapel.map((nm) => {
      if (nm.mapel.toLowerCase() === activeTpMapel.toLowerCase()) {
        return {
          ...nm,
          capaianKompetensiTinggi: aiPreviewTinggi,
          capaianKompetensiPerluBimbingan: aiPreviewBimbingan,
          deskripsi: aiPreviewTinggi
        };
      }
      return nm;
    });

    handleUpdateRaportRecord({
      ...currentRec,
      nilaiMapel: updatedNilai,
      updatedAt: Date.now()
    });

    Swal.fire({
      icon: "success",
      title: "Deskripsi Diterapkan!",
      text: `Deskripsi capaian siswa ${targetStudent.nama} berhasil diperbarui.`,
      timer: 1600,
      showConfirmButton: false
    });
  };

  // Quick single-student AI generator for Input tab
  const handleQuickStudentAiDeskripsi = async (student: Siswa, mapelName: string, currentScore: number) => {
    const tps = tpBank[mapelName] || DEFAULT_TP_TEMPLATES[mapelName] || [];
    let tinggi = "";
    let bimbingan = "";

    try {
      const resp = await fetch("/api/ai/generate-deskripsi-raport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapel: mapelName,
          kelas: selectedKelas,
          fase: getFaseByClass(selectedKelas),
          tujuanPembelajaran: tps,
          nilai: currentScore,
          namaSiswa: student.nama
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === "success") {
          tinggi = data.capaianTinggi;
          bimbingan = data.perluBimbingan;
        }
      }
    } catch {}

    if (!tinggi) {
      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, mapelName) && isMatchingClass(b.kelas, student.kelas));
      const fb = generateFallbackDeskripsiFromTp(mapelName, currentScore, tps, mapelBankItems, student.kelas, 75);
      tinggi = fb.tinggi;
      bimbingan = fb.perluBimbingan;
    }

    const currentRec = getRaportForStudent(student);
    const updatedNilai = currentRec.nilaiMapel.map((nm) => {
      if (nm.mapel.toLowerCase() === mapelName.toLowerCase()) {
        return {
          ...nm,
          capaianKompetensiTinggi: tinggi,
          capaianKompetensiPerluBimbingan: bimbingan,
          deskripsi: tinggi
        };
      }
      return nm;
    });

    handleUpdateRaportRecord({
      ...currentRec,
      nilaiMapel: updatedNilai,
      updatedAt: Date.now()
    });

    Swal.fire({
      icon: "success",
      title: "Deskripsi AI Diterapkan!",
      text: `Deskripsi capaian ${mapelName} untuk ${student.nama} berhasil dibuat berbasis TP.`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Compute attendance stats from logAbsensiList
  const attendanceMap = useMemo(() => {
    const map: { [siswaId: string]: { sakit: number; izin: number; alpa: number } } = {};
    classStudents.forEach((s) => {
      map[s.id] = { sakit: 0, izin: 0, alpa: 0 };
    });

    logAbsensiList.forEach((log) => {
      if (log.kelas === selectedKelas && map[log.idSiswa]) {
        if (log.status === "Sakit") map[log.idSiswa].sakit += 1;
        else if (log.status === "Izin") map[log.idSiswa].izin += 1;
        else if (log.status === "Alpa") map[log.idSiswa].alpa += 1;
      }
    });

    return map;
  }, [logAbsensiList, selectedKelas, classStudents]);

  // Compute grade averages from dataNilaiList
  const gradeMap = useMemo(() => {
    const map: { [siswaId: string]: { [mapel: string]: number[] } } = {};
    classStudents.forEach((s) => {
      map[s.id] = {};
      activeMapelNames.forEach((m) => {
        map[s.id][m] = [];
      });
    });

    dataNilaiList.forEach((dn) => {
      if (dn.kelas === selectedKelas && map[dn.idSiswa] && typeof dn.nilai === "number") {
        if (!map[dn.idSiswa][dn.mapel]) {
          map[dn.idSiswa][dn.mapel] = [];
        }
        map[dn.idSiswa][dn.mapel].push(dn.nilai);
      }
    });

    return map;
  }, [dataNilaiList, selectedKelas, classStudents, activeMapelNames]);

  // Build or Get Raport Record for a Student with full cloud & local persistence
  const getRaportForStudent = (siswa: Siswa): RaportRecord => {
    const cleanTahun = selectedTahunAjaran.replace(/\//g, "-");
    const primaryDocId = `raport_${siswa.id}_${cleanTahun}_${selectedPeriode}`;
    const altDocId1 = `raport_${siswa.id}_${selectedPeriode}_${cleanTahun}`;
    const altDocId2 = `raport_${siswa.id}_${selectedPeriode}`;
    const altDocId3 = `raport_${siswa.id}`;

    // Otomatis memperbarui deskripsi secara real-time dari seluruh TP Bank TP kelas & mapel
    const upgradeRaportNilaiMapel = (record: RaportRecord): RaportRecord => {
      if (!record || !Array.isArray(record.nilaiMapel)) return record;
      let hasChanges = false;
      const updatedNilaiMapel = record.nilaiMapel.map((nm) => {
        const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
        const scoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
        const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, nm.mapel) && isMatchingClass(b.kelas, siswa.kelas));
        const currentTps = effectiveTpBank[nm.mapel] || getFallbackTpsForClassAndMapel(siswa.kelas, nm.mapel);
        const desc = generateFallbackDeskripsiFromTp(nm.mapel, scoreVal, currentTps, mapelBankItems, siswa.kelas, kktpVal);

        const currentTinggi = (nm.capaianKompetensiTinggi || nm.deskripsi || "").trim();
        const currentBimbingan = (nm.capaianKompetensiPerluBimbingan || "").trim();

        const isTuntas = scoreVal >= kktpVal;
        const isMismatchWithScore = isTuntas
          ? !currentTinggi.startsWith("Menunjukkan penguasaan sangat baik dalam")
          : !currentTinggi.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam");

        const needsTinggi = isMismatchWithScore || shouldRefreshDeskripsi(currentTinggi, desc.tinggi, mapelBankItems?.length || 0);
        const needsBimbingan = shouldRefreshDeskripsi(currentBimbingan, desc.perluBimbingan, mapelBankItems?.length || 0);

        if (needsTinggi || needsBimbingan) {
          hasChanges = true;
          return {
            ...nm,
            nilaiAkhir: scoreVal,
            kktp: kktpVal,
            capaianKompetensiTinggi: needsTinggi ? desc.tinggi : (currentTinggi || desc.tinggi),
            capaianKompetensiPerluBimbingan: needsBimbingan ? desc.perluBimbingan : (currentBimbingan || desc.perluBimbingan),
            deskripsi: needsTinggi ? desc.tinggi : (nm.deskripsi || desc.tinggi)
          };
        }
        return nm;
      });

      return hasChanges ? { ...record, nilaiMapel: updatedNilaiMapel } : record;
    };

    // 1. Check in-memory state for any matching key
    if (raportRecords[primaryDocId]) return upgradeRaportNilaiMapel(raportRecords[primaryDocId]);
    if (raportRecords[altDocId1]) return upgradeRaportNilaiMapel({ ...raportRecords[altDocId1], id: primaryDocId });
    if (raportRecords[altDocId2]) return upgradeRaportNilaiMapel({ ...raportRecords[altDocId2], id: primaryDocId });
    if (raportRecords[altDocId3]) return upgradeRaportNilaiMapel({ ...raportRecords[altDocId3], id: primaryDocId });

    // 1b. Search in-memory state values for matching student ID & period
    const foundInState = Object.values(raportRecords).find(
      (r: RaportRecord) => r && r.idSiswa === siswa.id && (r.periode === selectedPeriode || !r.periode)
    );
    if (foundInState) {
      return upgradeRaportNilaiMapel({ ...(foundInState as RaportRecord), id: primaryDocId });
    }

    // 2. Check localStorage cache
    try {
      const cachedStr = localStorage.getItem("edadmin_persisted_raport_records");
      if (cachedStr) {
        const cachedMap = JSON.parse(cachedStr);
        if (cachedMap[primaryDocId]) return upgradeRaportNilaiMapel(cachedMap[primaryDocId]);
        if (cachedMap[altDocId1]) return upgradeRaportNilaiMapel({ ...cachedMap[altDocId1], id: primaryDocId });
        if (cachedMap[altDocId2]) return upgradeRaportNilaiMapel({ ...cachedMap[altDocId2], id: primaryDocId });

        const foundInCache = Object.values(cachedMap).find(
          (r: any) => r && r.idSiswa === siswa.id && (r.periode === selectedPeriode || !r.periode)
        ) as RaportRecord | undefined;
        if (foundInCache) {
          return upgradeRaportNilaiMapel({ ...foundInCache, id: primaryDocId });
        }
      }
    } catch {}

    // 3. Check if exists in bukuIndukList (cloud data)
    const existingBiDoc = bukuIndukList?.find(
      (b: any) =>
        (b.id === primaryDocId || b.id === altDocId1 || b.id === altDocId2 || b.id === altDocId3 || (b.idSiswa === siswa.id && (b.periode === selectedPeriode || !b.periode))) &&
        Array.isArray(b.nilaiMapel) &&
        b.nilaiMapel.length > 0
    ) as RaportRecord | undefined;

    if (existingBiDoc && Array.isArray(existingBiDoc.nilaiMapel) && existingBiDoc.nilaiMapel.length > 0) {
      return upgradeRaportNilaiMapel({
        ...existingBiDoc,
        id: primaryDocId,
        tahunAjaran: selectedTahunAjaran
      });
    }

    // 4. Fallback baseline: only generated if never saved before
    const existingBi = bukuIndukList?.find((b) => b.idSiswa === siswa.id);
    const existingBiRaport = existingBi?.raport;

    const att = attendanceMap[siswa.id] || { sakit: 0, izin: 0, alpa: 0 };
    const studentGrades = gradeMap[siswa.id] || {};

    const nilaiMapel = activeMapelNames.map((mapel) => {
      const grades = studentGrades[mapel] || [];
      let finalVal: number = 80; // default baseline

      if (grades.length > 0) {
        const sum = grades.reduce((a, b) => a + b, 0);
        finalVal = Math.round(sum / grades.length);
      } else if (existingBiRaport?.nilaiPengetahuan) {
        const matched = existingBiRaport.nilaiPengetahuan.find(
          (np) => np.namaMapel.toLowerCase() === mapel.toLowerCase()
        );
        if (matched && typeof matched.nilai === "number") {
          finalVal = matched.nilai;
        }
      }

      // Check if we have Bank TP for this mapel & class (Solusi B)
      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, mapel) && isMatchingClass(b.kelas, siswa.kelas));
      const availableTps = effectiveTpBank[mapel] || getFallbackTpsForClassAndMapel(siswa.kelas, mapel);
      const desc = generateFallbackDeskripsiFromTp(mapel, finalVal, availableTps, mapelBankItems, siswa.kelas, 75);

      return {
        mapel,
        kktp: 75,
        nilaiAkhir: finalVal,
        capaianKompetensiTinggi: desc.tinggi,
        capaianKompetensiPerluBimbingan: desc.perluBimbingan,
        deskripsi: desc.tinggi
      };
    });

    const isSemesterGenap = currentPeriodeInfo.semester === "Genap";
    const nextClassNum = parseInt(siswa.kelas.replace(/[^0-9]/g, "") || "1", 10) + 1;
    const nextClassStr = nextClassNum <= 6 ? `Kelas ${nextClassNum}` : "Jenjang Lanjutan (SMP/MTs)";

    return {
      id: primaryDocId,
      idSiswa: siswa.id,
      nisn: siswa.nisn || "-",
      nis: siswa.nis || "-",
      namaSiswa: siswa.nama,
      kelas: siswa.kelas,
      fase: getFaseByClass(siswa.kelas),
      periode: selectedPeriode,
      periodeNama: currentPeriodeInfo.label,
      semester: currentPeriodeInfo.semester,
      tahunAjaran: selectedTahunAjaran,
      tanggalRaport: existingBiRaport?.tanggalRaport || tanggalRaport,
      tempatTitimangsa: existingBiRaport?.tempatTitimangsa || tempatTitimangsa,
      nilaiMapel,
      ekskul: [
        { nama: "Pramuka", predikat: "A", keterangan: "Sangat aktif, disiplin, dan memiliki jiwa kepemimpinan yang baik." },
        { nama: "Pencak Silat", predikat: "B", keterangan: "Menguasai gerakan dasar seni beladiri dengan baik." }
      ],
      prestasi: [],
      kehadiran: {
        sakit: typeof existingBiRaport?.sakit === "number" ? existingBiRaport.sakit : att.sakit,
        izin: typeof existingBiRaport?.izin === "number" ? existingBiRaport.izin : att.izin,
        alpa: typeof existingBiRaport?.alpa === "number" ? existingBiRaport.alpa : att.alpa
      },
      catatanWaliKelas: `Ananda ${siswa.nama} menunjukkan perkembangan sikap belajar yang sangat membanggakan. Teruslah rajin membaca, aktif berdiskusi di kelas, dan pertahankan semangat belajarmu!`,
      statusKenaikan: isSemesterGenap ? {
        status: "Naik Kelas",
        keKelas: nextClassStr
      } : undefined,
      namaGuruWali: currentUser?.nama || config.Nama_Guru || "Eri Iriana Rifai, S.Kom.",
      nipGuruWali: currentUser?.nip || config.NIP_Guru || "-",
      namaKepsek: config.Nama_Kepsek || "SUBUR, S.Pd.SD.",
      nipKepsek: config.NIP_Kepsek || "197002111993081001"
    };
  };

  // Update a single student record in state with instant local caching & debounced cloud auto-save
  const handleUpdateRaportRecord = (updated: RaportRecord) => {
    const cleanTahun = (updated.tahunAjaran || selectedTahunAjaran).replace(/\//g, "-");
    const primaryId = `raport_${updated.idSiswa}_${cleanTahun}_${updated.periode || selectedPeriode}`;
    const altId1 = `raport_${updated.idSiswa}_${updated.periode || selectedPeriode}_${cleanTahun}`;
    const altId2 = `raport_${updated.idSiswa}_${updated.periode || selectedPeriode}`;

    const withTimestamp: RaportRecord = {
      ...updated,
      id: primaryId,
      updatedAt: Date.now()
    };

    // 1. Instant state & localStorage persistence (survives any page reload/close)
    setRaportRecords((prev) => {
      const next = {
        ...prev,
        [primaryId]: withTimestamp,
        [altId1]: withTimestamp,
        [altId2]: withTimestamp
      };
      try {
        localStorage.setItem("edadmin_persisted_raport_records", JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. Debounced auto-save to Firestore (1.2s)
    if (saveTimeoutRef.current[primaryId]) {
      clearTimeout(saveTimeoutRef.current[primaryId]);
    }

    saveTimeoutRef.current[primaryId] = setTimeout(async () => {
      try {
        await saveDocument(COLLECTIONS.RAPORT_RECORDS, primaryId, withTimestamp as any);
        await saveDocument(COLLECTIONS.RAPORT_RECORDS, altId1, withTimestamp as any);
        await saveDocument(COLLECTIONS.BUKU_INDUK, primaryId, withTimestamp as any);
        await saveDocument(COLLECTIONS.BUKU_INDUK, altId1, withTimestamp as any);
        await saveDocument(COLLECTIONS.BUKU_INDUK, altId2, withTimestamp as any);
        setLastAutoSaveTime(Date.now());
      } catch (e) {
        console.warn("Auto-save raport error:", e);
      }
    }, 1200);
  };

  // Save changes to Firestore
  const handleSaveAllChanges = async () => {
    setIsSaving(true);
    try {
      const recordsToSave: RaportRecord[] = classStudents.map((s) => getRaportForStudent(s));

      for (const rec of recordsToSave) {
        const cleanTahun = (rec.tahunAjaran || selectedTahunAjaran).replace(/\//g, "-");
        const fullDocId = `raport_${rec.idSiswa}_${cleanTahun}_${rec.periode || selectedPeriode}`;
        const altDocId = `raport_${rec.idSiswa}_${rec.periode || selectedPeriode}_${cleanTahun}`;
        const legacyDocId = `raport_${rec.idSiswa}_${rec.periode || selectedPeriode}`;

        const recWithTs = { ...rec, id: fullDocId, updatedAt: Date.now() };

        await saveDocument(COLLECTIONS.RAPORT_RECORDS, fullDocId, recWithTs as any);
        await saveDocument(COLLECTIONS.RAPORT_RECORDS, altDocId, recWithTs as any);
        await saveDocument(COLLECTIONS.BUKU_INDUK, fullDocId, recWithTs as any);
        await saveDocument(COLLECTIONS.BUKU_INDUK, altDocId, recWithTs as any);
        await saveDocument(COLLECTIONS.BUKU_INDUK, legacyDocId, recWithTs as any);
      }

      // Update local storage and in-memory map under all aliases
      const updatedMap = { ...raportRecords };
      recordsToSave.forEach((r) => {
        const cleanTahun = (r.tahunAjaran || selectedTahunAjaran).replace(/\//g, "-");
        const pId = `raport_${r.idSiswa}_${cleanTahun}_${r.periode || selectedPeriode}`;
        const aId1 = `raport_${r.idSiswa}_${r.periode || selectedPeriode}_${cleanTahun}`;
        const aId2 = `raport_${r.idSiswa}_${r.periode || selectedPeriode}`;
        const rWithTs = { ...r, id: pId };
        updatedMap[pId] = rWithTs;
        updatedMap[aId1] = rWithTs;
        updatedMap[aId2] = rWithTs;
      });
      setRaportRecords(updatedMap);
      try {
        localStorage.setItem("edadmin_persisted_raport_records", JSON.stringify(updatedMap));
      } catch {}

      setLastAutoSaveTime(Date.now());
      notifySimpanSuccess("Data nilai dan Tujuan Pembelajaran raport berhasil disimpan permanen ke database!");
    } catch (err: any) {
      notifySimpanError("Gagal menyimpan data raport: " + (err?.message || "Error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Sesuaikan Semua TP Seluruh Siswa Otomatis Berdasarkan Nilai Masing-masing & Bank TP
  const handleBatchSyncAllTpWithNilai = () => {
    if (classStudents.length === 0) {
      Swal.fire("Info", "Tidak ada siswa di kelas ini.", "info");
      return;
    }

    Swal.fire({
      title: "Sesuaikan Semua TP dengan Nilai Siswa?",
      text: `Deskripsi Capaian Tertinggi & Perlu Bimbingan untuk ${classStudents.length} siswa di Kelas ${selectedKelas} akan otomatis disesuaikan secara cerdas dengan nilai yang didapat masing-masing siswa berdasarkan Bank TP.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "⚡ Ya, Sesuaikan Otomatis!",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        const nextRecords = { ...raportRecords };
        let updatedStudentsCount = 0;

        classStudents.forEach((student) => {
          const currentRec = getRaportForStudent(student);
          const updatedNilaiMapel = currentRec.nilaiMapel.map((nm) => {
            const scoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
            const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
            const currentTps = effectiveTpBank[nm.mapel] || getFallbackTpsForClassAndMapel(student.kelas, nm.mapel);
            const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, nm.mapel) && isMatchingClass(b.kelas, student.kelas));
            const desc = generateFallbackDeskripsiFromTp(nm.mapel, scoreVal, currentTps, mapelBankItems, student.kelas, kktpVal);

            return {
              ...nm,
              capaianKompetensiTinggi: desc.tinggi,
              capaianKompetensiPerluBimbingan: desc.perluBimbingan,
              deskripsi: desc.tinggi
            };
          });

          const cleanTahun = selectedTahunAjaran.replace(/\//g, "-");
          const primaryId = `raport_${student.id}_${cleanTahun}_${selectedPeriode}`;
          const altId1 = `raport_${student.id}_${selectedPeriode}_${cleanTahun}`;
          const altId2 = `raport_${student.id}_${selectedPeriode}`;

          const recWithTs = {
            ...currentRec,
            id: primaryId,
            nilaiMapel: updatedNilaiMapel,
            updatedAt: Date.now()
          };

          nextRecords[primaryId] = recWithTs;
          nextRecords[altId1] = recWithTs;
          nextRecords[altId2] = recWithTs;

          // Save synchronously to Firestore so changes persist across deploys and refreshes
          saveDocument(COLLECTIONS.RAPORT_RECORDS, primaryId, recWithTs as any);
          saveDocument(COLLECTIONS.RAPORT_RECORDS, altId1, recWithTs as any);
          saveDocument(COLLECTIONS.BUKU_INDUK, primaryId, recWithTs as any);
          saveDocument(COLLECTIONS.BUKU_INDUK, altId1, recWithTs as any);
          saveDocument(COLLECTIONS.BUKU_INDUK, altId2, recWithTs as any);

          updatedStudentsCount++;
        });

        setRaportRecords(nextRecords);
        try {
          localStorage.setItem("edadmin_persisted_raport_records", JSON.stringify(nextRecords));
        } catch {}

        Swal.fire({
          icon: "success",
          title: "Semua TP Berhasil Disesuaikan!",
          text: `TP untuk ${updatedStudentsCount} siswa di kelas ${selectedKelas} telah diselaraskan dengan nilai masing-masing berdasarkan Bank TP. Klik "Simpan Semua Perubahan" untuk mematrikannya ke Cloud.`,
          timer: 2500,
          showConfirmButton: false
        });
      }
    });
  };

  // Download Excel Template for Raport
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const targetMapelList = displayMapelNames.length > 0 ? displayMapelNames : activeMapelNames;

      // Sheet 1: Data Nilai & Raport Siswa
      const headers = [
        "No",
        "NISN",
        "NIS",
        "Nama Siswa",
        "Kelas",
        ...targetMapelList,
        "Sakit",
        "Izin",
        "Alpa",
        "Catatan Wali Kelas",
        "Status Kenaikan (Khusus Semester Genap: Naik Kelas / Lulus)"
      ];

      const dataRows = classStudents.map((s, idx) => {
        const studentRaport = getRaportForStudent(s);
        const mapelScores = targetMapelList.map((m) => {
          const matched = studentRaport.nilaiMapel.find((nm) => nm.mapel.toLowerCase() === m.toLowerCase());
          return matched ? matched.nilaiAkhir : 80;
        });

        return [
          idx + 1,
          s.nisn || "-",
          s.nis || "-",
          s.nama,
          s.kelas,
          ...mapelScores,
          studentRaport.kehadiran.sakit,
          studentRaport.kehadiran.izin,
          studentRaport.kehadiran.alpa,
          studentRaport.catatanWaliKelas,
          studentRaport.statusKenaikan ? `${studentRaport.statusKenaikan.status} ke ${studentRaport.statusKenaikan.keKelas || ''}` : "Naik Kelas"
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Set column widths
      ws["!cols"] = [
        { wch: 5 },  // No
        { wch: 14 }, // NISN
        { wch: 10 }, // NIS
        { wch: 28 }, // Nama Siswa
        { wch: 10 }, // Kelas
        ...targetMapelList.map(() => ({ wch: 16 })),
        { wch: 8 },  // Sakit
        { wch: 8 },  // Izin
        { wch: 8 },  // Alpa
        { wch: 45 }, // Catatan Wali Kelas
        { wch: 30 }  // Kenaikan
      ];

      XLSX.utils.book_append_sheet(wb, ws, "DATA_NILAI_RAPORT");

      // Sheet 2: Petunjuk Pengisian
      const instructions = [
        ["PANDUAN & PETUNJUK PENGISIAN TEMPLATE EXCEL NILAI RAPORT"],
        [""],
        ["1. Format Kolom:", "Harap jangan mengubah susunan nama kolom di baris pertama."],
        ["2. Kolom Nilai:", "Isikan angka nilai bulat skala 0-100 pada setiap mata pelajaran."],
        ["3. Kolom Absensi:", "Isikan angka jumlah hari ketidakhadiran siswa (Sakit, Izin, Alpa)."],
        ["4. Catatan Wali Kelas:", "Tuliskan narasi motivasi atau catatan perkembangan belajar siswa."],
        ["5. Periode Raport:", `${currentPeriodeInfo.label} (${selectedTahunAjaran})`],
        ["6. Sekolah:", config.Nama_Sekolah || "SD Negeri Babakan 04"],
        ["7. Simpan File:", "Simpan file dalam format .xlsx atau .xls lalu upload di menu 'Import Excel' pada aplikasi."]
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
      wsInfo["!cols"] = [{ wch: 25 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsInfo, "PETUNJUK_PENGISIAN");

      const cleanKelas = selectedKelas.replace(/\s+/g, "_");
      const cleanPeriode = currentPeriodeInfo.short.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Template_Nilai_Raport_${cleanKelas}_${cleanPeriode}_${selectedTahunAjaran.replace(/\//g, "-")}.xlsx`;

      XLSX.writeFile(wb, filename);
      notifyUnduhSuccess(`Template Excel Raport (${selectedKelas}) berhasil diunduh!`);
    } catch (err: any) {
      notifyUnduhError("Gagal mengunduh template Excel: " + (err?.message || "Error"));
    }
  };

  // Handle File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rawJson.length < 2) {
          Swal.fire({
            icon: "warning",
            title: "File Kosong / Format Salah",
            text: "File Excel tidak memiliki baris data yang cukup.",
            confirmButtonColor: "#2563eb"
          });
          return;
        }

        const headerRow: string[] = rawJson[0].map((h: any) => String(h || "").trim());
        const dataRows = rawJson.slice(1);

        const parsedList: any[] = [];
        const errors: string[] = [];

        dataRows.forEach((row, rowIdx) => {
          if (!row || row.length === 0 || !row[3]) return; // Skip empty rows

          const rowObj: any = {};
          headerRow.forEach((h, colIdx) => {
            rowObj[h] = row[colIdx];
          });

          // Match student by Nama or NISN
          const rawNama = String(rowObj["Nama Siswa"] || rowObj["Nama"] || row[3] || "").trim();
          const rawNisn = String(rowObj["NISN"] || row[1] || "").trim();
          
          const matchedStudent = classStudents.find(
            (s) => (rawNisn && s.nisn === rawNisn) || s.nama.toLowerCase() === rawNama.toLowerCase()
          );

          if (!matchedStudent) {
            errors.push(`Baris ${rowIdx + 2}: Siswa "${rawNama}" tidak ditemukan di ${selectedKelas}`);
          }

          parsedList.push({
            rowNumber: rowIdx + 2,
            namaSiswa: rawNama,
            nisn: rawNisn,
            matchedStudent,
            data: rowObj
          });
        });

        setImportPreviewData(parsedList);
        setImportErrors(errors);
        setIsImportModalOpen(true);
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Gagal Membaca File Excel",
          text: err?.message || "Pastikan format file .xlsx atau .xls valid.",
          confirmButtonColor: "#ef4444"
        });
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input value
    e.target.value = "";
  };

  // Commit Imported Data into Raport Records
  const handleCommitImport = () => {
    if (importPreviewData.length === 0) return;

    let updatedCount = 0;
    const newRecords = { ...raportRecords };

    importPreviewData.forEach((item) => {
      const student: Siswa = item.matchedStudent || classStudents.find((s) => s.nama.toLowerCase() === item.namaSiswa.toLowerCase());
      if (!student) return;

      const currentRaport = getRaportForStudent(student);
      const rowData = item.data;

      // Extract subject scores
      const updatedNilaiMapel = currentRaport.nilaiMapel.map((nm) => {
        // Look up key in rowData
        let scoreVal: any = undefined;
        for (const k of Object.keys(rowData)) {
          if (k.toLowerCase().includes(nm.mapel.toLowerCase()) || nm.mapel.toLowerCase().includes(k.toLowerCase())) {
            scoreVal = rowData[k];
            break;
          }
        }

        const numericScore = typeof scoreVal === "number" ? scoreVal : parseInt(String(scoreVal || nm.nilaiAkhir), 10);
        const finalScore = isNaN(numericScore) ? nm.nilaiAkhir : Math.min(100, Math.max(0, numericScore));
        const desc = generateDefaultDeskripsi(nm.mapel, Number(finalScore));

        return {
          ...nm,
          nilaiAkhir: finalScore,
          capaianKompetensiTinggi: desc.tinggi,
          capaianKompetensiPerluBimbingan: desc.perluBimbingan
        };
      });

      // Extract attendance
      const sakit = parseInt(String(rowData["Sakit"] || currentRaport.kehadiran.sakit), 10) || 0;
      const izin = parseInt(String(rowData["Izin"] || currentRaport.kehadiran.izin), 10) || 0;
      const alpa = parseInt(String(rowData["Alpa"] || currentRaport.kehadiran.alpa), 10) || 0;

      // Catatan Wali
      const catatan = rowData["Catatan Wali Kelas"] || rowData["Catatan"] || currentRaport.catatanWaliKelas;

      const updatedRecord: RaportRecord = {
        ...currentRaport,
        nilaiMapel: updatedNilaiMapel,
        kehadiran: { sakit, izin, alpa },
        catatanWaliKelas: catatan,
        updatedAt: Date.now()
      };

      newRecords[updatedRecord.id] = updatedRecord;
      updatedCount++;
    });

    setRaportRecords(newRecords);
    setIsImportModalOpen(false);

    Swal.fire({
      icon: "success",
      title: "Import Data Berhasil!",
      text: `Berhasil mengimpor nilai dan catatan untuk ${updatedCount} siswa di ${selectedKelas}. Silakan tinjau dan klik 'Simpan Perubahan' untuk menyimpan permanen.`,
      confirmButtonColor: "#2563eb"
    });
  };

  // Export Class Leger to Excel
  const handleExportLegerExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const displayMapelList = displayMapelNames.length > 0 ? displayMapelNames : activeMapelNames;

      const headers = [
        "No",
        "NISN",
        "NIS",
        "Nama Siswa",
        "L/P",
        ...displayMapelList,
        "Total Nilai",
        "Rata-Rata",
        "Ranking",
        "Sakit",
        "Izin",
        "Alpa",
        "Status Kenaikan"
      ];

      // Calculate totals and ranks
      const studentStats = classStudents.map((s, idx) => {
        const studentRaport = getRaportForStudent(s);
        const mapelScores = displayMapelList.map((m) => {
          const matched = studentRaport.nilaiMapel.find((nm) => nm.mapel.toLowerCase() === m.toLowerCase());
          return typeof matched?.nilaiAkhir === "number" ? matched.nilaiAkhir : Number(matched?.nilaiAkhir || 80);
        });

        const total = mapelScores.reduce((a, b) => a + b, 0);
        const avg = Math.round((total / (mapelScores.length || 1)) * 10) / 10;

        return {
          idx: idx + 1,
          nisn: s.nisn || "-",
          nis: s.nis || "-",
          nama: s.nama,
          jk: "-",
          scores: mapelScores,
          total,
          avg,
          sakit: studentRaport.kehadiran.sakit,
          izin: studentRaport.kehadiran.izin,
          alpa: studentRaport.kehadiran.alpa,
          statusKenaikan: studentRaport.statusKenaikan?.status || "-"
        };
      });

      // Compute rank based on total descending
      const sortedByTotal = [...studentStats].sort((a, b) => b.total - a.total);
      const rankMap: { [nama: string]: number } = {};
      sortedByTotal.forEach((item, index) => {
        rankMap[item.nama] = index + 1;
      });

      const dataRows = studentStats.map((st) => [
        st.idx,
        st.nisn,
        st.nis,
        st.nama,
        st.jk,
        ...st.scores,
        st.total,
        st.avg,
        rankMap[st.nama],
        st.sakit,
        st.izin,
        st.alpa,
        st.statusKenaikan
      ]);

      const ws = XLSX.utils.aoa_to_sheet([
        [`LEGER NILAI RAPORT - ${config.Nama_Sekolah?.toUpperCase() || "SD NEGERI BABAKAN 04"}`],
        [`Kelas: ${selectedKelas} | Periode: ${currentPeriodeInfo.label} | Tahun Ajaran: ${selectedTahunAjaran}`],
        [],
        headers,
        ...dataRows
      ]);

      XLSX.utils.book_append_sheet(wb, ws, "LEGER_NILAI");

      const filename = `Leger_Nilai_Raport_${selectedKelas.replace(/\s+/g, "_")}_${selectedTahunAjaran.replace(/\//g, "-")}.xlsx`;
      XLSX.writeFile(wb, filename);
      notifyUnduhSuccess("Leger Nilai Raport berhasil diekspor ke Excel!");
    } catch (err: any) {
      notifyUnduhError("Gagal mengekspor Leger Excel: " + (err?.message || "Error"));
    }
  };

  // Export PDF with jsPDF (Folio / F4 215mm x 330mm - 1 Lembar Utuh Pas Margin)
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [215, 330] // Ukuran Resmi F4 / Folio Indonesia
      });

      const targetStudents = selectedSiswaId === "all"
        ? classStudents
        : classStudents.filter((s) => s.id === selectedSiswaId);

      if (targetStudents.length === 0) {
        Swal.fire("Peringatan", "Tidak ada siswa yang dipilih.", "warning");
        return;
      }

      // -------------------------------------------------------------
      // Helper: Render Lembar Cover (Halaman Cover Utuh Kertas F4)
      // -------------------------------------------------------------
      const renderCoverPage = (pdf: jsPDF, student: Siswa, studentRaport: RaportRecord) => {
        // Bingkai Ganda Standar Kedinasan (Margin luar 12mm, margin dalam 14mm)
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(1.2);
        pdf.rect(12, 12, 191, 306);
        pdf.setLineWidth(0.4);
        pdf.rect(14, 14, 187, 302);

        // Header Instansi
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text((config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR").toUpperCase(), 107.5, 32, { align: "center" });
        pdf.text((config.Dinas || "DINAS PENDIDIKAN").toUpperCase(), 107.5, 38, { align: "center" });
        pdf.setFontSize(15);
        pdf.text((config.Nama_Sekolah || "SD NEGERI BABAKAN 04").toUpperCase(), 107.5, 48, { align: "center" });

        // Judul Dokumen
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("LAPORAN HASIL BELAJAR PESERTA DIDIK", 107.5, 63, { align: "center" });
        pdf.setFontSize(9.5);
        pdf.text("( RAPOR KURIKULUM MERDEKA )", 107.5, 70, { align: "center" });

        // Logo Sekolah Tengah
        if (config.Logo_Kiri) {
          try {
            pdf.addImage(config.Logo_Kiri, "PNG", 91.5, 84, 32, 32);
          } catch (e) {}
        }

        // Keterangan Periode
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(studentRaport.periodeNama.toUpperCase(), 107.5, 128, { align: "center" });
        pdf.setFontSize(9.5);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Tahun Ajaran ${studentRaport.tahunAjaran}`, 107.5, 135, { align: "center" });

        // Kotak Identitas Siswa
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(32, 155, 151, 66, 3, 3, "FD");

        pdf.setFontSize(9);
        const rows = [
          { label: "Nama Peserta Didik", val: student.nama.toUpperCase(), isBold: true },
          { label: "NISN / NIS", val: `${student.nisn || "-"} / ${student.nis || "-"}`, isBold: false },
          { label: "Kelas / Fase", val: `${student.kelas} / ${studentRaport.fase}`, isBold: false },
          { label: "Nama Sekolah", val: config.Nama_Sekolah || "SD NEGERI BABAKAN 04", isBold: true },
          { label: "NPSN", val: config.NPSN || "20200889", isBold: false }
        ];

        let boxY = 168;
        rows.forEach((r) => {
          pdf.setFont("helvetica", "normal");
          pdf.text(r.label, 40, boxY);
          pdf.text(":", 76, boxY);
          if (r.isBold) pdf.setFont("helvetica", "bold");
          pdf.text(r.val, 80, boxY);
          boxY += 10;
        });

        // Footer Cover
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9.5);
        pdf.text((config.Nama_Sekolah || "SD NEGERI BABAKAN 04").toUpperCase(), 107.5, 290, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(config.Alamat_Sekolah || "Kp. Babakan Kulon RT.05/02 Desa Babakan Kec. Ciseeng Kab. Bogor", 107.5, 296, { align: "center" });
      };

      // -------------------------------------------------------------
      // Helper: Render Lembar Nilai (1 Lembar Utuh Kertas F4 Pas Margin)
      // -------------------------------------------------------------
      const renderLembarNilai = (pdf: jsPDF, student: Siswa, studentRaport: RaportRecord) => {
        let topY = 10;

        // 1. Kop Surat Kedinasan
        if (showKopSekolah) {
          if (config.Logo_Kiri) {
            try {
              pdf.addImage(config.Logo_Kiri, "PNG", 14, 8, 16, 16);
            } catch (e) {}
          }
          if (config.Logo_Kanan) {
            try {
              pdf.addImage(config.Logo_Kanan, "PNG", 185, 8, 16, 16);
            } catch (e) {}
          }

          pdf.setFontSize(9.5);
          pdf.setFont("helvetica", "bold");
          pdf.text((config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR").toUpperCase(), 107.5, topY, { align: "center" });
          pdf.text((config.Dinas || "DINAS PENDIDIKAN").toUpperCase(), 107.5, topY + 4, { align: "center" });
          pdf.setFontSize(12.5);
          pdf.text((config.Nama_Sekolah || "SD NEGERI BABAKAN 04").toUpperCase(), 107.5, topY + 9, { align: "center" });
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "normal");
          const alamatFull = `${config.Alamat_Sekolah || "Kp. Babakan Kulon RT.05/02 Desa Babakan Kec. Ciseeng Kab. Bogor"}${config.NPSN ? ` • NPSN: ${config.NPSN}` : ""}${config.Email_Sekolah ? ` • Email: ${config.Email_Sekolah}` : ""}`;
          pdf.text(alamatFull, 107.5, topY + 13.5, { align: "center" });

          pdf.setLineWidth(0.6);
          pdf.line(14, topY + 16, 201, topY + 16);
          pdf.setLineWidth(0.2);
          pdf.line(14, topY + 16.8, 201, topY + 16.8);
          topY += 21;
        }

        // 2. Judul Raport
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("LAPORAN HASIL BELAJAR (RAPOR)", 107.5, topY + 2, { align: "center" });
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${studentRaport.periodeNama} — Tahun Ajaran ${studentRaport.tahunAjaran}`, 107.5, topY + 6, { align: "center" });
        topY += 9;

        // 3. Grid Data Siswa
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Nama Peserta Didik : ${student.nama}`, 14, topY + 2);
        pdf.text(`NISN / NIS          : ${student.nisn || "-"} / ${student.nis || "-"}`, 14, topY + 6);
        pdf.text(`Nama Sekolah        : ${config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}`, 14, topY + 10);

        pdf.text(`Kelas / Fase       : ${student.kelas} / ${studentRaport.fase}`, 125, topY + 2);
        pdf.text(`Semester            : ${studentRaport.semester}`, 125, topY + 6);
        pdf.text(`Tahun Ajaran        : ${studentRaport.tahunAjaran}`, 125, topY + 10);

        pdf.setDrawColor(180);
        pdf.setLineWidth(0.2);
        pdf.line(14, topY + 12.5, 201, topY + 12.5);
        topY += 15;

        // 4. Tabel A: Capaian Nilai Mapel
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.setDrawColor(0);
        pdf.text("A. Nilai Capaian Kompetensi Pembelajaran", 14, topY);

        const mapelOrderLookup = new Map<string, number>(displayMapelNames.map((m, idx) => [m.toLowerCase(), idx]));
        const filteredNilaiMapel = studentRaport.nilaiMapel
          .filter((nm) => mapelOrderLookup.has(nm.mapel.toLowerCase()))
          .sort((a, b) => {
            const posA = mapelOrderLookup.get(a.mapel.toLowerCase()) ?? 999;
            const posB = mapelOrderLookup.get(b.mapel.toLowerCase()) ?? 999;
            return posA - posB;
          });
        const finalNilaiMapel = filteredNilaiMapel.length > 0 ? filteredNilaiMapel : studentRaport.nilaiMapel;

        const isTight = finalNilaiMapel.length > 8;
        const fontMapel = isTight ? 6.8 : 7.2;
        const padMapel = isTight ? 1.0 : 1.2;

        const tableBody = finalNilaiMapel.map((nm, i) => {
          const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
          const scoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
          const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, nm.mapel) && isMatchingClass(b.kelas, student.kelas));
          const currentTps = effectiveTpBank[nm.mapel] || getFallbackTpsForClassAndMapel(student.kelas, nm.mapel);
          const freshDesc = generateFallbackDeskripsiFromTp(nm.mapel, scoreVal, currentTps, mapelBankItems, student.kelas, kktpVal);

          const isTuntas = scoreVal >= kktpVal;
          const currentTinggi = (nm.capaianKompetensiTinggi || nm.deskripsi || "").trim();
          const isMismatchWithScore = isTuntas
            ? !currentTinggi.startsWith("Menunjukkan penguasaan sangat baik dalam")
            : !currentTinggi.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam");

          const displayText = (isMismatchWithScore || shouldRefreshDeskripsi(currentTinggi, freshDesc.tinggi, mapelBankItems?.length || 0))
            ? freshDesc.tinggi
            : (currentTinggi || freshDesc.tinggi);

          return [
            i + 1,
            nm.mapel,
            scoreVal,
            displayText
          ];
        });

        autoTable(pdf, {
          startY: topY + 1.5,
          margin: { left: 14, right: 14 },
          head: [["No", "Mata Pelajaran", "Nilai Akhir", "Capaian Kompetensi / Deskripsi Kemajuan Belajar"]],
          body: tableBody,
          theme: "grid",
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 7, halign: "center" },
          styles: { fontSize: fontMapel, cellPadding: padMapel, overflow: "linebreak" },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: 43 },
            2: { cellWidth: 16, halign: "center", fontStyle: "bold" },
            3: { cellWidth: 120 }
          }
        });

        let currentY = (pdf as any).lastAutoTable.finalY + 3;

        // 5. Tabel B: Kegiatan Ekstrakurikuler (Tampil Lengkap di Unduh PDF)
        const hasEkskul = Array.isArray(studentRaport.ekskul) && studentRaport.ekskul.length > 0;
        if (hasEkskul) {
          pdf.setFontSize(7.5);
          pdf.setFont("helvetica", "bold");
          pdf.text("B. Kegiatan Ekstrakurikuler", 14, currentY);

          const ekskulRows = studentRaport.ekskul.map((ek, idx) => [
            idx + 1,
            ek.nama || "-",
            ek.predikat || "-",
            ek.keterangan || "-"
          ]);

          autoTable(pdf, {
            startY: currentY + 1.5,
            margin: { left: 14, right: 14 },
            head: [["No", "Nama Kegiatan", "Predikat", "Keterangan"]],
            body: ekskulRows,
            theme: "grid",
            headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 7, fontStyle: "bold", halign: "center" },
            styles: { fontSize: isTight ? 6.8 : 7, cellPadding: isTight ? 0.9 : 1 },
            columnStyles: {
              0: { cellWidth: 8, halign: "center" },
              1: { cellWidth: 43 },
              2: { cellWidth: 16, halign: "center", fontStyle: "bold" },
              3: { cellWidth: 120 }
            }
          });

          currentY = (pdf as any).lastAutoTable.finalY + 3;
        }

        // 6. Section Ketidakhadiran & Catatan Wali Kelas (Side-by-side untuk efisiensi ruang 1 lembar F4)
        const labelAtt = hasEkskul ? "C. Ketidakhadiran" : "B. Ketidakhadiran";
        const labelCatatan = hasEkskul ? "D. Catatan Wali Kelas" : "C. Catatan Wali Kelas";

        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.text(labelAtt, 14, currentY);

        const attRows = [
          ["Sakit (S)", `${studentRaport.kehadiran?.sakit ?? 0} hari`],
          ["Izin (I)", `${studentRaport.kehadiran?.izin ?? 0} hari`],
          ["Tanpa Keterangan (A)", `${studentRaport.kehadiran?.alpa ?? 0} hari`]
        ];

        autoTable(pdf, {
          startY: currentY + 1.5,
          margin: { left: 14, right: 131 }, // width 70mm
          head: [["Jenis Ketidakhadiran", "Jumlah"]],
          body: attRows,
          theme: "grid",
          headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 7, fontStyle: "bold", halign: "center" },
          styles: { fontSize: isTight ? 6.8 : 7, cellPadding: isTight ? 0.9 : 1 },
          columnStyles: {
            0: { cellWidth: 44 },
            1: { cellWidth: 26, halign: "center", fontStyle: "bold" }
          }
        });
        const attFinalY = (pdf as any).lastAutoTable.finalY;

        // Catatan Wali Kelas di sisi kanan (x=88 to 201 = 113mm width)
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "bold");
        pdf.text(labelCatatan, 88, currentY);

        const boxHeight = Math.max(attFinalY - currentY - 1.5, 17);
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.2);
        pdf.rect(88, currentY + 1.5, 113, boxHeight);
        pdf.setFontSize(6.8);
        pdf.setFont("helvetica", "italic");
        const catatanVal = studentRaport.catatanWaliKelas || "Tingkatkan terus semangat belajar, kedisiplinan, dan prestasimu!";
        const splitNotes = pdf.splitTextToSize(`"${catatanVal}"`, 109);
        pdf.text(splitNotes, 90, currentY + 5.5);

        currentY = Math.max(attFinalY, currentY + 1.5 + boxHeight) + 3;

        // 7. Kenaikan Kelas jika Semester Genap
        if (studentRaport.statusKenaikan) {
          pdf.setDrawColor(0);
          pdf.setLineWidth(0.2);
          pdf.rect(14, currentY, 187, 5.5);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.text(`Keputusan: Peserta didik dinyatakan ${studentRaport.statusKenaikan.status || "Naik"} (${studentRaport.statusKenaikan.keKelas || ""})`, 16, currentY + 3.8);
          currentY += 8;
        }

        // 8. Tanda Tangan Resmi (Posisi pas pada bagian bawah kertas F4 tanpa terpotong)
        const ttdY = Math.min(Math.max(currentY + 2, 275), 286);
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");

        const tglDocFormatted = formatTanggalIndonesia(studentRaport.tanggalRaport || tanggalRaport);
        const tempatDocTtd = studentRaport.tempatTitimangsa || tempatTitimangsa || config.Tempat_Tanda_Tangan || "Kab. Bogor";

        if (showTtdKepsek) {
          // 3 Kolom
          pdf.text("Mengetahui,", 35, ttdY, { align: "center" });
          pdf.text("Orang Tua / Wali Siswa,", 35, ttdY + 4, { align: "center" });
          pdf.text("( .................................... )", 35, ttdY + 20, { align: "center" });

          pdf.text("Mengetahui,", 107.5, ttdY, { align: "center" });
          pdf.text("Kepala Sekolah,", 107.5, ttdY + 4, { align: "center" });
          pdf.setFont("helvetica", "bold");
          pdf.text(studentRaport.namaKepsek || config.Nama_Kepala_Sekolah || "SUBUR, S.Pd.SD.", 107.5, ttdY + 18, { align: "center" });
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.8);
          pdf.text(`NIP. ${studentRaport.nipKepsek || config.NIP_Kepala_Sekolah || "197002111993081001"}`, 107.5, ttdY + 22, { align: "center" });

          pdf.setFontSize(7.5);
          pdf.text(`${tempatDocTtd}, ${tglDocFormatted}`, 175, ttdY, { align: "center" });
          pdf.text("Guru Kelas / Wali Kelas,", 175, ttdY + 4, { align: "center" });
          pdf.setFont("helvetica", "bold");
          pdf.text(studentRaport.namaGuruWali || currentUser.name || "Eri Iriana Rifai, S.Kom.", 175, ttdY + 18, { align: "center" });
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.8);
          pdf.text(`NIP. ${studentRaport.nipGuruWali || "-"}`, 175, ttdY + 22, { align: "center" });
        } else {
          // 2 Kolom
          pdf.text("Mengetahui,", 45, ttdY, { align: "center" });
          pdf.text("Orang Tua / Wali Siswa,", 45, ttdY + 4, { align: "center" });
          pdf.text("( .................................... )", 45, ttdY + 20, { align: "center" });

          pdf.text(`${tempatDocTtd}, ${tglDocFormatted}`, 165, ttdY, { align: "center" });
          pdf.text("Guru Kelas / Wali Kelas,", 165, ttdY + 4, { align: "center" });
          pdf.setFont("helvetica", "bold");
          pdf.text(studentRaport.namaGuruWali || currentUser.name || "Eri Iriana Rifai, S.Kom.", 165, ttdY + 18, { align: "center" });
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.8);
          pdf.text(`NIP. ${studentRaport.nipGuruWali || "-"}`, 165, ttdY + 22, { align: "center" });
        }
      };

      // Loop seluruh siswa terpilih dan buat halaman sesuai printMode
      let pageCount = 0;
      targetStudents.forEach((student) => {
        const studentRaport = getRaportForStudent(student);

        // 1. Cover Page
        if (printMode === "full" || printMode === "cover") {
          if (pageCount > 0) doc.addPage();
          renderCoverPage(doc, student, studentRaport);
          pageCount++;
        }

        // 2. Lembar Nilai Page
        if (printMode === "full" || printMode === "lembar_nilai") {
          if (pageCount > 0) doc.addPage();
          renderLembarNilai(doc, student, studentRaport);
          pageCount++;
        }
      });

      const cleanName = selectedSiswaId === "all" ? `Semua_Siswa_${selectedKelas}` : targetStudents[0]?.nama.replace(/\s+/g, "_");
      const modeSuffix = printMode === "cover" ? "_Cover" : printMode === "lembar_nilai" ? "_Nilai" : "_Lengkap";
      doc.save(`Raport_${cleanName}${modeSuffix}_${currentPeriodeInfo.short}_${selectedTahunAjaran.replace(/\//g, "-")}_F4.pdf`);
      notifyUnduhSuccess("Dokumen Raport PDF (Kertas F4) berhasil dibuat dan diunduh!");
    } catch (err: any) {
      notifyUnduhError("Gagal membuat PDF Raport: " + (err?.message || "Error"));
    }
  };


  // Trigger Native Print
  const handlePrint = () => {
    window.print();
  };

  const selectedStudentData = useMemo(() => {
    if (selectedSiswaId === "all") {
      return classStudents[0] || null;
    }
    return classStudents.find((s) => s.id === selectedSiswaId) || null;
  }, [selectedSiswaId, classStudents]);

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-0 print:pb-0">
      {/* Top Banner & Title - Hidden when printing */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white p-6 rounded-2xl shadow-lg print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold backdrop-blur-md">
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>Modul Cetak Raport & Asesmen Terpadu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Cetak Raport & Laporan Penilaian Siswa
            </h1>
            <p className="text-blue-100 text-sm max-w-2xl">
              Cetak raport resmi Kurikulum Merdeka & K13 untuk PTS Ganjil, PAS/SAS Ganjil, PTS Genap, PAT/Kenaikan Kelas, dan Ujian Sekolah lengkap dengan fitur Import Excel & Download Template.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition shadow-sm backdrop-blur-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Download Template Excel</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-md active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import Nilai Excel</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/20">
          <button
            onClick={() => setActiveSubTab("cetak")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === "cetak"
                ? "bg-white text-blue-800 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Cetak & Preview Raport</span>
          </button>

          <button
            onClick={() => setActiveSubTab("input")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === "input"
                ? "bg-white text-blue-800 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Input & Edit Nilai Raport</span>
          </button>

          <button
            onClick={() => setActiveSubTab("leger")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === "leger"
                ? "bg-white text-blue-800 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Leger & Rekap Nilai Kelas</span>
          </button>

          <button
            onClick={() => setActiveSubTab("import")}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === "import"
                ? "bg-white text-blue-800 shadow-md"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Panduan & Import Excel</span>
          </button>
        </div>
      </div>

      {/* Main Filter Toolbar - Hidden when printing */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Periode Raport */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Jenis & Periode Raport</span>
            </label>
            <select
              value={selectedPeriode}
              onChange={(e) => setSelectedPeriode(e.target.value as PeriodeRaportType)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {PERIODE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Kelas */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Kelas</span>
            </label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {allowedClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Ajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tahun Ajaran</span>
            </label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>

          {/* Siswa Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Pilih Siswa (atau Cetak Semua)</span>
            </label>
            <select
              value={selectedSiswaId}
              onChange={(e) => setSelectedSiswaId(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">-- Cetak Semua Siswa ({classStudents.length} Siswa) --</option>
              {classStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.nisn || "No NISN"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Periode Badge & Info Line */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-md font-bold ${currentPeriodeInfo.badge}`}>
              {currentPeriodeInfo.short}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {currentPeriodeInfo.desc}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500 dark:text-slate-400">
            <span>Fase: <strong className="text-slate-700 dark:text-slate-200">{getFaseByClass(selectedKelas)}</strong></span>
            <span>Jumlah Siswa: <strong className="text-slate-700 dark:text-slate-200">{classStudents.length} Siswa</strong></span>
          </div>
        </div>

        {/* Pengaturan Titimangsa & Tanggal Cetak Raport */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Tanggal Cetak Raport</span>
            </label>
            <input
              type="date"
              value={tanggalRaport}
              onChange={(e) => setTanggalRaport(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Kota / Tempat Titimangsa</span>
            </label>
            <input
              type="text"
              value={tempatTitimangsa}
              onChange={(e) => setTempatTitimangsa(e.target.value)}
              placeholder="Contoh: Kab. Bogor"
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="lg:col-span-2 flex flex-col justify-center bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl px-3.5 py-2">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              Format Penulisan Tanggal di Raport (Bulan Tertulis Utuh)
            </span>
            <div className="text-xs font-black text-blue-950 dark:text-blue-100 mt-0.5 truncate flex items-center space-x-1.5">
              <span>{tempatTitimangsa || config.Tempat_Tanda_Tangan || "Kab. Bogor"},</span>
              <span className="bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded shadow-2xs font-extrabold">
                {formatTanggalIndonesia(tanggalRaport)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Pemilihan Mata Pelajaran dengan Checkbox & Integrasi Tambah Mapel / Kelola TP */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Pilihan Mata Pelajaran Raport
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                {displayMapelNames.length} / {activeMapelNames.length} Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Centang mata pelajaran yang akan dicetak pada raport, diekspor ke PDF, dan dihitung dalam rekap leger kelas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllMapels}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={handleDeselectAllMapels}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleResetToStandardOrder}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition cursor-pointer shadow-2xs active:scale-95"
              title="Urutkan sesuai standar resmi Kurikulum Merdeka (Agama, Pancasila, B. Indonesia, MTK, IPAS, PJOK, Seni, dll)"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Urutkan Standar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddMapelModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tambah Mapel Manual</span>
            </button>

            {hiddenMapelNames.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreMapelMenu}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 transition cursor-pointer shadow-2xs active:scale-95 animate-pulse"
                title={`Pulihkan mata pelajaran yang pernah dihapus dari ${selectedKelas}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
                <span>Pulihkan Mapel ({hiddenMapelNames.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!displayMapelNames.includes(activeTpMapel) && displayMapelNames.length > 0) {
                  setActiveTpMapel(displayMapelNames[0]);
                }
                setIsTpModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer shadow-md active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Kelola TP & AI Deskripsi</span>
            </button>
          </div>
        </div>

        {/* Checkbox Chips Grid with Interactive Order Stepper & Delete Button */}
        <div className="flex flex-wrap gap-2 pt-1">
          {orderedChips.map((mapel) => {
            const orderIndex = selectedMapelNames.indexOf(mapel);
            const isSelected = orderIndex !== -1;
            const orderNumber = isSelected ? orderIndex + 1 : null;
            const isCustom = customMapels.includes(mapel);
            const tpCount = (effectiveTpBank[mapel] || []).length;

            if (isSelected && orderNumber !== null) {
              return (
                <div
                  key={mapel}
                  className="group inline-flex items-center space-x-1.5 pl-1.5 pr-2 py-1 rounded-xl text-xs font-bold transition border select-none bg-blue-50 border-blue-400 text-blue-950 dark:bg-blue-950/50 dark:border-blue-600 dark:text-blue-100 shadow-xs"
                >
                  {/* Order Stepper Pill */}
                  <div className="flex items-center bg-blue-600 text-white rounded-lg px-1.5 py-0.5 shadow-2xs space-x-1 shrink-0">
                    <span className="text-[9px] uppercase font-bold text-blue-200">No</span>
                    <input
                      type="number"
                      min={1}
                      max={selectedMapelNames.length}
                      value={orderNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleSetMapelOrder(mapel, val);
                        }
                      }}
                      className="w-7 text-center font-black text-xs bg-blue-700 text-white rounded px-0.5 py-0.2 outline-none border border-blue-400/60 focus:bg-blue-800"
                      title={`Ubah nomor urut ${mapel} (1 - ${selectedMapelNames.length})`}
                    />
                    <div className="flex flex-col ml-0.5">
                      <button
                        type="button"
                        disabled={orderNumber === 1}
                        onClick={() => handleMoveMapel(mapel, "up")}
                        className="p-0 hover:bg-blue-700 disabled:opacity-20 rounded cursor-pointer leading-none"
                        title="Geser ke urutan sebelumnya (Naik)"
                      >
                        <ChevronUp className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button
                        type="button"
                        disabled={orderNumber === selectedMapelNames.length}
                        onClick={() => handleMoveMapel(mapel, "down")}
                        className="p-0 hover:bg-blue-700 disabled:opacity-20 rounded cursor-pointer leading-none"
                        title="Geser ke urutan setelahnya (Turun)"
                      >
                        <ChevronDown className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Checkbox toggle & mapel name */}
                  <button
                    type="button"
                    onClick={() => handleToggleMapel(mapel)}
                    className="inline-flex items-center space-x-1.5 cursor-pointer py-0.5"
                    title="Klik untuk nonaktifkan mapel dari raport"
                  >
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate max-w-[180px]" title={mapel}>{mapel}</span>
                    {isCustom && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-extrabold uppercase">
                        Manual
                      </span>
                    )}
                    <span className="text-[10px] text-blue-600 dark:text-blue-300 font-normal ml-0.5">
                      ({tpCount} TP)
                    </span>
                  </button>

                  {/* Delete / Remove button for this class */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMapelFromClass(mapel);
                    }}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg transition cursor-pointer ml-1"
                    title={`Hapus mapel "${mapel}" dari ${selectedKelas}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={mapel}
                className="group inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border select-none bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-500 opacity-60 hover:opacity-100"
              >
                <button
                  type="button"
                  onClick={() => handleToggleMapel(mapel)}
                  className="inline-flex items-center space-x-2 cursor-pointer"
                  title={`Klik untuk mengaktifkan mapel "${mapel}" ke ${selectedKelas}`}
                >
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[200px]" title={mapel}>{mapel}</span>
                  {isCustom && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-extrabold uppercase">
                      Manual
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                    ({tpCount} TP)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMapelFromClass(mapel);
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg transition cursor-pointer"
                  title={`Hapus mapel "${mapel}" dari ${selectedKelas}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CETAK & PREVIEW RAPORT */}
      {/* ========================================================================= */}
      {activeSubTab === "cetak" && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Opsi Cetak:</span>
                <button
                  onClick={() => setPrintMode("full")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    printMode === "full"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Bundel Lengkap (Cover + Nilai)
                </button>
                <button
                  onClick={() => setPrintMode("lembar_nilai")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    printMode === "lembar_nilai"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Lembar Nilai Saja
                </button>
                <button
                  onClick={() => setPrintMode("cover")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    printMode === "cover"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Cover Saja
                </button>
              </div>

              {/* Toggle Pengesahan & Kop */}
              <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 sm:pl-3 pt-2 sm:pt-0">
                {/* Tombol Tampilkan / Sembunyikan TTD Kepala Sekolah */}
                <button
                  type="button"
                  onClick={() => setShowTtdKepsek(!showTtdKepsek)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer select-none ${
                    showTtdKepsek
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-200 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 opacity-90"
                  }`}
                  title="Klik untuk menampilkan atau menyembunyikan kotak tanda tangan Kepala Sekolah pada raport"
                >
                  {showTtdKepsek ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>TTD Kepala Sekolah</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                      showTtdKepsek
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {showTtdKepsek ? "TAMPIL" : "SEMBUNYI"}
                  </span>
                </button>

                {/* Tombol Tampilkan / Sembunyikan Kop Surat Sekolah */}
                <button
                  type="button"
                  onClick={() => setShowKopSekolah(!showKopSekolah)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer select-none ${
                    showKopSekolah
                      ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-200 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 opacity-90"
                  }`}
                  title="Klik untuk menampilkan atau menyembunyikan Kop Surat Dinas pada lembar nilai raport"
                >
                  {showKopSekolah ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Kop Surat Dinas</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                      showKopSekolah
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {showKopSekolah ? "TAMPIL" : "SEMBUNYI"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden lg:flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 mr-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Standar Kertas: <strong className="text-slate-800 dark:text-slate-200">F4 / Folio (215 × 330 mm)</strong> • 1 Lembar Utuh</span>
              </div>

              <button
                onClick={handlePrint}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                title="Cetak langsung ke printer atau simpan PDF melalui dialog cetak browser (Kertas F4/Folio)"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rapor (F4)</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                title="Unduh file PDF resmi ukuran F4/Folio (215 × 330 mm) 1 lembar utuh lengkap dengan nilai ekskul"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh PDF Resmi (F4)</span>
              </button>
            </div>
          </div>

          {/* Render Raport Paper(s) */}
          {classStudents.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
                Belum ada siswa yang terdaftar di {selectedKelas}.
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Silakan tambahkan data siswa di menu Kelola Siswa atau pilih kelas lain.
              </p>
            </div>
          ) : (
            <div className="space-y-8 print:space-y-0">
              {(selectedSiswaId === "all" ? classStudents : [selectedStudentData]).map((student) => {
                if (!student) return null;
                const studentRaport = getRaportForStudent(student);

                return (
                  <React.Fragment key={student.id}>
                    {/* ============================================================== */}
                    {/* HALAMAN 1: COVER RAPORT (1 Lembar Utuh Kertas F4)            */}
                    {/* ============================================================== */}
                    {(printMode === "full" || printMode === "cover") && (
                      <div className="raport-f4-page bg-white text-black p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 mx-auto w-full max-w-[215mm] min-h-[330mm] print:shadow-none print:border-none print:p-0 print:m-0 print:w-[195mm] print:max-w-[195mm] print:min-h-[310mm] print:max-h-[314mm] print:overflow-hidden print:break-after-page mb-8 print:mb-0 flex flex-col justify-between">
                        <div className="flex flex-col justify-between h-full min-h-[305mm] max-h-[312mm] border-4 border-double border-slate-900 p-6 sm:p-8 text-center box-border">
                          {/* Top School Header */}
                          <div className="space-y-1.5 pt-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                              {config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR"}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                              {config.Dinas || "DINAS PENDIDIKAN"}
                            </p>
                            <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-slate-900 mt-1">
                              {config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}
                            </h2>
                            <div className="pt-2">
                              <h3 className="text-base sm:text-lg font-bold tracking-wider uppercase text-slate-800">
                                LAPORAN HASIL BELAJAR PESERTA DIDIK
                              </h3>
                              <p className="text-xs sm:text-sm font-semibold text-slate-600 uppercase">
                                ( RAPOR KURIKULUM MERDEKA )
                              </p>
                            </div>
                          </div>

                          {/* Middle Logo & Emblem */}
                          <div className="my-6 flex flex-col items-center justify-center space-y-4">
                            {config.Logo_Kiri ? (
                              <img 
                                src={config.Logo_Kiri} 
                                alt="Logo Sekolah" 
                                className="w-28 h-28 object-contain"
                              />
                            ) : (
                              <div className="w-28 h-28 rounded-full border-4 border-blue-900 flex items-center justify-center bg-blue-50 text-blue-900 shadow-inner">
                                <GraduationCap className="w-16 h-16" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                                {studentRaport.periodeNama}
                              </h3>
                              <p className="text-xs font-semibold text-slate-600">
                                Tahun Ajaran {studentRaport.tahunAjaran}
                              </p>
                            </div>
                          </div>

                          {/* Student Identitas Box */}
                          <div className="max-w-md mx-auto w-full border border-slate-400 p-4 rounded-lg bg-slate-50/50 space-y-2 text-left text-xs sm:text-sm">
                            <div className="flex">
                              <span className="w-36 font-semibold text-slate-600">Nama Siswa</span>
                              <span className="mr-2">:</span>
                              <strong className="font-bold text-slate-900 uppercase">{student.nama}</strong>
                            </div>
                            <div className="flex">
                              <span className="w-36 font-semibold text-slate-600">NISN / NIS</span>
                              <span className="mr-2">:</span>
                              <span className="font-semibold text-slate-800">{student.nisn || "-"} / {student.nis || "-"}</span>
                            </div>
                            <div className="flex">
                              <span className="w-36 font-semibold text-slate-600">Kelas / Fase</span>
                              <span className="mr-2">:</span>
                              <span className="font-semibold text-slate-800">{student.kelas} / {studentRaport.fase}</span>
                            </div>
                            <div className="flex">
                              <span className="w-36 font-semibold text-slate-600">Nama Sekolah</span>
                              <span className="mr-2">:</span>
                              <span className="font-bold text-slate-900">{config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}</span>
                            </div>
                            <div className="flex">
                              <span className="w-36 font-semibold text-slate-600">NPSN</span>
                              <span className="mr-2">:</span>
                              <span className="font-semibold text-slate-800">{config.NPSN || "20200889"}</span>
                            </div>
                          </div>

                          {/* Footer Cover */}
                          <div className="pb-2 space-y-1 text-xs text-slate-600">
                            <p className="font-bold text-slate-800 uppercase">{config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}</p>
                            <p>{config.Alamat_Sekolah || "Kp. Babakan Kulon RT.05/02 Desa Babakan Kec. Ciseeng Kab. Bogor"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ============================================================== */}
                    {/* HALAMAN 2: LEMBAR NILAI CAPAIAN (1 Lembar Utuh Kertas F4)     */}
                    {/* ============================================================== */}
                    {(printMode === "full" || printMode === "lembar_nilai") && (
                      <div className="raport-f4-page bg-white text-black p-6 sm:p-8 rounded-2xl shadow-md border border-slate-200 mx-auto w-full max-w-[215mm] min-h-[330mm] print:shadow-none print:border-none print:p-0 print:m-0 print:w-[195mm] print:max-w-[195mm] print:min-h-[310mm] print:max-h-[314mm] print:overflow-hidden print:break-after-page mb-8 print:mb-0 flex flex-col justify-between space-y-3 print:space-y-1.5">
                        <div>
                          {/* Kop Surat Resmi */}
                          {showKopSekolah && (
                            <KopSuratDinas 
                              config={config} 
                              showDoubleLine={true} 
                              className="mb-2 print:mb-0.5"
                            />
                          )}

                          {/* Title Laporan */}
                          <div className="text-center space-y-0.5 print:space-y-0 mb-2 print:mb-1">
                            <h4 className="text-sm font-bold uppercase tracking-wider underline print:text-xs">
                              LAPORAN HASIL BELAJAR (RAPOR)
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-700 print:text-[9.5px]">
                              {studentRaport.periodeNama} — Tahun Ajaran {studentRaport.tahunAjaran}
                            </p>
                          </div>

                          {/* Header Data Siswa */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs print:text-[9.5px] border-b border-slate-300 pb-2 print:pb-1 mb-2.5 print:mb-1.5">
                            <div className="flex"><span className="w-32 font-semibold">Nama Peserta Didik</span><span className="mr-2">:</span><strong className="uppercase">{student.nama}</strong></div>
                            <div className="flex"><span className="w-32 font-semibold">Kelas / Fase</span><span className="mr-2">:</span><span>{student.kelas} / {studentRaport.fase}</span></div>
                            <div className="flex"><span className="w-32 font-semibold">NISN / NIS</span><span className="mr-2">:</span><span>{student.nisn || "-"} / {student.nis || "-"}</span></div>
                            <div className="flex"><span className="w-32 font-semibold">Semester</span><span className="mr-2">:</span><span>{studentRaport.semester}</span></div>
                            <div className="flex"><span className="w-32 font-semibold">Nama Sekolah</span><span className="mr-2">:</span><span>{config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}</span></div>
                            <div className="flex"><span className="w-32 font-semibold">Tahun Ajaran</span><span className="mr-2">:</span><span>{studentRaport.tahunAjaran}</span></div>
                          </div>

                          {/* Tabel A: Capaian Hasil Belajar */}
                          <div className="space-y-1 print:space-y-0.5 mb-2.5 print:mb-1.5">
                            <h5 className="text-xs print:text-[10px] font-bold uppercase text-slate-900 tracking-wide">
                              A. Nilai Capaian Kompetensi Pembelajaran
                            </h5>
                            <div className="overflow-x-auto">
                              <table className="raport-print-table w-full text-left text-xs print:text-[9.2px] border border-collapse border-black leading-tight">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-900 border-b border-black">
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black text-center w-8">No</th>
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black w-44">Mata Pelajaran</th>
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black text-center w-14">Nilai Akhir</th>
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black">Capaian Kompetensi / Deskripsi Kemajuan Belajar</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const mapelOrderLookup = new Map<string, number>(displayMapelNames.map((m, idx) => [m.toLowerCase(), idx]));
                                    const filtered = studentRaport.nilaiMapel
                                      .filter((nm) => mapelOrderLookup.has(nm.mapel.toLowerCase()))
                                      .sort((a, b) => {
                                        const orderA = mapelOrderLookup.get(a.mapel.toLowerCase()) ?? 999;
                                        const orderB = mapelOrderLookup.get(b.mapel.toLowerCase()) ?? 999;
                                        return orderA - orderB;
                                      });
                                    const toRender = filtered.length > 0 ? filtered : studentRaport.nilaiMapel;
                                    return toRender.map((nm, idx) => {
                                      const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
                                      const scoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
                                      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, nm.mapel) && isMatchingClass(b.kelas, student.kelas));
                                      const currentTps = effectiveTpBank[nm.mapel] || getFallbackTpsForClassAndMapel(student.kelas, nm.mapel);
                                      const freshDesc = generateFallbackDeskripsiFromTp(nm.mapel, scoreVal, currentTps, mapelBankItems, student.kelas, kktpVal);

                                      const isTuntas = scoreVal >= kktpVal;
                                      const currentTinggi = (nm.capaianKompetensiTinggi || nm.deskripsi || "").trim();
                                      const isMismatchWithScore = isTuntas
                                        ? !currentTinggi.startsWith("Menunjukkan penguasaan sangat baik dalam")
                                        : !currentTinggi.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam");

                                      const displayText = (isMismatchWithScore || shouldRefreshDeskripsi(currentTinggi, freshDesc.tinggi, mapelBankItems?.length || 0))
                                        ? freshDesc.tinggi
                                        : (currentTinggi || freshDesc.tinggi);

                                      return (
                                        <tr key={idx} className="border-b border-black hover:bg-slate-50/50">
                                          <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center font-semibold">{idx + 1}</td>
                                          <td className="p-1.5 print:py-0.5 print:px-1 border border-black font-semibold text-slate-900">{nm.mapel}</td>
                                          <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center font-bold text-slate-900">
                                            <span className={scoreVal < kktpVal ? "text-amber-700 dark:text-amber-400 font-extrabold" : "text-slate-900"}>
                                              {scoreVal}
                                            </span>
                                          </td>
                                          <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-[10.5px] print:text-[8.8px] leading-snug text-slate-800">
                                            <p>{displayText}</p>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Tabel B: Ekstrakurikuler */}
                          {studentRaport.ekskul && studentRaport.ekskul.length > 0 && (
                            <div className="space-y-1 print:space-y-0.5 mb-2.5 print:mb-1.5">
                              <h5 className="text-xs print:text-[10px] font-bold uppercase text-slate-900 tracking-wide">
                                B. Kegiatan Ekstrakurikuler
                              </h5>
                              <table className="raport-print-table w-full text-left text-xs print:text-[9.2px] border border-collapse border-black leading-tight">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-900 border-b border-black">
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black text-center w-8">No</th>
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black w-44">Nama Kegiatan</th>
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black text-center w-14">Predikat</th>
                                    <th className="p-1.5 print:py-0.5 print:px-1 border border-black">Keterangan</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {studentRaport.ekskul.map((ek, idx) => (
                                    <tr key={idx} className="border-b border-black">
                                      <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center">{idx + 1}</td>
                                      <td className="p-1.5 print:py-0.5 print:px-1 border border-black font-semibold">{ek.nama}</td>
                                      <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center font-bold">{ek.predikat}</td>
                                      <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-[10.5px] print:text-[8.8px]">{ek.keterangan}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Section C & D: Ketidakhadiran & Catatan (Side-by-side untuk 1 Lembar F4 Pas) */}
                          <div className="grid grid-cols-12 gap-3 print:gap-2 mb-2 print:mb-1 items-start">
                            {/* Absensi (5 Kolom) */}
                            <div className="col-span-12 sm:col-span-5 space-y-1 print:space-y-0.5">
                              <h5 className="text-xs print:text-[10px] font-bold uppercase text-slate-900 tracking-wide">
                                {studentRaport.ekskul && studentRaport.ekskul.length > 0 ? "C" : "B"}. Ketidakhadiran
                              </h5>
                              <table className="raport-print-table w-full text-xs print:text-[9.2px] border border-collapse border-black leading-tight">
                                <tbody>
                                  <tr className="border-b border-black">
                                    <td className="p-1.5 print:py-0.5 print:px-1 border border-black">Sakit (S)</td>
                                    <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center font-bold">{studentRaport.kehadiran?.sakit ?? 0} hari</td>
                                  </tr>
                                  <tr className="border-b border-black">
                                    <td className="p-1.5 print:py-0.5 print:px-1 border border-black">Izin (I)</td>
                                    <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center font-bold">{studentRaport.kehadiran?.izin ?? 0} hari</td>
                                  </tr>
                                  <tr>
                                    <td className="p-1.5 print:py-0.5 print:px-1 border border-black">Tanpa Keterangan (A)</td>
                                    <td className="p-1.5 print:py-0.5 print:px-1 border border-black text-center font-bold">{studentRaport.kehadiran?.alpa ?? 0} hari</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Catatan Wali Kelas (7 Kolom) */}
                            <div className="col-span-12 sm:col-span-7 space-y-1 print:space-y-0.5">
                              <h5 className="text-xs print:text-[10px] font-bold uppercase text-slate-900 tracking-wide">
                                {studentRaport.ekskul && studentRaport.ekskul.length > 0 ? "D" : "C"}. Catatan Wali Kelas
                              </h5>
                              <div className="p-2 print:p-1.5 border border-black text-xs print:text-[9px] min-h-[64px] print:min-h-[50px] leading-relaxed text-slate-800 italic bg-slate-50/40 rounded-sm">
                                "{studentRaport.catatanWaliKelas || "Tingkatkan terus semangat belajar, kedisiplinan, dan prestasimu!"}"
                              </div>
                            </div>
                          </div>

                          {/* Keputusan Kenaikan Kelas jika Semester Genap */}
                          {studentRaport.statusKenaikan && (
                            <div className="p-2 print:p-1 border border-black rounded-sm bg-slate-50 text-xs print:text-[9.5px] mb-2 print:mb-1">
                              <span className="font-bold uppercase mr-1.5">Keputusan Akhir Tahun:</span>
                              <span className="font-bold text-blue-900">
                                Berdasarkan pencapaian kompetensi, peserta didik dinyatakan: {studentRaport.statusKenaikan.status} ({studentRaport.statusKenaikan.keKelas || ""})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Area Tanda Tangan Resmi (Posisi pas pada bagian bawah kertas F4) */}
                        <div className={`pt-2 print:pt-1 ${showTtdKepsek ? "grid grid-cols-3 gap-2" : "flex justify-between px-8"} text-center text-xs print:text-[9.5px] text-slate-900`}>
                          <div className="space-y-10 print:space-y-6">
                            <div>
                              <p>Mengetahui,</p>
                              <p className="font-semibold">Orang Tua / Wali Siswa</p>
                            </div>
                            <p className="border-b border-black inline-block min-w-[140px] pb-1 font-semibold">
                              ( .................................... )
                            </p>
                          </div>

                          {showTtdKepsek && (
                            <div className="space-y-10 print:space-y-6">
                              <div>
                                <p>Mengetahui,</p>
                                <p className="font-semibold">Kepala Sekolah</p>
                              </div>
                              <div>
                                <p className="font-bold underline">{studentRaport.namaKepsek || config.Nama_Kepala_Sekolah || "SUBUR, S.Pd.SD."}</p>
                                <p className="text-[10px] print:text-[8px]">NIP. {studentRaport.nipKepsek || config.NIP_Kepala_Sekolah || "197002111993081001"}</p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-10 print:space-y-6">
                            <div>
                              <p>
                                {studentRaport.tempatTitimangsa || tempatTitimangsa || config.Tempat_Tanda_Tangan || "Kab. Bogor"},{" "}
                                {formatTanggalIndonesia(studentRaport.tanggalRaport || tanggalRaport)}
                              </p>
                              <p className="font-semibold">Guru Kelas / Wali Kelas</p>
                            </div>
                            <div>
                              <p className="font-bold underline">{studentRaport.namaGuruWali || currentUser.name || "Eri Iriana Rifai, S.Kom."}</p>
                              <p className="text-[10px] print:text-[8px]">NIP. {studentRaport.nipGuruWali || "-"}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: INPUT & EDIT NILAI RAPORT */}
      {/* ========================================================================= */}
      {activeSubTab === "input" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Pengisian & Penyesuaian Nilai Raport ({selectedKelas})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Nilai dan Tujuan Pembelajaran tersimpan otomatis secara permanen ke Cloud. Tidak akan hilang atau kembali ke default saat di-refresh.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Mode Switcher */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setInputViewMode("table");
                    try { localStorage.setItem("edadmin_input_view_mode", "table"); } catch {}
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    inputViewMode === "table"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Matriks Tabel (Sesuai Gambar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputViewMode("accordion");
                    try { localStorage.setItem("edadmin_input_view_mode", "accordion"); } catch {}
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    inputViewMode === "accordion"
                      ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Kartu Akordion Siswa</span>
                </button>
              </div>

              {/* Auto-Sync TP with Grade Toggle */}
              <button
                type="button"
                onClick={() => handleToggleAutoSyncTp(!autoSyncTpWithNilai)}
                className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
                  autoSyncTpWithNilai
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                }`}
                title="Saat aktif: Mengubah nilai akan langsung otomatis menyesuaikan deskripsi TP yang dimunculkan sesuai predikat nilai siswa"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${autoSyncTpWithNilai ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                <span>⚡ Auto-Sesuaikan TP dg Nilai: <strong className="underline">{autoSyncTpWithNilai ? "Aktif" : "Nonaktif"}</strong></span>
              </button>

              {/* Batch sync all students' TPs based on grades */}
              <button
                type="button"
                onClick={handleBatchSyncAllTpWithNilai}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 border border-amber-300 dark:border-amber-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Otomatis sinkronkan kalimat TP seluruh siswa sesuai nilai yang diperoleh dari Bank TP"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>⚡ Sesuaikan Semua TP dg Nilai</span>
              </button>

              {/* Auto-save cloud status badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isSaving ? "Menyimpan ke Cloud..." : "✓ Cloud Aktif"}</span>
              </div>

              {onNavigateToBankTp && (
                <button
                  type="button"
                  onClick={onNavigateToBankTp}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition"
                >
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  <span>Menu Bank TP</span>
                </button>
              )}

              <button
                onClick={handleSaveAllChanges}
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Menyimpan..." : "Simpan Semua Perubahan"}</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: TABEL MATRIKS (Matching Attached Image) */}
          {inputViewMode === "table" ? (
            <div className="space-y-3">
              {/* Filter Toolbar for Table View */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shrink-0">
                    <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Filter Tampilan Mapel:</span>
                  </span>
                  <select
                    value={selectedTableMapelFilter}
                    onChange={(e) => setSelectedTableMapelFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-2xs"
                  >
                    <option value="Semua">✨ Tampilkan Semua Mapel ({displayMapelNames.length})</option>
                    {displayMapelNames.map((mName, idx) => (
                      <option key={mName} value={mName}>
                        Mapel {idx + 1}: {mName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic">
                  💡 Tips: Kolom <strong>No</strong> &amp; <strong>Nama Siswa</strong> serta <strong>Header</strong> dibekukan (sticky) saat di-scroll.
                </div>
              </div>

              <div className="overflow-auto max-h-[75vh] border border-black rounded-xl shadow-xs bg-white dark:bg-slate-900 relative">
                <table className="w-full text-left text-xs border-collapse border border-black text-slate-900 dark:text-slate-100 font-sans relative">
                  <thead>
                    {/* Row 1: Header Titles */}
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-black sticky top-0 z-30">
                      <th className="p-2 border border-black text-center font-black w-10 min-w-[40px] uppercase bg-slate-200 dark:bg-slate-700 sticky left-0 z-40 border-r border-black" rowSpan={2}>
                        NO
                      </th>
                      <th className="p-2 border border-black text-left font-black w-48 min-w-[190px] uppercase bg-slate-200 dark:bg-slate-700 sticky left-[40px] z-40 border-r-2 border-black shadow-md" rowSpan={2}>
                        NAMA SISWA
                      </th>
                      <th 
                        className="p-2 border border-black text-center font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100" 
                        colSpan={visibleMapelNames.length}
                      >
                        MATA PELAJARAN
                      </th>
                      <th 
                        className="p-2 border border-black text-center font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700" 
                        colSpan={3}
                      >
                        ABSENSI
                      </th>
                      <th className="p-2 border border-black text-left font-black uppercase min-w-[250px] bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100" rowSpan={2}>
                        Catatan Wali Kelas &amp; Ekskul
                      </th>
                    </tr>

                    {/* Row 2: Sub-headers for Mapels & Absensi */}
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-b border-black sticky top-[36px] z-20">
                      {visibleMapelNames.map((mName) => {
                        const mIdx = displayMapelNames.indexOf(mName);
                        return (
                          <th key={mName} className="p-2 border border-black text-center font-bold text-[11px] min-w-[240px] max-w-[280px] bg-slate-100 dark:bg-slate-800">
                            <div className="font-extrabold uppercase text-slate-900 dark:text-slate-100 truncate" title={mName}>
                              MAPEL {mIdx !== -1 ? mIdx + 1 : ""}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate mt-0.5">
                              {mName}
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-1.5 border border-black text-center font-extrabold text-[11px] min-w-[54px] w-14 bg-slate-100 dark:bg-slate-800" title="Sakit">
                        <div>S</div>
                        <div className="text-[9px] font-normal text-slate-500 dark:text-slate-400">Sakit</div>
                      </th>
                      <th className="p-1.5 border border-black text-center font-extrabold text-[11px] min-w-[54px] w-14 bg-slate-100 dark:bg-slate-800" title="Izin">
                        <div>I</div>
                        <div className="text-[9px] font-normal text-slate-500 dark:text-slate-400">Izin</div>
                      </th>
                      <th className="p-1.5 border border-black text-center font-extrabold text-[11px] min-w-[54px] w-14 bg-slate-100 dark:bg-slate-800" title="Alpa / Tanpa Keterangan">
                        <div>A</div>
                        <div className="text-[9px] font-normal text-slate-500 dark:text-slate-400">Alpa</div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {classStudents.map((s, idx) => {
                      const studentRaport = getRaportForStudent(s);

                      return (
                        <tr key={s.id} className="border-b border-black hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          {/* NO (Sticky Column) */}
                          <td className="p-2 border border-black text-center font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 align-top sticky left-0 z-10 w-10 min-w-[40px]">
                            {idx + 1}
                          </td>

                          {/* NAMA SISWA (Sticky Column) */}
                          <td className="p-2.5 border border-black align-top bg-white dark:bg-slate-900 sticky left-[40px] z-10 w-48 min-w-[190px] border-r-2 border-black shadow-md">
                            <strong className="block text-xs font-bold text-slate-900 dark:text-slate-100 uppercase leading-snug">
                              {s.nama}
                            </strong>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-1">
                              NISN: {s.nisn || "-"}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              NIS: {s.nis || "-"}
                            </span>
                          </td>

                          {/* MAPEL CELLS */}
                          {visibleMapelNames.map((mName) => {
                            const mOriginalIdx = studentRaport.nilaiMapel.findIndex((x) => x.mapel.toLowerCase() === mName.toLowerCase());
                            
                            const nm = mOriginalIdx !== -1 
                              ? studentRaport.nilaiMapel[mOriginalIdx] 
                              : { mapel: mName, kktp: 75, nilaiAkhir: 80, capaianKompetensiTinggi: "", capaianKompetensiPerluBimbingan: "", deskripsi: "" };

                            const currentTps = effectiveTpBank[mName] || DEFAULT_TP_TEMPLATES[mName] || [];

                            return (
                              <td key={mName} className="p-2 border border-black align-top space-y-2 bg-white dark:bg-slate-900 min-w-[240px]">
                                {/* Score Input Box */}
                                <div className="flex items-center justify-center space-x-1 pb-1 border-b border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-500">Nilai:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={nm.nilaiAkhir}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      const clampedVal = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
                                      const targetIdx = mOriginalIdx !== -1 ? mOriginalIdx : studentRaport.nilaiMapel.length;
                                      const updatedNilaiMapel = [...studentRaport.nilaiMapel];

                                      let currentTinggi = nm.capaianKompetensiTinggi || nm.deskripsi || "";
                                      let currentBimbingan = nm.capaianKompetensiPerluBimbingan || "";

                                      const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
                                      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, mName) && isMatchingClass(b.kelas, s.kelas));
                                      const desc = generateFallbackDeskripsiFromTp(mName, clampedVal, currentTps, mapelBankItems, s.kelas, kktpVal);
                                      currentTinggi = desc.tinggi;
                                      currentBimbingan = desc.perluBimbingan;

                                      updatedNilaiMapel[targetIdx] = {
                                        ...nm,
                                        mapel: mName,
                                        nilaiAkhir: clampedVal,
                                        kktp: kktpVal,
                                        capaianKompetensiTinggi: currentTinggi,
                                        capaianKompetensiPerluBimbingan: currentBimbingan,
                                        deskripsi: currentTinggi
                                      };
                                      handleUpdateRaportRecord({
                                        ...studentRaport,
                                        nilaiMapel: updatedNilaiMapel
                                      });
                                    }}
                                    className="w-16 text-center text-xs font-extrabold p-1 border border-black rounded bg-slate-50 dark:bg-slate-800 text-blue-900 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                  />
                                </div>

                                {/* Quick Action Toolbar (Bank TP, Sesuaikan TP, AI) */}
                                <div className="flex items-center justify-between gap-1 text-[9px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetIdx = mOriginalIdx !== -1 ? mOriginalIdx : studentRaport.nilaiMapel.length;
                                      setTpPickerState({
                                        isOpen: true,
                                        studentId: s.id,
                                        studentName: s.nama,
                                        studentNilai: !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80,
                                        mapel: mName,
                                        targetIdx,
                                        targetField: "tinggi"
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold border border-blue-300 hover:bg-blue-100 transition cursor-pointer"
                                    title="Pilih TP dari Bank TP"
                                  >
                                    Pilih Bank TP
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const scoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
                                      const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
                                      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, mName) && isMatchingClass(b.kelas, s.kelas));
                                      const desc = generateFallbackDeskripsiFromTp(mName, scoreVal, currentTps, mapelBankItems, s.kelas, kktpVal);
                                      const targetIdx = mOriginalIdx !== -1 ? mOriginalIdx : studentRaport.nilaiMapel.length;
                                      const updatedNilaiMapel = [...studentRaport.nilaiMapel];
                                      updatedNilaiMapel[targetIdx] = {
                                        ...nm,
                                        mapel: mName,
                                        nilaiAkhir: scoreVal,
                                        kktp: kktpVal,
                                        capaianKompetensiTinggi: desc.tinggi,
                                        capaianKompetensiPerluBimbingan: desc.perluBimbingan,
                                        deskripsi: desc.tinggi
                                      };
                                      handleUpdateRaportRecord({
                                        ...studentRaport,
                                        nilaiMapel: updatedNilaiMapel
                                      });
                                    }}
                                    className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                                    title="Sesuaikan TP dengan nilai"
                                  >
                                    ⚡ Sesuaikan
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickStudentAiDeskripsi(s, mName, Number(nm.nilaiAkhir) || 80)}
                                    className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
                                    title="Generate AI Deskripsi"
                                  >
                                    ✨ AI
                                  </button>
                                </div>

                                {(() => {
                                  const cellScoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
                                  const cellKktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
                                  const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, mName) && isMatchingClass(b.kelas, s.kelas));
                                  const freshDesc = generateFallbackDeskripsiFromTp(
                                    mName,
                                    cellScoreVal,
                                    currentTps,
                                    mapelBankItems,
                                    s.kelas,
                                    cellKktpVal
                                  );

                                  const isTuntas = cellScoreVal >= cellKktpVal;
                                  const currentTinggiVal = (nm.capaianKompetensiTinggi || nm.deskripsi || "").trim();
                                  const isMismatchWithScore = isTuntas
                                    ? !currentTinggiVal.startsWith("Menunjukkan penguasaan sangat baik dalam")
                                    : !currentTinggiVal.startsWith("Perlu peningkatan konsistensi pemahaman dan pendampingan dalam");

                                  const needsTinggi = isMismatchWithScore || shouldRefreshDeskripsi(currentTinggiVal, freshDesc.tinggi, mapelBankItems?.length || 0);
                                  const needsBimbingan = shouldRefreshDeskripsi(nm.capaianKompetensiPerluBimbingan, freshDesc.perluBimbingan, mapelBankItems?.length || 0);

                                  const displayTinggi = needsTinggi
                                    ? freshDesc.tinggi
                                    : (nm.capaianKompetensiTinggi || nm.deskripsi || freshDesc.tinggi);

                                  const displayBimbingan = needsBimbingan
                                    ? freshDesc.perluBimbingan
                                    : (nm.capaianKompetensiPerluBimbingan || freshDesc.perluBimbingan);

                                  return (
                                    <>
                                      {/* Capaian Tertinggi Box */}
                                      <div className="space-y-0.5">
                                        <span className="block text-[9.5px] font-bold text-slate-900 dark:text-slate-100">
                                          Capaian Tertinggi:
                                        </span>
                                        <textarea
                                          rows={3}
                                          value={displayTinggi}
                                          onChange={(e) => {
                                            const targetIdx = mOriginalIdx !== -1 ? mOriginalIdx : studentRaport.nilaiMapel.length;
                                            const updatedNilaiMapel = [...studentRaport.nilaiMapel];
                                            updatedNilaiMapel[targetIdx] = {
                                              ...nm,
                                              mapel: mName,
                                              capaianKompetensiTinggi: e.target.value,
                                              deskripsi: e.target.value
                                            };
                                            handleUpdateRaportRecord({
                                              ...studentRaport,
                                              nilaiMapel: updatedNilaiMapel
                                            });
                                          }}
                                          className="w-full text-[10px] p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 leading-relaxed resize-y"
                                          placeholder="Capaian Tertinggi: Diisi otomatis sesuai materi TP kelas & nilai..."
                                        />
                                      </div>

                                      {/* Perlu Peningkatan / Bimbingan Box */}
                                      <div className="space-y-0.5">
                                        <span className="block text-[9.5px] font-bold text-slate-900 dark:text-slate-100">
                                          Perlu Peningkatan / Bimbingan:
                                        </span>
                                        <textarea
                                          rows={3}
                                          value={displayBimbingan}
                                          onChange={(e) => {
                                            const targetIdx = mOriginalIdx !== -1 ? mOriginalIdx : studentRaport.nilaiMapel.length;
                                            const updatedNilaiMapel = [...studentRaport.nilaiMapel];
                                            updatedNilaiMapel[targetIdx] = {
                                              ...nm,
                                              mapel: mName,
                                              capaianKompetensiPerluBimbingan: e.target.value
                                            };
                                            handleUpdateRaportRecord({
                                              ...studentRaport,
                                              nilaiMapel: updatedNilaiMapel
                                            });
                                          }}
                                          className="w-full text-[10px] p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-600 leading-relaxed resize-y"
                                          placeholder="Perlu Peningkatan / Bimbingan: Diisi otomatis sesuai materi TP kelas & nilai..."
                                        />
                                      </div>
                                    </>
                                  );
                                })()}
                              </td>
                            );
                          })}

                          {/* ABSENSI CELLS (S, I, A) */}
                          <td className="p-1.5 border border-black align-top text-center bg-white dark:bg-slate-900 min-w-[54px] w-14">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={studentRaport.kehadiran.sakit}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  kehadiran: {
                                    ...studentRaport.kehadiran,
                                    sakit: parseInt(e.target.value, 10) || 0
                                  }
                                });
                              }}
                              className="w-11 h-8 text-center text-xs font-black px-1 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
                              title="Jumlah Sakit"
                            />
                          </td>
                          <td className="p-1.5 border border-black align-top text-center bg-white dark:bg-slate-900 min-w-[54px] w-14">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={studentRaport.kehadiran.izin}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  kehadiran: {
                                    ...studentRaport.kehadiran,
                                    izin: parseInt(e.target.value, 10) || 0
                                  }
                                });
                              }}
                              className="w-11 h-8 text-center text-xs font-black px-1 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
                              title="Jumlah Izin"
                            />
                          </td>
                          <td className="p-1.5 border border-black align-top text-center bg-white dark:bg-slate-900 min-w-[54px] w-14">
                            <input
                              type="number"
                              min="0"
                              max="365"
                              value={studentRaport.kehadiran.alpa}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  kehadiran: {
                                    ...studentRaport.kehadiran,
                                    alpa: parseInt(e.target.value, 10) || 0
                                  }
                                });
                              }}
                              className="w-11 h-8 text-center text-xs font-black px-1 py-1 rounded border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
                              title="Jumlah Alpa"
                            />
                          </td>

                        {/* CATATAN WALI KELAS & EKSKUL */}
                        <td className="p-2 border border-black align-top space-y-2 bg-white dark:bg-slate-900 min-w-[250px]">
                          {/* Catatan Wali Kelas */}
                          <div>
                            <span className="block text-[10px] font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                              Catatan Wali Kelas:
                            </span>
                            <textarea
                              rows={2}
                              value={studentRaport.catatanWaliKelas}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  catatanWaliKelas: e.target.value
                                });
                              }}
                              className="w-full text-[10px] p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                              placeholder="Catatan kemajuan belajar & motivasi Wali Kelas..."
                            />
                          </div>

                          {/* Kegiatan Ekstrakurikuler */}
                          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-purple-800 dark:text-purple-300 flex items-center space-x-1">
                                <Award className="w-3 h-3 text-purple-600" />
                                <span>Ekskul ({(studentRaport.ekskul || []).length}):</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentEkskul = studentRaport.ekskul || [];
                                  const newEntry = {
                                    nama: currentEkskul.length === 0 ? "Pramuka" : "Pencak Silat",
                                    predikat: "A",
                                    keterangan: "Aktif mengikuti kegiatan dengan sangat baik."
                                  };
                                  handleUpdateRaportRecord({
                                    ...studentRaport,
                                    ekskul: [...currentEkskul, newEntry]
                                  });
                                }}
                                className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-300 text-[9px] hover:bg-purple-100 transition cursor-pointer"
                              >
                                + Tambah Ekskul
                              </button>
                            </div>

                            {(!studentRaport.ekskul || studentRaport.ekskul.length === 0) ? (
                              <div className="text-[9px] text-slate-400 italic">Belum ada ekskul. Klik "+ Tambah Ekskul".</div>
                            ) : (
                              <div className="space-y-1.5">
                                {studentRaport.ekskul.map((ek, ekIdx) => (
                                  <div key={ekIdx} className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/60 space-y-1 text-[10px]">
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="text"
                                        value={ek.nama}
                                        onChange={(e) => {
                                          const updated = [...(studentRaport.ekskul || [])];
                                          updated[ekIdx] = { ...ek, nama: e.target.value };
                                          handleUpdateRaportRecord({ ...studentRaport, ekskul: updated });
                                        }}
                                        className="w-full font-bold px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        placeholder="Nama Ekskul"
                                      />
                                      <select
                                        value={ek.predikat}
                                        onChange={(e) => {
                                          const updated = [...(studentRaport.ekskul || [])];
                                          updated[ekIdx] = { ...ek, predikat: e.target.value };
                                          handleUpdateRaportRecord({ ...studentRaport, ekskul: updated });
                                        }}
                                        className="font-black px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-purple-800"
                                      >
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = (studentRaport.ekskul || []).filter((_, i) => i !== ekIdx);
                                          handleUpdateRaportRecord({ ...studentRaport, ekskul: updated });
                                        }}
                                        className="text-rose-500 hover:text-rose-700 p-0.5"
                                        title="Hapus ekskul"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={ek.keterangan}
                                      onChange={(e) => {
                                        const updated = [...(studentRaport.ekskul || [])];
                                        updated[ekIdx] = { ...ek, keterangan: e.target.value };
                                        handleUpdateRaportRecord({ ...studentRaport, ekskul: updated });
                                      }}
                                      className="w-full text-[9px] px-1 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                      placeholder="Keterangan ekskul..."
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
            /* VIEW MODE 2: KARTU AKORDION SISWA */
            <div className="space-y-4">
            {classStudents.map((s, idx) => {
              const studentRaport = getRaportForStudent(s);

              return (
                <div 
                  key={s.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <div className="p-4 bg-slate-100 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.nama}</strong>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">NISN: {s.nisn || "-"}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        S: <strong className="text-slate-800 dark:text-slate-200">{studentRaport.kehadiran.sakit}</strong> | 
                        I: <strong className="text-slate-800 dark:text-slate-200">{studentRaport.kehadiran.izin}</strong> | 
                        A: <strong className="text-slate-800 dark:text-slate-200">{studentRaport.kehadiran.alpa}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Grades Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {(() => {
                        const mapelOrderLookup = new Map<string, number>(displayMapelNames.map((m, idx) => [m.toLowerCase(), idx]));
                        const sortedNilaiMapelWithIdx = studentRaport.nilaiMapel
                          .map((nm, originalIdx) => ({ nm, originalIdx }))
                          .sort((a, b) => {
                            const orderA = mapelOrderLookup.get(a.nm.mapel.toLowerCase()) ?? 999;
                            const orderB = mapelOrderLookup.get(b.nm.mapel.toLowerCase()) ?? 999;
                            if (orderA !== orderB) return orderA - orderB;
                            return a.nm.mapel.localeCompare(b.nm.mapel);
                          });

                        return sortedNilaiMapelWithIdx.map(({ nm, originalIdx: mIdx }) => {
                          const orderNum = mapelOrderLookup.has(nm.mapel.toLowerCase())
                            ? (mapelOrderLookup.get(nm.mapel.toLowerCase())! + 1)
                            : null;
                          const isMapelActive = selectedMapelNames.includes(nm.mapel);
                          const currentTps = effectiveTpBank[nm.mapel] || DEFAULT_TP_TEMPLATES[nm.mapel] || [];

                          return (
                            <div 
                              key={nm.mapel} 
                              className={`p-3.5 rounded-xl border shadow-xs space-y-3 transition ${
                                isMapelActive 
                                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" 
                                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-80"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-700/50">
                                <div>
                                  <div className="flex items-center space-x-1.5">
                                    {orderNum !== null && (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-blue-600 text-white shadow-2xs" title={`Urutan ke-${orderNum} pada lembar nilai`}>
                                        #{orderNum}
                                      </span>
                                    )}
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px]" title={nm.mapel}>
                                      {nm.mapel}
                                    </span>
                                    {isMapelActive ? (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                        Dicetak
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                        Nonaktif
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTpMapel(nm.mapel);
                                      setIsTpModalOpen(true);
                                    }}
                                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center space-x-0.5 mt-0.5 cursor-pointer"
                                  >
                                    <BookmarkCheck className="w-3 h-3 mr-0.5" />
                                    <span>{currentTps.length} TP di Bank TP</span>
                                    <span>→</span>
                                  </button>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <span className="text-[10px] text-slate-400 font-bold">Nilai:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={nm.nilaiAkhir}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      const clampedVal = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
                                      const updatedNilaiMapel = [...studentRaport.nilaiMapel];

                                      const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
                                      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, nm.mapel) && isMatchingClass(b.kelas, s.kelas));
                                      const desc = generateFallbackDeskripsiFromTp(nm.mapel, clampedVal, currentTps, mapelBankItems, s.kelas, kktpVal);

                                      updatedNilaiMapel[mIdx] = {
                                        ...nm,
                                        nilaiAkhir: clampedVal,
                                        kktp: kktpVal,
                                        capaianKompetensiTinggi: desc.tinggi,
                                        capaianKompetensiPerluBimbingan: desc.perluBimbingan,
                                        deskripsi: desc.tinggi
                                      };
                                      handleUpdateRaportRecord({
                                        ...studentRaport,
                                        nilaiMapel: updatedNilaiMapel
                                      });
                                    }}
                                    className="w-14 text-center text-xs font-black p-1 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>

                              {/* Action Buttons: Pick from Bank TP, Auto-sync, or AI */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTpPickerState({
                                        isOpen: true,
                                        studentId: s.id,
                                        studentName: s.nama,
                                        studentNilai: !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80,
                                        mapel: nm.mapel,
                                        targetIdx: mIdx,
                                        targetField: "tinggi"
                                      });
                                    }}
                                    className="inline-flex items-center space-x-1 text-[10px] text-blue-700 dark:text-blue-300 hover:text-blue-900 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                                    title="Pilih Tujuan Pembelajaran dari Bank TP untuk siswa ini"
                                  >
                                    <BookmarkCheck className="w-3 h-3 text-blue-600" />
                                    <span>Pilih Bank TP</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const scoreVal = !isNaN(Number(nm.nilaiAkhir)) ? Number(nm.nilaiAkhir) : 80;
                                      const kktpVal = !isNaN(Number(nm.kktp)) ? Number(nm.kktp) : 75;
                                      const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, nm.mapel) && isMatchingClass(b.kelas, s.kelas));
                                      const desc = generateFallbackDeskripsiFromTp(nm.mapel, scoreVal, currentTps, mapelBankItems, s.kelas, kktpVal);
                                      const updatedNilaiMapel = [...studentRaport.nilaiMapel];
                                      updatedNilaiMapel[mIdx] = {
                                        ...nm,
                                        nilaiAkhir: scoreVal,
                                        kktp: kktpVal,
                                        capaianKompetensiTinggi: desc.tinggi,
                                        capaianKompetensiPerluBimbingan: desc.perluBimbingan,
                                        deskripsi: desc.tinggi
                                      };
                                      handleUpdateRaportRecord({
                                        ...studentRaport,
                                        nilaiMapel: updatedNilaiMapel
                                      });
                                      Swal.fire({
                                        icon: "success",
                                        title: "TP Disesuaikan!",
                                        text: `TP ${nm.mapel} untuk ${s.nama} disesuaikan dengan nilai ${scoreVal}.`,
                                        timer: 1100,
                                        showConfirmButton: false
                                      });
                                    }}
                                    className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                                    title="Sesuaikan otomatis TP dengan nilai siswa ini"
                                  >
                                    <RefreshCw className="w-3 h-3 text-emerald-600" />
                                    <span>⚡ Sesuaikan TP ({nm.nilaiAkhir})</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleQuickStudentAiDeskripsi(s, nm.mapel, Number(nm.nilaiAkhir) || 80)}
                                  className="inline-flex items-center space-x-1 text-[10px] text-amber-800 dark:text-amber-300 hover:text-amber-950 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                                  title="Generate otomatis kalimat capaian berbasis TP menggunakan AI"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  <span>✨ AI Deskripsi</span>
                                </button>
                              </div>

                              {/* Capaian Tertinggi */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                                    <span>Capaian Tertinggi:</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTpPickerState({
                                        isOpen: true,
                                        studentId: s.id,
                                        studentName: s.nama,
                                        studentNilai: typeof nm.nilaiAkhir === "number" ? nm.nilaiAkhir : 80,
                                        mapel: nm.mapel,
                                        targetIdx: mIdx,
                                        targetField: "tinggi"
                                      });
                                    }}
                                    className="text-[9px] text-blue-600 hover:underline"
                                  >
                                    Ubah TP
                                  </button>
                                </div>

                                <textarea
                                  rows={2}
                                  value={nm.capaianKompetensiTinggi || nm.deskripsi || ""}
                                  onChange={(e) => {
                                    const updatedNilaiMapel = [...studentRaport.nilaiMapel];
                                    updatedNilaiMapel[mIdx] = {
                                      ...nm,
                                      capaianKompetensiTinggi: e.target.value,
                                      deskripsi: e.target.value
                                    };
                                    handleUpdateRaportRecord({
                                      ...studentRaport,
                                      nilaiMapel: updatedNilaiMapel
                                    });
                                  }}
                                  className="w-full text-[11px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                                  placeholder="Deskripsi Capaian Kompetensi Tertinggi..."
                                />
                              </div>

                              {/* Capaian Perlu Bimbingan */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                                    Perlu Peningkatan / Bimbingan:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTpPickerState({
                                        isOpen: true,
                                        studentId: s.id,
                                        studentName: s.nama,
                                        studentNilai: typeof nm.nilaiAkhir === "number" ? nm.nilaiAkhir : 80,
                                        mapel: nm.mapel,
                                        targetIdx: mIdx,
                                        targetField: "bimbingan"
                                      });
                                    }}
                                    className="text-[9px] text-amber-600 hover:underline"
                                  >
                                    Ubah TP
                                  </button>
                                </div>

                                <textarea
                                  rows={2}
                                  value={nm.capaianKompetensiPerluBimbingan || ""}
                                  onChange={(e) => {
                                    const updatedNilaiMapel = [...studentRaport.nilaiMapel];
                                    updatedNilaiMapel[mIdx] = {
                                      ...nm,
                                      capaianKompetensiPerluBimbingan: e.target.value
                                    };
                                    handleUpdateRaportRecord({
                                      ...studentRaport,
                                      nilaiMapel: updatedNilaiMapel
                                    });
                                  }}
                                  className="w-full text-[11px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                                  placeholder="Materi yang masih memerlukan pendampingan / pengayaan..."
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Attendance & Catatan Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                          Rekap Absensi (Hari)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Sakit</span>
                            <input
                              type="number"
                              min="0"
                              value={studentRaport.kehadiran.sakit}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  kehadiran: {
                                    ...studentRaport.kehadiran,
                                    sakit: parseInt(e.target.value, 10) || 0
                                  }
                                });
                              }}
                              className="w-full text-xs font-bold p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Izin</span>
                            <input
                              type="number"
                              min="0"
                              value={studentRaport.kehadiran.izin}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  kehadiran: {
                                    ...studentRaport.kehadiran,
                                    izin: parseInt(e.target.value, 10) || 0
                                  }
                                });
                              }}
                              className="w-full text-xs font-bold p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Alpa</span>
                            <input
                              type="number"
                              min="0"
                              value={studentRaport.kehadiran.alpa}
                              onChange={(e) => {
                                handleUpdateRaportRecord({
                                  ...studentRaport,
                                  kehadiran: {
                                    ...studentRaport.kehadiran,
                                    alpa: parseInt(e.target.value, 10) || 0
                                  }
                                });
                              }}
                              className="w-full text-xs font-bold p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                          Catatan Wali Kelas
                        </label>
                        <textarea
                          rows={2}
                          value={studentRaport.catatanWaliKelas}
                          onChange={(e) => {
                            handleUpdateRaportRecord({
                              ...studentRaport,
                              catatanWaliKelas: e.target.value
                            });
                          }}
                          className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Tuliskan catatan kemajuan belajar dan motivasi..."
                        />
                      </div>
                    </div>

                    {/* Kegiatan Ekstrakurikuler Editor Section */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Kegiatan Ekstrakurikuler & Nilai Predikat
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            ({(studentRaport.ekskul || []).length} Kegiatan)
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              const currentEkskul = studentRaport.ekskul || [];
                              const newEntry = {
                                nama: currentEkskul.length === 0 ? "Pramuka" : currentEkskul.length === 1 ? "Pencak Silat" : "Seni Tari / Musik",
                                predikat: "A",
                                keterangan: "Aktif mengikuti kegiatan ekstrakurikuler dengan sangat baik dan disiplin."
                              };
                              handleUpdateRaportRecord({
                                ...studentRaport,
                                ekskul: [...currentEkskul, newEntry]
                              });
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 text-[11px] font-bold transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-purple-600" />
                            <span>Tambah Jenis Ekskul</span>
                          </button>

                          {(studentRaport.ekskul || []).length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentEkskulList = studentRaport.ekskul || [];
                                const nextRecords = { ...raportRecords };
                                let countApplied = 0;
                                classStudents.forEach((st) => {
                                  const rec = getRaportForStudent(st);
                                  const cleanTahun = selectedTahunAjaran.replace(/\//g, "-");
                                  const primaryId = `raport_${st.id}_${cleanTahun}_${selectedPeriode}`;
                                  nextRecords[primaryId] = {
                                    ...rec,
                                    ekskul: JSON.parse(JSON.stringify(currentEkskulList)),
                                    updatedAt: Date.now()
                                  };
                                  saveDocument(COLLECTIONS.RAPORT_RECORDS, primaryId, nextRecords[primaryId]);
                                  countApplied++;
                                });
                                setRaportRecords(nextRecords);
                                try {
                                  localStorage.setItem("edadmin_persisted_raport_records", JSON.stringify(nextRecords));
                                } catch {}
                                Swal.fire({
                                  icon: "success",
                                  title: "Format Ekskul Disalin!",
                                  text: `Jenis kegiatan ekskul telah disalin ke seluruh ${countApplied} siswa kelas ${selectedKelas}.`,
                                  timer: 1600,
                                  showConfirmButton: false
                                });
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition cursor-pointer"
                              title="Terapkan daftar jenis ekskul ini ke seluruh siswa dalam satu kelas"
                            >
                              <Copy className="w-3 h-3 text-indigo-600" />
                              <span>Salin ke Seluruh Sekelas</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {(!studentRaport.ekskul || studentRaport.ekskul.length === 0) ? (
                        <div className="text-center py-3 text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                          Belum ada kegiatan ekstrakurikuler untuk {s.nama}. Klik tombol "Tambah Jenis Ekskul" di atas.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {studentRaport.ekskul.map((ek, ekIdx) => (
                            <div
                              key={ekIdx}
                              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 items-center"
                            >
                              {/* Nama Ekskul */}
                              <div className="sm:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                  Nama Ekskul #{ekIdx + 1}
                                </label>
                                <input
                                  type="text"
                                  list={`ekskul-options-${s.id}-${ekIdx}`}
                                  value={ek.nama}
                                  onChange={(e) => {
                                    const updatedEkskul = [...(studentRaport.ekskul || [])];
                                    updatedEkskul[ekIdx] = { ...ek, nama: e.target.value };
                                    handleUpdateRaportRecord({
                                      ...studentRaport,
                                      ekskul: updatedEkskul
                                    });
                                  }}
                                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="Nama Ekskul (contoh: Pramuka)"
                                />
                                <datalist id={`ekskul-options-${s.id}-${ekIdx}`}>
                                  <option value="Pramuka" />
                                  <option value="Pencak Silat" />
                                  <option value="Seni Tari / Musik" />
                                  <option value="Dokter Kecil / UKS" />
                                  <option value="PMR / Palang Merah" />
                                  <option value="Futsal / Sepakbola" />
                                  <option value="Bulutangkis" />
                                  <option value="English Club" />
                                  <option value="Marawis / Hadroh" />
                                  <option value="Sains / Math Club" />
                                </datalist>
                              </div>

                              {/* Predikat */}
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                  Predikat
                                </label>
                                <select
                                  value={ek.predikat}
                                  onChange={(e) => {
                                    const updatedEkskul = [...(studentRaport.ekskul || [])];
                                    updatedEkskul[ekIdx] = { ...ek, predikat: e.target.value };
                                    handleUpdateRaportRecord({
                                      ...studentRaport,
                                      ekskul: updatedEkskul
                                    });
                                  }}
                                  className="w-full text-xs font-black px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                                >
                                  <option value="A">A (Sangat Baik)</option>
                                  <option value="B">B (Baik)</option>
                                  <option value="C">C (Cukup)</option>
                                  <option value="D">D (Kurang)</option>
                                </select>
                              </div>

                              {/* Keterangan */}
                              <div className="sm:col-span-5">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                  Keterangan / Deskripsi Kemajuan
                                </label>
                                <input
                                  type="text"
                                  value={ek.keterangan}
                                  onChange={(e) => {
                                    const updatedEkskul = [...(studentRaport.ekskul || [])];
                                    updatedEkskul[ekIdx] = { ...ek, keterangan: e.target.value };
                                    handleUpdateRaportRecord({
                                      ...studentRaport,
                                      ekskul: updatedEkskul
                                    });
                                  }}
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="Deskripsi keaktifan dan pencapaian siswa..."
                                />
                              </div>

                              {/* Delete Button */}
                              <div className="sm:col-span-1 flex items-center justify-center pt-2 sm:pt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedEkskul = (studentRaport.ekskul || []).filter((_, i) => i !== ekIdx);
                                    handleUpdateRaportRecord({
                                      ...studentRaport,
                                      ekskul: updatedEkskul
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                                  title="Hapus kegiatan ekskul ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: LEGER & REKAP NILAI KELAS */}
      {/* ========================================================================= */}
      {activeSubTab === "leger" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Leger Nilai Raport Kelas ({selectedKelas})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rekapitulasi seluruh nilai mata pelajaran, rata-rata, ranking, dan absensi sekelas.
              </p>
            </div>

            <button
              onClick={handleExportLegerExcel}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Leger ke Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                <tr>
                  <th className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 w-10">No</th>
                  <th className="p-2.5 font-bold border-b border-r border-slate-200 dark:border-slate-600 min-w-[180px]">Nama Siswa</th>
                  <th className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 w-24">NISN</th>
                  {(() => {
                    const displayMapelList = displayMapelNames.length > 0 ? displayMapelNames : activeMapelNames;
                    return displayMapelList.map((m, idx) => (
                      <th key={idx} className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 min-w-[70px]" title={m}>
                        {m.split(" ").slice(0, 2).join(" ")}
                      </th>
                    ));
                  })()}
                  <th className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 w-16 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Total</th>
                  <th className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 w-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">Rata2</th>
                  <th className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 w-12">S</th>
                  <th className="p-2.5 text-center font-bold border-b border-r border-slate-200 dark:border-slate-600 w-12">I</th>
                  <th className="p-2.5 text-center font-bold border-b border-slate-200 dark:border-slate-600 w-12">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {classStudents.map((student, idx) => {
                  const studentRaport = getRaportForStudent(student);
                  const displayMapelList = displayMapelNames.length > 0 ? displayMapelNames : activeMapelNames;
                  const scores = displayMapelList.map((m) => {
                    const matched = studentRaport.nilaiMapel.find((nm) => nm.mapel.toLowerCase() === m.toLowerCase());
                    return typeof matched?.nilaiAkhir === "number" ? matched.nilaiAkhir : Number(matched?.nilaiAkhir || 80);
                  });
                  const total = scores.reduce((a, b) => a + b, 0);
                  const avg = Math.round((total / (scores.length || 1)) * 10) / 10;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="p-2.5 text-center font-semibold text-slate-500 border-r border-slate-200 dark:border-slate-700">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">{student.nama}</td>
                      <td className="p-2.5 text-center text-slate-500 border-r border-slate-200 dark:border-slate-700">{student.nisn || "-"}</td>
                      {scores.map((sc, mIdx) => (
                        <td key={mIdx} className="p-2.5 text-center font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                          {sc}
                        </td>
                      ))}
                      <td className="p-2.5 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border-r border-slate-200 dark:border-slate-700">{total}</td>
                      <td className="p-2.5 text-center font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 border-r border-slate-200 dark:border-slate-700">{avg}</td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{studentRaport.kehadiran.sakit}</td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">{studentRaport.kehadiran.izin}</td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">{studentRaport.kehadiran.alpa}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: IMPORT EXCEL & PANDUAN */}
      {/* ========================================================================= */}
      {activeSubTab === "import" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Upload className="w-5 h-5 text-amber-500" />
                <span>Import Nilai Raport dari Excel (.xlsx / .xls)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Unggah file Excel untuk mengisi nilai raport, absensi, dan catatan wali kelas seluruh siswa sekaligus.
              </p>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Excel Siap Pakai</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Klik untuk Memilih File Excel (.xlsx / .xls)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gunakan template yang telah disediakan untuk memastikan struktur kolom sesuai.
              </p>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Otomatis mendeteksi nama siswa, nilai tiap mapel, dan rekap ketidakhadiran</span>
            </div>
          </div>

          {/* Guidelines Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 space-y-2">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <FileCheck className="w-4 h-4" />
                <span>1. Unduh Template</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Unduh template Excel untuk kelas yang dipilih. Template sudah memuat daftar nama siswa dan susunan mata pelajaran resmi.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                <Edit3 className="w-4 h-4" />
                <span>2. Isi Angka Nilai</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Masukkan nilai angka bulat skala 0-100 pada setiap kolom mapel, serta jumlah sakit, izin, alpa, dan catatan wali kelas.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>3. Upload & Simpan</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload file yang sudah diisi, periksa pratinjau data, lalu klik simpan untuk langsung mencetak raport berformat rapi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PREVIEW IMPORT EXCEL */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>Pratinjau Data Import Excel ({importPreviewData.length} Siswa)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Periksa data hasil parsing file Excel sebelum dimasukkan ke database sistem.
                </p>
              </div>

              <button
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {importErrors.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Catatan Peringatan Parsing:</span>
                  </span>
                  <ul className="text-xs text-rose-600 dark:text-rose-400 list-disc list-inside space-y-0.5 pl-2">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    <tr>
                      <th className="p-2 text-center w-10">No</th>
                      <th className="p-2">Nama Siswa</th>
                      <th className="p-2 text-center">NISN</th>
                      <th className="p-2 text-center">Status Cocok</th>
                      <th className="p-2 text-center">Nilai Terbaca</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {importPreviewData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-2 text-center font-semibold text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{item.namaSiswa}</td>
                        <td className="p-2 text-center text-slate-500">{item.nisn || "-"}</td>
                        <td className="p-2 text-center">
                          {item.matchedStudent ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sesuai</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Siswa Baru</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center text-slate-600 dark:text-slate-300 font-semibold">
                          {Object.keys(item.data).filter((k) => !["No", "NISN", "NIS", "Nama Siswa", "Kelas"].includes(k)).length} Kolom
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-900/40">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleCommitImport}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition active:scale-95 cursor-pointer"
              >
                Terapkan Data ke Raport
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH MATA PELAJARAN SECARA MANUAL LANGSUNG & TERINTEGRASI */}
      {/* ========================================================================= */}
      {isAddMapelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Tambah Mata Pelajaran Manual
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Langsung aktif pada raport dan terintegrasi ke database master mapel.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMapelModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewMapel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Nama Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newMapelNama}
                  onChange={(e) => setNewMapelNama(e.target.value)}
                  placeholder="Misal: Bahasa Sunda, Tahfidz Al-Qur'an, Koding & AI..."
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                {/* Quick Presets */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] text-slate-400 font-semibold block">Saran Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Bahasa Sunda",
                      "Tahfidz Al-Qur'an",
                      "Bahasa Arab",
                      "Koding & Robotika",
                      "Pendidikan Lingkungan Hidup",
                      "Prakarya & Kewirausahaan"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewMapelNama(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-600"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={newMapelSemester}
                    onChange={(e) => setNewMapelSemester(e.target.value as "Ganjil" | "Genap")}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={selectedTahunAjaran}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Integrasi Otomatis:</span>
                </span>
                <p className="text-[11px] leading-relaxed">
                  Mata pelajaran baru akan otomatis tersimpan di data master, dicentang pada cetak raport, serta langsung siap diisi nilai dan deskripsi AI.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddMapelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  Simpan & Integrasikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KELOLA TUJUAN PEMBELAJARAN (TP) & GENERATOR AI DESKRIPSI RAPORT */}
      {/* ========================================================================= */}
      {isTpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50/40 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <span>Kelola TP & Generator AI Deskripsi Raport</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold">
                      Kurikulum Merdeka
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Masukkan Tujuan Pembelajaran (TP) secara manual lalu generate deskripsi capaian otomatis atau per siswa dengan AI.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTpModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Subject Selector Tab Bar inside Modal */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Pilih Mata Pelajaran:</span>
                <select
                  value={activeTpMapel}
                  onChange={(e) => {
                    setActiveTpMapel(e.target.value);
                    setAiPreviewTinggi("");
                    setAiPreviewBimbingan("");
                  }}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {displayMapelNames.length > 0 ? (
                    displayMapelNames.map((m) => (
                      <option key={m} value={m}>
                        {m} ({(effectiveTpBank[m] || []).length} TP)
                      </option>
                    ))
                  ) : (
                    <option value="">-- Tidak ada mapel aktif untuk {selectedKelas} --</option>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={handleLoadDefaultTps}
                className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                title="Muat contoh Tujuan Pembelajaran standar Kurikulum Merdeka Kemendikbudristek"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Muat Contoh TP Kurikulum Merdeka</span>
              </button>
            </div>

            {/* Modal Body: Split 2 Kolom (Kiri: TP Manual, Kanan: AI Generator) */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kolom 1: Manajemen Tujuan Pembelajaran (TP) Manual */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                    <ListChecks className="w-4 h-4 text-blue-600" />
                    <span>Daftar Tujuan Pembelajaran ({currentMapelTps.length} TP)</span>
                  </h4>
                </div>

                {/* Form Input Tambah TP Baru */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    + Tambah TP Baru Secara Manual:
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={newTpText}
                      onChange={(e) => setNewTpText(e.target.value)}
                      placeholder={`Tuliskan rumusan TP untuk ${activeTpMapel}...`}
                      className="flex-1 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTp}
                      disabled={!newTpText.trim()}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer self-end shrink-0"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* List TP yang sudah ada */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {currentMapelTps.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                      Belum ada Tujuan Pembelajaran yang ditambahkan untuk {activeTpMapel}.
                      <p className="mt-1 text-blue-600 dark:text-blue-400 font-semibold cursor-pointer" onClick={handleLoadDefaultTps}>
                        Klik di sini untuk memuat contoh TP standar.
                      </p>
                    </div>
                  ) : (
                    currentMapelTps.map((tp, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start justify-between gap-3 shadow-2xs group hover:border-blue-300 transition"
                      >
                        <div className="flex items-start space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            {tp}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTp(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer shrink-0"
                          title="Hapus TP ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Kolom 2: Generator AI Deskripsi Capaian Kompetensi */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Generator Deskripsi AI (Kurikulum Merdeka)</span>
                    </h4>
                  </div>

                  {/* Mode Pilihan: Semua Siswa vs Siswa Tertentu */}
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3">
                    <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                      Target Siswa untuk Digenerate:
                    </label>
                    <select
                      value={aiSelectedStudentId}
                      onChange={(e) => {
                        setAiSelectedStudentId(e.target.value);
                        setAiPreviewTinggi("");
                        setAiPreviewBimbingan("");
                      }}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">⚡ Seluruh Siswa Sekelas ({classStudents.length} Siswa)</option>
                      {classStudents.map((s) => {
                        const rec = getRaportForStudent(s);
                        const matched = rec.nilaiMapel.find((nm) => nm.mapel.toLowerCase() === activeTpMapel.toLowerCase());
                        const score = matched?.nilaiAkhir || 80;
                        return (
                          <option key={s.id} value={s.id}>
                            {s.nama} (Nilai: {score})
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      disabled={isGeneratingAi || currentMapelTps.length === 0}
                      onClick={handleGenerateAi}
                      className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-extrabold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {isGeneratingAi
                          ? "Sedang Menganalisis TP & Capaian Nilai..."
                          : aiSelectedStudentId === "all"
                          ? `Generate AI untuk Semua Siswa (${classStudents.length} Siswa)`
                          : "Generate AI untuk Siswa Ini"}
                      </span>
                    </button>
                  </div>

                  {/* Pratinjau Hasil Generate AI (Untuk Single Student) */}
                  {aiSelectedStudentId !== "all" && (
                    <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Pratinjau & Edit Hasil AI ({classStudents.find((s) => s.id === aiSelectedStudentId)?.nama}):
                      </span>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">
                          Capaian Kompetensi Tertinggi (Kekuatan):
                        </label>
                        <textarea
                          rows={2}
                          value={aiPreviewTinggi}
                          onChange={(e) => setAiPreviewTinggi(e.target.value)}
                          placeholder="Klik 'Generate AI' di atas untuk merumuskan kalimat capaian tertinggi..."
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block">
                          Perlu Peningkatan / Bimbingan:
                        </label>
                        <textarea
                          rows={2}
                          value={aiPreviewBimbingan}
                          onChange={(e) => setAiPreviewBimbingan(e.target.value)}
                          placeholder="Klik 'Generate AI' di atas untuk merumuskan aspek yang perlu bimbingan..."
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={!aiPreviewTinggi}
                        onClick={handleApplySingleAiToRaport}
                        className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Terapkan Deskripsi ke Raport Siswa</span>
                      </button>
                    </div>
                  )}

                  {aiSelectedStudentId === "all" && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 block">
                        ℹ️ Cara Kerja Batch AI Kurikulum Merdeka:
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        AI akan membaca seluruh nilai siswa pada mapel <strong>{activeTpMapel}</strong>, mencocokkannya dengan <strong>{currentMapelTps.length} Tujuan Pembelajaran</strong> yang Anda tentukan, lalu menuliskan deskripsi otentik: capaian tertinggi dan aspek bimbingan yang tepat sasaran untuk setiap siswa.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setIsTpModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  >
                    Tutup Menu TP
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PILIH DARI BANK TP (UNTUK SISWA & MAPEL TERTENTU) */}
      {/* ========================================================================= */}
      {tpPickerState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] flex flex-col animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                    Pilih Tujuan Pembelajaran dari Bank TP
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Siswa: <strong className="text-slate-800 dark:text-slate-200">{tpPickerState.studentName}</strong></span>
                    <span>• Mapel: <strong className="text-blue-600 dark:text-blue-400">{tpPickerState.mapel}</strong></span>
                    <span>• Nilai Raport:</span>
                    <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                      (tpPickerState.studentNilai ?? 80) >= 90
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : (tpPickerState.studentNilai ?? 80) >= 80
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                        : (tpPickerState.studentNilai ?? 80) >= 75
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                    }`}>
                      {tpPickerState.studentNilai ?? 80} ({(tpPickerState.studentNilai ?? 80) >= 90 ? "Sangat Baik" : (tpPickerState.studentNilai ?? 80) >= 80 ? "Baik" : (tpPickerState.studentNilai ?? 80) >= 75 ? "Cukup" : "Perlu Bimbingan"})
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTpPickerState((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Quick 1-Click Auto Adapt based on student grade */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rekomendasi Otomatis Sesuai Nilai {tpPickerState.studentNilai ?? 80}:</span>
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {(tpPickerState.studentNilai ?? 80) >= 90 ? "Sangat Baik — Dipilihkan TP penguasaan optimal & penalaran kritis." :
                   (tpPickerState.studentNilai ?? 80) >= 80 ? "Baik — Dipilihkan TP penguasaan materi pokok & penguatan." :
                   (tpPickerState.studentNilai ?? 80) >= 75 ? "Cukup — Memenuhi KKTP dengan catatan pendampingan latihan." :
                   "Perlu Bimbingan — Menampilkan materi remedial & pembinaan intensif."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const student = classStudents.find((s) => s.id === tpPickerState.studentId);
                  if (!student) return;
                  const score = tpPickerState.studentNilai ?? 80;
                  const mapelTps = effectiveTpBank[tpPickerState.mapel] || DEFAULT_TP_TEMPLATES[tpPickerState.mapel] || [];
                  const mapelBankItems = bankTpList?.filter((b) => isMatchingMapel(b.mapel, tpPickerState.mapel) && isMatchingClass(b.kelas, student.kelas));
                  const desc = generateFallbackDeskripsiFromTp(tpPickerState.mapel, score, mapelTps, mapelBankItems, student.kelas, 75);
                  
                  const currentRec = getRaportForStudent(student);
                  const updatedNilai = [...currentRec.nilaiMapel];
                  const targetIdx = tpPickerState.targetIdx >= 0 ? tpPickerState.targetIdx : updatedNilai.findIndex((x) => x.mapel.toLowerCase() === tpPickerState.mapel.toLowerCase());
                  if (targetIdx !== -1) {
                    updatedNilai[targetIdx] = {
                      ...updatedNilai[targetIdx],
                      capaianKompetensiTinggi: desc.tinggi,
                      capaianKompetensiPerluBimbingan: desc.perluBimbingan,
                      deskripsi: desc.tinggi
                    };
                    handleUpdateRaportRecord({
                      ...currentRec,
                      nilaiMapel: updatedNilai
                    });
                    Swal.fire({
                      icon: "success",
                      title: "TP Diterapkan Otomatis!",
                      text: `Deskripsi TP disesuaikan dengan nilai ${score} untuk ${student.nama}.`,
                      timer: 1300,
                      showConfirmButton: false
                    });
                    setTpPickerState((prev) => ({ ...prev, isOpen: false }));
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs whitespace-nowrap shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 transition active:scale-95 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Terapkan Otomatis Sesuai Nilai</span>
              </button>
            </div>

            {/* Target Field Tab Switcher */}
            <div className="flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                type="button"
                onClick={() => setTpPickerState((prev) => ({ ...prev, targetField: "tinggi" }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tpPickerState.targetField === "tinggi"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                }`}
              >
                ✓ Terapkan ke Capaian Tertinggi
              </button>
              <button
                type="button"
                onClick={() => setTpPickerState((prev) => ({ ...prev, targetField: "bimbingan" }))}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  tpPickerState.targetField === "bimbingan"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                }`}
              >
                ⚠️ Terapkan ke Perlu Bimbingan
              </button>
            </div>

            {/* List of Available TPs for this Mapel */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {(() => {
                const mapelTps = effectiveTpBank[tpPickerState.mapel] || DEFAULT_TP_TEMPLATES[tpPickerState.mapel] || [];
                const fullBankTps = bankTpList.filter((x) => x.mapel.toLowerCase() === tpPickerState.mapel.toLowerCase());

                if (mapelTps.length === 0 && fullBankTps.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-500 space-y-3">
                      <p className="text-xs">
                        Belum ada Tujuan Pembelajaran yang tersimpan untuk mapel <strong>{tpPickerState.mapel}</strong>.
                      </p>
                      {onNavigateToBankTp && (
                        <button
                          type="button"
                          onClick={() => {
                            setTpPickerState((prev) => ({ ...prev, isOpen: false }));
                            onNavigateToBankTp();
                          }}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                        >
                          Buka Menu Bank TP untuk Menambahkan
                        </button>
                      )}
                    </div>
                  );
                }

                // Render unique TP texts
                const allTpTexts = Array.from(new Set([
                  ...fullBankTps.map((b) => b.tujuanPembelajaran),
                  ...mapelTps
                ]));

                return allTpTexts.map((tpText, idx) => {
                  const matchedBankItem = fullBankTps.find((b) => b.tujuanPembelajaran === tpText);

                  const handleApplyTp = (mode: "replace" | "append") => {
                    const student = classStudents.find((s) => s.id === tpPickerState.studentId);
                    if (!student) return;
                    const currentRec = getRaportForStudent(student);
                    const updatedNilai = [...currentRec.nilaiMapel];
                    const targetIdx = tpPickerState.targetIdx >= 0 ? tpPickerState.targetIdx : updatedNilai.findIndex((x) => x.mapel.toLowerCase() === tpPickerState.mapel.toLowerCase());

                    if (targetIdx === -1) return;

                    const cleanedSingle = cleanTpText(tpText, tpPickerState.mapel);
                    const formattedPhrase = tpPickerState.targetField === "tinggi"
                      ? `Menunjukkan penguasaan sangat baik dalam ${cleanedSingle}.`
                      : `Perlu peningkatan konsistensi pemahaman dan pendampingan dalam ${cleanedSingle}.`;

                    const currentFieldVal = tpPickerState.targetField === "tinggi"
                      ? (updatedNilai[targetIdx].capaianKompetensiTinggi || "")
                      : (updatedNilai[targetIdx].capaianKompetensiPerluBimbingan || "");

                    const finalVal = mode === "append" && currentFieldVal.trim()
                      ? `${currentFieldVal.trim()} ${formattedPhrase}`
                      : formattedPhrase;

                    if (tpPickerState.targetField === "tinggi") {
                      updatedNilai[targetIdx] = {
                        ...updatedNilai[targetIdx],
                        capaianKompetensiTinggi: finalVal,
                        deskripsi: finalVal
                      };
                    } else {
                      updatedNilai[targetIdx] = {
                        ...updatedNilai[targetIdx],
                        capaianKompetensiPerluBimbingan: finalVal
                      };
                    }

                    handleUpdateRaportRecord({
                      ...currentRec,
                      nilaiMapel: updatedNilai
                    });

                    Swal.fire({
                      icon: "success",
                      title: "TP Diterapkan!",
                      text: `Tujuan Pembelajaran berhasil diterapkan ke capaian raport ${student.nama}.`,
                      timer: 1400,
                      showConfirmButton: false
                    });

                    setTpPickerState((prev) => ({ ...prev, isOpen: false }));
                  };

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            {matchedBankItem?.kodeTp && (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-bold">
                                {matchedBankItem.kodeTp}
                              </span>
                            )}
                            {matchedBankItem?.materiPokok && (
                              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
                                Materi: {matchedBankItem.materiPokok}
                              </span>
                            )}
                            {matchedBankItem?.kategori && (
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                matchedBankItem.kategori === "Tinggi"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                  : matchedBankItem.kategori === "Sedang"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                                Kategori {matchedBankItem.kategori}
                              </span>
                            )}
                            {(() => {
                              const score = tpPickerState.studentNilai ?? 80;
                              const isHighRec = score >= 85 && (matchedBankItem?.kategori === "Tinggi" || idx === 0);
                              const isMidRec = score >= 75 && score < 85 && (matchedBankItem?.kategori === "Sedang" || idx <= 1);
                              const isRemedialRec = score < 75 && (matchedBankItem?.kategori === "Dasar" || matchedBankItem?.kategori === "Remedial" || idx === allTpTexts.length - 1);
                              if (isHighRec || isMidRec || isRemedialRec) {
                                return (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-extrabold flex items-center gap-1 shadow-2xs">
                                    <span>⭐ Rekomendasi Nilai {score}</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                            {tpText}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleApplyTp("replace")}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Terapkan Kalimat Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTp("append")}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                        >
                          + Gabungkan Teks
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              {onNavigateToBankTp ? (
                <button
                  type="button"
                  onClick={() => {
                    setTpPickerState((prev) => ({ ...prev, isOpen: false }));
                    onNavigateToBankTp();
                  }}
                  className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Buka Menu Bank TP Lengkap →</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setTpPickerState((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
