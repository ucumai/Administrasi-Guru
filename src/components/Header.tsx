import React from "react";
import { Menu, CloudCheck, CloudOff, Moon, Sun, GraduationCap, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { Pengaturan, User } from "../types";

interface HeaderProps {
  activeTab: string;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onSetDarkMode: (isDark: boolean) => void;
  onToggleDarkMode?: () => void;
  isConnected: boolean;
  config: Pengaturan;
  currentUser?: User | null;
  onLogout?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: "Aplikasi Guru AI",
  siswa: "Kelola Master Data Siswa",
  kartu: "Cetak Kartu Pelajar QR Code",
  mapel: "Kelola Mata Pelajaran",
  jadwal: "Jadwal Mengajar Guru",
  absensi: "Input Absensi Harian & QR Scanner",
  penilaian: "Input Nilai Akademik Siswa",
  agenda: "Jurnal Agenda Mengajar",
  bimbingan: "Catatan Bimbingan Guru Wali",
  downloadperangkat: "Download Perangkat Ajar (Deep Learning)",
  perangkat_ai: "Generator Perangkat Ajar AI (Analisis CP, TP, ATP, Prota, Prosem, KKTP)",
  modulai: "Generator Modul Ajar AI (Deep Learning)",
  asistenai: "Asisten AI Pendamping Guru",
  lkpdai: "Generator LKPD AI (Lembar Kerja Peserta Didik)",
  ailainnya: "Generator AI Lainnya",
  laporan: "Pusat Cetak Laporan PDF",
  pengaturan: "Pengaturan & Hak Akses User",
  resetdb: "Kosongkan & Hapus Seluruh Isi Database"
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  isDarkMode,
  onSetDarkMode,
  onToggleDarkMode,
  isConnected,
  config,
  currentUser,
  onLogout
}) => {
  const handleSelectDark = (dark: boolean) => {
    if (onSetDarkMode) {
      onSetDarkMode(dark);
    } else if (onToggleDarkMode) {
      onToggleDarkMode();
    }
  };

  return (
    <header className="sticky top-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 z-30 transition-colors shadow-xs">
      <div className="flex items-center space-x-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 min-w-0 lg:hidden">
          <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 font-bold shrink-0 shadow-xs">
            <GraduationCap className="w-4 h-4 text-slate-950" />
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              {TAB_TITLES[activeTab] || "Aplikasi Guru AI"}
            </span>
            {activeTab !== "dashboard" && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}
              </span>
            )}
          </div>
        </div>

        <h1 className="hidden lg:block text-lg font-bold text-slate-800 dark:text-white truncate">
          {TAB_TITLES[activeTab] || "Aplikasi Guru AI"}
        </h1>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {/* Firebase Live Status Badge */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs transition-colors ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          }`}
        >
          {isConnected ? (
            <>
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Firebase Live</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Connecting...</span>
            </>
          )}
        </div>

        {/* User profile badge & Role */}
        {currentUser && (
          <div className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col text-left leading-none max-w-[150px]">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {currentUser.nama}
              </span>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 truncate mt-0.5">
                {currentUser.role === "admin" 
                  ? "👑 Admin Utama" 
                  : currentUser.role === "guru_kelas" 
                  ? `👩‍🏫 Kelas: ${currentUser.kelasUtama || '-'}` 
                  : currentUser.role === "guru_ekskul"
                  ? `🎨 Ekskul: ${currentUser.mapelDiampu || 'Ekskul'}`
                  : `📘 Mapel (${(currentUser.kelasAkses || []).join(', ')})`}
              </span>
            </div>
          </div>
        )}

        {/* Theme Toggle Switch */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 space-x-0.5">
          <button
            type="button"
            onClick={() => handleSelectDark(false)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[36px] min-h-[36px] ${
              !isDarkMode
                ? "bg-amber-400 text-slate-950 shadow-xs font-bold scale-105"
                : "text-slate-400 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 active:scale-95"
            }`}
            title="Aktifkan Tema Terang"
            aria-label="Tema Terang"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSelectDark(true)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[36px] min-h-[36px] ${
              isDarkMode
                ? "bg-indigo-600 text-white shadow-xs font-bold scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95"
            }`}
            title="Aktifkan Tema Gelap"
            aria-label="Tema Gelap"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center justify-center transition-all cursor-pointer min-w-[40px] min-h-[40px]"
            title="Keluar / Logout"
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
