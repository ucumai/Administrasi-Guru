import React, { useState, useEffect, useRef } from "react";
import { ClipboardCheck, Camera, CheckCircle2, Save, UserCheck, AlertCircle, RefreshCw, Sunrise } from "lucide-react";
import jsQR from "jsqr";
import { Siswa, Mapel, LogAbsensi, Pengaturan, User, LogKedatangan } from "../types";
import { saveDocument, batchSaveDocuments, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses } from "../lib/accessControl";
import { notifySimpanSuccess, notifySimpanError } from "../lib/swal";
import { getLocalDateStr, onDayRollover, formatTanggalLengkap } from "../lib/dateUtils";

interface InputAbsensiViewProps {
  siswaList: Siswa[];
  mapelList: Mapel[];
  absensiList: LogAbsensi[];
  logKedatanganList?: LogKedatangan[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const InputAbsensiView: React.FC<InputAbsensiViewProps> = ({
  siswaList,
  mapelList,
  absensiList,
  logKedatanganList = [],
  config,
  currentUser = null
}) => {
  const [tanggal, setTanggal] = useState<string>(() => getLocalDateStr());

  // Automatically sync tanggal at midnight or when waking up on a new day
  useEffect(() => {
    return onDayRollover((newDate) => {
      setTanggal(newDate);
    });
  }, []);
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedMapel, setSelectedMapel] = useState<string>("");
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Local attendance state mapping: studentId -> status
  const [attendanceState, setAttendanceState] = useState<Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'>>({});

  // QR Scanner refs & state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Siap melakukan scan kartu...");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [manualScanNisn, setManualScanNisn] = useState<string>("");
  const isScanningRef = useRef<boolean>(false);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));
  const isGuruKelas = currentUser?.role === "guru_kelas";

  // Set default class and mapel for guru_kelas
  useEffect(() => {
    if (allowedClasses.length > 0 && !selectedKelas) {
      setSelectedKelas(allowedClasses[0]);
    }
    if (isGuruKelas && !selectedMapel) {
      setSelectedMapel("Semua Mapel (Guru Kelas)");
    }
  }, [allowedClasses, selectedKelas, isGuruKelas, selectedMapel]);

  const studentsInClass = siswaList.filter((s) => s.kelas === selectedKelas);

  // Load existing records for selected Date + Class + Mapel with morning attendance integration
  useEffect(() => {
    const effectiveMapel = isGuruKelas ? (selectedMapel || "Semua Mapel (Guru Kelas)") : selectedMapel;
    if (tanggal && selectedKelas && (effectiveMapel || isGuruKelas)) {
      const existingRecords = absensiList.filter(
        (a) =>
          (a.waktu === tanggal || a.tanggal === tanggal) &&
          a.kelas === selectedKelas &&
          (isGuruKelas
            ? (!a.mapel || a.mapel === "Semua Mapel (Guru Kelas)" || a.mapel === "Guru Kelas" || a.mapel.includes("Guru Kelas") || a.mapel === "Scan QR" || a.mapel === "Scan" || a.mapel === selectedMapel)
            : a.mapel === selectedMapel)
      );

      const morningLogs = (logKedatanganList || []).filter(
        (k) => k.tanggal === tanggal && k.kelas === selectedKelas
      );

      const stateMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {};
      studentsInClass.forEach((s) => {
        // 1. Direct record for this class & mapel
        const found = existingRecords.find((rec) => rec.idSiswa === s.id || rec.idSiswa === s.nisn);
        if (found) {
          stateMap[s.id] = found.status;
          return;
        }

        // 2. Integration with Morning Arrival Log (Absen Kedatangan Pagi)
        const morningLog = morningLogs.find((k) => k.idSiswa === s.id || k.nisn === s.nisn);
        if (morningLog) {
          if (morningLog.statusKehadiran) {
            stateMap[s.id] = morningLog.statusKehadiran;
          } else if (morningLog.status === "Sakit" || morningLog.status === "Izin" || morningLog.status === "Alpa") {
            stateMap[s.id] = morningLog.status;
          } else {
            stateMap[s.id] = "Hadir";
          }
          return;
        }

        // 3. Fallback default
        stateMap[s.id] = "Hadir";
      });

      setAttendanceState(stateMap);
    }
  }, [tanggal, selectedKelas, selectedMapel, absensiList, logKedatanganList, siswaList, isGuruKelas]);

  // Re-sync attendance from morning arrival logs
  const handleResyncFromMorning = () => {
    const morningLogs = (logKedatanganList || []).filter(
      (k) => k.tanggal === tanggal && k.kelas === selectedKelas
    );

    let syncedCount = 0;
    const updated = { ...attendanceState };
    studentsInClass.forEach((s) => {
      const morningLog = morningLogs.find((k) => k.idSiswa === s.id || k.nisn === s.nisn);
      if (morningLog) {
        syncedCount++;
        if (morningLog.statusKehadiran) {
          updated[s.id] = morningLog.statusKehadiran;
        } else if (morningLog.status === "Sakit" || morningLog.status === "Izin" || morningLog.status === "Alpa") {
          updated[s.id] = morningLog.status;
        } else {
          updated[s.id] = "Hadir";
        }
      }
    });

    setAttendanceState(updated);
    notifySimpanSuccess(`Berhasil menyinkronkan ${syncedCount} siswa dari data kedatangan pagi!`);
  };

  // Set All Hadir
  const handleSetHadirSemua = () => {
    const updated: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {};
    studentsInClass.forEach((s) => {
      updated[s.id] = "Hadir";
    });
    setAttendanceState(updated);
  };

  // Change individual status
  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa') => {
    setAttendanceState((prev) => ({ ...prev, [studentId]: status }));
  };

  // Save batch attendance to Firestore
  const handleSaveAbsensi = async () => {
    const mapelToSave = isGuruKelas ? (selectedMapel || "Semua Mapel (Guru Kelas)") : selectedMapel;
    if (!tanggal || !selectedKelas || (!isGuruKelas && !selectedMapel)) {
      notifySimpanError("Silakan pilih Tanggal, Kelas, dan Mata Pelajaran.");
      return;
    }

    if (studentsInClass.length === 0) {
      notifySimpanError("Belum ada siswa di kelas ini.");
      return;
    }

    const yearMonth = tanggal.split("-");
    const thn = yearMonth[0] || "2026";
    const bln = yearMonth[1] || "01";

    const itemsToSave: LogAbsensi[] = studentsInClass.map((s) => {
      const docId = `${tanggal}_${selectedKelas}_${mapelToSave}_${s.id}`;
      return {
        id: docId,
        waktu: tanggal,
        tanggal: tanggal,
        kelas: selectedKelas,
        mapel: mapelToSave,
        idSiswa: s.id,
        namaSiswa: s.nama,
        status: attendanceState[s.id] || "Hadir",
        bulan: bln,
        tahun: thn,
        namaGuru: config.Nama_Guru || "Guru"
      };
    });

    try {
      await batchSaveDocuments(COLLECTIONS.LOG_ABSENSI, itemsToSave);
      notifySimpanSuccess(`Absensi kelas ${selectedKelas} (${itemsToSave.length} siswa) tersimpan ke Firebase!`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan absensi.");
    }
  };

  // Manual Scan Submit
  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanNisn.trim()) return;

    const val = manualScanNisn.trim();
    const matched = siswaList.find((s) => s.nisn === val || s.id === val);

    if (matched) {
      setAttendanceState((prev) => ({ ...prev, [matched.id]: "Hadir" }));
      const statusText = `BERHASIL: ${matched.nama} (NISN: ${matched.nisn}) -> HADIR`;
      setScanStatus(statusText);
      notifySimpanSuccess(statusText);

      const currentMapel = isGuruKelas ? "Semua Mapel (Guru Kelas)" : (selectedMapel || 'Absensi QR');
      const docId = `${tanggal}_${selectedKelas || matched.kelas}_${currentMapel}_${matched.id}`;
      saveDocument(COLLECTIONS.LOG_ABSENSI, docId, {
        id: docId,
        waktu: tanggal,
        tanggal: tanggal,
        kelas: selectedKelas || matched.kelas,
        mapel: currentMapel,
        idSiswa: matched.id,
        namaSiswa: matched.nama,
        status: "Hadir",
        bulan: tanggal.split("-")[1] || "01",
        tahun: tanggal.split("-")[0] || "2026",
        namaGuru: config.Nama_Guru || "Guru"
      });
      setManualScanNisn("");
    } else {
      const errorText = `NISN/Kode '${val}' tidak ditemukan dalam database siswa.`;
      setScanStatus(errorText);
      notifySimpanError(errorText);
    }
  };

  // Start Camera Process
  const startCameraProcess = async () => {
    setCameraError("");
    setScanStatus("Mengaktifkan kamera...");

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraActive(true);
        isScanningRef.current = true;
        setScanStatus("Kamera aktif. Arahkan QR Code Kartu Pelajar...");
        scanLoop();
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraActive(false);
      isScanningRef.current = false;
      const errMsg = err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
        ? "Izin kamera ditolak browser. Silakan izinkan akses kamera pada ikon gembok di address bar atau buka di Tab Baru."
        : "Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.";
      setCameraError(errMsg);
      setScanStatus("Kamera tidak aktif.");
    }
  };

  const stopCameraProcess = () => {
    isScanningRef.current = false;
    setCameraActive(false);
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanLoop = () => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const codeVal = code.data.trim();
          const matchedSiswa = siswaList.find(
            (s) => s.nisn === codeVal || s.id === codeVal
          );

          if (matchedSiswa) {
            setAttendanceState((prev) => ({ ...prev, [matchedSiswa.id]: "Hadir" }));
            const successText = `BERHASIL: ${matchedSiswa.nama} (NISN: ${matchedSiswa.nisn}) -> HADIR`;
            setScanStatus(successText);
            setStatusMsg({ type: "success", text: successText });

            const currentMapel = isGuruKelas ? "Semua Mapel (Guru Kelas)" : (selectedMapel || 'Scan QR');
            const docId = `${tanggal}_${selectedKelas || matchedSiswa.kelas}_${currentMapel}_${matchedSiswa.id}`;
            saveDocument(COLLECTIONS.LOG_ABSENSI, docId, {
              id: docId,
              waktu: tanggal,
              tanggal: tanggal,
              kelas: selectedKelas || matchedSiswa.kelas,
              mapel: currentMapel,
              idSiswa: matchedSiswa.id,
              namaSiswa: matchedSiswa.nama,
              status: "Hadir",
              bulan: tanggal.split("-")[1] || "01",
              tahun: tanggal.split("-")[0] || "2026",
              namaGuru: config.Nama_Guru || "Guru"
            });
          } else {
            setScanStatus(`QR Terbaca: '${codeVal}' (Data siswa tidak ditemukan)`);
          }
        }
      }
    }

    if (isScanningRef.current) {
      requestAnimationFrame(scanLoop);
    }
  };

  // Camera lifecycle trigger when mode changes
  useEffect(() => {
    if (mode === "scan") {
      startCameraProcess();
    } else {
      stopCameraProcess();
    }

    return () => {
      stopCameraProcess();
    };
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Header and mode toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Input Absensi Harian Siswa
            </h2>
            <p className="text-xs text-slate-500">
              Catat presensi harian secara manual atau otomatis menggunakan QR Scanner Kamera.
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                mode === "manual"
                  ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Input Manual
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer ${
                mode === "scan"
                  ? "bg-white dark:bg-slate-800 text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan QR Kamera</span>
            </button>
          </div>
        </div>

        {/* Filter Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Tanggal *</label>
              {tanggal !== getLocalDateStr() && (
                <button
                  type="button"
                  onClick={() => setTanggal(getLocalDateStr())}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  title="Kembalikan ke Tanggal Hari Ini Sesuai Jam Perangkat"
                >
                  Set Hari Ini
                </button>
              )}
            </div>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pilih Kelas *</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            >
              <option value="">Pilih Kelas ({allowedClasses.length} Kelas Akses)</option>
              {allowedClasses.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              {isGuruKelas ? "Mata Pelajaran (Wali Kelas)" : "Pilih Mata Pelajaran *"}
            </label>
            {isGuruKelas ? (
              <div className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Semua Mapel (Full Seharian)
                </span>
                <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ml-1">
                  Guru Kelas
                </span>
              </div>
            ) : (
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              >
                <option value="">Pilih Mapel</option>
                {mapelList.map((m) => (
                  <option key={m.id} value={m.namaMapel}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Manual Attendance Mode */}
        {mode === "manual" && (
          <div className="space-y-4">
            {/* Morning Integration Info Banner */}
            {selectedKelas && (
              <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-blue-50 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-blue-950/30 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <Sunrise className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>Terintegrasi Otomatis dengan Absen Kedatangan Pagi</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500 text-white font-extrabold">Aktif</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Status siswa (Hadir, Sakit, Izin, Alpa) otomatis tersinkron dari pos kedatangan pagi ({formatTanggalLengkap(tanggal)}). Guru tidak perlu mengulang absensi siswa yang sudah tercatat.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResyncFromMorning}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Muat ulang status absensi siswa dari data kedatangan pagi hari ini"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sinkronkan Ulang dari Pagi</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatTanggalLengkap(tanggal)} • Kelas {selectedKelas || "-"} ({studentsInClass.length} Siswa)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSetHadirSemua}
                  disabled={studentsInClass.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Hadir Semua</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Nama Siswa & Status Kedatangan Pagi</th>
                    <th className="p-3 text-center w-24">Hadir</th>
                    <th className="p-3 text-center w-24">Izin</th>
                    <th className="p-3 text-center w-24">Sakit</th>
                    <th className="p-3 text-center w-24">Alpa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {!selectedKelas || !selectedMapel ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Silakan pilih Tanggal, Kelas, dan Mata Pelajaran terlebih dahulu.
                      </td>
                    </tr>
                  ) : studentsInClass.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Tidak ada siswa di Kelas {selectedKelas}.
                      </td>
                    </tr>
                  ) : (
                    studentsInClass.map((s, idx) => {
                      const currentStatus = attendanceState[s.id] || "Hadir";
                      const morningLog = (logKedatanganList || []).find(
                        (k) => k.tanggal === tanggal && (k.idSiswa === s.id || k.nisn === s.nisn)
                      );

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{s.nama}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {s.nisn && <span className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn}</span>}
                              {morningLog ? (
                                morningLog.statusKehadiran === "Sakit" || morningLog.status === "Sakit" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    🏥 Sakit (Piket Pagi)
                                  </span>
                                ) : morningLog.statusKehadiran === "Izin" || morningLog.status === "Izin" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    ✉️ Izin (Piket Pagi)
                                  </span>
                                ) : morningLog.statusKehadiran === "Alpa" || morningLog.status === "Alpa" ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    ❌ Alpa (Piket Pagi)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    🌅 Hadir Pagi ({morningLog.jamDatang} WIB)
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">⚪ Belum tercatat pagi</span>
                              )}
                            </div>
                          </td>

                          {/* Status Options */}
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Hadir"}
                              onChange={() => handleStatusChange(s.id, "Hadir")}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Izin"}
                              onChange={() => handleStatusChange(s.id, "Izin")}
                              className="w-4 h-4 accent-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Sakit"}
                              onChange={() => handleStatusChange(s.id, "Sakit")}
                              className="w-4 h-4 accent-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="radio"
                              name={`status_${s.id}`}
                              checked={currentStatus === "Alpa"}
                              onChange={() => handleStatusChange(s.id, "Alpa")}
                              className="w-4 h-4 accent-red-600 cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveAbsensi}
                disabled={studentsInClass.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Absensi ke Firebase</span>
              </button>
            </div>
          </div>
        )}

        {/* Scan Mode */}
        {mode === "scan" && (
          <div className="space-y-5 text-center py-4">
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Arahkan QR Code Kartu Pelajar siswa ke kamera atau masukkan NISN secara manual/barcode reader di bawah.
            </p>

            {cameraError && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-semibold max-w-md mx-auto space-y-2">
                <div className="flex items-center justify-center space-x-1.5 text-amber-700 dark:text-amber-400 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Akses Kamera Dibatasi</span>
                </div>
                <p className="text-[11px] leading-relaxed">{cameraError}</p>
              </div>
            )}

            <div className="relative w-full max-w-sm mx-auto aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden shadow-lg border-2 border-blue-600 flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              {cameraActive && (
                <div className="absolute inset-0 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none animate-pulse m-8" />
              )}
            </div>

            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={cameraActive ? stopCameraProcess : startCameraProcess}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shadow-xs ${
                  cameraActive
                    ? "bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{cameraActive ? "Hentikan Kamera" : "Aktifkan Kamera"}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 text-xs font-bold max-w-md mx-auto">
              {scanStatus}
            </div>

            {/* Alternative Manual Barcode / NISN Input */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto">
              <p className="text-[11px] font-bold text-slate-500 uppercase mb-2">
                Atau Input / Scan NISN Manual
              </p>
              <form onSubmit={handleManualScanSubmit} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ketik NISN atau scan barcode..."
                  value={manualScanNisn}
                  onChange={(e) => setManualScanNisn(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                >
                  Proses
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
