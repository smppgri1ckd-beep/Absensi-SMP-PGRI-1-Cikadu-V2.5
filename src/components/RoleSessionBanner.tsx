import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Clock, 
  KeyRound, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  BookOpen,
  QrCode,
  Settings,
  Info,
  Calendar,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';

interface RoleSessionBannerProps {
  onOpenLoginModal: () => void;
  onOpenSettings?: () => void;
  setActiveTab?: (tab: string) => void;
}

export const RoleSessionBanner: React.FC<RoleSessionBannerProps> = ({
  onOpenLoginModal,
  onOpenSettings,
  setActiveTab,
}) => {
  const { 
    user, 
    logout, 
    activeDutyMode,
    setActiveDutyMode,
    canActAsGuruMapel,
    canActAsWaliKelas,
    canActAsPiket,
    canActAsKepsek,
    actingAsPiket,
    setActingAsPiket,
    isAssignedPiketToday,
    todayPiketAssignment,
    todayPiketRole,
    userPiketDays 
  } = useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!user) {
    return null;
  }

  const roleStyles = {
    admin: {
      bg: 'bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white border-blue-800',
      badgeBg: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
      icon: ShieldCheck,
      title: 'Administrator Sistem',
      desc: 'Akses penuh ke konfigurasi jam presensi, master data siswa, penugasan guru, dan cetak kartu.',
      accent: 'text-amber-300',
    },
    piket: {
      bg: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white border-emerald-800',
      badgeBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
      icon: UserCheck,
      title: user.role === 'guru' ? 'Petugas Guru Piket (Moda Operasional Apel)' : 'Petugas Piket Presensi',
      desc: 'Bertugas mengoperasikan scanner kiosk, monitoring kehadiran apel pagi/siang, dan penyesuaian izin/sakit siswa.',
      accent: 'text-emerald-300',
    },
    wali_kelas: {
      bg: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 text-white border-amber-800',
      badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      icon: BookOpen,
      title: `Wali Kelas ${user.waliKelas || ''} (Binaan Kelas)`,
      desc: `Fokus pembinaan data pokok siswa kelas ${user.waliKelas || ''}, rekap absensi, verifikasi izin, dan cetak rapor.`,
      accent: 'text-amber-300',
    },
    guru_mapel: {
      bg: 'bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 text-white border-indigo-800',
      badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
      icon: GraduationCap,
      title: 'Guru Mata Pelajaran (KBM)',
      desc: user.mapel 
        ? `Guru Pengajar Mapel: ${user.mapel}. Pengisian jurnal mengajar KBM, tugas PR, dan input nilai siswa.`
        : 'Pengisian Jurnal KBM harian dan pemantauan absensi peserta didik.',
      accent: 'text-sky-300',
    },
    guru: {
      bg: 'bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 text-white border-indigo-800',
      badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40',
      icon: GraduationCap,
      title: 'Guru Pengajar / Pendidik',
      desc: 'Pengisian Jurnal KBM harian dan pemantauan absensi peserta didik.',
      accent: 'text-sky-300',
    },
    kepsek: {
      bg: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 text-white border-amber-800',
      badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      icon: ShieldCheck,
      title: 'Kepala Sekolah (Supervisi Eksekutif)',
      desc: 'Supervisi dan persetujuan eksekutif KBM, presensi siswa/guru, permohonan izin/dinas luar, dan capaian laporan kinerja sekolah.',
      accent: 'text-amber-300',
    },
    ortu: {
      bg: 'bg-gradient-to-r from-amber-950 via-orange-950 to-slate-900 text-white border-amber-800',
      badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
      icon: ShieldCheck,
      title: 'Orang Tua / Wali Siswa',
      desc: 'Akses Portal Pantau Anak: melihat rekap kehadiran, tugas, nilai harian, dan perkembangan belajar anak.',
      accent: 'text-amber-300',
    },
  };

  const activeRoleKey = user.role === 'guru' ? activeDutyMode : user.role;
  const currentConfig = roleStyles[activeRoleKey as keyof typeof roleStyles] || roleStyles.guru;
  const RoleIcon = currentConfig.icon;

  return (
    <aside aria-label="Informasi Sesi Pengguna" className={`border-b shadow-xs relative transition-all ${currentConfig.bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left info: Active session avatar & identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <RoleIcon className="w-5 h-5 text-white" />
            </div>

            <div className="leading-tight">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight">
                  {user.nama}
                </span>
                
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentConfig.badgeBg}`}>
                  {currentConfig.title}
                </span>

                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sesi Terverifikasi
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-300 mt-0.5">
                <span>
                  Username: <strong className="text-white font-mono">{user.username}</strong>
                </span>
                {user.nip && (
                  <span>
                    NUPTK: <strong className="text-white font-mono">{user.nip}</strong>
                  </span>
                )}
                {user.loginAt && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Login pukul <strong className="text-white">{user.loginAt} WIB</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right action tools: Login Switcher & controls */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {user.role === 'ortu' && setActiveTab && (
              <button
                onClick={() => setActiveTab('pantau-anak')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Buka Pantau Anak"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Pantau Anak</span>
              </button>
            )}

            {user.role === 'admin' && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Atur Lembaga & Jam"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Pengaturan</span>
              </button>
            )}

            {/* Ganti Akun Button - Membuka Form Login Sandi */}
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all shadow-xs cursor-pointer"
              title="Ganti akun pengguna (masukkan username & password)"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Ganti Akun</span>
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-all cursor-pointer"
              title="Keluar Sesi Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Collapse/Expand Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title={isExpanded ? 'Sembunyikan rincian peran' : 'Tampilkan rincian hak akses'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Multi-Role Duty Switcher Bar for Teachers */}
        {user.role === 'guru' && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-200 font-extrabold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Ganti Moda Peran Tugas:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {canActAsGuruMapel && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDutyMode('guru_mapel');
                    setActiveTab?.('journal');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    activeDutyMode === 'guru_mapel'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                  }`}
                  title="Klik untuk berpindah ke Moda Guru Mata Pelajaran (KBM)"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-sky-300" />
                  <span>Guru Mapel {user.mapel ? `(${user.mapel})` : ''}</span>
                </button>
              )}

              {canActAsWaliKelas && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDutyMode('wali_kelas');
                    setActiveTab?.('students');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    activeDutyMode === 'wali_kelas'
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-md scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                  }`}
                  title={`Klik untuk berpindah ke Moda Wali Kelas ${user.waliKelas || ''}`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-950" />
                  <span>Wali Kelas {user.waliKelas}</span>
                </button>
              )}

              {canActAsPiket && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDutyMode('piket');
                    setActiveTab?.('apel-attendance');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    activeDutyMode === 'piket'
                      ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-md scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                  }`}
                  title="Klik untuk berpindah ke Moda Petugas Piket Presensi"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-950" />
                  <span>Petugas Piket {isAssignedPiketToday ? '★ (Tugas Hari Ini)' : ''}</span>
                </button>
              )}

              {canActAsKepsek && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDutyMode('kepsek');
                    setActiveTab?.('kepsek');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    activeDutyMode === 'kepsek'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-md scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                  }`}
                  title="Klik untuk berpindah ke Moda Supervisi Kepala Sekolah"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-200" />
                  <span>Supervisi Kepsek</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dedicated Teacher Piket Duty Callout */}
        {user.role === 'guru' && isAssignedPiketToday && (
          <div className="mt-2.5 pt-2 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-400/30">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                    Tugas Piket Hari Ini
                  </span>
                  <span className="text-xs font-black text-white">
                    {todayPiketRole || 'Petugas Piket'}
                  </span>
                  <span className="text-[11px] text-emerald-300 font-mono">
                    ({todayPiketAssignment?.jamMulai || '06:30'} - {todayPiketAssignment?.jamSelesai || '14:30'} WIB)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Anda terjadwal dalam operasional presensi gerbang, absensi apel kelas, dan verifikasi izin/sakit hari ini.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {!actingAsPiket ? (
                <button
                  type="button"
                  onClick={() => {
                    setActingAsPiket(true);
                    setActiveTab?.('apel-attendance');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Buka Operasional Piket</span>
                </button>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sedang Mengoperasikan Piket</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Regular Weekly Piket Info for other days */}
        {user.role === 'guru' && !isAssignedPiketToday && userPiketDays.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span>Jadwal Piket Mingguan Anda: <strong className="text-emerald-300 font-bold">{userPiketDays.join(', ')}</strong></span>
          </div>
        )}

        {/* Expandable Details Tray */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-white/15 text-xs grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-0.5">
                Hak Akses Anda
              </span>
              <p className="text-slate-200 text-[11px] leading-relaxed">
                {currentConfig.desc}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-0.5">
                Fitur Utama Terkait
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {user.role === 'admin' && (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 text-[10px] font-bold">Data Pokok Siswa</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 text-[10px] font-bold">Akun Guru</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 text-[10px] font-bold">Cetak Kartu F4/A4</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 text-[10px] font-bold">Pengaturan Jam</span>
                  </>
                )}
                {user.role === 'piket' && (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">Scan Presensi Kiosk</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">Validasi Hadir/Telat</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">Catat Izin/Sakit</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">Ekspor Harian</span>
                  </>
                )}
                {user.role === 'guru' && (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 text-[10px] font-bold">Jurnal KBM Harian</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 text-[10px] font-bold">Absensi Per Kelas</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 text-[10px] font-bold">Catatan Perkembangan</span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 text-[10px] font-bold">Ekspor Jurnal</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-0.5">
                Keamanan Sesi
              </span>
              <p className="text-[11px] text-slate-300 leading-tight mb-2">
                Setiap pergantian akun wajib diverifikasi dengan memasukkan username dan kata sandi yang valid.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLoginModal}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-center text-[11px] transition-colors cursor-pointer"
                >
                  Ganti Akun Lain
                </button>
                <button
                  onClick={logout}
                  className="py-1.5 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
};
