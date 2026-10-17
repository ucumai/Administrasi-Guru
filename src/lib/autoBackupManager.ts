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
  getSavedSpreadsheetId, 
  syncDatabaseToGoogleSheets, 
  fetchSheetRows, 
  BackupDataPayload 
} from "./googleSheetsService";
import { getAccessToken } from "./googleAuth";
import { triggerForceRefresh } from "./firestoreOptimizer";
import { notifySimpanSuccess } from "./swal";

const SNAPSHOT_KEY = "edadmin_global_auto_snapshot";
const SNAPSHOT_META_KEY = "edadmin_auto_snapshot_meta";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncingInBackground = false;

// -------------------------------------------------------------
// 1. LOCAL & CROSS-DEVICE SNAPSHOT PERSISTENCE
// -------------------------------------------------------------

export function saveGlobalAutoSnapshot(payload: BackupDataPayload): void {
  try {
    const raw = JSON.stringify(payload);
    localStorage.setItem(SNAPSHOT_KEY, raw);
    localStorage.setItem(
      SNAPSHOT_META_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        totalSiswa: payload.siswaList.length,
        totalAbsensi: payload.absensiList.length,
        totalNilai: payload.nilaiList.length,
        totalAgenda: payload.agendaList.length
      })
    );
  } catch (err) {
    console.warn("[Auto-Backup] Could not save global snapshot to localStorage:", err);
  }
}

export function getGlobalAutoSnapshot(): BackupDataPayload | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// 2. SILENT DEBOUNCED BACKGROUND AUTO-BACKUP
// -------------------------------------------------------------

export function scheduleSilentBackgroundBackup(payload: BackupDataPayload, delayMs: number = 3000): void {
  // Always save instant local snapshot
  saveGlobalAutoSnapshot(payload);

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    if (isSyncingInBackground) return;
    try {
      const accessToken = await getAccessToken();
      const spreadsheetId = getSavedSpreadsheetId();

      if (accessToken && spreadsheetId) {
        isSyncingInBackground = true;
        console.log("[Auto-Backup] Executing background sync to Google Sheets...");
        await syncDatabaseToGoogleSheets(payload, accessToken);
        console.log("[Auto-Backup] Background sync to Google Sheets completed successfully!");
      }
    } catch (err) {
      console.warn("[Auto-Backup] Silent background sync to Google Sheets skipped or deferred:", err);
    } finally {
      isSyncingInBackground = false;
    }
  }, delayMs);
}

// -------------------------------------------------------------
// 3. AUTO-FALLBACK ENGINE FROM GOOGLE SHEETS / SNAPSHOT
// -------------------------------------------------------------

export async function autoFallbackFromGoogleSheetsOrSnapshot(): Promise<boolean> {
  console.log("[Auto-Fallback] Triggered! Attempting to restore data from local snapshot or Google Sheets...");

  // Step 1: Attempt restore from persistent local snapshot
  const localSnapshot = getGlobalAutoSnapshot();
  let hasRestoredFromSnapshot = false;

  if (localSnapshot && (
    localSnapshot.siswaList.length > 0 || 
    localSnapshot.absensiList.length > 0 || 
    localSnapshot.nilaiList.length > 0 ||
    localSnapshot.userList.length > 0
  )) {
    try {
      if (localSnapshot.siswaList.length > 0) {
        localStorage.setItem("edadmin_cache_data_siswa", JSON.stringify(localSnapshot.siswaList));
      }
      if (localSnapshot.userList.length > 0) {
        localStorage.setItem("edadmin_cache_users", JSON.stringify(localSnapshot.userList));
      }
      if (localSnapshot.mapelList.length > 0) {
        localStorage.setItem("edadmin_cache_mapel", JSON.stringify(localSnapshot.mapelList));
      }
      if (localSnapshot.jadwalList.length > 0) {
        localStorage.setItem("edadmin_cache_jadwal", JSON.stringify(localSnapshot.jadwalList));
      }
      if (localSnapshot.absensiList.length > 0) {
        localStorage.setItem("edadmin_cache_log_absensi", JSON.stringify(localSnapshot.absensiList));
      }
      if (localSnapshot.nilaiList.length > 0) {
        localStorage.setItem("edadmin_cache_data_nilai", JSON.stringify(localSnapshot.nilaiList));
      }
      if (localSnapshot.agendaList.length > 0) {
        localStorage.setItem("edadmin_cache_jurnal_agenda", JSON.stringify(localSnapshot.agendaList));
      }
      if (localSnapshot.tabunganList.length > 0) {
        localStorage.setItem("edadmin_cache_tabungan_kelas", JSON.stringify(localSnapshot.tabunganList));
      }

      triggerForceRefresh();
      hasRestoredFromSnapshot = true;
      console.log("[Auto-Fallback] Restored successfully from persistent local snapshot!");
    } catch (err) {
      console.warn("[Auto-Fallback] Snapshot restore encountered issue:", err);
    }
  }

  // Step 2: Attempt restore from Google Sheets API if Google Token & Spreadsheet ID exist
  try {
    const accessToken = await getAccessToken();
    const spreadsheetId = getSavedSpreadsheetId();

    if (accessToken && spreadsheetId) {
      console.log("[Auto-Fallback] Fetching backup data directly from Google Sheets API...");

      // Fetch Data Siswa
      const siswaRows = await fetchSheetRows(spreadsheetId, "Data Siswa", accessToken, 500);
      if (siswaRows && siswaRows.length > 1) {
        const restoredSiswa: Siswa[] = siswaRows.slice(1).map((r) => ({
          id: String(r[1] || `s_${Date.now()}_${Math.random()}`),
          nisn: String(r[2] || "-"),
          nis: String(r[3] || "-"),
          nama: String(r[4] || "Siswa"),
          kelas: String(r[5] || "Kelas 1")
        }));
        localStorage.setItem("edadmin_cache_data_siswa", JSON.stringify(restoredSiswa));
      }

      // Fetch Daftar Guru & User
      const userRows = await fetchSheetRows(spreadsheetId, "Daftar Guru & User", accessToken, 100);
      if (userRows && userRows.length > 1) {
        const restoredUsers: User[] = userRows.slice(1).map((r) => ({
          id: String(r[1] || `u_${Date.now()}`),
          username: String(r[2] || "guru").toLowerCase(),
          nama: String(r[3] || "Guru"),
          nip: String(r[4] || "-"),
          role: (r[5] || "guru_kelas") as any,
          kelasUtama: String(r[6] || ""),
          mapelDiampu: String(r[7] || ""),
          updatedAt: Date.now()
        }));
        localStorage.setItem("edadmin_cache_users", JSON.stringify(restoredUsers));
      }

      // Fetch Log Absensi
      const absensiRows = await fetchSheetRows(spreadsheetId, "Log Absensi", accessToken, 1000);
      if (absensiRows && absensiRows.length > 1) {
        const restoredAbsensi: LogAbsensi[] = absensiRows.slice(1).map((r) => ({
          id: String(r[1] || `abs_${Date.now()}`),
          tanggal: String(r[2] || new Date().toISOString().split("T")[0]),
          waktu: String(r[2] || new Date().toLocaleTimeString()),
          mapel: "-",
          bulan: "-",
          tahun: "-",
          idSiswa: String(r[3] || ""),
          namaSiswa: String(r[4] || ""),
          kelas: String(r[5] || ""),
          status: (r[6] || "H") as any,
          namaGuru: String(r[7] || "-")
        }));
        localStorage.setItem("edadmin_cache_log_absensi", JSON.stringify(restoredAbsensi));
      }

      // Fetch Data Nilai
      const nilaiRows = await fetchSheetRows(spreadsheetId, "Data Nilai", accessToken, 1000);
      if (nilaiRows && nilaiRows.length > 1) {
        const restoredNilai: DataNilai[] = nilaiRows.slice(1).map((r) => ({
          id: String(r[1] || `nil_${Date.now()}`),
          idSiswa: String(r[2] || ""),
          namaSiswa: String(r[3] || ""),
          kelas: String(r[4] || ""),
          mapel: String(r[5] || ""),
          jenis: (r[6] || "FORMATIF") as any,
          nilai: Number(r[7]) || 0,
          tp: String(r[8] || "-"),
          deskripsi: String(r[9] || "-"),
          waktu: new Date().toISOString(),
          namaGuru: "-"
        }));
        localStorage.setItem("edadmin_cache_data_nilai", JSON.stringify(restoredNilai));
      }

      triggerForceRefresh();
      notifySimpanSuccess("Auto-Fallback Google Sheets Aktif: Data berhasil dipulihkan secara otomatis dari Google Drive!");
      return true;
    }
  } catch (err) {
    console.warn("[Auto-Fallback] Could not fetch from Google Sheets API:", err);
  }

  if (hasRestoredFromSnapshot) {
    notifySimpanSuccess("Auto-Fallback Snapshot Aktif: Data berhasil dipulihkan dari Cadangan Otomatis!");
    return true;
  }

  return false;
}
