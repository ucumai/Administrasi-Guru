import React from "react";
import { Pengaturan } from "../types";

export interface KopSuratDinasProps {
  config: Pengaturan;
  judul?: string;
  subjudul?: string;
  tahunAjaran?: string;
  semester?: string;
  mataPelajaran?: string;
  kelas?: string;
  tanggalCetak?: string;
  customInfo?: React.ReactNode;
  showDoubleLine?: boolean;
  className?: string;
}

export const KopSuratDinas: React.FC<KopSuratDinasProps> = ({
  config,
  judul,
  subjudul,
  tahunAjaran,
  semester,
  mataPelajaran,
  kelas,
  tanggalCetak,
  customInfo,
  showDoubleLine = true,
  className = ""
}) => {
  const logoHeight = config.Logo_Tinggi || 65;

  return (
    <div className={`kop-surat-dinas-container text-black font-sans ${className}`}>
      {/* Header Kop Instansi */}
      <div className="flex items-center justify-between gap-4">
        {/* Logo Kiri (Utama) */}
        <div className="w-20 shrink-0 flex items-center justify-start">
          {config.Logo_Kiri ? (
            <img
              src={config.Logo_Kiri}
              alt="Logo Kiri"
              style={{ height: `${logoHeight}px`, maxHeight: "90px" }}
              className="object-contain"
            />
          ) : (
            <div className="w-16 h-16" />
          )}
        </div>

        {/* Teks Kop Instansi Tengah */}
        <div className="text-center flex-1 space-y-0.5">
          <p className="font-bold text-xs md:text-sm uppercase tracking-wider text-slate-900">
            {config.Pemerintah || "PEMERINTAH KABUPATEN BOGOR"}
          </p>
          <p className="font-bold text-xs md:text-sm uppercase tracking-wider text-slate-900">
            {config.Dinas || "DINAS PENDIDIKAN"}
          </p>
          <h2 className="font-black text-base md:text-xl uppercase tracking-tight text-slate-950 my-0.5">
            {config.Nama_Sekolah || "SD NEGERI BABAKAN 04"}
          </h2>
          <p className="text-[10px] md:text-xs text-slate-700 leading-tight">
            {config.Alamat_Sekolah || "Kp. Babakan Kulon RT.05/02 Desa Babakan Kec. Ciseeng Kab. Bogor"}
            {config.NPSN ? ` • NPSN: ${config.NPSN}` : ""}
            {config.Email_Sekolah ? ` • Email: ${config.Email_Sekolah}` : ""}
          </p>
        </div>

        {/* Logo Kanan (Opsional) */}
        <div className="w-20 shrink-0 flex items-center justify-end">
          {config.Logo_Kanan ? (
            <img
              src={config.Logo_Kanan}
              alt="Logo Kanan"
              style={{ height: `${logoHeight}px`, maxHeight: "90px" }}
              className="object-contain"
            />
          ) : (
            <div className="w-16 h-16" />
          )}
        </div>
      </div>

      {/* Garis Ganda Resmi Kedinasan */}
      {showDoubleLine && (
        <div className="mt-3 mb-4">
          <div className="border-t-2 border-black" />
          <div className="border-t border-black mt-0.5" />
        </div>
      )}

      {/* Judul Dokumen (Jika Ada) */}
      {(judul || subjudul || tahunAjaran || semester || mataPelajaran || kelas || tanggalCetak || customInfo) && (
        <div className="text-center mb-5 space-y-1">
          {judul && (
            <h1 className="text-sm md:text-base font-black uppercase tracking-tight text-slate-950">
              {judul}
            </h1>
          )}
          {subjudul && (
            <h3 className="text-xs md:text-sm font-bold uppercase text-slate-800">
              {subjudul}
            </h3>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-700">
            {mataPelajaran && <span>Mata Pelajaran: {mataPelajaran}</span>}
            {kelas && <span>Kelas: {kelas}</span>}
            {tahunAjaran && <span>Tahun Ajaran: {tahunAjaran}</span>}
            {semester && <span>Semester: {semester}</span>}
            {tanggalCetak && <span>Tanggal Cetak: {tanggalCetak}</span>}
          </div>

          {customInfo && <div className="mt-2">{customInfo}</div>}
        </div>
      )}
    </div>
  );
};
