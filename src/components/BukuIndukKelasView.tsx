import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  BookMarked, 
  Search, 
  Printer, 
  Save, 
  User as UserIcon, 
  FileText, 
  Award, 
  Activity, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ChevronRight, 
  GraduationCap, 
  Sparkles,
  Edit,
  Building2,
  Calendar,
  Heart,
  Users,
  Ruler,
  FileSpreadsheet,
  Download,
  Upload,
  X,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { formatTanggalIndonesia } from "./CetakRaportView";

export interface IncompleteItem {
  section: string;
  field: string;
  description: string;
}

const EXCLUDED_MAPEL_KEYWORDS = ["pencak silat", "pramuka", "hadroh", "drumban", "drumband"];
const isStandardMapel = (namaMapel: string) => {
  if (!namaMapel) return false;
  const lower = namaMapel.toLowerCase();
  return !EXCLUDED_MAPEL_KEYWORDS.some((keyword) => lower.includes(keyword));
};
import { 
  Siswa, 
  BukuIndukSiswa, 
  Mapel, 
  DataNilai, 
  LogAbsensi, 
  Pengaturan, 
  User,
  NilaiMapelRaport,
  EkstrakurikulerItem,
  PrestasiItem 
} from "../types";
import { saveDocument, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses } from "../lib/accessControl";

interface BukuIndukKelasViewProps {
  siswaList: Siswa[];
  bukuIndukList: BukuIndukSiswa[];
  mapelList: Mapel[];
  dataNilaiList: DataNilai[];
  logAbsensiList: LogAbsensi[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const BukuIndukKelasView: React.FC<BukuIndukKelasViewProps> = ({
  siswaList,
  bukuIndukList,
  mapelList,
  dataNilaiList,
  logAbsensiList,
  config,
  currentUser
}) => {
  const allowedClasses = getAllowedClasses(currentUser);
  const isAdmin = currentUser?.role === "admin";
  const isGuruKelas = currentUser?.role === "guru_kelas";

  const [selectedKelas, setSelectedKelas] = useState<string>(
    isAdmin ? "Semua" : (allowedClasses[0] || "Kelas 1")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"buku_induk" | "raport">("buku_induk");

  // State for current Buku Induk record being viewed/edited
  const [formData, setFormData] = useState<BukuIndukSiswa | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [missingFields, setMissingFields] = useState<IncompleteItem[]>([]);

  // Filter students by selected class and search term
  const filteredSiswa = siswaList.filter((s) => {
    const matchKelas = selectedKelas === "Semua" || s.kelas === selectedKelas;
    const matchSearch = 
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm) ||
      (s.nis || "").includes(searchTerm);
    return matchKelas && matchSearch;
  });

  const selectedSiswa = siswaList.find((s) => s.id === selectedSiswaId) || null;

  // Whenever selectedSiswaId changes, load or create Buku Induk default data
  useEffect(() => {
    if (!selectedSiswa) {
      setFormData(null);
      return;
    }

    const existingRecord = bukuIndukList.find(
      (b) => b.idSiswa === selectedSiswa.id || (b.nisn && b.nisn === selectedSiswa.nisn)
    );

    if (existingRecord) {
      const copy = JSON.parse(JSON.stringify(existingRecord));
      if (copy.raport && copy.raport.nilaiPengetahuan) {
        copy.raport.nilaiPengetahuan = copy.raport.nilaiPengetahuan
          .filter((m: NilaiMapelRaport) => isStandardMapel(m.namaMapel))
          .map((m: NilaiMapelRaport) => ({
            ...m,
            kktp: m.kktp ?? 75
          }));
      }
      setFormData(copy);
    } else {
      // Create fresh default structure integrated with student & school data
      const filteredMapelList = mapelList.filter((m) => isStandardMapel(m.namaMapel));
      const studentNilaiMapel = filteredMapelList.map((m) => {
        // Find existing average or latest grade for this student & mapel
        const grades = dataNilaiList.filter(
          (n) => (n.idSiswa === selectedSiswa.id || n.namaSiswa.toLowerCase() === selectedSiswa.nama.toLowerCase()) &&
                 n.mapel.toLowerCase() === m.namaMapel.toLowerCase()
        );
        let calculatedNilai: number | string = "";
        let predikat = "-";
        if (grades.length > 0) {
          const numGrades = grades.map((g) => Number(g.nilai)).filter((v) => !isNaN(v) && v > 0);
          if (numGrades.length > 0) {
            const avg = Math.round(numGrades.reduce((a, b) => a + b, 0) / numGrades.length);
            calculatedNilai = avg;
            if (avg >= 90) predikat = "A";
            else if (avg >= 80) predikat = "B";
            else if (avg >= 70) predikat = "C";
            else predikat = "D";
          }
        }

        return {
          idMapel: m.id,
          namaMapel: m.namaMapel,
          kktp: 75,
          nilai: calculatedNilai,
          predikat,
          deskripsi: `Menunjukkan penguasaan yang sangat baik dalam materi ${m.namaMapel}`
        };
      });

      // Calculate attendance from logAbsensi
      const studentAbsensi = logAbsensiList.filter(
        (a) => a.idSiswa === selectedSiswa.id || a.namaSiswa.toLowerCase() === selectedSiswa.nama.toLowerCase()
      );
      const sakitCount = studentAbsensi.filter((a) => a.status === "Sakit").length;
      const izinCount = studentAbsensi.filter((a) => a.status === "Izin").length;
      const alpaCount = studentAbsensi.filter((a) => a.status === "Alpa").length;

      const initialRecord: BukuIndukSiswa = {
        id: `bi_${selectedSiswa.id}`,
        idSiswa: selectedSiswa.id,
        nis: selectedSiswa.nis || `100${selectedSiswa.id.slice(-3)}`,
        nisn: selectedSiswa.nisn || "",
        kelas: selectedSiswa.kelas,

        pesertaDidik: {
          namaLengkap: selectedSiswa.nama,
          namaPanggilan: selectedSiswa.nama.split(" ")[0] || "",
          jenisKelamin: "L",
          tempatLahir: "Bogor",
          tanggalLahir: "2016-01-01",
          nik: "",
          kewarganegaraan: "Indonesia",
          anakKe: "1",
          jumlahSaudaraKandung: "0",
          jumlahSaudaraTiri: "0",
          jumlahSaudaraAngkat: "0",
          bahasaSehariHari: "Bahasa Indonesia",
          golonganDarah: "O",
          alamat: "Jl. Raya Babakan No. 12",
          tempatTinggal: "Bersama Orang Tua",
          jarakKeSekolah: "1 km"
        },

        orangTuaWali: {
          namaAyah: "",
          tanggalLahirAyah: "",
          nikAyah: "",
          pendidikanAyah: "SMA / Sederajat",
          pekerjaanAyah: "Karyawan Swasta",
          penghasilanAyah: "3.000.000 - 5.000.000",
          agamaAyah: "Islam",
          kewarganegaraanAyah: "Indonesia",

          namaIbu: "",
          tanggalLahirIbu: "",
          nikIbu: "",
          pendidikanIbu: "SMA / Sederajat",
          pekerjaanIbu: "Ibu Rumah Tangga",
          penghasilanIbu: "-",
          agamaIbu: "Islam",
          kewarganegaraanIbu: "Indonesia",

          alamatOrangTua: "Jl. Raya Babakan No. 12",

          namaWali: "",
          hubunganKeluargaWali: "",
          pendidikanWali: "",
          pekerjaanWali: "",
          alamatWali: ""
        },

        pendidikan: {
          asalSiswa: "Siswa Baru / Dari TK",
          masukDiKelas: selectedSiswa.kelas,
          asalSekolahTkPaud: "TK Negeri Pembina",
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
          nilaiPengetahuan: studentNilaiMapel,
          nilaiEkstrakurikuler: [
            { id: "esk_1", namaEskul: "Pramuka", keteranganPredikat: "A / Sangat Baik" }
          ],
          nilaiPrestasi: [
            { id: "prs_1", jenisPrestasi: "Juara Kelas", keterangan: "Peringkat 1 Semester Ganjil" }
          ],
          sakit: sakitCount,
          izin: izinCount,
          alpa: alpaCount,
          statusKenaikan: "Belum Ditentukan",
          keKelas: selectedSiswa.kelas,
          tanggalKenaikan: new Date().toISOString().split("T")[0]
        }
      };

      setFormData(initialRecord);
    }
  }, [selectedSiswaId, bukuIndukList]);

  // Access Guard
  if (!isAdmin && !isGuruKelas) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800">
        <BookMarked className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Akses Terbatas</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Fitur Buku Induk Register & Raport Siswa hanya dapat diakses oleh Admin Sekolah dan Guru Kelas.
        </p>
      </div>
    );
  }

  // Handle Input Changes in Deep Nested State
  const updateNestedField = (path: string[], value: any) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      let current: any = updated;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
    setIsSaved(false);
  };

  // Save to Firestore
  const handleSaveBukuInduk = async () => {
    if (!formData) return;
    try {
      const payload: BukuIndukSiswa = {
        ...formData,
        updatedAt: Date.now()
      };
      await saveDocument(COLLECTIONS.BUKU_INDUK, payload.id, payload);

      // Sync back to COLLECTIONS.SISWA
      if (selectedSiswa) {
        const updatedSiswaPayload: Siswa = {
          ...selectedSiswa,
          nama: payload.pesertaDidik.namaLengkap || selectedSiswa.nama,
          nisn: payload.nisn || selectedSiswa.nisn,
          nis: payload.nis || selectedSiswa.nis,
          kelas: payload.kelas || selectedSiswa.kelas,
          updatedAt: Date.now()
        };
        await saveDocument(COLLECTIONS.SISWA, selectedSiswa.id, updatedSiswaPayload);
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      alert(`Buku Induk & Raport untuk "${formData.pesertaDidik.namaLengkap}" berhasil disimpan!`);
    } catch (err) {
      alert("Gagal menyimpan data Buku Induk: " + err);
    }
  };

  // Add Ekstrakurikuler Item to Raport
  const handleAddEskul = () => {
    if (!formData) return;
    const newEskul: EkstrakurikulerItem = {
      id: `esk_${Date.now()}`,
      namaEskul: "Pramuka / Olahraga",
      keteranganPredikat: "A / Sangat Baik"
    };
    const updatedEskul = [...(formData.raport.nilaiEkstrakurikuler || []), newEskul];
    updateNestedField(["raport", "nilaiEkstrakurikuler"], updatedEskul);
  };

  // Remove Ekstrakurikuler Item
  const handleRemoveEskul = (id: string) => {
    if (!formData) return;
    const updatedEskul = (formData.raport.nilaiEkstrakurikuler || []).filter((e) => e.id !== id);
    updateNestedField(["raport", "nilaiEkstrakurikuler"], updatedEskul);
  };

  // Add Prestasi Item
  const handleAddPrestasi = () => {
    if (!formData) return;
    const newPrestasi: PrestasiItem = {
      id: `prs_${Date.now()}`,
      jenisPrestasi: "Juara Lomba / Kelas",
      keterangan: "Tingkat Sekolah / Kecamatan"
    };
    const updatedPrestasi = [...(formData.raport.nilaiPrestasi || []), newPrestasi];
    updateNestedField(["raport", "nilaiPrestasi"], updatedPrestasi);
  };

  // Remove Prestasi Item
  const handleRemovePrestasi = (id: string) => {
    if (!formData) return;
    const updatedPrestasi = (formData.raport.nilaiPrestasi || []).filter((p) => p.id !== id);
    updateNestedField(["raport", "nilaiPrestasi"], updatedPrestasi);
  };

  // Add Mapel Row to Raport
  const handleAddMapelRaport = () => {
    if (!formData) return;
    const newMapel: NilaiMapelRaport = {
      idMapel: `m_custom_${Date.now()}`,
      namaMapel: "Mata Pelajaran Tambahan",
      kktp: 75,
      nilai: 85,
      predikat: "B",
      deskripsi: "Menunjukkan penguasaan materi dengan baik."
    };
    const updatedMapel = [...(formData.raport.nilaiPengetahuan || []), newMapel];
    updateNestedField(["raport", "nilaiPengetahuan"], updatedMapel);
  };

  // Download Excel Template for Buku Induk
  const handleDownloadTemplate = () => {
    const headers = [
      "NIS",
      "NISN",
      "Kelas",
      "Nama Lengkap",
      "Nama Panggilan",
      "Jenis Kelamin (L/P)",
      "Tempat Lahir",
      "Tanggal Lahir (YYYY-MM-DD)",
      "NIK Siswa",
      "Kewarganegaraan",
      "Anak Ke",
      "Jml Sdr Kandung",
      "Jml Sdr Tiri",
      "Jml Sdr Angkat",
      "Bahasa Sehari-hari",
      "Golongan Darah",
      "Alamat",
      "Tempat Tinggal",
      "Jarak Ke Sekolah",
      "Nama Ayah",
      "Tgl Lahir Ayah",
      "NIK Ayah",
      "Pendidikan Ayah",
      "Pekerjaan Ayah",
      "Penghasilan Ayah",
      "Agama Ayah",
      "Nama Ibu",
      "Tgl Lahir Ibu",
      "NIK Ibu",
      "Pendidikan Ibu",
      "Pekerjaan Ibu",
      "Penghasilan Ibu",
      "Agama Ibu",
      "Alamat Orang Tua",
      "Nama Wali",
      "Hubungan Wali",
      "Pekerjaan Wali",
      "Asal Siswa",
      "Masuk di Kelas",
      "Asal Sekolah TK/PAUD",
      "Diterima Tanggal",
      "Tinggi Badan (cm)",
      "Berat Badan (kg)",
      "Lingkar Kepala (cm)",
      "Pendengaran",
      "Penglihatan",
      "Gigi",
      "Catatan Kesehatan"
    ];

    const sampleRow1 = [
      "1001", "0123456789", "Kelas 1", "Ahmad Fauzi", "Ahmad", "L", "Bogor", "2018-05-12",
      "3201123456780001", "Indonesia", "1", "1", "0", "0", "Bahasa Indonesia", "O",
      "Jl. Mawar No. 10", "Bersama Orang Tua", "1 km",
      "Budi Santoso", "1985-02-10", "3201123456780002", "SMA", "Karyawan Swasta", "3.000.000 - 5.000.000", "Islam",
      "Siti Rahma", "1988-08-15", "3201123456780003", "SMA", "Ibu Rumah Tangga", "-", "Islam",
      "Jl. Mawar No. 10", "", "", "",
      "Siswa Baru", "Kelas 1", "TK Pertiwi", "2024-07-15",
      "120", "22", "50", "Baik", "Baik", "Baik", "Sehat Walafiat"
    ];

    const sampleRow2 = [
      "1002", "0123456790", "Kelas 1", "Siti Aminah", "Aminah", "P", "Bogor", "2018-09-20",
      "3201123456780004", "Indonesia", "2", "2", "0", "0", "Bahasa Indonesia", "A",
      "Jl. Melati No. 5", "Bersama Orang Tua", "2 km",
      "Rahmat Hidayat", "1983-11-05", "3201123456780005", "S1", "PNS", "> 5.000.000", "Islam",
      "Dewi Lestari", "1986-04-18", "3201123456780006", "D3", "Guru", "3.000.000 - 5.000.000", "Islam",
      "Jl. Melati No. 5", "", "", "",
      "Siswa Baru", "Kelas 1", "PAUD Ceria", "2024-07-15",
      "118", "20", "49", "Baik", "Baik", "Baik", "Sehat Walafiat"
    ];

    const wsData = [headers, sampleRow1, sampleRow2];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 3, 15) }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Buku_Induk");
    XLSX.writeFile(wb, "Template_Buku_Induk_Siswa.xlsx");
  };

  // Upload and Parse Excel File for Buku Induk
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rows.length === 0) {
        alert("File Excel kosong atau format tidak sesuai!");
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      const filteredMapel = mapelList.filter((m) => isStandardMapel(m.namaMapel));

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const nis = String(row["NIS"] || row["nis"] || "").trim();
        const nisn = String(row["NISN"] || row["nisn"] || "").trim();
        const namaLengkap = String(
          row["Nama Lengkap"] || row["Nama Siswa"] || row["namaLengkap"] || row["nama"] || ""
        ).trim();

        if (!namaLengkap && !nisn && !nis) continue;

        const matchedSiswa = siswaList.find(
          (s) =>
            (nisn && s.nisn === nisn) ||
            (nis && s.nis === nis) ||
            (namaLengkap && s.nama.toLowerCase() === namaLengkap.toLowerCase())
        );

        const idSiswa = matchedSiswa ? matchedSiswa.id : `siswa_imp_${Date.now()}_${i}`;
        const docId = `bi_${idSiswa}`;
        const kelas = String(
          row["Kelas"] || row["masukDiKelas"] || matchedSiswa?.kelas || (selectedKelas !== "Semua" ? selectedKelas : "Kelas 1")
        ).trim();

        const defaultNilaiMapel = filteredMapel.map((m) => ({
          idMapel: m.id,
          namaMapel: m.namaMapel,
          kktp: 75,
          nilai: 80,
          predikat: "B",
          deskripsi: `Menunjukkan penguasaan yang sangat baik dalam materi ${m.namaMapel}`
        }));

        const record: BukuIndukSiswa = {
          id: docId,
          idSiswa: idSiswa,
          nis: nis || matchedSiswa?.nis || `100${i + 1}`,
          nisn: nisn || matchedSiswa?.nisn || "",
          kelas: kelas,

          pesertaDidik: {
            namaLengkap: namaLengkap || matchedSiswa?.nama || "Siswa " + (i + 1),
            namaPanggilan: String(row["Nama Panggilan"] || row["namaPanggilan"] || namaLengkap.split(" ")[0] || ""),
            jenisKelamin: String(row["Jenis Kelamin (L/P)"] || row["Jenis Kelamin"] || row["jenisKelamin"] || "L")
              .toUpperCase()
              .includes("P")
              ? "P"
              : "L",
            tempatLahir: String(row["Tempat Lahir"] || row["tempatLahir"] || "Bogor"),
            tanggalLahir: String(
              row["Tanggal Lahir (YYYY-MM-DD)"] || row["Tanggal Lahir"] || row["tanggalLahir"] || "2018-01-01"
            ),
            nik: String(row["NIK Siswa"] || row["nik"] || ""),
            kewarganegaraan: String(row["Kewarganegaraan"] || row["kewarganegaraan"] || "Indonesia"),
            anakKe: String(row["Anak Ke"] || row["anakKe"] || "1"),
            jumlahSaudaraKandung: String(row["Jml Sdr Kandung"] || row["jumlahSaudaraKandung"] || "0"),
            jumlahSaudaraTiri: String(row["Jml Sdr Tiri"] || row["jumlahSaudaraTiri"] || "0"),
            jumlahSaudaraAngkat: String(row["Jml Sdr Angkat"] || row["jumlahSaudaraAngkat"] || "0"),
            bahasaSehariHari: String(row["Bahasa Sehari-hari"] || row["bahasaSehariHari"] || "Bahasa Indonesia"),
            golonganDarah: String(row["Golongan Darah"] || row["golonganDarah"] || "O"),
            alamat: String(row["Alamat"] || row["alamat"] || "Jl. Raya Babakan"),
            tempatTinggal: String(row["Tempat Tinggal"] || row["tempatTinggal"] || "Bersama Orang Tua"),
            jarakKeSekolah: String(row["Jarak Ke Sekolah"] || row["jarakKeSekolah"] || "1 km")
          },

          orangTuaWali: {
            namaAyah: String(row["Nama Ayah"] || row["namaAyah"] || ""),
            tanggalLahirAyah: String(row["Tgl Lahir Ayah"] || row["tanggalLahirAyah"] || ""),
            nikAyah: String(row["NIK Ayah"] || row["nikAyah"] || ""),
            pendidikanAyah: String(row["Pendidikan Ayah"] || row["pendidikanAyah"] || "SMA"),
            pekerjaanAyah: String(row["Pekerjaan Ayah"] || row["pekerjaanAyah"] || "Karyawan Swasta"),
            penghasilanAyah: String(row["Penghasilan Ayah"] || row["penghasilanAyah"] || "3.000.000 - 5.000.000"),
            agamaAyah: String(row["Agama Ayah"] || row["agamaAyah"] || "Islam"),
            kewarganegaraanAyah: "Indonesia",

            namaIbu: String(row["Nama Ibu"] || row["namaIbu"] || ""),
            tanggalLahirIbu: String(row["Tgl Lahir Ibu"] || row["tanggalLahirIbu"] || ""),
            nikIbu: String(row["NIK Ibu"] || row["nikIbu"] || ""),
            pendidikanIbu: String(row["Pendidikan Ibu"] || row["pendidikanIbu"] || "SMA"),
            pekerjaanIbu: String(row["Pekerjaan Ibu"] || row["pekerjaanIbu"] || "Ibu Rumah Tangga"),
            penghasilanIbu: String(row["Penghasilan Ibu"] || row["penghasilanIbu"] || "-"),
            agamaIbu: String(row["Agama Ibu"] || row["agamaIbu"] || "Islam"),
            kewarganegaraanIbu: "Indonesia",

            alamatOrangTua: String(row["Alamat Orang Tua"] || row["alamatOrangTua"] || row["Alamat"] || ""),

            namaWali: String(row["Nama Wali"] || row["namaWali"] || ""),
            hubunganKeluargaWali: String(row["Hubungan Wali"] || row["hubunganKeluargaWali"] || ""),
            pendidikanWali: "",
            pekerjaanWali: String(row["Pekerjaan Wali"] || row["pekerjaanWali"] || ""),
            alamatWali: ""
          },

          pendidikan: {
            asalSiswa: String(row["Asal Siswa"] || row["asalSiswa"] || "Siswa Baru / Dari TK"),
            masukDiKelas: String(row["Masuk di Kelas"] || row["masukDiKelas"] || kelas),
            asalSekolahTkPaud: String(row["Asal Sekolah TK/PAUD"] || row["asalSekolahTkPaud"] || "TK / PAUD"),
            diterimaTanggal: String(row["Diterima Tanggal"] || row["diterimaTanggal"] || new Date().toISOString().split("T")[0]),
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
            tinggiBadan: String(row["Tinggi Badan (cm)"] || row["tinggiBadan"] || "120"),
            beratBadan: String(row["Berat Badan (kg)"] || row["beratBadan"] || "22"),
            lingkarKepala: String(row["Lingkar Kepala (cm)"] || row["lingkarKepala"] || "50"),
            pendengaran: String(row["Pendengaran"] || row["pendengaran"] || "Baik"),
            penglihatan: String(row["Penglihatan"] || row["penglihatan"] || "Baik"),
            gigi: String(row["Gigi"] || row["gigi"] || "Baik"),
            lainLain: String(row["Catatan Kesehatan"] || row["lainLain"] || "Sehat Walafiat")
          },

          raport: {
            semester: "Ganjil",
            tahunPelajaran: "2025/2026",
            nilaiPengetahuan: defaultNilaiMapel,
            nilaiEkstrakurikuler: [
              { id: "esk_1", namaEskul: "Pramuka", keteranganPredikat: "A / Sangat Baik" }
            ],
            nilaiPrestasi: [],
            sakit: 0,
            izin: 0,
            alpa: 0,
            statusKenaikan: "Belum Ditentukan",
            keKelas: kelas,
            tanggalKenaikan: new Date().toISOString().split("T")[0]
          },
          updatedAt: Date.now()
        };

        await saveDocument(COLLECTIONS.BUKU_INDUK, record.id, record);
        successCount++;
      }

      alert(`Berhasil mengimpor ${successCount} data Buku Induk Siswa dari Excel!`);
      setShowImportModal(false);
    } catch (err) {
      console.error(err);
      alert("Gagal mengimpor data dari Excel: " + err);
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  // Validate completeness of data before printing
  const validateDataBeforePrint = (): IncompleteItem[] => {
    const missing: IncompleteItem[] = [];

    if (!formData) {
      missing.push({
        section: "Data Utama",
        field: "Register Buku Induk",
        description: "Data Buku Induk belum dibuat / belum dimuat untuk siswa ini."
      });
      return missing;
    }

    // 1. Keterangan Peserta Didik
    if (!formData.nis || formData.nis.trim() === "" || formData.nis === "-") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "NIS", description: "Nomor Induk Siswa (NIS) belum diisi" });
    }
    if (!formData.nisn || formData.nisn.trim() === "" || formData.nisn === "-") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "NISN", description: "Nomor Induk Siswa Nasional (NISN) belum diisi" });
    }
    if (!formData.pesertaDidik?.namaLengkap || formData.pesertaDidik.namaLengkap.trim() === "") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "Nama Lengkap", description: "Nama lengkap siswa belum diisi" });
    }
    if (!formData.pesertaDidik?.tempatLahir || formData.pesertaDidik.tempatLahir.trim() === "") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "Tempat Lahir", description: "Tempat lahir siswa belum diisi" });
    }
    if (!formData.pesertaDidik?.tanggalLahir || formData.pesertaDidik.tanggalLahir.trim() === "") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "Tanggal Lahir", description: "Tanggal lahir siswa belum diisi" });
    }
    if (!formData.pesertaDidik?.nik || formData.pesertaDidik.nik.trim() === "") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "NIK Siswa", description: "NIK KTP / Kartu Keluarga siswa belum diisi" });
    }
    if (!formData.pesertaDidik?.alamat || formData.pesertaDidik.alamat.trim() === "") {
      missing.push({ section: "A. Keterangan Peserta Didik", field: "Alamat Siswa", description: "Alamat lengkap tempat tinggal siswa belum diisi" });
    }

    // 2. Keterangan Orang Tua / Wali
    const hasAyah = Boolean(formData.orangTuaWali?.namaAyah && formData.orangTuaWali.namaAyah.trim() !== "");
    const hasIbu = Boolean(formData.orangTuaWali?.namaIbu && formData.orangTuaWali.namaIbu.trim() !== "");
    const hasWali = Boolean(formData.orangTuaWali?.namaWali && formData.orangTuaWali.namaWali.trim() !== "");

    if (!hasAyah && !hasWali) {
      missing.push({ section: "B. Orang Tua / Wali", field: "Nama Ayah / Wali", description: "Nama Ayah Kandung atau Wali murid belum diisi" });
    }
    if (!hasIbu && !hasWali) {
      missing.push({ section: "B. Orang Tua / Wali", field: "Nama Ibu / Wali", description: "Nama Ibu Kandung atau Wali murid belum diisi" });
    }
    if (hasAyah && (!formData.orangTuaWali?.nikAyah || formData.orangTuaWali.nikAyah.trim() === "")) {
      missing.push({ section: "B. Orang Tua / Wali", field: "NIK Ayah", description: "NIK Ayah Kandung belum diisi" });
    }
    if (hasIbu && (!formData.orangTuaWali?.nikIbu || formData.orangTuaWali.nikIbu.trim() === "")) {
      missing.push({ section: "B. Orang Tua / Wali", field: "NIK Ibu", description: "NIK Ibu Kandung belum diisi" });
    }

    // 3. Keterangan Pendidikan
    if (!formData.pendidikan?.masukDiKelas || formData.pendidikan.masukDiKelas.trim() === "") {
      missing.push({ section: "C. Keterangan Pendidikan", field: "Masuk di Kelas", description: "Tingkat kelas saat masuk sekolah belum diisi" });
    }
    if (!formData.pendidikan?.diterimaTanggal || formData.pendidikan.diterimaTanggal.trim() === "") {
      missing.push({ section: "C. Keterangan Pendidikan", field: "Tanggal Diterima", description: "Tanggal diterima di sekolah belum diisi" });
    }

    // 4. Data Raport (jika mencetak Raport)
    if (activeTab === "raport") {
      if (!formData.raport?.semester || formData.raport.semester.trim() === "") {
        missing.push({ section: "D. Raport Siswa", field: "Semester", description: "Semester raport belum ditentukan" });
      }
      if (!formData.raport?.tahunPelajaran || formData.raport.tahunPelajaran.trim() === "") {
        missing.push({ section: "D. Raport Siswa", field: "Tahun Pelajaran", description: "Tahun pelajaran belum diisi" });
      }

      const mapelTanpaNilai = (formData.raport?.nilaiPengetahuan || []).filter(
        (m) => m.nilai === "" || m.nilai === null || m.nilai === undefined
      );
      if (mapelTanpaNilai.length > 0) {
        missing.push({
          section: "D. Raport Siswa",
          field: "Nilai Mata Pelajaran",
          description: `${mapelTanpaNilai.length} mata pelajaran belum diisi nilainya (${mapelTanpaNilai.slice(0, 3).map((m) => m.namaMapel).join(", ")})`
        });
      }
    }

    return missing;
  };

  // Print Document with pre-flight check
  const handlePrint = () => {
    if (!selectedSiswa || !formData) {
      alert("Silakan pilih siswa terlebih dahulu dari daftar di sebelah kiri untuk mencetak Buku Induk atau Raport.");
      return;
    }

    const missing = validateDataBeforePrint();
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  const handleForcePrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Printable CSS Setup */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-buku-induk, #printable-buku-induk * {
            visibility: visible;
          }
          #printable-buku-induk {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15px;
            color: #000;
            background: #fff;
            font-size: 11px;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* HEADER TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span>Buku Induk Register & Raport Siswa</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {selectedKelas}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lembar Buku Induk Register Peserta Didik dan Laporan Hasil Pencapaian Kompetensi (Raport SD)
            </p>
          </div>
        </div>

        {/* Global Class Filter, Excel Actions & Print Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Kelas:</span>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setSelectedSiswaId(null);
              }}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {isAdmin && <option value="Semua">Semua Kelas</option>}
              {allowedClasses.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Download Template Format Excel Buku Induk"
          >
            <Download className="w-4 h-4" />
            <span>Template Excel</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Import Data Buku Induk Siswa dari Excel"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          {selectedSiswa && (
            <>
              <button
                onClick={handleSaveBukuInduk}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Buku Induk</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* MAIN VIEW GRID: LEFT SISWA LIST & RIGHT BUKU INDUK / RAPORT DETAIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* LEFT COLUMN: STUDENT SELECTOR CARD */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>Pilih Siswa Kelas ({filteredSiswa.length})</span>
              </h2>
              {selectedSiswa && (
                <button
                  onClick={() => setSelectedSiswaId(null)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Lihat Semua
                </button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama / NISN / NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Student List */}
            <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
              {filteredSiswa.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Tidak ada siswa ditemukan di kelas ini.
                </div>
              ) : (
                filteredSiswa.map((siswa, idx) => {
                  const isSelected = selectedSiswaId === siswa.id;
                  const hasInduk = bukuIndukList.some((b) => b.idSiswa === siswa.id || b.nisn === siswa.nisn);

                  return (
                    <div
                      key={siswa.id}
                      onClick={() => setSelectedSiswaId(siswa.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-800 dark:text-white truncate">
                            {siswa.nama}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            NISN: {siswa.nisn} | {siswa.kelas}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        {hasInduk ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Terisi
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Baru
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN BUKU INDUK / RAPORT CONTENT AREA */}
        <div className="lg:col-span-8">
          {!selectedSiswa ? (
            /* OVERVIEW TABLE WHEN NO STUDENT IS SELECTED */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">
                    Daftar Register Buku Induk Siswa - {selectedKelas}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih nama siswa di sebelah kiri atau klik tombol "Edit Buku Induk" untuk mengisi/memperbarui data register.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-black border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-3 text-center w-10">No</th>
                      <th className="py-3 px-3 w-24">NIS</th>
                      <th className="py-3 px-3 w-28">NISN</th>
                      <th className="py-3 px-3">Nama Siswa</th>
                      <th className="py-3 px-3 w-20">Kelas</th>
                      <th className="py-3 px-3 text-center w-28">Buku Induk</th>
                      <th className="py-3 px-3 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {filteredSiswa.map((siswa, index) => {
                      const record = bukuIndukList.find((b) => b.idSiswa === siswa.id || b.nisn === siswa.nisn);
                      return (
                        <tr key={siswa.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {record?.nis || siswa.nis || "-"}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{siswa.nisn}</td>
                          <td className="py-3 px-3 font-extrabold text-slate-800 dark:text-white">
                            {siswa.nama}
                          </td>
                          <td className="py-3 px-3 font-bold">{siswa.kelas}</td>
                          <td className="py-3 px-3 text-center">
                            {record ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Lengkap</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500">
                                <span>Belum Diisi</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedSiswaId(siswa.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition-all cursor-pointer shadow-xs"
                            >
                              Buka Buku Induk
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ACTIVE FORM & DETAILS FOR SELECTED STUDENT */
            <div className="space-y-6">
              {/* SUB-TAB TOGGLE (LEMBAR BUKU INDUK VS RAPORT) */}
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab("buku_induk")}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
                      activeTab === "buku_induk"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <BookMarked className="w-4 h-4" />
                    <span>Lembar Buku Induk Register</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("raport")}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
                      activeTab === "raport"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Raport Siswa (Laporan Hasil)</span>
                  </button>
                </div>

                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 pr-3">
                  Siswa: <span className="text-slate-800 dark:text-white font-black">{selectedSiswa.nama}</span>
                </div>
              </div>

              {formData && (
                <>
                  {/* TAB 1: LEMBAR BUKU INDUK REGISTER FORM */}
                  {activeTab === "buku_induk" && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            Lembar Buku Induk Register
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Pencatatan data lengkap siswa, orang tua/wali, riwayat pendidikan, dan kesehatan
                          </p>
                        </div>
                        <div className="flex items-center space-x-3 bg-indigo-50 dark:bg-indigo-950/60 p-2.5 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">NIS:</span>
                            <input
                              type="text"
                              value={formData.nis}
                              onChange={(e) => updateNestedField(["nis"], e.target.value)}
                              className="w-24 ml-1 px-2 py-0.5 border rounded-lg bg-white dark:bg-slate-900 border-indigo-300 font-mono font-black text-xs text-indigo-700 dark:text-indigo-300"
                              placeholder="NIS"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">NISN:</span>
                            <input
                              type="text"
                              value={formData.nisn}
                              onChange={(e) => updateNestedField(["nisn"], e.target.value)}
                              className="w-28 ml-1 px-2 py-0.5 border rounded-lg bg-white dark:bg-slate-900 border-indigo-300 font-mono font-black text-xs text-indigo-700 dark:text-indigo-300"
                              placeholder="NISN"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION A: KETERANGAN PESERTA DIDIK */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase border-b border-indigo-100 dark:border-indigo-950 pb-2">
                          <UserIcon className="w-4 h-4" />
                          <span>A. Keterangan Peserta Didik</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              1. Nama Siswa (Lengkap & Panggilan)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={formData.pesertaDidik.namaLengkap}
                                onChange={(e) => updateNestedField(["pesertaDidik", "namaLengkap"], e.target.value)}
                                placeholder="Nama Lengkap"
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold"
                              />
                              <input
                                type="text"
                                value={formData.pesertaDidik.namaPanggilan}
                                onChange={(e) => updateNestedField(["pesertaDidik", "namaPanggilan"], e.target.value)}
                                placeholder="Nama Panggilan"
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              2. Jenis Kelamin
                            </label>
                            <select
                              value={formData.pesertaDidik.jenisKelamin}
                              onChange={(e) => updateNestedField(["pesertaDidik", "jenisKelamin"], e.target.value)}
                              className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                            >
                              <option value="L">Laki-Laki (L)</option>
                              <option value="P">Perempuan (P)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              3. Kelahiran (Tempat & Tanggal Lahir)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={formData.pesertaDidik.tempatLahir}
                                onChange={(e) => updateNestedField(["pesertaDidik", "tempatLahir"], e.target.value)}
                                placeholder="Tempat Lahir"
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                              />
                              <input
                                type="date"
                                value={formData.pesertaDidik.tanggalLahir}
                                onChange={(e) => updateNestedField(["pesertaDidik", "tanggalLahir"], e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-semibold"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              4. NIK Siswa
                            </label>
                            <input
                              type="text"
                              value={formData.pesertaDidik.nik}
                              onChange={(e) => updateNestedField(["pesertaDidik", "nik"], e.target.value)}
                              placeholder="Nomor Induk Kependudukan (16 Digit)"
                              className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              5. Kewarganegaraan & Golongan Darah
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={formData.pesertaDidik.kewarganegaraan}
                                onChange={(e) => updateNestedField(["pesertaDidik", "kewarganegaraan"], e.target.value)}
                                placeholder="Indonesia"
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                              />
                              <select
                                value={formData.pesertaDidik.golonganDarah}
                                onChange={(e) => updateNestedField(["pesertaDidik", "golonganDarah"], e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="AB">AB</option>
                                <option value="O">O</option>
                                <option value="-">-</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              6. Anak Ke- & Jumlah Saudara (Kandung, Tiri, Angkat)
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                              <input
                                type="text"
                                value={formData.pesertaDidik.anakKe}
                                onChange={(e) => updateNestedField(["pesertaDidik", "anakKe"], e.target.value)}
                                placeholder="Anak Ke"
                                title="Anak Ke"
                                className="w-full px-2 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-center font-bold"
                              />
                              <input
                                type="text"
                                value={formData.pesertaDidik.jumlahSaudaraKandung}
                                onChange={(e) => updateNestedField(["pesertaDidik", "jumlahSaudaraKandung"], e.target.value)}
                                placeholder="Kandung"
                                title="Saudara Kandung"
                                className="w-full px-2 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-center font-medium"
                              />
                              <input
                                type="text"
                                value={formData.pesertaDidik.jumlahSaudaraTiri}
                                onChange={(e) => updateNestedField(["pesertaDidik", "jumlahSaudaraTiri"], e.target.value)}
                                placeholder="Tiri"
                                title="Saudara Tiri"
                                className="w-full px-2 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-center font-medium"
                              />
                              <input
                                type="text"
                                value={formData.pesertaDidik.jumlahSaudaraAngkat}
                                onChange={(e) => updateNestedField(["pesertaDidik", "jumlahSaudaraAngkat"], e.target.value)}
                                placeholder="Angkat"
                                title="Saudara Angkat"
                                className="w-full px-2 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-center font-medium"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              7. Bahasa Sehari-hari & Jarak Rumah ke Sekolah
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={formData.pesertaDidik.bahasaSehariHari}
                                onChange={(e) => updateNestedField(["pesertaDidik", "bahasaSehariHari"], e.target.value)}
                                placeholder="Bahasa Sehari-hari"
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                              />
                              <input
                                type="text"
                                value={formData.pesertaDidik.jarakKeSekolah}
                                onChange={(e) => updateNestedField(["pesertaDidik", "jarakKeSekolah"], e.target.value)}
                                placeholder="Jarak (misal: 1 km)"
                                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              8. Tempat Tinggal & Alamat Siswa
                            </label>
                            <input
                              type="text"
                              value={formData.pesertaDidik.tempatTinggal}
                              onChange={(e) => updateNestedField(["pesertaDidik", "tempatTinggal"], e.target.value)}
                              placeholder="Misal: Bersama Orang Tua / Kost / Asrama"
                              className="w-full px-3 py-2 mb-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                            />
                            <textarea
                              value={formData.pesertaDidik.alamat}
                              onChange={(e) => updateNestedField(["pesertaDidik", "alamat"], e.target.value)}
                              placeholder="Alamat Lengkap Siswa..."
                              rows={2}
                              className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION B: KETERANGAN ORANG TUA / WALI MURID */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase border-b border-indigo-100 dark:border-indigo-950 pb-2">
                          <Users className="w-4 h-4" />
                          <span>B. Keterangan Orang Tua / Wali Murid</span>
                        </div>

                        {/* DATA AYAH & IBU GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          {/* AYAH */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <h3 className="font-extrabold text-indigo-700 dark:text-indigo-300 uppercase">
                              1. Data Ayah Kandung
                            </h3>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Ayah</label>
                              <input
                                type="text"
                                value={formData.orangTuaWali.namaAyah}
                                onChange={(e) => updateNestedField(["orangTuaWali", "namaAyah"], e.target.value)}
                                placeholder="Nama Lengkap Ayah"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tgl Lahir Ayah</label>
                                <input
                                  type="date"
                                  value={formData.orangTuaWali.tanggalLahirAyah}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "tanggalLahirAyah"], e.target.value)}
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NIK Ayah</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.nikAyah}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "nikAyah"], e.target.value)}
                                  placeholder="NIK Ayah"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-mono"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pendidikan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.pendidikanAyah}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "pendidikanAyah"], e.target.value)}
                                  placeholder="Pendidikan Ayah"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.pekerjaanAyah}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "pekerjaanAyah"], e.target.value)}
                                  placeholder="Pekerjaan Ayah"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Penghasilan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.penghasilanAyah}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "penghasilanAyah"], e.target.value)}
                                  placeholder="Penghasilan Ayah"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agama & Kewarganegaraan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.agamaAyah}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "agamaAyah"], e.target.value)}
                                  placeholder="Agama Ayah"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          {/* IBU */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                            <h3 className="font-extrabold text-indigo-700 dark:text-indigo-300 uppercase">
                              2. Data Ibu Kandung
                            </h3>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Ibu</label>
                              <input
                                type="text"
                                value={formData.orangTuaWali.namaIbu}
                                onChange={(e) => updateNestedField(["orangTuaWali", "namaIbu"], e.target.value)}
                                placeholder="Nama Lengkap Ibu"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tgl Lahir Ibu</label>
                                <input
                                  type="date"
                                  value={formData.orangTuaWali.tanggalLahirIbu}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "tanggalLahirIbu"], e.target.value)}
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">NIK Ibu</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.nikIbu}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "nikIbu"], e.target.value)}
                                  placeholder="NIK Ibu"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-mono"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pendidikan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.pendidikanIbu}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "pendidikanIbu"], e.target.value)}
                                  placeholder="Pendidikan Ibu"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pekerjaan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.pekerjaanIbu}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "pekerjaanIbu"], e.target.value)}
                                  placeholder="Pekerjaan Ibu"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Penghasilan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.penghasilanIbu}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "penghasilanIbu"], e.target.value)}
                                  placeholder="Penghasilan Ibu"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Agama & Kewarganegaraan</label>
                                <input
                                  type="text"
                                  value={formData.orangTuaWali.agamaIbu}
                                  onChange={(e) => updateNestedField(["orangTuaWali", "agamaIbu"], e.target.value)}
                                  placeholder="Agama Ibu"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* WALI MURID */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                          <h3 className="font-extrabold text-indigo-700 dark:text-indigo-300 uppercase">
                            3. Wali Murid (Jika Ikut Wali)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Wali</label>
                              <input
                                type="text"
                                value={formData.orangTuaWali.namaWali || ""}
                                onChange={(e) => updateNestedField(["orangTuaWali", "namaWali"], e.target.value)}
                                placeholder="Nama Wali Murid"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hubungan Keluarga</label>
                              <input
                                type="text"
                                value={formData.orangTuaWali.hubunganKeluargaWali || ""}
                                onChange={(e) => updateNestedField(["orangTuaWali", "hubunganKeluargaWali"], e.target.value)}
                                placeholder="Paman / Kakek..."
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pendidikan & Pekerjaan</label>
                              <input
                                type="text"
                                value={formData.orangTuaWali.pekerjaanWali || ""}
                                onChange={(e) => updateNestedField(["orangTuaWali", "pekerjaanWali"], e.target.value)}
                                placeholder="Pekerjaan Wali"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alamat Wali</label>
                              <input
                                type="text"
                                value={formData.orangTuaWali.alamatWali || ""}
                                onChange={(e) => updateNestedField(["orangTuaWali", "alamatWali"], e.target.value)}
                                placeholder="Alamat Wali"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION C: KETERANGAN PENDIDIKAN */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase border-b border-indigo-100 dark:border-indigo-950 pb-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>C. Keterangan Pendidikan</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* 1. Pendidikan Sebelumnya */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h3 className="font-extrabold text-indigo-700 dark:text-indigo-300 uppercase">
                              1. Pendidikan Sebelumnya (Siswa Baru)
                            </h3>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">a. Asal Siswa</label>
                              <input
                                type="text"
                                value={formData.pendidikan.asalSiswa}
                                onChange={(e) => updateNestedField(["pendidikan", "asalSiswa"], e.target.value)}
                                placeholder="TK / PAUD / Rumah Tangga"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">b. Masuk di Kelas</label>
                                <input
                                  type="text"
                                  value={formData.pendidikan.masukDiKelas}
                                  onChange={(e) => updateNestedField(["pendidikan", "masukDiKelas"], e.target.value)}
                                  placeholder="Kelas 1"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">d. Diterima Tanggal</label>
                                <input
                                  type="date"
                                  value={formData.pendidikan.diterimaTanggal}
                                  onChange={(e) => updateNestedField(["pendidikan", "diterimaTanggal"], e.target.value)}
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-semibold"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">c. Asal Sekolah TK/PAUD</label>
                              <input
                                type="text"
                                value={formData.pendidikan.asalSekolahTkPaud}
                                onChange={(e) => updateNestedField(["pendidikan", "asalSekolahTkPaud"], e.target.value)}
                                placeholder="Nama TK/PAUD"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                          </div>

                          {/* 2. Pindahan Dari */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h3 className="font-extrabold text-indigo-700 dark:text-indigo-300 uppercase">
                              2. Pindahan Dari (Jika Siswa Pindahan)
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">a. Masuk di Kelas</label>
                                <input
                                  type="text"
                                  value={formData.pendidikan.pindahanMasukDiKelas || ""}
                                  onChange={(e) => updateNestedField(["pendidikan", "pindahanMasukDiKelas"], e.target.value)}
                                  placeholder="Misal: Kelas 3"
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">c. Diterima Tanggal</label>
                                <input
                                  type="date"
                                  value={formData.pendidikan.pindahanDiterimaTanggal || ""}
                                  onChange={(e) => updateNestedField(["pendidikan", "pindahanDiterimaTanggal"], e.target.value)}
                                  className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-semibold"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">b. Asal Sekolah Asal</label>
                              <input
                                type="text"
                                value={formData.pendidikan.pindahanAsalSekolah || ""}
                                onChange={(e) => updateNestedField(["pendidikan", "pindahanAsalSekolah"], e.target.value)}
                                placeholder="Nama SD Asal Pindahan"
                                className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION D: MENINGGALKAN SEKOLAH */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase border-b border-indigo-100 dark:border-indigo-950 pb-2">
                          <Building2 className="w-4 h-4" />
                          <span>D. Meninggalkan Sekolah (Lulus / Pindah / Keluar)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          {/* 1. Tamat Belajar / Lulus */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h3 className="font-extrabold text-slate-800 dark:text-white uppercase">1. Tamat / Lulus</h3>
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.tahunLulus || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "tahunLulus"], e.target.value)}
                              placeholder="Tahun Lulus (misal: 2026)"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-medium"
                            />
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.noIjazah || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "noIjazah"], e.target.value)}
                              placeholder="No. Ijazah / STTB"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-mono"
                            />
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.melanjutkanKe || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "melanjutkanKe"], e.target.value)}
                              placeholder="Melanjutkan ke (SMP/MTs)"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-medium"
                            />
                          </div>

                          {/* 2. Pindah Sekolah */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h3 className="font-extrabold text-slate-800 dark:text-white uppercase">2. Pindah Sekolah</h3>
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.pindahKelas || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "pindahKelas"], e.target.value)}
                              placeholder="Dari Kelas"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-medium"
                            />
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.pindahKeSekolah || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "pindahKeSekolah"], e.target.value)}
                              placeholder="Ke Sekolah Tujuan"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-medium"
                            />
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.pindahTingkat || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "pindahTingkat"], e.target.value)}
                              placeholder="Tingkat / Alasan"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-medium"
                            />
                          </div>

                          {/* 3. Keluar Sekolah */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h3 className="font-extrabold text-slate-800 dark:text-white uppercase">3. Keluar Sekolah</h3>
                            <input
                              type="text"
                              value={formData.meninggalkanSekolah.keluarAlasan || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "keluarAlasan"], e.target.value)}
                              placeholder="Alasan Keluar"
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-medium"
                            />
                            <input
                              type="date"
                              value={formData.meninggalkanSekolah.keluarTanggal || ""}
                              onChange={(e) => updateNestedField(["meninggalkanSekolah", "keluarTanggal"], e.target.value)}
                              className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION E: LAIN-LAIN (PERKEMBANGAN FISIK & KESEHATAN) */}
                      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase border-b border-indigo-100 dark:border-indigo-950 pb-2">
                          <Activity className="w-4 h-4" />
                          <span>E. Lain-lain (Perkembangan Fisik & Kesehatan)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          {/* 1. Tinggi dan Berat Badan Tabel */}
                          <div className="space-y-2">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">
                              1. Fisik Siswa (Tinggi, Berat, Lingkar Kepala)
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Tinggi Badan (cm)</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.tinggiBadan}
                                  onChange={(e) => updateNestedField(["kesehatan", "tinggiBadan"], e.target.value)}
                                  placeholder="120 cm"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Berat Badan (kg)</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.beratBadan}
                                  onChange={(e) => updateNestedField(["kesehatan", "beratBadan"], e.target.value)}
                                  placeholder="22 kg"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Lingkar Kepala (cm)</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.lingkarKepala}
                                  onChange={(e) => updateNestedField(["kesehatan", "lingkarKepala"], e.target.value)}
                                  placeholder="50 cm"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-center"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 2. Kondisi Kesehatan Tabel */}
                          <div className="space-y-2">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">
                              2. Kondisi Kesehatan (Pendengaran, Penglihatan, Gigi, dll)
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Pendengaran</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.pendengaran}
                                  onChange={(e) => updateNestedField(["kesehatan", "pendengaran"], e.target.value)}
                                  placeholder="Baik / Normal"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Penglihatan</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.penglihatan}
                                  onChange={(e) => updateNestedField(["kesehatan", "penglihatan"], e.target.value)}
                                  placeholder="Baik / Normal"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Gigi</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.gigi}
                                  onChange={(e) => updateNestedField(["kesehatan", "gigi"], e.target.value)}
                                  placeholder="Baik / Rapi"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Lain-lain</label>
                                <input
                                  type="text"
                                  value={formData.kesehatan.lainLain}
                                  onChange={(e) => updateNestedField(["kesehatan", "lainLain"], e.target.value)}
                                  placeholder="Sehat Walafiat"
                                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Save & Print Button Footer */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                        <button
                          onClick={handlePrint}
                          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Cetak Lembar Buku Induk</span>
                        </button>
                        <button
                          onClick={handleSaveBukuInduk}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 shadow-lg cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Semua Data Buku Induk</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: RAPORT SISWA FORM & PREVIEW */}
                  {activeTab === "raport" && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h2 className="text-base font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">
                            “Laporan Hasil Pencapaian Kompetensi Peserta Didik SD”
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Lembar Raport Hasil Belajar Siswa Terintegrasi Nilai Pengetahuan, Ekstrakurikuler, Prestasi & Presensi
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <select
                            value={formData.raport.semester}
                            onChange={(e) => updateNestedField(["raport", "semester"], e.target.value)}
                            className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-white cursor-pointer"
                          >
                            <option value="Ganjil">Semester Ganjil</option>
                            <option value="Genap">Semester Genap</option>
                          </select>
                          <input
                            type="text"
                            value={formData.raport.tahunPelajaran}
                            onChange={(e) => updateNestedField(["raport", "tahunPelajaran"], e.target.value)}
                            placeholder="2025/2026"
                            className="w-24 px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* HEADER SISWA SUMMARY */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Nama Siswa</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">{formData.pesertaDidik.namaLengkap}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">No. Induk (NIS) / NISN</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {formData.nis} / {formData.nisn}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Kelas & Semester</span>
                          <span className="font-bold text-slate-800 dark:text-white">{formData.kelas} | {formData.raport.semester}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Tahun Pelajaran</span>
                          <span className="font-bold text-slate-800 dark:text-white">{formData.raport.tahunPelajaran}</span>
                        </div>
                      </div>

                      {/* SECTION A: NILAI PENGETAHUAN MAPEL */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="font-extrabold text-xs uppercase text-slate-800 dark:text-white flex items-center space-x-2">
                            <span>A. Nilai Pengetahuan (Mata Pelajaran)</span>
                          </h3>
                          <button
                            onClick={handleAddMapelRaport}
                            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Mapel Raport</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                                <th className="py-2.5 px-3 text-center w-10">No</th>
                                <th className="py-2.5 px-3 w-48">Mata Pelajaran</th>
                                <th className="py-2.5 px-3 text-center w-20">KKTP</th>
                                <th className="py-2.5 px-3 text-center w-20">Nilai</th>
                                <th className="py-2.5 px-3 text-center w-20">Predikat</th>
                                <th className="py-2.5 px-3">Deskripsi Capaian Kompetensi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                              {(formData.raport.nilaiPengetahuan || []).map((m, idx) => (
                                <tr key={m.idMapel || idx}>
                                  <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">
                                    <input
                                      type="text"
                                      value={m.namaMapel}
                                      onChange={(e) => {
                                        const updated = [...formData.raport.nilaiPengetahuan];
                                        updated[idx].namaMapel = e.target.value;
                                        updateNestedField(["raport", "nilaiPengetahuan"], updated);
                                      }}
                                      className="w-full px-2 py-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                    <input
                                      type="number"
                                      value={m.kktp ?? 75}
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? "" : Number(e.target.value);
                                        const updated = [...formData.raport.nilaiPengetahuan];
                                        updated[idx].kktp = val;
                                        updateNestedField(["raport", "nilaiPengetahuan"], updated);
                                      }}
                                      className="w-16 px-1 py-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center font-bold"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-black text-indigo-600 dark:text-indigo-400">
                                    <input
                                      type="number"
                                      value={m.nilai}
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? "" : Number(e.target.value);
                                        const updated = [...formData.raport.nilaiPengetahuan];
                                        updated[idx].nilai = val;
                                        // Auto update predikat based on KKTP
                                        const num = Number(val);
                                        const targetKktp = Number(m.kktp ?? 75);
                                        if (num >= 90) updated[idx].predikat = "A";
                                        else if (num >= 80) updated[idx].predikat = "B";
                                        else if (num >= targetKktp) updated[idx].predikat = "C";
                                        else if (num > 0) updated[idx].predikat = "D";
                                        updateNestedField(["raport", "nilaiPengetahuan"], updated);
                                      }}
                                      className="w-16 px-1 py-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center font-black"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-black">
                                    <input
                                      type="text"
                                      value={m.predikat}
                                      onChange={(e) => {
                                        const updated = [...formData.raport.nilaiPengetahuan];
                                        updated[idx].predikat = e.target.value;
                                        updateNestedField(["raport", "nilaiPengetahuan"], updated);
                                      }}
                                      className="w-12 px-1 py-1 border rounded-lg bg-slate-50 dark:bg-slate-800 text-center font-black uppercase"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <textarea
                                      value={m.deskripsi}
                                      onChange={(e) => {
                                        const updated = [...formData.raport.nilaiPengetahuan];
                                        updated[idx].deskripsi = e.target.value;
                                        updateNestedField(["raport", "nilaiPengetahuan"], updated);
                                      }}
                                      rows={1}
                                      className="w-full px-2 py-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 text-xs font-medium"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SECTION B: NILAI EKSTRAKURIKULER */}
                      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="font-extrabold text-xs uppercase text-slate-800 dark:text-white">
                            B. Nilai Ekstrakurikuler
                          </h3>
                          <button
                            onClick={handleAddEskul}
                            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 font-bold text-[11px] rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Eskul</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(formData.raport.nilaiEkstrakurikuler || []).map((eskul, idx) => (
                            <div key={eskul.id} className="flex items-center space-x-2 text-xs">
                              <span className="font-bold text-slate-400 w-6 text-center">{idx + 1}.</span>
                              <input
                                type="text"
                                value={eskul.namaEskul}
                                onChange={(e) => {
                                  const updated = [...formData.raport.nilaiEkstrakurikuler];
                                  updated[idx].namaEskul = e.target.value;
                                  updateNestedField(["raport", "nilaiEkstrakurikuler"], updated);
                                }}
                                placeholder="Nama Eskul (Pramuka, Dokter Kecil, dll)"
                                className="w-1/3 px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold"
                              />
                              <input
                                type="text"
                                value={eskul.keteranganPredikat}
                                onChange={(e) => {
                                  const updated = [...formData.raport.nilaiEkstrakurikuler];
                                  updated[idx].keteranganPredikat = e.target.value;
                                  updateNestedField(["raport", "nilaiEkstrakurikuler"], updated);
                                }}
                                placeholder="A / Sangat Baik / B / Baik"
                                className="flex-1 px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                              />
                              <button
                                onClick={() => handleRemoveEskul(eskul.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SECTION C: PRESTASI */}
                      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <h3 className="font-extrabold text-xs uppercase text-slate-800 dark:text-white">
                            C. Prestasi Siswa
                          </h3>
                          <button
                            onClick={handleAddPrestasi}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 font-bold text-[11px] rounded-lg border border-amber-200 dark:border-amber-800 flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Prestasi</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(formData.raport.nilaiPrestasi || []).map((prs, idx) => (
                            <div key={prs.id} className="flex items-center space-x-2 text-xs">
                              <span className="font-bold text-slate-400 w-6 text-center">{idx + 1}.</span>
                              <input
                                type="text"
                                value={prs.jenisPrestasi}
                                onChange={(e) => {
                                  const updated = [...formData.raport.nilaiPrestasi];
                                  updated[idx].jenisPrestasi = e.target.value;
                                  updateNestedField(["raport", "nilaiPrestasi"], updated);
                                }}
                                placeholder="Jenis Prestasi (Lomba Mewarnai, Sains, dll)"
                                className="w-1/3 px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 font-bold"
                              />
                              <input
                                type="text"
                                value={prs.keterangan}
                                onChange={(e) => {
                                  const updated = [...formData.raport.nilaiPrestasi];
                                  updated[idx].keterangan = e.target.value;
                                  updateNestedField(["raport", "nilaiPrestasi"], updated);
                                }}
                                placeholder="Tingkat Sekolah / Kecamatan / Kabupaten"
                                className="flex-1 px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-800 font-medium"
                              />
                              <button
                                onClick={() => handleRemovePrestasi(prs.id)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SECTION D: KETIDAKHADIRAN DAN KENAIKAN KELAS */}
                      <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="font-extrabold text-xs uppercase text-slate-800 dark:text-white">
                          D. Ketidakhadiran & Keputusan Kenaikan Kelas
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          {/* Ketidakhadiran */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Ketidakhadiran (Hari)</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">Sakit</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.raport.sakit}
                                  onChange={(e) => updateNestedField(["raport", "sakit"], e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">Izin</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.raport.izin}
                                  onChange={(e) => updateNestedField(["raport", "izin"], e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold text-center"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">Tanpa Keterangan</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.raport.alpa}
                                  onChange={(e) => updateNestedField(["raport", "alpa"], e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold text-center"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Kenaikan Kelas */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">Kenaikan / Kelulusan Kelas</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">Keputusan Kenaikan</label>
                                <select
                                  value={formData.raport.statusKenaikan}
                                  onChange={(e) => updateNestedField(["raport", "statusKenaikan"], e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold cursor-pointer"
                                >
                                  <option value="Naik Kelas">Naik Kelas</option>
                                  <option value="Tidak Naik Kelas">Tidak Naik Kelas</option>
                                  <option value="Lulus">Lulus</option>
                                  <option value="Belum Ditentukan">Belum Ditentukan</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">Ke Kelas / Lulus Ke</label>
                                <input
                                  type="text"
                                  value={formData.raport.keKelas}
                                  onChange={(e) => updateNestedField(["raport", "keKelas"], e.target.value)}
                                  placeholder="Kelas 2"
                                  className="w-full px-2 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-bold"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500">Tanggal Keputusan Raport</label>
                              <input
                                type="date"
                                value={formData.raport.tanggalKenaikan}
                                onChange={(e) => updateNestedField(["raport", "tanggalKenaikan"], e.target.value)}
                                className="w-full px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Save & Print Raport Button Footer */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                        <button
                          onClick={handlePrint}
                          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Cetak Raport Siswa</span>
                        </button>
                        <button
                          onClick={handleSaveBukuInduk}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 shadow-lg cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Simpan Data Raport Siswa</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PRINTABLE AREA CONTAINER (FOR BOTH BUKU INDUK REGISTER AND RAPORT) */}
      {formData && (
        <div id="printable-buku-induk" className="hidden print:block">
          {activeTab === "buku_induk" ? (
            /* PRINT PAGE: LEMBAR BUKU INDUK REGISTER */
            <div className="space-y-4 leading-tight">
              {/* Kop Surat Sekolah */}
              <div className="border-b-2 border-black pb-3 text-center">
                <h4 className="text-[10px] font-bold uppercase tracking-wider">{config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR"}</h4>
                <h2 className="text-base font-black uppercase">{config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}</h2>
                <p className="text-[9px]">{config.Alamat_Sekolah || "Jl. Raya Babakan No. 123"}</p>
                <div className="mt-2 pt-1 border-t border-black">
                  <h1 className="text-sm font-black uppercase">LEMBAR BUKU INDUK REGISTER PESERTA DIDIK</h1>
                  <p className="text-[10px] font-bold">
                    NIS: {formData.nis} | NISN: {formData.nisn} | Kelas: {formData.kelas}
                  </p>
                </div>
              </div>

              {/* A. Keterangan Peserta Didik */}
              <div>
                <h3 className="font-bold underline text-xs mb-1">A. KETERANGAN PESERTA DIDIK</h3>
                <table className="w-full text-left text-[10px] border-collapse">
                  <tbody>
                    <tr><td className="w-48 py-0.5">1. Nama Siswa (Lengkap / Panggilan)</td><td>: {formData.pesertaDidik.namaLengkap} ({formData.pesertaDidik.namaPanggilan})</td></tr>
                    <tr><td className="py-0.5">2. Jenis Kelamin</td><td>: {formData.pesertaDidik.jenisKelamin === "L" ? "Laki-Laki" : "Perempuan"}</td></tr>
                    <tr><td className="py-0.5">3. Kelahiran (Tempat, Tanggal Lahir)</td><td>: {formData.pesertaDidik.tempatLahir}, {formData.pesertaDidik.tanggalLahir}</td></tr>
                    <tr><td className="py-0.5">4. NIK Siswa</td><td>: {formData.pesertaDidik.nik || "-"}</td></tr>
                    <tr><td className="py-0.5">5. Kewarganegaraan / Gol. Darah</td><td>: {formData.pesertaDidik.kewarganegaraan} / {formData.pesertaDidik.golonganDarah}</td></tr>
                    <tr><td className="py-0.5">6. Anak Ke- / Jumlah Saudara</td><td>: Anak ke-{formData.pesertaDidik.anakKe} (Kandung: {formData.pesertaDidik.jumlahSaudaraKandung}, Tiri: {formData.pesertaDidik.jumlahSaudaraTiri}, Angkat: {formData.pesertaDidik.jumlahSaudaraAngkat})</td></tr>
                    <tr><td className="py-0.5">7. Bahasa Sehari-hari</td><td>: {formData.pesertaDidik.bahasaSehariHari}</td></tr>
                    <tr><td className="py-0.5">8. Tempat Tinggal & Jarak Ke Sekolah</td><td>: {formData.pesertaDidik.tempatTinggal} ({formData.pesertaDidik.jarakKeSekolah})</td></tr>
                    <tr><td className="py-0.5">9. Alamat Lengkap Siswa</td><td>: {formData.pesertaDidik.alamat}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* B. Keterangan Orang Tua / Wali */}
              <div>
                <h3 className="font-bold underline text-xs mb-1">B. KETERANGAN ORANG TUA / WALI MURID</h3>
                <table className="w-full text-left text-[10px] border border-black border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black">
                      <th className="p-1 border-r border-black">Keterangan</th>
                      <th className="p-1 border-r border-black">Ayah Kandung</th>
                      <th className="p-1 border-r border-black">Ibu Kandung</th>
                      <th className="p-1">Wali Murid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-black"><td className="p-1 border-r border-black font-semibold">1. Nama Lengkap</td><td className="p-1 border-r border-black">{formData.orangTuaWali.namaAyah || "-"}</td><td className="p-1 border-r border-black">{formData.orangTuaWali.namaIbu || "-"}</td><td className="p-1">{formData.orangTuaWali.namaWali || "-"}</td></tr>
                    <tr className="border-b border-black"><td className="p-1 border-r border-black font-semibold">2. Tanggal Lahir & NIK</td><td className="p-1 border-r border-black">{formData.orangTuaWali.tanggalLahirAyah} ({formData.orangTuaWali.nikAyah})</td><td className="p-1 border-r border-black">{formData.orangTuaWali.tanggalLahirIbu} ({formData.orangTuaWali.nikIbu})</td><td className="p-1">{formData.orangTuaWali.hubunganKeluargaWali || "-"}</td></tr>
                    <tr className="border-b border-black"><td className="p-1 border-r border-black font-semibold">3. Pendidikan Terakhir</td><td className="p-1 border-r border-black">{formData.orangTuaWali.pendidikanAyah}</td><td className="p-1 border-r border-black">{formData.orangTuaWali.pendidikanIbu}</td><td className="p-1">{formData.orangTuaWali.pendidikanWali || "-"}</td></tr>
                    <tr className="border-b border-black"><td className="p-1 border-r border-black font-semibold">4. Pekerjaan & Penghasilan</td><td className="p-1 border-r border-black">{formData.orangTuaWali.pekerjaanAyah} ({formData.orangTuaWali.penghasilanAyah})</td><td className="p-1 border-r border-black">{formData.orangTuaWali.pekerjaanIbu} ({formData.orangTuaWali.penghasilanIbu})</td><td className="p-1">{formData.orangTuaWali.pekerjaanWali || "-"}</td></tr>
                    <tr><td className="p-1 border-r border-black font-semibold">5. Agama & Alamat</td><td className="p-1 border-r border-black">{formData.orangTuaWali.agamaAyah}</td><td className="p-1 border-r border-black">{formData.orangTuaWali.agamaIbu}</td><td className="p-1">{formData.orangTuaWali.alamatWali || formData.orangTuaWali.alamatOrangTua}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* C & D. Pendidikan & Meninggalkan Sekolah */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold underline text-xs mb-1">C. KETERANGAN PENDIDIKAN</h3>
                  <p>1. Masuk Sekolah: {formData.pendidikan.asalSiswa} di kelas {formData.pendidikan.masukDiKelas} (TK: {formData.pendidikan.asalSekolahTkPaud}) Diterima tgl {formData.pendidikan.diterimaTanggal}</p>
                  {formData.pendidikan.pindahanAsalSekolah && (
                    <p>2. Pindahan: Dari {formData.pendidikan.pindahanAsalSekolah} ke kelas {formData.pendidikan.pindahanMasukDiKelas} tgl {formData.pendidikan.pindahanDiterimaTanggal}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-bold underline text-xs mb-1">D. MENINGGALKAN SEKOLAH</h3>
                  <p>1. Tamat/Lulus: Tahun {formData.meninggalkanSekolah.tahunLulus || "-"}, No Ijazah: {formData.meninggalkanSekolah.noIjazah || "-"}</p>
                  <p>2. Pindah/Keluar: {formData.meninggalkanSekolah.pindahKeSekolah || formData.meninggalkanSekolah.keluarAlasan || "-"}</p>
                </div>
              </div>

              {/* E. Perkembangan Fisik & Kesehatan */}
              <div>
                <h3 className="font-bold underline text-xs mb-1">E. PERKEMBANGAN FISIK & KESEHATAN</h3>
                <p>
                  Tinggi Badan: {formData.kesehatan.tinggiBadan} cm | Berat Badan: {formData.kesehatan.beratBadan} kg | Lingkar Kepala: {formData.kesehatan.lingkarKepala} cm
                </p>
                <p>
                  Kondisi Kesehatan - Pendengaran: {formData.kesehatan.pendengaran} | Penglihatan: {formData.kesehatan.penglihatan} | Gigi: {formData.kesehatan.gigi} | Catatan: {formData.kesehatan.lainLain}
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-8 text-center text-xs">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-16"></div>
                  <p className="font-black underline">{config.Nama_Kepsek || "...................................."}</p>
                  <p>NIP. {config.NIP_Kepsek || "...................................."}</p>
                </div>
                <div>
                  <p>{config.Tempat_Tanda_Tangan || "Bogor"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                  <p className="font-bold">Guru Kelas / Wali Kelas</p>
                  <div className="h-16"></div>
                  <p className="font-black underline">{config.Nama_Guru || "...................................."}</p>
                  <p>NIP. {config.NIP_Guru || "...................................."}</p>
                </div>
              </div>
            </div>
          ) : (
            /* PRINT PAGE: RAPORT SISWA */
            <div className="space-y-4 leading-tight">
              {/* Kop Raport */}
              <div className="border-b-2 border-black pb-2 text-center">
                <h3 className="text-[10px] font-bold uppercase">{config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR"}</h3>
                <h2 className="text-sm font-black uppercase">{config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}</h2>
                <h1 className="text-base font-black uppercase mt-2">LAPORAN HASIL PENCAPAIAN KOMPETENSI PESERTA DIDIK SD</h1>
              </div>

              {/* Header Details */}
              <table className="w-full text-[10px] border-collapse font-semibold">
                <tbody>
                  <tr>
                    <td className="w-24">Nama Siswa</td><td>: {formData.pesertaDidik.namaLengkap}</td>
                    <td className="w-24">Kelas</td><td>: {formData.kelas}</td>
                  </tr>
                  <tr>
                    <td>No. Induk / NISN</td><td>: {formData.nis} / {formData.nisn}</td>
                    <td>Semester / TP</td><td>: {formData.raport.semester} / {formData.raport.tahunPelajaran}</td>
                  </tr>
                </tbody>
              </table>

              {/* A. Nilai Pengetahuan */}
              <div>
                <h3 className="font-bold text-xs mb-1">A. NILAI PENGETAHUAN</h3>
                <table className="w-full text-left text-[10px] border border-black border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black text-center">
                      <th className="p-1 border-r border-black w-8">No</th>
                      <th className="p-1 border-r border-black w-40">Mata Pelajaran</th>
                      <th className="p-1 border-r border-black w-12">KKTP</th>
                      <th className="p-1 border-r border-black w-12">Nilai</th>
                      <th className="p-1 border-r border-black w-12">Predikat</th>
                      <th className="p-1">Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.raport.nilaiPengetahuan || []).map((m, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                        <td className="p-1 border-r border-black font-bold">{m.namaMapel}</td>
                        <td className="p-1 border-r border-black text-center font-bold">{m.kktp ?? 75}</td>
                        <td className="p-1 border-r border-black text-center font-bold">{m.nilai}</td>
                        <td className="p-1 border-r border-black text-center font-bold">{m.predikat}</td>
                        <td className="p-1">{m.deskripsi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* B & C. Ekstrakurikuler & Prestasi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold text-xs mb-1">B. EKSTRAKURIKULER</h3>
                  <table className="w-full text-left text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="p-1 border-r border-black w-6">No</th>
                        <th className="p-1 border-r border-black">Kegiatan Eskul</th>
                        <th className="p-1">Predikat & Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.raport.nilaiEkstrakurikuler || []).map((e, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                          <td className="p-1 border-r border-black font-bold">{e.namaEskul}</td>
                          <td className="p-1">{e.keteranganPredikat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="font-bold text-xs mb-1">C. PRESTASI</h3>
                  <table className="w-full text-left text-[10px] border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="p-1 border-r border-black w-6">No</th>
                        <th className="p-1 border-r border-black">Jenis Prestasi</th>
                        <th className="p-1">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.raport.nilaiPrestasi || []).map((p, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                          <td className="p-1 border-r border-black font-bold">{p.jenisPrestasi}</td>
                          <td className="p-1">{p.keterangan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* D. Ketidakhadiran & Keputusan Kenaikan */}
              <div>
                <h3 className="font-bold text-xs mb-1">D. KETIDAKHADIRAN & KENAIKAN KELAS</h3>
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                  <div className="border border-black p-2">
                    <p><strong>Ketidakhadiran:</strong></p>
                    <p>Sakit: {formData.raport.sakit} hari | Izin: {formData.raport.izin} hari | Tanpa Keterangan: {formData.raport.alpa} hari</p>
                  </div>
                  <div className="border border-black p-2">
                    <p><strong>Keputusan Kenaikan Kelas:</strong></p>
                    <p className="font-bold">{formData.raport.statusKenaikan} {formData.raport.keKelas ? `ke ${formData.raport.keKelas}` : ""}</p>
                    <p className="text-[9px]">Tanggal Keputusan: {formatTanggalIndonesia(formData.raport.tanggalKenaikan)}</p>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 mt-6 text-center text-[10px]">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Orang Tua / Wali Siswa</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline">....................................</p>
                </div>
                <div>
                  <p>{config.Tempat_Tanda_Tangan || "Bogor"}, {formatTanggalIndonesia(formData.raport.tanggalKenaikan)}</p>
                  <p className="font-bold">Guru Kelas / Wali Kelas</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline">{config.Nama_Guru || "...................................."}</p>
                  <p>NIP. {config.NIP_Guru || "...................................."}</p>
                </div>
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-bold">Kepala Sekolah</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline">{config.Nama_Kepsek || "...................................."}</p>
                  <p>NIP. {config.NIP_Kepsek || "...................................."}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Import Data Buku Induk dari Excel</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unggah berkas Excel (.xlsx / .xls) berisi data register peserta didik</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Petunjuk Import:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                <li>Gunakan template resmi yang disiapkan agar kolom terbaca dengan tepat.</li>
                <li>Kolom utama: NIS, NISN, Nama Lengkap, Jenis Kelamin, Tanggal Lahir, Data Orang Tua/Wali.</li>
                <li>Data siswa baru akan ditambahkan otomatis ke register Buku Induk.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDownloadTemplate}
                className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Template Excel Format Buku Induk</span>
              </button>

              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 dark:bg-slate-800/30 group">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 pointer-events-none">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isImporting ? "Membaca & Menyimpan Data Excel..." : "Klik atau seret berkas Excel di sini"}
                  </p>
                  <p className="text-[11px] text-slate-400">Format yang didukung: .XLSX, .XLS</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT DATA INCOMPLETE NOTICE MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Pemeriksaan Kelengkapan Data Sebelum Cetak</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Siswa: <span className="font-bold text-slate-700 dark:text-slate-200">{formData?.pesertaDidik?.namaLengkap || selectedSiswa?.nama}</span> ({selectedSiswa?.kelas})
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ditemukan {missingFields.length} item data yang belum diisi / kurang lengkap:</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Sangat disarankan melengkapi data ini terlebih dahulu agar cetakan dokumen Buku Induk atau Raport tidak bergaris kosong.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {missingFields.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start space-x-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.field}</span>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">{item.section}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Edit className="w-4 h-4" />
                <span>Lengkapi Data Sekarang</span>
              </button>

              <button
                onClick={handleForcePrint}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Tetap Cetak Dokument</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
