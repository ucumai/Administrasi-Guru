import React, { useState, useEffect, useRef } from "react";
import { 
  Settings, 
  Save, 
  ShieldCheck, 
  School, 
  UserCheck, 
  Trash2, 
  ShieldAlert, 
  Users, 
  UserPlus, 
  Pencil, 
  Key, 
  X, 
  CheckCircle2, 
  BookOpen,
  Lock,
  Plus,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  HelpCircle,
  Shield,
  Check,
  AlertCircle,
  Cpu,
  FileCode2,
  Palette,
  Zap
} from "lucide-react";
import { Pengaturan, User, RoleUser } from "../types";
import { savePengaturan, saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { compressImage } from "../lib/imageCompressor";
import { THEME_PRESETS, applyGlobalTheme } from "../lib/themeManager";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyEditSuccess, 
  notifyHapusSuccess, 
  notifyHapusError, 
  confirmDeleteAlert 
} from "../lib/swal";
import { generateSchoolLicenseKey, verifySchoolLicenseKey } from "../lib/securityProtection";

const TUT_WURI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <polygon points="100,10 190,75 155,185 45,185 10,75" fill="#0083cb" stroke="#ffd100" stroke-width="5"/>
  <polygon points="100,18 182,77 150,177 50,177 18,77" fill="#005d99"/>
  <path d="M100 28 C108 38 116 50 113 65 C110 74 104 80 100 82 C96 80 90 74 87 65 C84 50 92 38 100 28 Z" fill="#f59e0b"/>
  <path d="M100 38 C104 46 109 54 107 63 C105 68 102 72 100 73 C98 72 95 68 93 63 C91 54 96 46 100 38 Z" fill="#fef08a"/>
  <path d="M100 78 C118 66 145 72 165 92 C150 96 134 99 122 110 C138 110 154 115 166 126 C148 128 132 131 120 142 C111 126 100 120 100 120 C100 120 89 126 80 142 C68 131 52 128 34 126 C46 115 62 110 78 110 C66 99 50 96 35 92 C55 72 82 66 100 78 Z" fill="#ffd100"/>
  <path d="M100 138 C116 127 138 130 156 141 L151 163 C134 152 116 150 100 160 C84 150 66 152 49 163 L44 141 C62 130 84 127 100 138 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2.5"/>
  <line x1="100" y1="138" x2="100" y2="160" stroke="#1e293b" stroke-width="2.5"/>
  <path d="M58 147 C70 140 85 140 95 146 M58 153 C70 146 85 146 95 152" stroke="#64748b" stroke-width="1.8" fill="none"/>
  <path d="M142 147 C130 140 115 140 105 146 M142 153 C130 146 115 146 105 152" stroke="#64748b" stroke-width="1.8" fill="none"/>
</svg>
`)}`;

interface PengaturanViewProps {
  config: Pengaturan;
  userList: User[];
  currentUser: User;
  onNavigateToReset?: () => void;
  onNavigateToSheets?: () => void;
  availableClasses?: string[];
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({ 
  config, 
  userList, 
  currentUser, 
  onNavigateToReset,
  onNavigateToSheets,
  availableClasses = ["Kelas 1", "Kelas 2", "Kelas 3A", "Kelas 3B", "Kelas 4", "Kelas 5", "Kelas 6", "Pramuka", "Silat", "Hadroh", "Drumband"]
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"profil" | "users" | "keamanan" | "tampilan">("profil");

  // Theme Customizer State
  const [selectedPreset, setSelectedPreset] = useState<string>(() => config?.themeConfig?.presetId || "ocean");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>(() => config?.themeConfig?.primaryColor || "#2563eb");
  const [customPrimaryHover, setCustomPrimaryHover] = useState<string>(() => config?.themeConfig?.primaryHover || "#1d4ed8");
  const [selectedFont, setSelectedFont] = useState<'inter' | 'jakarta' | 'outfit' | 'poppins'>(() => config?.themeConfig?.fontFamily || "inter");
  const [selectedRadius, setSelectedRadius] = useState<'sharp' | 'medium' | 'rounded' | 'full'>(() => config?.themeConfig?.borderRadius || "medium");
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  // Keep theme form in sync if config updates from firebase
  useEffect(() => {
    if (config?.themeConfig) {
      if (config.themeConfig.presetId) setSelectedPreset(config.themeConfig.presetId);
      if (config.themeConfig.primaryColor) setCustomPrimaryColor(config.themeConfig.primaryColor);
      if (config.themeConfig.primaryHover) setCustomPrimaryHover(config.themeConfig.primaryHover);
      if (config.themeConfig.fontFamily) setSelectedFont(config.themeConfig.fontFamily);
      if (config.themeConfig.borderRadius) setSelectedRadius(config.themeConfig.borderRadius);
    }
  }, [config?.themeConfig]);

  // License & Security State
  const [licenseInput, setLicenseInput] = useState<string>(() => {
    try {
      return localStorage.getItem("edadmin_school_license") || "";
    } catch {
      return "";
    }
  });
  const [generatedLicense, setGeneratedLicense] = useState<string>("");

  // Logo Tab & Preview State
  const [activeLogoSlot, setActiveLogoSlot] = useState<"kiri" | "kanan">("kiri");
  const [showKopPreview, setShowKopPreview] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config Form State
  const [form, setForm] = useState<Pengaturan>({
    Nama_Guru: "",
    NIP_Guru: "",
    Pemerintah: "PEMERINTAH KABUPATEN BOGOR",
    Dinas: "DINAS PENDIDIKAN",
    Nama_Sekolah: "",
    Alamat_Sekolah: "",
    NPSN: "",
    Nama_Kepsek: "",
    NIP_Kepsek: "",
    Tempat_Tanda_Tangan: "",
    Logo_Kiri: "",
    Logo_Kanan: "",
    Logo_Tinggi: 65,
    Email_Sekolah: ""
  });

  // User Management State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form User State
  const [uUsername, setUUsername] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uNama, setUNama] = useState("");
  const [uNip, setUNip] = useState("");
  const [uRole, setURole] = useState<RoleUser>("guru_kelas");
  const [uKelasUtama, setUKelasUtama] = useState("");
  const [uKelasAkses, setUKelasAkses] = useState<string[]>([""]);
  const [uMapel, setUMapel] = useState("");
  const [customKelasInput, setCustomKelasInput] = useState("");

  useEffect(() => {
    if (config) {
      setForm({
        Nama_Guru: config.Nama_Guru || "",
        NIP_Guru: config.NIP_Guru || "",
        Pemerintah: config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR",
        Dinas: config.Dinas || "DINAS PENDIDIKAN",
        Nama_Sekolah: config.Nama_Sekolah || "",
        Alamat_Sekolah: config.Alamat_Sekolah || "",
        NPSN: config.NPSN || "",
        Nama_Kepsek: config.Nama_Kepsek || "",
        NIP_Kepsek: config.NIP_Kepsek || "",
        Tempat_Tanda_Tangan: config.Tempat_Tanda_Tangan || "",
        Logo_Kiri: config.Logo_Kiri || "",
        Logo_Kanan: config.Logo_Kanan || "",
        Logo_Tinggi: config.Logo_Tinggi || 65,
        Email_Sekolah: config.Email_Sekolah || ""
      });
    }
  }, [config]);

  const handleChangeConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      notifySimpanError("Harap unggah file gambar (PNG, JPG, WEBP, atau SVG)!");
      return;
    }
    try {
      const compressedBase64 = await compressImage(file, 256, 0.85);
      if (activeLogoSlot === "kiri") {
        setForm((prev) => ({ ...prev, Logo_Kiri: compressedBase64 }));
      } else {
        setForm((prev) => ({ ...prev, Logo_Kanan: compressedBase64 }));
      }
    } catch (err: any) {
      console.error("Error reading/compressing logo file:", err);
      notifySimpanError("Gagal memproses gambar logo.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyTutWuri = () => {
    if (activeLogoSlot === "kiri") {
      setForm((prev) => ({ ...prev, Logo_Kiri: TUT_WURI_SVG }));
    } else {
      setForm((prev) => ({ ...prev, Logo_Kanan: TUT_WURI_SVG }));
    }
  };

  const handleClearCurrentLogo = () => {
    if (activeLogoSlot === "kiri") {
      setForm((prev) => ({ ...prev, Logo_Kiri: "" }));
    } else {
      setForm((prev) => ({ ...prev, Logo_Kanan: "" }));
    }
  };

  const handleSubmitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePengaturan(form);
      notifySimpanSuccess("Pengaturan kop surat & identitas sekolah tersimpan ke Firebase!");
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan pengaturan.");
    }
  };

  // User Form Helpers
  const resetUserForm = () => {
    setUUsername("");
    setUPassword("guru123");
    setUNama("");
    setUNip("-");
    setURole("guru_kelas");
    setUKelasUtama("");
    setUKelasAkses([""]);
    setUMapel("");
    setCustomKelasInput("");
    setEditingUser(null);
    setIsAddUserOpen(false);
  };

  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setUUsername(u.username);
    setUPassword(u.password || "guru123");
    setUNama(u.nama);
    setUNip(u.nip || "-");
    setURole(u.role);
    setUKelasUtama(u.kelasUtama || "");
    setUKelasAkses(u.kelasAkses || [""]);
    setUMapel(u.mapelDiampu || "");
    setIsAddUserOpen(true);
  };

  const handleToggleKelasAkses = (kls: string) => {
    setUKelasAkses((prev) => 
      prev.includes(kls) ? prev.filter((k) => k !== kls) : [...prev, kls]
    );
  };

  const handleAddCustomKelas = () => {
    if (!customKelasInput.trim()) return;
    const newKls = customKelasInput.trim();
    if (!uKelasAkses.includes(newKls)) {
      setUKelasAkses((prev) => [...prev, newKls]);
    }
    setCustomKelasInput("");
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uUsername.trim() || !uNama.trim()) {
      notifySimpanError("Username dan Nama Lengkap Guru wajib diisi!");
      return;
    }

    const trimmedUsername = uUsername.trim().toLowerCase();

    // Check duplicate username if adding new
    if (!editingUser) {
      const exists = userList.find((u) => u.username.toLowerCase() === trimmedUsername);
      if (exists) {
        notifySimpanError(`Username "${uUsername}" sudah digunakan oleh guru lain!`);
        return;
      }
    }

    const docId = editingUser ? editingUser.id : `user_${Date.now()}`;
    const userData: User = {
      id: docId,
      username: trimmedUsername,
      password: uPassword || "guru123",
      nama: uNama.trim(),
      nip: uNip.trim() || "-",
      role: uRole,
      updatedAt: Date.now()
    };

    if (uRole === "guru_kelas") {
      userData.kelasUtama = uKelasUtama.trim() || "";
      userData.kelasAkses = [];
      userData.mapelDiampu = "";
    } else if (uRole === "guru_mapel") {
      userData.kelasUtama = "";
      userData.kelasAkses = uKelasAkses.length > 0 ? uKelasAkses : [""];
      userData.mapelDiampu = uMapel.trim();
    } else if (uRole === "guru_ekskul") {
      userData.kelasUtama = uKelasUtama.trim() || (uKelasAkses[0] || "Ekskul");
      userData.kelasAkses = uKelasAkses.length > 0 ? uKelasAkses : [uKelasUtama.trim() || "Ekskul"];
      userData.mapelDiampu = uMapel.trim() || "Ekstrakurikuler";
    } else {
      userData.kelasUtama = "";
      userData.kelasAkses = [];
      userData.mapelDiampu = "";
    }

    try {
      await saveDocument(COLLECTIONS.USERS, docId, userData);
      notifySimpanSuccess(
        editingUser 
          ? `Data pengguna "${userData.nama}" berhasil diperbarui!`
          : `Pengguna baru "${userData.nama}" berhasil ditambahkan!`
      );
      resetUserForm();
    } catch (err: any) {
      notifySimpanError(err?.message || "Gagal menyimpan data pengguna.");
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser.id) {
      notifyHapusError("Anda tidak dapat menghapus akun yang sedang Anda gunakan!");
      return;
    }

    const confirmed = await confirmDeleteAlert(
      "Hapus Pengguna Guru",
      `Apakah Anda yakin ingin menghapus akun guru "${u.nama}" (${u.username})?`
    );

    if (confirmed) {
      try {
        await deleteDocument(COLLECTIONS.USERS, u.id);
        notifyHapusSuccess(`Pengguna "${u.nama}" berhasil dihapus.`);
      } catch (err: any) {
        notifyHapusError(err?.message || "Gagal menghapus pengguna.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Pengaturan & Hak Akses Multi-User
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola profil sekolah, kop laporan PDF, dan akun pengguna (Admin, Guru Kelas, Guru Mapel).
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            <button
              onClick={() => setActiveSubTab("profil")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === "profil"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <School className="w-4 h-4" />
              <span>Profil Sekolah & Kop</span>
            </button>
            <button
              onClick={() => setActiveSubTab("users")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === "users"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Kelola User ({userList.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab("keamanan")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === "keamanan"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Proteksi & Lisensi</span>
            </button>
            <button
              onClick={() => setActiveSubTab("tampilan")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                activeSubTab === "tampilan"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Tema & Desain Warna</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PROFIL & KOP SEKOLAH */}
        {activeSubTab === "profil" && (
          <form onSubmit={handleSubmitConfig} className="space-y-6">
            {/* ========================================================================= */}
            {/* CARD 1: LOGO KOP SURAT & IDENTITAS VISUAL (MATCHING OFFICIAL DESIGN) */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              {/* Header with Slot Selector Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                      LOGO KOP SURAT & IDENTITAS VISUAL
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Unggah logo dinas & sekolah yang akan tercetak otomatis pada Naskah Soal Asesmen, Lembar Jawaban (LJS), Matriks Kisi-Kisi, Rubrik, SPJ, BKU, Kwitansi, dan Laporan Resmi.
                    </p>
                  </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveLogoSlot("kiri")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeLogoSlot === "kiri"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-600"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Logo Utama (Kiri)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLogoSlot("kanan")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeLogoSlot === "kanan"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-600"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Logo Kanan (Opsional)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone & Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Drag & Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`lg:col-span-2 border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-950/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {/* If current slot has a logo, show thumbnail preview */}
                  {(activeLogoSlot === "kiri" ? form.Logo_Kiri : form.Logo_Kanan) ? (
                    <div className="space-y-3">
                      <div className="w-24 h-24 mx-auto p-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden">
                        <img
                          src={activeLogoSlot === "kiri" ? form.Logo_Kiri : form.Logo_Kanan}
                          alt="Logo Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          Logo {activeLogoSlot === "kiri" ? "Utama (Kiri)" : "Kanan"} Terpasang
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Klik untuk mengganti gambar atau seret file baru ke sini
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearCurrentLogo();
                        }}
                        className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo {activeLogoSlot === "kiri" ? "Kiri" : "Kanan"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          Klik untuk pilih logo atau seret gambar ke sini
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          PNG, JPG, WEBP, atau SVG (Direkomendasikan transparan, rasio 1:1)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons & Instructions */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 cursor-pointer transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih File Logo...</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyTutWuri}
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-emerald-300 dark:border-emerald-800/60 cursor-pointer transition"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Pakai Logo Tut Wuri</span>
                  </button>

                  {/* Guidance Card */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-bold text-xs">
                      <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Petunjuk Kop Dinas:</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {activeLogoSlot === "kiri"
                        ? "Sisi kiri umumnya memuat Logo Pemda Kabupaten/Kota atau Lambang Resmi Sekolah."
                        : "Sisi kanan umumnya memuat Logo Tut Wuri Handayani atau Logo Kementerian/Sekolah."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Height Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tinggi Tampilan Logo di Kop Surat:</span>
                </div>

                <div className="flex space-x-2">
                  {[
                    { label: "Kecil (52px)", value: 52 },
                    { label: "Standar (65px)", value: 65 },
                    { label: "Besar (78px)", value: 78 }
                  ].map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, Logo_Tinggi: size.value }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        (form.Logo_Tinggi || 65) === size.value
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pratinjau Hasil Kop Surat Dinas */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="uppercase tracking-wider">PRATINJAU HASIL KOP SURAT DINAS</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKopPreview(!showKopPreview)}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showKopPreview ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>

                {showKopPreview && (
                  <div className="p-6 sm:p-8 bg-white text-black rounded-3xl border border-slate-300 shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      {/* Left Logo */}
                      <div className="w-20 shrink-0 flex items-center justify-start">
                        {form.Logo_Kiri ? (
                          <img
                            src={form.Logo_Kiri}
                            alt="Logo Kiri"
                            style={{ height: `${form.Logo_Tinggi || 65}px` }}
                            className="object-contain"
                          />
                        ) : (
                          <div
                            style={{ height: `${form.Logo_Tinggi || 65}px`, width: `${form.Logo_Tinggi || 65}px` }}
                            className="border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold text-center p-1"
                          >
                            [Logo Kiri]
                          </div>
                        )}
                      </div>

                      {/* Center Kop Text */}
                      <div className="text-center flex-1 space-y-0.5">
                        <p className="font-bold text-xs uppercase tracking-wider text-slate-900">
                          {form.Pemerintah || "PEMERINTAH KABUPATEN / KOTA"}
                        </p>
                        <p className="font-bold text-xs uppercase tracking-wider text-slate-900">
                          {form.Dinas || "DINAS PENDIDIKAN"}
                        </p>
                        <h4 className="font-black text-sm sm:text-base uppercase tracking-tight text-slate-950 my-0.5">
                          {form.Nama_Sekolah || "SD NEGERI SATUAN PENDIDIKAN"}
                        </h4>
                        <p className="text-[10px] text-slate-700 leading-tight">
                          {form.Alamat_Sekolah || "Alamat Satuan Pendidikan Lengkap"} {form.NPSN ? `• NPSN: ${form.NPSN}` : "• NPSN: -"}
                        </p>
                      </div>

                      {/* Right Logo */}
                      <div className="w-20 shrink-0 flex items-center justify-end">
                        {form.Logo_Kanan ? (
                          <img
                            src={form.Logo_Kanan}
                            alt="Logo Kanan"
                            style={{ height: `${form.Logo_Tinggi || 65}px` }}
                            className="object-contain"
                          />
                        ) : (
                          <div
                            style={{ height: `${form.Logo_Tinggi || 65}px`, width: `${form.Logo_Tinggi || 65}px` }}
                            className="border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold text-center p-1"
                          >
                            [Logo Kanan]
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Official Double Border Line */}
                    <div className="mt-4 pt-0.5 border-t-2 border-b border-black"></div>

                    <p className="text-[10px] text-slate-400 italic text-center mt-3">
                      (Pratinjau ini merefleksikan posisi Logo, nama instansi, dan alamat pada dokumen cetak kedinasan)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* CARD 2: DETAIL IDENTITAS SEKOLAH, GURU & KEPSEK */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box: Identitas Guru Pengampu */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4" />
                  Identitas Guru Utama
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Guru Lengkap & Gelar</label>
                  <input
                    type="text"
                    id="Nama_Guru"
                    value={form.Nama_Guru}
                    onChange={handleChangeConfig}
                    placeholder="Contoh: Eri Iriana Rifai, S.Kom."
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NIP Guru</label>
                  <input
                    type="text"
                    id="NIP_Guru"
                    value={form.NIP_Guru}
                    onChange={handleChangeConfig}
                    placeholder="19900101 201501 1 002 atau -"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Box: Identitas Kepsek */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <UserCheck className="w-4 h-4" />
                  Identitas Kepala Sekolah
                </h3>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Kepala Sekolah</label>
                  <input
                    type="text"
                    id="Nama_Kepsek"
                    value={form.Nama_Kepsek}
                    onChange={handleChangeConfig}
                    placeholder="Nama & Gelar Kepala Sekolah"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    id="NIP_Kepsek"
                    value={form.NIP_Kepsek}
                    onChange={handleChangeConfig}
                    placeholder="NIP Kepala Sekolah"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Box 3: Identitas Sekolah & Dinas Pendidikan */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                <School className="w-4 h-4" />
                Detail Teks Kop Surat Kedinasan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pemerintah Prov / Kab / Kota</label>
                  <input
                    type="text"
                    id="Pemerintah"
                    value={form.Pemerintah}
                    onChange={handleChangeConfig}
                    placeholder="PEMERINTAH KABUPATEN BOGOR"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dinas Pendidikan</label>
                  <input
                    type="text"
                    id="Dinas"
                    value={form.Dinas || ""}
                    onChange={handleChangeConfig}
                    placeholder="DINAS PENDIDIKAN"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Resmi Sekolah</label>
                  <input
                    type="text"
                    id="Nama_Sekolah"
                    value={form.Nama_Sekolah}
                    onChange={handleChangeConfig}
                    placeholder="SD NEGERI BABAKAN 04"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NPSN & No. Kontak / Telepon</label>
                  <input
                    type="text"
                    id="NPSN"
                    value={form.NPSN || ""}
                    onChange={handleChangeConfig}
                    placeholder="Contoh: 20200812 • Telp: (0251) 8541234"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Alamat Lengkap Sekolah</label>
                  <input
                    type="text"
                    id="Alamat_Sekolah"
                    value={form.Alamat_Sekolah}
                    onChange={handleChangeConfig}
                    placeholder="Kp. Babakan Kulon RT.05/02 Desa Babakan Kec. Ciseeng Kab. Bogor"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kota / Tempat Tanda Tangan Laporan</label>
                  <input
                    type="text"
                    id="Tempat_Tanda_Tangan"
                    value={form.Tempat_Tanda_Tangan}
                    onChange={handleChangeConfig}
                    placeholder="Kab. Bogor"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email / Website Sekolah</label>
                  <input
                    type="text"
                    id="Email_Sekolah"
                    value={form.Email_Sekolah || ""}
                    onChange={handleChangeConfig}
                    placeholder="sdnbabakan04@gmail.com"
                    className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-2xl text-xs flex items-center space-x-2 shadow-lg cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Kop & Profil ke Firebase</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: KELOLA PENGGUNA & HAK AKSES KELAS */}
        {activeSubTab === "users" && (
          <div className="space-y-6">
            {/* Header & Action Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Daftar Pengguna / Guru & Akses Kelas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Guru Kelas hanya bisa mengakses kelasnya. Guru Mapel bisa mengakses beberapa kelas. Admin dapat mengatur semuanya.
                </p>
              </div>

              {currentUser.role === "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    resetUserForm();
                    setIsAddUserOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center space-x-2 shadow-md shrink-0 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tambah Pengguna Baru</span>
                </button>
              )}
            </div>

            {/* Non-Admin Notice */}
            {currentUser.role !== "admin" && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-3">
                <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold">Akses Terbatas (Anda Login sebagai {currentUser.role === 'guru_kelas' ? 'Guru Kelas' : 'Guru Mata Pelajaran'})</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Hanya pengguna berpenilaian Admin yang dapat menambah, mengubah, atau menghapus akun pengguna guru lain.
                  </p>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3.5">Nama Guru & NIP</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Peran / Role</th>
                    <th className="p-3.5">Hak Akses Kelas</th>
                    {currentUser.role === "admin" && <th className="p-3.5 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {userList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500 text-xs">
                        Belum ada data pengguna tambahan.
                      </td>
                    </tr>
                  ) : (
                    userList.map((u) => {
                      const isSelf = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <div>{u.nama} {isSelf && <span className="text-[10px] text-blue-500 font-extrabold">(Anda)</span>}</div>
                            <div className="text-[10px] font-normal text-slate-500">NIP: {u.nip || "-"}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                            {u.username}
                          </td>
                          <td className="p-3.5">
                            {u.role === "admin" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                                👑 Admin Utama
                              </span>
                            ) : u.role === "guru_kelas" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                                👩‍🏫 Guru Kelas
                              </span>
                            ) : u.role === "guru_ekskul" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-400/20 text-purple-700 dark:text-purple-300 border border-purple-400/30">
                                🎨 Guru Ekstrakurikuler
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-400/20 text-blue-700 dark:text-blue-300 border border-blue-400/30">
                                📘 Guru Mapel
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {u.role === "admin" ? (
                              <span className="text-slate-500 text-[11px]">Semua Kelas (Akses Penuh)</span>
                            ) : u.role === "guru_kelas" ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                                Hanya Kelas: {u.kelasUtama || "Belum diatur"}
                              </span>
                            ) : u.role === "guru_ekskul" ? (
                              <div className="flex flex-wrap gap-1">
                                {u.kelasAkses && u.kelasAkses.length > 0 ? (
                                  u.kelasAkses.map((kls, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                                      {kls}
                                    </span>
                                  ))
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                                    {u.kelasUtama || "Ekskul"}
                                  </span>
                                )}
                                {u.mapelDiampu && (
                                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block w-full mt-0.5">
                                    Ekskul: {u.mapelDiampu}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {u.kelasAkses && u.kelasAkses.length > 0 ? (
                                  u.kelasAkses.map((kls, idx) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                                      {kls}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400">Belum ada kelas</span>
                                )}
                                {u.mapelDiampu && (
                                  <span className="text-[10px] text-slate-500 font-medium block w-full mt-0.5">
                                    Mapel: {u.mapelDiampu}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          {currentUser.role === "admin" && (
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditUser(u)}
                                  className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                  title="Edit Pengguna"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {!isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                                    title="Hapus Pengguna"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Form Add / Edit User */}
            {isAddUserOpen && (
              <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      {editingUser ? `Edit Pengguna: ${editingUser.nama}` : "Tambah Pengguna Baru"}
                    </h3>
                    <button
                      onClick={resetUserForm}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Username (Login)</label>
                        <input
                          type="text"
                          value={uUsername}
                          onChange={(e) => setUUsername(e.target.value)}
                          placeholder="contoh: guru.satu"
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Password</label>
                        <input
                          type="text"
                          value={uPassword}
                          onChange={(e) => setUPassword(e.target.value)}
                          placeholder="guru123"
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Guru & Gelar</label>
                        <input
                          type="text"
                          value={uNama}
                          onChange={(e) => setUNama(e.target.value)}
                          placeholder="Contoh: Budi Santoso, S.Pd."
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NIP Guru</label>
                        <input
                          type="text"
                          value={uNip}
                          onChange={(e) => setUNip(e.target.value)}
                          placeholder="NIP atau -"
                          className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Peran / Role Pengguna</label>
                      <select
                        value={uRole}
                        onChange={(e) => setURole(e.target.value as RoleUser)}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold"
                      >
                        <option value="guru_kelas">👩‍🏫 Guru Kelas (Terisolasi 1 Kelas)</option>
                        <option value="guru_mapel">📘 Guru Mata Pelajaran (Akses Multi Kelas)</option>
                        <option value="guru_ekskul">🎨 Guru Ekstrakurikuler (Kelas & Ekskul Khusus)</option>
                        <option value="admin">👑 Admin Utama (Akses Penuh Semua Kelas)</option>
                      </select>
                    </div>

                    {/* Dynamic Fields Based on Role */}
                    {uRole === "guru_kelas" && (
                      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                        <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                          Tentukan Kelas Utama Guru Ini:
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={uKelasUtama}
                            onChange={(e) => setUKelasUtama(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 font-bold text-slate-800 dark:text-white"
                          >
                            {availableClasses.map((kls) => (
                              <option key={kls} value={kls}>{kls}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Atau ketik kelas..."
                            value={customKelasInput}
                            onChange={(e) => {
                              setCustomKelasInput(e.target.value);
                              setUKelasUtama(e.target.value);
                            }}
                            className="w-1/2 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-white"
                          />
                        </div>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Guru Kelas ini tidak akan dapat melihat atau mengubah data kelas lainnya.
                        </p>
                      </div>
                    )}

                    {uRole === "guru_ekskul" && (
                      <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase mb-1">
                            Nama Kegiatan Ekstrakurikuler / Mapel Khusus
                          </label>
                          <input
                            type="text"
                            value={uMapel}
                            onChange={(e) => setUMapel(e.target.value)}
                            placeholder="Contoh: Pramuka, Futsal, Seni Musik, Paskibra"
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-slate-800 dark:text-white font-semibold"
                          />
                        </div>

                        <label className="block text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase">
                          Pilih / Tentukan Kelas Anggota Ekskul Ini:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableClasses.map((kls) => {
                            const checked = uKelasAkses.includes(kls);
                            return (
                              <button
                                key={kls}
                                type="button"
                                onClick={() => handleToggleKelasAkses(kls)}
                                className={`px-2.5 py-1.5 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                                  checked
                                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                }`}
                              >
                                <span>{kls}</span>
                                {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="+ Tambah nama kelas/kelompok khusus..."
                            value={customKelasInput}
                            onChange={(e) => setCustomKelasInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-700 text-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomKelas}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-purple-700 dark:text-purple-400">
                          Guru Ekstrakurikuler hanya dapat mengakses menu khusus (Dashboard, Siswa, Cetak QR, Mapel, Jadwal, Absensi, Nilai, Agenda, dan Laporan).
                        </p>
                      </div>
                    )}

                    {uRole === "guru_mapel" && (
                      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-3">
                        <label className="block text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">
                          Pilih Daftar Kelas yang Boleh Diakses Guru Mapel Ini:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableClasses.map((kls) => {
                            const checked = uKelasAkses.includes(kls);
                            return (
                              <button
                                key={kls}
                                type="button"
                                onClick={() => handleToggleKelasAkses(kls)}
                                className={`px-2.5 py-1.5 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                                  checked
                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                }`}
                              >
                                <span>{kls}</span>
                                {checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Class Add for Guru Mapel */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="+ Tambah nama kelas lain..."
                            value={customKelasInput}
                            onChange={(e) => setCustomKelasInput(e.target.value)}
                            className="flex-1 px-3 py-1.5 border rounded-xl bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 text-slate-800 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomKelas}
                            className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-xl"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-1">
                            Mata Pelajaran yang Diampu
                          </label>
                          <input
                            type="text"
                            value={uMapel}
                            onChange={(e) => setUMapel(e.target.value)}
                            placeholder="Contoh: Informatika / Matematika"
                            className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-700 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center space-x-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>Simpan Pengguna</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROTEKSI & LISENSI HAK CIPTA APLIKASI */}
        {activeSubTab === "keamanan" && (
          <div className="space-y-6">
            {/* CARD 1: STATUS DINDING KEAMANAN APLIKASI */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-indigo-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/80 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base uppercase tracking-wide flex items-center gap-2">
                      SISTEM PROTEKSI HAK CIPTA & REVERSE-ENGINEERING
                    </h3>
                    <p className="text-xs text-indigo-200">
                      Sistem proteksi otomatis berlapis untuk mencegah aplikasi dicopy, di-inspect, atau di-remix oleh pihak luar.
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs">
                  <Check className="w-3.5 h-3.5" />
                  <span>PROTEKSI AKTIF</span>
                </span>
              </div>

              {/* Grid Status Proteksi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-indigo-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-400" />
                      1. Anti Klik Kanan & Inspect Element
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      TERKUNCI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Mematikan menu konteks (*right-click*) pada elemen UI umum, mencegah pengunjung meng-copy layout atau meng-inspect komponen.
                  </p>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-indigo-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                      <FileCode2 className="w-4 h-4 text-amber-400" />
                      2. Blokir Shortcut DevTools (F12, Ctrl+U, Ctrl+Shift+I)
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      TERKUNCI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Menghalangi pemanggilan jendela *Developer Tools*, *Console*, maupun tombol pintas *View Source* halaman web.
                  </p>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-indigo-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      3. Minifikasi Bundle JS & Source Map False
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      PRODUCTION BUILD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Kode TypeScript terkompresi tanpa menyertakan `.map` (*source map*), sehingga kode sumber asli tidak dapat direkonstruksi.
                  </p>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-indigo-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      4. Server-Side API Proxy & Firestore Rules
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      TERHUBUNG
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Logika pemrosesan AI, API Key, dan database terlindungi di server backend (`server.ts`) serta dibatasi oleh `firestore.rules`.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: GENERATOR & VERIFIKASI LISENSI SEKOLAH */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    LISENSI AKTIVASI APLIKASI SEKOLAH
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kelola dan kunci hak penggunaan aplikasi resmi untuk instance sekolah Anda.
                  </p>
                </div>
              </div>

              {/* Status Lisensi */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                    STATUS LISENSI APLIKASI
                  </span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {verifySchoolLicenseKey(licenseInput) ? "LISENSI RESMI TERVERIFIKASI" : "LISENSI DEFAULT AKTIF (VERSI PENGEMBANG)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Terdaftar atas nama: <strong className="text-slate-800 dark:text-slate-200">{config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newKey = generateSchoolLicenseKey(config.Nama_Sekolah || "SEKOLAH");
                    setGeneratedLicense(newKey);
                    notifySimpanSuccess("Kode Serial Lisensi Baru Berhasil Dihasilkan!");
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-md transition-transform hover:scale-105 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Generate Serial Lisensi Baru</span>
                </button>
              </div>

              {/* Input Kode Serial */}
              {generatedLicense && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-2 animate-fadeIn">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    🔑 Kode Serial Lisensi Sekolah Baru Anda:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLicense}
                      className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-900 dark:text-amber-200 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLicenseInput(generatedLicense);
                        localStorage.setItem("edadmin_school_license", generatedLicense);
                        notifySimpanSuccess("Kode Serial Lisensi Disimpan!");
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      Gunakan Serial Ini
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PENGATURAN TEMA, WARNA & TAMPILAN APLIKASI */}
        {activeSubTab === "tampilan" && (
          <div className="space-y-6">
            {/* CARD HEADER TEMA */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 border border-indigo-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/80 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
                    <Palette className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base uppercase tracking-wide flex items-center gap-2">
                      PENGATURAN TEMA, DESAIN WARNA & TAMPILAN APLIKASI
                    </h3>
                    <p className="text-xs text-indigo-200">
                      Ubah skema warna, jenis font, dan gaya komponen sesuai selera Anda. Warna yang Anda pilih akan tersimpan permanen di cloud dan otomatis tampil ke seluruh pengguna yang membuka link aplikasi ini.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSavingTheme}
                  onClick={async () => {
                    try {
                      setIsSavingTheme(true);
                      const updatedConfig: Pengaturan = {
                        ...config,
                        themeConfig: {
                          presetId: selectedPreset,
                          primaryColor: customPrimaryColor,
                          primaryHover: customPrimaryHover,
                          fontFamily: selectedFont,
                          borderRadius: selectedRadius
                        }
                      };
                      await savePengaturan(updatedConfig);
                      applyGlobalTheme(updatedConfig.themeConfig);
                      notifySimpanSuccess("Tema & Warna Aplikasi Berhasil Disimpan & Diterapkan ke Seluruh Pengguna Link!");
                    } catch (err: any) {
                      notifySimpanError(err?.message || "Gagal menyimpan tema warna.");
                    } finally {
                      setIsSavingTheme(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center space-x-2 shadow-lg transition-transform hover:scale-105 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingTheme ? "Menyimpan Tema..." : "Simpan & Terapkan Warna ke Seluruh Link"}</span>
                </button>
              </div>

              {/* Grid 1: PRESET TEMA TERPOPULER */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  1. PILIH KOLEKSI PRESET WARNA SIAP PAKAI
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => {
                          setSelectedPreset(preset.id);
                          setCustomPrimaryColor(preset.primaryColor);
                          setCustomPrimaryHover(preset.primaryHover);
                          applyGlobalTheme({
                            presetId: preset.id,
                            primaryColor: preset.primaryColor,
                            primaryHover: preset.primaryHover,
                            fontFamily: selectedFont,
                            borderRadius: selectedRadius
                          });
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                          isSelected
                            ? "bg-indigo-900/80 border-amber-400 shadow-lg shadow-indigo-950/50 ring-2 ring-amber-400/50"
                            : "bg-slate-800/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white truncate">{preset.name}</span>
                          {isSelected && (
                            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> AKTIF
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">{preset.desc}</p>

                        {/* Color Dots Bar */}
                        <div className="flex items-center space-x-1.5 pt-1">
                          {preset.previewColors.map((color, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full border border-white/20 shadow-xs"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <span className="text-[10px] font-mono font-bold text-slate-400 ml-2">
                            {preset.primaryColor}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CARD 2: KUSTOMISASI WARNA KHUSUS & HEX COLOR PICKER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                    2. KUSTOMISASI WARNA UTAMA (HEX & COLOR PICKER)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Atur kode warna spesifik sesuai brand atau keinginan Anda.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Primary Color Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customPrimaryColor }} />
                    Warna Utama Akses Tombol / Highlight (Primary)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPrimaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomPrimaryColor(val);
                        setSelectedPreset("custom");
                        applyGlobalTheme({
                          presetId: "custom",
                          primaryColor: val,
                          primaryHover: customPrimaryHover,
                          fontFamily: selectedFont,
                          borderRadius: selectedRadius
                        });
                      }}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={customPrimaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomPrimaryColor(val);
                        setSelectedPreset("custom");
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                          applyGlobalTheme({
                            presetId: "custom",
                            primaryColor: val,
                            primaryHover: customPrimaryHover,
                            fontFamily: selectedFont,
                            borderRadius: selectedRadius
                          });
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 uppercase"
                    />
                  </div>
                </div>

                {/* Primary Hover Color Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customPrimaryHover }} />
                    Warna Tombol Saat Di-Hover (Primary Hover)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPrimaryHover}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomPrimaryHover(val);
                        setSelectedPreset("custom");
                        applyGlobalTheme({
                          presetId: "custom",
                          primaryColor: customPrimaryColor,
                          primaryHover: val,
                          fontFamily: selectedFont,
                          borderRadius: selectedRadius
                        });
                      }}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={customPrimaryHover}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomPrimaryHover(val);
                        setSelectedPreset("custom");
                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                          applyGlobalTheme({
                            presetId: "custom",
                            primaryColor: customPrimaryColor,
                            primaryHover: val,
                            fontFamily: selectedFont,
                            borderRadius: selectedRadius
                          });
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: FONT FAMILY & BORDER RADIUS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* FONT SELECTION */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                  3. JENIS FONT / TIPOGRAFI APLIKASI
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'inter', name: 'Inter (Standar)', fontClass: 'font-sans' },
                    { id: 'jakarta', name: 'Plus Jakarta Sans', fontClass: 'font-serif' },
                    { id: 'outfit', name: 'Outfit (Modern)', fontClass: 'font-mono' },
                    { id: 'poppins', name: 'Poppins (Bulat Ceria)', fontClass: 'font-sans' }
                  ].map((fontItem) => {
                    const isSelected = selectedFont === fontItem.id;
                    return (
                      <button
                        key={fontItem.id}
                        type="button"
                        onClick={() => {
                          const f = fontItem.id as any;
                          setSelectedFont(f);
                          applyGlobalTheme({
                            presetId: selectedPreset,
                            primaryColor: customPrimaryColor,
                            primaryHover: customPrimaryHover,
                            fontFamily: f,
                            borderRadius: selectedRadius
                          });
                        }}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 font-extrabold shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="text-xs">{fontItem.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Siswa & Laporan</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BORDER RADIUS SELECTION */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wide">
                  4. KELENGKUNGAN SUDUT ELEMEN (BORDER RADIUS)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'sharp', name: 'Tajam (4px)', sampleClass: 'rounded-xs' },
                    { id: 'medium', name: 'Sedang (12px)', sampleClass: 'rounded-xl' },
                    { id: 'rounded', name: 'Bulat (20px)', sampleClass: 'rounded-2xl' },
                    { id: 'full', name: 'Pill / Oval', sampleClass: 'rounded-full' }
                  ].map((rad) => {
                    const isSelected = selectedRadius === rad.id;
                    return (
                      <button
                        key={rad.id}
                        type="button"
                        onClick={() => {
                          const r = rad.id as any;
                          setSelectedRadius(r);
                          applyGlobalTheme({
                            presetId: selectedPreset,
                            primaryColor: customPrimaryColor,
                            primaryHover: customPrimaryHover,
                            fontFamily: selectedFont,
                            borderRadius: r
                          });
                        }}
                        className={`p-3 border text-left cursor-pointer transition-all ${rad.sampleClass} ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 font-extrabold shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="text-xs">{rad.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Kartu & Tombol</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  PREVIEW TAMPILAN INTERAKTIF SEMENTARA
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Warna: {customPrimaryColor} | Radius: {selectedRadius}
                </span>
              </div>

              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-300 ml-2">Aplikasi Guru SD</span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary-theme px-3 py-1 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Tombol Utama
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    Contoh Status Laporan Nilai Siswa
                  </span>
                  <span
                    className="px-2.5 py-1 text-[10px] font-black text-white rounded-lg"
                    style={{ backgroundColor: customPrimaryColor }}
                  >
                    TERSIMPAN
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

 

        {/* Zona Bahaya / Reset Total (Hanya untuk Admin) */}
        {onNavigateToReset && currentUser.role === "admin" && (
          <div className="pt-6 border-t border-red-200 dark:border-red-900/50 space-y-3">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/40">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-red-900 dark:text-red-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  ZONA BAHAYA: Hapus / Kosongkan Semua Isi Database
                </h4>
                <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                  Hapus secara permanen seluruh siswa, absensi, nilai, agenda, bimbingan, dan data sekolah untuk digunakan dari nol.
                </p>
              </div>

              <button
                type="button"
                onClick={onNavigateToReset}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shrink-0 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Buka Menu Hapus Database</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
