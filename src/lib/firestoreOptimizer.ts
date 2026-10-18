/**
 * Firestore Anti-Limit & Zero-Cost Efficiency Optimizer
 * 
 * Solusi komprehensif untuk mencegah terlampauinya kuota gratis Google Cloud Firestore (50.000 read/hari)
 * dengan arsitektur multi-tier:
 * 1. Stale-While-Revalidate (SWR) Local Cache dengan TTL cerdas
 * 2. Deteksi Tab Inaktif (Page Visibility API) untuk memutus listener saat background
 * 3. 3 Mode Sinkronisasi Fleksibel (Otomatis Anti-Limit, Zero-Cost Penuh, dan Realtime Standar)
 * 4. Optimistic UI Updates & Batch Write Throttling
 * 5. Pelacakan Statistik Kuota & Pemulihan Darurat Otomatis
 */

export type SyncMode = "auto" | "zero_cost" | "realtime";

export interface QuotaStats {
  readsSavedToday: number;
  writesToday: number;
  cacheHitPercentage: number;
  lastSyncTime: number | null;
  mode: SyncMode;
  isQuotaExceeded: boolean;
  dateKey: string;
}

const STORAGE_KEYS = {
  MODE: "edadmin_sync_mode",
  STATS: "edadmin_quota_stats",
  META_PREFIX: "edadmin_cache_meta_",
  CACHE_PREFIX: "edadmin_cache_",
  FORCE_SYNC_FLAG: "edadmin_force_sync_trigger"
};

// Default TTL for cached collections in minutes
export const DEFAULT_TTL_MINUTES = 20;

// Listeners for sync mode and quota events
type ModeChangeListener = (mode: SyncMode) => void;
type StatsChangeListener = (stats: QuotaStats) => void;
type RefreshRequestListener = (collectionName?: string) => void;

const modeListeners = new Set<ModeChangeListener>();
const statsListeners = new Set<StatsChangeListener>();
const refreshListeners = new Set<RefreshRequestListener>();

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// -------------------------------------------------------------
// 1. SYNC MODE MANAGEMENT
// -------------------------------------------------------------

export function getSyncMode(): SyncMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MODE) as SyncMode;
    if (saved === "auto" || saved === "zero_cost" || saved === "realtime") {
      return saved;
    }
  } catch {}
  return "realtime"; // Default: Realtime Multi-User Sync across all devices
}

export function setSyncMode(mode: SyncMode) {
  try {
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  } catch {}

  modeListeners.forEach((fn) => {
    try {
      fn(mode);
    } catch (e) {
      console.error(e);
    }
  });

  updateStats((prev) => ({ ...prev, mode }));
}

export function onSyncModeChange(listener: ModeChangeListener): () => void {
  modeListeners.add(listener);
  listener(getSyncMode());
  return () => {
    modeListeners.delete(listener);
  };
}

// -------------------------------------------------------------
// 2. QUOTA & SAVINGS TRACKER
// -------------------------------------------------------------

export function getQuotaStats(): QuotaStats {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.dateKey === today) {
        return {
          ...parsed,
          mode: getSyncMode()
        };
      }
    }
  } catch {}

  // New day or uninitialized
  const initialStats: QuotaStats = {
    readsSavedToday: 0,
    writesToday: 0,
    cacheHitPercentage: 100,
    lastSyncTime: Date.now(),
    mode: getSyncMode(),
    isQuotaExceeded: false,
    dateKey: today
  };
  saveQuotaStats(initialStats);
  return initialStats;
}

function saveQuotaStats(stats: QuotaStats) {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch {}
  statsListeners.forEach((fn) => {
    try {
      fn(stats);
    } catch (e) {
      console.error(e);
    }
  });
}

function updateStats(updater: (prev: QuotaStats) => QuotaStats) {
  const current = getQuotaStats();
  const next = updater(current);
  saveQuotaStats(next);
}

export function recordCacheHit(itemCount: number = 1) {
  updateStats((prev) => {
    const readsSaved = prev.readsSavedToday + Math.max(1, itemCount);
    const totalOps = readsSaved + prev.writesToday;
    const hitRate = totalOps > 0 ? Math.min(99.9, Math.round((readsSaved / totalOps) * 1000) / 10) : 98;
    return {
      ...prev,
      readsSavedToday: readsSaved,
      cacheHitPercentage: hitRate
    };
  });
}

export function recordServerWrite(count: number = 1) {
  updateStats((prev) => ({
    ...prev,
    writesToday: prev.writesToday + count
  }));
}

export function recordLastSyncTime() {
  updateStats((prev) => ({
    ...prev,
    lastSyncTime: Date.now()
  }));
}

export function setQuotaExceededStateInStats(exceeded: boolean) {
  updateStats((prev) => ({
    ...prev,
    isQuotaExceeded: exceeded
  }));
}

export function onStatsChange(listener: StatsChangeListener): () => void {
  statsListeners.add(listener);
  listener(getQuotaStats());
  return () => {
    statsListeners.delete(listener);
  };
}

// -------------------------------------------------------------
// 3. CACHE FRESHNESS & TTL (STALE-WHILE-REVALIDATE)
// -------------------------------------------------------------

export function isCollectionFresh(collectionName: string, ttlMinutes: number = DEFAULT_TTL_MINUTES): boolean {
  try {
    const metaKey = `${STORAGE_KEYS.META_PREFIX}${collectionName}`;
    const raw = localStorage.getItem(metaKey);
    if (!raw) return false;
    const meta = JSON.parse(raw);
    if (!meta.lastFetched) return false;

    const ageMs = Date.now() - meta.lastFetched;
    const maxAgeMs = ttlMinutes * 60 * 1000;
    return ageMs < maxAgeMs;
  } catch {
    return false;
  }
}

export function markCollectionFresh(collectionName: string) {
  try {
    const metaKey = `${STORAGE_KEYS.META_PREFIX}${collectionName}`;
    localStorage.setItem(
      metaKey,
      JSON.stringify({
        lastFetched: Date.now()
      })
    );
  } catch {}
}

export function invalidateCollectionCache(collectionName: string) {
  try {
    const metaKey = `${STORAGE_KEYS.META_PREFIX}${collectionName}`;
    localStorage.removeItem(metaKey);
  } catch {}
}

export function invalidateAllCacheMeta() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_KEYS.META_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}

// -------------------------------------------------------------
// 4. MANUAL TRIGGER & FORCE REFRESH BROADCAST
// -------------------------------------------------------------

export function triggerForceRefresh(collectionName?: string) {
  recordLastSyncTime();
  if (collectionName) {
    invalidateCollectionCache(collectionName);
  } else {
    invalidateAllCacheMeta();
  }
  refreshListeners.forEach((fn) => {
    try {
      fn(collectionName);
    } catch (e) {
      console.error(e);
    }
  });
}

export function onRefreshRequest(listener: RefreshRequestListener): () => void {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

// -------------------------------------------------------------
// 5. CACHE COUNT SUMMARIES
// -------------------------------------------------------------

export function getLocalCacheCount(collectionName: string): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.CACHE_PREFIX}${collectionName}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 1;
  } catch {
    return 0;
  }
}

export function clearAllLocalCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key && 
        (key.startsWith(STORAGE_KEYS.CACHE_PREFIX) || 
         key.startsWith(STORAGE_KEYS.META_PREFIX)) &&
        !key.includes("users") && // preserve login session
        !key.includes("theme")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error("Error clearing local cache:", err);
  }
}
