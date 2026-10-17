import React, { useState, useEffect } from "react";
import { PieChart, ClipboardCheck, Star, Sparkles, Menu, AlertTriangle } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginView } from "./components/LoginView";
import { DashboardView } from "./components/DashboardView";
import { KelolaSiswaView } from "./components/KelolaSiswaView";
import { CetakKartuQRView } from "./components/CetakKartuQRView";
import { KelolaMapelView } from "./components/KelolaMapelView";
import { JadwalMengajarView } from "./components/JadwalMengajarView";
import { InputAbsensiView } from "./components/InputAbsensiView";
import { InputPenilaianView } from "./components/InputPenilaianView";
import { KuisInteraktifView } from "./components/KuisInteraktifView";
import { PortofolioP5View } from "./components/PortofolioP5View";
import { CetakRaportView } from "./components/CetakRaportView";
import { BankTpView, INITIAL_DEFAULT_TPS } from "./components/BankTpView";
import { AgendaMengajarView } from "./components/AgendaMengajarView";
import { BimbinganWaliView } from "./components/BimbinganWaliView";
import { TabunganKelasView } from "./components/TabunganKelasView";
import { AsetKelasView } from "./components/AsetKelasView";
import { StokOpnameBhpView } from "./components/StokOpnameBhpView";
import { DownloadPerangkatAjarView } from "./components/DownloadPerangkatAjarView";
import { BukuIndukKelasView } from "./components/BukuIndukKelasView";
import { AbsenKedatanganPagiView } from "./components/AbsenKedatanganPagiView";
import { GeneratorSoalAIView } from "./components/GeneratorSoalAIView";
import { GeneratorPerangkatAjarAIView } from "./components/GeneratorPerangkatAjarAIView";
import { ModulAjarAIView } from "./components/ModulAjarAIView";
import { AsistenGuruAIView } from "./components/AsistenGuruAIView";
import { GeneratorLkpdAIView } from "./components/GeneratorLkpdAIView";
import { GeneratorAILainnyaView } from "./components/GeneratorAILainnyaView";
import { PusatLaporanView } from "./components/PusatLaporanView";
import { PengaturanView } from "./components/PengaturanView";
import { ResetDatabaseView } from "./components/ResetDatabaseView";
import { GoogleSheetsBackupView } from "./components/GoogleSheetsBackupView";

import { 
  subscribeCollection, 
  subscribePengaturan, 
  batchSaveDocuments, 
  savePengaturan,
  onQuotaExceededChange,
  COLLECTIONS 
} from "./lib/firebase";
import { initMidnightAutoRefresh, onDayRollover, getLocalDateStr } from "./lib/dateUtils";
import { initSecurityProtection, cleanupSecurityProtection } from "./lib/securityProtection";
import { applyGlobalTheme } from "./lib/themeManager";
import { 
  scheduleSilentBackgroundBackup, 
  autoFallbackFromGoogleSheetsOrSnapshot 
} from "./lib/autoBackupManager";

import { 
  Siswa, 
  Mapel, 
  Jadwal, 
  LogAbsensi, 
  DataNilai, 
  JurnalAgenda, 
  SiswaBimbingan, 
  BimbinganWali, 
  TabunganKelas,
  AsetKelas,
  PeminjamanAset,
  BhpKelas,
  PemakaianBhp,
  BukuIndukSiswa,
  LogKedatangan,
  BankSoalPaket,
  BankTpItem,
  Pengaturan,
  User 
} from "./types";

const DEFAULT_CONFIG: Pengaturan = {
  Nama_Guru: "Eri Iriana Rifai, S.Kom.",
  NIP_Guru: "-",
  Pemerintah: "PEMERINTAH KABUPATEN BOGOR",
  Nama_Sekolah: "SD NEGERI BABAKAN 04",
  Alamat_Sekolah: "Kp. Babakan Kulon RT.05/02 Desa Babakan Kec. Ciseeng Kab. Bogor",
  Nama_Kepsek: "SUBUR, S.Pd.SD.",
  NIP_Kepsek: "197002111993081001",
  Tempat_Tanda_Tangan: "Kab. Bogor",
  Logo_Kiri: "",
  Logo_Kanan: ""
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("edadmin_active_tab");
      if (saved) return saved;
    } catch {}
    return "dashboard";
  });

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    try {
      localStorage.setItem("edadmin_active_tab", newTab);
    } catch {}
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("edadmin_theme");
      if (saved) return saved === "dark";
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    } catch {
      return false;
    }
  });
  const [isConnected, setIsConnected] = useState(false);

  // User Auth State
  const [userList, setUserList] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("edadmin_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Current active date synced with midnight auto-refresh
  const [currentAppDate, setCurrentAppDate] = useState<string>(() => getLocalDateStr());

  // Automatic midnight and background resume day rollover
  useEffect(() => {
    const cleanupWatcher = initMidnightAutoRefresh();
    const unsubRollover = onDayRollover((newDate) => {
      setCurrentAppDate(newDate);
    });

    // Initialize Client Security Protection (Block DevTools shortcuts, Context Menu, View Source)
    initSecurityProtection();

    return () => {
      cleanupWatcher();
      unsubRollover();
      cleanupSecurityProtection();
    };
  }, []);

  // Sync dark class on documentElement and body for Tailwind CSS theme switching
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add("dark");
      body.classList.add("dark");
      localStorage.setItem("edadmin_theme", "dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
      localStorage.setItem("edadmin_theme", "light");
    }
  }, [isDarkMode]);

  // Apply saved global theme on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("edadmin_theme_config");
      if (cached) {
        applyGlobalTheme(JSON.parse(cached));
      }
    } catch {}
  }, []);

  // Firestore Data Collections
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [absensiList, setAbsensiList] = useState<LogAbsensi[]>([]);
  const [nilaiList, setNilaiList] = useState<DataNilai[]>([]);
  const [agendaList, setAgendaList] = useState<JurnalAgenda[]>([]);
  const [siswaBimbinganList, setSiswaBimbinganList] = useState<SiswaBimbingan[]>([]);
  const [bimbinganList, setBimbinganList] = useState<BimbinganWali[]>([]);
  const [tabunganList, setTabunganList] = useState<TabunganKelas[]>([]);
  const [asetList, setAsetList] = useState<AsetKelas[]>([]);
  const [peminjamanList, setPeminjamanList] = useState<PeminjamanAset[]>([]);
  const [bhpList, setBhpList] = useState<BhpKelas[]>([]);
  const [pemakaianBhpList, setPemakaianBhpList] = useState<PemakaianBhp[]>([]);
  const [bukuIndukList, setBukuIndukList] = useState<BukuIndukSiswa[]>([]);
  const [logKedatanganList, setLogKedatanganList] = useState<LogKedatangan[]>([]);
  const [bankSoalList, setBankSoalList] = useState<BankSoalPaket[]>([]);
  const [bankTpList, setBankTpList] = useState<BankTpItem[]>(() => {
    try {
      const cached = localStorage.getItem("edadmin_bank_tp_cache");
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    return onQuotaExceededChange((exceeded) => {
      setIsQuotaExceeded(exceeded);
      if (exceeded) {
        autoFallbackFromGoogleSheetsOrSnapshot();
      }
    });
  }, []);

  // Initial load check: if collections remain empty due to quota or new domain, trigger auto-fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (siswaList.length === 0 && userList.length === 0) {
        autoFallbackFromGoogleSheetsOrSnapshot();
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const [config, setConfig] = useState<Pengaturan>(DEFAULT_CONFIG);

  useEffect(() => {
    if (config?.themeConfig) {
      applyGlobalTheme(config.themeConfig);
    }
  }, [config?.themeConfig]);

  // Silent Background Auto-Backup to Google Sheets / Snapshot whenever data updates
  useEffect(() => {
    if (siswaList.length > 0 || userList.length > 0 || absensiList.length > 0) {
      scheduleSilentBackgroundBackup({
        siswaList,
        userList,
        mapelList,
        jadwalList,
        absensiList,
        nilaiList,
        agendaList,
        tabunganList,
        config
      });
    }
  }, [siswaList, userList, mapelList, jadwalList, absensiList, nilaiList, agendaList, tabunganList, config]);

  // Subscribe to Firebase real-time collections
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    unsubs.push(subscribeCollection<User>(COLLECTIONS.USERS, (data) => {
      setUserList(data);
      setIsConnected(true);
    }));

    unsubs.push(subscribeCollection<Siswa>(COLLECTIONS.SISWA, (data) => {
      setSiswaList(data);
      setIsConnected(true);
    }));

    unsubs.push(subscribeCollection<Mapel>(COLLECTIONS.MAPEL, (data) => {
      setMapelList(data);
    }));

    unsubs.push(subscribeCollection<Jadwal>(COLLECTIONS.JADWAL, (data) => {
      setJadwalList(data);
    }));

    unsubs.push(subscribeCollection<LogAbsensi>(COLLECTIONS.LOG_ABSENSI, (data) => {
      setAbsensiList(data);
    }));

    unsubs.push(subscribeCollection<DataNilai>(COLLECTIONS.DATA_NILAI, (data) => {
      setNilaiList(data);
    }));

    unsubs.push(subscribeCollection<JurnalAgenda>(COLLECTIONS.JURNAL_AGENDA, (data) => {
      setAgendaList(data);
    }));

    unsubs.push(subscribeCollection<SiswaBimbingan>(COLLECTIONS.SISWA_BIMBINGAN, (data) => {
      setSiswaBimbinganList(data);
    }));

    unsubs.push(subscribeCollection<BimbinganWali>(COLLECTIONS.BIMBINGAN_WALI, (data) => {
      setBimbinganList(data);
    }));

    unsubs.push(subscribeCollection<TabunganKelas>(COLLECTIONS.TABUNGAN_KELAS, (data) => {
      setTabunganList(data);
    }));

    unsubs.push(subscribeCollection<AsetKelas>(COLLECTIONS.ASET_KELAS, (data) => {
      setAsetList(data);
    }));

    unsubs.push(subscribeCollection<PeminjamanAset>(COLLECTIONS.PEMINJAMAN_ASET, (data) => {
      setPeminjamanList(data);
    }));

    unsubs.push(subscribeCollection<BhpKelas>(COLLECTIONS.BHP_KELAS, (data) => {
      setBhpList(data);
    }));

    unsubs.push(subscribeCollection<PemakaianBhp>(COLLECTIONS.PEMAKAIAN_BHP, (data) => {
      setPemakaianBhpList(data);
    }));

    unsubs.push(subscribeCollection<BukuIndukSiswa>(COLLECTIONS.BUKU_INDUK, (data) => {
      setBukuIndukList(data);
    }));

    unsubs.push(subscribeCollection<LogKedatangan>(COLLECTIONS.PRESENSI_KEDATANGAN, (data) => {
      setLogKedatanganList(data);
    }));

    unsubs.push(subscribeCollection<BankSoalPaket>(COLLECTIONS.BANK_SOAL, (data) => {
      setBankSoalList(data);
    }));

    unsubs.push(subscribeCollection<BankTpItem>(COLLECTIONS.BANK_TP, (data) => {
      setBankTpList(data);
      try {
        localStorage.setItem("edadmin_bank_tp_cache", JSON.stringify(data));
      } catch {}
    }));

    unsubs.push(subscribePengaturan((cfg) => {
      if (cfg && Object.keys(cfg).length > 0) {
        setConfig((prev) => ({ ...prev, ...cfg }));
      }
    }));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Seed initial users if USERS collection is empty AND never seeded before
  useEffect(() => {
    const seedUsers = async () => {
      if (
        localStorage.getItem("edadmin_has_initial_seeded") === "true" ||
        localStorage.getItem("edadmin_database_cleared") === "true" ||
        config?.hasInitialSeeded === true ||
        config?.isDatabaseCleared === true
      ) {
        return;
      }

      if (userList.length === 0 && isConnected) {
        const sampleUsers: User[] = [
          {
            id: "u_admin",
            username: "admin",
            password: "admin123",
            nama: "Administrator Utama",
            role: "admin"
          },
          {
            id: "u_guru1",
            username: "erii",
            password: "guru123",
            nama: "Eri Iriana Rifai, S.Kom.",
            role: "guru_kelas",
            kelasUtama: "VII A"
          },
          {
            id: "u_guru2",
            username: "yefri",
            password: "guru123",
            nama: "Drs. Yefri Haryanto",
            role: "guru_mapel",
            kelasAkses: ["VII A", "VII B"]
          }
        ];
        await batchSaveDocuments(COLLECTIONS.USERS, sampleUsers);
      }
    };
    seedUsers();
  }, [userList.length, isConnected, config?.hasInitialSeeded, config?.isDatabaseCleared]);

  // Seed sample initial data ONLY ON FIRST BOOT when database is 100% brand new
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (
        localStorage.getItem("edadmin_has_initial_seeded") === "true" ||
        localStorage.getItem("edadmin_database_cleared") === "true" ||
        config?.hasInitialSeeded === true ||
        config?.isDatabaseCleared === true
      ) {
        return;
      }

      // Only seed if ALL core collections are still empty after 3.5 seconds
      if (
        isConnected &&
        siswaList.length === 0 &&
        mapelList.length === 0 &&
        jadwalList.length === 0
      ) {
        const sampleSiswa: Siswa[] = [
          { id: "1001", nisn: "0012345678", nama: "Ahmad Fulan", kelas: "VII A" },
          { id: "1002", nisn: "0012345679", nama: "Siti Aminah", kelas: "VII A" },
          { id: "1003", nisn: "0012345680", nama: "Budi Pratama", kelas: "VII B" },
          { id: "1004", nisn: "0012345681", nama: "Rizky Febrian", kelas: "VII B" }
        ];
        await batchSaveDocuments(COLLECTIONS.SISWA, sampleSiswa);

        const sampleMapel: Mapel[] = [
          { id: "m1", namaMapel: "Informatika", semester: "Ganjil", tahunAjaran: "2026/2027" },
          { id: "m2", namaMapel: "Matematika", semester: "Ganjil", tahunAjaran: "2026/2027" },
          { id: "m3", namaMapel: "Bahasa Indonesia", semester: "Ganjil", tahunAjaran: "2026/2027" },
          { id: "m4", namaMapel: "IPA Terpadu", semester: "Ganjil", tahunAjaran: "2026/2027" }
        ];
        await batchSaveDocuments(COLLECTIONS.MAPEL, sampleMapel);

        const sampleJadwal: Jadwal[] = [
          { id: "j1", hari: "Senin", jam: "07:30 - 09:00", kelas: "VII A", mapel: "Informatika" },
          { id: "j2", hari: "Selasa", jam: "09:15 - 10:45", kelas: "VII B", mapel: "Informatika" }
        ];
        await batchSaveDocuments(COLLECTIONS.JADWAL, sampleJadwal);

        if (!config.Nama_Guru) {
          await savePengaturan({ ...DEFAULT_CONFIG, hasInitialSeeded: true });
        } else {
          await savePengaturan({ ...config, hasInitialSeeded: true });
        }

        try {
          localStorage.setItem("edadmin_has_initial_seeded", "true");
        } catch {}
      } else if (isConnected && (siswaList.length > 0 || mapelList.length > 0)) {
        try {
          localStorage.setItem("edadmin_has_initial_seeded", "true");
        } catch {}
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isConnected, siswaList.length, mapelList.length, config?.hasInitialSeeded, config?.isDatabaseCleared]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("edadmin_user_session", JSON.stringify(user));
  };

  // Tab safety check for guru_ekskul
  useEffect(() => {
    if (currentUser?.role === "guru_ekskul") {
      const allowedEkskulTabs = [
        "dashboard", "siswa", "kartu", "mapel", "jadwal", "absensi", "penilaian", "bank_tp", "agenda", "laporan"
      ];
      if (!allowedEkskulTabs.includes(activeTab)) {
        handleTabChange("dashboard");
      }
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("edadmin_user_session");
  };

  const handleSuccessReset = () => {
    setSiswaList([]);
    setMapelList([]);
    setJadwalList([]);
    setAbsensiList([]);
    setNilaiList([]);
    setAgendaList([]);
    setSiswaBimbinganList([]);
    setBimbinganList([]);
    setTabunganList([]);
    setAsetList([]);
    setPeminjamanList([]);
  };

  // If user is not logged in, present Login Screen
  if (!currentUser) {
    return (
      <div className={`min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors ${isDarkMode ? "dark" : ""}`}>
        <LoginView
          userList={userList}
          onLoginSuccess={handleLoginSuccess}
          config={config}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors ${isDarkMode ? "dark" : ""}`}>
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        config={config}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          activeTab={activeTab}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isDarkMode={isDarkMode}
          onSetDarkMode={(isDark) => setIsDarkMode(isDark)}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          isConnected={isConnected}
          config={config}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {isQuotaExceeded && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />
              <span>
                <strong>Info Kuota Google Cloud Firestore:</strong> Batas pembacaan gratis harian (50.000 baca/hari) sedang tercapai di server Google Cloud. Semua data tersimpan aman dan tidak hilang. Aplikasi otomatis beroperasi menggunakan <em>Cache Lokal</em>. Kuota gratis harian akan di-reset otomatis oleh Google Cloud pada pukul 14.00 WIB (00:00 Pacific Time).
              </span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 custom-scrollbar pb-24 lg:pb-8">
          {activeTab === "dashboard" && (
            <DashboardView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              jadwalList={jadwalList}
              onNavigate={(tab) => handleTabChange(tab)}
              currentUser={currentUser}
            />
          )}

          {activeTab === "absen_kedatangan" && (
            <AbsenKedatanganPagiView
              siswaList={siswaList}
              logKedatanganList={logKedatanganList}
              absensiList={absensiList}
              currentUser={currentUser}
              config={config}
            />
          )}

          {activeTab === "siswa" && (
            <KelolaSiswaView
              siswaList={siswaList}
              bukuIndukList={bukuIndukList}
              mapelList={mapelList}
              currentUser={currentUser}
            />
          )}

          {activeTab === "kartu" && (
            <CetakKartuQRView
              siswaList={siswaList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "mapel" && <KelolaMapelView mapelList={mapelList} />}

          {activeTab === "jadwal" && (
            <JadwalMengajarView
              jadwalList={jadwalList}
              mapelList={mapelList}
              siswaList={siswaList}
              currentUser={currentUser}
            />
          )}

          {activeTab === "absensi" && (
            <InputAbsensiView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              logKedatanganList={logKedatanganList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "penilaian" && (
            <InputPenilaianView
              siswaList={siswaList}
              mapelList={mapelList}
              nilaiList={nilaiList}
              bankTpList={bankTpList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "kuis_interaktif" && (
            <KuisInteraktifView
              siswaList={siswaList}
              mapelList={mapelList}
              dataNilaiList={nilaiList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "portofolio_p5" && (
            <PortofolioP5View
              siswaList={siswaList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "bank_tp" && (
            <BankTpView
              bankTpList={bankTpList}
              mapelList={mapelList}
              currentUser={currentUser}
              config={config}
              onNavigateToRaport={() => handleTabChange("raport")}
            />
          )}

          {activeTab === "raport" && (
            <CetakRaportView
              siswaList={siswaList}
              mapelList={mapelList}
              dataNilaiList={nilaiList}
              logAbsensiList={absensiList}
              bukuIndukList={bukuIndukList}
              bankTpList={bankTpList}
              config={config}
              currentUser={currentUser}
              onNavigateToBankTp={() => handleTabChange("bank_tp")}
            />
          )}

          {activeTab === "agenda" && (
            <AgendaMengajarView
              agendaList={agendaList}
              mapelList={mapelList}
              siswaList={siswaList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "bimbingan" && (
            <BimbinganWaliView
              bimbinganList={bimbinganList}
              siswaBimbinganList={siswaBimbinganList}
              siswaList={siswaList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "tabungan" && (
            <TabunganKelasView
              tabunganList={tabunganList}
              siswaList={siswaList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "buku_induk" && (
            <BukuIndukKelasView
              siswaList={siswaList}
              bukuIndukList={bukuIndukList}
              mapelList={mapelList}
              dataNilaiList={nilaiList}
              logAbsensiList={absensiList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "aset_kelas" && (
            <AsetKelasView
              asetList={asetList}
              peminjamanList={peminjamanList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "stok_bhp" && (
            <StokOpnameBhpView
              bhpList={bhpList}
              pemakaianList={pemakaianBhpList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "downloadperangkat" && <DownloadPerangkatAjarView />}

          {activeTab === "generator_soal" && (
            <GeneratorSoalAIView
              config={config}
              currentUser={currentUser}
              bankSoalList={bankSoalList}
            />
          )}

          {activeTab === "perangkat_ai" && <GeneratorPerangkatAjarAIView config={config} />}

          {activeTab === "modulai" && <ModulAjarAIView config={config} />}

          {activeTab === "asistenai" && <AsistenGuruAIView config={config} />}

          {activeTab === "lkpdai" && <GeneratorLkpdAIView config={config} />}

          {activeTab === "ailainnya" && <GeneratorAILainnyaView />}

          {activeTab === "cadangan_sheets" && (
            <GoogleSheetsBackupView
              siswaList={siswaList}
              userList={userList}
              mapelList={mapelList}
              jadwalList={jadwalList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              agendaList={agendaList}
              tabunganList={tabunganList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "laporan" && (
            <PusatLaporanView
              siswaList={siswaList}
              mapelList={mapelList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              agendaList={agendaList}
              bimbinganList={bimbinganList}
              config={config}
              currentUser={currentUser}
            />
          )}

          {activeTab === "pengaturan" && (
            <PengaturanView
              config={config}
              userList={userList}
              currentUser={currentUser}
              onNavigateToReset={() => handleTabChange("resetdb")}
              onNavigateToSheets={() => handleTabChange("cadangan_sheets")}
            />
          )}

          {activeTab === "resetdb" && (
            <ResetDatabaseView onSuccessReset={handleSuccessReset} />
          )}
        </main>

        {/* Native Mobile Bottom Navigation Bar */}
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-30 lg:hidden px-2 py-1.5 pb-safe shadow-lg flex items-center justify-around transition-colors"
          aria-label="Navigasi Bawah Mobile"
        >
          <button
            onClick={() => handleTabChange("dashboard")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "dashboard"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <PieChart className={`w-5 h-5 ${activeTab === "dashboard" ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Beranda</span>
          </button>

          <button
            onClick={() => handleTabChange("absensi")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "absensi"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ClipboardCheck className={`w-5 h-5 ${activeTab === "absensi" ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Absensi</span>
          </button>

          <button
            onClick={() => handleTabChange("penilaian")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "penilaian"
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Star className={`w-5 h-5 ${activeTab === "penilaian" ? "scale-110" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Nilai</span>
          </button>

          <button
            onClick={() => handleTabChange("perangkat_ai")}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all active:scale-90 ${
              activeTab === "perangkat_ai" || activeTab === "modulai" || activeTab === "asistenai"
                ? "text-amber-500 dark:text-amber-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
            }`}
          >
            <Sparkles className={`w-5 h-5 ${activeTab === "perangkat_ai" || activeTab === "modulai" || activeTab === "asistenai" ? "scale-110 text-amber-500" : ""}`} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Asisten AI</span>
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-90"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight truncate">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
