import React from "react";
import { 
  PieChart, 
  Users, 
  IdCard, 
  BookOpen, 
  Clock, 
  Sun,
  ClipboardCheck, 
  Star, 
  Calendar, 
  HeartHandshake, 
  PiggyBank,
  Boxes,
  PackageSearch,
  BookMarked,
  BookmarkCheck,
  Wand2, 
  Bot, 
  Sparkles,
  Printer, 
  Settings, 
  GraduationCap,
  Gamepad2,
  Compass,
  Trash2,
  X,
  FileCheck,
  Download,
  Globe,
  FileQuestion,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Lock
} from "lucide-react";
import { User, Pengaturan } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentUser?: User | null;
  onLogout?: () => void;
  config?: Pengaturan;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  currentUser,
  onLogout,
  config
}) => {
  const isAdmin = currentUser?.role === "admin";
  const isGuruKelas = currentUser?.role === "guru_kelas";
  const isGuruMapel = currentUser?.role === "guru_mapel";
  const isGuruEkskul = currentUser?.role === "guru_ekskul";

  const navItems = isGuruEkskul
    ? [
        {
          group: "MENU UTAMA",
          items: [
            { id: "dashboard", label: "Dashboard", icon: PieChart },
            { id: "absen_kedatangan", label: "Absen Kedatangan Pagi", icon: Sun },
            { id: "siswa", label: "Kelola Siswa", icon: Users },
            { id: "kartu", label: "Cetak Kartu QR", icon: IdCard },
            { id: "mapel", label: "Kelola Mapel", icon: BookOpen },
          ]
        },
        {
          group: "AKADEMIK",
          items: [
            { id: "jadwal", label: "Jadwal Mengajar", icon: Clock },
            { id: "absensi", label: "Input Absensi", icon: ClipboardCheck },
            { id: "penilaian", label: "Input Penilaian", icon: Star },
            { id: "kuis_interaktif", label: "Kuis & Asesmen Cepat", icon: Gamepad2 },
            { id: "portofolio_p5", label: "Portofolio & Rapor P5", icon: Compass },
            { id: "bank_tp", label: "Bank TP (Tujuan Pembelajaran)", icon: BookmarkCheck },
            { id: "raport", label: "Cetak Raport Siswa", icon: GraduationCap },
            { id: "agenda", label: "Agenda Mengajar", icon: Calendar },
          ]
        },
        {
          group: "SISTEM & OUTPUT",
          items: [
            { id: "laporan", label: "Pusat Laporan", icon: Printer },
          ]
        }
      ]
    : [
        {
          group: "MENU UTAMA",
          items: [
            { id: "dashboard", label: "Dashboard", icon: PieChart },
            { id: "absen_kedatangan", label: "Absen Kedatangan Pagi", icon: Sun },
            { id: "siswa", label: "Kelola Siswa", icon: Users },
            { id: "kartu", label: "Cetak Kartu QR", icon: IdCard },
            { id: "mapel", label: "Kelola Mapel", icon: BookOpen },
          ]
        },
        {
          group: "AKADEMIK",
          items: [
            { id: "jadwal", label: "Jadwal Mengajar", icon: Clock },
            { id: "absensi", label: "Input Absensi", icon: ClipboardCheck },
            { id: "penilaian", label: "Input Penilaian", icon: Star },
            { id: "kuis_interaktif", label: "Kuis & Asesmen Cepat", icon: Gamepad2 },
            { id: "portofolio_p5", label: "Portofolio & Rapor P5", icon: Compass },
            { id: "bank_tp", label: "Bank TP (Tujuan Pembelajaran)", icon: BookmarkCheck, highlight: true },
            { id: "raport", label: "Cetak Raport Siswa", icon: GraduationCap },
            { id: "agenda", label: "Agenda Mengajar", icon: Calendar },
            { id: "bimbingan", label: "Bimbingan Guru Wali", icon: HeartHandshake },
            ...(isGuruMapel ? [] : [{ id: "tabungan", label: "Tabungan Kelas", icon: PiggyBank }]),
            ...(isAdmin || isGuruKelas ? [
              { id: "buku_induk", label: "Buku Induk Kelas", icon: BookMarked },
              { id: "aset_kelas", label: "Aset Kelas", icon: Boxes },
              { id: "stok_bhp", label: "Stok Opname BHP", icon: PackageSearch }
            ] : []),
            { id: "downloadperangkat", label: "Download Perangkat Ajar", icon: Download },
          ]
        },
        {
          group: "KECERDASAN BUATAN (AI)",
          items: [
            { id: "generator_soal", label: "Generator Soal & Bank Soal", icon: FileQuestion, highlight: true },
            { id: "perangkat_ai", label: "Generator Perangkat Ajar AI", icon: FileCheck, highlight: true },
            { id: "modulai", label: "Modul Ajar AI", icon: Wand2, highlight: true },
            { id: "asistenai", label: "Asisten Guru AI", icon: Bot, highlight: true },
            { id: "lkpdai", label: "Generator LKPD AI", icon: Sparkles, highlight: true },
            { id: "ailainnya", label: "Generator AI Lainnya", icon: Globe, highlight: true },
          ]
        },
        {
          group: "SISTEM & OUTPUT",
          items: [
            { id: "laporan", label: "Pusat Laporan", icon: Printer },
            { id: "pengaturan", label: "Pengaturan & User", icon: Settings },
            ...(isAdmin
              ? [{ id: "resetdb", label: "Hapus Isi Database", icon: Trash2, dangerous: true }]
              : []),
          ]
        }
      ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-slate-900 text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 rounded-r-2xl lg:rounded-r-none lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <GraduationCap className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-none truncate">
                {config?.Nama_Sekolah || "SD NEGERI BABAKAN 04"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">
                Administrasi Guru Digital
              </span>
            </div>
          </div>

          <button 
            className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-all"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card in Sidebar */}
        {currentUser && (
          <div className="p-3 mx-3 mt-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.nama}</p>
                <p className="text-[10px] text-emerald-400 font-medium truncate">
                  {currentUser.role === "admin"
                    ? "👑 Admin Utama"
                    : currentUser.role === "guru_kelas"
                    ? `👩‍🏫 Kelas ${currentUser.kelasUtama || '-'}`
                    : currentUser.role === "guru_ekskul"
                    ? `🎨 Ekskul: ${currentUser.mapelDiampu || 'Ekskul'}`
                    : `📘 Guru Mapel Multi`}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar pb-safe">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] min-h-[44px] ${
                      isActive
                        ? (item as any).dangerous
                          ? "bg-red-600 text-white shadow-md font-bold"
                          : item.highlight
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-bold"
                          : "bg-blue-600 text-white shadow-md font-bold"
                        : (item as any).dangerous
                        ? "text-red-400 hover:bg-red-950/50 hover:text-red-300"
                        : item.highlight
                        ? "text-amber-300 hover:bg-slate-800 hover:text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : (item as any).dangerous ? "text-red-400" : item.highlight ? "text-amber-400" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 shrink-0">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-center text-[11px] text-slate-400 bg-slate-950/50">
          <p className="font-semibold text-slate-300">Aplikasi Guru AI &copy; 2026</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sistem Guru Digital & Multi-Akses</p>
        </div>
      </aside>
    </>
  );
};
