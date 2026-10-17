/**
 * Date and Time utilities using strictly Local Device Time (avoiding UTC offset bugs from toISOString())
 */

/**
 * Returns YYYY-MM-DD in local device timezone (e.g. "2026-09-15")
 */
export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns HH:mm in local device timezone (e.g. "06:45")
 */
export function getLocalTimeStr(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Returns HH:mm:ss in local device timezone (e.g. "06:45:30")
 */
export function getLocalTimeWithSecondsStr(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Formats a YYYY-MM-DD string into an Indonesian readable date, e.g. "Selasa, 15 September 2026"
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(d);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Formats a YYYY-MM-DD string into Indonesian date with full month name without weekday: e.g. "15 Oktober 2026"
 */
export function formatTanggalLengkap(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(d);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// ============================================================================
// AUTO MIDNIGHT & BACKGROUND-RESUME DAY ROLLOVER SYSTEM
// Automatically resets/refreshes application daily state when passing 00:00:00
// or when the user opens/resumes the app on the next day.
// ============================================================================

type DateChangeListener = (newDate: string, previousDate: string) => void;
const dateChangeListeners: Set<DateChangeListener> = new Set();
let isWatcherInitialized = false;
let currentTrackedDate = getLocalDateStr();

export function onDayRollover(listener: DateChangeListener): () => void {
  dateChangeListeners.add(listener);
  return () => {
    dateChangeListeners.delete(listener);
  };
}

function notifyDayRollover(newDate: string, prevDate: string) {
  dateChangeListeners.forEach((fn) => {
    try {
      fn(newDate, prevDate);
    } catch (e) {
      console.warn("Error in day rollover listener:", e);
    }
  });

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("app:date-rollover", {
          detail: { newDate, prevDate }
        })
      );
    } catch {
      // Ignore
    }
  }
}

export function checkAndTriggerDayRollover(): boolean {
  const actualToday = getLocalDateStr();
  if (actualToday !== currentTrackedDate) {
    const prevDate = currentTrackedDate;
    currentTrackedDate = actualToday;
    try {
      localStorage.setItem("edadmin_last_active_date", actualToday);
    } catch {
      // Ignore
    }
    notifyDayRollover(actualToday, prevDate);
    return true;
  }
  return false;
}

export function initMidnightAutoRefresh(): () => void {
  if (typeof window === "undefined") return () => {};
  if (isWatcherInitialized) return () => {};
  isWatcherInitialized = true;

  // Initialize stored date
  try {
    const savedDate = localStorage.getItem("edadmin_last_active_date");
    if (savedDate && savedDate !== getLocalDateStr()) {
      notifyDayRollover(getLocalDateStr(), savedDate);
    }
    localStorage.setItem("edadmin_last_active_date", getLocalDateStr());
  } catch {
    // Ignore
  }

  // 1. Scheduled exact midnight timeout
  let midnightTimeoutId: any = null;
  const scheduleNextMidnight = () => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      200 // 200ms past 00:00:00
    );
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

    midnightTimeoutId = setTimeout(() => {
      checkAndTriggerDayRollover();
      scheduleNextMidnight();
    }, msUntilMidnight);
  };
  scheduleNextMidnight();

  // 2. Periodic interval fallback (checks every 5 seconds for smooth real-time transition)
  const intervalId = setInterval(() => {
    checkAndTriggerDayRollover();
  }, 5000);

  // 3. Screen unlock / Tab resume / Visibility change handler (mobile background wake up)
  const handleVisibilityOrFocus = () => {
    checkAndTriggerDayRollover();
  };

  document.addEventListener("visibilitychange", handleVisibilityOrFocus);
  window.addEventListener("focus", handleVisibilityOrFocus);
  window.addEventListener("pageshow", handleVisibilityOrFocus);

  return () => {
    if (midnightTimeoutId) clearTimeout(midnightTimeoutId);
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    window.removeEventListener("focus", handleVisibilityOrFocus);
    window.removeEventListener("pageshow", handleVisibilityOrFocus);
  };
}
