export type RoleUser = 'admin' | 'guru_kelas' | 'guru_mapel' | 'guru_ekskul';

export interface User {
  id: string;
  username: string;
  password?: string;
  nama: string;
  name?: string;
  nip?: string;
  role: RoleUser;
  kelasUtama?: string; // For guru_kelas, e.g. "Kelas 1", "VII A"
  kelasAkses?: string[]; // For guru_mapel, e.g. ["Kelas 1", "Kelas 2", "Kelas 3"]
  mapelDiampu?: string;
  updatedAt?: number;
}

export interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  nis?: string;
  updatedAt?: number;
}

export interface Mapel {
  id: string;
  namaMapel: string;
  semester: string;
  tahunAjaran: string;
  updatedAt?: number;
}

export interface Jadwal {
  id: string;
  hari: string;
  jam: string;
  kelas: string;
  mapel: string;
  updatedAt?: number;
}

export interface LogAbsensi {
  id: string;
  waktu: string; // YYYY-MM-DD
  tanggal: string;
  kelas: string;
  mapel: string;
  idSiswa: string;
  namaSiswa: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  bulan: string;
  tahun: string;
  namaGuru: string;
  updatedAt?: number;
}

export interface DataNilai {
  id: string;
  waktu: string;
  jenis: string; // e.g. UH1, UTS, UAS, Tugas 1
  mapel: string;
  kelas: string;
  idSiswa: string;
  namaSiswa: string;
  nilai: number | '';
  namaGuru: string;
  tp?: string;
  deskripsi?: string;
  updatedAt?: number;
}

export interface JurnalAgenda {
  id: string;
  tanggal: string;
  jam: string;
  kelas: string;
  mapel: string;
  materi: string;
  status: string; // Terlaksana / Tunda
  absenSiswa: string;
  ket?: string;
  namaGuru: string;
  updatedAt?: number;
}

export interface SiswaBimbingan {
  id: string;
  namaSiswa: string;
  kelas: string;
  updatedAt?: number;
}

export interface BimbinganWali {
  id: string;
  tanggal: string;
  namaSiswa: string;
  kelas: string;
  jenis: string; // Akademik, Pribadi, Sosial, Keterampilan
  kasus: string;
  tindakLanjut: string;
  guruWali: string;
  updatedAt?: number;
}

export interface TabunganKelas {
  id: string;
  tanggal: string;
  kelas: string;
  idSiswa: string;
  namaSiswa: string;
  jenis: "Setor" | "Tarik";
  jumlah: number;
  keterangan?: string;
  namaGuru?: string;
  updatedAt?: number;
}

export type StatusAset = 'Tersedia' | 'Dipinjam' | 'Rusak' | 'Hilang';

export interface AsetKelas {
  id: string;
  idBarang: string; // e.g. "AST-001"
  tanggalTerima: string; // YYYY-MM-DD
  namaBarang: string;
  kelas: string; // e.g. "Kelas 1", "Kelas 2"
  status: StatusAset;
  keterangan?: string;
  updatedAt?: number;
}

export interface PeminjamanAset {
  id: string;
  idAset: string; // Document ID of AsetKelas
  idBarang: string;
  namaBarang: string;
  kelas: string;
  tanggalPinjam: string; // YYYY-MM-DD
  kondisiAwal: string; // Kondisi sebelum dipinjam
  namaPeminjam: string;
  tanggalKembali?: string; // YYYY-MM-DD
  namaPengembali?: string; // Nama orang yang mengembalikan barang
  kondisiKembali?: string; // Kondisi saat dikembalikan
  statusPeminjaman: 'Dipinjam' | 'Dikembalikan';
  keterangan?: string;
  namaPetugas?: string;
  updatedAt?: number;
}

export type StatusBhp = 'Tersedia' | 'Habis';

export interface BhpKelas {
  id: string;
  idBarang: string; // e.g. "BHP-001"
  tanggalTerima: string; // YYYY-MM-DD
  namaBarang: string;
  kelas: string; // e.g. "Kelas 1", "Kelas 2"
  jumlahStok: number; // Jumlah stok sisa
  satuan: string; // e.g. "Pcs", "Box", "Rim", "Pak"
  status: StatusBhp; // 'Tersedia' | 'Habis'
  keterangan?: string;
  updatedAt?: number;
}

export interface PemakaianBhp {
  id: string;
  idBhp: string; // Document ID of BhpKelas
  idBarang: string;
  namaBarang: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  jumlahDipakai: number;
  satuan?: string;
  keterangan?: string;
  namaPenginput?: string;
  updatedAt?: number;
}

export interface Pengaturan {
  Nama_Guru: string;
  NIP_Guru: string;
  Pemerintah: string;
  Nama_Sekolah: string;
  Alamat_Sekolah: string;
  Nama_Kepsek: string;
  NIP_Kepsek: string;
  Tempat_Tanda_Tangan: string;
  Logo_Kiri: string;
  Logo_Kanan: string;
  Nama_Kepala_Sekolah?: string;
  NIP_Kepala_Sekolah?: string;
  Tahun_Ajaran?: string;
  Semester?: string;
  Logo_Tinggi?: number;
  Dinas?: string;
  NPSN?: string;
  Email_Sekolah?: string;
  isDatabaseCleared?: boolean;
  hasInitialSeeded?: boolean;
  themeConfig?: {
    presetId?: string;
    primaryColor?: string;
    primaryHover?: string;
    gradientFrom?: string;
    gradientVia?: string;
    gradientTo?: string;
    fontFamily?: 'inter' | 'jakarta' | 'outfit' | 'poppins';
    borderRadius?: 'sharp' | 'medium' | 'rounded' | 'full';
  };
}

export interface ModulFormState {
  namaGuru: string;
  namaSekolah: string;
  tahunAjaran: string;
  jenjang: string;
  fase: string;
  kelas: string;
  waktu: string;
  mataPelajaran: string;
  topik: string;
  subTopik: string;
  jumlahPertemuan: string;
  model: string;
  metode?: string;
  tujuan: string;
  karakteristik: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

// Interfaces for Buku Induk Siswa & Raport
export interface KeteranganPesertaDidik {
  namaLengkap: string;
  namaPanggilan: string;
  jenisKelamin: 'L' | 'P' | string;
  tempatLahir: string;
  tanggalLahir: string;
  nik: string;
  kewarganegaraan: string;
  anakKe: string;
  jumlahSaudaraKandung: string;
  jumlahSaudaraTiri: string;
  jumlahSaudaraAngkat: string;
  bahasaSehariHari: string;
  golonganDarah: string;
  alamat: string;
  tempatTinggal: string;
  jarakKeSekolah: string;
}

export interface KeteranganOrangTuaWali {
  namaAyah: string;
  tanggalLahirAyah: string;
  nikAyah: string;
  pendidikanAyah: string;
  pekerjaanAyah: string;
  penghasilanAyah: string;
  agamaAyah: string;
  kewarganegaraanAyah: string;

  namaIbu: string;
  tanggalLahirIbu: string;
  nikIbu: string;
  pendidikanIbu: string;
  pekerjaanIbu: string;
  penghasilanIbu: string;
  agamaIbu: string;
  kewarganegaraanIbu: string;

  alamatOrangTua: string;

  namaWali?: string;
  hubunganKeluargaWali?: string;
  pendidikanWali?: string;
  pekerjaanWali?: string;
  alamatWali?: string;
}

export interface KeteranganPendidikan {
  asalSiswa: string;
  masukDiKelas: string;
  asalSekolahTkPaud: string;
  diterimaTanggal: string;

  pindahanMasukDiKelas?: string;
  pindahanAsalSekolah?: string;
  pindahanDiterimaTanggal?: string;
}

export interface MeninggalkanSekolah {
  tahunLulus?: string;
  noIjazah?: string;
  melanjutkanKe?: string;

  pindahKelas?: string;
  pindahKeSekolah?: string;
  pindahTingkat?: string;

  keluarAlasan?: string;
  keluarTanggal?: string;
}

export interface CatatanKesehatan {
  tinggiBadan: string;
  beratBadan: string;
  lingkarKepala: string;
  pendengaran: string;
  penglihatan: string;
  gigi: string;
  lainLain: string;
}

export interface EkstrakurikulerItem {
  id: string;
  namaEskul: string;
  keteranganPredikat: string;
}

export interface PrestasiItem {
  id: string;
  jenisPrestasi: string;
  keterangan: string;
}

export interface NilaiMapelRaport {
  idMapel?: string;
  namaMapel: string;
  kktp?: number | string;
  nilai: number | string;
  predikat: string; // e.g. "A", "B", "C"
  deskripsi: string;
}

export interface RaportSiswaData {
  semester: 'Ganjil' | 'Genap' | string;
  tahunPelajaran: string;
  nilaiPengetahuan: NilaiMapelRaport[];
  nilaiEkstrakurikuler: EkstrakurikulerItem[];
  nilaiPrestasi: PrestasiItem[];
  sakit: number | string;
  izin: number | string;
  alpa: number | string;
  catatanWaliKelas?: string;
  statusKenaikan: 'Naik Kelas' | 'Tidak Naik Kelas' | 'Lulus' | 'Belum Ditentukan' | string;
  keKelas: string;
  tanggalKenaikan: string;
  tanggalRaport?: string;
  tempatTitimangsa?: string;
}

export type PeriodeRaportType = 
  | 'pts_ganjil' 
  | 'pas_ganjil' 
  | 'pts_genap' 
  | 'pat_genap' 
  | 'ujian_sekolah' 
  | 'asesmen_formatif_sumatif';

export interface RaportRecord {
  id: string; // doc ID, e.g. `raport_${idSiswa}_${periode}_${tahunAjaran}`
  idSiswa: string;
  nisn: string;
  nis?: string;
  namaSiswa: string;
  kelas: string;
  fase: string;
  periode: PeriodeRaportType;
  periodeNama: string;
  semester: 'Ganjil' | 'Genap';
  tahunAjaran: string;
  tanggalRaport: string;
  tempatTitimangsa: string;
  nilaiMapel: Array<{
    mapel: string;
    kktp?: number | string;
    nilaiAkhir: number | string;
    capaianKompetensiTinggi?: string;
    capaianKompetensiPerluBimbingan?: string;
    deskripsi?: string;
  }>;
  ekskul: Array<{
    nama: string;
    predikat: string;
    keterangan: string;
  }>;
  prestasi: Array<{
    jenis: string;
    keterangan: string;
  }>;
  kehadiran: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  catatanWaliKelas: string;
  statusKenaikan?: {
    status: 'Naik Kelas' | 'Tidak Naik Kelas' | 'Lulus' | 'Belum Ditentukan';
    keKelas?: string;
  };
  tinggiBadan?: string;
  beratBadan?: string;
  namaGuruWali?: string;
  nipGuruWali?: string;
  namaKepsek?: string;
  nipKepsek?: string;
  updatedAt?: number;
}

export interface BukuIndukSiswa {
  id: string; // doc ID, e.g. `bi_${idSiswa}`
  idSiswa: string;
  nis: string;
  nisn: string;
  kelas: string;

  pesertaDidik: KeteranganPesertaDidik;
  orangTuaWali: KeteranganOrangTuaWali;
  pendidikan: KeteranganPendidikan;
  meninggalkanSekolah: MeninggalkanSekolah;
  kesehatan: CatatanKesehatan;

  raport: RaportSiswaData;

  updatedAt?: number;
}

export type StatusKedatangan = 'Sangat Pagi' | 'Tepat Waktu' | 'Terlambat' | 'Sakit' | 'Izin' | 'Alpa';
export type TipeKehadiran = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export interface LogKedatangan {
  id: string;
  idSiswa: string;
  nisn: string;
  nis?: string;
  namaSiswa: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  jamDatang: string; // HH:mm, e.g. "06:20"
  waktuTimestamp: number;
  status: StatusKedatangan;
  statusKehadiran?: TipeKehadiran;
  urutanKedatangan?: number;
  catatan?: string;
  namaPetugas?: string;
  updatedAt?: number;
}

// Interface for Bank Tujuan Pembelajaran (TP)
export interface BankTpItem {
  id: string;
  mapel: string;
  kelas: string;
  fase: string;
  semester: 'Ganjil' | 'Genap' | 'Semua';
  kodeTp?: string;
  tujuanPembelajaran: string;
  materiPokok?: string;
  kategori?: 'Tinggi' | 'Sedang' | 'Bimbingan' | 'Umum';
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Interfaces for Generator Soal AI & Bank Soal
export type TipeSoal = 'pilihan_ganda' | 'isian' | 'uraian' | 'menjodohkan' | 'benar_salah';
export type LevelKognitif = 'Mudah (LOTS / C1-C2)' | 'Sedang (MOTS / C3)' | 'Sukar (HOTS / C4-C6)' | string;
export type BentukAsesmen = 
  | 'Formatif (Ulangan Harian)' 
  | 'Sumatif Lingkup Materi' 
  | 'Sumatif Akhir Semester (SAS / ASAS)' 
  | 'Sumatif Tengah Semester (STS)'
  | 'Asesmen Diagnostik' 
  | 'Remedial & Pengayaan' 
  | 'Latihan Mandiri / PR'
  | string;

export interface ButirSoal {
  id: string;
  nomor: number;
  tipe: TipeSoal;
  level: LevelKognitif;
  stimulus?: string; // Teks narasi, cerita pendek, studi kasus, atau data tabel
  pertanyaan: string;
  pilihanJawaban?: { [key: string]: string }; // e.g. { A: "...", B: "...", C: "...", D: "..." }
  kunciJawaban: string;
  pembahasan: string;
  rubrikSkor?: string;
  skorMaksimal: number;
  capaianPembelajaran?: string;
  indikatorSoal?: string;
}

export interface KisiKisiItem {
  nomorSoal: number;
  tujuanPembelajaran: string;
  materi: string;
  indikatorSoal: string;
  levelKognitif: string;
  bentukSoal: string;
  nomorKunci: string;
  skor: number;
}

export interface BankSoalPaket {
  id: string;
  judul: string;
  mataPelajaran: string;
  kelas: string;
  fase: string;
  semester: string;
  tahunAjaran: string;
  alokasiWaktu: string;
  bentukAsesmen: BentukAsesmen;
  topikMateri: string;
  subTopik?: string;
  petunjukUmum?: string;
  tanggalDibuat: string;
  namaGuru: string;
  nipGuru?: string;
  totalSoal: number;
  totalSkor: number;
  daftarSoal: ButirSoal[];
  kisiKisi: KisiKisiItem[];
  pedomanPenskoran: string;
  createdAt: number;
  updatedAt?: number;
}

// ----------------------------------------------------
// KUIS INTERAKTIF & ASESMEN CEPAT KELAS
// ----------------------------------------------------
export type KuisMediaType = 'none' | 'image' | 'gif' | 'video';

export interface KuisSoalItem {
  id: string;
  nomor: number;
  pertanyaan: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  kunci: 'A' | 'B' | 'C' | 'D';
  pembahasan?: string;
  waktuDetik: number; // e.g. 20, 30, 60
  poin: number;
  mediaType?: KuisMediaType;
  mediaUrl?: string; // image URL, gif URL, or video/youtube link/embed
  mediaCaption?: string;
}

export interface KuisPaket {
  id: string;
  judul: string;
  mapel: string;
  kelas: string;
  deskripsi?: string;
  pinCode: string;
  totalSoal: number;
  daftarSoal: KuisSoalItem[];
  dibuatOleh: string;
  tanggalDibuat: string;
  topikMateri?: string;
  aiGenerated?: boolean;
  updatedAt?: number;
}

export interface KuisHasilSiswa {
  idSiswa: string;
  namaSiswa: string;
  kelas: string;
  jawaban: Record<number, string>; // { 1: "A", 2: "C" }
  totalBenar: number;
  totalSalah: number;
  skorAkhir: number; // 0 - 100
  waktuSelesai?: string;
}

export interface KuisSesiRecord {
  id: string;
  kuisId: string;
  judulKuis: string;
  mapel: string;
  kelas: string;
  tanggal: string;
  pinCode: string;
  guruPengampu: string;
  totalPeserta: number;
  rataRataKelas: number;
  nilaiTertinggi: number;
  nilaiTerendah: number;
  hasilSiswa: KuisHasilSiswa[];
  updatedAt?: number;
}

// ----------------------------------------------------
// PORTOFOLIO DIGITAL & REKAM JEJAK P5
// ----------------------------------------------------
export type P5Tema = 
  | 'Gaya Hidup Berkelanjutan'
  | 'Kearifan Lokal'
  | 'Bhinneka Tunggal Ika'
  | 'Bangunlah Jiwa dan Raganya'
  | 'Suara Demokrasi'
  | 'Rekayasa dan Teknologi'
  | 'Kewirausahaan'
  | 'Kebekerjaan';

export type P5Dimensi = 
  | 'Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia'
  | 'Berkebinekaan Global'
  | 'Bergotong Royong'
  | 'Mandiri'
  | 'Bernalar Kritis'
  | 'Kreatif';

export type P5Skala = 'MB' | 'SB' | 'BSH' | 'SAB'; // Mulai Berkembang, Sedang Berkembang, Berkembang Sesuai Harapan, Sangat Berkembang

export interface P5SubElemenTarget {
  id: string;
  dimensi: string;
  elemen: string;
  subElemen: string;
  capaianFase: string;
}

export interface P5Projek {
  id: string;
  judul: string;
  tema: P5Tema;
  deskripsi: string;
  fase: string; // Fase A, Fase B, Fase C, Fase D, dll.
  kelas: string; // Kelas 1, 2, 3, 4, 5, 6, dll.
  semester: 'Ganjil' | 'Genap';
  tahunAjaran: string;
  subElemenList: P5SubElemenTarget[];
  fasilitator: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  updatedAt?: number;
}

export interface P5PenilaianRecord {
  id: string;
  projekId: string;
  idSiswa: string;
  namaSiswa: string;
  kelas: string;
  nilaiSubElemen: Record<string, P5Skala>; // subElemenId -> 'MB'|'SB'|'BSH'|'SAB'
  catatanProses: string;
  updatedAt?: number;
}

export interface P5PortofolioKarya {
  id: string;
  projekId?: string;
  judulProjek?: string;
  idSiswa: string;
  namaSiswa: string;
  kelas: string;
  judulKarya: string;
  deskripsiKarya: string;
  fotoUrl?: string;
  tanggal: string;
  refleksiSiswa?: string;
  umpanBalikGuru?: string;
  tagDimensi?: string[];
  updatedAt?: number;
}


