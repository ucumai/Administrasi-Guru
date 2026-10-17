import React, { useState } from "react";
import { Clock, Plus, Trash2, Pencil, X, Save, CheckCircle2 } from "lucide-react";
import { Jadwal, Mapel, Siswa, User } from "../types";
import { saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses, isRecordAllowedByClass } from "../lib/accessControl";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyEditSuccess, 
  notifyEditError, 
  notifyHapusSuccess, 
  notifyHapusError, 
  confirmDeleteAlert 
} from "../lib/swal";

interface JadwalMengajarViewProps {
  jadwalList: Jadwal[];
  mapelList: Mapel[];
  siswaList: Siswa[];
  currentUser?: User | null;
}

export const JadwalMengajarView: React.FC<JadwalMengajarViewProps> = ({
  jadwalList,
  mapelList,
  siswaList,
  currentUser = null
}) => {
  const [hari, setHari] = useState("Senin");
  const [jam, setJam] = useState("07:30 - 09:00");
  const [kelas, setKelas] = useState("");
  const [mapel, setMapel] = useState("");

  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));
  const isGuruKelas = currentUser?.role === "guru_kelas";

  React.useEffect(() => {
    if (allowedClasses.length > 0 && !kelas) {
      setKelas(allowedClasses[0]);
    }
    if (isGuruKelas && !mapel) {
      setMapel("Semua Mapel (Guru Kelas)");
    }
  }, [allowedClasses, kelas, isGuruKelas, mapel]);

  const filteredJadwalList = jadwalList.filter((j) => isRecordAllowedByClass(j, currentUser));

  // Edit Jadwal State
  const [editingJadwal, setEditingJadwal] = useState<Jadwal | null>(null);
  const [editHari, setEditHari] = useState("Senin");
  const [editJam, setEditJam] = useState("");
  const [editKelas, setEditKelas] = useState("");
  const [editMapel, setEditMapel] = useState("");

  const handleStartEdit = (j: Jadwal) => {
    setEditingJadwal(j);
    setEditHari(j.hari);
    setEditJam(j.jam);
    setEditKelas(j.kelas);
    setEditMapel(j.mapel || (isGuruKelas ? "Semua Mapel (Guru Kelas)" : ""));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJadwal) return;

    const editMapelToSave = editMapel || (isGuruKelas ? "Semua Mapel (Guru Kelas)" : "");

    if (!editKelas || (!isGuruKelas && !editMapelToSave) || !editJam.trim()) {
      notifyEditError("Silakan isi Jam, Kelas, dan Mata Pelajaran.");
      return;
    }

    const updated: Jadwal = {
      ...editingJadwal,
      hari: editHari,
      jam: editJam.trim(),
      kelas: editKelas,
      mapel: editMapelToSave
    };

    try {
      await saveDocument(COLLECTIONS.JADWAL, editingJadwal.id, updated);
      setEditingJadwal(null);
      notifyEditSuccess("Jadwal mengajar berhasil diperbarui!");
    } catch (err: any) {
      notifyEditError(err.message || "Gagal memperbarui jadwal.");
    }
  };

  const kelasOptions = Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();

  const handleAddJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    const mapelToSave = mapel || (isGuruKelas ? "Semua Mapel (Guru Kelas)" : "");
    if (!kelas || (!isGuruKelas && !mapelToSave)) {
      notifySimpanError("Silakan pilih kelas dan mata pelajaran.");
      return;
    }

    const id = Date.now().toString();
    const newJadwal: Jadwal = {
      id,
      hari,
      jam: jam.trim(),
      kelas,
      mapel: mapelToSave
    };

    try {
      await saveDocument(COLLECTIONS.JADWAL, id, newJadwal);
      setJam("07:30 - 09:00");
      notifySimpanSuccess("Jadwal mengajar berhasil ditambahkan!");
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan jadwal.");
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    const isConfirmed = await confirmDeleteAlert("Hapus Jadwal Mengajar?", "Apakah Anda yakin ingin menghapus jadwal mengajar ini?");
    if (isConfirmed) {
      try {
        await deleteDocument(COLLECTIONS.JADWAL, id);
        notifyHapusSuccess("Jadwal mengajar berhasil dihapus.");
      } catch (err: any) {
        notifyHapusError(err.message || "Gagal menghapus jadwal.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Jadwal Mengajar Anda
          </h2>
          <p className="text-xs text-slate-500">Atur jam tatap muka harian per kelas dan mata pelajaran.</p>
        </div>

        <form
          onSubmit={handleAddJadwal}
          className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hari *</label>
            <select
              value={hari}
              onChange={(e) => setHari(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            >
              <option value="Senin">Senin</option>
              <option value="Selasa">Selasa</option>
              <option value="Rabu">Rabu</option>
              <option value="Kamis">Kamis</option>
              <option value="Jumat">Jumat</option>
              <option value="Sabtu">Sabtu</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam (WIB) *</label>
            <input
              type="text"
              placeholder="Contoh: 07:30 - 09:00"
              value={jam}
              onChange={(e) => setJam(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelas *</label>
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              required
            >
              <option value="">Pilih Kelas</option>
              {allowedClasses.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              {isGuruKelas ? "Mata Pelajaran (Wali Kelas)" : "Mata Pelajaran *"}
            </label>
            <div className="flex space-x-2">
              <select
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
                required={!isGuruKelas}
              >
                {isGuruKelas ? (
                  <option value="Semua Mapel (Guru Kelas)">Semua Mapel (Guru Kelas / Full Seharian)</option>
                ) : (
                  <option value="">Pilih Mapel</option>
                )}
                {mapelList.map((m) => (
                  <option key={m.id} value={m.namaMapel}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </form>

        {/* Schedule List */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 w-28">Hari</th>
                <th className="p-3">Jam Mengajar</th>
                <th className="p-3 text-center">Kelas</th>
                <th className="p-3">Mata Pelajaran</th>
                <th className="p-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredJadwalList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Belum ada jadwal mengajar untuk kelas ini.
                  </td>
                </tr>
              ) : (
                filteredJadwalList.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{j.hari}</td>
                    <td className="p-3 font-mono font-semibold">{j.jam}</td>
                    <td className="p-3 text-center font-bold">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">{j.kelas}</span>
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{j.mapel}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleStartEdit(j)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Jadwal"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJadwal(j.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Jadwal */}
      {editingJadwal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Jadwal Mengajar</span>
              </h3>
              <button
                onClick={() => setEditingJadwal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hari *</label>
                <select
                  value={editHari}
                  onChange={(e) => setEditHari(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam (WIB) *</label>
                <input
                  type="text"
                  value={editJam}
                  onChange={(e) => setEditJam(e.target.value)}
                  placeholder="Contoh: 07:30 - 09:00"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kelas *</label>
                <select
                  value={editKelas}
                  onChange={(e) => setEditKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  required
                >
                  <option value="">Pilih Kelas</option>
                  {kelasOptions.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  {isGuruKelas ? "Mata Pelajaran (Wali Kelas)" : "Mata Pelajaran *"}
                </label>
                <select
                  value={editMapel}
                  onChange={(e) => setEditMapel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                  required={!isGuruKelas}
                >
                  {isGuruKelas ? (
                    <option value="Semua Mapel (Guru Kelas)">Semua Mapel (Guru Kelas / Full Seharian)</option>
                  ) : (
                    <option value="">Pilih Mapel</option>
                  )}
                  {mapelList.map((m) => (
                    <option key={m.id} value={m.namaMapel}>
                      {m.namaMapel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingJadwal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
