import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini AI Client lazily or safely
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({ apiKey });
  };

  // Helper for resilient Gemini API calls with model fallback and exponential retry
  const generateContentWithRetry = async (ai: GoogleGenAI, contents: any) => {
    const modelCandidates = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
    let lastError: any = null;

    for (const modelCandidate of modelCandidates) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelCandidate,
            contents
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code || err?.error?.code;
          const errMsg = String(err?.message || err || "");
          const isTransient =
            status === 503 ||
            status === 429 ||
            status === 500 ||
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("resource exhausted");

          const isQuota =
            status === 429 ||
            errMsg.includes("Quota exceeded") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("rate-limits");

          if (isTransient) {
            if (isQuota) {
              if (attempt === 0) {
                // Short wait on first quota hit as RPM resets quickly (e.g. 1.5s - 2s)
                await new Promise((resolve) => setTimeout(resolve, 2000));
              } else {
                // On repeated quota hits, move to next model candidate
                break;
              }
            } else if (attempt < 2) {
              // Wait 1s, 2s before retrying same candidate for transient network/server errors
              await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
            } else {
              break;
            }
          } else {
            // Non-transient error, rethrow immediately
            throw err;
          }
        }
      }
    }
    throw lastError || new Error("Layanan AI sedang sibuk. Silakan coba beberapa saat lagi.");
  };

  // Health check API
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API 1: Generate AI Modul Ajar
  app.post("/api/ai/generate-modul", async (req, res) => {
    try {
      const formData = req.body;
      const ai = getAiClient();

      const metodeText = formData.metode && formData.metode.trim() 
        ? formData.metode.trim() 
        : "Otomatis ditentukan oleh AI secara variatif dan interaktif (Diskusi, Unjuk Kerja, Tanya Jawab, Eksperimen, Presentasi)";

      const systemPrompt = `Bertindaklah sebagai Ahli Kurikulum Nasional dan pengembang Sistem Modul Ajar Deep Learning Pro Administrasi Guru. Susunlah MODUL AJAR DEEP LEARNING (RENCANA PEMBELAJARAN MENDALAM) yang sangat komprehensif, terstruktur, profesional, dan berbobot.

ATURAN UTAMA:
1. JANGAN PERNAH MENYINGKAT PENJELASAN. Berikan penjabaran sedetail mungkin.
2. Setiap langkah (sintak) kegiatan guru dan murid WAJIB dipecah menjadi minimal 3-5 poin aktivitas rinci (gunakan <ul><li>), JANGAN HANYA 1 AKTIVITAS TUNGGAL. Sisipkan juga contoh dialog/perkataan guru.
3. FORMAT WAJIB: MURNI KODE HTML TANPA MARKDOWN / TANPA KODE (DILARANG MENGGUNAKAN \`\`\`html, \`\`\`, TANDA SIMBOL MARKDOWN SEPERTI \`#\`, \`**\`, DLL). GUNAKAN TAG HTML MURNI (<strong>, <b>, <h3>, <p>, <ul>, <li>).
4. SANGAT PENTING - KHUSUS "BAGIAN E. SKENARIO PENGALAMAN BELAJAR PERTEMUAN":
   - PENGALAMAN BELAJAR WAJIB DIBUAT TANPA TABEL (DILARANG MENGGUNAKAN TABEL <table> PADA BAGIAN E).
   - Susunlah Pengalaman Belajar per pertemuan secara rinci, terstruktur, dan berkelas/premium menggunakan heading (<h3>, <h4>), daftar poin (<ul>, <li>), serta penekanan teks (<strong>).
   - Untuk setiap Pertemuan (Pertemuan 1 sampai ${formData.jumlahPertemuan}), bagi dengan struktur rapi:
     a. <h3>Pertemuan 1: [Judul/Topik Pertemuan]</h3>
     b. <h4>1. Kegiatan Pendahuluan (Durasi: X Menit)</h4>
        - <strong>Aktivitas Guru:</strong> (min 3-5 poin + contoh dialog guru)
        - <strong>Aktivitas Peserta Didik:</strong> (min 3-5 poin)
     c. <h4>2. Kegiatan Inti - Deep Learning (Durasi: X Menit)</h4>
        - Jabarkan per Sintak Model (${formData.model}) yang mencakup 3 Fase Deep Learning: <strong>Memahami (Concept)</strong>, <strong>Mengaplikasi (Practice)</strong>, dan <strong>Merefleksi (Reflection)</strong>.
        - Untuk setiap sintak: tuliskan <strong>Kegiatan Guru:</strong> (poin-poin + contoh dialog) dan <strong>Kegiatan Peserta Didik:</strong> (poin-poin aktif).
     d. <h4>3. Kegiatan Penutup (Durasi: X Menit)</h4>
        - <strong>Aktivitas Guru & Peserta Didik:</strong> (Simpulan, Refleksi, Rencana Pertemuan Berikutnya).
5. Untuk bagian A, C2, D, dan G tetap gunakan tabel HTML profesional agar data tersaji rapi.
6. WAJIB BUAT LKPD (Lembar Kerja Peserta Didik) YANG SIAP PAKAI SECARA UTUH DAN LANGSUNG BISA DIKERJAKAN SISWA.
7. Cantumkan footer resmi di bagian bawah.`;

      const userPrompt = `DATA MODUL AJAR:
- Nama Guru: ${formData.namaGuru || 'Guru Pengampu'}
- Nama Sekolah: ${formData.namaSekolah || 'Sekolah'}
- Tahun Ajaran: ${formData.tahunAjaran || '2026/2027'}
- Jenjang: ${formData.jenjang || 'SMP'}
- Fase: ${formData.fase || 'Fase D (Kelas 7-9)'}
- Kelas: ${formData.kelas || 'VII'}
- Alokasi Waktu: ${formData.waktu || '2 x 45 JP'}
- Mata Pelajaran: ${formData.mataPelajaran || 'Umum'}
- Bab/Topik Utama: ${formData.topik || 'Topik Utama'} ${formData.subTopik ? `- ${formData.subTopik}` : ''}
- Jumlah Pertemuan: ${formData.jumlahPertemuan || '1'} Pertemuan (Maksimal 5 Pertemuan)
- Model Pembelajaran: ${formData.model || 'Problem Based Learning (PBL)'}
- Metode Pembelajaran: ${metodeText}
- Tujuan Pembelajaran Spesifik: ${formData.tujuan || 'Siswa dapat memahami dan mengaplikasikan konsep dengan cermat.'}
- Karakteristik Murid: ${formData.karakteristik || 'Heterogen, siap belajar aktif.'}

FORMAT WAJIB LAYOUT HTML:

<h1>MODUL AJAR DEEP LEARNING (RENCANA PEMBELAJARAN MENDALAM)</h1>

<h2>A. INFORMASI UMUM</h2>
<table>
  <thead>
    <tr><th>Komponen</th><th>Detail Informasi</th></tr>
  </thead>
  <tbody>
    <tr><td>Nama Sekolah</td><td>${formData.namaSekolah}</td></tr>
    <tr><td>Nama Penyusun</td><td>${formData.namaGuru}</td></tr>
    <tr><td>Tahun Ajaran</td><td>${formData.tahunAjaran}</td></tr>
    <tr><td>Jenjang / Fase / Kelas</td><td>${formData.jenjang} / ${formData.fase} / Kelas ${formData.kelas}</td></tr>
    <tr><td>Mata Pelajaran</td><td>${formData.mataPelajaran}</td></tr>
    <tr><td>Topik / Sub-Topik</td><td>${formData.topik} ${formData.subTopik ? `(${formData.subTopik})` : ''}</td></tr>
    <tr><td>Alokasi Waktu Total</td><td>${formData.waktu}</td></tr>
    <tr><td>Jumlah Pertemuan</td><td>${formData.jumlahPertemuan} Pertemuan</td></tr>
    <tr><td>Model Pembelajaran</td><td>${formData.model}</td></tr>
    <tr><td>Metode Pembelajaran</td><td>${metodeText}</td></tr>
  </tbody>
</table>

<h2>B. TUJUAN PEMBELAJARAN</h2>
<p>Jelaskan secara spesifik, terukur, kontekstual, berpusat pada murid, dan memacu berfikir kritis (HOTS).</p>

<h2>C. IDENTIFIKASI MURID & PROFIL LULUSAN</h2>
<h3>1. Asesmen Diagnostik Awal</h3>
<p>Penjelasan strategi diagnostik kognitif & non-kognitif.</p>
<h3>2. Pemetaan Kesiapan Belajar</h3>
<table>
  <thead>
    <tr><th>Kategori Kesiapan</th><th>Deskripsi Kategori</th><th>Strategi Pendampingan & Tutor Sebaya</th></tr>
  </thead>
  <tbody>
    <tr><td>Belum Berkembang (BB)</td><td>Siswa membutuhkan bantuan penuh pada fondasi materi.</td><td>Pendampingan intensif oleh guru.</td></tr>
    <tr><td>Mulai Berkembang (MB)</td><td>Siswa memahami sebagian konsep dasar.</td><td>Latihan terbimbing dengan scaffolding.</td></tr>
    <tr><td>Berkembang Sesuai Harapan (BSH)</td><td>Siswa menguasai konsep sesuai standar.</td><td>Pembelajaran mandiri & diskusi kelompok.</td></tr>
    <tr><td>Sangat Berkembang (SDB)</td><td>Siswa mahir & mampu menganalisis mendalam.</td><td>Tutor sebaya & tantangan pengayaan.</td></tr>
  </tbody>
</table>

<h2>D. KERANGKA DESAIN PEMBELAJARAN MENDALAM</h2>
<table>
  <thead>
    <tr><th>Dimensi Pedagogis</th><th>Penerapan Strategis</th></tr>
  </thead>
  <tbody>
    <tr><td>Capaian Pembelajaran (CP)</td><td>Penguasaan konsep esensial dan penalaran reflektif.</td></tr>
    <tr><td>Praktik Pedagogis</td><td>${formData.model} - Metode: ${metodeText} dengan pendekatan Deep Learning (Memahami, Mengaplikasi, Merefleksi).</td></tr>
    <tr><td>Kemitraan Pembelajaran</td><td>Kolaborasi kelompok, diskusi kritis, dan presentasi tim.</td></tr>
    <tr><td>Lingkungan Pembelajaran</td><td>Inklusif, aman, interaktif, dan mendukung eksplorasi.</td></tr>
    <tr><td>Pemanfaatan Digital</td><td>Integrasi media digital, peta konsep interaktif, dan simulasi visual.</td></tr>
  </tbody>
</table>

<h2>E. SKENARIO PENGALAMAN BELAJAR PERTEMUAN</h2>
<p><em>(DIBUAT TANPA TABEL. Gunakan susunan heading <h3>, <h4>, poin-poin <ul><li>, dan <strong> secara terperinci untuk setiap pertemuan)</em></p>
(Buat skenario detail untuk tiap pertemuan dari Pertemuan 1 hingga Pertemuan ${formData.jumlahPertemuan}. DILARANG MENGGUNAKAN TABEL pada bagian E ini.)

<h2>F. REFLEKSI GURU & SISWA</h2>
<p>Daftar 3-5 pertanyaan reflektif mendalam untuk mengukur keberhasilan proses belajar.</p>

<h2>G. ASESMEN PEMBELAJARAN & RUBRIK EVALUASI</h2>
<table>
  <thead>
    <tr><th>Aspek Penilaian</th><th>Teknik Asesmen</th><th>Instrumen Penilaian</th><th>Kriteria Ketuntasan</th></tr>
  </thead>
  <tbody>
    <tr><td>Sikap / Karakter</td><td>Observasi & Jurnal</td><td>Lembar Observasi Aktivitas</td><td>Menunjukkan sikap kritis & kolaboratif</td></tr>
    <tr><td>Pengetahuan (Konsep)</td><td>Tes Tulis / Lisan</td><td>Soal HOTS & Lembar Jawaban</td><td>Nilai >= KKM / Kriteria Sekolah</td></tr>
    <tr><td>Keterampilan / Praktik</td><td>Penilaian Kinerja / LKPD</td><td>Rubrik Unjuk Kerja / Produk</td><td>Mampu menyelesaikan masalah secara sistematis</td></tr>
  </tbody>
</table>

<h2>H. BAHAN AJAR & LKPD (LEMBAR KERJA PESERTA DIDIK) SIAP PAKAI</h2>
<h3>1. Ringkasan Bahan Ajar Esensial</h3>
<p>Materi pembelajaran lengkap yang dapat dibaca siswa.</p>

<h3>2. LKPD Interaktif Siswa</h3>
<p><strong>LEMBAR KERJA PESERTA DIDIK (LKPD)</strong></p>
<p>Nama Siswa: ................................................<br>Kelas: ${formData.kelas}<br>Mata Pelajaran: ${formData.mataPelajaran}<br>Topik: ${formData.topik}</p>
<p><strong>Petunjuk Pengerjaan:</strong><br>1. Bacalah setiap instruksi dengan cermat.<br>2. Kerjakan soal & diskusikan bersama kelompokmu.<br>3. Tuliskan hasil analisis secara rinci pada kolom yang disediakan.</p>
<p><strong>Soal & Aktivitas Studi Kasus:</strong></p>
<ol>
  <li>Jelaskan konsep dasar dari ${formData.topik} berdasarkan pemahamanmu!</li>
  <li>Analisis contoh penerapan ${formData.topik} dalam kehidupan sehari-hari!</li>
  <li>Diskusikan bersama kelompok dan susunlah solusi untuk permasalahan berikut...</li>
</ol>

<h2>I. PENGAYAAN DAN REMEDIAL</h2>
<p>Program remedi untuk siswa BB/MB dan tantangan analisis tinggi untuk siswa SDB.</p>

<h2>J. LAMPIRAN & KUNCI JAWABAN</h2>
<p>Kunci jawaban LKPD, pedoman penskoran, dan referensi pustaka.</p>

<br><hr>
<p style="text-align: center; font-weight: bold; color: #475569;">Hak Cipta &copy; EdAdmin Pro - ${formData.namaSekolah}</p>`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ]);

      let text = response.text || "";
      // Clean up markdown block format and symbols if model generated them
      text = text
        .replace(/```[a-zA-Z]*\n?/g, "")
        .replace(/```/g, "")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/^#+\s*(.*?)$/gm, "<h3>$1</h3>")
        .replace(/`/g, "")
        .trim();

      res.json({ status: "success", html: text });
    } catch (error: any) {
      console.error("Error generating modul:", error);
      res.status(500).json({ status: "error", message: error.message || "Gagal membuat modul AI" });
    }
  });

  // API 2: AI Asisten Chatbot Guru
  app.post("/api/ai/chat-asisten", async (req, res) => {
    try {
      const { message, context } = req.body;
      const ai = getAiClient();

      const systemPrompt = `Anda adalah "EdAdmin AI Assistant", asisten kecerdasan buatan khusus administrasi guru dan pendidik profesional di Indonesia.
Tugas Anda membantu guru dalam:
1. Merumuskan ide RPP, alur tujuan pembelajaran (ATP), dan rubrik asesmen.
2. Memberikan ide metode pengajaran kreatif, esensial, dan berdiferensiasi.
3. Menyusun contoh soal tes (HOTS, PISA style, essay, pilihan ganda) beserta kunci jawaban.
4. Draft kalimat catatan wali kelas untuk rapor atau pesan santun ke orang tua murid.
5. Memberikan solusi akademis, motivasi, dan strategi penanganan disiplin siswa.

Berikan jawaban yang ramah, sopan, terstruktur, berbasis Kurikulum Merdeka / Nasional, mudah dipahami, dan langsung dapat dipraktikkan guru.
Informasi Sekolah/Guru Pendukung: ${JSON.stringify(context || {})}`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nPertanyaan/Permintaan Guru:\n${message}` }] }
      ]);

      const rawText = response.text || "Maaf, saya tidak dapat merespons saat ini.";
      const cleanReply = rawText
        .replace(/```[a-zA-Z]*\n?/g, "")
        .replace(/```/g, "")
        .replace(/^`+|`+$/g, "")
        .trim();

      res.json({ status: "success", reply: cleanReply });
    } catch (error: any) {
      console.error("Error in chat assistant:", error);
      res.status(500).json({ status: "error", message: error.message || "Gagal memproses pertanyaan asisten AI" });
    }
  });

  // Helper to build 16:9 3D styled SVG illustration Data URI
  const createPptSvgImage = (slideIndex: number, topic: string, subject: string) => {
    const colorPalettes = [
      { bg: "#1E3A8A", accent: "#3B82F6", light: "#DBEAFE", dark: "#1E293B", badge: "#2563EB" },
      { bg: "#065F46", accent: "#10B981", light: "#D1FAE5", dark: "#064E3B", badge: "#059669" },
      { bg: "#581C87", accent: "#8B5CF6", light: "#EDE9FE", dark: "#3B0764", badge: "#7C3AED" },
      { bg: "#9A3412", accent: "#F97316", light: "#FFEDD5", dark: "#7C2D12", badge: "#EA580C" },
      { bg: "#0F766E", accent: "#14B8A6", light: "#CCFBF1", dark: "#134E4A", badge: "#0D9488" },
      { bg: "#1E293B", accent: "#6366F1", light: "#E0E7FF", dark: "#0F172A", badge: "#4F46E5" }
    ];

    const palette = colorPalettes[(slideIndex - 1) % colorPalettes.length];
    const safeTopic = (topic || "Edukasi").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeSubject = (subject || "Pelajaran").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="bgGrad${slideIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette.bg}" />
          <stop offset="100%" stop-color="${palette.accent}" />
        </linearGradient>
        <linearGradient id="cardGrad${slideIndex}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.08" />
        </linearGradient>
      </defs>

      <!-- Background Canvas -->
      <rect width="800" height="450" fill="url(#bgGrad${slideIndex})" rx="24"/>

      <!-- Decorative Background Spheres -->
      <circle cx="700" cy="80" r="160" fill="#ffffff" opacity="0.08"/>
      <circle cx="100" cy="380" r="120" fill="#ffffff" opacity="0.06"/>
      <circle cx="400" cy="225" r="280" fill="#ffffff" opacity="0.03"/>

      <!-- Glassmorphic Card Frame -->
      <rect x="50" y="50" width="700" height="350" rx="28" fill="url(#cardGrad${slideIndex})" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/>

      <!-- 3D Platform Base -->
      <ellipse cx="400" cy="270" rx="140" ry="25" fill="#000000" opacity="0.25"/>

      <!-- 3D Central Badge Circle -->
      <circle cx="400" cy="180" r="70" fill="${palette.light}"/>
      <circle cx="400" cy="180" r="58" fill="${palette.badge}"/>

      <!-- Center Icon Graphic -->
      <path d="M370,165 L430,165 L400,210 Z" fill="#ffffff" opacity="0.95"/>
      <circle cx="400" cy="155" r="12" fill="#ffffff"/>

      <!-- Title Pill -->
      <rect x="160" y="295" width="480" height="52" rx="26" fill="#ffffff"/>

      <!-- Text Labels -->
      <text x="400" y="328" font-family="sans-serif, Arial" font-size="20" font-weight="bold" fill="${palette.dark}" text-anchor="middle">${safeTopic} - Slide ${slideIndex}</text>
      <text x="400" y="375" font-family="sans-serif, Arial" font-size="14" font-weight="bold" fill="#ffffff" opacity="0.95" text-anchor="middle">Visual Edukasi 3D Nano Banana | ${safeSubject}</text>
    </svg>`;

    const base64Svg = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${base64Svg}`;
  };

  // API 3: PPT Generator AI Bulk All Slides Content
  app.post("/api/ai/generate-ppt-all-slides", async (req, res) => {
    const { topic = "Topik Pembelajaran", subject = "Mata Pelajaran", level = "Sekolah", slideCount = 8, subTopics = [] } = req.body || {};
    const count = Math.max(2, Math.min(14, Number(slideCount) - 1));

    const defaultSubTopics = [
      "Pengertian Dasar dan Definisi Kontekstual",
      "Struktur Anatomi dan Komponen Utama",
      "Mekanisme Kerja dan Proses Fisiologis",
      "Faktor-Faktor yang Memengaruhi Kinerja Sistem",
      "Gangguan, Kelainan, serta Cara Pencegahannya",
      "Peran Penting dalam Menjaga Homeostasis Tubuh",
      "Studi Kasus dan Penerapan dalam Kehidupan Sehari-hari"
    ];

    const actualSubTopics = Array.isArray(subTopics) && subTopics.length > 0 ? subTopics : defaultSubTopics;
    
    // Prepare structured subtopics prompt
    const promptSubtopicsList = Array.from({ length: count }, (_, i) => {
      const st = actualSubTopics[i % actualSubTopics.length];
      return `Slide ${i + 1}: Sub-topik "${st}"`;
    }).join("\n");

    try {
      const ai = getAiClient();
      const prompt = `WAJIB DIPATUHI PADA SETIAP SLIDE:
Jangan membuat slide yang hanya berisi judul atau poin-poin singkat. Setiap slide harus memiliki materi yang lengkap, mudah dipahami, dan siap digunakan untuk mengajar tanpa perlu banyak pengeditan.

Setiap slide wajib memiliki struktur berikut:
1. Judul Slide: Jelas, spesifik, dan menarik. Maksimal 8 kata.
2. Subjudul: Menjelaskan fokus pembahasan pada slide. Maksimal 1–2 kalimat.
3. Materi Utama: Terdiri atas 2–5 paragraf singkat atau 5–8 poin penjelasan yang saling berkaitan. Gunakan bahasa yang sederhana, komunikatif, dan sesuai jenjang pendidikan. Sertakan definisi, konsep utama, penjelasan, contoh, serta fakta penting bila relevan. Hindari hanya menampilkan kata kunci tanpa penjelasan.
4. Contoh: Berikan minimal satu contoh nyata, kontekstual, atau ilustrasi kasus yang berkaitan dengan materi.
5. Visual: Rekomendasi hero illustration utama yang relevan, serta ikon, infografik, diagram, tabel, atau peta konsep pendukung. Komposisi visual sekitar 45-60% area slide.
6. Layout & Animasi: Rekomendasi animasi untuk setiap objek (judul, subjudul, materi, gambar, ikon, diagram) beserta transisi antar-slide.

Standar Kualitas Konten & Visual Premium (Setara Canva Pro, Gamma AI, Beautiful.ai, Microsoft Designer):
- Akurat dan sesuai kurikulum.
- Sistematis dari konsep dasar hingga penerapan.
- Siap dipresentasikan tanpa perlu menambah penjelasan penting.
- Menggunakan bahasa yang mudah dipahami peserta didik sesuai jenjang ${level}.

Buatkan materi presentasi lengkap untuk ${count} slide mengenai topik "${topic}", mata pelajaran ${subject}, tingkat ${level}.

Sub-topik per slide yang wajib dibahas:
${promptSubtopicsList}

Kembalikan HANYA MURNI JSON Array bertipe array of objects tanpa teks pembuka/penutup.
Jumlah elemen dalam JSON Array HARUS TEPAT ${count}.

Format Objek JSON Per Slide:
{
  "title": "Judul Slide Spesifik Menarik (Maksimal 8 kata)",
  "subtitle": "Subjudul 1-2 kalimat menjelaskan fokus pembahasan...",
  "layoutSuggestion": "Split Layout / Hero Layout / Infographic",
  "content": [
    "Poin penjelasan 1: Definisi dan konsep dasar secara mendalam (maks 20 kata)...",
    "Poin penjelasan 2: Analisis mekanisme dan komponen utama (maks 20 kata)...",
    "Poin penjelasan 3: Cara kerja dan proses rinci (maks 20 kata)..."
  ],
  "example": "1 contoh nyata kontekstual atau ilustrasi kasus konkret...",
  "funFact": "1 fakta menarik atau trivia singkat yang relevan...",
  "speakerNotes": "Catatan komprehensif untuk guru: Penjelasan detail, saran animasi, pertanyaan diskusi, dan referensi.",
  "visualRecommendation": {
    "heroIllustration": "Deskripsi hero illustration 3D/vektor 45-60% area slide...",
    "iconsAndDiagrams": ["Ikon 3D Utama", "Diagram Alur Proses", "Infografik Peta Konsep"]
  },
  "animationRecommendation": {
    "objectAnimations": ["Judul: Fade In (0.5s)", "Subjudul & Materi: Fly In Left", "Hero Visual: Zoom In Soft"],
    "slideTransition": "Morph / Push Smooth"
  }
}`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: prompt }] }
      ]);

      let rawText = response.text || "";
      rawText = rawText
        .replace(/```[a-zA-Z]*\n?/g, "")
        .replace(/```/g, "")
        .trim();

      let parsedSlides: any[] = [];
      try {
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedSlides = JSON.parse(jsonMatch[0]);
        } else {
          parsedSlides = JSON.parse(rawText);
        }
      } catch (err) {
        console.warn("Failed to parse batch slides JSON, fallback triggered:", err);
      }

      if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
        const slides = parsedSlides.map((s, idx) => {
          const indexNum = idx + 1;
          const subTitle = actualSubTopics[idx % actualSubTopics.length];
          let rawTitle = s.title || s.slideTitle || `Bagian ${indexNum}: ${subTitle}`;
          const titleWords = rawTitle.split(/\s+/);
          if (titleWords.length > 8) {
            rawTitle = titleWords.slice(0, 8).join(" ");
          }

          const slideContent = Array.isArray(s.content) && s.content.length > 0 
            ? s.content 
            : (Array.isArray(s.mainContent) && s.mainContent.length > 0 ? s.mainContent : [
              `Definisi Esensial: ${subTitle} merupakan landasan utama dalam pemahaman materi ${topic}.`,
              `Konsep Utama: Menguraikan hubungan antar-elemen serta prinsip dasar yang bekerja pada sistem.`,
              `Mekanisme Kerja: Menjelaskan tahapan fisiologis/operasional secara rinci dan sistematis.`,
              `Fakta Penting: Menyoroti parameter penting yang memengaruhi kinerja serta dampaknya.`
            ]);

          return {
            title: rawTitle,
            subtitle: s.subtitle || `Fokus pembahasan mengenai ${subTitle.toLowerCase()} dalam materi ${topic}.`,
            layoutSuggestion: s.layoutSuggestion || "Split Layout",
            content: slideContent,
            example: s.example || `Contoh nyata penerapan ${subTitle.toLowerCase()} dalam kehidupan sehari-hari maupun studi kasus terapan.`,
            funFact: s.funFact || `Tahukah Kamu? Konsep ${subTitle.toLowerCase()} memiliki peran krusial dalam perkembangan teknologi dan sains modern.`,
            speakerNotes: s.speakerNotes || `Saran Animasi: Title (Fade), Image (Zoom In), Text (Wipe)\nCatatan Detail: Guru menjelaskan poin-poin dengan analogi sederhana dan interaktif.`,
            visualRecommendation: {
              heroIllustration: s.visualRecommendation?.heroIllustration || `Ilustrasi 3D beresolusi tinggi menggambarkan ${subTitle.toLowerCase()} (area 50% slide).`,
              iconsAndDiagrams: Array.isArray(s.visualRecommendation?.iconsAndDiagrams) && s.visualRecommendation.iconsAndDiagrams.length > 0 ? s.visualRecommendation.iconsAndDiagrams : ["Ikon 3D Relevan", "Diagram Alur", "Peta Konsep"]
            },
            animationRecommendation: {
              objectAnimations: Array.isArray(s.animationRecommendation?.objectAnimations) && s.animationRecommendation.objectAnimations.length > 0 ? s.animationRecommendation.objectAnimations : ["Judul: Fade In", "Materi: Fly In Left", "Gambar: Zoom In Soft"],
              slideTransition: s.animationRecommendation?.slideTransition || "Morph / Smooth Fade"
            },
            imageUrl: createPptSvgImage(indexNum, topic, subject)
          };
        });

        return res.json({ status: "success", slides });
      }
    } catch (error: any) {
      console.warn("Batch PPT generation fallback applied due to API error/rate-limit:", error?.message);
    }

    // High Quality Fallback for all slides matching prompt guidelines
    const fallbackSlides = Array.from({ length: count }, (_, idx) => {
      const indexNum = idx + 1;
      const subTitle = actualSubTopics[idx % actualSubTopics.length];
      return {
        title: `Materi ${indexNum}: ${subTitle}`.split(/\s+/).slice(0, 8).join(" "),
        subtitle: `Menjelaskan secara komprehensif fokus materi ${subTitle.toLowerCase()} pada topik ${topic}.`,
        layoutSuggestion: "Split Layout",
        content: [
          `Definisi Esensial: ${subTitle} merupakan landasan utama dalam pemahaman ${topic} tingkat ${level}.`,
          `Konsep Utama: Menguraikan struktur, komponen, serta interaksi antar-elemen yang terjadi secara rinci.`,
          `Mekanisme Kerja: Tahapan fisiologis dan operasional yang mendukung berjalannya sistem secara berkesinambungan.`,
          `Fakta Penting: Analisis parameter utama, variasi kondisi, serta dampak sistemik terhadap lingkungan sekitar.`
        ],
        example: `Penerapan nyata konsep ${subTitle.toLowerCase()} pada kehidupan sehari-hari dan sains terapan.`,
        funFact: `Tahukah Kamu? Konsep ${subTitle.toLowerCase()} ini dipelajari secara global untuk pemecahan masalah lingkungan dan kesehatan.`,
        speakerNotes: `Saran Animasi: Judul (Fade), Gambar (Zoom In), Teks (Fly In)\nCatatan Detail: Guru memandu diskusi kelas mengenai contoh kasus kontekstual secara aktif.`,
        visualRecommendation: {
          heroIllustration: `Hero Illustration 3D beresolusi tinggi menggambarkan ${subTitle.toLowerCase()} (komposisi 50% area slide).`,
          iconsAndDiagrams: ["Ikon 3D Utama", "Diagram Struktur Anatomi", "Infografik Peta Konsep"]
        },
        animationRecommendation: {
          objectAnimations: ["Judul & Subjudul: Fade In (0.5s)", "Materi Utama: Fly In Left (Staggered)", "Hero Visual: Zoom In Smooth"],
          slideTransition: "Morph Transition 1.0s"
        },
        imageUrl: createPptSvgImage(indexNum, topic, subject)
      };
    });

    res.json({ status: "success", slides: fallbackSlides });
  });

  // API 4: PPT Generator AI Single Text Fallback
  app.post("/api/ai/generate-ppt-text", async (req, res) => {
    const { subTitle, topic, subject } = req.body || {};
    res.json({
      status: "success",
      content: [
        `Penjelasan esensial mengenai ${subTitle || "materi"} dalam pemahaman ${topic || "topik utama"}.`,
        `Komponen dan mekanisme kunci yang berperan penting dalam materi ${subject || "pelajaran"} ini.`,
        `Penerapan praktis serta relevansi konsep dalam pembelajaran sehari-hari.`
      ]
    });
  });

  // API 5: PPT Generator AI Slide Image Illustration
  app.post("/api/ai/generate-ppt-image", async (req, res) => {
    try {
      const { slideIndex, topic, subject } = req.body;
      const indexNum = slideIndex || 1;
      const encodedSvg = createPptSvgImage(indexNum, topic, subject);
      res.json({ status: "success", imageUrl: encodedSvg });
    } catch (error: any) {
      res.json({
        status: "success",
        imageUrl: `https://placehold.co/800x450/1e3a8a/ffffff.png?text=EduSlide+Part+${req.body?.slideIndex || 1}`
      });
    }
  });

  // API 6: Generator Perangkat Ajar AI (Analisis CP, TP, ATP, Prota, Prosem, KKTP)
  app.post("/api/ai/generate-perangkat-ajar", async (req, res) => {
    try {
      const { docType, formData } = req.body || {};
      const ai = getAiClient();

      const schoolName = formData?.school || "SMA Negeri 1 Jambi";
      const subject = formData?.subject || "Bahasa Indonesia";
      const singkatanMapel = formData?.singkatanMapel || "BI";
      const level = formData?.level || "Fase E / Kelas X";
      const year = formData?.year || "2026/2027";
      const totalJp = formData?.totalJp || "108 JP / Tahun";
      const jpPerMinggu = formData?.jpPerMinggu || "3 JP/Minggu";
      const teacher = formData?.teacher || "Budi Santoso, S.Pd., Gr.";
      const nipTeacher = formData?.nipTeacher || "19900101 201903 1 001";
      const cityDate = formData?.cityDate || "Jambi, 14 Juli 2026";
      const principal = formData?.principal || "Dr. Ahmad Fauzi, M.Pd.";
      const nipPrincipal = formData?.nipPrincipal || "19720514 200003 1 002";

      const cpRasional = formData?.cpRasional || "Pada akhir Fase E, peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai dengan tujuan, konteks sosial, akademis, dan dunia kerja.";
      const cpElemen = formData?.cpElemen || `Elemen 1 — Menyimak: Peserta didik mampu mengevaluasi dan mengkreasi informasi berupa gagasan dari berbagai tipe teks lisan.\nElemen 2 — Membaca dan Memirsa: Peserta didik mampu mengevaluasi informasi berupa gagasan dari teks deskripsi, laporan, narasi, eksplanasi, eksposisi.\nElemen 3 — Berbicara dan Mempresentasikan: Peserta didik mampu mengolah dan menyajikan gagasan untuk tujuan pengajuan usul dan solusi.\nElemen 4 — Menulis: Peserta didik mampu menulis gagasan tertulis secara logis, kritis, dan kreatif.`;

      const generalRules = `
KETENTUAN UTAMA GENERASI HTML ADMINISTRASI:
1. SANGAT PENTING - TANPA LOGO / GAMBAR: Kop Sekolah HANYA berisi teks nama dinas/pemerintah, nama sekolah, alamat, dan garis tebal pembatas. DILARANG MENAMBAHKAN TAG <img>, PLACEHOLDER [LOGO], ATAU GAMBAR APAPUN.
2. TANDA TANGAN SEJAJAR DALAM TABEL TAK TERLIHAT: Bagian tanda tangan penutup Kepala Sekolah (kiri/kanan) dan Guru Mata Pelajaran (kiri/kanan) HARUS disusun sejajar dalam 1 baris menggunakan TABEL HTML 2 KOLOM TANPA BORDER (\`<table style="width:100%; border:none; margin-top:30px;"><tr><td style="border:none; text-align:center; width:50%;">... TTD Kepsek ...</td><td style="border:none; text-align:center; width:50%;">... TTD Guru ...</td></tr></table>\`).
3. DILARANG MENAMPILKAN TEKS/TOMBOL "Cetak Dokumen" atau "🖨️ Cetak" DI DALAM ISI DOKUMEN HTML.
4. WARNA HEADER TABEL WARNA-WARNI KONTRAST: Semua elemen \`<th>\` pada tabel HARUS diberikan atribut \`style="background-color:#1a3a5c; color:#ffffff; font-weight:bold; text-align:center; padding:8px;"\` secara inline agar warna header tabel muncul dengan sempurna di browser maupun di Microsoft Word.
`;

      let docPrompt = "";

      if (docType === "analisis_cp") {
        docPrompt = `Anda adalah asisten pembuatan perangkat administrasi pembelajaran Kurikulum Merdeka yang ahli dan berpengalaman. Tugas Anda adalah membuat dokumen **ANALISIS CAPAIAN PEMBELAJARAN (CP)** yang lengkap, profesional, dan siap cetak dalam format HTML.

${generalRules}

[DATA INPUT GURU]:
- Satuan Pendidikan: ${schoolName}
- Mata Pelajaran: ${subject}
- Fase / Kelas: ${level}
- Tahun Pelajaran: ${year}
- Nama Guru: ${teacher}
- NIP / NUPTK: ${nipTeacher}
- Kota / Tanggal TTD: ${cityDate}
- Nama Kepala Sekolah: ${principal}
- NIP Kepala Sekolah: ${nipPrincipal}
- Rasional CP Umum: ${cpRasional}
- CP Per Elemen: ${cpElemen}

STRUKTUR DOKUMEN HTML WAJIB (7 Bagian Wajib):
1. Kop Sekolah (TANPA LOGO) & Nomor Dokumen: No. Dok: ADM-CP-${singkatanMapel}-${level.replace(/\s+/g, '')} / Rev: 00 / Tgl: ${year.slice(0, 4)}
2. BAGIAN A — IDENTITAS (Tabel 2 Kolom)
3. BAGIAN B — RASIONAL MATA PELAJARAN (Tabel 3 kolom: No | Uraian | Deskripsi) -> 1. Pentingnya Mapel, 2. Kaitan dengan 8 Dimensi Profil Lulusan, 3. Orientasi Pembelajaran.
4. BAGIAN C — TUJUAN MATA PELAJARAN (Tabel 3 kolom: No | Tujuan | Indikator Umum - min 3 tujuan terukur)
5. BAGIAN D — KARAKTERISTIK MATA PELAJARAN & ELEMEN CP (Tabel 4 kolom: No | Elemen | Deskripsi Elemen | Cakupan Konten Utama - daftar 5-7 topik konkret per elemen)
6. BAGIAN E — CAPAIAN PEMBELAJARAN FASE (Tabel 4 kolom: Fase | Capaian Pembelajaran | Kompetensi Kunci | Konten / Materi Pokok)
7. BAGIAN F — PENJABARAN KATA KERJA OPERASIONAL (KKO) PER ELEMEN (Tabel 3 kolom: No | Elemen | KKO & Arah Tujuan Pembelajaran)
8. BAGIAN G — KETERKAITAN DENGAN 8 DIMENSI PROFIL LULUSAN (Tabel 4 kolom: No | Dimensi Profil Lulusan | Elemen Terkait | Relevansi ✔)
9. BAGIAN PENUTUP — TANDA TANGAN SEJAJAR KEPSEK & GURU DENGAN TABEL TANPA BORDER.

KETENTUAN LAYOUT HTML:
- Hasilkan MURNI KODE HTML tanpa tanda markdown fence (\`\`\`html) dan tanpa teks tambahan lain.
- Gunakan styling CSS internal yang bersih dengan font sans-serif, header tabel warna biru tua (#1a3a5c) teks putih, border tabel tipis, dan styling print @media print { @page { size: A4 portrait; margin: 1.5cm; } }.`;
      } else if (docType === "tp") {
        docPrompt = `Anda adalah asisten pembuatan perangkat administrasi pembelajaran Kurikulum Merdeka yang ahli dan berpengalaman. Tugas Anda adalah membuat dokumen **TUJUAN PEMBELAJARAN (TP)** yang lengkap, sistematis, profesional, dan siap cetak dalam format HTML.

${generalRules}

[DATA INPUT GURU]:
- Satuan Pendidikan: ${schoolName}
- Mata Pelajaran: ${subject}
- Singkatan Mapel: ${singkatanMapel}
- Fase / Kelas: ${level}
- Tahun Pelajaran: ${year}
- Alokasi Waktu Total: ${totalJp}
- Nama Guru: ${teacher}
- NIP Guru: ${nipTeacher}
- Kota / Tanggal TTD: ${cityDate}
- Nama Kepala Sekolah: ${principal}
- NIP Kepala Sekolah: ${nipPrincipal}
- CP Per Elemen: ${cpElemen}

STRUKTUR DOKUMEN HTML WAJIB (4 Bagian Wajib):
1. Kop Sekolah (TANPA LOGO) & Nomor Dokumen: No. Dok: ADM-TP-${singkatanMapel}-${level.replace(/\s+/g, '')} / Rev: 00 / Tgl: ${year.slice(0, 4)}
2. BAGIAN A — IDENTITAS (Tabel 2 Kolom)
3. BAGIAN B — PANDUAN KODE TUJUAN PEMBELAJARAN (Sub B1 Format Kode box, Sub B2 Tabel Kode Elemen)
4. BAGIAN C — DAFTAR TUJUAN PEMBELAJARAN (Tabel 6 kolom: No | Kode TP | Elemen CP | Tujuan Pembelajaran | Aspek Kompetensi | Alokasi JP). Buat 8-12 TP berprinsip ABCD, KKO Bloom terukur, diawali "Peserta didik mampu...". Total JP HARUS TEPAT SAMA dengan Alokasi Waktu Total (${totalJp}).
5. BAGIAN D — REKAPITULASI ALOKASI WAKTU PER ELEMEN (Tabel 5 kolom: No | Elemen CP | Jumlah TP | Total JP | Persentase)
6. BAGIAN PENUTUP — TANDA TANGAN SEJAJAR KEPSEK & GURU DENGAN TABEL TAK TERLIHAT (BORDER 0).

KETENTUAN LAYOUT HTML:
- Hasilkan MURNI KODE HTML tanpa markdown fence.
- CSS internal rapi, warna header #1a3a5c, @media print { @page { size: A4 portrait; margin: 1.5cm; } }.`;
      } else if (docType === "atp") {
        docPrompt = `Anda adalah asisten pembuatan perangkat administrasi pembelajaran Kurikulum Merdeka yang ahli dan berpengalaman. Tugas Anda adalah membuat dokumen **ALUR TUJUAN PEMBELAJARAN (ATP)** yang lengkap, sistematis, profesional, dan siap cetak dalam format HTML.

${generalRules}

[DATA INPUT GURU]:
- Satuan Pendidikan: ${schoolName}
- Mata Pelajaran: ${subject}
- Singkatan Mapel: ${singkatanMapel}
- Fase / Kelas: ${level}
- Tahun Pelajaran: ${year}
- Alokasi Waktu Total: ${totalJp}
- Nama Guru: ${teacher}
- NIP Guru: ${nipTeacher}
- Kota / Tanggal TTD: ${cityDate}
- Nama Kepala Sekolah: ${principal}
- NIP Kepala Sekolah: ${nipPrincipal}
- CP Per Elemen: ${cpElemen}

STRUKTUR DOKUMEN HTML WAJIB (4 Bagian Wajib):
1. Kop Sekolah (TANPA LOGO) & Nomor Dokumen: No. Dok: ADM-ATP-${singkatanMapel}-${level.replace(/\s+/g, '')} / Rev: 00 / Tgl: ${year.slice(0, 4)}
2. BAGIAN A — IDENTITAS (Tabel 4 kolom compact)
3. BAGIAN B — ALUR URUTAN TUJUAN PEMBELAJARAN DALAM SATU FASE (Diagram visual Flexbox kotak kode TP dengan panah →)
4. BAGIAN C — TABEL ALUR TUJUAN PEMBELAJARAN (Tabel 8 kolom: No | Kode TP | Elemen CP | Tujuan Pembelajaran | Materi Pokok | Kompetensi & Variasi | 8 Dimensi Profil Lulusan | Alokasi JP | Semester)
5. BAGIAN D — REKAPITULASI ALOKASI WAKTU (Tabel 6 kolom: No | Elemen CP | Jumlah TP | JP Sem 1 | JP Sem 2 | Total JP | Keterangan)
6. BAGIAN PENUTUP — TANDA TANGAN SEJAJAR KEPSEK & GURU DENGAN TABEL TAK TERLIHAT (BORDER 0).

KETENTUAN LAYOUT HTML:
- Hasilkan MURNI KODE HTML tanpa markdown fence.
- Gunakan orientasi LANDSCAPE A4 di @media print { @page { size: A4 landscape; margin: 1.2cm; } }. Warna header #1a3a5c.`;
      } else if (docType === "prota") {
        docPrompt = `Anda adalah asisten pembuatan perangkat administrasi pembelajaran Kurikulum Merdeka yang ahli dan berpengalaman. Tugas Anda adalah membuat dokumen **PROGRAM TAHUNAN (PROTA)** yang lengkap, sistematis, profesional, dan siap cetak dalam format HTML.

${generalRules}

[DATA INPUT GURU]:
- Satuan Pendidikan: ${schoolName}
- Mata Pelajaran: ${subject}
- Singkatan Mapel: ${singkatanMapel}
- Fase / Kelas: ${level}
- Tahun Pelajaran: ${year}
- Alokasi Waktu: ${totalJp} (${jpPerMinggu})
- Nama Guru: ${teacher}
- NIP Guru: ${nipTeacher}
- Kota / Tanggal TTD: ${cityDate}
- Nama Kepala Sekolah: ${principal}
- NIP Kepala Sekolah: ${nipPrincipal}
- CP Per Elemen: ${cpElemen}

STRUKTUR DOKUMEN HTML WAJIB:
1. Kop Sekolah (TANPA LOGO) & Nomor Dokumen: No. Dok: ADM-PROTA-${singkatanMapel}-${level.replace(/\s+/g, '')} / Rev: 00 / Tgl: ${year.slice(0, 4)}
2. BAGIAN A — IDENTITAS
3. BAGIAN B — DISTRIBUSI MINGGU EFEKTIF — KALENDER PENDIDIKAN (Tabel 7 kolom: Sem | Bulan | Minggu Kalender | Tdk Efektif | Efektif | JP | Keterangan). Sertakan Subtotal Semester 1, Subtotal Semester 2, dan Total Keseluruhan.
4. BAGIAN C — RENCANA PROGRAM TAHUNAN (Tabel 5 kolom: No | Kode TP | Tujuan Pembelajaran & Materi Pokok | Elemen CP | Alokasi JP | Semester). Sertakan header kelompok Semester 1 & Semester 2, serta baris CADANGAN.
5. BAGIAN PENUTUP — TANDA TANGAN SEJAJAR KEPSEK & GURU DENGAN TABEL TAK TERLIHAT (BORDER 0).

KETENTUAN LAYOUT HTML:
- Hasilkan MURNI KODE HTML tanpa markdown fence.
- DILARANG MENAMPILKAN TOMBOL/TEKS "Cetak Dokumen" atau "🖨️ Cetak" DI DALAM ISI HTML.
- CSS internal rapi, warna header #1a3a5c, @media print { @page { size: A4 portrait; margin: 1.5cm; } }.`;
      } else if (docType === "prosem") {
        docPrompt = `Anda adalah asisten pembuatan perangkat administrasi pembelajaran Kurikulum Merdeka yang ahli dan berpengalaman. Tugas Anda adalah membuat dokumen **PROGRAM SEMESTER (PROSEM)** yang lengkap, sistematis, profesional, dan siap cetak dalam format HTML.

${generalRules}

[DATA INPUT GURU]:
- Satuan Pendidikan: ${schoolName}
- Mata Pelajaran: ${subject}
- Singkatan Mapel: ${singkatanMapel}
- Fase / Kelas: ${level}
- Tahun Pelajaran: ${year}
- Semester: Semester 1 & 2 (Buatlah tampilan lengkap gabungan / 2 bagian Semester 1 dan Semester 2)
- JP per Minggu: ${jpPerMinggu}
- Nama Guru: ${teacher}
- NIP Guru: ${nipTeacher}
- Kota / Tanggal TTD: ${cityDate}
- Nama Kepala Sekolah: ${principal}
- NIP Kepala Sekolah: ${nipPrincipal}
- CP Per Elemen: ${cpElemen}

STRUKTUR DOKUMEN HTML WAJIB:
1. Kop Sekolah (TANPA LOGO) & Nomor Dokumen: No. Dok: ADM-PROSEM-${singkatanMapel}-${level.replace(/\s+/g, '')}-S1 / Rev: 00 / Tgl: ${year.slice(0, 4)}
2. Header Identitas & Legenda Warna Sel Matriks (Biru #d0e4f7 = JP Aktif, Merah #ffd6d6 = Libur, Kuning #fff3cd = PTS, Hijau #d4edda = PAS/PAT)
3. TABEL MATRIKS DISTRIBUSI PEMBELAJARAN PER MINGGU (Kolom: No | Kode TP | Tujuan & Materi Pokok | JP | Kolom-kolom Minggu M1..M5 per Bulan | Keterangan Model Pembelajaran).
   PENTING: SEMUA KEPALA KOLOM TABEL (TH) HARUS DIBERI STYLING INLINE: style="background-color:#1a3a5c; color:#ffffff; font-weight:bold; text-align:center;" AGAR TERLIHAT KONTRAST DI WORD DAN BROWSER!
4. Catatan Keterangan Bulan Tidak Efektif & Asesmen
5. BAGIAN PENUTUP — TANDA TANGAN SEJAJAR KEPSEK & GURU DENGAN TABEL TAK TERLIHAT (BORDER 0).

KETENTUAN LAYOUT HTML:
- Hasilkan MURNI KODE HTML tanpa markdown fence.
- Gunakan LANDSCAPE A4 di @media print { @page { size: A4 landscape; margin: 1.0cm; } }.`;
      } else if (docType === "kktp") {
        docPrompt = `Anda adalah asisten pembuatan perangkat administrasi pembelajaran Kurikulum Merdeka yang ahli dan berpengalaman. Tugas Anda adalah membuat dokumen **KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)** yang lengkap, sistematis, profesional, dan siap cetak dalam format HTML.

${generalRules}

[DATA INPUT GURU]:
- Satuan Pendidikan: ${schoolName}
- Mata Pelajaran: ${subject}
- Fase / Kelas: ${level}
- Tahun Pelajaran: ${year}
- Nama Guru: ${teacher}
- NIP Guru: ${nipTeacher}
- Kota / Tanggal TTD: ${cityDate}
- Nama Kepala Sekolah: ${principal}
- NIP Kepala Sekolah: ${nipPrincipal}
- CP Per Elemen: ${cpElemen}

STRUKTUR DOKUMEN HTML WAJIB:
1. Kop Sekolah (TANPA LOGO) & Nomor Dokumen: No. Dok: ADM-KKTP-${singkatanMapel}-${level.replace(/\s+/g, '')} / Rev: 00 / Tgl: ${year.slice(0, 4)}
2. Kotak Dasar Hukum Permendikbudristek No. 21 Tahun 2022 & BAGIAN A — IDENTITAS
3. BAGIAN A — DESKRIPSI LEVEL CAPAIAN (Tabel 5 kolom: Level | Skor | Deskripsi Umum | Tindak Lanjut | Rentang Nilai | Predikat - Level 1 Mulai Berkembang 0-55, Level 2 Layak ✓ KKTP 56-70, Level 3 Cakap 71-85, Level 4 Mahir 86-100)
4. BAGIAN B — RUBRIK KKTP PER TUJUAN PEMBELAJARAN (Tabel 9 kolom: No | Kode TP | Tujuan Pembelajaran | IKTP Indikator Ketercapaian | Sub-kolom 4 Level: Mulai Berkembang (1), Layak (2) ✓ KKTP, Cakap (3), Mahir (4)). Buat deskriptor berjenjang yang jelas, kuantitatif/kualitatif untuk setiap TP.
5. Kotak Catatan Penting Ambang Batas Minimal Ketuntasan
6. BAGIAN PENUTUP — TANDA TANGAN SEJAJAR KEPSEK & GURU DENGAN TABEL TAK TERLIHAT (BORDER 0).

KETENTUAN LAYOUT HTML:
- Hasilkan MURNI KODE HTML tanpa markdown fence.
- SANGAT PENTING: DILARANG MEMASUKKAN LOGO / GAMBAR DI HEADER KOP.
- Gunakan LANDSCAPE A4 di @media print { @page { size: A4 landscape; margin: 1.2cm; } }. Warna header #1a3a5c.`;
      } else {
        // Default prompt for generate overview / all
        docPrompt = `Buatkan Dokumen Analisis Capaian Pembelajaran (CP) dan Administrasi Perangkat Ajar Kurikulum Merdeka untuk sekolah ${schoolName}, mapel ${subject}, ${level}, tahun ${year}, guru ${teacher}. Hasilkan MURNI HTML lengkap dengan Kop Sekolah, Tabel Rapi, dan Tanda Tangan Penutup.`;
      }

      const contents = [{ role: "user", parts: [{ text: docPrompt }] }];
      const response = await generateContentWithRetry(ai, contents);

      let htmlOutput = response?.text || "";
      // Strip markdown code fences if model wrapped response in ```html ... ```
      htmlOutput = htmlOutput.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

      res.json({ status: "success", html: htmlOutput, docType });
    } catch (err: any) {
      console.error("Gagal generate Perangkat Ajar AI:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Terjadi kesalahan saat memproses Perangkat Ajar AI."
      });
    }
  });

  // API 7: Generator Soal AI Lengkap (Soal, Kunci, Pembahasan, Kisi-Kisi, Rubrik)
  app.post("/api/ai/generate-soal", async (req, res) => {
    try {
      const {
        mataPelajaran = "IPAS",
        kelas = "Kelas 4",
        fase = "Fase B (Kelas 3-4)",
        semester = "1 (Ganjil)",
        tahunAjaran = "2026/2027",
        bentukAsesmen = "Sumatif Lingkup Materi",
        topikMateri = "Wujud Zat dan Perubahannya",
        subTopik = "",
        capaianPembelajaran = "",
        materiRangkuman = "",
        alokasiWaktu = "60 Menit",
        jumlahPilihanGanda = 10,
        jumlahIsian = 5,
        jumlahUraian = 3,
        jumlahMenjodohkan = 0,
        jumlahBenarSalah = 0,
        persenHots = 30,
        persenMots = 40,
        persenLots = 30,
        includeStimulus = true,
        namaGuru = "Guru Pengampu",
        nipGuru = "-",
        namaSekolah = "SD NEGERI BABAKAN 04"
      } = req.body || {};

      const ai = getAiClient();

      const totalPg = Math.max(0, Math.min(30, Number(jumlahPilihanGanda) || 0));
      const totalIsi = Math.max(0, Math.min(20, Number(jumlahIsian) || 0));
      const totalUra = Math.max(0, Math.min(10, Number(jumlahUraian) || 0));
      const totalJodoh = Math.max(0, Math.min(10, Number(jumlahMenjodohkan) || 0));
      const totalBs = Math.max(0, Math.min(10, Number(jumlahBenarSalah) || 0));
      const grandTotalSoal = totalPg + totalIsi + totalUra + totalJodoh + totalBs;

      if (grandTotalSoal === 0) {
        return res.status(400).json({
          status: "error",
          message: "Pilih minimal 1 butir soal untuk digenerate."
        });
      }

      const prompt = `Anda adalah Ahli Evaluasi Pendidikan dan Penyusun Soal Kurikulum Merdeka Sekolah Dasar (SD) bersertifikat nasional.
Buatkan satu paket lengkap naskah asesmen/evaluasi pembelajaran yang berbobot, kontekstual, menarik, mendidik, dan bebas dari ambiguitas.

[IDENTITAS ASESMEN]:
- Satuan Pendidikan: ${namaSekolah}
- Mata Pelajaran: ${mataPelajaran}
- Tingkat / Kelas: ${kelas} (${fase})
- Semester / TP: Semester ${semester} / Tahun Ajaran ${tahunAjaran}
- Bentuk Asesmen: ${bentukAsesmen}
- Topik Utama: ${topikMateri} ${subTopik ? `(Sub-topik: ${subTopik})` : ""}
${capaianPembelajaran ? `- Capaian Pembelajaran / TP Khusus: ${capaianPembelajaran}` : ""}
${materiRangkuman ? `- Sumber Catatan Materi Rangkuman Guru:\n"""${materiRangkuman}"""` : ""}
- Alokasi Waktu: ${alokasiWaktu}
- Pengampu: ${namaGuru}

[KOMPOSISI BUTIR SOAL]:
- Pilihan Ganda: ${totalPg} butir (Opsi A, B, C, D untuk Kelas 4-6, atau Opsi A, B, C untuk Kelas 1-3)
- Isian Singkat: ${totalIsi} butir
- Uraian / Esai: ${totalUra} butir
- Menjodohkan: ${totalJodoh} butir
- Benar / Salah: ${totalBs} butir
- Target Proporsi Level Kognitif: LOTS C1-C2 (~${persenLots}%), MOTS C3 (~${persenMots}%), HOTS C4-C6 (~${persenHots}%)
- Sisipkan stimulus kontekstual / narasi studi kasus anak SD sehari-hari: ${includeStimulus ? "YA, utamakan stimulus bacaan/cerita/tabel pada soal HOTS" : "Secara proporsional"}

[PETUNJUK OUTPUT WAJIB]:
1. Kembalikan HANYA MURNI format JSON (Valid JSON object) tanpa markdown fence (\`\`\`json atau \`\`\`), tanpa komentar pembuka atau penutup.
2. Semua nomor butir soal harus berurutan 1 sampai ${grandTotalSoal}.
3. Untuk soal Pilihan Ganda, sediakan 4 pilihan (A, B, C, D) atau 3 (A, B, C) dalam bentuk dictionary objek: { "A": "...", "B": "...", "C": "...", "D": "..." }.
4. Kunci jawaban dan pembahasan harus logis, edukatif, dan mudah dipahami siswa maupun guru.
5. Tabel Matriks Kisi-Kisi wajib memuat tepat ${grandTotalSoal} baris yang selaras dengan setiap butir soal.

[SKEMA JSON YANG DIHARAPKAN]:
{
  "judul": "Penilaian ${bentukAsesmen} ${mataPelajaran} ${kelas}",
  "petunjukUmum": "1. Berdoalah sebelum mengerjakan soal.\\n2. Tuliskan nama dan nomor absen pada lembar jawaban yang telah disediakan.\\n3. Bacalah setiap butir soal dan petunjuk pengerjaan dengan cermat.\\n4. Kerjakan terlebih dahulu soal-soal yang kamu anggap paling mudah.\\n5. Periksa dan teliti kembali seluruh hasil pekerjaanmu sebelum diserahkan kepada guru.",
  "pedomanPenskoran": "1. Pilihan Ganda: Setiap jawaban benar bernilai 1 poin (Skor Maksimal: ${totalPg})\\n2. Isian Singkat: Setiap jawaban benar bernilai 2 poin (Skor Maksimal: ${totalIsi * 2})\\n3. Uraian: Setiap nomor berbobot maksimal 3-5 poin berdasarkan kelengkapan argumen\\n4. Rumus Nilai Akhir: (Total Skor Diperoleh / Total Skor Maksimal) x 100",
  "daftarSoal": [
    {
      "nomor": 1,
      "tipe": "pilihan_ganda",
      "level": "Mudah (LOTS / C1-C2)",
      "stimulus": "Teks cerita / narasi kontekstual jika ada, atau kosongkan jika pertanyaan langsung",
      "pertanyaan": "Pertanyaan yang jelas dan tidak ambigu...",
      "pilihanJawaban": {
        "A": "Pilihan A",
        "B": "Pilihan B",
        "C": "Pilihan C",
        "D": "Pilihan D"
      },
      "kunciJawaban": "A",
      "pembahasan": "Penjelasan mengapa opsi A benar dan konsep dasarnya...",
      "rubrikSkor": "Skor 1 jika benar, 0 jika salah",
      "skorMaksimal": 1,
      "capaianPembelajaran": "Peserta didik mampu mengidentifikasi...",
      "indikatorSoal": "Disajikan ilustrasi, peserta didik dapat menentukan..."
    }
  ],
  "kisiKisi": [
    {
      "nomorSoal": 1,
      "tujuanPembelajaran": "Memahami konsep dasar...",
      "materi": "${topikMateri}",
      "indikatorSoal": "Disajikan ilustrasi, peserta didik dapat menentukan...",
      "levelKognitif": "C2 (Memahami)",
      "bentukSoal": "Pilihan Ganda",
      "nomorKunci": "A",
      "skor": 1
    }
  ]
}`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: prompt }] }
      ]);

      let rawText = response.text || "";
      // Strip markdown code fences
      rawText = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      let parsedData: any = null;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(rawText);
        }
      } catch (jsonErr) {
        console.error("Gagal parse JSON dari Gemini API soal:", jsonErr, "Raw:", rawText.slice(0, 500));
        throw new Error("Gagal mengurai respons AI ke format paket soal. Silakan klik 'Generate Ulang'.");
      }

      // Calculate total score
      const daftarSoal = Array.isArray(parsedData.daftarSoal) ? parsedData.daftarSoal : [];
      let totalSkor = 0;
      daftarSoal.forEach((s: any, idx: number) => {
        s.nomor = idx + 1;
        s.id = `soal_${Date.now()}_${idx + 1}`;
        const score = Number(s.skorMaksimal) || (s.tipe === "pilihan_ganda" ? 1 : s.tipe === "isian" ? 2 : 4);
        s.skorMaksimal = score;
        totalSkor += score;
      });

      const kisiKisi = Array.isArray(parsedData.kisiKisi) ? parsedData.kisiKisi : [];
      kisiKisi.forEach((k: any, idx: number) => {
        k.nomorSoal = idx + 1;
      });

      const paketResult = {
        judul: parsedData.judul || `Penilaian ${bentukAsesmen} ${mataPelajaran} ${kelas}`,
        mataPelajaran,
        kelas,
        fase,
        semester,
        tahunAjaran,
        alokasiWaktu,
        bentukAsesmen,
        topikMateri,
        subTopik,
        petunjukUmum: parsedData.petunjukUmum || "1. Berdoalah sebelum mulai.\n2. Kerjakan soal dengan jujur dan teliti.",
        tanggalDibuat: new Date().toISOString().split("T")[0],
        namaGuru,
        nipGuru: nipGuru || "-",
        totalSoal: daftarSoal.length,
        totalSkor: totalSkor || 100,
        daftarSoal,
        kisiKisi,
        pedomanPenskoran: parsedData.pedomanPenskoran || "Skor perolehan / Skor total x 100"
      };

      res.json({
        status: "success",
        paket: paketResult
      });
    } catch (err: any) {
      console.error("Gagal generate soal AI:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Terjadi kesalahan saat menyusun naskah soal AI."
      });
    }
  });

  // API 8: Buat Variasi Soal Serupa (Paraphrase / Remedial / Paket Paralel A/B)
  app.post("/api/ai/variasi-soal", async (req, res) => {
    try {
      const { soalAsli, tingkatKesulitan = "Setara", mataPelajaran = "Umum", kelas = "SD" } = req.body || {};
      const ai = getAiClient();

      const prompt = `Anda adalah Pakar Asesmen Pendidikan Guru Sekolah Dasar.
Diberikan satu butir soal berikut:
"""
Tipe: ${soalAsli?.tipe || "pilihan_ganda"}
Level: ${soalAsli?.level || "Sedang"}
Stimulus: ${soalAsli?.stimulus || "-"}
Pertanyaan: ${soalAsli?.pertanyaan || ""}
Opsi Jawaban: ${JSON.stringify(soalAsli?.pilihanJawaban || {})}
Kunci Jawaban: ${soalAsli?.kunciJawaban || ""}
"""

Tugas Anda:
Buatkan 3 BUTIR SOAL VARIASI BARU (${tingkatKesulitan === "Lebih Mudah (Remedial)" ? "Dengan bahasa lebih sederhana untuk remedial" : tingkatKesulitan === "Lebih Menantang (Pengayaan / HOTS)" ? "Dengan tingkat penalaran lebih tinggi untuk pengayaan" : "Dengan konsep kompetensi yang setara namun angka/konteks cerita berbeda"}) untuk mata pelajaran ${mataPelajaran}, tingkat ${kelas}.

Kembalikan HANYA format JSON Array bertipe array of objects:
[
  {
    "tipe": "${soalAsli?.tipe || "pilihan_ganda"}",
    "level": "${soalAsli?.level || "Sedang (MOTS / C3)"}",
    "stimulus": "Narasi kontekstual...",
    "pertanyaan": "Pertanyaan variasi...",
    "pilihanJawaban": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "kunciJawaban": "A",
    "pembahasan": "Penjelasan kunci...",
    "skorMaksimal": ${soalAsli?.skorMaksimal || 1}
  }
]`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: prompt }] }
      ]);

      let rawText = response.text || "";
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: any[] = [];
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawText);
      }

      res.json({ status: "success", variasi: parsed });
    } catch (err: any) {
      console.error("Gagal generate variasi soal:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Gagal membuat variasi soal AI."
      });
    }
  });

  // API: Generate Deskripsi Capaian Kompetensi Raport (Kurikulum Merdeka) berbasis Tujuan Pembelajaran (TP)
  app.post("/api/ai/generate-deskripsi-raport", async (req, res) => {
    try {
      const {
        mapel = "Mata Pelajaran",
        kelas = "Kelas 4",
        fase = "Fase B",
        tujuanPembelajaran = [],
        nilai = 80,
        namaSiswa = "Peserta Didik",
        students = [] // Optional batch list: [{ id, nama, nilai }]
      } = req.body || {};

      const ai = getAiClient();

      const tpListStr = Array.isArray(tujuanPembelajaran) && tujuanPembelajaran.length > 0
        ? tujuanPembelajaran.map((tp: string, i: number) => `${i + 1}. ${tp}`).join("\n")
        : `1. Memahami konsep dasar dan materi pokok pada pembelajaran ${mapel}.\n2. Menerapkan pemahaman materi dalam menyelesaikan tugas dan permasalahan kontekstual.\n3. Berpikir kritis dan menyajikan hasil telaah materi dengan mandiri.`;

      if (Array.isArray(students) && students.length > 0) {
        // Batch generation for whole class
        const studentsListStr = students.map((s: any, i: number) => `${i + 1}. ID: ${s.id} | Nama: ${s.nama} | Nilai: ${s.nilai}`).join("\n");

        const prompt = `Anda adalah Pakar Asesmen Kurikulum Merdeka Kemendikbudristek RI.
Buatlah narasi deskripsi Capaian Kompetensi Raport resmi untuk seluruh siswa berikut pada mata pelajaran "${mapel}", ${kelas} (${fase}).

Daftar Tujuan Pembelajaran (TP) yang telah dipelajari semester/periode ini:
${tpListStr}

Daftar Siswa & Nilai Akhir:
${studentsListStr}

Panduan Penulisan Kurikulum Merdeka:
1. Capaian Kompetensi Tertinggi: Tuliskan penguasaan yang sangat baik/optimal sesuai TP yang diajarkan, gunakan kata kerja operasional positif (misal: "Menunjukkan penguasaan sangat baik dalam...", "Sangat terampil dalam...").
2. Perlu Peningkatan / Bimbingan: Tuliskan aspek/indikator TP yang masih memerlukan pendampingan atau pengayaan (misal: "Perlu bimbingan dan latihan lebih intensif dalam...", "Perlu penguatan pemahaman pada..."). Untuk nilai >= 90, berikan saran pengayaan lanjutan.
3. Bahasa komunikatif, santun, memotivasi, dan ringkas (1-2 kalimat per bagian).

KEMBALIKAN HANYA JSON VALID berupa array of objects (tanpa markdown backtick):
[
  {
    "id": "ID_SISWA",
    "capaianTinggi": "Menunjukkan penguasaan sangat baik dalam ...",
    "perluBimbingan": "Perlu pendampingan dalam ..."
  }
]`;

        const response = await generateContentWithRetry(ai, [
          { role: "user", parts: [{ text: prompt }] }
        ]);

        let rawText = response.text || "";
        rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

        let parsed: any[] = [];
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(rawText);
        }

        return res.json({ status: "success", results: parsed });
      } else {
        // Single student generation
        const prompt = `Anda adalah Pakar Asesmen Kurikulum Merdeka Kemendikbudristek RI.
Buatlah narasi deskripsi Capaian Kompetensi Raport resmi untuk siswa:
- Nama: ${namaSiswa}
- Mata Pelajaran: ${mapel}
- Kelas / Fase: ${kelas} / ${fase}
- Nilai Akhir: ${nilai} / 100

Daftar Tujuan Pembelajaran (TP) yang dipelajari:
${tpListStr}

Aturan Penulisan Kurikulum Merdeka:
1. Capaian Tertinggi: Ungkapkan kompetensi/TP yang paling dikuasai dengan baik oleh siswa dengan narasi membanggakan dan objektif.
2. Perlu Peningkatan / Bimbingan: Ungkapkan kompetensi/TP yang memerlukan bimbingan tambahan, perbaikan, atau pengayaan dengan narasi membangun.
3. Tulis dengan kalimat efektif (1-2 kalimat per bidang).

Kembalikan HANYA JSON VALID tanpa markdown backtick:
{
  "capaianTinggi": "Menunjukkan penguasaan sangat baik dalam ...",
  "perluBimbingan": "Perlu bimbingan lanjutan dalam ..."
}`;

        const response = await generateContentWithRetry(ai, [
          { role: "user", parts: [{ text: prompt }] }
        ]);

        let rawText = response.text || "";
        rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

        let parsed: any = {};
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(rawText);
        }

        return res.json({
          status: "success",
          capaianTinggi: parsed.capaianTinggi || `Menunjukkan penguasaan sangat baik pada mata pelajaran ${mapel}.`,
          perluBimbingan: parsed.perluBimbingan || `Perlu konsistensi dan latihan berkelanjutan pada materi lanjutan ${mapel}.`
        });
      }
    } catch (err: any) {
      console.error("Gagal generate deskripsi raport:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Gagal membuat deskripsi raport AI."
      });
    }
  });

  // API: Generate Tujuan Pembelajaran (TP) untuk Bank TP (Kurikulum Merdeka)
  app.post("/api/ai/generate-bank-tp", async (req, res) => {
    try {
      const {
        mapel = "Matematika",
        fase = "Fase B",
        kelas = "Kelas 4",
        semester = "Ganjil",
        materiPokok = "",
        jumlah = 4
      } = req.body || {};

      const ai = getAiClient();

      const prompt = `Anda adalah Tim Pengembang Kurikulum Merdeka Kemendikbudristek RI dan Pakar Perumusan Tujuan Pembelajaran (TP).
Rancanglah ${jumlah} Tujuan Pembelajaran (TP) resmi Kurikulum Merdeka yang komprehensif, terukur (menggunakan Kata Kerja Operasional Taksonomi Bloom / KKO), dan kontekstual.

Spesifikasi Data:
- Mata Pelajaran: ${mapel}
- Fase: ${fase}
- Kelas: ${kelas}
- Semester: ${semester}
${materiPokok ? `- Materi Pokok / Lingkup Materi: ${materiPokok}` : "- Materi Pokok: Materi esensial standar semester ini"}

Pedoman Perumusan TP Kurikulum Merdeka:
1. Memuat Kompetensi (kemampuan yang harus dicapai peserta didik) dan Konten (konsep materi pokok).
2. Menggunakan KKO bergradasi (C1-C2 untuk pemahaman/dasar, C3-C4 untuk aplikasi dan penalaran kritis, C5-C6 untuk kreasi).
3. Kalimat jelas, operasional, dan siap diterapkan langsung dalam asesmen formatif, sumatif, dan deskripsi capaian rapor.

Kembalikan HANYA format JSON Array (tanpa markdown backtick):
[
  {
    "kodeTp": "TP 1.1",
    "tujuanPembelajaran": "Peserta didik mampu memahami dan menyelesaikan...",
    "materiPokok": "Operasi Hitung Bilangan",
    "kategori": "Tinggi"
  }
]`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: prompt }] }
      ]);

      let rawText = response.text || "";
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: any[] = [];
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawText);
      }

      res.json({ status: "success", tps: parsed });
    } catch (err: any) {
      console.error("Gagal generate Bank TP AI:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Gagal membuat Tujuan Pembelajaran AI."
      });
    }
  });

  // API: Generate Paket Kuis Lengkap dengan AI & Dukungan Media (Gambar, GIF Gerak, Video)
  app.post("/api/ai/generate-kuis", async (req, res) => {
    try {
      const {
        materi = "Ekosistem dan Rantai Makanan",
        mapel = "IPAS",
        kelas = "Kelas 5",
        jumlahSoal = 5,
        tingkatKesulitan = "campuran",
        sertakanMedia = true
      } = req.body || {};

      const ai = getAiClient();
      const count = Math.max(1, Math.min(20, Number(jumlahSoal) || 5));

      const prompt = `Anda adalah Master Kuis Interaktif Game-Show dan Pakar Asesmen Kurikulum Merdeka Kemendikbudristek RI.
Rancanglah satu PAKET KUIS CEPAT & ASESMEN INTERAKTIF KELAS yang sangat seru, mendidik, dan berbobot berdasarkan materi berikut:

[INFORMASI KUIS]:
- Topik / Materi Pembelajaran: ${materi}
- Mata Pelajaran: ${mapel}
- Tingkat / Kelas: ${kelas}
- Jumlah Soal: ${count} butir pilihan ganda (A, B, C, D)
- Tingkat Kesulitan: ${tingkatKesulitan} (mudah, sedang, atau HOTS/analisis kontekstual)
- Dukungan Media Visual: ${sertakanMedia ? "YA, WAJIB variasikan beberapa soal dengan media visual (gambar ilustrasi statis, gambar gerak/GIF animasi edukatif, atau video YouTube edukatif terkait materi)" : "Opsional"}

[PANDUAN PENYUSUNAN SOAL]:
1. Pertanyaan harus jelas, kontekstual dengan kehidupan nyata siswa, dan menantang rasa ingin tahu.
2. Pilihan jawaban (A, B, C, D) harus homogen, masuk akal, dan hanya ada 1 jawaban yang benar.
3. Kunci jawaban: hanya 'A', 'B', 'C', atau 'D'.
4. Berikan Pembahasan yang ringkas namun mendalam dan mencerahkan.
5. Alokasi waktu default per soal: 25 s/d 40 detik.
6. Dukungan Media (mediaType):
   - Jika soal memerlukan stimulus gambar diam: gunakan "mediaType": "image" dan sertakan link gambar ilustrasi edukatif berkualitas tinggi (misal dari Unsplash edukasi atau Wikimedia atau SVG bebas) serta "mediaCaption" penjelas.
   - Jika soal memerlukan konsep dinamis/proses gerak (seperti siklus air, rotasi bumi, metamorfosis kupu-kupu, pembagian pecahan, peredaran darah): gunakan "mediaType": "gif" dan sertakan link GIF animasi edukasi yang relevan serta "mediaCaption".
   - Jika soal berbasis tayangan video singkat: gunakan "mediaType": "video" dan sertakan URL video/YouTube edukasi relevan (format embed https://www.youtube.com/embed/... atau watch) serta "mediaCaption".
   - Jika murni teks tanpa media: gunakan "mediaType": "none", "mediaUrl": "", "mediaCaption": "".

KEMBALIKAN HANYA FORMAT JSON MURNI (TANPA TANDA KUTIP MARKDOWN / TANPA BACKTICK \`\`\`):
{
  "judul": "Kuis Seru: [Nama Materi Menarik]",
  "deskripsi": "Asesmen formatif cepat seputar [ringkasan topik]",
  "mapel": "${mapel}",
  "kelas": "${kelas}",
  "pinCode": "${Math.floor(1000 + Math.random() * 9000)}",
  "daftarSoal": [
    {
      "nomor": 1,
      "pertanyaan": "...",
      "opsiA": "...",
      "opsiB": "...",
      "opsiC": "...",
      "opsiD": "...",
      "kunci": "A",
      "pembahasan": "...",
      "waktuDetik": 30,
      "poin": 20,
      "mediaType": "image",
      "mediaUrl": "https://images.unsplash.com/...",
      "mediaCaption": "Ilustrasi ..."
    }
  ]
}`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: prompt }] }
      ]);

      let rawText = response.text || "";
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: any = null;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawText);
      }

      // Format questions and ensure IDs and valid mediaType
      const daftarSoal = (parsed.daftarSoal || []).map((q: any, idx: number) => {
        let mediaType = (q.mediaType || "none").toLowerCase();
        if (!["none", "image", "gif", "video"].includes(mediaType)) {
          mediaType = q.mediaUrl ? "image" : "none";
        }
        return {
          id: `soal-ai-${Date.now()}-${idx + 1}`,
          nomor: idx + 1,
          pertanyaan: q.pertanyaan || "Pertanyaan kuis",
          opsiA: q.opsiA || "Pilihan A",
          opsiB: q.opsiB || "Pilihan B",
          opsiC: q.opsiC || "Pilihan C",
          opsiD: q.opsiD || "Pilihan D",
          kunci: (q.kunci || "A").toUpperCase(),
          pembahasan: q.pembahasan || "",
          waktuDetik: Number(q.waktuDetik) || 30,
          poin: Number(q.poin) || 20,
          mediaType: mediaType as 'none' | 'image' | 'gif' | 'video',
          mediaUrl: q.mediaUrl || "",
          mediaCaption: q.mediaCaption || ""
        };
      });

      res.json({
        status: "success",
        kuis: {
          judul: parsed.judul || `Kuis AI: ${materi}`,
          deskripsi: parsed.deskripsi || `Kuis asesmen formatif seputar materi ${materi}`,
          mapel,
          kelas,
          pinCode: parsed.pinCode || String(Math.floor(1000 + Math.random() * 9000)),
          daftarSoal
        }
      });
    } catch (err: any) {
      console.error("Gagal generate Kuis AI:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Gagal membuat paket kuis dengan AI."
      });
    }
  });

  // API: Generate 1 Soal Kuis Spesifik dengan AI
  app.post("/api/ai/generate-kuis-soal", async (req, res) => {
    try {
      const {
        materi = "Sains dan Teknologi",
        mapel = "IPAS",
        kelas = "Kelas 5",
        nomor = 1,
        tingkatKesulitan = "sedang",
        mediaType = "image"
      } = req.body || {};

      const ai = getAiClient();

      const prompt = `Buatkan 1 butir soal kuis pilihan ganda interaktif untuk jenjang ${kelas} mata pelajaran ${mapel}.
Materi: ${materi}
Tingkat Kesulitan: ${tingkatKesulitan}
Preferensi Media: ${mediaType} (dukungan gambar ilustrasi, gambar gerak/GIF animasi, atau video)

KEMBALIKAN HANYA FORMAT JSON MURNI (TANPA KUTIP MARKDOWN):
{
  "nomor": ${nomor},
  "pertanyaan": "Teks soal lengkap dan jelas...",
  "opsiA": "Pilihan A",
  "opsiB": "Pilihan B",
  "opsiC": "Pilihan C",
  "opsiD": "Pilihan D",
  "kunci": "A",
  "pembahasan": "Alasan mengapa kunci ini benar...",
  "waktuDetik": 30,
  "poin": 20,
  "mediaType": "${mediaType}",
  "mediaUrl": "URL gambar / gif / video edukatif relevan...",
  "mediaCaption": "Keterangan ilustrasi media..."
}`;

      const response = await generateContentWithRetry(ai, [
        { role: "user", parts: [{ text: prompt }] }
      ]);

      let rawText = response.text || "";
      rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: any = null;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(rawText);
      }

      res.json({
        status: "success",
        soal: {
          id: `soal-ai-${Date.now()}-${nomor}`,
          nomor,
          pertanyaan: parsed.pertanyaan || "Pertanyaan soal",
          opsiA: parsed.opsiA || "Pilihan A",
          opsiB: parsed.opsiB || "Pilihan B",
          opsiC: parsed.opsiC || "Pilihan C",
          opsiD: parsed.opsiD || "Pilihan D",
          kunci: (parsed.kunci || "A").toUpperCase(),
          pembahasan: parsed.pembahasan || "",
          waktuDetik: Number(parsed.waktuDetik) || 30,
          poin: Number(parsed.poin) || 20,
          mediaType: (parsed.mediaType || mediaType || "none").toLowerCase(),
          mediaUrl: parsed.mediaUrl || "",
          mediaCaption: parsed.mediaCaption || ""
        }
      });
    } catch (err: any) {
      console.error("Gagal generate butir soal AI:", err);
      res.status(500).json({
        status: "error",
        message: err?.message || "Gagal membuat butir soal AI."
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server EdAdmin Pro running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
