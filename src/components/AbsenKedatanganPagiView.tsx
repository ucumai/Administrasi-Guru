import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { 
  Sun, 
  Clock, 
  Trophy, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Download, 
  Trash2, 
  Award, 
  Zap, 
  BarChart3, 
  UserCheck, 
  QrCode, 
  Sparkles, 
  ChevronRight, 
  Star, 
  Printer, 
  Edit3, 
  RefreshCw,
  Crown,
  Flame,
  Medal,
  Users,
  Camera,
  CameraOff,
  Video,
  Volume2,
  VolumeX,
  X,
  Check
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Siswa, LogKedatangan, LogAbsensi, User, Pengaturan } from "../types";
import { saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { 
  getLocalDateStr, 
  getLocalTimeStr, 
  getLocalTimeWithSecondsStr, 
  onDayRollover, 
  formatTanggalLengkap, 
  formatIndonesianDate 
} from "../lib/dateUtils";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyHapusSuccess, 
  notifyHapusError, 
  notifyUnduhSuccess, 
  notifyUnduhError, 
  confirmDeleteAlert,
  showToastSuccess
} from "../lib/swal";

interface AbsenKedatanganPagiViewProps {
  siswaList: Siswa[];
  logKedatanganList: LogKedatangan[];
  absensiList?: LogAbsensi[];
  currentUser?: User | null;
  config?: Pengaturan;
}

// Character Avatar Mapping helper based on average arrival minutes after 06:00
const getCharacterProfile = (avgMinutesPast6: number, totalPresent: number) => {
  if (totalPresent === 0) {
    return {
      title: "Belum Ada Record",
      badge: "⚪ Belum Absen",
      character: "🥚",
      color: "from-slate-500 to-slate-700",
      textColor: "text-slate-600 dark:text-slate-400",
      bgLight: "bg-slate-100 dark:bg-slate-800",
      borderColor: "border-slate-300 dark:border-slate-700",
      desc: "Belum memiliki catatan kedatangan pagi."
    };
  }

  // avgMinutesPast6: 0 = 06:00, 15 = 06:15, 30 = 06:30, 60 = 07:00
  if (avgMinutesPast6 <= 20) {
    // Before 06:20 AM
    return {
      title: "Rajin Pagi Legend SSS",
      badge: "🦅 Burung Hantu Awal",
      character: "🦅",
      color: "from-amber-400 via-orange-500 to-yellow-500",
      textColor: "text-amber-600 dark:text-amber-400",
      bgLight: "bg-amber-50 dark:bg-amber-950/60",
      borderColor: "border-amber-400 dark:border-amber-600",
      desc: "Datang paling pagi sebelum matahari terbit sempurna!"
    };
  } else if (avgMinutesPast6 <= 35) {
    // 06:20 - 06:35 AM
    return {
      title: "Bintang Disiplin SS",
      badge: "🦁 Singa Kedisiplinan",
      character: "🦁",
      color: "from-indigo-500 via-purple-500 to-pink-500",
      textColor: "text-indigo-600 dark:text-indigo-400",
      bgLight: "bg-indigo-50 dark:bg-indigo-950/60",
      borderColor: "border-indigo-400 dark:border-indigo-600",
      desc: "Selalu hadir sangat pagi dan siap belajar!"
    };
  } else if (avgMinutesPast6 <= 50) {
    // 06:35 - 06:50 AM
    return {
      title: "Pejuang Tepat Waktu S",
      badge: "🦊 Rubah Cepat",
      character: "🦊",
      color: "from-emerald-400 to-teal-600",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/60",
      borderColor: "border-emerald-400 dark:border-emerald-600",
      desc: "Hadir konsisten tepat waktu sebelum bel berbunyi."
    };
  } else if (avgMinutesPast6 <= 60) {
    // 06:50 - 07:00 AM
    return {
      title: "Hadir Reguler A",
      badge: "🐻 Beruang Disiplin",
      character: "🐻",
      color: "from-blue-400 to-cyan-600",
      textColor: "text-blue-600 dark:text-blue-400",
      bgLight: "bg-blue-50 dark:bg-blue-950/60",
      borderColor: "border-blue-300 dark:border-blue-700",
      desc: "Tiba pas sebelum bel sekolah berbunyi."
    };
  } else {
    // After 07:00 AM
    return {
      title: "Perlu Ditingkatkan",
      badge: "🐢 Pejuang Bangun Pagi",
      character: "🐢",
      color: "from-rose-400 to-red-600",
      textColor: "text-rose-600 dark:text-rose-400",
      bgLight: "bg-rose-50 dark:bg-rose-950/60",
      borderColor: "border-rose-300 dark:border-rose-700",
      desc: "Perlu semangat bangun lebih pagi lagi."
    };
  }
};

// Convert HH:mm to minutes past 06:00
const parseTimeToMinutesPast6 = (timeStr: string) => {
  if (!timeStr) return 60; // Default 07:00
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 60;
  const totalMinutes = h * 60 + m;
  const baseMinutes = 6 * 60; // 06:00 AM = 360 mins
  return totalMinutes - baseMinutes; // e.g. 06:15 -> 15 mins
};

// Convert minutes past 06:00 back to HH:mm string
const formatMinutesToTimeString = (avgMins: number) => {
  const baseMinutes = 6 * 60 + avgMins;
  const h = Math.floor(baseMinutes / 60);
  const m = Math.round(baseMinutes % 60);
  const hStr = String(h).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  return `${hStr}:${mStr}`;
};

export const AbsenKedatanganPagiView: React.FC<AbsenKedatanganPagiViewProps> = ({
  siswaList,
  logKedatanganList = [],
  currentUser = null,
  config
}) => {
  // Navigation tab inside Kedatangan View
  const [activeSubTab, setActiveSubTab] = useState<"input" | "rekap" | "ranking">("input");

  // Input Absensi State
  const getCurrentDateStr = () => getLocalDateStr();
  const getCurrentTimeStr = () => getLocalTimeStr();

  const [selectedTanggal, setSelectedTanggal] = useState<string>(getCurrentDateStr());
  const [searchSiswa, setSearchSiswa] = useState<string>("");
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>("");

  // Live Device Clock state (ticks every second)
  const [liveDeviceDate, setLiveDeviceDate] = useState<Date>(new Date());
  const [useAutoDeviceTime, setUseAutoDeviceTime] = useState<boolean>(true);

  // Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScannedResult, setLastScannedResult] = useState<{
    siswa: Siswa;
    jamDatang: string;
    status: 'Sangat Pagi' | 'Tepat Waktu' | 'Terlambat';
    urutan: number;
    pesanSuara: string;
    badgeText: string;
    category: 'awal' | 'sedikit_terlambat' | 'terlalu_siang';
    timestamp: number;
  } | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  // Voice Announcement Helper based on Arrival Rank Order
  const getArrivalVoiceMessage = (nama: string, urutan: number) => {
    if (urutan <= 20) {
      return {
        text: `Hebat ${nama}, kamu datang lebih awal. Kamu urutan ke-${urutan}.`,
        category: "awal" as const,
        badgeText: `Hebat kamu datang lebih awal (Urutan #${urutan})`
      };
    } else if (urutan <= 40) {
      return {
        text: `${nama}, kamu datang sedikit terlambat hari ini. Kamu urutan ke-${urutan}.`,
        category: "sedikit_terlambat" as const,
        badgeText: `Kamu datang sedikit terlambat hari ini (Urutan #${urutan})`
      };
    } else {
      return {
        text: `${nama}, kamu datang terlalu siang, ayo besok datang lebih pagi. Kamu urutan ke-${urutan}.`,
        category: "terlalu_siang" as const,
        badgeText: `Kamu datang terlalu siang, ayo besok datang lebih pagi (Urutan #${urutan})`
      };
    }
  };

  // Voice announcement queue to prevent cut-offs, overlapping, or speech synthesis collisions
  const voiceQueueRef = useRef<Array<{ nama: string; urutan: number }>>([]);
  const isSpeakingRef = useRef<boolean>(false);

  // Local session cache to prevent race conditions during rapid consecutive scans:
  // Key: `${targetDate}_${siswaId}` -> { urutan: number, timestamp: number }
  const localSessionArrivalsRef = useRef<Map<string, { idSiswa: string; urutan: number; timestamp: number }>>(new Map());

  // Helper to process speech queue sequentially
  const processVoiceQueue = useCallback(() => {
    if (!soundEnabled) {
      voiceQueueRef.current = [];
      isSpeakingRef.current = false;
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      voiceQueueRef.current = [];
      isSpeakingRef.current = false;
      return;
    }

    if (voiceQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      return;
    }

    // If browser is currently speaking, let previous utterance finish and fire onend
    if (isSpeakingRef.current && window.speechSynthesis.speaking) {
      return;
    }

    const nextItem = voiceQueueRef.current.shift();
    if (!nextItem) {
      isSpeakingRef.current = false;
      return;
    }

    isSpeakingRef.current = true;

    try {
      const { text } = getArrivalVoiceMessage(nextItem.nama, nextItem.urutan);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 1.05; // Slightly faster for responsive queue processing
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(
        (v) => v.lang === "id-ID" || v.lang.toLowerCase().startsWith("id")
      );
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      }

      let completed = false;
      const onDone = () => {
        if (completed) return;
        completed = true;
        isSpeakingRef.current = false;
        // Natural small gap (150ms) between student voice announcements
        setTimeout(() => {
          processVoiceQueue();
        }, 150);
      };

      utterance.onend = onDone;
      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error:", e);
        onDone();
      };

      // Watchdog timeout in case SpeechSynthesis hangs or fails to fire onend
      setTimeout(() => {
        if (!completed) {
          onDone();
        }
      }, 7000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis error:", err);
      isSpeakingRef.current = false;
      processVoiceQueue();
    }
  }, [soundEnabled]);

  const speakArrivalNotification = useCallback((nama: string, urutan: number) => {
    if (!soundEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Push into queue
    voiceQueueRef.current.push({ nama, urutan });

    // Process immediately if not currently playing
    if (!isSpeakingRef.current) {
      processVoiceQueue();
    }
  }, [soundEnabled, processVoiceQueue]);

  // Cancel any ongoing speech and empty queue if sound is toggled off
  useEffect(() => {
    if (!soundEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      voiceQueueRef.current = [];
      isSpeakingRef.current = false;
    }
  }, [soundEnabled]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        voiceQueueRef.current = [];
        isSpeakingRef.current = false;
      }
    };
  }, []);

  /**
   * Calculates a definitive, monotonic, unique arrival sequence number for a student.
   * Guarantees:
   * 1. Fast sequential scans never get duplicate numbers, even if Firestore snapshot hasn't updated yet.
   * 2. Only physical arrivals ("Hadir") count towards the sequence number (Sakit, Izin, Alpa are excluded).
   * 3. A student scanning multiple times on the same date always gets their original assigned number.
   * 4. Stored `urutanKedatangan` from existing database records is respected and preserved.
   */
  const getOrAssignArrivalSequence = useCallback((targetDate: string, siswaId: string): number => {
    const sessionKey = `${targetDate}_${siswaId}`;

    // 1. If already assigned in active browser session, return immediately
    if (localSessionArrivalsRef.current.has(sessionKey)) {
      return localSessionArrivalsRef.current.get(sessionKey)!.urutan;
    }

    // 2. Filter physical arrivals from database logs for targetDate
    // Exclude Sakit, Izin, and Alpa
    const physicalArrivalLogs = logKedatanganList.filter((log) => {
      if (log.tanggal !== targetDate) return false;
      const type = log.statusKehadiran || (
        log.status === "Sakit" ? "Sakit" :
        log.status === "Izin" ? "Izin" :
        log.status === "Alpa" ? "Alpa" : "Hadir"
      );
      return type === "Hadir";
    });

    // 3. If student already has a physical arrival record in the database
    const existingLog = physicalArrivalLogs.find((l) => l.idSiswa === siswaId);
    if (existingLog) {
      let existingUrutan = existingLog.urutanKedatangan;
      if (!existingUrutan || existingUrutan <= 0) {
        // Sort existing physical logs by timestamp
        const sorted = [...physicalArrivalLogs].sort((a, b) => (a.waktuTimestamp || 0) - (b.waktuTimestamp || 0));
        const idx = sorted.findIndex((l) => l.idSiswa === siswaId);
        existingUrutan = idx >= 0 ? idx + 1 : 1;
      }
      localSessionArrivalsRef.current.set(sessionKey, {
        idSiswa: siswaId,
        urutan: existingUrutan,
        timestamp: existingLog.waktuTimestamp || Date.now()
      });
      return existingUrutan;
    }

    // 4. Calculate current highest sequence number for targetDate across BOTH database and local session
    let maxSequence = 0;

    // From database physical logs
    physicalArrivalLogs.forEach((l) => {
      if (l.urutanKedatangan && l.urutanKedatangan > maxSequence) {
        maxSequence = l.urutanKedatangan;
      }
    });

    // Also compare with the total number of unique physical students already recorded in DB
    const uniqueDbCount = new Set(physicalArrivalLogs.map((l) => l.idSiswa)).size;
    if (uniqueDbCount > maxSequence) {
      maxSequence = uniqueDbCount;
    }

    // From local session arrivals for targetDate
    localSessionArrivalsRef.current.forEach((entry, key) => {
      if (key.startsWith(`${targetDate}_`)) {
        if (entry.urutan > maxSequence) {
          maxSequence = entry.urutan;
        }
      }
    });

    const nextSequence = maxSequence + 1;

    // Immediately record in localSessionArrivalsRef so any subsequent scan (even in 5ms) sees this number as taken
    localSessionArrivalsRef.current.set(sessionKey, {
      idSiswa: siswaId,
      urutan: nextSequence,
      timestamp: Date.now()
    });

    return nextSequence;
  }, [logKedatanganList]);

  // Keep live time ticking and update quickJamInput & selectedTanggal if auto device time enabled
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLiveDeviceDate(now);
      if (useAutoDeviceTime) {
        setQuickJamInput(getLocalTimeStr(now));
        const todayStr = getLocalDateStr(now);
        setSelectedTanggal((prev) => (prev !== todayStr ? todayStr : prev));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [useAutoDeviceTime]);

  // Instant day rollover on midnight or background resume
  useEffect(() => {
    return onDayRollover((newDate) => {
      if (useAutoDeviceTime) {
        setSelectedTanggal(newDate);
        setLiveDeviceDate(new Date());
        setQuickJamInput(getLocalTimeStr());
      }
    });
  }, [useAutoDeviceTime]);

  // Audio Beep Feedback
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880; // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Ignore audio restriction error
    }
  };

  // Format live device time for display
  const formattedLiveClock = useMemo(() => {
    const h = String(liveDeviceDate.getHours()).padStart(2, "0");
    const m = String(liveDeviceDate.getMinutes()).padStart(2, "0");
    const s = String(liveDeviceDate.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [liveDeviceDate]);

  // Period Filter for Rekap & Ranking
  const [rekapPeriode, setRekapPeriode] = useState<"mingguan" | "bulanan" | "semester" | "tahunan">("bulanan");
  const [selectedBulan, setSelectedBulan] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [selectedTahun, setSelectedTahun] = useState<string>(
    String(new Date().getFullYear())
  );
  const [selectedSemester, setSelectedSemester] = useState<"Ganjil" | "Genap">("Ganjil");

  // Get list of unique classes for optional filtering
  const allKelasList = useMemo(() => {
    const setK = new Set(siswaList.map((s) => s.kelas).filter(Boolean));
    return Array.from(setK).sort();
  }, [siswaList]);

  // Today's arrival logs
  const todayLogs = useMemo(() => {
    return logKedatanganList.filter((log) => log.tanggal === selectedTanggal);
  }, [logKedatanganList, selectedTanggal]);

  // Map of today's present student IDs
  const todayPresentMap = useMemo(() => {
    const map = new Map<string, LogKedatangan>();
    todayLogs.forEach((log) => {
      map.set(log.idSiswa, log);
    });
    return map;
  }, [todayLogs]);

  // Attendance statistics breakdown for selectedTanggal
  const attendanceStats = useMemo(() => {
    let hadirCount = 0;
    let sakitCount = 0;
    let izinCount = 0;
    let alpaCount = 0;

    todayLogs.forEach((log) => {
      const type = log.statusKehadiran || (
        log.status === "Sakit" ? "Sakit" :
        log.status === "Izin" ? "Izin" :
        log.status === "Alpa" ? "Alpa" : "Hadir"
      );
      if (type === "Hadir") hadirCount++;
      else if (type === "Sakit") sakitCount++;
      else if (type === "Izin") izinCount++;
      else if (type === "Alpa") alpaCount++;
    });

    const totalRecorded = todayLogs.length;
    const belumAbsenCount = Math.max(0, siswaList.length - totalRecorded);

    return { hadirCount, sakitCount, izinCount, alpaCount, totalRecorded, belumAbsenCount };
  }, [todayLogs, siswaList.length]);

  // Centralized helper to sync arrival status into class attendance (COLLECTIONS.LOG_ABSENSI)
  const syncToClassAbsensi = async (
    siswa: Siswa,
    tanggal: string,
    tipe: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'
  ) => {
    try {
      const [thn, bln] = (tanggal || getLocalDateStr()).split("-");
      const classDocId = `${tanggal}_${siswa.kelas}_Semua Mapel (Guru Kelas)_${siswa.id}`;
      const absensiPayload: LogAbsensi = {
        id: classDocId,
        waktu: tanggal,
        tanggal: tanggal,
        kelas: siswa.kelas,
        mapel: "Semua Mapel (Guru Kelas)",
        idSiswa: siswa.id,
        namaSiswa: siswa.nama,
        status: tipe,
        bulan: bln || "01",
        tahun: thn || "2026",
        namaGuru: currentUser?.nama || config?.Nama_Guru || "Piket Kedatangan Pagi"
      };
      await saveDocument(COLLECTIONS.LOG_ABSENSI, classDocId, absensiPayload);
    } catch (err) {
      console.error("Gagal sinkronisasi ke log absensi kelas:", err);
    }
  };

  // Centralized helper to remove synced class attendance record
  const removeSyncedClassAbsensi = async (siswaId: string, kelas: string, tanggal: string) => {
    try {
      const classDocId = `${tanggal}_${kelas}_Semua Mapel (Guru Kelas)_${siswaId}`;
      await deleteDocument(COLLECTIONS.LOG_ABSENSI, classDocId);
    } catch (err) {
      // Ignore if document not found
    }
  };

  // Calculate status based on time string
  const calculateArrivalStatus = (jam: string): 'Sangat Pagi' | 'Tepat Waktu' | 'Terlambat' => {
    const mins = parseTimeToMinutesPast6(jam);
    if (mins <= 30) return 'Sangat Pagi'; // < 06:30
    if (mins <= 60) return 'Tepat Waktu'; // 06:30 - 07:00
    return 'Terlambat'; // > 07:00
  };

  // Rapid Scan / Quick Entry input
  const [scanInput, setScanInput] = useState<string>("");
  const [quickJamInput, setQuickJamInput] = useState<string>(getCurrentTimeStr());

  // Function to process scanned code (from camera or text input) using device time
  const processStudentScanCode = async (rawText: string) => {
    const term = rawText.trim();
    if (!term) return false;

    // Search student by NISN, NIS, ID, or Name
    let matchedSiswa = siswaList.find(
      (s) =>
        s.nisn.toLowerCase() === term.toLowerCase() ||
        (s.nis && s.nis.toLowerCase() === term.toLowerCase()) ||
        s.id.toLowerCase() === term.toLowerCase() ||
        s.nama.toLowerCase() === term.toLowerCase()
    );

    if (!matchedSiswa) {
      // Try parsing JSON format in case QR contains JSON payload
      try {
        const parsed = JSON.parse(term);
        const searchVal = String(parsed.nisn || parsed.id || parsed.nis || "").toLowerCase();
        if (searchVal) {
          matchedSiswa = siswaList.find(
            (s) =>
              s.nisn.toLowerCase() === searchVal ||
              (s.nis && s.nis.toLowerCase() === searchVal) ||
              s.id.toLowerCase() === searchVal
          );
        }
      } catch (e) {
        // Not JSON
      }
    }

    if (!matchedSiswa) {
      notifySimpanError(`Siswa dengan NISN/Kode Barcode "${term}" tidak terdaftar.`);
      return false;
    }

    // Always get exact current date and time from device clock
    const now = new Date();
    const targetDate = useAutoDeviceTime ? getLocalDateStr(now) : selectedTanggal;
    const currentDeviceTime = getLocalTimeStr(now);

    // If targetDate differs from selectedTanggal, update state so UI immediately displays today
    if (useAutoDeviceTime && selectedTanggal !== targetDate) {
      setSelectedTanggal(targetDate);
    }

    const status = calculateArrivalStatus(currentDeviceTime);
    const docId = `ked_${matchedSiswa.id}_${targetDate}`;

    // Calculate monotonic arrival order sequence for targetDate
    const urutan = getOrAssignArrivalSequence(targetDate, matchedSiswa.id);
    const voiceInfo = getArrivalVoiceMessage(matchedSiswa.nama, urutan);

    const payload: LogKedatangan = {
      id: docId,
      idSiswa: matchedSiswa.id,
      nisn: matchedSiswa.nisn,
      nis: matchedSiswa.nis,
      namaSiswa: matchedSiswa.nama,
      kelas: matchedSiswa.kelas,
      tanggal: targetDate,
      jamDatang: currentDeviceTime,
      waktuTimestamp: Date.now(),
      status,
      statusKehadiran: "Hadir",
      urutanKedatangan: urutan,
      namaPetugas: currentUser?.nama || "Admin"
    };

    try {
      await saveDocument(COLLECTIONS.PRESENSI_KEDATANGAN, docId, payload);
      await syncToClassAbsensi(matchedSiswa, targetDate, "Hadir");
      setLastScannedResult({
        siswa: matchedSiswa,
        jamDatang: currentDeviceTime,
        status,
        urutan,
        pesanSuara: voiceInfo.text,
        badgeText: voiceInfo.badgeText,
        category: voiceInfo.category,
        timestamp: Date.now()
      });
      playBeep();
      speakArrivalNotification(matchedSiswa.nama, urutan);
      showToastSuccess(`✅ [Urutan #${urutan}] ${matchedSiswa.nama} (${matchedSiswa.kelas}) - ${currentDeviceTime} WIB`);
      return true;
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal mencatat kedatangan.");
      return false;
    }
  };

  // Camera scanner activation lifecycle effect
  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let isMounted = true;

    if (isCameraActive) {
      setCameraError("");
      const scannerId = "reader-camera-absen";

      // Detect available cameras on device
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (isMounted && devices && devices.length > 0) {
            setAvailableCameras(devices);
          }
        })
        .catch((err) => {
          console.warn("Error enumerating cameras:", err);
        });

      const timer = setTimeout(() => {
        if (!isMounted) return;
        try {
          scanner = new Html5Qrcode(scannerId);
          html5QrcodeRef.current = scanner;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          const cameraConfig = selectedCameraId
            ? selectedCameraId
            : { facingMode: cameraFacingMode };

          scanner
            .start(
              cameraConfig,
              config,
              (decodedText) => {
                const now = Date.now();
                if (
                  lastScannedCodeRef.current.code === decodedText &&
                  now - lastScannedCodeRef.current.time < 3000
                ) {
                  return; // Throttle identical code scan within 3 seconds
                }
                lastScannedCodeRef.current = { code: decodedText, time: now };
                processStudentScanCode(decodedText);
              },
              () => {
                // Ignore scanning noise frame errors
              }
            )
            .catch((err) => {
              console.error("Camera error:", err);
              if (isMounted) {
                setCameraError("Tidak dapat mengaktifkan kamera (" + (cameraFacingMode === "environment" ? "Belakang" : "Depan") + "). Pastikan memberikan izin kamera pada browser Anda.");
              }
            });
        } catch (e: any) {
          console.error("Scanner initialization error:", e);
          if (isMounted) {
            setCameraError("Gagal menginisialisasi modul kamera: " + (e?.message || e));
          }
        }
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scanner && scanner.isScanning) {
          scanner.stop().then(() => scanner?.clear()).catch(console.error);
        }
      };
    }
  }, [isCameraActive, selectedTanggal, cameraFacingMode, selectedCameraId]);

  // Toggle front / back camera
  const handleToggleCameraFacing = () => {
    setSelectedCameraId(""); // Reset specific ID to toggle by facingMode
    setCameraFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Quick scan / search submit handler
  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const term = scanInput.trim().toLowerCase();
    const matchedSiswa = siswaList.find(
      (s) =>
        s.nisn.toLowerCase() === term ||
        (s.nis && s.nis.toLowerCase() === term) ||
        s.nama.toLowerCase() === term ||
        s.nama.toLowerCase().includes(term)
    );

    if (!matchedSiswa) {
      notifySimpanError(`Siswa dengan NISN/Nama "${scanInput}" tidak ditemukan.`);
      return;
    }

    const now = new Date();
    const targetDate = useAutoDeviceTime ? getLocalDateStr(now) : selectedTanggal;
    if (useAutoDeviceTime && selectedTanggal !== targetDate) {
      setSelectedTanggal(targetDate);
    }

    const jamToUse = useAutoDeviceTime ? getLocalTimeStr(now) : (quickJamInput || getLocalTimeStr(now));
    const status = calculateArrivalStatus(jamToUse);
    const docId = `ked_${matchedSiswa.id}_${targetDate}`;

    // Calculate monotonic arrival order sequence for targetDate
    const urutan = getOrAssignArrivalSequence(targetDate, matchedSiswa.id);
    const voiceInfo = getArrivalVoiceMessage(matchedSiswa.nama, urutan);

    const payload: LogKedatangan = {
      id: docId,
      idSiswa: matchedSiswa.id,
      nisn: matchedSiswa.nisn,
      nis: matchedSiswa.nis,
      namaSiswa: matchedSiswa.nama,
      kelas: matchedSiswa.kelas,
      tanggal: targetDate,
      jamDatang: jamToUse,
      waktuTimestamp: Date.now(),
      status,
      statusKehadiran: "Hadir",
      urutanKedatangan: urutan,
      namaPetugas: currentUser?.nama || "Admin"
    };

    try {
      await saveDocument(COLLECTIONS.PRESENSI_KEDATANGAN, docId, payload);
      await syncToClassAbsensi(matchedSiswa, targetDate, "Hadir");
      setLastScannedResult({
        siswa: matchedSiswa,
        jamDatang: jamToUse,
        status,
        urutan,
        pesanSuara: voiceInfo.text,
        badgeText: voiceInfo.badgeText,
        category: voiceInfo.category,
        timestamp: Date.now()
      });
      playBeep();
      speakArrivalNotification(matchedSiswa.nama, urutan);
      setScanInput("");
      showToastSuccess(`✅ [Urutan #${urutan}] ${matchedSiswa.nama} (${matchedSiswa.kelas}) - ${jamToUse} WIB (Tersinkron ke Absen Kelas)`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal mencatat kedatangan.");
    }
  };

  // Single student presensi handler with S, I, A options and class sync
  const handleRecordKedatanganStatus = async (
    siswa: Siswa,
    tipe: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa',
    customJam?: string
  ) => {
    const jamToUse = customJam || getCurrentTimeStr();
    const docId = `ked_${siswa.id}_${selectedTanggal}`;

    let arrivalStatus: any = 'Tepat Waktu';
    let catatan: string | undefined = undefined;
    let urutanKedatangan: number | undefined = undefined;

    if (tipe === 'Hadir') {
      arrivalStatus = calculateArrivalStatus(jamToUse);
      urutanKedatangan = getOrAssignArrivalSequence(selectedTanggal, siswa.id);
    } else if (tipe === 'Sakit') {
      arrivalStatus = 'Sakit';
      catatan = 'Sakit (Dicatat di Kedatangan Pagi)';
    } else if (tipe === 'Izin') {
      arrivalStatus = 'Izin';
      catatan = 'Izin (Dicatat di Kedatangan Pagi)';
    } else if (tipe === 'Alpa') {
      arrivalStatus = 'Alpa';
      catatan = 'Alpa / Tidak Hadir (Dicatat di Kedatangan Pagi)';
    }

    const payload: LogKedatangan = {
      id: docId,
      idSiswa: siswa.id,
      nisn: siswa.nisn,
      nis: siswa.nis,
      namaSiswa: siswa.nama,
      kelas: siswa.kelas,
      tanggal: selectedTanggal,
      jamDatang: jamToUse,
      waktuTimestamp: Date.now(),
      status: arrivalStatus,
      statusKehadiran: tipe,
      urutanKedatangan,
      catatan,
      namaPetugas: currentUser?.nama || "Admin"
    };

    try {
      await saveDocument(COLLECTIONS.PRESENSI_KEDATANGAN, docId, payload);
      await syncToClassAbsensi(siswa, selectedTanggal, tipe);
      const labelTipe = tipe === 'Hadir' 
        ? `Hadir [Urutan #${urutanKedatangan || 1}] (${jamToUse} WIB)` 
        : tipe.toUpperCase();
      showToastSuccess(`✅ [${siswa.kelas}] ${siswa.nama} -> ${labelTipe} (Terintegrasi ke Absen Kelas)`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal mencatat kedatangan.");
    }
  };

  // Delete arrival log and remove synced class record
  const handleDeleteKedatangan = async (logId: string, siswa: Siswa) => {
    const ok = await confirmDeleteAlert(
      "Hapus Catatan Kedatangan?",
      `Hapus presensi pagi untuk ${siswa.nama}? Catatan absensi kelas hari ini juga akan disinkronkan kembali.`
    );
    if (ok) {
      try {
        await deleteDocument(COLLECTIONS.PRESENSI_KEDATANGAN, logId);
        await removeSyncedClassAbsensi(siswa.id, siswa.kelas, selectedTanggal);
        // Clear cached sequence from local session
        localSessionArrivalsRef.current.delete(`${selectedTanggal}_${siswa.id}`);
        notifyHapusSuccess(`Presensi pagi ${siswa.nama} berhasil dihapus & disinkronkan dari absensi kelas.`);
      } catch (err: any) {
        notifyHapusError(err.message || "Gagal menghapus.");
      }
    }
  };

  // Bulk mark all filtered unrecorded students as present now
  const handleBulkMarkPresent = async () => {
    const unrecorded = filteredSiswaList.filter((s) => !todayPresentMap.has(s.id));
    if (unrecorded.length === 0) {
      notifySimpanError("Semua siswa pada daftar ini sudah memiliki catatan kedatangan.");
      return;
    }

    const jamToUse = getCurrentTimeStr();
    const status = calculateArrivalStatus(jamToUse);

    try {
      for (const s of unrecorded) {
        const docId = `ked_${s.id}_${selectedTanggal}`;
        const urutan = getOrAssignArrivalSequence(selectedTanggal, s.id);
        const payload: LogKedatangan = {
          id: docId,
          idSiswa: s.id,
          nisn: s.nisn,
          nis: s.nis,
          namaSiswa: s.nama,
          kelas: s.kelas,
          tanggal: selectedTanggal,
          jamDatang: jamToUse,
          waktuTimestamp: Date.now(),
          status,
          statusKehadiran: "Hadir",
          urutanKedatangan: urutan,
          namaPetugas: currentUser?.nama || "Admin"
        };
        await saveDocument(COLLECTIONS.PRESENSI_KEDATANGAN, docId, payload);
        await syncToClassAbsensi(s, selectedTanggal, "Hadir");
      }
      notifySimpanSuccess(`Berhasil mencatat Hadir untuk ${unrecorded.length} siswa & disinkronkan ke Absen Kelas!`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal melakukan presensi massal.");
    }
  };

  // Bulk mark all filtered unrecorded students as Alpa (for end of morning arrival picket)
  const handleBulkMarkAlpa = async () => {
    const unrecorded = filteredSiswaList.filter((s) => !todayPresentMap.has(s.id));
    if (unrecorded.length === 0) {
      notifySimpanError("Semua siswa pada daftar ini sudah memiliki catatan kedatangan.");
      return;
    }

    const ok = await confirmDeleteAlert(
      `Tandai Alpa (${unrecorded.length} Siswa)?`,
      `Tandai ${unrecorded.length} siswa yang belum hadir sebagai Alpa (A) dan sinkronkan ke Absen Kelas masing-masing?`
    );
    if (!ok) return;

    const jamToUse = getCurrentTimeStr();
    try {
      for (const s of unrecorded) {
        const docId = `ked_${s.id}_${selectedTanggal}`;
        const payload: LogKedatangan = {
          id: docId,
          idSiswa: s.id,
          nisn: s.nisn,
          nis: s.nis,
          namaSiswa: s.nama,
          kelas: s.kelas,
          tanggal: selectedTanggal,
          jamDatang: jamToUse,
          waktuTimestamp: Date.now(),
          status: "Alpa",
          statusKehadiran: "Alpa",
          catatan: "Alpa / Belum Hadir Saat Pintu Gerbang Ditutup",
          namaPetugas: currentUser?.nama || "Admin"
        };
        await saveDocument(COLLECTIONS.PRESENSI_KEDATANGAN, docId, payload);
        await syncToClassAbsensi(s, selectedTanggal, "Alpa");
      }
      notifySimpanSuccess(`Berhasil menandai ${unrecorded.length} siswa sebagai Alpa & disinkronkan ke Absen Kelas!`);
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menandai Alpa.");
    }
  };

  // Filtered Siswa List for Input View (all students across all classes, filtered by search or optional class dropdown)
  const filteredSiswaList = useMemo(() => {
    return siswaList.filter((s) => {
      const matchSearch =
        s.nama.toLowerCase().includes(searchSiswa.toLowerCase()) ||
        s.nisn.includes(searchSiswa) ||
        (s.nis && s.nis.includes(searchSiswa));
      const matchKelas = selectedKelasFilter ? s.kelas === selectedKelasFilter : true;
      return matchSearch && matchKelas;
    });
  }, [siswaList, searchSiswa, selectedKelasFilter]);

  // FILTERED LOGS FOR REKAP & RANKING
  const filteredRekapLogs = useMemo(() => {
    return logKedatanganList.filter((log) => {
      if (!log.tanggal) return false;
      const [y, m] = log.tanggal.split("-");

      if (rekapPeriode === "mingguan") {
        // Last 7 days or current month days
        const logDate = new Date(log.tanggal).getTime();
        const now = new Date().getTime();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        return logDate >= sevenDaysAgo && logDate <= now + 86400000;
      } else if (rekapPeriode === "bulanan") {
        return y === selectedTahun && m === selectedBulan;
      } else if (rekapPeriode === "semester") {
        const monthNum = parseInt(m, 10);
        if (selectedSemester === "Ganjil") {
          // July (07) to Dec (12)
          return y === selectedTahun && monthNum >= 7 && monthNum <= 12;
        } else {
          // Jan (01) to June (06)
          return y === selectedTahun && monthNum >= 1 && monthNum <= 6;
        }
      } else {
        // Tahunan
        return y === selectedTahun;
      }
    });
  }, [logKedatanganList, rekapPeriode, selectedBulan, selectedTahun, selectedSemester]);

  // COMPUTED RANKINGS FOR ALL STUDENTS
  const rankingList = useMemo(() => {
    // Map student ID to stats
    const statsMap = new Map<
      string,
      {
        siswa: Siswa;
        totalKedatangan: number;
        sangatPagiCount: number;
        tepatWaktuCount: number;
        terlambatCount: number;
        totalMinutesPast6: number;
      }
    >();

    // Initialize all students with zero
    siswaList.forEach((s) => {
      statsMap.set(s.id, {
        siswa: s,
        totalKedatangan: 0,
        sangatPagiCount: 0,
        tepatWaktuCount: 0,
        terlambatCount: 0,
        totalMinutesPast6: 0
      });
    });

    // Populate with filtered logs
    filteredRekapLogs.forEach((log) => {
      const item = statsMap.get(log.idSiswa);
      if (item) {
        item.totalKedatangan += 1;
        if (log.status === "Sangat Pagi") item.sangatPagiCount += 1;
        else if (log.status === "Tepat Waktu") item.tepatWaktuCount += 1;
        else item.terlambatCount += 1;

        const mins = parseTimeToMinutesPast6(log.jamDatang);
        item.totalMinutesPast6 += mins;
      }
    });

    // Calculate averages and convert to list
    const results = Array.from(statsMap.values()).map((st) => {
      const avgMinutes = st.totalKedatangan > 0 ? st.totalMinutesPast6 / st.totalKedatangan : 60;
      const avgTimeStr = formatMinutesToTimeString(avgMinutes);
      const profile = getCharacterProfile(avgMinutes, st.totalKedatangan);

      // Score formula: (Sangat Pagi * 10 + Tepat Waktu * 8 - Terlambat * 5)
      const rajinScore = Math.max(
        0,
        st.sangatPagiCount * 10 + st.tepatWaktuCount * 8 - st.terlambatCount * 5
      );

      return {
        ...st,
        avgMinutes,
        avgTimeStr,
        profile,
        rajinScore
      };
    });

    // Sort strategy: Total Kedatangan descending -> Earlier avgMinutes ascending -> Rajin Score descending
    results.sort((a, b) => {
      if (b.totalKedatangan !== a.totalKedatangan) {
        return b.totalKedatangan - a.totalKedatangan;
      }
      if (a.avgMinutes !== b.avgMinutes) {
        return a.avgMinutes - b.avgMinutes;
      }
      return b.rajinScore - a.rajinScore;
    });

    return results;
  }, [siswaList, filteredRekapLogs]);

  // Top 10 for Recharts Diagram
  const chartData = useMemo(() => {
    return rankingList
      .filter((r) => r.totalKedatangan > 0)
      .slice(0, 10)
      .map((r, idx) => ({
        rank: `#${idx + 1}`,
        nama: r.siswa.nama.length > 12 ? `${r.siswa.nama.substring(0, 12)}...` : r.siswa.nama,
        fullNama: r.siswa.nama,
        kelas: r.siswa.kelas,
        totalHadir: r.totalKedatangan,
        waktuRataRata: r.avgTimeStr,
        avgMins: Math.round(r.avgMinutes),
        rajinScore: r.rajinScore
      }));
  }, [rankingList]);

  // Export Rekap to Excel
  const exportRekapToExcel = () => {
    try {
      const rows = rankingList.map((r, index) => ({
        Peringkat: index + 1,
        NISN: r.siswa.nisn,
        "Nama Siswa": r.siswa.nama,
        Kelas: r.siswa.kelas,
        "Total Kehadiran Pagi": r.totalKedatangan,
        "Sangat Pagi (<06:30)": r.sangatPagiCount,
        "Tepat Waktu (06:30-07:00)": r.tepatWaktuCount,
        "Terlambat (>07:00)": r.terlambatCount,
        "Rata-Rata Jam Datang": r.avgTimeStr,
        "Gelar Karakter": r.profile.badge,
        "Skor Kedisiplinan": r.rajinScore
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_Kedatangan_${rekapPeriode}`);
      XLSX.writeFile(workbook, `Rekap_Kedatangan_Siswa_${rekapPeriode}_${selectedTahun}.xlsx`);
      notifyUnduhSuccess("Rekap Excel Kedatangan Pagi berhasil diunduh!");
    } catch (err: any) {
      notifyUnduhError("Gagal mendownload berkas Excel.");
    }
  };

  // Generate Piagam Penghargaan PDF for Top Students
  const downloadPiagamPDF = (juaraIndex: number) => {
    const studentData = rankingList[juaraIndex];
    if (!studentData || studentData.totalKedatangan === 0) {
      notifySimpanError("Data siswa belum cukup untuk membuat piagam penghargaan.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Frame border
      doc.setDrawColor(217, 119, 6); // Amber border
      doc.setLineWidth(3);
      doc.rect(10, 10, 277, 190);

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(1);
      doc.rect(13, 13, 271, 184);

      // School Name Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text((config?.Nama_Sekolah || "SD NEGERI BABAKAN 04").toUpperCase(), 148, 32, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(config?.Alamat_Sekolah || "Jl. Raya Babakan, Kabupaten Bogor", 148, 38, { align: "center" });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(217, 119, 6);
      doc.text("PIAGAM PENGHARGAAN SISWA TERAJIN", 148, 56, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text(`Diberikan kepada siswa terdisiplin dalam kehadiran pagi (Periode ${rekapPeriode.toUpperCase()})`, 148, 64, { align: "center" });

      // Student Box
      doc.setDrawColor(251, 191, 36);
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(48, 75, 201, 45, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(studentData.siswa.nama.toUpperCase(), 148, 90, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(`NISN: ${studentData.siswa.nisn}  |  Kelas: ${studentData.siswa.kelas}`, 148, 100, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(217, 119, 6);
      doc.text(`SEBAGAI JUARA ${juaraIndex + 1} SISWA TERAJIN DATANG PAGI`, 148, 110, { align: "center" });

      // Achievement Details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Atas prestasinya hadir sebanyak ${studentData.totalKedatangan} kali dengan rata-rata jam kedatangan ${studentData.avgTimeStr} WIB.`,
        148,
        132,
        { align: "center" }
      );
      doc.text(`Gelar Karakter: ${studentData.profile.badge} (${studentData.profile.title})`, 148, 140, { align: "center" });

      // Signatures
      const todayFormatted = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      doc.setFontSize(10);
      doc.text(`${config?.Tempat_Tanda_Tangan || "Bogor"}, ${todayFormatted}`, 220, 158, { align: "center" });
      doc.text("Kepala Sekolah", 220, 164, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(config?.Nama_Kepsek || "SUBUR, S.Pd.SD.", 220, 185, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${config?.NIP_Kepsek || "-"}`, 220, 190, { align: "center" });

      doc.text("Guru / Admin Kedisiplinan", 76, 164, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(currentUser?.nama || config?.Nama_Guru || "Eri Iriana Rifai, S.Kom.", 76, 185, { align: "center" });

      doc.save(`Piagam_Penghargaan_Juara${juaraIndex + 1}_${studentData.siswa.nama.replace(/\s+/g, "_")}.pdf`);
      notifyUnduhSuccess(`Piagam Penghargaan Juara ${juaraIndex + 1} berhasil diunduh!`);
    } catch (err: any) {
      notifyUnduhError("Gagal mencetak piagam PDF.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-3xl shadow-lg text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 backdrop-blur-3xl transform skew-x-12 translate-x-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-amber-100 border border-white/30">
              <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Sistem Absen Kedatangan Pagi & Penghargaan Siswa Terajin</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Absen Kedatangan Siswa (Seluruh Kelas)
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
              Catat waktu kehadiran siswa dari seluruh kelas tanpa perlu memilih kelas terlebih dahulu. 
              Otomatis menghitung rata-rata jam datang, rekap periodik, serta peringkat visual karakter untuk penghargaan siswa paling terdisiplin!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shrink-0">
            <div className="text-right">
              <span className="block text-[11px] text-amber-200 font-bold uppercase tracking-wider">
                {formatTanggalLengkap(selectedTanggal)}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mt-1">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/90 text-white font-extrabold" title="Hadir">
                  H: {attendanceStats.hadirCount}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-slate-950 font-extrabold" title="Sakit">
                  S: {attendanceStats.sakitCount}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/90 text-white font-extrabold" title="Izin">
                  I: {attendanceStats.izinCount}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/90 text-white font-extrabold" title="Alpa">
                  A: {attendanceStats.alpaCount}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900/60 text-slate-200 font-extrabold" title="Belum Dicatat">
                  Belum: {attendanceStats.belumAbsenCount}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab("input")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === "input"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>1. Input Absen Kedatangan Pagi</span>
          </button>

          <button
            onClick={() => setActiveSubTab("rekap")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === "rekap"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Rekap Periodik (Mingguan, Bulanan, Semester, Tahunan)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("ranking")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeSubTab === "ranking"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>3. Ranking Visual Diagram & Karakter</span>
          </button>
        </div>

        {activeSubTab === "rekap" && (
          <button
            onClick={exportRekapToExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Rekap Excel</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: INPUT ABSEN KEDATANGAN PAGI */}
      {activeSubTab === "input" && (
        <div className="space-y-6">
          {/* Quick Scan / Rapid Search & Camera Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            {/* Header & Date selector */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-500" />
                  Presensi Kedatangan Cepat & Scan Barcode Kamera (Tanpa Pilih Kelas)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Scan barcode/QR Kartu Pelajar menggunakan kamera atau ketik NISN/Nama. Jam otomatis dicatat sesuai waktu perangkat.
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal:</span>
                  <input
                    type="date"
                    value={selectedTanggal}
                    onChange={(e) => {
                      setSelectedTanggal(e.target.value);
                      if (e.target.value !== getLocalDateStr()) {
                        setUseAutoDeviceTime(false);
                      }
                    }}
                    className="text-xs font-extrabold bg-transparent text-amber-600 dark:text-amber-400 outline-hidden cursor-pointer"
                  />
                  {selectedTanggal !== getLocalDateStr() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTanggal(getLocalDateStr());
                        setUseAutoDeviceTime(true);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 hover:bg-amber-600 cursor-pointer transition-colors shadow-2xs"
                      title="Sinkronkan ke Tanggal Hari Ini Sesuai Jam Perangkat"
                    >
                      Hari Ini
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Device Time Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Jam Perangkat Saat Ini:</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-300 font-mono bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-700 shadow-2xs">
                  {formattedLiveClock} WIB
                </span>
                <span className="hidden lg:inline-block text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  (Otomatis mencatat jam tiba saat scan/submit)
                </span>
              </div>

              <div className="flex flex-wrap items-center space-x-2.5 sm:space-x-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                    soundEnabled
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                  }`}
                  title={soundEnabled ? "Notifikasi Suara Aktif" : "Notifikasi Suara Dimatikan"}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Suara Aktif</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                      <span>Suara Mati</span>
                    </>
                  )}
                </button>

                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useAutoDeviceTime}
                    onChange={(e) => setUseAutoDeviceTime(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Auto-Jam Perangkat</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={`px-4 py-2 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer ${
                    isCameraActive
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950"
                  }`}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="w-4 h-4" />
                      <span>Tutup Kamera Scanner</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 animate-bounce" />
                      <span>Scan Barcode Kamera</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* CAMERA FEED CONTAINER */}
            {isCameraActive && (
              <div className="p-4 bg-slate-900 rounded-2xl border-2 border-amber-500/60 space-y-4 animate-fade-in shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                  <div className="flex items-center space-x-2">
                    <Video className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-amber-300">
                      Scanner Barcode / QR Kamera Aktif
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      {cameraFacingMode === "environment" ? "📷 Kamera Belakang (Rear)" : "🤳 Kamera Depan (Front)"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Switch Camera Button (Front / Back) */}
                    <button
                      type="button"
                      onClick={handleToggleCameraFacing}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                      title="Tukar Kamera Depan / Belakang"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
                      <span>{cameraFacingMode === "environment" ? "Ganti Kamera Depan" : "Ganti Kamera Belakang"}</span>
                    </button>

                    {/* Camera Device Selector if multiple lenses available */}
                    {availableCameras.length > 1 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => {
                          setSelectedCameraId(e.target.value);
                        }}
                        className="text-xs bg-slate-800 text-amber-300 font-bold px-2 py-1.5 rounded-lg border border-slate-700 outline-hidden cursor-pointer max-w-[160px] truncate"
                        title="Pilih Lensa Kamera Tertentu"
                      >
                        <option value="">Auto ({cameraFacingMode === "environment" ? "Belakang" : "Depan"})</option>
                        {availableCameras.map((cam, idx) => (
                          <option key={cam.id} value={cam.id}>
                            {cam.label || `Lensa #${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center space-x-1 border border-slate-700 cursor-pointer"
                      title="Toggle Suara Beep"
                    >
                      {soundEnabled ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Suara Aktif</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                          <span>Mute</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCameraActive(false)}
                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                      title="Tutup Kamera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {cameraError ? (
                  <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs text-center space-y-2">
                    <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
                    <p className="font-bold">{cameraError}</p>
                    <p className="text-[11px] text-rose-300">
                      Coba klik tombol <strong>"Ganti Kamera Depan/Belakang"</strong> di atas atau periksa izin kamera pada browser Anda.
                    </p>
                  </div>
                ) : (
                  <div className="relative max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-black shadow-inner">
                    <div id="reader-camera-absen" className="w-full aspect-square" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-amber-400 shadow-[0_0_15px_#fbbf24] animate-pulse pointer-events-none" />
                  </div>
                )}

                <div className="text-center text-[11px] text-slate-300 leading-relaxed bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  Arahkan kamera ke <span className="text-amber-300 font-bold">Kartu Pelajar / Barcode / QR Code</span> siswa. 
                  Jam kedatangan akan <span className="text-emerald-400 font-bold">otomatis dicatat sesuai Waktu Perangkat ({formattedLiveClock} WIB)</span>.
                </div>
              </div>
            )}

            {/* SCAN RESULT FEEDBACK BADGE WITH VOICE ANNOUNCEMENT */}
            {lastScannedResult && Date.now() - lastScannedResult.timestamp < 15000 && (
              <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-md border ${
                lastScannedResult.category === "awal"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100"
                  : lastScannedResult.category === "sedikit_terlambat"
                  ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100"
              }`}>
                <div className="flex items-start sm:items-center space-x-3.5 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-md ${
                    lastScannedResult.category === "awal"
                      ? "bg-emerald-600 text-white"
                      : lastScannedResult.category === "sedikit_terlambat"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-rose-600 text-white"
                  }`}>
                    #{lastScannedResult.urutan}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        lastScannedResult.category === "awal"
                          ? "bg-emerald-600 text-white"
                          : lastScannedResult.category === "sedikit_terlambat"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-rose-600 text-white"
                      }`}>
                        Orang Ke-{lastScannedResult.urutan} Tiba Hari Ini
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ⏰ {lastScannedResult.jamDatang} WIB
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {lastScannedResult.siswa.nama}{" "}
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        ({lastScannedResult.siswa.kelas})
                      </span>
                    </h4>

                    {/* Speech Announcement Text */}
                    <div className="flex items-center space-x-2 text-xs font-semibold mt-1">
                      <Volume2 className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                      <p className="italic">
                        "{lastScannedResult.pesanSuara}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => speakArrivalNotification(lastScannedResult.siswa.nama, lastScannedResult.urutan)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                    title="Putar Ulang Notifikasi Suara"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ulangi Suara</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setLastScannedResult(null)} 
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Text Input Form */}
            <form onSubmit={handleQuickSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Ketik NISN, NIS, atau Nama Siswa... (misal: 0012345678)"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-mono border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center space-x-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-400">Jam:</span>
                  <input
                    type="time"
                    value={quickJamInput}
                    onChange={(e) => {
                      setQuickJamInput(e.target.value);
                      setUseAutoDeviceTime(false);
                    }}
                    className="w-full text-xs font-bold text-slate-800 dark:text-white bg-transparent outline-hidden"
                  />
                </div>
              </div>

              <div className="md:col-span-3 flex items-center space-x-2">
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Kedatangan</span>
                </button>
              </div>
            </form>
          </div>

          {/* ALL STUDENTS DIRECT ABSENSI TABLE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Daftar Seluruh Siswa ({filteredSiswaList.length} Siswa)
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchSiswa}
                    onChange={(e) => setSearchSiswa(e.target.value)}
                    placeholder="Filter nama / NISN..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                <select
                  value={selectedKelasFilter}
                  onChange={(e) => setSelectedKelasFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                >
                  <option value="">Semua Kelas ({allKelasList.length})</option>
                  {allKelasList.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBulkMarkPresent}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                  title="Tandai semua siswa yang belum tercatat sebagai Hadir dan sinkronkan ke Absen Kelas"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tandai Hadir Semua Siswa yang Belum</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkMarkAlpa}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                  title="Tandai semua siswa tersisa yang belum hadir sebagai Alpa (A) dan sinkronkan ke Absen Kelas"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Tandai Alpa (A) Siswa Tersisa</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">No</th>
                    <th className="p-3">NISN / NIS</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Status Kedatangan Tanggal Ini</th>
                    <th className="p-3 text-center">Aksi Presensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredSiswaList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                        Tidak ada data siswa ditemukan. Silakan tambahkan siswa di menu Kelola Siswa.
                      </td>
                    </tr>
                  ) : (
                    filteredSiswaList.map((siswa, idx) => {
                      const log = todayPresentMap.get(siswa.id);
                      const currentStatusType = log
                        ? (log.statusKehadiran || (
                            log.status === "Sakit" ? "Sakit" :
                            log.status === "Izin" ? "Izin" :
                            log.status === "Alpa" ? "Alpa" : "Hadir"
                          ))
                        : null;

                      return (
                        <tr key={siswa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="p-3 font-mono">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{siswa.nisn}</div>
                            {siswa.nis && <div className="text-[10px] text-slate-400">NIS: {siswa.nis}</div>}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {siswa.nama}
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] border border-indigo-200 dark:border-indigo-800">
                              {siswa.kelas}
                            </span>
                          </td>
                          <td className="p-3">
                            {log ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {currentStatusType === "Hadir" && (
                                  <>
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center space-x-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Hadir: {log.jamDatang} WIB</span>
                                      {log.urutanKedatangan && log.urutanKedatangan > 0 ? (
                                        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[10px]">
                                          #{log.urutanKedatangan}
                                        </span>
                                      ) : null}
                                    </span>

                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                        log.status === "Sangat Pagi"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          : log.status === "Tepat Waktu"
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                      }`}
                                    >
                                      {log.status === "Sangat Pagi" ? "⚡ Sangat Pagi" : log.status === "Tepat Waktu" ? "☀️ Tepat Waktu" : "⏰ Terlambat"}
                                    </span>
                                  </>
                                )}

                                {currentStatusType === "Sakit" && (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px] flex items-center space-x-1">
                                    <span>🏥 Sakit</span>
                                    {log.jamDatang && <span className="text-[10px] opacity-80 font-normal">({log.jamDatang} WIB)</span>}
                                  </span>
                                )}

                                {currentStatusType === "Izin" && (
                                  <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[11px] flex items-center space-x-1">
                                    <span>✉️ Izin</span>
                                    {log.jamDatang && <span className="text-[10px] opacity-80 font-normal">({log.jamDatang} WIB)</span>}
                                  </span>
                                )}

                                {currentStatusType === "Alpa" && (
                                  <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[11px] flex items-center space-x-1">
                                    <span>❌ Alpa</span>
                                    {log.jamDatang && <span className="text-[10px] opacity-80 font-normal">({log.jamDatang} WIB)</span>}
                                  </span>
                                )}

                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                  ✓ Terintegrasi Kelas
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Belum Dicatat Hari Ini</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {log ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Hadir')}
                                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    currentStatusType === 'Hadir'
                                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 dark:ring-emerald-700"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  }`}
                                  title="Ubah Status ke Hadir (H)"
                                >
                                  H
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Sakit')}
                                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    currentStatusType === 'Sakit'
                                      ? "bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400 dark:ring-amber-600"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                  }`}
                                  title="Ubah Status ke Sakit (S)"
                                >
                                  S
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Izin')}
                                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    currentStatusType === 'Izin'
                                      ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400 dark:ring-blue-700"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  }`}
                                  title="Ubah Status ke Izin (I)"
                                >
                                  I
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Alpa')}
                                  className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    currentStatusType === 'Alpa'
                                      ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-400 dark:ring-rose-700"
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  }`}
                                  title="Ubah Status ke Alpa (A)"
                                >
                                  A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteKedatangan(log.id, siswa)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 dark:bg-slate-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors cursor-pointer ml-1"
                                  title="Hapus / Reset Catatan Presensi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Hadir')}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                                  title="Tandai Hadir Pagi & Sinkron ke Absen Kelas"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Hadir</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Sakit')}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                                  title="Tandai Sakit (S) & Sinkron ke Absen Kelas"
                                >
                                  S
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Izin')}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                                  title="Tandai Izin (I) & Sinkron ke Absen Kelas"
                                >
                                  I
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRecordKedatanganStatus(siswa, 'Alpa')}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                                  title="Tandai Alpa (A) & Sinkron ke Absen Kelas"
                                >
                                  A
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAP PERIODIK */}
      {activeSubTab === "rekap" && (
        <div className="space-y-6">
          {/* Period Filter Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Filter Rekap Kedatangan Siswa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih periode rekapitulasi untuk menentukan nominasi siswa terajin dan terdisiplin datang pagi.
                </p>
              </div>

              {/* Periode Buttons */}
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setRekapPeriode("mingguan")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rekapPeriode === "mingguan" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Mingguan (7 Hari)
                </button>

                <button
                  onClick={() => setRekapPeriode("bulanan")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rekapPeriode === "bulanan" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Bulanan
                </button>

                <button
                  onClick={() => setRekapPeriode("semester")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rekapPeriode === "semester" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Semester
                </button>

                <button
                  onClick={() => setRekapPeriode("tahunan")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rekapPeriode === "tahunan" ? "bg-amber-500 text-slate-950 shadow-xs" : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Tahunan
                </button>
              </div>
            </div>

            {/* Sub Filter Controls */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
              {rekapPeriode === "bulanan" && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Bulan:</span>
                    <select
                      value={selectedBulan}
                      onChange={(e) => setSelectedBulan(e.target.value)}
                      className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="01">Januari</option>
                      <option value="02">Februari</option>
                      <option value="03">Maret</option>
                      <option value="04">April</option>
                      <option value="05">Mei</option>
                      <option value="06">Juni</option>
                      <option value="07">Juli</option>
                      <option value="08">Agustus</option>
                      <option value="09">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Tahun:</span>
                    <select
                      value={selectedTahun}
                      onChange={(e) => setSelectedTahun(e.target.value)}
                      className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </>
              )}

              {rekapPeriode === "semester" && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Semester:</span>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value as any)}
                      className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="Ganjil">Ganjil (Juli - Desember)</option>
                      <option value="Genap">Genap (Januari - Juni)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Tahun:</span>
                    <select
                      value={selectedTahun}
                      onChange={(e) => setSelectedTahun(e.target.value)}
                      className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </>
              )}

              {rekapPeriode === "tahunan" && (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Tahun Kalender:</span>
                  <select
                    value={selectedTahun}
                    onChange={(e) => setSelectedTahun(e.target.value)}
                    className="px-3 py-1.5 border rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* REKAP TABLE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Tabel Rekapitulasi Kehadiran Pagi Periode {rekapPeriode.toUpperCase()} ({rankingList.length} Siswa)
              </h3>
              <button
                onClick={exportRekapToExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh XLSX</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 text-center">Rank</th>
                    <th className="p-3">Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 text-center">Total Hadir</th>
                    <th className="p-3 text-center">Sangat Pagi (&lt;06:30)</th>
                    <th className="p-3 text-center">Tepat Waktu</th>
                    <th className="p-3 text-center">Rata-Rata Jam Datang</th>
                    <th className="p-3">Gelar Karakter</th>
                    <th className="p-3 text-center">Cetak Piagam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {rankingList.map((r, idx) => (
                    <tr key={r.siswa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-center font-extrabold">
                        {idx === 0 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black inline-flex items-center justify-center shadow-xs">
                            🥇
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-950 font-black inline-flex items-center justify-center shadow-xs">
                            🥈
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-700 text-white font-black inline-flex items-center justify-center shadow-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400">#{idx + 1}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.siswa.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NISN: {r.siswa.nisn}</div>
                      </td>

                      <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {r.siswa.kelas}
                      </td>

                      <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {r.totalKedatangan} Hari
                      </td>

                      <td className="p-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {r.sangatPagiCount}x
                      </td>

                      <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {r.tepatWaktuCount}x
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {r.totalKedatangan > 0 ? `${r.avgTimeStr} WIB` : "-"}
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold inline-flex items-center space-x-1 ${r.profile.bgLight} ${r.profile.textColor} border ${r.profile.borderColor}`}>
                          <span>{r.profile.character}</span>
                          <span>{r.profile.badge}</span>
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => downloadPiagamPDF(idx)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-300 font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Piagam</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RANKING VISUAL DIAGRAM & KARAKTER */}
      {activeSubTab === "ranking" && (
        <div className="space-y-6">
          {/* PODIUM JUARA 1, 2, 3 */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Panggung Kehormatan Siswa Terajin</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Juara Kehadiran Pagi (Periode {rekapPeriode.toUpperCase()})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apresiasi untuk para pejuang disiplin pagi dengan waktu kedatangan rata-rata paling cepat!
              </p>
            </div>

            {/* PODIUM CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
              {/* JUARA 2 */}
              <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-5 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-md text-center space-y-3 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                  2
                </div>

                <div className="pt-2">
                  <span className="text-4xl block my-1">
                    {rankingList[1]?.profile.character || "🥈"}
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white truncate">
                    {rankingList[1]?.siswa.nama || "Siswa #2"}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    {rankingList[1]?.siswa.kelas || "-"}
                  </p>
                </div>

                <div className="bg-slate-200/60 dark:bg-slate-800 p-2.5 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 font-semibold">
                    <span>Kehadiran:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{rankingList[1]?.totalKedatangan || 0} Hari</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 font-semibold">
                    <span>Rata-Rata Jam:</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{rankingList[1]?.avgTimeStr || "-"} WIB</span>
                  </div>
                </div>

                <button
                  onClick={() => downloadPiagamPDF(1)}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Piagam Juara 2</span>
                </button>
              </div>

              {/* JUARA 1 (MAIN CENTER) */}
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-100 via-amber-50/80 to-white dark:from-amber-950/60 dark:to-slate-900 p-6 rounded-3xl border-2 border-amber-400 dark:border-amber-600 shadow-xl text-center space-y-4 relative transform md:-translate-y-4">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center shadow-lg border-2 border-white">
                  👑
                </div>

                <div className="pt-2 space-y-1">
                  <span className="text-5xl block my-1 animate-bounce">
                    {rankingList[0]?.profile.character || "🦅"}
                  </span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200 font-black text-[10px] tracking-wider uppercase">
                    🥇 JUARA 1 SITER
                  </span>
                  <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                    {rankingList[0]?.siswa.nama || "Siswa #1"}
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                    {rankingList[0]?.siswa.kelas || "-"}
                  </p>
                </div>

                <div className="bg-amber-200/50 dark:bg-amber-950/80 p-3 rounded-2xl text-xs space-y-1.5 border border-amber-300 dark:border-amber-800">
                  <div className="flex justify-between text-slate-700 dark:text-amber-200 font-semibold">
                    <span>Total Kehadiran:</span>
                    <span className="font-extrabold text-amber-900 dark:text-amber-300">{rankingList[0]?.totalKedatangan || 0} Hari</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-amber-200 font-semibold">
                    <span>Jam Rata-Rata:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{rankingList[0]?.avgTimeStr || "-"} WIB</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 italic pt-1 border-t border-amber-300 dark:border-amber-800">
                    "{rankingList[0]?.profile.desc || "Teladan Kedisiplinan Pagi"}"
                  </div>
                </div>

                <button
                  onClick={() => downloadPiagamPDF(0)}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Cetak Piagam Juara 1</span>
                </button>
              </div>

              {/* JUARA 3 */}
              <div className="order-3 bg-gradient-to-b from-amber-900/10 via-orange-50/50 to-white dark:from-amber-950/30 dark:to-slate-900 p-5 rounded-3xl border-2 border-amber-700/50 dark:border-amber-800 shadow-md text-center space-y-3 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shadow-md">
                  3
                </div>

                <div className="pt-2">
                  <span className="text-4xl block my-1">
                    {rankingList[2]?.profile.character || "🥉"}
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white truncate">
                    {rankingList[2]?.siswa.nama || "Siswa #3"}
                  </h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    {rankingList[2]?.siswa.kelas || "-"}
                  </p>
                </div>

                <div className="bg-slate-200/60 dark:bg-slate-800 p-2.5 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 font-semibold">
                    <span>Kehadiran:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{rankingList[2]?.totalKedatangan || 0} Hari</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 font-semibold">
                    <span>Rata-Rata Jam:</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{rankingList[2]?.avgTimeStr || "-"} WIB</span>
                  </div>
                </div>

                <button
                  onClick={() => downloadPiagamPDF(2)}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Piagam Juara 3</span>
                </button>
              </div>
            </div>
          </div>

          {/* RECHARTS BAR CHART DIAGRAM */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Diagram Visual: Top 10 Siswa Tercepat Datang Pagi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Semakin rendah menit rata-rata setelah jam 06:00 (muda/kuning), semakin cepat jam kedatangannya!
                </p>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Belum ada data kedatangan tercatat untuk periode ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="nama"
                      tick={{ fontSize: 11, fontWeight: "bold" }}
                      interval={0}
                    />
                    <YAxis
                      label={{ value: 'Menit dr 06:00 AM', angle: -90, position: 'insideLeft', fontSize: 10 }}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <p className="font-bold text-amber-400">{data.fullNama} ({data.kelas})</p>
                              <p>Waktu Rata-Rata: <span className="font-extrabold text-emerald-300">{data.waktuRataRata} WIB</span></p>
                              <p>Total Kehadiran: {data.totalHadir} Hari</p>
                              <p>Skor Rajin: {data.rajinScore}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avgMins" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === 0 ? "#f59e0b" : index === 1 ? "#6366f1" : index === 2 ? "#10b981" : "#3b82f6"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* KARAKTER & BADGE CATALOGUE */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Katalog Karakter Avatar Kedisiplinan Pagi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl space-y-2 text-center">
                <span className="text-3xl block">🦅</span>
                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300">🦅 Burung Hantu Awal</h4>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black px-2 py-0.5 rounded-full block">
                  Level SSS (&lt; 06:20 WIB)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  Siswa datang paling pagi sebelum sekolah ramai!
                </p>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 p-4 rounded-2xl space-y-2 text-center">
                <span className="text-3xl block">🦁</span>
                <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300">🦁 Singa Kedisiplinan</h4>
                <span className="text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-black px-2 py-0.5 rounded-full block">
                  Level SS (06:20 - 06:35 WIB)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  Datang sangat pagi dengan semangat penuh!
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-4 rounded-2xl space-y-2 text-center">
                <span className="text-3xl block">🦊</span>
                <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300">🦊 Rubah Cepat</h4>
                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-black px-2 py-0.5 rounded-full block">
                  Level S (06:35 - 06:50 WIB)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  Tiba tepat waktu dan selalu siap belajar.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 p-4 rounded-2xl space-y-2 text-center">
                <span className="text-3xl block">🐻</span>
                <h4 className="font-bold text-xs text-blue-900 dark:text-blue-300">🐻 Beruang Disiplin</h4>
                <span className="text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-black px-2 py-0.5 rounded-full block">
                  Level A (06:50 - 07:00 WIB)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  Tiba pas beberapa menit sebelum bel berbunyi.
                </p>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 p-4 rounded-2xl space-y-2 text-center">
                <span className="text-3xl block">🐢</span>
                <h4 className="font-bold text-xs text-rose-900 dark:text-rose-300">🐢 Pejuang Bangun Pagi</h4>
                <span className="text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-black px-2 py-0.5 rounded-full block">
                  Perlu Tingkatkan (&gt; 07:00 WIB)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                  Perlu dorongan agar bisa bangun lebih pagi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
