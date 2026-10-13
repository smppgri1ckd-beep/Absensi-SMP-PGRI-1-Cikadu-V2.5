/**
 * Firestore Daily Quota Tracking Service
 * Tracks document reads, writes, and deletes against Google Cloud Firebase Free Tier (Spark Plan) limits:
 * - 50,000 document reads / day
 * - 20,000 document writes / day
 * - 20,000 document deletes / day
 */

export interface QuotaHistoryItem {
  id: string;
  timestamp: string;
  type: 'READ' | 'WRITE' | 'DELETE' | 'WARNING' | 'EXCEEDED';
  collection?: string;
  count: number;
  description: string;
}

export interface FirestoreQuotaStats {
  date: string; // YYYY-MM-DD
  readsToday: number;
  writesToday: number;
  deletesToday: number;
  readLimit: number;
  writeLimit: number;
  deleteLimit: number;
  readsByCollection: Record<string, number>;
  writesByCollection: Record<string, number>;
  deletesByCollection: Record<string, number>;
  isQuotaExceeded: boolean;
  lastQuotaExceededTimestamp?: string;
  lastOperationTimestamp: string;
  quotaSaverMode: boolean;
  historyLog: QuotaHistoryItem[];
}

const STORAGE_KEY = 'smp_pgri_firestore_quota_v1';
const READ_LIMIT = 50000;
const WRITE_LIMIT = 20000;
const DELETE_LIMIT = 20000;

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDefaultStats(): FirestoreQuotaStats {
  return {
    date: getTodayKey(),
    readsToday: 0,
    writesToday: 0,
    deletesToday: 0,
    readLimit: READ_LIMIT,
    writeLimit: WRITE_LIMIT,
    deleteLimit: DELETE_LIMIT,
    readsByCollection: {
      siswa: 0,
      presensi: 0,
      jurnal_mengajar: 0,
      nilai_siswa: 0,
      guru_users: 0,
      tugas_siswa: 0,
      permohonan_izin: 0,
      presensi_guru: 0,
      permohonan_izin_guru: 0,
      agenda_sekolah: 0,
      jadwal_pelajaran: 0,
      pengaturan: 0,
    },
    writesByCollection: {},
    deletesByCollection: {},
    isQuotaExceeded: false,
    lastOperationTimestamp: new Date().toISOString(),
    quotaSaverMode: false,
    historyLog: [],
  };
}

let inMemoryStats: FirestoreQuotaStats = (() => {
  if (typeof window === 'undefined') return getDefaultStats();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FirestoreQuotaStats;
      const today = getTodayKey();
      if (parsed.date === today) {
        return parsed;
      } else {
        // New day: retain quotaSaverMode & carries forward exceeded status if reset hasn't fired
        const fresh = getDefaultStats();
        fresh.quotaSaverMode = parsed.quotaSaverMode || false;
        return fresh;
      }
    }
  } catch {}
  return getDefaultStats();
})();

const listeners = new Set<(stats: FirestoreQuotaStats) => void>();

function persistAndNotify(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryStats));
    }
  } catch {}
  listeners.forEach((listener) => {
    try {
      listener({ ...inMemoryStats });
    } catch {}
  });
}

function ensureCurrentDate(): void {
  const today = getTodayKey();
  if (inMemoryStats.date !== today) {
    const savedMode = inMemoryStats.quotaSaverMode;
    inMemoryStats = {
      ...getDefaultStats(),
      date: today,
      quotaSaverMode: savedMode,
    };
    persistAndNotify();
  }
}

export const QuotaTracker = {
  getStats(): FirestoreQuotaStats {
    ensureCurrentDate();
    return { ...inMemoryStats };
  },

  trackReads(collectionName: string, count: number = 1, description?: string): void {
    if (count <= 0) return;
    ensureCurrentDate();
    
    inMemoryStats.readsToday += count;
    inMemoryStats.readsByCollection[collectionName] = (inMemoryStats.readsByCollection[collectionName] || 0) + count;
    inMemoryStats.lastOperationTimestamp = new Date().toISOString();

    // Check thresholds
    const ratio = inMemoryStats.readsToday / inMemoryStats.readLimit;
    if (ratio >= 1.0) {
      inMemoryStats.isQuotaExceeded = true;
      inMemoryStats.lastQuotaExceededTimestamp = new Date().toISOString();
    }

    // Add log entry (keep last 50)
    const logItem: QuotaHistoryItem = {
      id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: inMemoryStats.isQuotaExceeded ? 'EXCEEDED' : ratio >= 0.85 ? 'WARNING' : 'READ',
      collection: collectionName,
      count,
      description: description || `Pembacaan ${count} dokumen dari koleksi ${collectionName}`,
    };

    inMemoryStats.historyLog = [logItem, ...inMemoryStats.historyLog].slice(0, 50);
    persistAndNotify();
  },

  trackWrites(collectionName: string, count: number = 1, description?: string): void {
    if (count <= 0) return;
    ensureCurrentDate();

    inMemoryStats.writesToday += count;
    inMemoryStats.writesByCollection[collectionName] = (inMemoryStats.writesByCollection[collectionName] || 0) + count;
    inMemoryStats.lastOperationTimestamp = new Date().toISOString();

    const logItem: QuotaHistoryItem = {
      id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'WRITE',
      collection: collectionName,
      count,
      description: description || `Penulisan ${count} dokumen ke koleksi ${collectionName}`,
    };

    inMemoryStats.historyLog = [logItem, ...inMemoryStats.historyLog].slice(0, 50);
    persistAndNotify();
  },

  trackDeletes(collectionName: string, count: number = 1, description?: string): void {
    if (count <= 0) return;
    ensureCurrentDate();

    inMemoryStats.deletesToday += count;
    inMemoryStats.deletesByCollection[collectionName] = (inMemoryStats.deletesByCollection[collectionName] || 0) + count;
    inMemoryStats.lastOperationTimestamp = new Date().toISOString();

    const logItem: QuotaHistoryItem = {
      id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'DELETE',
      collection: collectionName,
      count,
      description: description || `Penghapusan ${count} dokumen dari koleksi ${collectionName}`,
    };

    inMemoryStats.historyLog = [logItem, ...inMemoryStats.historyLog].slice(0, 50);
    persistAndNotify();
  },

  recordQuotaExceeded(errorMsg?: string): void {
    ensureCurrentDate();
    inMemoryStats.isQuotaExceeded = true;
    inMemoryStats.lastQuotaExceededTimestamp = new Date().toISOString();
    
    // Ensure counter is at least at the 50,000 threshold if quota reached
    if (inMemoryStats.readsToday < inMemoryStats.readLimit) {
      inMemoryStats.readsToday = inMemoryStats.readLimit;
    }

    const logItem: QuotaHistoryItem = {
      id: `EXC_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'EXCEEDED',
      count: 0,
      description: errorMsg || 'Batas kuota gratis pembacaan Firestore (50.000/hari) terlampaui. Sistem otomatis beralih ke cache lokal.',
    };

    inMemoryStats.historyLog = [logItem, ...inMemoryStats.historyLog].slice(0, 50);
    persistAndNotify();
  },

  toggleQuotaSaverMode(enabled?: boolean): boolean {
    ensureCurrentDate();
    const nextVal = enabled !== undefined ? enabled : !inMemoryStats.quotaSaverMode;
    inMemoryStats.quotaSaverMode = nextVal;
    persistAndNotify();
    return nextVal;
  },

  resetDailyStats(): void {
    inMemoryStats = {
      ...getDefaultStats(),
      date: getTodayKey(),
      quotaSaverMode: inMemoryStats.quotaSaverMode,
    };
    persistAndNotify();
  },

  subscribe(listener: (stats: FirestoreQuotaStats) => void): () => void {
    listeners.add(listener);
    listener({ ...inMemoryStats });
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Estimates remaining time until Google Cloud quota reset
   * Google Cloud Pacific Time resets daily at 00:00 PST (15:00 WIB in Indonesia)
   */
  getTimeUntilNextGoogleCloudReset(): { hours: number; minutes: number; formatted: string } {
    const now = new Date();
    // 15:00 WIB is 08:00 UTC
    const targetUTC = 8;
    const currentUTC = now.getUTCHours() + now.getUTCMinutes() / 60;
    
    let diffHours = targetUTC - currentUTC;
    if (diffHours <= 0) {
      diffHours += 24;
    }

    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);

    return {
      hours,
      minutes,
      formatted: `${hours} jam ${minutes} menit`,
    };
  },
};
