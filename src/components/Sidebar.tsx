import React from 'react';
import { 
  QrCode, 
  LayoutDashboard, 
  Printer, 
  BookOpen, 
  Users, 
  FileText, 
  FileSpreadsheet,
  Settings, 
  GraduationCap, 
  ShieldCheck, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Info, 
  X, 
  ChevronRight,
  Sparkles,
  KeyRound,
  CalendarDays,
  Award,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolConfig } from '../types';
import { SchoolLogo } from '../assets/schoolLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  schoolConfig: SchoolConfig;
  pendingLeaveCount?: number;
  onOpenLeaveApproval?: () => void;
  onOpenLeaveRequest?: () => void;
  onOpenGradeManagement?: () => void;
  onOpenWhatsApp?: () => void;
  onOpenAgenda?: () => void;
  onOpenAiAnalysis?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  tagColor?: string;
  isAction?: boolean;
}

interface MenuGroup {
  groupTitle: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  onOpenSettings,
  onOpenLogin,
  schoolConfig,
  pendingLeaveCount = 0,
  onOpenLeaveApproval,
  onOpenLeaveRequest,
  onOpenGradeManagement,
  onOpenWhatsApp,
  onOpenAgenda,
  onOpenAiAnalysis,
}) => {
  const { 
    user, 
    logout, 
    actingAsPiket, 
    setActingAsPiket, 
    effectiveRole,
    isAssignedPiketToday,
    todayPiketRole,
    todayPiketAssignment
  } = useAuth();

  // Functional Menu Grouping customized per role (Menu dipisah & dikelompokkan sesuai fungsi)
  const getMenuGroups = (): MenuGroup[] => {
    // 1. PUBLIC MODE (Tamu / Siswa / Orang Tua / Umum - Belum Login)
    if (!user) {
      return [
        {
          groupTitle: 'Portal Aktivitas Orang Tua & Siswa',
          items: [
            {
              id: 'pantau-anak',
              label: 'Pantau Perkembangan Anak',
              desc: 'Presensi harian, nilai mapel & tugas sekolah',
              icon: Sparkles,
              tag: 'Portal Utama',
              tagColor: 'bg-blue-100 text-blue-900 font-black',
            },
            {
              id: 'action-leave-request',
              label: 'Pengajuan Izin & Sakit Mandiri',
              desc: 'Kirim surat dokter & alasan izin tanpa login',
              icon: FileText,
              isAction: true,
              tag: 'Mandiri',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'dashboard',
              label: 'Papan Kehadiran Siswa Real-Time',
              desc: 'Rekapitulasi statistik kehadiran per kelas',
              icon: LayoutDashboard,
              tag: 'Live Rekap',
              tagColor: 'bg-emerald-100 text-emerald-800 font-bold',
            },
            {
              id: 'public-info',
              label: 'Informasi & Agenda Satuan Pendidikan',
              desc: 'Jadwal apel, tata tertib & profil sekolah',
              icon: Info,
              tag: 'Informasi',
              tagColor: 'bg-slate-100 text-slate-700 font-bold',
            },
          ],
        },
      ];
    }

    // 2. ORANG TUA / WALI SISWA (LOGIN MODE)
    if (effectiveRole === 'ortu') {
      return [
        {
          groupTitle: 'Portal Orang Tua / Wali',
          items: [
            {
              id: 'pantau-anak',
              label: 'Pantau Anak Saya',
              desc: 'Perkembangan, nilai, tugas & presensi',
              icon: Sparkles,
              tag: 'Utama',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'action-leave-request',
              label: 'Ajukan Izin / Sakit',
              desc: 'Kirim surat dokter anak mandiri',
              icon: FileText,
              isAction: true,
              tag: 'Mandiri',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'dashboard',
              label: 'Monitor Presensi Sekolah',
              desc: 'Statistik kehadiran harian sekolah',
              icon: LayoutDashboard,
            },
            {
              id: 'public-info',
              label: 'Jadwal & Info Sekolah',
              desc: 'Jam apel, kepulangan & profil',
              icon: Info,
            },
          ],
        },
      ];
    }

    // 3 & 4. GURU & PETUGAS PIKET (Modular Per 3 Peran: Guru Mapel, Wali Kelas, Guru Piket)
    if (user.role === 'guru' || user.role === 'piket') {
      const isMapelAssigned = user.isGuruMapel !== false && (Boolean(user.mapel) || (user.penugasanMapel && user.penugasanMapel.length > 0));
      const isWaliAssigned = Boolean(user.isWaliKelas) && Boolean(user.waliKelas && user.waliKelas !== '-' && user.waliKelas !== '');
      const isPiketAssigned = Boolean(user.isGuruPiket) || user.role === 'piket' || Boolean(isAssignedPiketToday) || Boolean(user.piketDays && user.piketDays.length > 0) || actingAsPiket;

      const groups: MenuGroup[] = [];

      // JIKA SEDANG BERTINDAK SEBAGAI PETUGAS PIKET (Mode Ruang Kerja Piket Terisolasi)
      // Seluruh menu Guru Mapel & Wali Kelas disembunyikan agar fokus pada tugas operasional piket
      if (actingAsPiket || user.role === 'piket') {
        groups.push({
          groupTitle: 'Ruang Kerja Petugas Piket',
          items: [
            {
              id: 'apel-attendance',
              label: 'Absensi Apel Petugas',
              desc: 'Input kehadiran apel pagi & siang per rombel',
              icon: UserCheck,
              tag: 'Operasional',
              tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
            },
            {
              id: 'kiosk',
              label: 'Pindai Presensi Siswa',
              desc: 'Pindai kartu QR apel pagi & siang di gerbang',
              icon: QrCode,
              tag: isAssignedPiketToday ? 'Hari Ini' : 'Gerbang',
              tagColor: isAssignedPiketToday ? 'bg-emerald-600 text-white font-bold' : 'bg-blue-100 text-blue-800 font-bold',
            },
            {
              id: 'dashboard',
              label: 'Monitoring Presensi Apel',
              desc: 'Kelola & pantau presensi apel harian real-time',
              icon: LayoutDashboard,
              tag: 'Live',
              tagColor: 'bg-emerald-100 text-emerald-800 font-bold',
            },
            {
              id: 'action-leave-approval',
              label: 'Verifikasi Izin & Sakit',
              desc: 'Pemeriksaan surat dokter & izin mandiri siswa',
              icon: FileText,
              isAction: true,
              tag: pendingLeaveCount > 0 ? `${pendingLeaveCount} Pengajuan` : undefined,
              tagColor: 'bg-rose-500 text-white font-bold',
            },
            {
              id: 'guru-piket',
              label: 'Jadwal & Rekan Piket',
              desc: 'Lihat jadwal tugas piket harian sekolah',
              icon: UserCheck,
            },
            {
              id: 'reports-apel',
              label: 'Rekap Laporan Apel',
              desc: 'Laporan resmi apel pagi & siang (PDF & Excel)',
              icon: FileSpreadsheet,
              tag: 'Laporan',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
          ],
        });

        // Layanan Pendukung & Informasi Sekolah
        groups.push({
          groupTitle: 'Layanan & Info Sekolah',
          items: [
            {
              id: 'action-agenda',
              label: 'Agenda Kegiatan Sekolah',
              desc: 'Kalender kegiatan, rapat & event sekolah',
              icon: Calendar,
              isAction: true,
            },
            {
              id: 'public-info',
              label: 'Jadwal & Info Sekolah',
              desc: 'Profil & jam operasional sekolah',
              icon: Info,
            },
          ],
        });

        return groups;
      }

      // JIKA DALAM MODE RUANG KERJA GURU (Guru Mapel & Wali Kelas)
      // 1. Penugasan Guru Mapel
      if (isMapelAssigned) {
        groups.push({
          groupTitle: `Penugasan Guru Mapel ${user.mapel ? `(${user.mapel})` : ''}`,
          items: [
            {
              id: 'journal',
              label: 'Absensi & Jurnal Pembelajaran',
              desc: 'Catat absensi mapel & agenda KBM guru',
              icon: BookOpen,
              tag: 'KBM',
              tagColor: 'bg-indigo-100 text-indigo-800 font-bold',
            },
            {
              id: 'action-grades',
              label: 'Kelola Nilai Siswa',
              desc: 'Input nilai tugas, UH, PTS & PAS',
              icon: Award,
              isAction: true,
              tag: 'Nilai',
              tagColor: 'bg-indigo-100 text-indigo-800 font-bold',
            },
            {
              id: 'reports-kbm',
              label: 'Rekap Laporan Pembelajaran',
              desc: 'Laporan KBM mapel & ketuntasan belajar',
              icon: BookOpen,
              tag: 'Laporan',
              tagColor: 'bg-indigo-100 text-indigo-900 font-bold',
            },
            {
              id: 'heb-calendar',
              label: 'Kalender Efektif (HEB)',
              desc: 'Target hari belajar mengajar',
              icon: CalendarDays,
            },
          ],
        });
      }

      // 2. Penugasan Wali Kelas
      if (isWaliAssigned) {
        groups.push({
          groupTitle: `Penugasan Wali Kelas ${user.waliKelas ? `(${user.waliKelas})` : ''}`,
          items: [
            {
              id: 'students',
              label: `Data Siswa Kelas ${user.waliKelas || 'Binaan'}`,
              desc: 'Daftar nama & kontak orang tua kelas binaan',
              icon: Users,
              tag: user.waliKelas || 'Wali',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'action-grades',
              label: `Rekap Nilai & Rapor ${user.waliKelas || 'Binaan'}`,
              desc: 'Input nilai, rekap leger & cetak rapor kelas',
              icon: Award,
              isAction: true,
              tag: 'Rapor',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'pantau-anak',
              label: `Pantau Siswa ${user.waliKelas || 'Binaan'}`,
              desc: 'Perkembangan nilai, tugas & presensi siswa binaan',
              icon: Sparkles,
              tag: 'Binaan',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'action-leave-approval',
              label: 'Verifikasi Izin & Sakit',
              desc: 'Periksa surat izin & permohonan siswa',
              icon: FileText,
              isAction: true,
              tag: pendingLeaveCount > 0 ? `${pendingLeaveCount} Pengajuan` : undefined,
              tagColor: 'bg-rose-500 text-white font-bold',
            },
            {
              id: 'action-whatsapp',
              label: 'Kirim Notifikasi WhatsApp Ortu',
              desc: 'Kirim info presensi & catatan ke wali murid',
              icon: MessageSquare,
              isAction: true,
              tag: 'WA',
              tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
            },
          ],
        });
      }

      // 3. Layanan Pendukung & Informasi Sekolah
      groups.push({
        groupTitle: 'Layanan & Operasional Sekolah',
        items: [
          {
            id: 'kiosk',
            label: 'Pindai Presensi Siswa',
            desc: 'Layar pindai kartu QR presensi siswa di gerbang',
            icon: QrCode,
            tag: 'Gerbang',
            tagColor: 'bg-blue-100 text-blue-900 font-bold',
          },
          {
            id: 'action-agenda',
            label: 'Agenda Kegiatan Sekolah',
            desc: 'Kalender kegiatan, rapat & event sekolah',
            icon: Calendar,
            isAction: true,
          },
          {
            id: 'public-info',
            label: 'Jadwal & Info Sekolah',
            desc: 'Profil & jam operasional sekolah',
            icon: Info,
          },
        ],
      });

      return groups;
    }

    // 4. ADMINISTRATOR SISTEM
    return [
      {
        groupTitle: 'Presensi & Monitoring',
        items: [
          {
            id: 'dashboard',
            label: 'Monitoring Presensi Apel',
            desc: 'Operasional apel pagi & siang',
            icon: LayoutDashboard,
            tag: 'Admin',
            tagColor: 'bg-blue-100 text-blue-800 font-bold',
          },
          {
            id: 'apel-attendance',
            label: 'Absensi Apel Petugas',
            desc: 'Input apel pagi & siang per rombel',
            icon: UserCheck,
            tag: 'Apel',
            tagColor: 'bg-emerald-100 text-emerald-800 font-bold',
          },
          {
            id: 'action-leave-approval',
            label: 'Verifikasi Izin & Sakit',
            desc: 'Validasi surat dokter mandiri',
            icon: FileText,
            isAction: true,
            tag: pendingLeaveCount > 0 ? `${pendingLeaveCount} Pengajuan` : undefined,
            tagColor: 'bg-rose-500 text-white font-bold',
          },
          {
            id: 'action-grades',
            label: 'Manajemen Nilai & Rapor',
            desc: 'Input & kelola nilai siswa',
            icon: Award,
            isAction: true,
            tag: 'Rapor',
            tagColor: 'bg-indigo-100 text-indigo-800 font-bold',
          },
          {
            id: 'kiosk',
            label: 'Pindai Presensi Siswa',
            desc: 'Layar pindai kartu QR apel pagi & siang',
            icon: QrCode,
          },
          {
            id: 'pantau-anak',
            label: 'Pantau Anak / Siswa',
            desc: 'Akses laporan perkembangan siswa',
            icon: Sparkles,
          },
        ],
      },
      {
        groupTitle: 'Data Pokok Pendidikan',
        items: [
          {
            id: 'students',
            label: 'Data Pokok Siswa',
            desc: 'Dapodik, foto profil & impor Excel',
            icon: Users,
          },
          {
            id: 'teachers',
            label: 'Data & Akun Guru',
            desc: 'Akun login, NIP & penugasan mapel',
            icon: GraduationCap,
          },
          {
            id: 'guru-piket',
            label: 'Jadwal & Guru Piket',
            desc: 'Atur penugasan guru piket Senin - Sabtu',
            icon: UserCheck,
            tag: 'Piket',
            tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
          },
          {
            id: 'journal',
            label: 'Absensi & Jurnal Pembelajaran',
            desc: 'Supervisi absensi KBM & agenda mengajar',
            icon: BookOpen,
          },
        ],
      },
      {
        groupTitle: 'Cetak & Laporan Resmi',
        items: [
          {
            id: 'reports-apel',
            label: 'Rekap Laporan Absensi Apel',
            desc: 'Laporan resmi apel pagi & siang (PDF & Excel)',
            icon: FileSpreadsheet,
            tag: 'Apel',
            tagColor: 'bg-amber-100 text-amber-900 font-bold',
          },
          {
            id: 'reports-kbm',
            label: 'Rekap Laporan Pembelajaran',
            desc: 'Laporan absensi KBM mata pelajaran (PDF & Excel)',
            icon: BookOpen,
            tag: 'KBM',
            tagColor: 'bg-indigo-100 text-indigo-900 font-bold',
          },
          {
            id: 'cards',
            label: 'Cetak Massal Kartu (F4/A4)',
            desc: 'Layout presisi cetak kartu QR',
            icon: Printer,
          },
          {
            id: 'heb-calendar',
            label: 'Kalender Efektif (HEB)',
            desc: 'Atur hari efektif & hari libur',
            icon: CalendarDays,
          },
        ],
      },
      {
        groupTitle: 'Layanan & Fitur Terintegrasi',
        items: [
          {
            id: 'action-agenda',
            label: 'Agenda Kegiatan Sekolah',
            desc: 'Jadwal ujian, rapat, hari besar & libur',
            icon: Calendar,
            isAction: true,
            tag: 'Agenda',
            tagColor: 'bg-indigo-100 text-indigo-900 font-bold',
          },
          {
            id: 'action-whatsapp',
            label: 'Notifikasi WhatsApp Ortu',
            desc: 'Kirim pesan kehadiran & keterlambatan',
            icon: MessageSquare,
            isAction: true,
            tag: 'WA',
            tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
          },
          {
            id: 'action-ai-analysis',
            label: 'Analisis Kehadiran AI',
            desc: 'Analisis kedisiplinan berbasis Gemini AI',
            icon: Sparkles,
            isAction: true,
            tag: 'AI',
            tagColor: 'bg-purple-100 text-purple-900 font-bold',
          },
        ],
      },
      {
        groupTitle: 'Pengaturan Sistem',
        items: [
          {
            id: 'settings',
            label: 'Pengaturan & Upload Logo',
            desc: 'Upload logo sekolah & atur jam presensi',
            icon: Settings,
            isAction: true,
          },
        ],
      },
    ];
  };

  const menuGroups = getMenuGroups();

  const handleSelectTab = (tabId: string, isAction?: boolean) => {
    if (tabId === 'settings') {
      onOpenSettings();
      onClose();
      return;
    }
    if (tabId === 'action-leave-approval') {
      onOpenLeaveApproval?.();
      onClose();
      return;
    }
    if (tabId === 'action-leave-request') {
      onOpenLeaveRequest?.();
      onClose();
      return;
    }
    if (tabId === 'action-grades') {
      onOpenGradeManagement?.();
      onClose();
      return;
    }
    if (tabId === 'action-agenda') {
      onOpenAgenda?.();
      onClose();
      return;
    }
    if (tabId === 'action-whatsapp') {
      onOpenWhatsApp?.();
      onClose();
      return;
    }
    if (tabId === 'action-ai-analysis') {
      onOpenAiAnalysis?.();
      onClose();
      return;
    }
    setActiveTab(tabId);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xl lg:shadow-none flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header Section */}
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Brand & School Logo */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => handleSelectTab(user ? (user.role === 'guru' ? 'journal' : 'dashboard') : 'pantau-anak')}
            >
              <div className="w-11 h-11 shrink-0 flex items-center justify-center">
                <SchoolLogo src={schoolConfig?.logoUrl} className="w-11 h-11 drop-shadow-sm hover:scale-105 transition-transform" />
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-slate-900 text-sm tracking-tight truncate leading-tight">
                  E-Presensi Digital
                </h1>
                <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">
                  {schoolConfig.namaSekolah}
                </p>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Role Card Indicator */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
            {user ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-xs ${
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

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : user.role === 'guru' && actingAsPiket
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'
                          : user.role === 'guru'
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          : user.role === 'ortu'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {user.role === 'admin' 
                          ? 'Administrator' 
                          : user.role === 'guru' && actingAsPiket
                          ? 'Petugas Piket (Tugas Guru)'
                          : user.role === 'guru' 
                          ? 'Guru Mapel' 
                          : user.role === 'ortu' 
                          ? 'Orang Tua / Wali'
                          : 'Petugas Piket'}
                      </span>
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                      {user.nama}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-medium truncate flex items-center justify-between pt-0.5">
                  <span className="truncate">@{user.username} {user.mapel ? `• ${user.mapel}` : ''}</span>
                  <button
                    onClick={onOpenLogin}
                    className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-[10px] shrink-0"
                  >
                    Ganti
                  </button>
                </div>

                {/* ROLE SWITCHER: Bertindak Sebagai Petugas Piket */}
                {user.role === 'guru' && (
                  <div className="pt-2">
                    {actingAsPiket ? (
                      <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Petugas Piket Aktif
                          </span>
                          <span className="text-[9px] font-bold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                            Penugasan
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-800 leading-tight">
                          Anda sedang bertindak sebagai <strong>Petugas Piket</strong>. Seluruh menu presensi apel & monitoring aktif.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActingAsPiket(false);
                            setActiveTab('journal');
                          }}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Kembali ke Menu Guru</span>
                        </button>
                      </div>
                    ) : isAssignedPiketToday ? (
                      <button
                        type="button"
                        onClick={() => {
                          setActingAsPiket(true);
                          setActiveTab('apel-attendance');
                        }}
                        className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/20 group ring-2 ring-emerald-400/80 animate-pulse"
                        title="Anda terjadwal piket hari ini! Klik untuk mengaktifkan operasional piket"
                      >
                        <div className="flex items-center gap-2 text-left min-w-0">
                          <div className="p-1 rounded-lg bg-amber-400 text-slate-950 font-black shrink-0">
                            <Sparkles className="w-4 h-4 text-slate-950" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black leading-tight flex items-center gap-1.5">
                              <span className="truncate">Tugas Piket Hari Ini!</span>
                              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full shrink-0">AKTIF</span>
                            </div>
                            <div className="text-[10px] text-emerald-100 font-medium truncate">
                              {todayPiketRole || 'Operasional presensi & apel'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActingAsPiket(true);
                          setActiveTab('apel-attendance');
                        }}
                        className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs group"
                        title="Klik untuk bertindak sebagai Petugas Piket Pengganti"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <div className="p-1 rounded-lg bg-white/20 text-white group-hover:scale-110 transition-transform">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-black leading-tight">Bertindak Petugas Piket</div>
                            <div className="text-[10px] text-emerald-100 font-normal">Operasional presensi apel & kiosk</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 bg-gradient-to-br from-blue-50 via-indigo-50/60 to-blue-50/40 border border-blue-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-blue-950 font-black text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Portal Orang Tua & Siswa</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-snug">
                  Layanan mandiri orang tua: pantau kehadiran harian, nilai kuis & ajukan surat izin sakit online.
                </p>
                <button
                  onClick={onOpenLogin}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer mt-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Akun Guru / Staf</span>
                </button>
              </div>
            )}
          </div>

          {/* Grouped Navigation Menu List (Scrollable Area) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {menuGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {/* Group Section Header */}
                <div className="px-3 pt-1 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {group.groupTitle}
                  </span>
                </div>

                {/* Group Nav Items */}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id, item.isAction)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-600/30'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl shrink-0 transition-colors ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs truncate">{item.label}</span>
                            {item.tag && (
                              <span className={`px-1.5 py-0.2 rounded-md text-[9px] ${isActive ? 'bg-white/20 text-white' : item.tagColor}`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                          {item.desc && (
                            <p className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              {item.desc}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-white space-y-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Ganti akun pengguna lain"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ganti Akun</span>
              </button>

              <button
                onClick={logout}
                className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                title="Keluar dari sesi ini"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login Pegawai / Guru</span>
            </button>
          )}

          <div className="text-[10px] text-center text-slate-400 font-medium">
            SMP PGRI 1 CIKADU • v2.4
          </div>
        </div>
      </aside>
    </>
  );
};
