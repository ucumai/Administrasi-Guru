import React from "react";
import { Sparkles, ExternalLink, FileText, Globe } from "lucide-react";
import { Pengaturan } from "../types";

interface GeneratorLkpdAIViewProps {
  config?: Pengaturan;
}

export const GeneratorLkpdAIView: React.FC<GeneratorLkpdAIViewProps> = () => {
  const targetUrl = "https://gemini.google.com/share/c13c70537645?skid=13a642df-4790-4ae1-abe0-8a44e6b08b0e";

  const handleOpenLink = () => {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-800">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-yellow-400 text-slate-950 font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow-xs">
            <Sparkles className="w-4 h-4" />
            <span>Google Gemini AI Shared Prompt LKPD</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-yellow-300">
            Generator LKPD AI
          </h2>

          <p className="text-slate-200 text-sm md:text-base leading-relaxed">
            Layanan Generator Lembar Kerja Peserta Didik (LKPD) AI dialihkan langsung ke laman resmi Google Gemini AI terintegrasi di luar aplikasi. Klik tombol di bawah untuk membuka prompt dan templat LKPD otomatis.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={handleOpenLink}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-yellow-400/20 transition-all flex items-center space-x-3 text-sm md:text-base cursor-pointer transform active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Buka Generator LKPD AI di Tab Baru</span>
              <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Direct External Link Info Card (Tanpa Sematan Iframe) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md p-6 space-y-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Pranala Resmi Generator LKPD AI (Google Gemini Shared Prompt)
            </h3>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Untuk kenyamanan dan performa terbaik tanpa batasan bingkai (iframe), silakan akses langsung tautan resmi berikut:
            </p>
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 overflow-x-auto">
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400 select-all truncate">
                {targetUrl}
              </span>
              <button
                onClick={handleOpenLink}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <span>Kunjungi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
