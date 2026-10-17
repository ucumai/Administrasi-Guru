import React, { useState, useEffect } from "react";
import { 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  Trash2, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Database,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { 
  getSyncMode, 
  setSyncMode, 
  getQuotaStats, 
  triggerForceRefresh, 
  clearAllLocalCache,
  onStatsChange,
  QuotaStats,
  SyncMode 
} from "../lib/firestoreOptimizer";
import { notifySimpanSuccess, notifySimpanError } from "../lib/swal";

export const FirestoreQuotaOptimizerCard: React.FC<{
  onNavigateToSheets?: () => void;
  compactMode?: boolean;
}> = ({ onNavigateToSheets, compactMode = false }) => {
  const [stats, setStats] = useState<QuotaStats>(getQuotaStats());
  const [currentMode, setCurrentMode] = useState<SyncMode>(getSyncMode());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = onStatsChange((newStats) => {
      setStats(newStats);
      setCurrentMode(newStats.mode);
    });
    return () => unsub();
  }, []);

  const handleModeChange = (newMode: SyncMode) => {
    setCurrentMode(newMode);
    setSyncMode(newMode);
    notifySimpanSuccess(
      newMode === "auto" 
        ? "Mode Otomatis Anti-Limit Aktif! Penghematan kuota berjalan secara cerdas."
        : newMode === "zero_cost"
        ? "Mode Zero-Cost Aktif! Pembacaan cloud dihentikan (100% cache lokal)."
        : "Mode Realtime Standar Aktif."
    );
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      triggerForceRefresh();
      await new Promise((resolve) => setTimeout(resolve, 800));
      notifySimpanSuccess("Berhasil memperbarui dan menyinkronkan data dari cloud!");
    } catch {
      notifySimpanError("Gagal menyinkronkan data dari cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm("Apakah Anda yakin ingin membersihkan cache lokal? Data tersimpan di Google Cloud tetap aman dan akan diunduh ulang saat dibutuhkan.")) {
      setIsSyncing(true);
      try {
        clearAllLocalCache();
        triggerForceRefresh();
        await new Promise((resolve) => setTimeout(resolve, 800));
        notifySimpanSuccess("Cache lokal berhasil dibersihkan dan diperbarui!");
      } catch {
        notifySimpanError("Gagal membersihkan cache lokal.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const formattedLastSync = stats.lastSyncTime 
    ? new Date(stats.lastSyncTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Belum pernah";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Optimasi Efisiensi Firestore (Zero-Cost & Anti-Limit)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Fitur Aktif
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cegah kuota harian Firestore gratisan (50.000 read/hari) habis dengan Cache Cerdas & Sync On-Demand.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
          </button>
        </div>
      </div>

      {/* Cloud Status Banner */}
      {stats.isQuotaExceeded ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-sm block mb-0.5">Batas Kuota Gratis Cloud Tercapai - Proteksi Aktif!</strong>
            Aplikasi otomatis beralih ke <strong>Mode Offline / Cache Lokal</strong>. Seluruh data tetap utuh, aman, dan dapat digunakan normal. Kuota gratis harian Google akan di-reset otomatis pada pukul 14.00 WIB (00:00 Pacific Time).
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Status Server Google Cloud: </span>
              <span className="text-emerald-700 dark:text-emerald-300">Normal & Aman. Penghematan kuota aktif bekerja di latar belakang.</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-emerald-500/20 px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-300">
            Terakhir Sync: {formattedLastSync}
          </span>
        </div>
      )}

      {/* Live Statistics Meter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Quota Read Terselamatkan</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            ~{stats.readsSavedToday.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-500">pembacaan</span>
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Mencegah pengurasan kuota server
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Cache Hit Rate</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.cacheHitPercentage}%
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            Sangat efisien (Offline-First)
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Penulisan Hari Ini</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.writesToday} <span className="text-xs font-normal text-slate-500">write</span>
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
            Tersimpan langsung ke Cloud
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Mode Aktif</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-1">
            {currentMode === "auto" ? "Otomatis Anti-Limit" : currentMode === "zero_cost" ? "Zero-Cost Penuh" : "Realtime Standar"}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            {currentMode === "auto" ? "Direkomendasikan (95% Hemat)" : currentMode === "zero_cost" ? "100% Bebas Kuota Read" : " WebSocket Aktif"}
          </div>
        </div>
      </div>

      {/* Sync Mode Selector Radio Cards */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Pilih Mode Operasional Kebijakan Kuota Database:</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Mode Otomatis Anti-Limit */}
          <div
            onClick={() => handleModeChange("auto")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              currentMode === "auto"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500/80 ring-2 ring-blue-500/20"
                : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Otomatis Anti-Limit</span>
                </span>
                <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  Disarankan
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Menggunakan cache cerdas (SWR TTL 20 menit) dan otomatis memutus listener saat tab tidak aktif. Menghemat hingga <strong>95% Kuota Firestore</strong>.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500">
              <span>Kecepatan: Instant (0ms)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Hemat Kuota: Sangat Tinggi</span>
            </div>
          </div>

          {/* Option 2: Mode Zero-Cost */}
          <div
            onClick={() => handleModeChange("zero_cost")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              currentMode === "zero_cost"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500/80 ring-2 ring-blue-500/20"
                : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Zero-Cost (Cache Penuh)</span>
                </span>
                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  0 Read
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                100% membaca dari memori perangkat. Penulisan data baru tetap tersimpan ke cloud. Digunakan untuk sekolah tanpa kuota bayar.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500">
              <span>Manual Sync On-Demand</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">Hemat Kuota: 100%</span>
            </div>
          </div>

          {/* Option 3: Mode Realtime Standar */}
          <div
            onClick={() => handleModeChange("realtime")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
              currentMode === "realtime"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500/80 ring-2 ring-blue-500/20"
                : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span>Realtime Standar</span>
                </span>
                <span className="text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  Standar
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Menghubungkan WebSocket kontinu ke seluruh koleksi secara langsung. Membutuhkan kuota harian yang memadai jika pengguna banyak.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500">
              <span>Sync Langsung 24/7</span>
              <span className="font-bold text-slate-600 dark:text-slate-400">Penggunaan Kuota Normal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer & Tools */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>Ingin ekspor data cadangan? Gunakan integrasi Google Sheets & Drive.</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {onNavigateToSheets && (
            <button
              onClick={onNavigateToSheets}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all"
            >
              Buka Google Sheets Backup
            </button>
          )}

          <button
            onClick={handleClearCache}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 font-semibold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Cache Lokal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
