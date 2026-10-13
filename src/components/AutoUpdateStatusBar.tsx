import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Clock,
  Database,
  Gauge
} from 'lucide-react';
import { 
  getActiveDate, 
  getSystemTodayDate, 
  formatIndonesianDate, 
  DailyAutoUpdateService 
} from '../utils/dailyAutoUpdate';
import { QuotaTracker, FirestoreQuotaStats } from '../services/quotaTracker';

interface AutoUpdateStatusBarProps {
  onRefreshAllData: () => Promise<void>;
  onOpenQuotaMonitor?: () => void;
  className?: string;
  compact?: boolean;
}

export const AutoUpdateStatusBar: React.FC<AutoUpdateStatusBarProps> = ({
  onRefreshAllData,
  onOpenQuotaMonitor,
  className = '',
  compact = false,
}) => {
  const [activeDate, setActiveDate] = useState<string>(getActiveDate());
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [quotaStats, setQuotaStats] = useState<FirestoreQuotaStats>(QuotaTracker.getStats());

  useEffect(() => {
    const unsub = QuotaTracker.subscribe((stats) => {
      setQuotaStats(stats);
    });
    return unsub;
  }, []);

  const handleRefreshToday = async () => {
    setIsUpdating(true);
    try {
      await DailyAutoUpdateService.checkAndRunDailyAutoUpdate(true);
      await onRefreshAllData();
      setActiveDate(getActiveDate());
    } finally {
      setIsUpdating(false);
    }
  };

  const remainingReads = Math.max(0, quotaStats.readLimit - quotaStats.readsToday);
  const readPercent = Math.min(100, Math.round((quotaStats.readsToday / quotaStats.readLimit) * 100));

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-md border border-indigo-800/40 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Active Date & Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400/40 animate-ping"></span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                Auto-Update Harian Aktif
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold mt-0.5 sm:mt-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              <span>Hari Ini: <strong className="text-white font-extrabold">{formatIndonesianDate(activeDate)}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Quota Chip & Refresh Control */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenQuotaMonitor && (
            <button
              type="button"
              onClick={onOpenQuotaMonitor}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                quotaStats.isQuotaExceeded || readPercent >= 90
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 animate-pulse'
                  : readPercent >= 65
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40'
                  : 'bg-white/10 hover:bg-white/15 text-blue-200 border-white/15'
              }`}
              title="Klik untuk membuka Monitor Kuota Database Firestore"
            >
              <Gauge className="w-3.5 h-3.5 text-blue-300" />
              <span>Sisa Kuota: <strong className="text-white">{remainingReads.toLocaleString('id-ID')}</strong> Read</span>
            </button>
          )}

          <button
            type="button"
            disabled={isUpdating}
            onClick={handleRefreshToday}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sinkronkan data harian otomatis untuk hari ini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-amber-300' : 'text-blue-300'}`} />
            <span className="hidden sm:inline">{isUpdating ? 'Memperbarui...' : 'Perbarui Hari Ini'}</span>
            <span className="sm:hidden">{isUpdating ? 'Proses...' : 'Perbarui'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
