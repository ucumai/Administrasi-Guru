export const DEFAULT_MAPEL_LIST = [
  "Pendidikan Agama dan Budi Pekerti",
  "Pendidikan Pancasila",
  "Bahasa Indonesia",
  "Matematika",
  "Ilmu Pengetahuan Alam dan Sosial (IPAS)",
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Seni Budaya dan Prakarya",
  "Bahasa Inggris",
  "Muatan Lokal (Bahasa Daerah)"
];

/**
 * Returns the list of active (checked and not hidden) subjects specifically for a given class.
 */
export function getClassActiveSubjects(kelasName?: string, additionalSystemMapels: string[] = []): string[] {
  try {
    let targetClass = kelasName && kelasName !== "Semua" ? kelasName : "";

    // If targetClass is empty, try to get active class from current session/localStorage
    if (!targetClass && typeof window !== "undefined") {
      try {
        const savedKelas = localStorage.getItem("edadmin_selected_kelas") ||
                           localStorage.getItem("edadmin_raport_selected_kelas") ||
                           localStorage.getItem("edadmin_penilaian_selected_kelas");
        if (savedKelas) targetClass = savedKelas;
      } catch {}
    }

    const hiddenKey = targetClass ? `edadmin_hidden_raport_mapels_${targetClass}` : "edadmin_hidden_raport_mapels";
    const savedHidden = typeof window !== "undefined" ? localStorage.getItem(hiddenKey) : null;
    const hiddenMapels: string[] = savedHidden ? JSON.parse(savedHidden) : [];

    const selectedKey = targetClass ? `edadmin_selected_raport_mapels_${targetClass}` : "edadmin_selected_raport_mapels";
    const savedSelected = typeof window !== "undefined" ? localStorage.getItem(selectedKey) : null;
    let selectedMapels: string[] = savedSelected ? JSON.parse(savedSelected) : [];

    if (!selectedMapels || selectedMapels.length === 0) {
      // Legacy fallback
      const legacy = typeof window !== "undefined" ? localStorage.getItem("edadmin_selected_raport_mapels") : null;
      selectedMapels = legacy ? JSON.parse(legacy) : [...DEFAULT_MAPEL_LIST];
    }

    // Combine selectedMapels with additionalSystemMapels (custom mapels)
    const resultList: string[] = [];
    
    // Add all checked mapels in exact user order that are not in hiddenMapels
    selectedMapels.forEach((m) => {
      if (m && !hiddenMapels.includes(m) && !resultList.includes(m)) {
        resultList.push(m.trim());
      }
    });

    if (resultList.length > 0) return resultList;
    return DEFAULT_MAPEL_LIST.filter((m) => !hiddenMapels.includes(m));
  } catch {
    return [...DEFAULT_MAPEL_LIST];
  }
}
