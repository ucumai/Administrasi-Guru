import React, { useState } from "react";
import { Calendar, Plus, Trash2, Pencil, X, Save, CheckCircle2 } from "lucide-react";
import { JurnalAgenda, Mapel, Siswa, Pengaturan, User } from "../types";
import { saveDocument, deleteDocument, COLLECTIONS } from "../lib/firebase";
import { getAllowedClasses, isRecordAllowedByClass } from "../lib/accessControl";
import { getLocalDateStr, onDayRollover } from "../lib/dateUtils";
import { 
  notifySimpanSuccess, 
  notifySimpanError, 
  notifyEditSuccess, 
  notifyEditError, 
  notifyHapusSuccess, 
  notifyHapusError, 
  confirmDeleteAlert 
} from "../lib/swal";

interface AgendaMengajarViewProps {
  agendaList: JurnalAgenda[];
  mapelList: Mapel[];
  siswaList: Siswa[];
  config: Pengaturan;
  currentUser?: User | null;
}

export const AgendaMengajarView: React.FC<AgendaMengajarViewProps> = ({
  agendaList,
  mapelList,
  siswaList,
  config,
  currentUser = null
}) => {
  const [tanggal, setTanggal] = useState<string>(() => getLocalDateStr());

  // Automatically sync tanggal at midnight or when waking up on a new day
  React.useEffect(() => {
    return onDayRollover((newDate) => {
      setTanggal(newDate);
    });
  }, []);
  const [jam, setJam] = useState<string>("1-2");
  const [kelas, setKelas] = useState<string>("");
  const [mapel, setMapel] = useState<string>("");
  const [materi, setMateri] = useState<string>("");
  const [status, setStatus] = useState<string>("Terlaksana");
  const [absenSiswa, setAbsenSiswa] = useState<string>("Nihil");
  const [ket, setKet] = useState<string>("");

  const allowedClasses = getAllowedClasses(currentUser, siswaList.map((s) => s.kelas));
  const isGuruKelas = currentUser?.role === "guru_kelas";

  React.useEffect(() => {
    if (allowedClasses.length > 0 && !kelas) {
      setKelas(allowedClasses[0]);
    }
    if (isGuruKelas && !mapel) {
      setMapel("Tematik / Guru Kelas");
    }
  }, [allowedClasses, kelas, isGuruKelas, mapel]);

  const filteredAgendaList = agendaList.filter((a) => isRecordAllowedByClass(a, currentUser));

  // Edit Agenda State
  const [editingAgenda, setEditingAgenda] = useState<JurnalAgenda | null>(null);
  const [editTanggal, setEditTanggal] = useState("");
  const [editJam, setEditJam] = useState("");
  const [editKelas, setEditKelas] = useState("");
  const [editMapel, setEditMapel] = useState("");
  const [editMateri, setEditMateri] = useState("");
  const [editStatus, setEditStatus] = useState("Terlaksana");
  const [editAbsenSiswa, setEditAbsenSiswa] = useState("");
  const [editKet, setEditKet] = useState("");

  const handleStartEdit = (a: JurnalAgenda) => {
    setEditingAgenda(a);
    setEditTanggal(a.tanggal);
    setEditJam(a.jam);
    setEditKelas(a.kelas);
    setEditMapel(a.mapel || (isGuruKelas ? "Tematik / Guru Kelas" : ""));
    setEditMateri(a.materi);
    setEditStatus(a.status || "Terlaksana");
    setEditAbsenSiswa(a.absenSiswa || "");
    setEditKet(a.ket || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda) return;

    const editMapelToSave = editMapel || (isGuruKelas ? "Tematik / Guru Kelas" : "");

    if (!editTanggal || !editKelas || (!isGuruKelas && !editMapelToSave) || !editMateri.trim()) {
      notifyEditError("Silakan isi Tanggal, Kelas, Mapel, dan Materi Pembelajaran.");
      return;
    }

    const updated: JurnalAgenda = {
      ...editingAgenda,
      tanggal: editTanggal,
      jam: editJam.trim(),
      kelas: editKelas,
      mapel: editMapelToSave,
      materi: editMateri.trim(),
      status: editStatus,
      absenSiswa: editAbsenSiswa.trim(),
      ket: editKet.trim()
    };

    try {
      await saveDocument(COLLECTIONS.JURNAL_AGENDA, editingAgenda.id, updated);
      setEditingAgenda(null);
      notifyEditSuccess("Jurnal agenda berhasil diperbarui!");
    } catch (err: any) {
      notifyEditError(err.message || "Gagal memperbarui agenda.");
    }
  };

  const kelasOptions = Array.from(new Set(siswaList.map((s) => s.kelas).filter(Boolean))).sort();

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const mapelToSave = mapel || (isGuruKelas ? "Tematik / Guru Kelas" : "");
    if (!kelas || (!isGuruKelas && !mapelToSave) || !materi.trim()) {
      notifySimpanError("Silakan isi Kelas, Mapel, dan Materi Pembelajaran.");
      return;
    }

    const id = Date.now().toString();
    const newAgenda: JurnalAgenda = {
      id,
      tanggal,
      jam: jam.trim(),
      kelas,
      mapel: mapelToSave,
      materi: materi.trim(),
      status,
      absenSiswa: absenSiswa.trim(),
      ket: ket.trim(),
      namaGuru: config.Nama_Guru || "Guru"
    };

    try {
      await saveDocument(COLLECTIONS.JURNAL_AGENDA, id, newAgenda);
      setMateri("");
      setKet("");
      notifySimpanSuccess("Jurnal agenda harian tersimpan ke Firebase!");
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan agenda.");
    }
  };

  const handleDeleteAgenda = async (id: string) => {
    const isConfirmed = await confirmDeleteAlert("Hapus Jurnal Agenda?", "Apakah Anda yakin ingin menghapus jurnal agenda mengajar ini?");
    if (isConfirmed) {
      try {
        await deleteDocument(COLLECTIONS.JURNAL_AGENDA, id);
        notifyHapusSuccess("Jurnal agenda berhasil dihapus.");
      } catch (err: any) {
        notifyHapusError(err.message || "Gagal menghapus agenda.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Jurnal Agenda Mengajar Harian
          </h2>
          <p className="text-xs text-slate-500">Catat keterlaksanaan materi harian, jam ke, dan kendala siswa.</p>
        </div>

        <form
          onSubmit={handleAddAgenda}
          className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal *</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam Ke *</label>
            <input
              type="text"
              placeholder="Contoh: 1 - 2"
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
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
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
            <select
              value={mapel}
              onChange={(e) => setMapel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              required={!isGuruKelas}
            >
              {isGuruKelas ? (
                <option value="Tematik / Guru Kelas">Tematik / Semua Mapel (Guru Kelas)</option>
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

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Materi Pembelajaran *</label>
            <input
              type="text"
              placeholder="Detail materi atau modul yang diajarkan"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status Keterlaksanaan</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            >
              <option value="Terlaksana">Terlaksana</option>
              <option value="Tunda">Tunda</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Absen Siswa</label>
            <input
              type="text"
              placeholder="Nihil / Nama siswa"
              value={absenSiswa}
              onChange={(e) => setAbsenSiswa(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Keterangan / Catatan Tambahan</label>
            <input
              type="text"
              placeholder="Opsional (misal: diskusi kelompok lancar)"
              value={ket}
              onChange={(e) => setKet(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Jurnal</span>
            </button>
          </div>
        </form>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3 text-center">Jam</th>
                <th className="p-3 text-center">Kelas & Mapel</th>
                <th className="p-3">Materi Pembelajaran</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Absen</th>
                <th className="p-3 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredAgendaList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada jurnal agenda mengajar untuk kelas ini.
                  </td>
                </tr>
              ) : (
                filteredAgendaList.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 font-semibold whitespace-nowrap">{a.tanggal}</td>
                    <td className="p-3 text-center font-mono font-bold">{a.jam}</td>
                    <td className="p-3 text-center font-bold">
                      <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-0.5 rounded-md">
                        {a.kelas} - {a.mapel}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{a.materi}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          a.status === "Terlaksana"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{a.absenSiswa || "-"}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleStartEdit(a)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Jurnal Agenda"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAgenda(a.id)}
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

      {/* Modal Edit Agenda */}
      {editingAgenda && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Jurnal Agenda Mengajar</span>
              </h3>
              <button
                onClick={() => setEditingAgenda(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal *</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 font-bold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jam Ke *</label>
                <input
                  type="text"
                  value={editJam}
                  onChange={(e) => setEditJam(e.target.value)}
                  placeholder="Contoh: 1 - 2"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
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
                    <option value="Tematik / Guru Kelas">Tematik / Semua Mapel (Guru Kelas)</option>
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

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Materi Pembelajaran *</label>
                <input
                  type="text"
                  value={editMateri}
                  onChange={(e) => setEditMateri(e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status Keterlaksanaan</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                >
                  <option value="Terlaksana">Terlaksana</option>
                  <option value="Tunda">Tunda</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Absen Siswa</label>
                <input
                  type="text"
                  value={editAbsenSiswa}
                  onChange={(e) => setEditAbsenSiswa(e.target.value)}
                  placeholder="Nihil / Nama siswa"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={editKet}
                  onChange={(e) => setEditKet(e.target.value)}
                  placeholder="Catatan tambahan"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingAgenda(null)}
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
