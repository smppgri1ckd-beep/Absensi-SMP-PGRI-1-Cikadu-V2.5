import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QuotaTracker } from './quotaTracker';
import { getWIBTodayDateString, getWIBCurrentTimeString } from '../utils/wibTime';

export type PwaInstallActionType =
  | 'install_clicked'
  | 'prompt_accepted'
  | 'prompt_dismissed'
  | 'app_installed'
  | 'installer_downloaded'
  | 'qr_opened'
  | 'whatsapp_shared';

export type PwaPlacementVariant =
  | 'header'
  | 'login-card'
  | 'dashboard-banner'
  | 'menu-item'
  | 'guide-modal';

export interface PwaInstallLogEntry {
  id: string;
  tanggal: string; // YYYY-MM-DD (WIB)
  waktu: string; // HH:mm (24 Jam WIB)
  aksi: PwaInstallActionType;
  lokasiTombol: PwaPlacementVariant;
  perangkat: 'Android' | 'iOS' | 'Desktop';
  peran: string; // 'guru' | 'ortu' | 'piket' | 'admin' | 'kepsek' | 'publik'
  namaPengguna: string;
  browserInfo: string;
}

export interface PwaAdoptionStats {
  totalInstallClicks: number;
  totalAcceptedInstalls: number;
  totalQrAndShares: number;
  byPlatform: {
    Android: number;
    iOS: number;
    Desktop: number;
  };
  byRole: {
    guru: number;
    ortu: number;
    piket: number;
    admin: number;
    publik: number;
  };
  byPlacement: {
    'header': number;
    'login-card': number;
    'dashboard-banner': number;
    'menu-item': number;
    'guide-modal': number;
  };
  recentLogs: PwaInstallLogEntry[];
  lastUpdatedAt: string;
}

const STORAGE_KEY = 'smp_pgri_cikadu_pwa_adoption_stats_v1';
const DEVICE_INSTALLED_FLAG = 'smp_pgri_cikadu_pwa_device_logged_v1';

const DEFAULT_STATS: PwaAdoptionStats = {
  totalInstallClicks: 0,
  totalAcceptedInstalls: 0,
  totalQrAndShares: 0,
  byPlatform: {
    Android: 0,
    iOS: 0,
    Desktop: 0,
  },
  byRole: {
    guru: 0,
    ortu: 0,
    piket: 0,
    admin: 0,
    publik: 0,
  },
  byPlacement: {
    'header': 0,
    'login-card': 0,
    'dashboard-banner': 0,
    'menu-item': 0,
    'guide-modal': 0,
  },
  recentLogs: [],
  lastUpdatedAt: '',
};

type StatsListener = (stats: PwaAdoptionStats) => void;
const listeners = new Set<StatsListener>();

export function detectDevicePlatform(): 'Android' | 'iOS' | 'Desktop' {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  return 'Desktop';
}

export function detectBrowserShortName(): string {
  if (typeof window === 'undefined') return 'Browser';
  const ua = window.navigator.userAgent;
  if (/Edg/i.test(ua)) return 'Edge';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  return 'Browser Web';
}

function getCurrentUserSessionInfo(): { peran: string; namaPengguna: string } {
  if (typeof window === 'undefined') {
    return { peran: 'publik', namaPengguna: 'Pengunjung / Siswa / Ortu' };
  }
  try {
    const raw =
      sessionStorage.getItem('presensi_user_session') ||
      localStorage.getItem('presensi_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role) {
        return {
          peran: String(parsed.role).toLowerCase(),
          namaPengguna: parsed.nama || parsed.username || 'Pengguna Terdaftar',
        };
      }
    }
  } catch {}
  return { peran: 'publik', namaPengguna: 'Pengunjung Publik / Ortu' };
}

export function getLocalPwaAdoptionStats(): PwaAdoptionStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        byPlatform: { ...DEFAULT_STATS.byPlatform, ...(parsed.byPlatform || {}) },
        byRole: { ...DEFAULT_STATS.byRole, ...(parsed.byRole || {}) },
        byPlacement: { ...DEFAULT_STATS.byPlacement, ...(parsed.byPlacement || {}) },
        recentLogs: Array.isArray(parsed.recentLogs) ? parsed.recentLogs : [],
      };
    }
  } catch {}
  return DEFAULT_STATS;
}

function saveLocalPwaAdoptionStats(stats: PwaAdoptionStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
  listeners.forEach((cb) => cb(stats));
}

/**
 * Mencatat aktivitas ketika pengguna mengeklik tombol/prompt 'Install' pada PWA Android,
 * membantu Administrator memantau tingkat adopsi aplikasi Android secara terukur.
 */
export async function logPwaInstallClick(options: {
  action: PwaInstallActionType;
  placement?: PwaPlacementVariant;
  userRole?: string;
  userName?: string;
}): Promise<PwaAdoptionStats> {
  const current = getLocalPwaAdoptionStats();
  const platform = detectDevicePlatform();
  const browser = detectBrowserShortName();
  const sessionUser = getCurrentUserSessionInfo();

  const rawRole = (options.userRole || sessionUser.peran || 'publik').toLowerCase();
  const roleKey: keyof PwaAdoptionStats['byRole'] =
    rawRole === 'guru'
      ? 'guru'
      : rawRole === 'ortu'
      ? 'ortu'
      : rawRole === 'piket'
      ? 'piket'
      : rawRole === 'admin' || rawRole === 'kepsek'
      ? 'admin'
      : 'publik';

  const placement: PwaPlacementVariant = options.placement || 'header';
  const tanggal = getWIBTodayDateString();
  const waktu = getWIBCurrentTimeString();

  // Cegah duplikasi penghitungan 'app_installed' & 'prompt_accepted' dalam sesi perangkat yang sama
  if (options.action === 'app_installed' && typeof window !== 'undefined') {
    const alreadyLogged = sessionStorage.getItem(DEVICE_INSTALLED_FLAG);
    if (alreadyLogged === 'true') {
      return current;
    }
    try {
      sessionStorage.setItem(DEVICE_INSTALLED_FLAG, 'true');
    } catch {}
  }

  const newEntry: PwaInstallLogEntry = {
    id: `PWA_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    tanggal,
    waktu,
    aksi: options.action,
    lokasiTombol: placement,
    perangkat: platform,
    peran: roleKey,
    namaPengguna: options.userName || sessionUser.namaPengguna,
    browserInfo: `${platform} • ${browser}`,
  };

  const isClick = options.action === 'install_clicked';
  const isAccepted =
    options.action === 'prompt_accepted' ||
    options.action === 'app_installed' ||
    options.action === 'installer_downloaded';
  const isShareOrQr =
    options.action === 'qr_opened' || options.action === 'whatsapp_shared';

  const updated: PwaAdoptionStats = {
    totalInstallClicks: current.totalInstallClicks + (isClick ? 1 : 0),
    totalAcceptedInstalls: current.totalAcceptedInstalls + (isAccepted ? 1 : 0),
    totalQrAndShares: current.totalQrAndShares + (isShareOrQr ? 1 : 0),
    byPlatform: {
      ...current.byPlatform,
      [platform]: (current.byPlatform[platform] || 0) + (isClick || isAccepted ? 1 : 0),
    },
    byRole: {
      ...current.byRole,
      [roleKey]: (current.byRole[roleKey] || 0) + (isClick || isAccepted ? 1 : 0),
    },
    byPlacement: {
      ...current.byPlacement,
      [placement]: (current.byPlacement[placement] || 0) + (isClick || isAccepted ? 1 : 0),
    },
    recentLogs: [newEntry, ...current.recentLogs].slice(0, 35),
    lastUpdatedAt: `${tanggal} ${waktu} WIB`,
  };

  saveLocalPwaAdoptionStats(updated);

  // Sinkronisasi ke Firestore pada dokumen pengaturan/statistik_instalasi_pwa jika online
  if (db && (isClick || isAccepted || isShareOrQr)) {
    try {
      const docRef = doc(db, 'pengaturan', 'statistik_instalasi_pwa');
      await setDoc(docRef, updated, { merge: true });
      QuotaTracker.trackWrites('pengaturan', 1, `Log adopsi PWA Android (${options.action})`);
    } catch {
      // Tetap tersimpan aman di localStorage jika offline atau kuota penuh
    }
  }

  return updated;
}

/**
 * Mengambil data terbaru statistik instalasi PWA dari Firestore (untuk Administrator)
 */
export async function syncPwaAdoptionStatsFromCloud(): Promise<PwaAdoptionStats> {
  const local = getLocalPwaAdoptionStats();
  if (!db) return local;

  try {
    const docRef = doc(db, 'pengaturan', 'statistik_instalasi_pwa');
    const snap = await getDoc(docRef);
    QuotaTracker.trackReads('pengaturan', 1, 'Muat statistik adopsi aplikasi Android (PWA)');
    if (snap.exists()) {
      const cloudData = snap.data() as Partial<PwaAdoptionStats>;
      const merged: PwaAdoptionStats = {
        totalInstallClicks: Math.max(
          local.totalInstallClicks,
          cloudData.totalInstallClicks || 0
        ),
        totalAcceptedInstalls: Math.max(
          local.totalAcceptedInstalls,
          cloudData.totalAcceptedInstalls || 0
        ),
        totalQrAndShares: Math.max(
          local.totalQrAndShares,
          cloudData.totalQrAndShares || 0
        ),
        byPlatform: {
          Android: Math.max(
            local.byPlatform.Android,
            cloudData.byPlatform?.Android || 0
          ),
          iOS: Math.max(local.byPlatform.iOS, cloudData.byPlatform?.iOS || 0),
          Desktop: Math.max(
            local.byPlatform.Desktop,
            cloudData.byPlatform?.Desktop || 0
          ),
        },
        byRole: {
          guru: Math.max(local.byRole.guru, cloudData.byRole?.guru || 0),
          ortu: Math.max(local.byRole.ortu, cloudData.byRole?.ortu || 0),
          piket: Math.max(local.byRole.piket, cloudData.byRole?.piket || 0),
          admin: Math.max(local.byRole.admin, cloudData.byRole?.admin || 0),
          publik: Math.max(local.byRole.publik, cloudData.byRole?.publik || 0),
        },
        byPlacement: {
          'header': Math.max(
            local.byPlacement['header'],
            cloudData.byPlacement?.['header'] || 0
          ),
          'login-card': Math.max(
            local.byPlacement['login-card'],
            cloudData.byPlacement?.['login-card'] || 0
          ),
          'dashboard-banner': Math.max(
            local.byPlacement['dashboard-banner'],
            cloudData.byPlacement?.['dashboard-banner'] || 0
          ),
          'menu-item': Math.max(
            local.byPlacement['menu-item'],
            cloudData.byPlacement?.['menu-item'] || 0
          ),
          'guide-modal': Math.max(
            local.byPlacement['guide-modal'],
            cloudData.byPlacement?.['guide-modal'] || 0
          ),
        },
        recentLogs:
          Array.isArray(cloudData.recentLogs) &&
          cloudData.recentLogs.length >= local.recentLogs.length
            ? cloudData.recentLogs.slice(0, 35)
            : local.recentLogs,
        lastUpdatedAt: cloudData.lastUpdatedAt || local.lastUpdatedAt,
      };
      saveLocalPwaAdoptionStats(merged);
      return merged;
    }
  } catch {
    // Gunakan cache lokal jika offline
  }
  return local;
}

export function subscribePwaAdoptionStats(callback: StatsListener): () => void {
  listeners.add(callback);
  callback(getLocalPwaAdoptionStats());
  return () => {
    listeners.delete(callback);
  };
}
