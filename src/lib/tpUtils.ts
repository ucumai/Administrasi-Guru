import { BankTpItem } from "../types";

export const DEFAULT_MAPEL_LIST = [
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

export function getFaseByClass(kelas: string): string {
  const k = (kelas || "").toLowerCase();
  if (k.includes("1") || k.includes("2") || k.includes("i ") || k.includes("ii ")) return "Fase A";
  if (k.includes("3") || k.includes("4") || k.includes("iii") || k.includes("iv")) return "Fase B";
  if (k.includes("5") || k.includes("6") || k.includes("v") || k.includes("vi")) return "Fase C";
  if (k.includes("7") || k.includes("8") || k.includes("9") || k.includes("vii") || k.includes("viii") || k.includes("ix")) return "Fase D";
  if (k.includes("10") || k.includes("x")) return "Fase E";
  if (k.includes("11") || k.includes("12") || k.includes("xi") || k.includes("xii")) return "Fase F";
  return "Fase B";
}

export function cleanTpText(text: string, mapelFallback: string = ""): string {
  let t = (text || "").trim();
  // Remove numbering or prefixes such as "1.1 ", "TP 1.1: ", "TP 1 - "
  t = t.replace(/^(TP\s*[\d.]*[:\s-]*|\d+[\.\)]\s*)/i, "").trim();
  if (t.endsWith(".")) t = t.slice(0, -1);
  if (!t) return `konsep materi ${mapelFallback}`.trim();
  return t.charAt(0).toLowerCase() + t.slice(1);
}

/**
 * Filter Bank TP Items using 3 criteria: Mapel, Kelas/Fase, and Semester
 */
export function filterBankTpItems(
  bankTpList: BankTpItem[],
  mapel: string,
  kelas: string,
  semester?: "Ganjil" | "Genap" | string
): BankTpItem[] {
  if (!bankTpList || bankTpList.length === 0) return [];

  const mapelLower = (mapel || "").toLowerCase().trim();
  const kelasLower = (kelas || "").toLowerCase().trim();
  const semLower = (semester || "").toLowerCase().trim();
  const targetFase = getFaseByClass(kelas).toLowerCase().trim();

  return bankTpList.filter((item) => {
    // 1. Mapel filter (support aliases)
    const itemMapel = (item.mapel || "").toLowerCase().trim();
    const mapelMatch =
      itemMapel === mapelLower ||
      itemMapel.includes(mapelLower) ||
      mapelLower.includes(itemMapel) ||
      (mapelLower.includes("ipas") && itemMapel.includes("ipas")) ||
      (mapelLower.includes("pancasila") && itemMapel.includes("pancasila")) ||
      (mapelLower.includes("matematika") && (itemMapel.includes("matematika") || itemMapel.includes("mtk"))) ||
      (mapelLower.includes("agama") && itemMapel.includes("agama"));

    if (!mapelMatch) return false;

    // 2. Kelas / Fase filter
    const itemKelas = (item.kelas || "").toLowerCase().trim();
    const itemFase = (item.fase || "").toLowerCase().trim();
    const isSemuaKelas = !item.kelas || itemKelas === "semua kelas" || itemKelas === "semua" || itemKelas === "";

    const classMatch =
      isSemuaKelas ||
      itemKelas === kelasLower ||
      itemKelas.includes(kelasLower) ||
      kelasLower.includes(itemKelas) ||
      (itemFase && itemFase === targetFase);

    if (!classMatch) return false;

    // 3. Semester filter
    if (semLower && semLower !== "semua") {
      const itemSem = (item.semester || "").toLowerCase().trim();
      const isSemuaSem = !item.semester || itemSem === "semua" || itemSem === "semua semester" || itemSem === "";
      const semesterMatch = isSemuaSem || itemSem === semLower || itemSem.includes(semLower);
      if (!semesterMatch) return false;
    }

    return true;
  });
}

/**
 * Dynamic Score-to-TP Mapping (Pemetaan Dinamis Berdasarkan Nilai Siswa)
 */
export function generateDynamicTpDescription(
  mapel: string,
  nilaiNum: number,
  tpTexts?: string[],
  bankItems?: BankTpItem[]
): { tinggi: string; perluBimbingan: string } {
  let tpBest = "";
  let tpSecond = "";
  let tpNeedHelp = "";

  const availableBank = bankItems && bankItems.length > 0 ? bankItems : [];

  if (availableBank.length > 0) {
    const tinggiItems = availableBank.filter((b) => b.kategori === "Tinggi");
    const sedangItems = availableBank.filter((b) => b.kategori === "Sedang" || b.kategori === "Umum");
    const bimbinganItems = availableBank.filter((b) => b.kategori === "Bimbingan");

    if (nilaiNum >= 90) {
      tpBest = tinggiItems[0]?.tujuanPembelajaran || availableBank[0]?.tujuanPembelajaran;
      tpSecond = tinggiItems[1]?.tujuanPembelajaran || sedangItems[0]?.tujuanPembelajaran || tpBest;
      tpNeedHelp = sedangItems[sedangItems.length - 1]?.tujuanPembelajaran || bimbinganItems[0]?.tujuanPembelajaran || tpBest;
    } else if (nilaiNum >= 80) {
      tpBest = tinggiItems[0]?.tujuanPembelajaran || sedangItems[0]?.tujuanPembelajaran || availableBank[0]?.tujuanPembelajaran;
      tpNeedHelp = bimbinganItems[0]?.tujuanPembelajaran || sedangItems[0]?.tujuanPembelajaran || tpBest;
    } else if (nilaiNum >= 75) {
      tpBest = sedangItems[0]?.tujuanPembelajaran || tinggiItems[0]?.tujuanPembelajaran || availableBank[0]?.tujuanPembelajaran;
      tpNeedHelp = bimbinganItems[0]?.tujuanPembelajaran || sedangItems[0]?.tujuanPembelajaran || tpBest;
    } else {
      tpBest = bimbinganItems[0]?.tujuanPembelajaran || sedangItems[0]?.tujuanPembelajaran || availableBank[0]?.tujuanPembelajaran;
      tpNeedHelp = bimbinganItems[1]?.tujuanPembelajaran || bimbinganItems[0]?.tujuanPembelajaran || tpBest;
    }
  }

  // Smart Fallback to tpTexts array or DEFAULT_TP_TEMPLATES if bankItems yield nothing
  const rawList = tpTexts && tpTexts.length > 0 ? tpTexts : (DEFAULT_TP_TEMPLATES[mapel] || [
    `memahami konsep dasar dan materi pokok ${mapel}`,
    `menerapkan pemahaman dalam menyelesaikan tugas kontekstual`,
    `berpikir kritis dan menyajikan hasil pemikiran secara mandiri`
  ]);

  if (!tpBest) tpBest = rawList[0] || `konsep utama ${mapel}`;
  if (!tpSecond) tpSecond = rawList[1] || tpBest;
  if (!tpNeedHelp) tpNeedHelp = rawList[rawList.length - 1] || tpBest;

  const cBest = cleanTpText(tpBest, mapel);
  const cNeedHelp = cleanTpText(tpNeedHelp, mapel);

  // Official report card sentence formatting
  let tinggiText = "";
  let bimbinganText = "";

  if (nilaiNum >= 90) {
    tinggiText = `Menunjukkan penguasaan sangat baik dalam ${cBest}. Mampu bernalar kritis secara mandiri.`;
    bimbinganText = `Pertahankan prestasi unggul dan tingkatkan pengayaan mandiri pada pendalaman ${cNeedHelp}.`;
  } else if (nilaiNum >= 80) {
    tinggiText = `Menunjukkan penguasaan sangat baik dalam ${cBest}.`;
    bimbinganText = `Perlu peningkatan konsistensi pemahaman dan pendampingan dalam ${cNeedHelp}.`;
  } else if (nilaiNum >= 75) {
    tinggiText = `Menunjukkan pemahaman yang baik dan telah mencapai kriteria ketuntasan dalam ${cBest}.`;
    bimbinganText = `Perlu peningkatan konsistensi pemahaman dan pendampingan dalam ${cNeedHelp}.`;
  } else {
    tinggiText = `Menunjukkan kemauan belajar pada pengenalan ${cBest}.`;
    bimbinganText = `Perlu peningkatan konsistensi pemahaman dan pendampingan dalam ${cNeedHelp}.`;
  }

  return {
    tinggi: tinggiText,
    perluBimbingan: bimbinganText
  };
}
