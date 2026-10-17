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
import * as XLSX from "xlsx";

export interface BackupDataPayload {
  siswaList: Siswa[];
  userList: User[];
  mapelList: Mapel[];
  jadwalList: Jadwal[];
  absensiList: LogAbsensi[];
  nilaiList: DataNilai[];
  agendaList: JurnalAgenda[];
  tabunganList: TabunganKelas[];
  config: Pengaturan;
}

export interface SpreadsheetBackupResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  totalRecordsSynced: number;
  timestamp: string;
}

const STORAGE_KEY_SPREADSHEET_ID = "edadmin_backup_sheets_id";
const STORAGE_KEY_LAST_BACKUP = "edadmin_last_backup_meta";

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID);
};

export const saveSpreadsheetId = (id: string) => {
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, id);
};

export const getSavedLastBackupMeta = (): { timestamp: string; totalRecords: number; url: string } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_BACKUP);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Target sheet names in the Google Spreadsheet
export const SHEET_NAMES = [
  "Info & Ringkasan",
  "Data Siswa",
  "Daftar Guru & User",
  "Mata Pelajaran",
  "Jadwal Pelajaran",
  "Log Absensi",
  "Data Nilai",
  "Agenda Mengajar",
  "Tabungan Kelas",
  "Pengaturan Aplikasi"
];

/**
 * Checks if existing spreadsheet exists and is accessible
 */
export async function verifySpreadsheetExists(spreadsheetId: string, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Creates a brand new Google Spreadsheet with all pre-configured tabs
 */
export async function createBackupSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheets: { sheetId: number; title: string }[] }> {
  const body = {
    properties: {
      title,
    },
    sheets: SHEET_NAMES.map((name) => ({
      properties: {
        title: name,
        gridProperties: {
          rowCount: 200,
          columnCount: 20,
          frozenRowCount: 1,
        },
      },
    })),
  };

  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membuat Google Spreadsheet baru: ${errText}`);
  }

  const data = await res.json();
  const sheets = data.sheets.map((s: any) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
  }));

  saveSpreadsheetId(data.spreadsheetId);

  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets,
  };
}

/**
 * Ensures all required sheets exist in an existing spreadsheet
 */
export async function ensureSheetsExist(
  spreadsheetId: string,
  accessToken: string
): Promise<void> {
  const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!getRes.ok) return;

  const data = await getRes.json();
  const existingSheetTitles = new Set(data.sheets?.map((s: any) => s.properties.title) || []);

  const missingSheets = SHEET_NAMES.filter((name) => !existingSheetTitles.has(name));
  if (missingSheets.length === 0) return;

  const requests = missingSheets.map((name) => ({
    addSheet: {
      properties: {
        title: name,
        gridProperties: {
          rowCount: 200,
          columnCount: 20,
          frozenRowCount: 1,
        },
      },
    },
  }));

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });
}

/**
 * Sync entire database to Google Spreadsheet
 */
export async function syncDatabaseToGoogleSheets(
  payload: BackupDataPayload,
  accessToken: string,
  onProgress?: (step: string, percentage: number) => void
): Promise<SpreadsheetBackupResult> {
  const schoolName = payload.config.Nama_Sekolah || "Sekolah";
  const defaultTitle = `Cadangan E-Administrasi Guru - ${schoolName}`;

  if (onProgress) onProgress("Memeriksa Google Spreadsheet di Drive...", 10);

  let targetSpreadsheetId = getSavedSpreadsheetId();
  let spreadsheetUrl = "";

  if (targetSpreadsheetId) {
    const exists = await verifySpreadsheetExists(targetSpreadsheetId, accessToken);
    if (!exists) {
      targetSpreadsheetId = null;
    }
  }

  if (!targetSpreadsheetId) {
    if (onProgress) onProgress("Membuat Google Spreadsheet baru di Google Drive...", 25);
    const created = await createBackupSpreadsheet(defaultTitle, accessToken);
    targetSpreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
    await ensureSheetsExist(targetSpreadsheetId, accessToken);
  }

  if (onProgress) onProgress("Menyiapkan format tabel & konversi data...", 45);

  const nowStr = new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  // 1. Info & Ringkasan
  const summaryRows: any[][] = [
    ["INFORMASI CADANGAN DATABASE APLIKASI E-ADMINISTRASI GURU"],
    ["Waktu Cadangan Terakhir", nowStr],
    ["Nama Sekolah", payload.config.Nama_Sekolah || "-"],
    ["NPSN", payload.config.NPSN || "-"],
    ["Kepala Sekolah", payload.config.Nama_Kepsek || "-"],
    ["NIP Kepala Sekolah", payload.config.NIP_Kepsek || "-"],
    ["Guru Kelas / Admin", payload.config.Nama_Guru || "-"],
    [""],
    ["TABEL DATA", "JUMLAH REKOR"],
    ["Data Siswa", payload.siswaList.length],
    ["Daftar Guru & Pengguna", payload.userList.length],
    ["Mata Pelajaran", payload.mapelList.length],
    ["Jadwal Mengajar", payload.jadwalList.length],
    ["Log Absensi", payload.absensiList.length],
    ["Data Penilaian", payload.nilaiList.length],
    ["Agenda Mengajar", payload.agendaList.length],
    ["Tabungan Siswa", payload.tabunganList.length],
    [""],
    ["CATATAN:", "File ini disinkronkan secara aman dari Aplikasi E-Administrasi Guru. Jangan ubah nama lembar tab."]
  ];

  // 2. Data Siswa
  const siswaHeaders = ["No", "ID", "NISN", "NIS", "Nama Lengkap", "Kelas"];
  const siswaRows = payload.siswaList.map((s, idx) => [
    idx + 1,
    s.id,
    s.nisn || "-",
    s.nis || "-",
    s.nama,
    s.kelas || "-"
  ]);

  // 3. Guru & User
  const userHeaders = ["No", "ID", "Username", "Nama Lengkap", "NIP", "Role", "Mapel Diampu", "Kelas Diampu"];
  const userRows = payload.userList.map((u, idx) => [
    idx + 1,
    u.id,
    u.username,
    u.nama,
    u.nip || "-",
    u.role,
    u.mapelDiampu || "-",
    Array.isArray(u.kelasAkses) ? u.kelasAkses.join(", ") : u.kelasUtama || "-"
  ]);

  // 4. Mapel
  const mapelHeaders = ["No", "ID", "Nama Mata Pelajaran", "Semester", "Tahun Ajaran"];
  const mapelRows = payload.mapelList.map((m, idx) => [
    idx + 1,
    m.id,
    m.namaMapel,
    m.semester || "-",
    m.tahunAjaran || "-"
  ]);

  // 5. Jadwal
  const jadwalHeaders = ["No", "ID", "Hari", "Jam Ke / Waktu", "Kelas", "Mata Pelajaran"];
  const jadwalRows = payload.jadwalList.map((j, idx) => [
    idx + 1,
    j.id,
    j.hari,
    j.jam || "-",
    j.kelas,
    j.mapel
  ]);

  // 6. Log Absensi
  const absensiHeaders = ["No", "ID", "Tanggal", "ID Siswa", "Nama Siswa", "Kelas", "Mata Pelajaran", "Status", "Nama Guru"];
  const absensiRows = payload.absensiList.map((a, idx) => [
    idx + 1,
    a.id,
    a.tanggal,
    a.idSiswa,
    a.namaSiswa || "-",
    a.kelas || "-",
    a.mapel || "Umum/Pagi",
    a.status,
    a.namaGuru || "-"
  ]);

  // 7. Data Nilai
  const nilaiHeaders = ["No", "ID", "Waktu", "ID Siswa", "Nama Siswa", "Kelas", "Mata Pelajaran", "Jenis Asesmen", "Nilai", "TP / Indikator", "Deskripsi / Catatan"];
  const nilaiRows = payload.nilaiList.map((n, idx) => [
    idx + 1,
    n.id,
    n.waktu || "-",
    n.idSiswa,
    n.namaSiswa || "-",
    n.kelas || "-",
    n.mapel,
    n.jenis,
    n.nilai,
    n.tp || "-",
    n.deskripsi || "-"
  ]);

  // 8. Agenda Mengajar
  const agendaHeaders = ["No", "ID", "Tanggal", "Jam", "Kelas", "Mata Pelajaran", "Materi Pokok", "Status Pelaksanaan", "Absen Siswa", "Keterangan", "Nama Guru"];
  const agendaRows = payload.agendaList.map((ag, idx) => [
    idx + 1,
    ag.id,
    ag.tanggal,
    ag.jam || "-",
    ag.kelas,
    ag.mapel,
    ag.materi,
    ag.status,
    ag.absenSiswa || "-",
    ag.ket || "-",
    ag.namaGuru || "-"
  ]);

  // 9. Tabungan Kelas
  const tabunganHeaders = ["No", "ID", "Tanggal", "ID Siswa", "Nama Siswa", "Kelas", "Jenis Transaksi", "Jumlah (Rp)", "Keterangan", "Petugas / Guru"];
  const tabunganRows = payload.tabunganList.map((t, idx) => [
    idx + 1,
    t.id,
    t.tanggal,
    t.idSiswa,
    t.namaSiswa || "-",
    t.kelas || "-",
    t.jenis,
    t.jumlah,
    t.keterangan || "-",
    t.namaGuru || "-"
  ]);

  // 10. Pengaturan Aplikasi
  const pengaturanHeaders = ["Parameter / Kunci", "Nilai"];
  const pengaturanRows = Object.entries(payload.config).map(([k, v]) => [
    k,
    typeof v === "object" ? JSON.stringify(v) : String(v ?? "")
  ]);

  const valueUpdates = [
    {
      range: "'Info & Ringkasan'!A1:B25",
      values: summaryRows,
    },
    {
      range: "'Data Siswa'!A1:F" + (siswaRows.length + 2),
      values: [siswaHeaders, ...siswaRows],
    },
    {
      range: "'Daftar Guru & User'!A1:H" + (userRows.length + 2),
      values: [userHeaders, ...userRows],
    },
    {
      range: "'Mata Pelajaran'!A1:E" + (mapelRows.length + 2),
      values: [mapelHeaders, ...mapelRows],
    },
    {
      range: "'Jadwal Pelajaran'!A1:F" + (jadwalRows.length + 2),
      values: [jadwalHeaders, ...jadwalRows],
    },
    {
      range: "'Log Absensi'!A1:I" + (absensiRows.length + 2),
      values: [absensiHeaders, ...absensiRows],
    },
    {
      range: "'Data Nilai'!A1:K" + (nilaiRows.length + 2),
      values: [nilaiHeaders, ...nilaiRows],
    },
    {
      range: "'Agenda Mengajar'!A1:K" + (agendaRows.length + 2),
      values: [agendaHeaders, ...agendaRows],
    },
    {
      range: "'Tabungan Kelas'!A1:J" + (tabunganRows.length + 2),
      values: [tabunganHeaders, ...tabunganRows],
    },
    {
      range: "'Pengaturan Aplikasi'!A1:B" + (pengaturanRows.length + 2),
      values: [pengaturanHeaders, ...pengaturanRows],
    },
  ];

  if (onProgress) onProgress("Mengunggah dan memperbarui baris di Google Sheets...", 75);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: valueUpdates,
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Gagal memperbarui sel data Google Sheets: ${errText}`);
  }

  const totalRecords = 
    payload.siswaList.length + 
    payload.userList.length + 
    payload.mapelList.length + 
    payload.jadwalList.length + 
    payload.absensiList.length + 
    payload.nilaiList.length + 
    payload.agendaList.length + 
    payload.tabunganList.length;

  const resultMeta = {
    timestamp: new Date().toISOString(),
    totalRecords,
    url: spreadsheetUrl,
  };
  localStorage.setItem(STORAGE_KEY_LAST_BACKUP, JSON.stringify(resultMeta));

  if (onProgress) onProgress("Cadangan selesai! Data tersimpan di Google Drive.", 100);

  return {
    spreadsheetId: targetSpreadsheetId,
    spreadsheetUrl,
    title: defaultTitle,
    totalRecordsSynced: totalRecords,
    timestamp: nowStr,
  };
}

/**
 * Fetch rows from a specific sheet in Google Spreadsheet for preview
 */
export async function fetchSheetRows(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
  limit: number = 50
): Promise<any[][]> {
  const range = `'${encodeURIComponent(sheetName)}'!A1:Z${limit}`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membaca data dari lembar '${sheetName}': ${errText}`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Export instantly to offline Excel (.xlsx) file as complementary zero-network backup
 */
export function exportToOfflineExcel(payload: BackupDataPayload, filename: string = "Cadangan_E_Administrasi_Guru.xlsx") {
  const wb = XLSX.utils.book_new();

  // 1. Siswa
  const siswaData = payload.siswaList.map((s, idx) => ({
    No: idx + 1,
    NISN: s.nisn || "-",
    NIS: s.nis || "-",
    Nama: s.nama,
    Kelas: s.kelas,
  }));
  const wsSiswa = XLSX.utils.json_to_sheet(siswaData);
  XLSX.utils.book_append_sheet(wb, wsSiswa, "Data_Siswa");

  // 2. Guru & User
  const userData = payload.userList.map((u, idx) => ({
    No: idx + 1,
    Username: u.username,
    Nama: u.nama,
    NIP: u.nip || "-",
    Role: u.role,
    Kelas: Array.isArray(u.kelasAkses) ? u.kelasAkses.join(", ") : u.kelasUtama || "-",
  }));
  const wsUser = XLSX.utils.json_to_sheet(userData);
  XLSX.utils.book_append_sheet(wb, wsUser, "Daftar_Guru");

  // 3. Absensi
  const absensiData = payload.absensiList.map((a, idx) => ({
    No: idx + 1,
    Tanggal: a.tanggal,
    Siswa: a.namaSiswa || a.idSiswa,
    Kelas: a.kelas,
    Status: a.status,
    Guru: a.namaGuru || "-",
  }));
  const wsAbsensi = XLSX.utils.json_to_sheet(absensiData);
  XLSX.utils.book_append_sheet(wb, wsAbsensi, "Log_Absensi");

  // 4. Nilai
  const nilaiData = payload.nilaiList.map((n, idx) => ({
    No: idx + 1,
    Siswa: n.namaSiswa || n.idSiswa,
    Kelas: n.kelas,
    Mapel: n.mapel,
    Jenis: n.jenis,
    Nilai: n.nilai,
    TP: n.tp || "-",
    Deskripsi: n.deskripsi || "-",
  }));
  const wsNilai = XLSX.utils.json_to_sheet(nilaiData);
  XLSX.utils.book_append_sheet(wb, wsNilai, "Data_Nilai");

  // 5. Jadwal
  const jadwalData = payload.jadwalList.map((j, idx) => ({
    No: idx + 1,
    Hari: j.hari,
    Jam: j.jam,
    Kelas: j.kelas,
    Mapel: j.mapel,
  }));
  const wsJadwal = XLSX.utils.json_to_sheet(jadwalData);
  XLSX.utils.book_append_sheet(wb, wsJadwal, "Jadwal_Pelajaran");

  // 6. Tabungan
  const tabunganData = payload.tabunganList.map((t, idx) => ({
    No: idx + 1,
    Tanggal: t.tanggal,
    Siswa: t.namaSiswa || t.idSiswa,
    Kelas: t.kelas,
    Jenis: t.jenis,
    Jumlah: t.jumlah,
    Keterangan: t.keterangan || "-",
  }));
  const wsTabungan = XLSX.utils.json_to_sheet(tabunganData);
  XLSX.utils.book_append_sheet(wb, wsTabungan, "Tabungan_Kelas");

  // Download
  XLSX.writeFile(wb, filename);
}
