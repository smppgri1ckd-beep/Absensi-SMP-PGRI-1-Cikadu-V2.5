import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Settings, 
  Clock, 
  Building2, 
  UserCheck, 
  RotateCcw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Image as ImageIcon,
  Cloud,
  Database,
  RefreshCw,
  Award,
  Sparkles
} from 'lucide-react';
import { SchoolConfig } from '../types';
import { DatabaseService, DEFAULT_SCHOOL_CONFIG } from '../services/db';
import { SchoolLogo } from '../assets/schoolLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STANDARD_MAPEL_LIST = [
  'Pendidikan Agama Islam (PAI)',
  'Pendidikan Pancasila & PKN',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani & Olahraga (PJOK)',
  'Informatika',
  'Prakarya & Kewirausahaan',
  'Bahasa Sunda (Mulok)',
  'Bahasa Arab (Mulok)',
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolConfig;
  onSaveConfig: (newConfig: SchoolConfig) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getSafeConfig = (cfg: SchoolConfig): SchoolConfig => ({
    ...DEFAULT_SCHOOL_CONFIG,
    ...cfg,
    jadwal: {
      ...DEFAULT_SCHOOL_CONFIG.jadwal,
      ...(cfg?.jadwal || {}),
    },
  });

  const [formData, setFormData] = useState<SchoolConfig>(() => getSafeConfig(config));
  const [saveBanner, setSaveBanner] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    connected: boolean;
    message: string;
    latencyMs?: number;
    details?: { lastSync: string; totalRecords: number; databaseId: string };
  } | null>(null);

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await DatabaseService.testDatabaseConnection();
      setDbTestResult(res);
    } catch (e: any) {
      setDbTestResult({
        connected: false,
        message: `Gagal memverifikasi database: ${e?.message || 'Koneksi error'}`
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  // Sync state if config prop updates or modal opens
  React.useEffect(() => {
    if (isOpen && config) {
      setFormData(getSafeConfig(config));
    }
  }, [isOpen, config]);

  // Strictly restrict modal access to admin only
  if (!isOpen || !user || user.role !== 'admin') return null;

  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    setCloudSyncMessage(null);
    try {
      const res = await DatabaseService.syncAllWithCloud();
      setCloudSyncMessage({
        text: res.message,
        isError: !res.success,
      });
    } catch (err: any) {
      setCloudSyncMessage({
        text: `Gagal: ${err?.message || 'Koneksi terganggu'}`,
        isError: true,
      });
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleExportFullSystemBackup = async () => {
    try {
      const jsonStr = await DatabaseService.exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cadangan_Sistem_Lengkap_SMP_PGRI_1_Cikadu_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Cadangan Berhasil Diunduh', 'File cadangan lengkap (.json) berhasil disimpan.');
    } catch (e) {
      toast.error('Gagal Mengunduh Cadangan', 'Terjadi kesalahan saat mengekspor database.');
    }
  };

  const handleImportFullSystemBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('PERINGATAN: Memulihkan cadangan akan menimpa/memperbarui data lokal Anda dengan file cadangan ini. Lanjutkan?')) {
      return;
    }

    toast.upload('Memproses Berkas Cadangan', 'Membaca dan memvalidasi file JSON cadangan...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const success = await DatabaseService.importAllData(content);
      if (success) {
        toast.success('Data Berhasil Dipulihkan!', 'Halaman akan disegarkan untuk memuat seluruh data baru.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Gagal Memulihkan Cadangan', 'Format file JSON tidak sesuai dengan skema sistem.');
      }
    };
    reader.readAsText(file);
  };

  const handleChange = (field: keyof SchoolConfig, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleJadwalChange = (field: keyof SchoolConfig['jadwal'], value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      jadwal: {
        ...(prev.jadwal || DEFAULT_SCHOOL_CONFIG.jadwal),
        [field]: value,
      },
    }));
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, SVG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      if (file.type.includes('svg') || file.size < 400 * 1024) {
        handleChange('logoUrl', dataUrl);
        toast.upload('Logo Sekolah Berhasil Diunggah', 'Logo baru telah diterapkan dan siap disimpan.');
        return;
      }

      // If large PNG/JPG, compress down to 280x280 max for snappy saving
      const img = new Image();
      img.onload = () => {
        const maxDim = 280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92);
          handleChange('logoUrl', compressedDataUrl);
        } else {
          handleChange('logoUrl', dataUrl);
        }
        toast.upload('Logo Sekolah Berhasil Diunggah', 'Logo baru telah dikompresi dan siap disimpan.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    handleChange('logoUrl', '');
    toast.info('Logo Sekolah Direset', 'Logo sekolah dikembalikan ke logo bawaan.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig(formData);
    setSaveBanner(true);
    setTimeout(() => {
      setSaveBanner(false);
      onClose();
    }, 1200);
  };

  const handleResetDefault = () => {
    if (window.confirm('Kembalikan ke pengaturan bawaan SMP PGRI 1 CIKADU?')) {
      setFormData(DEFAULT_SCHOOL_CONFIG);
    }
  };

  // Export full JSON backup
  const handleExportBackup = () => {
    const backup = {
      config: formData,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Pengaturan_Presensi_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <SchoolLogo className="w-11 h-11 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Pengaturan Sekolah & Jam Presensi
              </h3>
              <p className="text-xs text-slate-500">
                {formData.namaSekolah} • Kustomisasi identitas lembaga dan batas waktu keterlambatan absensi otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveBanner && (
          <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pengaturan berhasil disimpan ke Cloud Database & Penyimpanan Lokal!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          
          {/* Section: Upload & Kustomisasi Logo Sekolah */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200/80 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Upload Logo Resmi Sekolah</span>
              </h4>
              {formData.logoUrl ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white shadow-2xs">
                  Logo Kustom Terpasang
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Logo Standar SMP PGRI 1
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo Preview */}
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-blue-300 p-1 flex items-center justify-center shrink-0 shadow-sm relative group overflow-hidden">
                <SchoolLogo src={formData.logoUrl} className="w-16 h-16 object-contain" />
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {/* File Upload Button */}
                  <label className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Logo (PNG / JPG / SVG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Reset to Default Button */}
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      title="Kembalikan ke lambang bawaan SMP PGRI 1 CIKADU"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Pakai Logo Standar</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pilih file gambar logo dari HP atau laptop Anda. Logo ini otomatis tampil di <strong>seluruh fitur aplikasi, ID Card siswa, dan KOP dokumen PDF</strong>.
                </p>

                {/* Direct URL input */}
                <div>
                  <input
                    type="text"
                    placeholder="Atau tempelkan tautan URL gambar (https://...)..."
                    value={formData.logoUrl || ''}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Identitas Sekolah */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>Profil Lembaga & Surat Resmi</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nama Resmi Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={formData.namaSekolah}
                  onChange={(e) => handleChange('namaSekolah', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  NPSN
                </label>
                <input
                  type="text"
                  required
                  value={formData.npsn}
                  onChange={(e) => handleChange('npsn', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Alamat Lengkap
              </label>
              <input
                type="text"
                required
                value={formData.alamat}
                onChange={(e) => handleChange('alamat', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  required
                  value={formData.kota}
                  onChange={(e) => handleChange('kota', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Kontak / Telepon / Email
                </label>
                <input
                  type="text"
                  value={formData.kontak}
                  onChange={(e) => handleChange('kontak', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Pejabat Penandatangan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 block">Kepala Sekolah:</span>
                <input
                  type="text"
                  value={formData.namaKepsek}
                  onChange={(e) => handleChange('namaKepsek', e.target.value)}
                  placeholder="Nama Kepala Sekolah..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
                <input
                  type="text"
                  value={formData.nipKepsek}
                  onChange={(e) => handleChange('nipKepsek', e.target.value)}
                  placeholder="NUPTK Kepala Sekolah..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-700 block">Petugas Guru Piket:</span>
                <input
                  type="text"
                  value={formData.namaPetugasPiket}
                  onChange={(e) => handleChange('namaPetugasPiket', e.target.value)}
                  placeholder="Nama Petugas Guru Piket..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                />
                <input
                  type="text"
                  value={formData.nipPetugasPiket || ''}
                  onChange={(e) => handleChange('nipPetugasPiket', e.target.value)}
                  placeholder="NUPTK Petugas Piket..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Pengaturan Standar KKM (Kriteria Ketuntasan Minimal) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-200/80 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Kriteria Ketuntasan Minimal (KKM) Sekolah</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  const def = formData.kkmDefault || 75;
                  const next: Record<string, number> = {};
                  STANDARD_MAPEL_LIST.forEach((m) => {
                    next[m] = def;
                  });
                  setFormData((prev) => ({
                    ...prev,
                    kkmPerMapel: next,
                  }));
                  toast.info('KKM Diterapkan', `KKM standar (${def}) disalin ke seluruh mata pelajaran.`);
                }}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 transition-colors cursor-pointer shadow-2xs"
              >
                ⚡ Terapkan KKM Standar ke Semua Mapel
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Atur nilai ambang batas KKM standar sekolah serta nilai KKM spesifik untuk masing-masing mata pelajaran. Nilai ini otomatis menjadi acuan ketuntasan nilai di daftar nilai guru dan rapor digital.
            </p>

            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-200">
              <label className="text-xs font-bold text-slate-700">KKM Standar Sekolah:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.kkmDefault ?? 75}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setFormData((prev) => ({ ...prev, kkmDefault: val }));
                }}
                className="w-20 text-center font-mono font-black text-sm bg-purple-50 border border-purple-300 text-purple-950 rounded-lg px-2 py-1"
              />
              <span className="text-[11px] text-slate-400 font-medium">(Rentang 0 - 100, standar umum: 75)</span>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-extrabold text-slate-700 block">Daftar KKM Spesifik Per Mata Pelajaran:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 border border-purple-100 rounded-xl p-2 bg-white/70">
                {STANDARD_MAPEL_LIST.map((m) => {
                  const currentKkm = formData.kkmPerMapel?.[m] ?? formData.kkmDefault ?? 75;
                  return (
                    <div key={m} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]" title={m}>
                        {m}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentKkm}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setFormData((prev) => ({
                              ...prev,
                              kkmPerMapel: {
                                ...(prev.kkmPerMapel || {}),
                                [m]: val,
                              },
                            }));
                          }}
                          className="w-14 text-center font-mono font-black text-xs bg-white border border-purple-300 rounded-md py-0.5"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Jam Sesi Presensi & Otomasi */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Jadwal Waktu Sesi & Ambang Keterlambatan</span>
            </h4>

            {/* Sesi Pagi */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
              <span className="text-xs font-extrabold text-amber-900 block">Sesi Pagi (Masuk / Apel)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-amber-800 block mb-0.5">Jam Mulai</label>
                  <input
                    type="time"
                    value={formData.jadwal?.pagiMulai || '06:30'}
                    onChange={(e) => handleJadwalChange('pagiMulai', e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-800 block mb-0.5">Batas Tepat Waktu</label>
                  <input
                    type="time"
                    value={formData.jadwal?.pagiBatasTepatWaktu || '07:15'}
                    onChange={(e) => handleJadwalChange('pagiBatasTepatWaktu', e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-800 block mb-0.5">Batas Akhir</label>
                  <input
                    type="time"
                    value={formData.jadwal?.pagiBatasAkhir || '11:30'}
                    onChange={(e) => handleJadwalChange('pagiBatasAkhir', e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Sesi Siang */}
            <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-2">
              <span className="text-xs font-extrabold text-indigo-900 block">Sesi Siang (Pulang / KBM 2)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 block mb-0.5">Jam Mulai</label>
                  <input
                    type="time"
                    value={formData.jadwal?.siangMulai || '12:00'}
                    onChange={(e) => handleJadwalChange('siangMulai', e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 block mb-0.5">Batas Tepat Waktu</label>
                  <input
                    type="time"
                    value={formData.jadwal?.siangBatasTepatWaktu || '13:30'}
                    onChange={(e) => handleJadwalChange('siangBatasTepatWaktu', e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-indigo-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-800 block mb-0.5">Batas Akhir</label>
                  <input
                    type="time"
                    value={formData.jadwal?.siangBatasAkhir || '15:30'}
                    onChange={(e) => handleJadwalChange('siangBatasAkhir', e.target.value)}
                    className="w-full bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Toleransi Keterlambatan & Sesi Khusus Jumat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Toleransi Menit */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-900 block">Toleransi Keterlambatan</span>
                  <span className="text-[10px] font-bold bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                    {formData.jadwal?.toleransiMenit || 10} Menit
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Siswa yang scan setelah batas tepat waktu namun masih dalam rentang menit ini tetap dihitung berstatus toleransi.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.jadwal?.toleransiMenit ?? 10}
                    onChange={(e) => handleJadwalChange('toleransiMenit', parseInt(e.target.value) || 0)}
                    className="w-24 bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-center"
                  />
                  <span className="text-xs font-bold text-slate-600">Menit toleransi</span>
                </div>
              </div>

              {/* Sesi Khusus Hari Jumat */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 block">Sesi Khusus Hari Jumat</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.jadwal?.jumatSesiKhusus ?? true}
                      onChange={(e) => handleJadwalChange('jumatSesiKhusus', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Penyesuaian jam kepulangan lebih awal untuk ibadah Sholat Jumat.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">Batas Scan Jumat</label>
                    <input
                      type="time"
                      value={formData.jadwal?.jumatPagiBatasAkhir || '11:00'}
                      onChange={(e) => handleJadwalChange('jumatPagiBatasAkhir', e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">Sesi Siang Jumat</label>
                    <input
                      type="time"
                      value={formData.jadwal?.jumatSiangMulai || '13:00'}
                      onChange={(e) => handleJadwalChange('jumatSiangMulai', e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pilihan Tema Warna Aplikasi */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-extrabold text-slate-800 block">Tema Tampilan Aplikasi</span>
              <p className="text-[11px] text-slate-500">
                Pilih skema warna aksen yang digunakan pada seluruh navigasi dan dashboard sekolah:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'default', name: 'Biru PGRI', color: 'bg-blue-600', border: 'border-blue-400' },
                  { id: 'emerald', name: 'Hijau Zamrud', color: 'bg-emerald-600', border: 'border-emerald-400' },
                  { id: 'indigo', name: 'Indigo Modern', color: 'bg-indigo-600', border: 'border-indigo-400' },
                  { id: 'slate', name: 'Dark Slate', color: 'bg-slate-800', border: 'border-slate-500' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      DatabaseService.saveAppTheme(th.id as any);
                      document.documentElement.setAttribute('data-theme', th.id);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 transition-all flex items-center gap-2 cursor-pointer shadow-2xs text-left"
                  >
                    <span className={`w-4 h-4 rounded-full ${th.color} shrink-0`}></span>
                    <span className="text-xs font-bold text-slate-800">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Section: Cloud Sync & Cadangan Sistem Lengkap */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-900/50 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-sky-100">
                  Status Database Cloud & Cadangan Sistem
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Penyimpanan Otomatis Aktif
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Setiap data baru (presensi apel, jurnal KBM guru, permohonan izin/sakit siswa) otomatis tersimpan langsung ke Cloud Database Firebase dan dicadangkan secara lokal. Gunakan tombol di bawah untuk memeriksa konektivitas dan memastikan data masuk dengan aman.
            </p>

            {/* Live Database Check Result */}
            {dbTestResult && (
              <div className={`p-3 rounded-xl text-xs space-y-1.5 ${
                dbTestResult.connected 
                  ? 'bg-emerald-950/80 border border-emerald-600/60 text-emerald-200' 
                  : 'bg-rose-950/80 border border-rose-700/60 text-rose-200'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {dbTestResult.connected ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{dbTestResult.message}</span>
                </div>
                {dbTestResult.connected && dbTestResult.details && (
                  <div className="text-[11px] text-emerald-300/80 pl-6 space-y-0.5">
                    <div>Waktu Respons Server: <strong>{dbTestResult.latencyMs} ms</strong></div>
                    <div>Total Presensi Tersimpan: <strong>{dbTestResult.details.totalRecords} rekaman</strong></div>
                    <div>Waktu Verifikasi: <strong>{new Date(dbTestResult.details.lastSync).toLocaleTimeString('id-ID')} WIB</strong></div>
                  </div>
                )}
              </div>
            )}

            {cloudSyncMessage && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                cloudSyncMessage.isError 
                  ? 'bg-rose-950/80 border border-rose-700 text-rose-200' 
                  : 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
              }`}>
                {cloudSyncMessage.isError ? <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                <span>{cloudSyncMessage.text}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isTestingDb}
                onClick={handleTestDatabase}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <CheckCircle className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                <span>{isTestingDb ? 'Memeriksa Database...' : 'Uji Status Database Cloud'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncingCloud}
                onClick={handleSyncCloud}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Semua Data'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportFullSystemBackup}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-white/20"
              >
                <Download className="w-3.5 h-3.5 text-sky-300" />
                <span>Ekspor Semua Data (JSON)</span>
              </button>

              <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-white/20">
                <Upload className="w-3.5 h-3.5 text-amber-300" />
                <span>Pulihkan Cadangan</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportFullSystemBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Backup & Reset Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cadangkan Konfigurasi (JSON)</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
