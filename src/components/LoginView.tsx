import React, { useState } from "react";
import { GraduationCap, Lock, User as UserIcon, LogIn, Key, ShieldCheck, UserCheck, BookOpen, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { User, Pengaturan } from "../types";

interface LoginViewProps {
  userList: User[];
  onLoginSuccess: (user: User) => void;
  config: Pengaturan;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  userList,
  onLoginSuccess,
  config,
  isDarkMode = false,
  onToggleDarkMode
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Deteksi apakah aplikasi berjalan di lingkungan produksi / terpublikasi (ais-pre atau PROD)
  const isPublishedApp = 
    Boolean((import.meta as any).env?.PROD) || 
    (typeof window !== "undefined" && window.location.hostname.includes("ais-pre"));

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim()) {
      setErrorMsg("Mohon masukkan nama pengguna / username.");
      return;
    }

    const trimmedUser = username.trim().toLowerCase();
    const foundUser = userList.find(
      (u) => u.username.toLowerCase() === trimmedUser
    );

    if (!foundUser) {
      if (trimmedUser === "admin") {
        onLoginSuccess({
          id: "admin-default",
          username: "admin",
          nama: config.Nama_Guru || "Administrator Utama",
          nip: config.NIP_Guru || "-",
          role: "admin"
        });
        return;
      }
      setErrorMsg(`Pengguna "${username}" tidak ditemukan dalam database.`);
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setErrorMsg("Kata sandi / password tidak sesuai.");
      return;
    }

    onLoginSuccess(foundUser);
  };

  const handleQuickDemoLogin = (userRole: 'admin' | 'guru_kelas' | 'guru_mapel' | 'guru_ekskul') => {
    setErrorMsg("");
    const targetUser = userList.find((u) => u.role === userRole);
    if (targetUser) {
      onLoginSuccess(targetUser);
    } else {
      // Fallback dummy user if Firestore hasn't seeded yet
      if (userRole === 'admin') {
        onLoginSuccess({
          id: "admin-default",
          username: "admin",
          nama: config.Nama_Guru || "Administrator Utama",
          nip: config.NIP_Guru || "-",
          role: "admin"
        });
      } else if (userRole === 'guru_kelas') {
        onLoginSuccess({
          id: "gk-default",
          username: "guru.kelas",
          nama: "Eri Iriana Rifai, S.Kom.",
          nip: "-",
          role: "guru_kelas",
          kelasUtama: "Kelas 1"
        });
      } else if (userRole === 'guru_ekskul') {
        onLoginSuccess({
          id: "ge-default",
          username: "guru.ekskul",
          nama: "Siti Rahmawati, S.Pd.",
          nip: "-",
          role: "guru_ekskul",
          kelasAkses: ["Kelas 3A", "Kelas 4", "Kelas 5"],
          mapelDiampu: "Pramuka / Futsal"
        });
      } else {
        onLoginSuccess({
          id: "gm-default",
          username: "guru.mapel",
          nama: "Drs. Yefri Haryanto, M.Pd.",
          nip: "19850312 201001 1 008",
          role: "guru_mapel",
          kelasAkses: ["Kelas 1", "Kelas 2"],
          mapelDiampu: "Informatika"
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Theme Toggle on Login Screen */}
      {onToggleDarkMode && (
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="absolute top-4 right-4 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
          title={isDarkMode ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>
      )}

      <div className="w-full max-w-md bg-white dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20 text-slate-950">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Sistem Administrasi Guru Digital & Akses Terintegrasi
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
            <Key className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Username / Nama Pengguna
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk ke Aplikasi</span>
          </button>
        </form>

        {/* Quick Demo Access Buttons - Hanya tampil di environment Dev/Lokal */}
        {!isPublishedApp && (
          <>
            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
              <span className="bg-white dark:bg-slate-800 px-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 absolute">
                Atau Masuk Cepat (Demo Dev)
              </span>
            </div>

            {/* Quick Demo Access Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-amber-300 dark:border-amber-500/30 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-amber-300 group-hover:text-amber-600 dark:group-hover:text-amber-200">
                      Login Admin
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Akses penuh semua kelas & pengaturan</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-400/20">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guru_kelas')}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-emerald-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-200">
                      Login Guru Kelas
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Terisolasi khusus untuk Kelas VII A</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-400/20">
                  VII A
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guru_mapel')}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-blue-300 dark:border-blue-500/30 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-blue-300 group-hover:text-blue-600 dark:group-hover:text-blue-200">
                      Login Guru Mapel
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Akses beberapa kelas (Kelas 1 & 2)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-400/20">
                  Multi-Kelas
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guru_ekskul')}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-purple-300 dark:border-purple-500/30 rounded-2xl flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-400/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-purple-300 group-hover:text-purple-600 dark:group-hover:text-purple-200">
                      Login Guru Ekstrakurikuler
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Khusus menu & kelas ekskul yang diampu</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-400/20">
                  Ekskul
                </span>
              </button>
            </div>
          </>
        )}

        {/* Footer info */}
        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 pt-2">
          Sistem Pengaman Hak Akses Guru & Multi-Kelas &copy; 2026
        </p>
      </div>
    </div>
  );
};
