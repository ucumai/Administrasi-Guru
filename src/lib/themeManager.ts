import { Pengaturan } from '../types';

export interface ThemePreset {
  id: string;
  name: string;
  desc: string;
  primaryColor: string;
  primaryHover: string;
  gradientClass: string;
  badgeClass: string;
  previewColors: string[];
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ocean',
    name: '🔵 Ocean Sapphire (Default)',
    desc: 'Nuansa biru profesional & bersih standar EdAdmin Pro',
    primaryColor: '#2563eb',
    primaryHover: '#1d4ed8',
    gradientClass: 'from-slate-900 via-indigo-950 to-slate-900',
    badgeClass: 'from-blue-600 to-indigo-600',
    previewColors: ['#1e1b4b', '#2563eb', '#38bdf8'],
  },
  {
    id: 'emerald',
    name: '🟢 Forest Emerald (Edukasi Islami/Sains)',
    desc: 'Nuansa hijau sejuk & nyaman di mata untuk laporan & nilai',
    primaryColor: '#059669',
    primaryHover: '#047857',
    gradientClass: 'from-slate-900 via-emerald-950 to-teal-950',
    badgeClass: 'from-emerald-600 to-teal-600',
    previewColors: ['#022c22', '#059669', '#34d399'],
  },
  {
    id: 'indigo',
    name: '🟣 Royal Indigo & Violet',
    desc: 'Nuansa ungu elegan, modern, dan futuristik',
    primaryColor: '#7c3aed',
    primaryHover: '#6d28d9',
    gradientClass: 'from-slate-900 via-purple-950 to-indigo-950',
    badgeClass: 'from-purple-600 to-indigo-600',
    previewColors: ['#2e1065', '#7c3aed', '#a855f7'],
  },
  {
    id: 'crimson',
    name: '🔴 Merah Putih Nusantara',
    desc: 'Nuansa merah crimson & keemasan wawasan kebangsaan',
    primaryColor: '#dc2626',
    primaryHover: '#b91c1c',
    gradientClass: 'from-slate-950 via-rose-950 to-slate-900',
    badgeClass: 'from-rose-600 to-red-600',
    previewColors: ['#450a0a', '#dc2626', '#fb7185'],
  },
  {
    id: 'amber',
    name: '🟠 Warm Amber & Gold',
    desc: 'Nuansa keemasan hangat, ramah, dan penuh semangat',
    primaryColor: '#d97706',
    primaryHover: '#b45309',
    gradientClass: 'from-slate-900 via-amber-950 to-orange-950',
    badgeClass: 'from-amber-600 to-orange-600',
    previewColors: ['#451a03', '#d97706', '#fbbf24'],
  },
  {
    id: 'cyber',
    name: '🌑 Midnight Obsidian (Dark Mode Plus)',
    desc: 'Nuansa gelap kontras tinggi yang sangat nyaman untuk malam hari',
    primaryColor: '#6366f1',
    primaryHover: '#4f46e5',
    gradientClass: 'from-black via-slate-950 to-slate-900',
    badgeClass: 'from-indigo-600 to-blue-600',
    previewColors: ['#000000', '#1e1b4b', '#6366f1'],
  },
  {
    id: 'pastel',
    name: '🌸 Soft Pastel Ceria',
    desc: 'Nuansa warna lembut, ceria, dan ramah ramah siswa SD/SMP',
    primaryColor: '#ec4899',
    primaryHover: '#db2777',
    gradientClass: 'from-slate-900 via-pink-950 to-purple-950',
    badgeClass: 'from-pink-500 to-rose-500',
    previewColors: ['#500724', '#ec4899', '#f472b6'],
  },
];

export function applyGlobalTheme(themeConfig?: Pengaturan['themeConfig']) {
  if (typeof document === 'undefined') return;

  const preset = THEME_PRESETS.find((p) => p.id === themeConfig?.presetId) || THEME_PRESETS[0];
  const primaryColor = themeConfig?.primaryColor || preset.primaryColor;
  const primaryHover = themeConfig?.primaryHover || preset.primaryHover;
  const radius = themeConfig?.borderRadius || 'medium';
  const font = themeConfig?.fontFamily || 'inter';

  // Calculate radius CSS value
  let radiusPx = '12px';
  if (radius === 'sharp') radiusPx = '4px';
  if (radius === 'rounded') radiusPx = '20px';
  if (radius === 'full') radiusPx = '9999px';

  // Inject / update dynamic style tag
  let styleTag = document.getElementById('app-dynamic-theme-style') as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'app-dynamic-theme-style';
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    :root {
      --app-primary: ${primaryColor};
      --app-primary-hover: ${primaryHover};
      --app-radius: ${radiusPx};
    }

    /* Primary Accent Overrides */
    .theme-bg-primary {
      background-color: ${primaryColor} !important;
    }
    .theme-bg-primary:hover {
      background-color: ${primaryHover} !important;
    }
    .theme-text-primary {
      color: ${primaryColor} !important;
    }
    .theme-border-primary {
      border-color: ${primaryColor} !important;
    }
    
    /* Dynamic Buttons & Highlights */
    .btn-primary-theme {
      background-color: ${primaryColor} !important;
      color: #ffffff !important;
      border-radius: ${radiusPx} !important;
      transition: all 0.2s ease-in-out;
    }
    .btn-primary-theme:hover {
      background-color: ${primaryHover} !important;
      transform: translateY(-1px);
    }
  `;

  // Apply Font Family to document body
  const body = document.body;
  body.classList.remove('font-inter', 'font-jakarta', 'font-outfit', 'font-poppins');
  if (font === 'jakarta') body.classList.add('font-jakarta');
  else if (font === 'outfit') body.classList.add('font-outfit');
  else if (font === 'poppins') body.classList.add('font-poppins');
  else body.classList.add('font-inter');

  // Save in local storage as quick cache
  try {
    localStorage.setItem('edadmin_theme_config', JSON.stringify(themeConfig || { presetId: preset.id }));
  } catch {}
}
