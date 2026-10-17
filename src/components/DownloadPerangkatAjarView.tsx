import React from "react";
import { Download, ExternalLink, ArrowRight, BookOpenCheck } from "lucide-react";

export const DownloadPerangkatAjarView: React.FC = () => {
  const targetUrl = "https://www.yefriharyanto.id/2025/10/perangkat-ajar-deep-learning-.html";

  const handleOpenLink = () => {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-purple-800">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-full text-xs uppercase tracking-wider shadow-xs">
            <BookOpenCheck className="w-4 h-4" />
            <span>Perangkat Ajar Deep Learning Kurikulum Merdeka</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-amber-300">
            Download Perangkat Ajar
          </h2>

          <p className="text-slate-200 text-sm md:text-base leading-relaxed">
            Unduh berkas Perangkat Ajar Deep Learning Kurikulum Merdeka terlengkap untuk semua jenjang dan mata pelajaran melalui portal resmi di bawah ini.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={handleOpenLink}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-amber-400/20 transition-all flex items-center space-x-3 text-sm md:text-base cursor-pointer transform active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>Unduh Perangkat Ajar Deep Learning</span>
              <ExternalLink className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Web Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2 truncate max-w-xs md:max-w-md">
              {targetUrl}
            </span>
          </div>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            <span>Buka di Tab Baru</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="relative w-full h-[650px] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-2">
          <iframe
            src={targetUrl}
            title="Download Perangkat Ajar Deep Learning"
            className="w-full h-full border-0 rounded-b-2xl"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
};
