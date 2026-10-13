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
  MessageSquare,
  FileCheck,
  Gauge,
  Database
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
    activeDutyMode,
    setActiveDutyMode,
    canActAsGuruMapel,
    canActAsWaliKelas,
    canActAsPiket,
    canActAsKepsek,
    actingAsPiket, 
    setActingAsPiket, 
    effectiveRole,
    isAssignedPiketToday,
    todayPiketRole,
    todayPiketAssignment
  } = useAuth();

  // Mode Publik: Jangan tampilkan sidebar pada tampilan publik / sebelum login
  if (!user) {
    return null;
  }

  // Functional Menu Grouping customized per role (Menu dipisah & dikelompokkan sesuai fungsi)
  const getMenuGroups = (): MenuGroup[] => {
    // 1. PUBLIC MODE (Tamu / Siswa / Orang Tua / Umum - Belum Login)
    if (!user) {
      return [
        {
          groupTitle: 'Layanan Terpadu Sekolah',
          items: [
            {
              id: 'public-info',
              label: 'Portal Informasi & Presensi Real-Time',
              desc: 'Agenda, pengumuman & pantau kehadiran siswa',
              icon: Sparkles,
              tag: 'Utama',
              tagColor: 'bg-blue-100 text-blue-900 font-bold',
            },
            {
              id: 'action-leave-request',
              label: 'Pengajuan Izin / Sakit Mandiri',
              desc: 'Kirim surat dokter & izin tanpa login',
              icon: FileText,
              isAction: true,
              tag: 'Mandiri',
              tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
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

    // 3. KEPALA SEKOLAH (Supervisi Eksekutif & Persetujuan Disposisi)
    if (user.role === 'kepsek') {
      return [
        {
          groupTitle: 'Supervisi Eksekutif Kepala Sekolah',
          items: [
            {
              id: 'kepsek',
              label: 'Dashboard Kepala Sekolah',
              desc: 'Supervisi KBM, persetujuan izin & rekap eksekutif',
              icon: ShieldCheck,
              tag: 'Supervisi',
              tagColor: 'bg-amber-100 text-amber-900 font-extrabold',
            },
            {
              id: 'journal',
              label: 'Supervisi Jurnal KBM',
              desc: 'Pantau KBM harian di seluruh kelas',
              icon: BookOpen,
              tag: 'KBM',
              tagColor: 'bg-indigo-100 text-indigo-900 font-bold',
            },
            {
              id: 'teacher-attendance',
              label: 'Absensi Guru & Tendik',
              desc: 'Monitoring kehadiran & permohonan izin guru',
              icon: UserCheck,
              tag: 'Guru',
              tagColor: 'bg-teal-100 text-teal-900 font-bold',
            },
            {
              id: 'dashboard',
              label: 'Monitoring Presensi Siswa',
              desc: 'Statistik kehadiran harian siswa per rombel',
              icon: LayoutDashboard,
              tag: 'Siswa',
              tagColor: 'bg-blue-100 text-blue-900 font-bold',
            },
            {
              id: 'action-grades',
              label: 'Supervisi Nilai & Rapor',
              desc: 'Rekapitulasi pencapaian KKM & leger rapor',
              icon: Award,
              isAction: true,
              tag: 'Rapor',
              tagColor: 'bg-purple-100 text-purple-900 font-bold',
            },
            {
              id: 'reports',
              label: 'Laporan Rekapitulasi Sekolah',
              desc: 'Cetak laporan resmi supervisi (PDF & Excel)',
              icon: FileText,
            },
          ],
        },
        {
          groupTitle: 'Informasi & Profil Sekolah',
          items: [
            {
              id: 'my-profile',
              label: 'Profil & Kartu Saya',
              desc: 'Biodata & kartu identitas eksekutif',
              icon: GraduationCap,
            },
            {
              id: 'teachers',
              label: 'Data Pokok Guru & Tendik',
              desc: 'Daftar pendidik, NUPTK & penugasan',
              icon: Users,
            },
            {
              id: 'public-info',
              label: 'Jadwal & Info Sekolah',
              desc: 'Jam operasional & profil sekolah',
              icon: Info,
            },
          ],
        },
      ];
    }

    // 4 & 5. GURU & PETUGAS PIKET (Modular Per Peran: Guru Mapel, Wali Kelas, Petugas Piket, Kepsek)
    if (user.role === 'guru' || user.role === 'piket') {
      const groups: MenuGroup[] = [];

      // 1. MODA PETUGAS PIKET
      if (activeDutyMode === 'piket' || user.role === 'piket') {
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

        groups.push({
          groupTitle: 'Layanan & Info Sekolah',
          items: [
            {
              id: 'my-profile',
              label: 'Profil & Kartu Saya',
              desc: 'Edit foto & cetak kartu QR individu',
              icon: GraduationCap,
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

      // 2. MODA WALI KELAS
      if (activeDutyMode === 'wali_kelas') {
        groups.push({
          groupTitle: `Ruang Kerja Wali Kelas ${user.waliKelas ? `(${user.waliKelas})` : ''}`,
          items: [
            {
              id: 'students',
              label: `Data Pokok Siswa ${user.waliKelas || 'Binaan'}`,
              desc: 'Daftar nama, foto, NISN & ortu kelas binaan',
              icon: Users,
              tag: user.waliKelas || 'Wali',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'action-grades',
              label: `Manajemen Nilai & Rapor ${user.waliKelas || 'Binaan'}`,
              desc: 'Input nilai, rekap leger & cetak rapor kelas',
              icon: Award,
              isAction: true,
              tag: 'Rapor',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'pantau-anak',
              label: `Pantau Perkembangan Siswa ${user.waliKelas || 'Binaan'}`,
              desc: 'Monitoring nilai, tugas & presensi siswa binaan',
              icon: Sparkles,
              tag: 'Binaan',
              tagColor: 'bg-amber-100 text-amber-900 font-bold',
            },
            {
              id: 'action-leave-approval',
              label: 'Verifikasi Izin & Sakit Siswa',
              desc: 'Validasi surat permohonan izin kelas binaan',
              icon: FileText,
              isAction: true,
              tag: pendingLeaveCount > 0 ? `${pendingLeaveCount} Pengajuan` : undefined,
              tagColor: 'bg-rose-500 text-white font-bold',
            },
            {
              id: 'action-whatsapp',
              label: 'Notifikasi WA Wali Murid',
              desc: 'Kirim pengumuman & catatan ke orang tua',
              icon: MessageSquare,
              isAction: true,
              tag: 'WA',
              tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
            },
          ],
        });

        // KBM pendukung untuk Wali Kelas
        groups.push({
          groupTitle: 'Penugasan Mengajar (KBM)',
          items: [
            {
              id: 'journal',
              label: 'Absensi & Jurnal Pembelajaran',
              desc: 'Catat absensi KBM & agenda mengajar',
              icon: BookOpen,
            },
            {
              id: 'assignments',
              label: 'Kelola Tugas & PR Siswa',
              desc: 'Input tugas, PR & deadline siswa',
              icon: FileCheck,
            },
          ],
        });

        groups.push({
          groupTitle: 'Layanan & Operasional',
          items: [
            {
              id: 'my-profile',
              label: 'Profil & Kartu Saya',
              desc: 'Edit foto, NUPTK & cetak kartu QR',
              icon: GraduationCap,
            },
            {
              id: 'teacher-attendance',
              label: 'Absensi Saya & Pendidik',
              desc: 'Absen mandiri, rekap & izin dinas guru',
              icon: UserCheck,
            },
            {
              id: 'action-agenda',
              label: 'Agenda Kegiatan Sekolah',
              desc: 'Kalender kegiatan sekolah',
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

      // 3. MODA KEPALA SEKOLAH (JIKA ADA PERAN)
      if (activeDutyMode === 'kepsek') {
        groups.push({
          groupTitle: 'Ruang Kerja Kepala Sekolah',
          items: [
            {
              id: 'kepsek',
              label: 'Portal Kepala Sekolah',
              desc: 'Supervisi KBM & persetujuan izin guru',
              icon: ShieldCheck,
              tag: 'Supervisi',
              tagColor: 'bg-purple-100 text-purple-900 font-bold',
            },
            {
              id: 'dashboard',
              label: 'Monitoring Presensi Apel',
              desc: 'Pantau kehadiran harian seluruh siswa',
              icon: LayoutDashboard,
            },
            {
              id: 'journal',
              label: 'Supervisi Jurnal Mengajar',
              desc: 'Pantau keterlaksanaan KBM dewan guru',
              icon: BookOpen,
            },
            {
              id: 'reports-apel',
              label: 'Rekap Laporan Apel',
              desc: 'Laporan eksekutif presensi apel',
              icon: FileSpreadsheet,
            },
            {
              id: 'reports-kbm',
              label: 'Rekap Laporan Pembelajaran',
              desc: 'Laporan KBM mata pelajaran',
              icon: BookOpen,
            },
          ],
        });

        return groups;
      }

      // 4. MODA GURU MATA PELAJARAN (DEFAULT KBM)
      groups.push({
        groupTitle: `Ruang Kerja Guru Mapel ${user.mapel ? `(${user.mapel})` : ''}`,
        items: [
          {
            id: 'journal',
            label: 'Absensi & Jurnal Pembelajaran',
            desc: 'Catat absensi mapel & agenda KBM harian',
            icon: BookOpen,
            tag: 'KBM',
            tagColor: 'bg-indigo-100 text-indigo-800 font-bold',
          },
          {
            id: 'assignments',
            label: 'Kelola Tugas & PR Siswa',
            desc: 'Input penugasan, PR & deadline siswa',
            icon: FileCheck,
            tag: 'Tugas',
            tagColor: 'bg-indigo-100 text-indigo-800 font-bold',
          },
          {
            id: 'action-grades',
            label: 'Kelola Nilai Siswa',
            desc: 'Input nilai tugas, UH, PTS & PAS mapel',
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

      // Layanan & Operasional
      groups.push({
        groupTitle: 'Layanan & Operasional Sekolah',
        items: [
          {
            id: 'my-profile',
            label: 'Profil & Kartu Saya',
            desc: 'Edit foto, NUPTK/ID & cetak kartu QR',
            icon: GraduationCap,
            tag: 'Profil',
            tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
          },
          {
            id: 'teacher-attendance',
            label: 'Absensi Saya & Pendidik',
            desc: 'Absen mandiri, rekap & izin dinas guru',
            icon: UserCheck,
            tag: 'Guru',
            tagColor: 'bg-teal-100 text-teal-900 font-bold',
          },
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
            id: 'kepsek',
            label: 'Portal Kepala Sekolah',
            desc: 'Supervisi KBM & persetujuan izin guru',
            icon: ShieldCheck,
            tag: 'Kepsek',
            tagColor: 'bg-amber-100 text-amber-900 font-bold',
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
            id: 'my-profile',
            label: 'Profil & Kartu Saya',
            desc: 'Edit foto, NUPTK/ID, penugasan & cetak kartu QR individu',
            icon: GraduationCap,
            tag: 'Profil',
            tagColor: 'bg-emerald-100 text-emerald-900 font-bold',
          },
          {
            id: 'students',
            label: 'Data Pokok Siswa',
            desc: 'Dapodik, foto profil & impor Excel',
            icon: Users,
          },
          {
            id: 'teachers',
            label: 'Data & Akun Guru',
            desc: 'Akun login, NUPTK/ID & penugasan mapel',
            icon: GraduationCap,
          },
          {
            id: 'teacher-attendance',
            label: 'Absensi Guru & Tendik',
            desc: 'Pencatatan, absen mandiri & izin dinas guru',
            icon: UserCheck,
            tag: 'Guru',
            tagColor: 'bg-teal-100 text-teal-900 font-bold',
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
          {
            id: 'assignments',
            label: 'Kelola Tugas & PR Siswa',
            desc: 'Monitoring & supervisi penugasan dewan guru',
            icon: FileCheck,
            tag: 'Tugas',
            tagColor: 'bg-indigo-100 text-indigo-800 font-bold',
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
            label: 'Cetak Kartu Siswa (F4/A4)',
            desc: 'Layout presisi cetak kartu QR Pelajar',
            icon: Printer,
            tag: 'Siswa',
            tagColor: 'bg-blue-100 text-blue-900 font-bold',
          },
          {
            id: 'cards-guru',
            label: 'Cetak Kartu Guru & Tendik (F4/A4)',
            desc: 'Layout presisi cetak kartu QR Pendidik',
            icon: GraduationCap,
            tag: 'Guru',
            tagColor: 'bg-amber-100 text-amber-900 font-bold',
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
        groupTitle: 'Pengaturan & Infrastruktur Cloud',
        items: [
          {
            id: 'firestore-monitor',
            label: 'Monitor Kuota Firestore',
            desc: 'Pantau sisa jatah 50.000 pembacaan data harian',
            icon: Gauge,
            tag: '50K Limit',
            tagColor: 'bg-blue-100 text-blue-900 font-extrabold',
          },
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
              onClick={() => handleSelectTab(user ? (user.role === 'guru' ? 'journal' : 'dashboard') : 'public-info')}
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

                {/* MULTI-ROLE DUTY SWITCHER: Beralih Moda Peran Tugas */}
                {user.role === 'guru' && (
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 pb-0.5">
                      <span>Beralih Moda Tugas</span>
                      <span className="text-amber-600 font-extrabold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                        Terpisah
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1">
                      {canActAsGuruMapel && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDutyMode('guru_mapel');
                            setActiveTab('journal');
                          }}
                          className={`w-full p-2 rounded-xl text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                            activeDutyMode === 'guru_mapel'
                              ? 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <GraduationCap className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                            <span className="truncate">Guru Mapel {user.mapel ? `(${user.mapel})` : ''}</span>
                          </div>
                          {activeDutyMode === 'guru_mapel' && <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-md uppercase font-black">Aktif</span>}
                        </button>
                      )}

                      {canActAsWaliKelas && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDutyMode('wali_kelas');
                            setActiveTab('students');
                          }}
                          className={`w-full p-2 rounded-xl text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                            activeDutyMode === 'wali_kelas'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            <span className="truncate">Wali Kelas {user.waliKelas}</span>
                          </div>
                          {activeDutyMode === 'wali_kelas' && <span className="text-[9px] bg-slate-950/20 text-slate-950 px-1.5 py-0.2 rounded-md uppercase font-black">Aktif</span>}
                        </button>
                      )}

                      {canActAsPiket && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDutyMode('piket');
                            setActiveTab('apel-attendance');
                          }}
                          className={`w-full p-2 rounded-xl text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                            activeDutyMode === 'piket'
                              ? 'bg-emerald-600 text-white font-black shadow-xs ring-2 ring-emerald-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <UserCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span className="truncate">Petugas Piket {isAssignedPiketToday ? '★ Hari Ini' : ''}</span>
                          </div>
                          {activeDutyMode === 'piket' && <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-md uppercase font-black">Aktif</span>}
                        </button>
                      )}

                      {canActAsKepsek && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDutyMode('kepsek');
                            setActiveTab('kepsek');
                          }}
                          className={`w-full p-2 rounded-xl text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                            activeDutyMode === 'kepsek'
                              ? 'bg-purple-600 text-white font-black shadow-xs ring-2 ring-purple-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                            <span className="truncate">Supervisi Kepsek</span>
                          </div>
                          {activeDutyMode === 'kepsek' && <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-md uppercase font-black">Aktif</span>}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/70 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-blue-950 font-black text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Portal Informasi & Orang Tua</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-snug">
                  Layanan terpadu presensi real-time, agenda sekolah, dan pemantauan siswa.
                </p>
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
            <div className="py-1 text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Layanan Publik Aktif
              </span>
            </div>
          )}

          <div className="text-[10px] text-center text-slate-400 font-medium">
            SMP PGRI 1 CIKADU • v2.4
          </div>
        </div>
      </aside>
    </>
  );
};
