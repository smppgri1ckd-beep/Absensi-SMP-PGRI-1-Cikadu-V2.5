import React from 'react';
import { 
  Menu,
  Volume2, 
  VolumeX, 
  CloudCheck, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap,
  LogIn,
  ChevronDown,
  LogOut,
  KeyRound,
  Sparkles,
  Users,
  Settings,
  FileText,
  Award,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AttendanceSession, SchoolConfig, Student, AttendanceRecord } from '../types';
import { soundService } from '../utils/audio';
import { GlobalStudentSearch } from './GlobalStudentSearch';
import { SchoolLogo } from '../assets/schoolLogo';

interface NavbarProps {
  activeTab: string;
  currentSession: AttendanceSession;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  onToggleSidebar: () => void;
  schoolConfig: SchoolConfig;
  students: Student[];
  records?: AttendanceRecord[];
  setActiveTab?: (tab: string) => void;
  onSelectStudent?: (student: Student) => void;
  pendingLeaveCount?: number;
  onOpenLeaveApproval?: () => void;
  onOpenLeaveRequest?: () => void;
  onOpenGradeManagement?: () => void;
  onOpenWhatsApp?: () => void;
  onOpenAgenda?: () => void;
  onOpenAiAnalysis?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  currentSession,
  onOpenSettings,
  onOpenLogin,
  onToggleSidebar,
  schoolConfig,
  students = [],
  records = [],
  setActiveTab,
  onSelectStudent,
  pendingLeaveCount = 0,
  onOpenLeaveApproval,
  onOpenLeaveRequest,
  onOpenGradeManagement,
  onOpenWhatsApp,
  onOpenAgenda,
  onOpenAiAnalysis,
}) => {
  const { user, logout, actingAsPiket, setActingAsPiket, effectiveRole } = useAuth();
  const [isMuted, setIsMuted] = React.useState(soundService.isSoundMuted());
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const handleToggleSound = () => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'kiosk':
        return 'Pindai Kartu Presensi Siswa';
      case 'apel-attendance':
        return 'Absensi Apel Petugas (Pagi & Siang)';
      case 'dashboard':
        return user ? 'Monitoring Presensi Apel' : 'Papan Informasi Presensi Real-Time';
      case 'students':
        return 'Data Pokok Siswa (Dapodik)';
      case 'teachers':
        return 'Data & Penugasan Akun Guru';
      case 'guru-piket':
        return 'Jadwal & Penugasan Guru Piket';
      case 'journal':
        return 'Absensi & Jurnal Pembelajaran (KBM Guru)';
      case 'cards':
        return 'Pencetakan Kartu Digital Siswa';
      case 'reports':
        return 'Pusat Rekap Laporan Presensi';
      case 'reports-apel':
        return 'Rekap Laporan Absensi Apel (Pagi & Siang)';
      case 'reports-kbm':
        return 'Rekap Laporan Absensi Pembelajaran (KBM)';
      case 'heb-calendar':
        return 'Kalender Hari Efektif Belajar (HEB)';
      case 'public-info':
        return 'Jadwal & Profil Satuan Pendidikan';
      case 'pantau-anak':
        return 'Pantau Anak (Portal Orang Tua / Wali)';
      default:
        return 'E-Presensi Digital';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Sidebar Toggle & Screen Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            {/* Hamburger Button for Mobile & Desktop Sidebar Toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 lg:hidden cursor-pointer shrink-0"
              title="Buka Menu Navigasi Samping"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <SchoolLogo src={schoolConfig?.logoUrl} className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-xs" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight truncate max-w-[130px] xs:max-w-[170px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-none">
                    {getPageTitle()}
                  </span>
                  <span className={`hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    user 
                      ? (user.role === 'admin' ? 'bg-blue-100 text-blue-900' : user.role === 'guru' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900')
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {user ? (user.role === 'admin' ? 'Admin' : user.role === 'guru' ? 'Guru' : 'Piket') : 'Publik'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400 hidden 2xl:block truncate">
                  {schoolConfig.namaSekolah} • Sistem Presensi QR
                </p>
              </div>
            </div>
          </div>

          {/* Center: Global Student Search Bar */}
          <div className="flex-1 min-w-0 max-w-xs sm:max-w-sm lg:max-w-md mx-1 sm:mx-3 flex justify-center relative">
            <GlobalStudentSearch
              students={students}
              records={records}
              setActiveTab={setActiveTab}
              onSelectStudent={onSelectStudent}
            />
          </div>

          {/* Right Action Tools & User Profile / Login */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Session Indicator Pill */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
              currentSession === 'Pagi'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${
                currentSession === 'Pagi' ? 'bg-amber-500' : 'bg-indigo-600'
              }`} />
              <span>Sesi {currentSession}</span>
            </div>

            {/* Audio Feedback Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? 'Suara Dinonaktifkan (Klik untuk aktifkan)' : 'Suara Aktif (Klik untuk bisukan)'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isMuted
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Cloud Sync State */}
            <div 
              title="Sinkronisasi Data Otomatis & Terenkripsi"
              className="hidden md:flex p-2 rounded-xl bg-slate-50 text-emerald-600 border border-slate-200 items-center justify-center shrink-0"
            >
              <CloudCheck className="w-4 h-4" />
            </div>

            {/* Quick Button: Izin / Sakit Mandiri */}
            <button
              onClick={() => {
                if (user && (user.role === 'admin' || user.role === 'piket' || user.role === 'guru')) {
                  onOpenLeaveApproval?.();
                } else {
                  onOpenLeaveRequest?.();
                }
              }}
              title={user && (user.role === 'admin' || user.role === 'piket') ? 'Verifikasi Permohonan Izin / Sakit' : 'Ajukan Surat Izin / Sakit Mandiri Siswa'}
              className={`relative px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs ${
                !user
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs ring-2 ring-amber-300/60'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <FileText className={`w-4 h-4 ${!user ? 'text-white' : 'text-amber-600'}`} />
              <span className="hidden sm:inline text-xs font-black whitespace-nowrap">
                {user && (user.role === 'admin' || user.role === 'piket') ? 'Verifikasi Izin' : 'Ajukan Izin/Sakit'}
              </span>
              <span className="sm:hidden text-xs font-black">
                Izin
              </span>
              {pendingLeaveCount > 0 && (
                <span className="w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {pendingLeaveCount}
                </span>
              )}
            </button>

            {/* Quick Button: Input Nilai (Guru & Admin) */}
            {user && (user.role === 'guru' || user.role === 'admin') && !actingAsPiket && (
              <button
                onClick={onOpenGradeManagement}
                title="Input & Kelola Nilai Siswa"
                className="hidden lg:flex p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer shrink-0 items-center gap-1.5"
              >
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold">Kelola Nilai</span>
              </button>
            )}

            {/* Quick Teacher Role/Workspace Switcher Button (Guru Mapel <-> Petugas Piket) */}
            {user && user.role === 'guru' && (
              actingAsPiket ? (
                <button
                  onClick={() => {
                    setActingAsPiket(false);
                    setActiveTab?.('journal');
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer ring-2 ring-emerald-400/50"
                  title="Kembali ke Ruang Kerja Guru Mapel & Wali Kelas"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Kembali ke Guru</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActingAsPiket(true);
                    setActiveTab?.('apel-attendance');
                  }}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs shadow-xs transition-all cursor-pointer"
                  title="Beralih ke Ruang Kerja Petugas Piket"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bertindak Piket</span>
                </button>
              )
            )}

            {/* Quick Settings & Logo Button (Khusus Administrator) */}
            {user && user.role === 'admin' && (
              <button
                onClick={onOpenSettings}
                title="Pengaturan Sekolah & Jam Presensi"
                className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer shrink-0"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* User Profile & Role Session Switcher */}
            {user ? (
              <div className="relative shrink-0">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group text-left focus:outline-hidden"
                  title="Klik untuk opsi akun pengguna"
                >
                  <div className={`w-9 h-9 rounded-xl font-black text-white flex items-center justify-center text-xs shadow-xs ring-2 transition-all shrink-0 ${
                    user.role === 'admin'
                      ? 'bg-blue-700 ring-blue-100 group-hover:ring-blue-300'
                      : user.role === 'guru' && actingAsPiket
                      ? 'bg-emerald-600 ring-emerald-200 group-hover:ring-emerald-300'
                      : user.role === 'guru'
                      ? 'bg-indigo-600 ring-indigo-100 group-hover:ring-indigo-300'
                      : user.role === 'ortu'
                      ? 'bg-amber-600 ring-amber-100 group-hover:ring-amber-300'
                      : 'bg-emerald-600 ring-emerald-100 group-hover:ring-emerald-300'
                  }`}>
                    {user.role === 'admin' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : user.role === 'guru' && actingAsPiket ? (
                      <UserCheck className="w-4 h-4" />
                    ) : user.role === 'guru' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : user.role === 'ortu' ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </div>

                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-slate-800 group-hover:text-blue-600 truncate max-w-[110px] transition-colors">
                        {user.nama.split(' ')[0]}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
                      {user.role === 'admin' 
                        ? 'Administrator' 
                        : user.role === 'guru' && actingAsPiket
                        ? 'Petugas Piket'
                        : user.role === 'guru' 
                        ? (user.mapel || 'Guru') 
                        : user.role === 'ortu'
                        ? 'Orang Tua'
                        : 'Petugas Piket'}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 p-4 text-slate-900 animate-in fade-in zoom-in-95">
                      
                      {/* User Header Profile */}
                      <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm ${
                          user.role === 'admin' 
                            ? 'bg-blue-700' 
                            : user.role === 'guru' && actingAsPiket
                            ? 'bg-emerald-600'
                            : user.role === 'guru' 
                            ? 'bg-indigo-600' 
                            : user.role === 'ortu'
                            ? 'bg-amber-600'
                            : 'bg-emerald-600'
                        }`}>
                          {user.role === 'admin' ? (
                            <ShieldCheck className="w-5 h-5" />
                          ) : user.role === 'guru' && actingAsPiket ? (
                            <UserCheck className="w-5 h-5" />
                          ) : user.role === 'guru' ? (
                            <GraduationCap className="w-5 h-5" />
                          ) : user.role === 'ortu' ? (
                            <Users className="w-5 h-5" />
                          ) : (
                            <UserCheck className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            {user.role === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                                Administrator
                              </span>
                            )}
                            {user.role === 'ortu' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                                Orang Tua / Wali
                              </span>
                            )}
                            {user.role === 'piket' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                                Petugas Piket
                              </span>
                            )}
                            {user.role === 'guru' && (
                              <>
                                {(user.isGuruMapel ?? (!!user.mapel || (user.penugasanMapel && user.penugasanMapel.length > 0))) && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                                    Guru Mapel
                                  </span>
                                )}
                                {(user.isWaliKelas ?? !!user.waliKelas) && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                                    Wali {user.waliKelas || 'Kelas'}
                                  </span>
                                )}
                                {(user.isGuruPiket ?? (user.piketDays && user.piketDays.length > 0)) && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                                    Piket {user.piketDays?.join(', ') || ''}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {user.nama}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      {/* Account Actions & Teacher Piket Switcher */}
                      <div className="py-2.5 border-b border-slate-100 space-y-1.5">
                        {/* Teacher Piket Mode Toggle Button */}
                        {user.role === 'guru' && (
                          actingAsPiket ? (
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setActingAsPiket(false);
                                setActiveTab?.('journal');
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Kembali ke Menu Guru</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setActingAsPiket(true);
                                setActiveTab?.('apel-attendance');
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Bertindak Sebagai Petugas Piket</span>
                            </button>
                          )
                        )}

                        {setActiveTab && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setActiveTab('pantau-anak');
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-200"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Buka Portal Pantau Anak</span>
                          </button>
                        )}

                        {/* Agenda Kegiatan Sekolah */}
                        {onOpenAgenda && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAgenda();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                          >
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Agenda Kegiatan Sekolah</span>
                          </button>
                        )}

                        {/* Notifikasi WhatsApp */}
                        {onOpenWhatsApp && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenWhatsApp();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-emerald-200"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kirim Notifikasi WhatsApp</span>
                          </button>
                        )}

                        {/* Analisis AI Kehadiran */}
                        {onOpenAiAnalysis && (user?.role === 'admin' || user?.role === 'piket' || user?.role === 'guru') && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAiAnalysis();
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Analisis Kehadiran AI (Gemini)</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenLogin();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Ganti Akun (Login Sandi)</span>
                        </button>
                      </div>

                      {/* Menu Navigation & Actions */}
                      <div className="pt-2 text-xs">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Keluar dari Sesi Ini</span>
                        </button>
                      </div>

                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Pegawai / Guru</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
