import { showToastSuccess } from './swal';

/**
 * Security Protection Manager for EdAdmin Pro
 * Protects frontend assets from casual inspection, right-click cloning, shortcut copying, and unauthorized code viewing.
 */

export interface SecurityConfig {
  blockRightClick: boolean;
  blockDevToolsShortcuts: boolean;
  blockViewSource: boolean;
  blockSavePage: boolean;
  showConsoleWarning: boolean;
  licenseKey?: string;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  blockRightClick: true,
  blockDevToolsShortcuts: true,
  blockViewSource: true,
  blockSavePage: true,
  showConsoleWarning: true,
};

let activeSecurityListener: ((e: KeyboardEvent) => void) | null = null;
let activeContextMenuListener: ((e: MouseEvent) => void) | null = null;

/**
 * Initialize Client-Side Security Protection
 */
export function initSecurityProtection(config: Partial<SecurityConfig> = {}) {
  if (typeof window === 'undefined') return;

  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

  // Remove existing listeners if re-initializing
  cleanupSecurityProtection();

  // 1. Console Warning Banner
  if (finalConfig.showConsoleWarning) {
    try {
      console.clear();
      console.log(
        '%c⛔ STOP! Peringatan Keamanan Hak Cipta & Lisensi',
        'color: #ef4444; font-size: 20px; font-weight: 900; background: #1e1b4b; padding: 10px 16px; border-radius: 8px;'
      );
      console.log(
        '%cAplikasi Administrasi Guru & Sekolah ini dilindungi oleh Undang-Undang Hak Cipta dan Sistem Lisensi Terintegrasi.\nDilarang keras menyalin, meniru, mereverse-engineer, atau mendistribusikan ulang kode tanpa izin tertulis resmi.',
        'color: #f59e0b; font-size: 12px; font-weight: 600; line-height: 1.5;'
      );
    } catch {
      // Ignore if console is restricted
    }
  }

  // 2. Disable Right Click (Context Menu)
  if (finalConfig.blockRightClick) {
    activeContextMenuListener = (e: MouseEvent) => {
      // Allow right-click inside editable text inputs / textareas if user needs copy-paste
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      if (!isInput) {
        e.preventDefault();
        showToastSuccess('🔒 Fitur Klik Kanan & Inspect Element Dinonaktifkan demi Keamanan Hak Cipta Aplikasi');
      }
    };
    document.addEventListener('contextmenu', activeContextMenuListener);
  }

  // 3. Disable DevTools & Copy Keyboard Shortcuts
  if (finalConfig.blockDevToolsShortcuts || finalConfig.blockViewSource || finalConfig.blockSavePage) {
    activeSecurityListener = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();
      const keyCode = e.keyCode;

      // F12 Key
      const isF12 = key === 'F12' || keyCode === 123;

      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      const isInspect = isCmdOrCtrl && e.shiftKey && (key === 'I' || keyCode === 73);

      // Ctrl+Shift+J / Cmd+Option+J (Console)
      const isConsole = isCmdOrCtrl && e.shiftKey && (key === 'J' || keyCode === 74);

      // Ctrl+Shift+C / Cmd+Option+C (Element Selector)
      const isElementSelect = isCmdOrCtrl && e.shiftKey && (key === 'C' || keyCode === 67);

      // Ctrl+U (View Source)
      const isViewSource = isCmdOrCtrl && (key === 'U' || keyCode === 85);

      // Ctrl+S (Save Webpage)
      const isSavePage = isCmdOrCtrl && (key === 'S' || keyCode === 83);

      if (
        (finalConfig.blockDevToolsShortcuts && (isF12 || isInspect || isConsole || isElementSelect)) ||
        (finalConfig.blockViewSource && isViewSource) ||
        (finalConfig.blockSavePage && isSavePage)
      ) {
        e.preventDefault();
        e.stopPropagation();
        showToastSuccess('🔒 Akses DevTools & Kombinasi Tombol Pintas Dibatasi Sistem Proteksi');
        return false;
      }
    };

    document.addEventListener('keydown', activeSecurityListener, true);
  }
}

/**
 * Remove active security listeners
 */
export function cleanupSecurityProtection() {
  if (typeof document === 'undefined') return;
  if (activeContextMenuListener) {
    document.removeEventListener('contextmenu', activeContextMenuListener);
    activeContextMenuListener = null;
  }
  if (activeSecurityListener) {
    document.removeEventListener('keydown', activeSecurityListener, true);
    activeSecurityListener = null;
  }
}

/**
 * License Key Helper Utilities
 */
export function generateSchoolLicenseKey(schoolName: string = 'SEKOLAH'): string {
  const sanitized = schoolName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 4) || 'SCHL';
  const year = new Date().getFullYear();
  const rand1 = Math.floor(1000 + Math.random() * 9000);
  const rand2 = Math.floor(1000 + Math.random() * 9000);
  return `EDU-${year}-${sanitized}-${rand1}-${rand2}`;
}

export function verifySchoolLicenseKey(key: string): boolean {
  if (!key) return false;
  const pattern = /^EDU-\d{4}-[A-Z0-9]{3,6}-\d{4}-\d{4}$/;
  return pattern.test(key.trim());
}
