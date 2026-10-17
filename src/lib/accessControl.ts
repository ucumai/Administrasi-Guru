import { User } from "../types";

/**
 * Returns the array of class names that the current user is allowed to access.
 * - Admin: All existing classes + default standard classes
 * - Guru Kelas: Strictly their single assigned kelasUtama
 * - Guru Mapel: Multi-classes specified in kelasAkses
 */
export function getAllowedClasses(user: User | null, allExistingClasses: (string | undefined)[] = []): string[] {
  const cleanClasses = allExistingClasses.filter((c): c is string => Boolean(c));

  if (!user || user.role === "admin") {
    const defaultClasses = ["Kelas 1", "Kelas 2", "Kelas 3A", "Kelas 3B", "Kelas 4", "Kelas 5", "Kelas 6", "Pramuka", "Silat", "Hadroh", "Drumband"];
    const merged = Array.from(new Set([...defaultClasses, ...cleanClasses])).sort();
    return merged;
  }

  if (user.role === "guru_kelas") {
    return [user.kelasUtama || "VII A"];
  }

  if (user.role === "guru_mapel") {
    return user.kelasAkses && user.kelasAkses.length > 0 ? user.kelasAkses : ["VII A", "VII B"];
  }

  if (user.role === "guru_ekskul") {
    if (user.kelasAkses && user.kelasAkses.length > 0) {
      return user.kelasAkses;
    }
    if (user.kelasUtama) {
      return [user.kelasUtama];
    }
    return ["Kelas 1", "Kelas 2", "Kelas 3A", "Kelas 3B", "Kelas 4", "Kelas 5", "Kelas 6", "Pramuka", "Silat", "Hadroh", "Drumband"];
  }

  return ["VII A"];
}

/**
 * Helper to check if a specific record (Siswa, Absensi, Nilai, Agenda, etc.)
 * belongs to a class accessible by the user.
 */
export function isRecordAllowedByClass<T extends { kelas?: string }>(item: T, user: User | null): boolean {
  if (!user || user.role === "admin") return true;
  if (!item.kelas) return true;

  const allowed = getAllowedClasses(user);
  return allowed.includes(item.kelas);
}
