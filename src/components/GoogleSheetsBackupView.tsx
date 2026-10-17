import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  CloudUpload, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Database, 
  ShieldCheck, 
  Clock, 
  LogOut, 
  Eye, 
  Users, 
  ClipboardCheck, 
  Star, 
  Calendar, 
  PiggyBank, 
  BookOpen, 
  Info,
  Layers
} from "lucide-react";
import { 
  Siswa, 
  User, 
  Mapel, 
  Jadwal, 
  LogAbsensi, 
  DataNilai, 
  JurnalAgenda, 
  TabunganKelas, 
  Pengaturan 
} from "../types";
import { 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken, 
  initGoogleAuth 
} from "../lib/googleAuth";
import { 
  syncDatabaseToGoogleSheets, 
  exportToOfflineExcel, 
  getSavedSpreadsheetId, 
  getSavedLastBackupMeta,
  fetchSheetRows,
  SHEET_NAMES,
  BackupDataPayload
} from "../lib/googleSheetsService";
import Swal from "sweetalert2";
import { FirestoreQuotaOptimizerCard } from "./FirestoreQuotaOptimizerCard";

interface GoogleSheetsBackupViewProps {
  siswaList: Siswa[];
  userList: User[];
  mapelList: Mapel[];
  jadwalList: Jadwal[];
  absensiList: LogAbsensi[];
  nilaiList: DataNilai[];
  agendaList: JurnalAgenda[];
  tabunganList: TabunganKelas[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const GoogleSheetsBackupView: React.FC<GoogleSheetsBackupViewProps> = ({
  siswaList,
  userList,
  mapelList,
  jadwalList,
  absensiList,
  nilaiList,
  agendaList,
  tabunganList,
  config,
  currentUser
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ step: string; percentage: number } | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => getSavedSpreadsheetId());
  const [lastBackupMeta, setLastBackupMeta] = useState(() => getSavedLastBackupMeta());
  
  // Sheet Preview states
  const [selectedSheetForPreview, setSelectedSheetForPreview] = useState<string>("Data Siswa");
  const [previewRows, setPreviewRows] = useState<any[][] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Initialize Auth listener on mount
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        Swal.fire({
          icon: "success",
          title: "Terhubung ke Google",
          text: `Berhasil masuk dengan akun ${res.user.email}. Anda siap mencadangkan data ke Google Sheets.`,
          timer: 2500,
          showConfirmButton: false
        });
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Koneksi Google Gagal",
        text: err.message || "Gagal menghubungkan ke akun Google. Pastikan popup tidak diblokir oleh browser.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    Swal.fire({
      icon: "info",
      title: "Akun Terputus",
      text: "Koneksi ke akun Google telah ditutup.",
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Perform full sync to Google Sheets with mandatory user confirmation
  const handleStartSync = async () => {
    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }

    if (!token || !googleUser) {
      Swal.fire({
        icon: "warning",
        title: "Perlu Masuk Akun Google",
        text: "Silakan hubungkan akun Google Anda terlebih dahulu untuk membuat atau memperbarui spreadsheet di Google Drive Anda.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "Hubungkan Sekarang",
      }).then((result) => {
        if (result.isConfirmed) {
          handleGoogleLogin();
        }
      });
      return;
    }

    const totalRecords = 
      siswaList.length + 
      userList.length + 
      mapelList.length + 
      jadwalList.length + 
      absensiList.length + 
      nilaiList.length + 
      agendaList.length + 
      tabunganList.length;

    // MANDATORY Workspace integration confirmation dialog
    const confirmResult = await Swal.fire({
      title: "Cadangkan ke Google Sheets?",
      html: `
        <div class="text-left text-sm space-y-2 text-slate-700 dark:text-slate-300">
          <p>Aplikasi akan membuat atau memperbarui file spreadsheet di Google Drive akun <b>${googleUser.email}</b>:</p>
          <ul class="list-disc pl-5 space-y-1">
            <li><b>${siswaList.length}</b> Data Siswa</li>
            <li><b>${absensiList.length}</b> Log Absensi</li>
            <li><b>${nilaiList.length}</b> Data Penilaian</li>
            <li><b>${agendaList.length}</b> Agenda Mengajar</li>
            <li><b>${tabunganList.length}</b> Tabungan Kelas</li>
            <li><b>${userList.length}</b> Guru & Pengguna</li>
          </ul>
          <p class="pt-2 text-xs text-slate-500">Total <b>${totalRecords} data</b> akan disinkronkan ke lembar terpisah yang rapi.</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Mulai Cadangkan",
      cancelButtonText: "Batal",
    });

    if (!confirmResult.isConfirmed) return;

    setIsSyncing(true);
    setSyncProgress({ step: "Menyiapkan cadangan...", percentage: 5 });

    try {
      const payload: BackupDataPayload = {
        siswaList,
        userList,
        mapelList,
        jadwalList,
        absensiList,
        nilaiList,
        agendaList,
        tabunganList,
        config
      };

      const result = await syncDatabaseToGoogleSheets(payload, token, (step, percentage) => {
        setSyncProgress({ step, percentage });
      });

      setSpreadsheetId(result.spreadsheetId);
      setLastBackupMeta({
        timestamp: new Date().toISOString(),
        totalRecords: result.totalRecordsSynced,
        url: result.spreadsheetUrl
      });

      Swal.fire({
        icon: "success",
        title: "Pencadangan Berhasil!",
        html: `
          <div class="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>Sebanyak <b>${result.totalRecordsSynced}</b> data berhasil disinkronkan ke Google Spreadsheet Anda.</p>
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
              File tersimpan aman di Google Drive Anda: <b>${result.title}</b>
            </div>
          </div>
        `,
        confirmButtonColor: "#10b981",
        confirmButtonText: "Lihat di Google Sheets",
        showCancelButton: true,
        cancelButtonText: "Tutup",
      }).then((swalRes) => {
        if (swalRes.isConfirmed) {
          window.open(result.spreadsheetUrl, "_blank");
        }
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal Mencadangkan",
        text: err.message || "Terjadi kesalahan saat berkomunikasi dengan Google Sheets API.",
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Preview data from spreadsheet
  const handlePreviewSheet = async () => {
    let token = accessToken;
    if (!token) token = await getAccessToken();

    const currentSheetId = spreadsheetId || getSavedSpreadsheetId();
    if (!token || !currentSheetId) {
      Swal.fire({
        icon: "info",
        title: "Belum Ada Spreadsheet",
        text: "Silakan jalankan pencadangan terlebih dahulu untuk melihat pratinjau data langsung dari Google Sheets.",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      const rows = await fetchSheetRows(currentSheetId, selectedSheetForPreview, token, 30);
      setPreviewRows(rows);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal Membaca Spreadsheet",
        text: err.message || "Tidak dapat memuat pratinjau lembar.",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle direct offline Excel (.xlsx) download
  const handleDownloadExcelOffline = () => {
    const payload: BackupDataPayload = {
      siswaList,
      userList,
      mapelList,
      jadwalList,
      absensiList,
      nilaiList,
      agendaList,
      tabunganList,
      config
    };
    const schoolName = config.Nama_Sekolah ? config.Nama_Sekolah.replace(/[^a-zA-Z0-9]/g, "_") : "Sekolah";
    const dateStr = new Date().toISOString().split("T")[0];
    exportToOfflineExcel(payload, `Cadangan_Database_${schoolName}_${dateStr}.xlsx`);
    
    Swal.fire({
      icon: "success",
      title: "File Excel Berhasil Diunduh",
      text: "Salinan offline database telah disimpan ke perangkat Anda dalam format .xlsx.",
      timer: 2500,
      showConfirmButton: false
    });
  };

  const spreadsheetUrl = spreadsheetId 
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` 
    : lastBackupMeta?.url || null;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner / Heading */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-500/10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold mb-3 border border-white/20">
            <ShieldCheck className="w-4 h-4" />
            Solusi Hibrida: Firebase Realtime + Google Sheets Backup
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
            Pusat Cadangan & Ekspor Google Sheets
          </h1>
          <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
            Menjaga kelangsungan aplikasi tetap cepat melalui database lokal & Firestore, sekaligus menyimpan arsip lengkap seluruh tabel ke <b>Google Spreadsheet di Google Drive</b> pribadi Anda tanpa takut terkena batas kuota baca harian.
          </p>
        </div>
      </div>

      {/* Grid: Account Status & Spreadsheet Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Google Account Connection */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Status Koneksi Akun Google
              </span>
              {googleUser ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5" /> Belum Terhubung
                </span>
              )}
            </div>

            {googleUser ? (
              <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-4">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || "User"}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                    {googleUser.email?.[0]?.toUpperCase() || "G"}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    {googleUser.displayName || "Pengguna Google"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {googleUser.email}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    Izin: Google Sheets & Drive File
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-4 text-sm text-slate-600 dark:text-slate-400">
                Hubungkan dengan akun Google Anda untuk memungkinkan aplikasi membuat dan mengupdate spreadsheet di Google Drive Anda.
              </div>
            )}
          </div>

          <div className="pt-2">
            {googleUser ? (
              <button
                onClick={handleGoogleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" /> Putuskan / Ganti Akun Google
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold text-sm border border-slate-300 dark:border-slate-600 shadow-sm hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-650 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                {isAuthenticating ? "Menghubungkan..." : "Hubungkan Akun Google"}
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Spreadsheet Status & Direct Link */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                File Google Spreadsheet
              </span>
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            {spreadsheetUrl ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    File Cadangan Aktif di Google Drive
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-0.5 truncate">
                    Cadangan E-Administrasi Guru - {config.Nama_Sekolah || "Sekolah"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 truncate">
                    ID: {spreadsheetId || "Tersimpan"}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Terakhir dicadangkan:{" "}
                    <b>
                      {lastBackupMeta?.timestamp
                        ? new Date(lastBackupMeta.timestamp).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Belum pernah"}
                    </b>
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-sm text-slate-600 dark:text-slate-400">
                Belum ada spreadsheet cadangan yang terbuat. Klik tombol <b>"Mulai Cadangkan"</b> di bawah untuk otomatis membuat spreadsheet baru di Google Drive Anda.
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-2">
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" /> Buka di Google Sheets
              </a>
            )}
            <button
              onClick={handleDownloadExcelOffline}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
              title="Unduh salinan Excel lokal tanpa memerlukan internet"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Unduh .XLSX Lokal
            </button>
          </div>
        </div>
      </div>

      {/* Main Action Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              Sinkronisasi Cadangan Seluruh Database
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sistem akan memformat dan menyalin semua data (siswa, absen, nilai, jadwal, agenda, tabungan) ke lembar kerja Google Sheets secara terstruktur.
            </p>
          </div>

          <button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Sedang Menyinkronkan...
              </>
            ) : (
              <>
                <CloudUpload className="w-5 h-5" />
                Mulai Cadangkan ke Google Sheets
              </>
            )}
          </button>
        </div>

        {/* Progress Bar when syncing */}
        {isSyncing && syncProgress && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
              <span>{syncProgress.step}</span>
              <span>{syncProgress.percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${syncProgress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Breakdown of items ready for backup */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700/60">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <Users className="w-3.5 h-3.5 text-blue-500" /> Siswa
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {siswaList.length}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" /> Log Absen
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {absensiList.length}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <Star className="w-3.5 h-3.5 text-amber-500" /> Data Nilai
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {nilaiList.length}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Agenda
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {agendaList.length}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <PiggyBank className="w-3.5 h-3.5 text-pink-500" /> Tabungan
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {tabunganList.length}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5 text-teal-500" /> Mapel & Jadwal
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {mapelList.length + jadwalList.length}
            </p>
          </div>
        </div>
      </div>

      {/* Live Spreadsheet Preview Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Pratinjau Lembar Data Langsung dari Google Sheets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih lembar tab untuk memverifikasi data yang tersimpan di Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSheetForPreview}
              onChange={(e) => setSelectedSheetForPreview(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {SHEET_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePreviewSheet}
              disabled={isLoadingPreview || !googleUser}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingPreview ? "animate-spin" : ""}`} />
              Muat Pratinjau
            </button>
          </div>
        </div>

        {/* Preview Table */}
        {isLoadingPreview ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
            <p className="text-sm">Mengambil baris dari Google Sheets API...</p>
          </div>
        ) : previewRows && previewRows.length > 0 ? (
          <div className="overflow-x-auto max-h-96 rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/60 sticky top-0 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  {previewRows[0].map((headerCol: any, idx: number) => (
                    <th key={idx} className="p-3 whitespace-nowrap">
                      {String(headerCol)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {previewRows.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors">
                    {previewRows[0].map((_: any, colIdx: number) => (
                      <td key={colIdx} className="p-3 whitespace-nowrap">
                        {row[colIdx] !== undefined ? String(row[colIdx]) : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 text-sm text-slate-500">
            Belum ada pratinjau yang dimuat. Klik tombol <b>"Muat Pratinjau"</b> di atas untuk menampilkan data langsung dari lembar <b>{selectedSheetForPreview}</b>.
          </div>
        )}
      </div>

      {/* Firestore Quota Efficiency & Anti-Limit Optimizer Card */}
      <FirestoreQuotaOptimizerCard />

      {/* Hybrid Architecture Explanation */}
      <div className="p-5 bg-blue-50 dark:bg-blue-950/30 rounded-3xl border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-4 text-xs md:text-sm text-blue-900 dark:text-blue-300">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1.5 leading-relaxed">
          <p className="font-bold">Kenapa Solusi Hibrida Ini Adalah Jalan Terbaik?</p>
          <p>
            1. <b>Kecepatan & Realtime Tetap Terjaga:</b> Guru dan admin tetap menginput nilai, absen, dan agenda secara instan menggunakan database aplikasi tanpa lag sedikitpun.
          </p>
          <p>
            2. <b>Bebas Limit & Cadangan Aman di Drive:</b> File Google Spreadsheet tersimpan di akun Google Drive Anda sendiri. Anda bisa mencadangkan kapan saja, membukanya di laptop/HP, mencetak rekap, atau membagikannya ke kepala sekolah/pengawas tanpa membebani kuota baca Firestore.
          </p>
        </div>
      </div>
    </div>
  );
};
