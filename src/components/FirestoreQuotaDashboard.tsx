import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Gauge, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles, 
  FileText, 
  HelpCircle, 
  RefreshCw,
  TrendingUp,
  Server,
  CloudLightning,
  Flame,
  Info
} from 'lucide-react';
import { QuotaTracker, FirestoreQuotaStats } from '../services/quotaTracker';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '../context/ToastContext';

interface FirestoreQuotaDashboardProps {
  onRefreshAllData?: () => Promise<void>;
}

export const FirestoreQuotaDashboard: React.FC<FirestoreQuotaDashboardProps> = ({
  onRefreshAllData,
}) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<FirestoreQuotaStats>(QuotaTracker.getStats());
  const [resetTime, setResetTime] = useState(QuotaTracker.getTimeUntilNextGoogleCloudReset());
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'quota_exceeded' | 'error';
    latencyMs?: number;
    message: string;
  } | null>(null);

  // Subscribe to live quota changes
  useEffect(() => {
    const unsubscribe = QuotaTracker.subscribe((updated) => {
      setStats(updated);
    });

    const interval = setInterval(() => {
      setResetTime(QuotaTracker.getTimeUntilNextGoogleCloudReset());
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const readPercent = Math.min(100, Math.round((stats.readsToday / stats.readLimit) * 100));
  const writePercent = Math.min(100, Math.round((stats.writesToday / stats.writeLimit) * 100));
  const deletePercent = Math.min(100, Math.round((stats.deletesToday / stats.deleteLimit) * 100));

  const remainingReads = Math.max(0, stats.readLimit - stats.readsToday);
  const remainingWrites = Math.max(0, stats.writeLimit - stats.writesToday);
  const remainingDeletes = Math.max(0, stats.deleteLimit - stats.deletesToday);

  // Determine health level
  const healthStatus: 'aman' | 'waspada' | 'kritis' = 
    stats.isQuotaExceeded || readPercent >= 90 
      ? 'kritis' 
      : readPercent >= 65 
      ? 'waspada' 
      : 'aman';

  const handleToggleSaverMode = () => {
    const next = QuotaTracker.toggleQuotaSaverMode();
    if (next) {
      toast.success(
        'Mode Hemat Kuota Aktif',
        'Sistem memprioritaskan cache lokal dan membatasi penarikan data berulang untuk menghemat jatah harian.'
      );
    } else {
      toast.info('Mode Hemat Kuota Nonaktif', 'Sinkronisasi berjalan dalam frekuensi standar.');
    }
  };

  const handleResetCounter = () => {
    if (confirm('Atur ulang (reset) penghitung metrik kuota hari ini?\n\nPenghitungan lokal akan dimulai dari 0 untuk pemantauan sesi saat ini.')) {
      QuotaTracker.resetDailyStats();
      toast.info('Penghitung Direset', 'Statistik kuota harian lokal telah diatur ulang ke 0.');
    }
  };

  // Live Ping Test to Firestore to verify quota and connectivity
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    const start = Date.now();

    try {
      if (!db) {
        setTestResult({
          status: 'error',
          message: 'Firebase Firestore belum diinisialisasi atau offline.',
        });
        return;
      }

      // Try fetching lightweight config document
      const testDocRef = doc(db, 'pengaturan', 'identitas_sekolah');
      const snap = await getDoc(testDocRef);
      const latency = Date.now() - start;

      QuotaTracker.trackReads('pengaturan', 1, 'Uji langsung status kuota Firestore');

      setTestResult({
        status: 'success',
        latencyMs: latency,
        message: `Koneksi Firestore normal & aktif! Berhasil membaca dokumen (${latency} ms). Kuota pembacaan cloud masih tersedia.`,
      });
      toast.success('Koneksi Normal', `Firestore merespons dalam ${latency} ms. Jatah kuota masih tersedia.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Quota limit exceeded') || errMsg.includes('quota metric') || errMsg.includes('Quota exceeded')) {
        QuotaTracker.recordQuotaExceeded(errMsg);
        setTestResult({
          status: 'quota_exceeded',
          message: 'Batas kuota gratis pembacaan Firestore telah tercapai (Quota Limit Exceeded). Sistem saat ini aman beroperasi melalui cache lokal/offline.',
        });
        toast.warning('Kuota Tercapai', 'Batas kuota gratis harian Firestore telah terlampaui.');
      } else {
        setTestResult({
          status: 'error',
          message: `Gagal menguji koneksi: ${errMsg}`,
        });
        toast.error('Gagal Menguji', errMsg);
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Sorted collections by reads
  const collectionList = Object.entries(stats.readsByCollection)
    .sort(([, a], [, b]) => b - a);

  const collectionLabels: Record<string, { label: string; icon: string; color: string }> = {
    siswa: { label: 'Data Pokok Siswa', icon: '👥', color: 'bg-blue-500' },
    presensi: { label: 'Presensi Apel & KBM', icon: '🕒', color: 'bg-emerald-500' },
    jurnal_mengajar: { label: 'Jurnal Mengajar KBM', icon: '📖', color: 'bg-indigo-500' },
    nilai_siswa: { label: 'Nilai & Leger Rapor', icon: '🎯', color: 'bg-purple-500' },
    guru_users: { label: 'Akun & Penugasan Guru', icon: '👨‍🏫', color: 'bg-amber-500' },
    tugas_siswa: { label: 'Tugas & PR Siswa', icon: '📝', color: 'bg-teal-500' },
    permohonan_izin: { label: 'Permohonan Izin Siswa', icon: '📄', color: 'bg-rose-500' },
    presensi_guru: { label: 'Absensi Guru & Tendik', icon: '🏢', color: 'bg-cyan-500' },
    permohonan_izin_guru: { label: 'Izin Dinas Guru', icon: '📑', color: 'bg-orange-500' },
    jadwal_pelajaran: { label: 'Jadwal Pembelajaran', icon: '📅', color: 'bg-lime-500' },
    agenda_sekolah: { label: 'Agenda Kegiatan Sekolah', icon: '📌', color: 'bg-pink-500' },
    pengaturan: { label: 'Pengaturan & Profil', icon: '⚙️', color: 'bg-slate-500' },
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold">
              <CloudLightning className="w-3.5 h-3.5 text-blue-300" />
              <span>Google Cloud Firestore Spark Plan • Free Tier 50.000 Reads/Hari</span>
            </div>
            
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Database className="w-7 h-7 text-blue-400" />
              <span>Monitor Kuota Database Firestore</span>
            </h2>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Pantau sisa jatah pembacaan data harian Google Cloud Firestore secara real-time. Dashboard ini membantu Administrator mengawasi volume akses, mencegah limit terlampaui, dan mengoptimalkan mode hemat kuota sekolah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
              <span>{isTestingConnection ? 'Menguji...' : 'Uji Koneksi Langsung'}</span>
            </button>

            {onRefreshAllData && (
              <button
                type="button"
                onClick={onRefreshAllData}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sinkron Ulang</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-indigo-800/60 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className={`w-3 h-3 rounded-full shrink-0 ${
              healthStatus === 'kritis' 
                ? 'bg-rose-500 animate-ping' 
                : healthStatus === 'waspada' 
                ? 'bg-amber-400 animate-pulse' 
                : 'bg-emerald-400'
            }`} />
            <div>
              <div className="text-[11px] text-slate-300 font-medium">Status Kesehatan Kuota</div>
              <div className="font-extrabold text-sm capitalize flex items-center gap-1.5">
                {healthStatus === 'kritis' ? (
                  <span className="text-rose-400">Kritis / Kuota Terlampaui</span>
                ) : healthStatus === 'waspada' ? (
                  <span className="text-amber-300">Waspada (Mendekati Limit)</span>
                ) : (
                  <span className="text-emerald-300">Aman &amp; Normal</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <Clock className="w-4 h-4 text-blue-300 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-300 font-medium">Reset Kuota Google Cloud</div>
              <div className="font-extrabold text-sm text-white">
                ~{resetTime.formatted} <span className="text-[10px] text-blue-300 font-normal">(15:00 WIB)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <Zap className={`w-4 h-4 shrink-0 ${stats.quotaSaverMode ? 'text-emerald-400' : 'text-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-slate-300 font-medium">Mode Hemat Kuota</div>
              <div className="font-extrabold text-sm text-white flex items-center justify-between">
                <span>{stats.quotaSaverMode ? 'Aktif (Maksimal Hemat)' : 'Standar'}</span>
                <button
                  type="button"
                  onClick={handleToggleSaverMode}
                  className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-bold cursor-pointer transition"
                >
                  {stats.quotaSaverMode ? 'Matikan' : 'Aktifkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Connection Result Alert */}
      {testResult && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
          testResult.status === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
            : testResult.status === 'quota_exceeded' 
            ? 'bg-amber-50 border-amber-200 text-amber-950' 
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          {testResult.status === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : testResult.status === 'quota_exceeded' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <div className="font-black text-sm">
              {testResult.status === 'success' 
                ? 'Hasil Uji: Kuota & Koneksi Cloud Normal' 
                : testResult.status === 'quota_exceeded' 
                ? 'Hasil Uji: Kuota Gratis Harian Tercapai (Fallback Cache Aktif)' 
                : 'Hasil Uji: Terjadi Kendala Koneksi'}
            </div>
            <p className="font-medium text-slate-700">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* 3 Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: READS (PEMBACAAN DOKUMEN) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Pembacaan Dokumen (Reads)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Batas gratis: 50.000 / hari</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
              readPercent >= 90 
                ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                : readPercent >= 65 
                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {readPercent}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.readsToday.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-bold text-slate-400">
                / {stats.readLimit.toLocaleString('id-ID')}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  readPercent >= 90 ? 'bg-rose-500' : readPercent >= 65 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${readPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Sisa Jatah Pembacaan:</span>
            <span className={`font-black ${remainingReads <= 5000 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {remainingReads.toLocaleString('id-ID')} Dokumen
            </span>
          </div>
        </div>

        {/* Card 2: WRITES (PENULISAN DOKUMEN) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Penulisan Data (Writes)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Batas gratis: 20.000 / hari</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              {writePercent}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.writesToday.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-bold text-slate-400">
                / {stats.writeLimit.toLocaleString('id-ID')}
              </div>
            </div>
            
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${writePercent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Sisa Jatah Penulisan:</span>
            <span className="font-black text-emerald-700">
              {remainingWrites.toLocaleString('id-ID')} Operasi
            </span>
          </div>
        </div>

        {/* Card 3: DELETES (PENGHAPUSAN DOKUMEN) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Penghapusan (Deletes)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Batas gratis: 20.000 / hari</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
              {deletePercent}%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.deletesToday.toLocaleString('id-ID')}
              </div>
              <div className="text-xs font-bold text-slate-400">
                / {stats.deleteLimit.toLocaleString('id-ID')}
              </div>
            </div>
            
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${deletePercent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Sisa Jatah Penghapusan:</span>
            <span className="font-black text-slate-700">
              {remainingDeletes.toLocaleString('id-ID')} Operasi
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown per Koleksi & Solusi / Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Breakdown per Koleksi */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Rincian Pembacaan Data per Koleksi Database
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Total {stats.readsToday.toLocaleString('id-ID')} Dokumen
            </span>
          </div>

          <div className="space-y-3.5">
            {collectionList.map(([key, count]) => {
              const meta = collectionLabels[key] || {
                label: `Koleksi ${key}`,
                icon: '📁',
                color: 'bg-slate-500',
              };
              const pct = stats.readsToday > 0 ? Math.round((count / stats.readsToday) * 100) : 0;

              return (
                <div key={key} className="space-y-1.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="font-bold text-slate-800">{meta.label}</span>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {key}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">
                        {count.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 w-10 text-right">
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${meta.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetCounter}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Metrik Penghitung Hari Ini</span>
            </button>
            <span className="text-[10px] text-slate-400 font-medium">
              Data terhitung sejak pukul 00:00 WIB
            </span>
          </div>
        </div>

        {/* Right 1 Col: Panduan Kuota & Mode Hemat */}
        <div className="space-y-6">
          
          {/* Mode Hemat Box */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-3xl p-5 border border-emerald-200/80 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-950">Mode Hemat Kuota Otomatis</h4>
                <p className="text-[10px] text-emerald-700">Efisiensi cache lokal &amp; pengurangan polling</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Jika aktif, aplikasi akan memaksimalkan penyimpanan lokal dan BroadcastChannel memori untuk menghindari re-fetch Firestore berulang yang menghabiskan jatah pembacaan data.
            </p>

            <button
              type="button"
              onClick={handleToggleSaverMode}
              className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                stats.quotaSaverMode 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{stats.quotaSaverMode ? 'Mode Hemat Aktif (Klik untuk Matikan)' : 'Aktifkan Mode Hemat Sekarang'}</span>
            </button>
          </div>

          {/* Solusi & Penjelasan Google Cloud Spark Plan */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Tindakan Jika Kuota Terlampaui</span>
            </div>

            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Aplikasi Tetap Berfungsi:</strong> Sistem otomatis beralih ke cache lokal/offline sehingga absensi dan data sekolah tidak akan terhenti.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Reset Gratis Tiap 24 Jam:</strong> Kuota 50.000 data diperbarui otomatis setiap pukul 14:00 - 15:00 WIB oleh Google Cloud tanpa biaya.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Biaya Overage Sangat Murah:</strong> Jika sekolah mengaktifkan Blaze Plan, 50.000 pembacaan pertama tetap 100% gratis per hari, dan pembacaan tambahan hanya ~$0.06 (Rp 900) per 100.000 dokumen.
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="font-bold">Database ID:</span> <span className="font-mono text-[10px]">{db?.app.options.projectId || 'glossy-structure-vsmzh'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-black text-slate-900 text-sm">
              Log Riwayat Transaksi Firestore Hari Ini
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Merekam 50 aktivitas terakhir
          </span>
        </div>

        {stats.historyLog.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada log operasi transaksi hari ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Koleksi</th>
                  <th className="py-2.5 px-3 text-center">Jumlah</th>
                  <th className="py-2.5 px-3">Deskripsi Operasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.historyLog.slice(0, 20).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {new Date(item.timestamp).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase ${
                        item.type === 'EXCEEDED' 
                          ? 'bg-rose-600 text-white font-extrabold animate-pulse' 
                          : item.type === 'WARNING' 
                          ? 'bg-amber-100 text-amber-800' 
                          : item.type === 'WRITE' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : item.type === 'DELETE' 
                          ? 'bg-rose-100 text-rose-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {item.collection || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-black text-center text-slate-900">
                      {item.count > 0 ? `+${item.count}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
