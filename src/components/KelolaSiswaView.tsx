import React, { useState, useEffect } from "react";
import { 
  Users, 
  Upload, 
  Download, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  X, 
  Save, 
  FileSpreadsheet, 
  Lock,
  FileText,
  UserCheck,
  HeartPulse,
  GraduationCap,
  Home,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import { Siswa, User, BukuIndukSiswa, Mapel, EkstrakurikulerItem } from "../types";
import { saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses, isRecordAllowedByClass } from "../lib/accessControl";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyEditSuccess, 
  notifyHapusSuccess, 
  notifyHapusError, 
  notifyUnduhSuccess, 
  notifyUnduhError, 
  confirmDeleteAlert 
} from "../lib/swal";

const EXCLUDED_MAPEL_KEYWORDS = ["pencak silat", "pramuka", "hadroh", "drumban", "drumband"];
const isStandardMapel = (namaMapel: string) => {
  if (!namaMapel) return false;
  const lower = namaMapel.toLowerCase();
  return !EXCLUDED_MAPEL_KEYWORDS.some((kw) => lower.includes(kw));
};

interface KelolaSiswaViewProps {
  siswaList: Siswa[];
  bukuIndukList?: BukuIndukSiswa[];
  mapelList?: Mapel[];
  currentUser?: User | null;
}

interface StudentFormState {
  id?: string;
  // Identitas Siswa
  nis: string;
  nisn: string;
  nama: string;
  namaPanggilan: string;
  kelas: string;
  jenisKelamin: string;
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

  // Orang Tua & Wali
  namaAyah: string;
  tanggalLahirAyah: string;
  nikAyah: string;
  pendidikanAyah: string;
  pekerjaanAyah: string;
  penghasilanAyah: string;
  agamaAyah: string;

  namaIbu: string;
  tanggalLahirIbu: string;
  nikIbu: string;
  pendidikanIbu: string;
  pekerjaanIbu: string;
  penghasilanIbu: string;
  agamaIbu: string;

  alamatOrangTua: string;

  namaWali: string;
  hubunganKeluargaWali: string;
  pekerjaanWali: string;

  // Pendidikan
  asalSiswa: string;
  masukDiKelas: string;
  asalSekolahTkPaud: string;
  diterimaTanggal: string;

  // Catatan Kesehatan
  tinggiBadan: string;
  beratBadan: string;
  lingkarKepala: string;
  pendengaran: string;
  penglihatan: string;
  gigi: string;
  catatanKesehatan: string;
}

const createEmptyFormState = (defaultClass: string = "Kelas 1"): StudentFormState => ({
  nis: "",
  nisn: "",
  nama: "",
  namaPanggilan: "",
  kelas: defaultClass,
  jenisKelamin: "L",
  tempatLahir: "",
  tanggalLahir: "",
  nik: "",
  kewarganegaraan: "Indonesia",
  anakKe: "1",
  jumlahSaudaraKandung: "0",
  jumlahSaudaraTiri: "0",
  jumlahSaudaraAngkat: "0",
  bahasaSehariHari: "Bahasa Indonesia",
  golonganDarah: "O",
  alamat: "",
  tempatTinggal: "Bersama Orang Tua",
  jarakKeSekolah: "1 km",

  namaAyah: "",
  tanggalLahirAyah: "",
  nikAyah: "",
  pendidikanAyah: "SMA",
  pekerjaanAyah: "Karyawan Swasta",
  penghasilanAyah: "3.000.000 - 5.000.000",
  agamaAyah: "Islam",

  namaIbu: "",
  tanggalLahirIbu: "",
  nikIbu: "",
  pendidikanIbu: "SMA",
  pekerjaanIbu: "Ibu Rumah Tangga",
  penghasilanIbu: "-",
  agamaIbu: "Islam",

  alamatOrangTua: "",

  namaWali: "",
  hubunganKeluargaWali: "",
  pekerjaanWali: "",

  asalSiswa: "Siswa Baru / Dari TK",
  masukDiKelas: defaultClass,
  asalSekolahTkPaud: "",
  diterimaTanggal: new Date().toISOString().split("T")[0],

  tinggiBadan: "120",
  beratBadan: "22",
  lingkarKepala: "50",
  pendengaran: "Baik",
  penglihatan: "Baik",
  gigi: "Baik",
  catatanKesehatan: "Sehat Walafiat"
});

export const KelolaSiswaView: React.FC<KelolaSiswaViewProps> = ({ 
  siswaList, 
  bukuIndukList = [], 
  mapelList = [], 
  currentUser = null 
}) => {
  const [search, setSearch] = useState("");
  const [selectedKelasFilter, setSelectedKelasFilter] = useState("");

  // Quick addition fields
  const [quickNisn, setQuickNisn] = useState("");
  const [quickNama, setQuickNama] = useState("");
  const [quickKelas, setQuickKelas] = useState("");

  // Modal State for full student & Buku Induk entry
  const [showModal, setShowModal] = useState(false);
  const [editingSiswaId, setEditingSiswaId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"identitas" | "orangtua" | "pendidikan" | "kesehatan">("identitas");
  const [formState, setFormState] = useState<StudentFormState>(createEmptyFormState());

  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));

  // Set default class for quick form
  useEffect(() => {
    if (allowedClasses.length > 0 && !quickKelas) {
      setQuickKelas(allowedClasses[0]);
    }
  }, [allowedClasses, quickKelas]);

  // Filter accessible siswa list based on user role/class access
  const accessibleSiswaList = siswaList.filter((s) => isRecordAllowedByClass(s, currentUser));

  const filteredSiswaList = accessibleSiswaList.filter((s) => {
    const matchSearch = 
      s.nama.toLowerCase().includes(search.toLowerCase()) || 
      s.nisn.includes(search) ||
      (s.nis || "").includes(search);
    const matchKelas = selectedKelasFilter ? s.kelas === selectedKelasFilter : true;
    return matchSearch && matchKelas;
  });

  // Calculate completeness score for Buku Induk integration
  const getCompleteness = (siswa: Siswa) => {
    const bi = bukuIndukList.find((b) => b.idSiswa === siswa.id || (b.nisn && b.nisn === siswa.nisn));
    if (!bi) return { score: 35, isComplete: false };

    let filled = 0;
    const total = 10;

    if (siswa.nisn && siswa.nisn.length > 3) filled++;
    if (siswa.nama && siswa.nama.length > 2) filled++;
    if (bi.nis && bi.nis.length > 0) filled++;
    if (bi.pesertaDidik?.nik && bi.pesertaDidik.nik.length > 5) filled++;
    if (bi.pesertaDidik?.tempatLahir && bi.pesertaDidik?.tanggalLahir) filled++;
    if (bi.pesertaDidik?.alamat && bi.pesertaDidik.alamat.length > 3) filled++;
    if (bi.orangTuaWali?.namaAyah || bi.orangTuaWali?.namaWali) filled++;
    if (bi.orangTuaWali?.namaIbu || bi.orangTuaWali?.namaWali) filled++;
    if (bi.orangTuaWali?.nikAyah || bi.orangTuaWali?.nikIbu) filled++;
    if (bi.pendidikan?.asalSekolahTkPaud || bi.pendidikan?.diterimaTanggal) filled++;

    const score = Math.round((filled / total) * 100);
    return { score, isComplete: score >= 90 };
  };

  // Open modal to add new student with full Buku Induk fields
  const handleOpenAddModal = () => {
    const defaultClass = allowedClasses[0] || "Kelas 1";
    const initialClass = currentUser?.role === "guru_kelas" ? (currentUser.kelasUtama || defaultClass) : defaultClass;
    setFormState({
      ...createEmptyFormState(initialClass),
      nisn: quickNisn,
      nama: quickNama,
      kelas: initialClass
    });
    setEditingSiswaId(null);
    setModalTab("identitas");
    setShowModal(true);
  };

  // Open modal to edit existing student
  const handleOpenEditModal = (siswa: Siswa) => {
    const bi = bukuIndukList.find((b) => b.idSiswa === siswa.id || (b.nisn && b.nisn === siswa.nisn));

    setFormState({
      id: siswa.id,
      nis: siswa.nis || bi?.nis || "",
      nisn: siswa.nisn || bi?.nisn || "",
      nama: siswa.nama || bi?.pesertaDidik?.namaLengkap || "",
      namaPanggilan: bi?.pesertaDidik?.namaPanggilan || siswa.nama.split(" ")[0] || "",
      kelas: siswa.kelas || bi?.kelas || allowedClasses[0] || "Kelas 1",
      jenisKelamin: bi?.pesertaDidik?.jenisKelamin || "L",
      tempatLahir: bi?.pesertaDidik?.tempatLahir || "",
      tanggalLahir: bi?.pesertaDidik?.tanggalLahir || "",
      nik: bi?.pesertaDidik?.nik || "",
      kewarganegaraan: bi?.pesertaDidik?.kewarganegaraan || "Indonesia",
      anakKe: bi?.pesertaDidik?.anakKe || "1",
      jumlahSaudaraKandung: bi?.pesertaDidik?.jumlahSaudaraKandung || "0",
      jumlahSaudaraTiri: bi?.pesertaDidik?.jumlahSaudaraTiri || "0",
      jumlahSaudaraAngkat: bi?.pesertaDidik?.jumlahSaudaraAngkat || "0",
      bahasaSehariHari: bi?.pesertaDidik?.bahasaSehariHari || "Bahasa Indonesia",
      golonganDarah: bi?.pesertaDidik?.golonganDarah || "O",
      alamat: bi?.pesertaDidik?.alamat || "",
      tempatTinggal: bi?.pesertaDidik?.tempatTinggal || "Bersama Orang Tua",
      jarakKeSekolah: bi?.pesertaDidik?.jarakKeSekolah || "1 km",

      namaAyah: bi?.orangTuaWali?.namaAyah || "",
      tanggalLahirAyah: bi?.orangTuaWali?.tanggalLahirAyah || "",
      nikAyah: bi?.orangTuaWali?.nikAyah || "",
      pendidikanAyah: bi?.orangTuaWali?.pendidikanAyah || "SMA",
      pekerjaanAyah: bi?.orangTuaWali?.pekerjaanAyah || "Karyawan Swasta",
      penghasilanAyah: bi?.orangTuaWali?.penghasilanAyah || "3.000.000 - 5.000.000",
      agamaAyah: bi?.orangTuaWali?.agamaAyah || "Islam",

      namaIbu: bi?.orangTuaWali?.namaIbu || "",
      tanggalLahirIbu: bi?.orangTuaWali?.tanggalLahirIbu || "",
      nikIbu: bi?.orangTuaWali?.nikIbu || "",
      pendidikanIbu: bi?.orangTuaWali?.pendidikanIbu || "SMA",
      pekerjaanIbu: bi?.orangTuaWali?.pekerjaanIbu || "Ibu Rumah Tangga",
      penghasilanIbu: bi?.orangTuaWali?.penghasilanIbu || "-",
      agamaIbu: bi?.orangTuaWali?.agamaIbu || "Islam",

      alamatOrangTua: bi?.orangTuaWali?.alamatOrangTua || bi?.pesertaDidik?.alamat || "",

      namaWali: bi?.orangTuaWali?.namaWali || "",
      hubunganKeluargaWali: bi?.orangTuaWali?.hubunganKeluargaWali || "",
      pekerjaanWali: bi?.orangTuaWali?.pekerjaanWali || "",

      asalSiswa: bi?.pendidikan?.asalSiswa || "Siswa Baru / Dari TK",
      masukDiKelas: bi?.pendidikan?.masukDiKelas || siswa.kelas,
      asalSekolahTkPaud: bi?.pendidikan?.asalSekolahTkPaud || "",
      diterimaTanggal: bi?.pendidikan?.diterimaTanggal || new Date().toISOString().split("T")[0],

      tinggiBadan: bi?.kesehatan?.tinggiBadan || "120",
      beratBadan: bi?.kesehatan?.beratBadan || "22",
      lingkarKepala: bi?.kesehatan?.lingkarKepala || "50",
      pendengaran: bi?.kesehatan?.pendengaran || "Baik",
      penglihatan: bi?.kesehatan?.penglihatan || "Baik",
      gigi: bi?.kesehatan?.gigi || "Baik",
      catatanKesehatan: bi?.kesehatan?.lainLain || "Sehat Walafiat"
    });
    setEditingSiswaId(siswa.id);
    setModalTab("identitas");
    setShowModal(true);
  };

  // Quick submit handler
  const handleQuickAddSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKelas = currentUser?.role === "guru_kelas" ? (currentUser.kelasUtama || quickKelas) : quickKelas;

    if (!quickNisn.trim() || !quickNama.trim() || !finalKelas.trim()) {
      notifySimpanError("Mohon isi NISN, Nama Lengkap, dan Kelas.");
      return;
    }

    const exists = siswaList.find((s) => s.nisn === quickNisn.trim());
    if (exists) {
      notifySimpanError(`Siswa dengan NISN ${quickNisn} sudah ada dalam database!`);
      return;
    }

    const id = `sis_${Date.now()}`;
    const newSiswa: Siswa = {
      id,
      nisn: quickNisn.trim(),
      nama: quickNama.trim(),
      kelas: finalKelas.trim()
    };

    const biDocId = `bi_${id}`;
    const defaultBukuInduk: BukuIndukSiswa = {
      id: biDocId,
      idSiswa: id,
      nis: "1001",
      nisn: quickNisn.trim(),
      kelas: finalKelas.trim(),

      pesertaDidik: {
        namaLengkap: quickNama.trim(),
        namaPanggilan: quickNama.trim().split(" ")[0] || "",
        jenisKelamin: "L",
        tempatLahir: "Bogor",
        tanggalLahir: "2018-01-01",
        nik: "",
        kewarganegaraan: "Indonesia",
        anakKe: "1",
        jumlahSaudaraKandung: "0",
        jumlahSaudaraTiri: "0",
        jumlahSaudaraAngkat: "0",
        bahasaSehariHari: "Bahasa Indonesia",
        golonganDarah: "O",
        alamat: "Jl. Raya Babakan",
        tempatTinggal: "Bersama Orang Tua",
        jarakKeSekolah: "1 km"
      },

      orangTuaWali: {
        namaAyah: "",
        tanggalLahirAyah: "",
        nikAyah: "",
        pendidikanAyah: "SMA",
        pekerjaanAyah: "Karyawan Swasta",
        penghasilanAyah: "3.000.000 - 5.000.000",
        agamaAyah: "Islam",
        kewarganegaraanAyah: "Indonesia",

        namaIbu: "",
        tanggalLahirIbu: "",
        nikIbu: "",
        pendidikanIbu: "SMA",
        pekerjaanIbu: "Ibu Rumah Tangga",
        penghasilanIbu: "-",
        agamaIbu: "Islam",
        kewarganegaraanIbu: "Indonesia",

        alamatOrangTua: "Jl. Raya Babakan",

        namaWali: "",
        hubunganKeluargaWali: "",
        pendidikanWali: "",
        pekerjaanWali: "",
        alamatWali: ""
      },

      pendidikan: {
        asalSiswa: "Siswa Baru / Dari TK",
        masukDiKelas: finalKelas.trim(),
        asalSekolahTkPaud: "TK / PAUD",
        diterimaTanggal: new Date().toISOString().split("T")[0],
        pindahanMasukDiKelas: "",
        pindahanAsalSekolah: "",
        pindahanDiterimaTanggal: ""
      },

      meninggalkanSekolah: {
        tahunLulus: "",
        noIjazah: "",
        melanjutkanKe: "",
        pindahKelas: "",
        pindahKeSekolah: "",
        pindahTingkat: "",
        keluarAlasan: "",
        keluarTanggal: ""
      },

      kesehatan: {
        tinggiBadan: "120",
        beratBadan: "22",
        lingkarKepala: "50",
        pendengaran: "Baik",
        penglihatan: "Baik",
        gigi: "Baik",
        lainLain: "Sehat Walafiat"
      },

      raport: {
        semester: "Ganjil",
        tahunPelajaran: "2025/2026",
        nilaiPengetahuan: (mapelList || []).filter(m => isStandardMapel(m.namaMapel)).map(m => ({
          idMapel: m.id,
          namaMapel: m.namaMapel,
          kktp: 75,
          nilai: 80,
          predikat: "B",
          deskripsi: `Menunjukkan penguasaan yang sangat baik dalam materi ${m.namaMapel}`
        })),
        nilaiEkstrakurikuler: [
          { id: "esk_1", namaEskul: "Pramuka", keteranganPredikat: "A / Sangat Baik" }
        ],
        nilaiPrestasi: [],
        sakit: 0,
        izin: 0,
        alpa: 0,
        statusKenaikan: "Belum Ditentukan",
        keKelas: finalKelas.trim(),
        tanggalKenaikan: new Date().toISOString().split("T")[0]
      },
      updatedAt: Date.now()
    };

    try {
      await saveDocument(COLLECTIONS.SISWA, id, newSiswa);
      await saveDocument(COLLECTIONS.BUKU_INDUK, biDocId, defaultBukuInduk);
      setQuickNisn("");
      setQuickNama("");
      notifySimpanSuccess(`Siswa ${newSiswa.nama} berhasil ditambahkan dan terintegrasi dengan Buku Induk!`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan data siswa.");
    }
  };

  // Save complete student & Buku Induk record from Modal
  const handleSaveFullStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.nisn.trim() || !formState.nama.trim() || !formState.kelas.trim()) {
      notifySimpanError("Mohon lengkapi NISN, Nama Lengkap, dan Kelas.");
      return;
    }

    // Check duplicate NISN
    const duplicate = siswaList.find((s) => s.id !== editingSiswaId && s.nisn === formState.nisn.trim());
    if (duplicate) {
      notifySimpanError(`NISN ${formState.nisn} sudah digunakan oleh siswa ${duplicate.nama}.`);
      return;
    }

    const studentId = editingSiswaId || `sis_${Date.now()}`;
    const biDocId = `bi_${studentId}`;
    const existingBI = bukuIndukList.find((b) => b.idSiswa === studentId || b.id === biDocId);

    const finalSiswa: Siswa = {
      id: studentId,
      nisn: formState.nisn.trim(),
      nama: formState.nama.trim(),
      kelas: formState.kelas.trim(),
      nis: formState.nis.trim() || undefined,
      updatedAt: Date.now()
    };

    const finalBukuInduk: BukuIndukSiswa = {
      id: biDocId,
      idSiswa: studentId,
      nis: formState.nis.trim() || existingBI?.nis || "1001",
      nisn: formState.nisn.trim(),
      kelas: formState.kelas.trim(),

      pesertaDidik: {
        namaLengkap: formState.nama.trim(),
        namaPanggilan: formState.namaPanggilan.trim() || formState.nama.trim().split(" ")[0] || "",
        jenisKelamin: formState.jenisKelamin || "L",
        tempatLahir: formState.tempatLahir.trim(),
        tanggalLahir: formState.tanggalLahir,
        nik: formState.nik.trim(),
        kewarganegaraan: formState.kewarganegaraan.trim() || "Indonesia",
        anakKe: formState.anakKe || "1",
        jumlahSaudaraKandung: formState.jumlahSaudaraKandung || "0",
        jumlahSaudaraTiri: formState.jumlahSaudaraTiri || "0",
        jumlahSaudaraAngkat: formState.jumlahSaudaraAngkat || "0",
        bahasaSehariHari: formState.bahasaSehariHari.trim() || "Bahasa Indonesia",
        golonganDarah: formState.golonganDarah || "O",
        alamat: formState.alamat.trim(),
        tempatTinggal: formState.tempatTinggal || "Bersama Orang Tua",
        jarakKeSekolah: formState.jarakKeSekolah || "1 km"
      },

      orangTuaWali: {
        namaAyah: formState.namaAyah.trim(),
        tanggalLahirAyah: formState.tanggalLahirAyah,
        nikAyah: formState.nikAyah.trim(),
        pendidikanAyah: formState.pendidikanAyah || "SMA",
        pekerjaanAyah: formState.pekerjaanAyah || "Karyawan Swasta",
        penghasilanAyah: formState.penghasilanAyah || "3.000.000 - 5.000.000",
        agamaAyah: formState.agamaAyah || "Islam",
        kewarganegaraanAyah: "Indonesia",

        namaIbu: formState.namaIbu.trim(),
        tanggalLahirIbu: formState.tanggalLahirIbu,
        nikIbu: formState.nikIbu.trim(),
        pendidikanIbu: formState.pendidikanIbu || "SMA",
        pekerjaanIbu: formState.pekerjaanIbu || "Ibu Rumah Tangga",
        penghasilanIbu: formState.penghasilanIbu || "-",
        agamaIbu: formState.agamaIbu || "Islam",
        kewarganegaraanIbu: "Indonesia",

        alamatOrangTua: formState.alamatOrangTua.trim() || formState.alamat.trim(),

        namaWali: formState.namaWali.trim(),
        hubunganKeluargaWali: formState.hubunganKeluargaWali.trim(),
        pendidikanWali: "",
        pekerjaanWali: formState.pekerjaanWali.trim(),
        alamatWali: ""
      },

      pendidikan: {
        asalSiswa: formState.asalSiswa || "Siswa Baru / Dari TK",
        masukDiKelas: formState.masukDiKelas || formState.kelas,
        asalSekolahTkPaud: formState.asalSekolahTkPaud.trim() || "TK / PAUD",
        diterimaTanggal: formState.diterimaTanggal || new Date().toISOString().split("T")[0],
        pindahanMasukDiKelas: existingBI?.pendidikan?.pindahanMasukDiKelas || "",
        pindahanAsalSekolah: existingBI?.pendidikan?.pindahanAsalSekolah || "",
        pindahanDiterimaTanggal: existingBI?.pendidikan?.pindahanDiterimaTanggal || ""
      },

      meninggalkanSekolah: existingBI?.meninggalkanSekolah || {
        tahunLulus: "",
        noIjazah: "",
        melanjutkanKe: "",
        pindahKelas: "",
        pindahKeSekolah: "",
        pindahTingkat: "",
        keluarAlasan: "",
        keluarTanggal: ""
      },

      kesehatan: {
        tinggiBadan: formState.tinggiBadan || "120",
        beratBadan: formState.beratBadan || "22",
        lingkarKepala: formState.lingkarKepala || "50",
        pendengaran: formState.pendengaran || "Baik",
        penglihatan: formState.penglihatan || "Baik",
        gigi: formState.gigi || "Baik",
        lainLain: formState.catatanKesehatan || "Sehat Walafiat"
      },

      raport: existingBI?.raport || {
        semester: "Ganjil",
        tahunPelajaran: "2025/2026",
        nilaiPengetahuan: (mapelList || []).filter(m => isStandardMapel(m.namaMapel)).map(m => ({
          idMapel: m.id,
          namaMapel: m.namaMapel,
          kktp: 75,
          nilai: 80,
          predikat: "B",
          deskripsi: `Menunjukkan penguasaan yang sangat baik dalam materi ${m.namaMapel}`
        })),
        nilaiEkstrakurikuler: [
          { id: "esk_1", namaEskul: "Pramuka", keteranganPredikat: "A / Sangat Baik" }
        ],
        nilaiPrestasi: [],
        sakit: 0,
        izin: 0,
        alpa: 0,
        statusKenaikan: "Belum Ditentukan",
        keKelas: formState.kelas,
        tanggalKenaikan: new Date().toISOString().split("T")[0]
      },
      updatedAt: Date.now()
    };

    try {
      await saveDocument(COLLECTIONS.SISWA, studentId, finalSiswa);
      await saveDocument(COLLECTIONS.BUKU_INDUK, biDocId, finalBukuInduk);

      setShowModal(false);
      if (editingSiswaId) {
        notifyEditSuccess(`Data siswa & Buku Induk ${finalSiswa.nama} berhasil diperbarui!`);
      } else {
        notifySimpanSuccess(`Siswa ${finalSiswa.nama} & Buku Induk terintegrasi berhasil ditambahkan!`);
      }
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan data siswa.");
    }
  };

  // Delete student and their associated Buku Induk
  const handleDelete = async (id: string, namaSiswa: string) => {
    const isConfirmed = await confirmDeleteAlert(
      "Hapus Data Siswa?", 
      `Apakah Anda yakin ingin menghapus data siswa ${namaSiswa} beserta seluruh berkas Buku Induk terkait?`
    );
    if (isConfirmed) {
      try {
        await deleteDocument(COLLECTIONS.SISWA, id);
        await deleteDocument(COLLECTIONS.BUKU_INDUK, `bi_${id}`);
        notifyHapusSuccess(`Data ${namaSiswa} dan Buku Induk terkait telah dihapus.`);
      } catch (err: any) {
        notifyHapusError(err.message || "Gagal menghapus data.");
      }
    }
  };

  // Download XLSX template with full Buku Induk columns
  const downloadTemplate = () => {
    try {
      const data = [
        { 
          "NIS": "1001", 
          "NISN": "0012345678", 
          "Kelas": allowedClasses[0] || "Kelas 1",
          "Nama Lengkap": "Ahmad Fulan", 
          "Nama Panggilan": "Ahmad",
          "Jenis Kelamin (L/P)": "L",
          "Tempat Lahir": "Bogor",
          "Tanggal Lahir (YYYY-MM-DD)": "2018-05-12",
          "NIK Siswa": "3201011205180001",
          "Alamat": "Kp. Babakan Kulon RT 02/05 Desa Babakan",
          "Nama Ayah": "Budi Santoso",
          "NIK Ayah": "3201011504800002",
          "Pekerjaan Ayah": "Karyawan Swasta",
          "Nama Ibu": "Siti Rahmawati",
          "NIK Ibu": "3201012008820003",
          "Pekerjaan Ibu": "Ibu Rumah Tangga",
          "Asal Sekolah TK/PAUD": "TK Mutiara Hati",
          "Tanggal Diterima": "2024-07-15"
        },
        { 
          "NIS": "1002", 
          "NISN": "0012345679", 
          "Kelas": allowedClasses[0] || "Kelas 1",
          "Nama Lengkap": "Siti Aminah", 
          "Nama Panggilan": "Aminah",
          "Jenis Kelamin (L/P)": "P",
          "Tempat Lahir": "Jakarta",
          "Tanggal Lahir (YYYY-MM-DD)": "2018-08-20",
          "NIK Siswa": "3201016008180004",
          "Alamat": "Kp. Babakan Tengah RT 01/03 Desa Babakan",
          "Nama Ayah": "Rahmat Hidayat",
          "NIK Ayah": "3201011010780005",
          "Pekerjaan Ayah": "Wiraswasta",
          "Nama Ibu": "Dewi Sartika",
          "NIK Ibu": "3201011402830006",
          "Pekerjaan Ibu": "Guru",
          "Asal Sekolah TK/PAUD": "PAUD Tunas Bangsa",
          "Tanggal Diterima": "2024-07-15"
        }
      ];
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Siswa_BukuInduk");
      XLSX.writeFile(workbook, "Template_Import_Siswa_BukuInduk.xlsx");
      notifyUnduhSuccess("Template_Import_Siswa_BukuInduk.xlsx berhasil diunduh!");
    } catch (err: any) {
      notifyUnduhError("Gagal mengunduh template Excel.");
    }
  };

  // Upload XLSX import for Siswa & Buku Induk integration
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!parsedData || parsedData.length === 0) {
          notifySimpanError("Berkas Excel kosong atau format tidak sesuai.");
          return;
        }

        let successCount = 0;
        let skipped = 0;

        for (let idx = 0; idx < parsedData.length; idx++) {
          const row = parsedData[idx];
          const rowNisn = String(row["NISN"] || row["nisn"] || "").trim();
          const rowNis = String(row["NIS"] || row["nis"] || "").trim();
          const rowNama = String(row["Nama Lengkap"] || row["Nama Siswa"] || row["Nama"] || row["nama"] || "").trim();
          let rowKelas = String(row["Kelas"] || row["kelas"] || "").trim();

          if (currentUser?.role === "guru_kelas") {
            rowKelas = currentUser.kelasUtama || rowKelas;
          }

          if (rowNisn && rowNama && rowKelas) {
            const isDuplicate = siswaList.some((s) => s.nisn === rowNisn);
            if (!isDuplicate) {
              const studentId = `sis_imp_${Date.now()}_${idx}`;
              const biDocId = `bi_${studentId}`;

              const newSiswa: Siswa = {
                id: studentId,
                nisn: rowNisn,
                nama: rowNama,
                kelas: rowKelas,
                nis: rowNis || undefined,
                updatedAt: Date.now()
              };

              const newBukuInduk: BukuIndukSiswa = {
                id: biDocId,
                idSiswa: studentId,
                nis: rowNis || "1001",
                nisn: rowNisn,
                kelas: rowKelas,

                pesertaDidik: {
                  namaLengkap: rowNama,
                  namaPanggilan: String(row["Nama Panggilan"] || rowNama.split(" ")[0] || ""),
                  jenisKelamin: String(row["Jenis Kelamin (L/P)"] || row["Jenis Kelamin"] || "L").toUpperCase().startsWith("P") ? "P" : "L",
                  tempatLahir: String(row["Tempat Lahir"] || "Bogor"),
                  tanggalLahir: String(row["Tanggal Lahir (YYYY-MM-DD)"] || row["Tanggal Lahir"] || "2018-01-01"),
                  nik: String(row["NIK Siswa"] || row["NIK"] || ""),
                  kewarganegaraan: "Indonesia",
                  anakKe: "1",
                  jumlahSaudaraKandung: "0",
                  jumlahSaudaraTiri: "0",
                  jumlahSaudaraAngkat: "0",
                  bahasaSehariHari: "Bahasa Indonesia",
                  golonganDarah: "O",
                  alamat: String(row["Alamat"] || "Jl. Raya Babakan"),
                  tempatTinggal: "Bersama Orang Tua",
                  jarakKeSekolah: "1 km"
                },

                orangTuaWali: {
                  namaAyah: String(row["Nama Ayah"] || ""),
                  tanggalLahirAyah: "",
                  nikAyah: String(row["NIK Ayah"] || ""),
                  pendidikanAyah: "SMA",
                  pekerjaanAyah: String(row["Pekerjaan Ayah"] || "Karyawan Swasta"),
                  penghasilanAyah: "3.000.000 - 5.000.000",
                  agamaAyah: "Islam",
                  kewarganegaraanAyah: "Indonesia",

                  namaIbu: String(row["Nama Ibu"] || ""),
                  tanggalLahirIbu: "",
                  nikIbu: String(row["NIK Ibu"] || ""),
                  pendidikanIbu: "SMA",
                  pekerjaanIbu: String(row["Pekerjaan Ibu"] || "Ibu Rumah Tangga"),
                  penghasilanIbu: "-",
                  agamaIbu: "Islam",
                  kewarganegaraanIbu: "Indonesia",

                  alamatOrangTua: String(row["Alamat"] || "Jl. Raya Babakan"),

                  namaWali: "",
                  hubunganKeluargaWali: "",
                  pendidikanWali: "",
                  pekerjaanWali: "",
                  alamatWali: ""
                },

                pendidikan: {
                  asalSiswa: "Siswa Baru / Dari TK",
                  masukDiKelas: rowKelas,
                  asalSekolahTkPaud: String(row["Asal Sekolah TK/PAUD"] || "TK / PAUD"),
                  diterimaTanggal: String(row["Tanggal Diterima"] || new Date().toISOString().split("T")[0]),
                  pindahanMasukDiKelas: "",
                  pindahanAsalSekolah: "",
                  pindahanDiterimaTanggal: ""
                },

                meninggalkanSekolah: {
                  tahunLulus: "",
                  noIjazah: "",
                  melanjutkanKe: "",
                  pindahKelas: "",
                  pindahKeSekolah: "",
                  pindahTingkat: "",
                  keluarAlasan: "",
                  keluarTanggal: ""
                },

                kesehatan: {
                  tinggiBadan: "120",
                  beratBadan: "22",
                  lingkarKepala: "50",
                  pendengaran: "Baik",
                  penglihatan: "Baik",
                  gigi: "Baik",
                  lainLain: "Sehat Walafiat"
                },

                raport: {
                  semester: "Ganjil",
                  tahunPelajaran: "2025/2026",
                  nilaiPengetahuan: (mapelList || []).filter(m => isStandardMapel(m.namaMapel)).map(m => ({
                    idMapel: m.id,
                    namaMapel: m.namaMapel,
                    kktp: 75,
                    nilai: 80,
                    predikat: "B",
                    deskripsi: `Menunjukkan penguasaan yang sangat baik dalam materi ${m.namaMapel}`
                  })),
                  nilaiEkstrakurikuler: [
                    { id: "esk_1", namaEskul: "Pramuka", keteranganPredikat: "A / Sangat Baik" }
                  ],
                  nilaiPrestasi: [],
                  sakit: 0,
                  izin: 0,
                  alpa: 0,
                  statusKenaikan: "Belum Ditentukan",
                  keKelas: rowKelas,
                  tanggalKenaikan: new Date().toISOString().split("T")[0]
                },
                updatedAt: Date.now()
              };

              await saveDocument(COLLECTIONS.SISWA, studentId, newSiswa);
              await saveDocument(COLLECTIONS.BUKU_INDUK, biDocId, newBukuInduk);
              successCount++;
            } else {
              skipped++;
            }
          }
        }

        if (successCount > 0) {
          notifySimpanSuccess(`Berhasil mengimpor ${successCount} siswa beserta Buku Induk! ${skipped > 0 ? `(${skipped} dilewati karena NISN duplikat)` : ""}`);
        } else {
          notifySimpanError("Tidak ada data siswa baru yang diimpor. Semua NISN sudah ada dalam database.");
        }
      } catch (err: any) {
        notifySimpanError("Gagal membaca berkas Excel. Pastikan format kolom sesuai template.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Class Access Badge */}
      {currentUser && (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <span>Kelola Siswa & Buku Induk Integrated</span>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  100% Terhubung
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pengguna: <span className="font-bold text-slate-700 dark:text-slate-200">{currentUser.nama}</span> | Hak Akses Kelas: <span className="font-bold text-indigo-600 dark:text-indigo-400">{allowedClasses.join(", ")}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa & Buku Induk Lengkap</span>
            </button>
            <span className="text-xs font-extrabold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              Total {accessibleSiswaList.length} Siswa
            </span>
          </div>
        </div>
      )}

      {/* Input Form & Excel Import */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Add Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Tambah Siswa Cepat (Otomatis Buat Register Buku Induk)
            </h3>

            <button
              onClick={handleOpenAddModal}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center space-x-1"
            >
              <span>Atau isi formulir detail lengkap &rarr;</span>
            </button>
          </div>

          <form onSubmit={handleQuickAddSiswa} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NISN (10 Digit)</label>
              <input
                type="text"
                value={quickNisn}
                onChange={(e) => setQuickNisn(e.target.value)}
                placeholder="Misal: 0012345678"
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap Siswa</label>
              <input
                type="text"
                value={quickNama}
                onChange={(e) => setQuickNama(e.target.value)}
                placeholder="Nama Lengkap sesuai Ijazah"
                className="w-full px-3 py-2 text-xs border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelas</label>
              {currentUser?.role === "guru_kelas" ? (
                <div className="flex items-center space-x-1.5 px-3 py-2 border rounded-xl bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-xs">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser.kelasUtama || "Kelas 1"}</span>
                </div>
              ) : (
                <select
                  value={quickKelas}
                  onChange={(e) => setQuickKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                  required
                >
                  {allowedClasses.map((kls) => (
                    <option key={kls} value={kls}>{kls}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="sm:col-span-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 italic">
                *Menyimpan siswa di sini akan membuat data Buku Induk awal secara otomatis.
              </span>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Siswa</span>
              </button>
            </div>
          </form>
        </div>

        {/* Excel Import Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Import Excel Kolektif (Lengkap)
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unggah berkas `.xlsx` untuk mengisi data Siswa & Buku Induk sekaligus secara terintegrasi.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={downloadTemplate}
              className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh Template Excel Integrated</span>
            </button>

            <label className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Berkas Excel Siswa</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Siswa Table Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NISN, NIS, atau Nama Siswa..."
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Filter Kelas:</span>
            <select
              value={selectedKelasFilter}
              onChange={(e) => setSelectedKelasFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
            >
              <option value="">Semua Kelas Akses ({allowedClasses.length})</option>
              {allowedClasses.map((kls) => (
                <option key={kls} value={kls}>{kls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">No</th>
                <th className="p-3">NIS / NISN</th>
                <th className="p-3">Nama Lengkap Siswa</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Status Data Buku Induk</th>
                <th className="p-3 text-center">Aksi / Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredSiswaList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                    Tidak ada data siswa ditemukan untuk kriteria filter ini.
                  </td>
                </tr>
              ) : (
                filteredSiswaList.map((siswa, index) => {
                  const comp = getCompleteness(siswa);
                  return (
                    <tr key={siswa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-slate-400 font-medium">{index + 1}</td>
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{siswa.nisn}</div>
                        {siswa.nis && <div className="text-[10px] text-slate-400">NIS: {siswa.nis}</div>}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{siswa.nama}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                          {siswa.kelas}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${comp.isComplete ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${comp.score}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold ${comp.isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {comp.score}% {comp.isComplete ? "Lengkap" : "Perlu Dilengkapi"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(siswa)}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                            title="Lengkapi & Edit Data Buku Induk Siswa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit / Lengkapi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(siswa.id, siswa.nama)}
                            className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                            title="Hapus Siswa & Buku Induk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* FULL INTEGRATED STUDENT & BUKU INDUK MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl my-8 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-white">
                    {editingSiswaId ? "Edit & Lengkapi Data Siswa / Buku Induk" : "Tambah Siswa Baru & Buku Induk Terintegrasi"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formulir terintegrasi penuh dengan Register Buku Induk Siswa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Nav Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalTab("identitas")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  modalTab === "identitas"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>1. Identitas Siswa</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("orangtua")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  modalTab === "orangtua"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>2. Orang Tua / Wali</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("pendidikan")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  modalTab === "pendidikan"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>3. Riwayat Pendidikan</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab("kesehatan")}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  modalTab === "kesehatan"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>4. Kesehatan</span>
              </button>
            </div>

            {/* Form Fields Body */}
            <form onSubmit={handleSaveFullStudent} className="space-y-4">
              {/* TAB 1: IDENTITAS SISWA */}
              {modalTab === "identitas" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      NISN (10 Digit) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState.nisn}
                      onChange={(e) => setFormState({ ...formState, nisn: e.target.value })}
                      placeholder="0012345678"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Nomor Induk Siswa (NIS Sekolah)
                    </label>
                    <input
                      type="text"
                      value={formState.nis}
                      onChange={(e) => setFormState({ ...formState, nis: e.target.value })}
                      placeholder="1001"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Nama Lengkap Siswa <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formState.nama}
                      onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                      placeholder="Nama Lengkap Siswa sesuai Akta / Ijazah"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Nama Panggilan
                    </label>
                    <input
                      type="text"
                      value={formState.namaPanggilan}
                      onChange={(e) => setFormState({ ...formState, namaPanggilan: e.target.value })}
                      placeholder="Nama Panggilan"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Kelas <span className="text-red-500">*</span>
                    </label>
                    {currentUser?.role === "guru_kelas" ? (
                      <div className="flex items-center space-x-1.5 px-3 py-2 border rounded-xl bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentUser.kelasUtama || "Kelas 1"}</span>
                      </div>
                    ) : (
                      <select
                        value={formState.kelas}
                        onChange={(e) => setFormState({ ...formState, kelas: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                        required
                      >
                        {allowedClasses.map((kls) => (
                          <option key={kls} value={kls}>{kls}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={formState.jenisKelamin}
                      onChange={(e) => setFormState({ ...formState, jenisKelamin: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    >
                      <option value="L">Laki-Laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      NIK Siswa (16 Digit)
                    </label>
                    <input
                      type="text"
                      value={formState.nik}
                      onChange={(e) => setFormState({ ...formState, nik: e.target.value })}
                      placeholder="3201..."
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={formState.tempatLahir}
                      onChange={(e) => setFormState({ ...formState, tempatLahir: e.target.value })}
                      placeholder="Kab. Bogor"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={formState.tanggalLahir}
                      onChange={(e) => setFormState({ ...formState, tanggalLahir: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Alamat Tempat Tinggal Siswa
                    </label>
                    <textarea
                      rows={2}
                      value={formState.alamat}
                      onChange={(e) => setFormState({ ...formState, alamat: e.target.value })}
                      placeholder="Alamat Lengkap RT/RW Desa/Kecamatan"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: ORANG TUA / WALI */}
              {modalTab === "orangtua" && (
                <div className="space-y-4 text-xs">
                  {/* AYAH */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5">
                      <span>Data Ayah Kandung</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Ayah</label>
                        <input
                          type="text"
                          value={formState.namaAyah}
                          onChange={(e) => setFormState({ ...formState, namaAyah: e.target.value })}
                          placeholder="Nama Ayah Kandung"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NIK Ayah</label>
                        <input
                          type="text"
                          value={formState.nikAyah}
                          onChange={(e) => setFormState({ ...formState, nikAyah: e.target.value })}
                          placeholder="NIK KTP Ayah"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pekerjaan Ayah</label>
                        <input
                          type="text"
                          value={formState.pekerjaanAyah}
                          onChange={(e) => setFormState({ ...formState, pekerjaanAyah: e.target.value })}
                          placeholder="Pekerjaan Ayah"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* IBU */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <h4 className="font-bold text-pink-600 dark:text-pink-400 text-xs flex items-center gap-1.5">
                      <span>Data Ibu Kandung</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Ibu</label>
                        <input
                          type="text"
                          value={formState.namaIbu}
                          onChange={(e) => setFormState({ ...formState, namaIbu: e.target.value })}
                          placeholder="Nama Ibu Kandung"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NIK Ibu</label>
                        <input
                          type="text"
                          value={formState.nikIbu}
                          onChange={(e) => setFormState({ ...formState, nikIbu: e.target.value })}
                          placeholder="NIK KTP Ibu"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pekerjaan Ibu</label>
                        <input
                          type="text"
                          value={formState.pekerjaanIbu}
                          onChange={(e) => setFormState({ ...formState, pekerjaanIbu: e.target.value })}
                          placeholder="Pekerjaan Ibu"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WALI */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <h4 className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                      Data Wali Murid (Opsional / Jika Ada)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Wali</label>
                        <input
                          type="text"
                          value={formState.namaWali}
                          onChange={(e) => setFormState({ ...formState, namaWali: e.target.value })}
                          placeholder="Nama Wali (opsional)"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hubungan Keluarga</label>
                        <input
                          type="text"
                          value={formState.hubunganKeluargaWali}
                          onChange={(e) => setFormState({ ...formState, hubunganKeluargaWali: e.target.value })}
                          placeholder="Paman / Kakek / Wali"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pekerjaan Wali</label>
                        <input
                          type="text"
                          value={formState.pekerjaanWali}
                          onChange={(e) => setFormState({ ...formState, pekerjaanWali: e.target.value })}
                          placeholder="Pekerjaan Wali"
                          className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RIWAYAT PENDIDIKAN */}
              {modalTab === "pendidikan" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Asal Sekolah TK / PAUD
                    </label>
                    <input
                      type="text"
                      value={formState.asalSekolahTkPaud}
                      onChange={(e) => setFormState({ ...formState, asalSekolahTkPaud: e.target.value })}
                      placeholder="Nama TK / PAUD sebelumnya"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Tanggal Diterima di Sekolah
                    </label>
                    <input
                      type="date"
                      value={formState.diterimaTanggal}
                      onChange={(e) => setFormState({ ...formState, diterimaTanggal: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Status Asal Siswa
                    </label>
                    <input
                      type="text"
                      value={formState.asalSiswa}
                      onChange={(e) => setFormState({ ...formState, asalSiswa: e.target.value })}
                      placeholder="Siswa Baru / Dari TK / Pindahan"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Diterima di Kelas
                    </label>
                    <input
                      type="text"
                      value={formState.masukDiKelas}
                      onChange={(e) => setFormState({ ...formState, masukDiKelas: e.target.value })}
                      placeholder="Kelas 1"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: KESEHATAN */}
              {modalTab === "kesehatan" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tinggi Badan (cm)</label>
                    <input
                      type="text"
                      value={formState.tinggiBadan}
                      onChange={(e) => setFormState({ ...formState, tinggiBadan: e.target.value })}
                      placeholder="120"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Berat Badan (kg)</label>
                    <input
                      type="text"
                      value={formState.beratBadan}
                      onChange={(e) => setFormState({ ...formState, beratBadan: e.target.value })}
                      placeholder="22"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lingkar Kepala (cm)</label>
                    <input
                      type="text"
                      value={formState.lingkarKepala}
                      onChange={(e) => setFormState({ ...formState, lingkarKepala: e.target.value })}
                      placeholder="50"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kondisi Pendengaran</label>
                    <input
                      type="text"
                      value={formState.pendengaran}
                      onChange={(e) => setFormState({ ...formState, pendengaran: e.target.value })}
                      placeholder="Baik / Normal"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kondisi Penglihatan</label>
                    <input
                      type="text"
                      value={formState.penglihatan}
                      onChange={(e) => setFormState({ ...formState, penglihatan: e.target.value })}
                      placeholder="Baik / Normal"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kondisi Gigi</label>
                    <input
                      type="text"
                      value={formState.gigi}
                      onChange={(e) => setFormState({ ...formState, gigi: e.target.value })}
                      placeholder="Baik / Normal"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Catatan Kesehatan Tambahan</label>
                    <input
                      type="text"
                      value={formState.catatanKesehatan}
                      onChange={(e) => setFormState({ ...formState, catatanKesehatan: e.target.value })}
                      placeholder="Sehat Walafiat / Riwayat Alergi"
                      className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">
                  {editingSiswaId ? "Data akan langsung memperbarui daftar Siswa & Buku Induk" : "Data baru akan tersimpan di Siswa & Buku Induk secara simultan"}
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Siswa & Buku Induk</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
