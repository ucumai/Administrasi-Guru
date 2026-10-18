import { initializeApp, getApps, getApp } from "firebase/app";
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
  enableIndexedDbPersistence
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const dbId = firebaseConfigData.firestoreDatabaseId || "(default)";

// Initialize Firestore with experimentalForceLongPolling and IndexedDB Persistence for instant offline-first loads
export const firestore = (() => {
  let dbInstance;
  try {
    dbInstance = initializeFirestore(
      app, 
      {
        experimentalForceLongPolling: true,
      }, 
      dbId
    );
  } catch {
    dbInstance = getFirestore(app, dbId);
  }

  try {
    enableIndexedDbPersistence(dbInstance).catch((err) => {
      if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
        console.warn('Firestore persistence warning:', err?.message || err);
      }
    });
  } catch {}

  return dbInstance;
})();

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

// Generic Realtime Subscription with instant cache-first delivery and background cloud sync
export function subscribeCollection<T>(collectionName: string, callback: (data: T[]) => void) {
  // 1. Instant Cache-First Delivery (< 10ms)
  try {
    const cached = localStorage.getItem(`cache_col_${collectionName}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    }
  } catch {}

  // 2. Background Firestore Realtime Listener
  const colRef = collection(firestore, collectionName);
  return onSnapshot(
    colRef, 
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
      });
      callback(items);
      try {
        localStorage.setItem(`cache_col_${collectionName}`, JSON.stringify(items));
      } catch {}
    },
    (error) => {
      console.warn(`Firestore subscription notice on ${collectionName}:`, error?.message || error);
    }
  );
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

// Single Document Save/Update
export async function saveDocument(collectionName: string, id: string, data: Record<string, any>) {
  try {
    const docRef = doc(firestore, collectionName, id);
    const cleanData = sanitizeData({ ...data, updatedAt: Date.now() });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err: any) {
    console.error(`Error saving document in ${collectionName}:`, err);
    throw err;
  }
}

// Single Document Delete
export async function deleteDocument(collectionName: string, id: string) {
  try {
    const docRef = doc(firestore, collectionName, id);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error(`Error deleting document in ${collectionName}:`, err);
    throw err;
  }
}

// Batch Save Documents
export async function batchSaveDocuments(collectionName: string, items: Array<{ id: string; [key: string]: any }>) {
  if (!items || items.length === 0) return;
  try {
    const batch = writeBatch(firestore);
    items.forEach((item) => {
      const docRef = doc(firestore, collectionName, item.id);
      const cleanData = sanitizeData({ ...item, updatedAt: Date.now() });
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
  } catch (err: any) {
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
  // 1. Instant Cache-First Delivery (< 10ms)
  try {
    const cached = localStorage.getItem("cache_doc_pengaturan");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed) callback(parsed);
    }
  } catch {}

  // 2. Realtime Listener
  const docRef = doc(firestore, COLLECTIONS.PENGATURAN, "config");
  return onSnapshot(
    docRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Pengaturan;
        callback(data);
        try {
          localStorage.setItem("cache_doc_pengaturan", JSON.stringify(data));
        } catch {}
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
