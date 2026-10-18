import { initializeApp, getApps, getApp } from "firebase/app";
import "firebase/auth";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";
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
  Pengaturan,
  User
} from "../types";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId
};

// Initialize Firebase App
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const app = firebaseApp;

let _firebaseAuthInstance: ReturnType<typeof getAuth> | null = null;
export const getFirebaseAuth = () => {
  if (!_firebaseAuthInstance) {
    _firebaseAuthInstance = getAuth(firebaseApp);
  }
  return _firebaseAuthInstance;
};

const dbId = (firebaseConfigData as any).firestoreDatabaseId || "(default)";

// Initialize Firestore with persistent multi-tab local cache and long polling
export const firestore = (() => {
  try {
    return initializeFirestore(
      app, 
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, 
      dbId
    );
  } catch {
    try {
      return initializeFirestore(app, { experimentalForceLongPolling: true }, dbId);
    } catch {
      return getFirestore(app, dbId);
    }
  }
})();

import { 
  getSyncMode,
  isCollectionFresh,
  markCollectionFresh,
  recordCacheHit,
  recordServerWrite,
  recordLastSyncTime,
  setQuotaExceededStateInStats,
  onRefreshRequest,
  onSyncModeChange,
  DEFAULT_TTL_MINUTES
} from "./firestoreOptimizer";

// Quota exhaustion listener to inform UI and users gracefully
type QuotaListener = (isExceeded: boolean) => void;
const quotaListeners = new Set<QuotaListener>();
let isQuotaExceededState = false;

export function onQuotaExceededChange(listener: QuotaListener) {
  quotaListeners.add(listener);
  listener(isQuotaExceededState);
  return () => {
    quotaListeners.delete(listener);
  };
}

import { autoFallbackFromGoogleSheetsOrSnapshot } from "./autoBackupManager";

export function notifyQuotaExceeded() {
  if (!isQuotaExceededState) {
    isQuotaExceededState = true;
    setQuotaExceededStateInStats(true);
    autoFallbackFromGoogleSheetsOrSnapshot();
    quotaListeners.forEach((fn) => {
      try {
        fn(true);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collections references
export const COLLECTIONS = {
  USERS: "users",
  SISWA: "data_siswa",
  MAPEL: "mapel",
  JADWAL: "jadwal",
  LOG_ABSENSI: "log_absensi",
  DATA_NILAI: "data_nilai",
  JURNAL_AGENDA: "jurnal_agenda",
  SISWA_BIMBINGAN: "siswa_bimbingan",
  BIMBINGAN_WALI: "bimbingan_wali",
  TABUNGAN_KELAS: "tabungan_kelas",
  ASET_KELAS: "aset_kelas",
  PEMINJAMAN_ASET: "peminjaman_aset",
  BHP_KELAS: "bhp_kelas",
  PEMAKAIAN_BHP: "pemakaian_bhp",
  BUKU_INDUK: "buku_induk_siswa",
  PRESENSI_KEDATANGAN: "presensi_kedatangan",
  BANK_SOAL: "bank_soal",
  PENGATURAN: "pengaturan",
  KUIS_PAKET: "kuis_paket",
  KUIS_SESI: "kuis_sesi",
  P5_PROJEK: "p5_projek",
  P5_PENILAIAN: "p5_penilaian",
  P5_PORTOFOLIO: "p5_portofolio",
  BANK_TP: "bank_tp",
  RAPORT_RECORDS: "raport_records"
};

// Generic Realtime Subscription with instant cache hydration, SWR with TTL, and anti-limit optimization
export function subscribeCollection<T>(collectionName: string, callback: (data: T[]) => void) {
  const cacheKey = `edadmin_cache_${collectionName}`;
  let isUnsubscribed = false;
  let activeUnsubscribe: (() => void) | null = null;

  // 1. Immediately emit cached data if available (instant offline/quota-proof display in 0ms)
  let cachedData: T[] | null = null;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        cachedData = parsed;
        if (parsed.length > 0) {
          callback(parsed);
        }
      }
    }
  } catch (err) {
    console.warn(`Error reading local cache for ${collectionName}:`, err);
  }

  // Helper to attach Firestore listener
  const attachListener = () => {
    if (isUnsubscribed) return;
    if (activeUnsubscribe) {
      try { activeUnsubscribe(); } catch {}
      activeUnsubscribe = null;
    }

    const colRef = collection(firestore, collectionName);
    activeUnsubscribe = onSnapshot(
      colRef, 
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
        });

        // 2. Persist fresh server data into local cache & record sync
        try {
          localStorage.setItem(cacheKey, JSON.stringify(items));
          markCollectionFresh(collectionName);
          recordLastSyncTime();
        } catch (err) {
          console.warn(`Error updating local cache for ${collectionName}:`, err);
        }

        callback(items);
      },
      (error) => {
        const errMsg = error?.message || String(error);
        console.warn(`Firestore subscription notice on ${collectionName}:`, errMsg);

        // Check if Quota was exhausted
        if (
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("resource-exhausted") ||
          (error as any)?.code === "resource-exhausted"
        ) {
          notifyQuotaExceeded();
        }

        // Fallback: Ensure UI has cached data
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              callback(parsed);
            }
          }
        } catch {}
      }
    );
  };

  // Helper to fetch once via getDocs (used when manual refresh is clicked in Zero-Cost mode)
  const fetchOnce = async () => {
    try {
      const colRef = collection(firestore, collectionName);
      const snapshot = await getDocs(colRef);
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      });
      localStorage.setItem(cacheKey, JSON.stringify(items));
      markCollectionFresh(collectionName);
      recordLastSyncTime();
      callback(items);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes("quota") || err?.code === "resource-exhausted") {
        notifyQuotaExceeded();
      }
    }
  };

  // 2. Decide connection policy based on sync mode
  const syncMode = getSyncMode();
  const isCoreCollection = collectionName === COLLECTIONS.USERS || collectionName === COLLECTIONS.PENGATURAN;

  if (syncMode === "zero_cost") {
    // Mode Zero-Cost: 100% served from local cache. 0 reads!
    if (cachedData && cachedData.length > 0) {
      recordCacheHit(cachedData.length);
    }
  } else if (syncMode === "auto") {
    // Mode Otomatis Anti-Limit (Recommended):
    // Core collections (Users, Pengaturan) have continuous listener
    if (isCoreCollection) {
      attachListener();
    } else {
      const isFresh = isCollectionFresh(collectionName, DEFAULT_TTL_MINUTES);
      if (isFresh && cachedData && cachedData.length > 0) {
        // Cache is fresh within TTL! Skip network request, record saved quota
        recordCacheHit(cachedData.length);
      } else {
        // Stale or empty cache -> attach listener to get fresh data
        attachListener();
      }
    }
  } else {
    // Mode Realtime: always attach listener
    attachListener();
  }

  // 3. Tab visibility optimization: Pause listener when tab is inactive to prevent burning reads in background!
  const handleVisibilityChange = () => {
    if (isUnsubscribed) return;
    if (document.hidden) {
      // Tab went into background/minimized -> detach listener to save reads
      if (!isCoreCollection && activeUnsubscribe) {
        try { activeUnsubscribe(); } catch {}
        activeUnsubscribe = null;
      }
    } else {
      // Tab returned to focus -> re-attach if not fresh or if in realtime mode
      if (!isCoreCollection && !activeUnsubscribe) {
        const mode = getSyncMode();
        if (mode === "realtime" || (mode === "auto" && !isCollectionFresh(collectionName, DEFAULT_TTL_MINUTES))) {
          attachListener();
        }
      }
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  // 4. Handle manual force refresh request
  const unsubRefresh = onRefreshRequest((targetCollection) => {
    if (!targetCollection || targetCollection === collectionName) {
      if (getSyncMode() === "zero_cost") {
        fetchOnce();
      } else {
        attachListener();
      }
    }
  });

  // 5. Handle sync mode change live
  const unsubMode = onSyncModeChange((newMode) => {
    if (newMode === "zero_cost") {
      if (!isCoreCollection && activeUnsubscribe) {
        try { activeUnsubscribe(); } catch {}
        activeUnsubscribe = null;
      }
    } else if (newMode === "realtime") {
      if (!activeUnsubscribe) {
        attachListener();
      }
    } else if (newMode === "auto") {
      if (!isCoreCollection && isCollectionFresh(collectionName, DEFAULT_TTL_MINUTES)) {
        if (activeUnsubscribe) {
          try { activeUnsubscribe(); } catch {}
          activeUnsubscribe = null;
        }
      } else if (!activeUnsubscribe) {
        attachListener();
      }
    }
  });

  return () => {
    isUnsubscribed = true;
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    unsubRefresh();
    unsubMode();
    if (activeUnsubscribe) {
      try { activeUnsubscribe(); } catch {}
      activeUnsubscribe = null;
    }
  };
}

// Helper to clean undefined properties before sending to Firestore
function sanitizeData<T extends Record<string, any>>(data: T): T {
  const clean: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined) {
      clean[key] = data[key];
    }
  });
  return clean as T;
}

// Single Document Save/Update with local cache mirror & optimistic update
export async function saveDocument(collectionName: string, id: string, data: Record<string, any>) {
  const cacheKey = `edadmin_cache_${collectionName}`;
  const cleanData = sanitizeData({ ...data, id, updatedAt: Date.now() });

  // Optimistically update localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    let list: any[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((item) => item.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...cleanData };
    } else {
      list.push(cleanData);
    }
    localStorage.setItem(cacheKey, JSON.stringify(list));
    markCollectionFresh(collectionName);
  } catch {}

  try {
    const docRef = doc(firestore, collectionName, id);
    await setDoc(docRef, cleanData, { merge: true });
    recordServerWrite(1);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.toLowerCase().includes("quota") || err?.code === "resource-exhausted") {
      notifyQuotaExceeded();
    }
    console.error(`Error saving document in ${collectionName}:`, err);
    throw err;
  }
}

// Single Document Delete with local cache mirror
export async function deleteDocument(collectionName: string, id: string) {
  const cacheKey = `edadmin_cache_${collectionName}`;

  // Optimistically update localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      let list: any[] = JSON.parse(cached);
      list = list.filter((item) => item.id !== id);
      localStorage.setItem(cacheKey, JSON.stringify(list));
      markCollectionFresh(collectionName);
    }
  } catch {}

  try {
    const docRef = doc(firestore, collectionName, id);
    await deleteDoc(docRef);
    recordServerWrite(1);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.toLowerCase().includes("quota") || err?.code === "resource-exhausted") {
      notifyQuotaExceeded();
    }
    console.error(`Error deleting document in ${collectionName}:`, err);
    throw err;
  }
}

// Batch Save Documents with local cache mirror
export async function batchSaveDocuments(collectionName: string, items: Array<{ id: string; [key: string]: any }>) {
  if (!items || items.length === 0) return;
  const cacheKey = `edadmin_cache_${collectionName}`;

  // Optimistically update localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    let list: any[] = cached ? JSON.parse(cached) : [];
    const map = new Map(list.map((it) => [it.id, it]));
    items.forEach((item) => {
      const clean = sanitizeData({ ...item, updatedAt: Date.now() });
      map.set(item.id, { ...(map.get(item.id) || {}), ...clean });
    });
    localStorage.setItem(cacheKey, JSON.stringify(Array.from(map.values())));
    markCollectionFresh(collectionName);
  } catch {}

  try {
    const batch = writeBatch(firestore);
    items.forEach((item) => {
      const docRef = doc(firestore, collectionName, item.id);
      const cleanData = sanitizeData({ ...item, updatedAt: Date.now() });
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
    recordServerWrite(items.length);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.toLowerCase().includes("quota") || err?.code === "resource-exhausted") {
      notifyQuotaExceeded();
    }
    console.error(`Error batch saving documents in ${collectionName}:`, err);
    throw err;
  }
}

import { compressImage } from "./imageCompressor";

// Pengaturan special helper (Doc ID: "config")
export async function savePengaturan(config: Pengaturan) {
  try {
    const docRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
    
    // Compress Logo_Kiri and Logo_Kanan if they exist and exceed threshold to prevent Firestore 1MB document limit error
    let compressedLogoKiri = config.Logo_Kiri || "";
    let compressedLogoKanan = config.Logo_Kanan || "";

    if (compressedLogoKiri && compressedLogoKiri.length > 50000 && !compressedLogoKiri.startsWith("data:image/svg+xml")) {
      try {
        compressedLogoKiri = await compressImage(compressedLogoKiri, 256, 0.85);
      } catch (e) {
        console.warn("Could not compress Logo_Kiri:", e);
      }
    }

    if (compressedLogoKanan && compressedLogoKanan.length > 50000 && !compressedLogoKanan.startsWith("data:image/svg+xml")) {
      try {
        compressedLogoKanan = await compressImage(compressedLogoKanan, 256, 0.85);
      } catch (e) {
        console.warn("Could not compress Logo_Kanan:", e);
      }
    }

    const payload: Pengaturan = {
      ...config,
      Logo_Kiri: compressedLogoKiri,
      Logo_Kanan: compressedLogoKanan,
    };

    const cleanData = sanitizeData({ ...payload, updatedAt: Date.now() });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err: any) {
    console.error("Error saving pengaturan:", err);
    throw err;
  }
}

export function subscribePengaturan(callback: (config: Pengaturan) => void) {
  const docRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
  return onSnapshot(
    docRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as Pengaturan);
      }
    },
    (error) => {
      console.warn("Firestore pengaturan subscription notice:", error?.message || error);
    }
  );
}

// Clear / Wipe All Collections in Database (Except Configuration)
export async function clearAllDatabaseCollections() {
  // Set flag in localStorage and Firestore so auto-seeder never re-populates on any device
  localStorage.setItem("edadmin_database_cleared", "true");

  try {
    const configDocRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
    await setDoc(configDocRef, { isDatabaseCleared: true, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    console.warn("Could not set isDatabaseCleared flag in pengaturan collection:", err);
  }

  const collectionsToClear = [
    COLLECTIONS.SISWA,
    COLLECTIONS.MAPEL,
    COLLECTIONS.JADWAL,
    COLLECTIONS.LOG_ABSENSI,
    COLLECTIONS.DATA_NILAI,
    COLLECTIONS.JURNAL_AGENDA,
    COLLECTIONS.SISWA_BIMBINGAN,
    COLLECTIONS.BIMBINGAN_WALI,
    COLLECTIONS.TABUNGAN_KELAS,
    COLLECTIONS.ASET_KELAS,
    COLLECTIONS.PEMINJAMAN_ASET,
    COLLECTIONS.BHP_KELAS,
    COLLECTIONS.PEMAKAIAN_BHP,
    COLLECTIONS.BUKU_INDUK
  ];

  const errors: string[] = [];

  for (const colName of collectionsToClear) {
    try {
      const colRef = collection(firestore, colName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(firestore);
          const chunk = docs.slice(i, i + 400);
          chunk.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }
    } catch (err: any) {
      console.error(`Error clearing collection ${colName}:`, err);
      errors.push(`${colName}: ${err?.message || err}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Sebagian koleksi gagal dihapus: ${errors.join(", ")}`);
  }
}
