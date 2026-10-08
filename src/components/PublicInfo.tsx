import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GraduationCap, 
  Clock, 
  MapPin, 
  Phone, 
  QrCode, 
  Sparkles, 
  LogIn,
  AlertCircle,
  Search,
  X,
  User,
  Users,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
  ChevronRight,
  Download,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  Filter,
  Printer,
  Calendar,
  Award,
  Share2,
  FileText
} from 'lucide-react';
import { 
  SchoolConfig, 
  Student, 
  AttendanceRecord, 
  TeachingJournal, 
  TeacherUser,
  AttendanceSession,
  AttendanceStatus 
} from '../types';
import { generateQrDataUrl } from '../utils/qr';
import { SchoolLogo } from '../assets/schoolLogo';

interface PublicInfoProps {
  schoolConfig: SchoolConfig;
  students?: Student[];
  records?: AttendanceRecord[];
  journals?: TeachingJournal[];
  teachers?: TeacherUser[];
  currentSession?: AttendanceSession;
  onOpenLogin: () => void;
  onOpenScanner?: () => void;
  onOpenLeaveRequest?: () => void;
  onOpenPantauAnak?: (student: Student) => void;
}

export const PublicInfo: React.FC<PublicInfoProps> = ({
  schoolConfig,
  students = [],
  records = [],
  journals = [],
  teachers = [],
  currentSession = 'Pagi',
  onOpenLogin,
  onOpenScanner,
  onOpenLeaveRequest,
  onOpenPantauAnak,
}) => {
  // Parent Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState(false);
  const [digitalQrUrl, setDigitalQrUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('Semua');
  const [liveClock, setLiveClock] = useState(() => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Distinct list of classes for filter chips
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.kelas) set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [students]);

  // Map wali kelas for quick lookup: class -> teacher name
  const waliKelasMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => {
      if (t.waliKelas) {
        map.set(t.waliKelas, t.nama);
      }
    });
    return map;
  }, [teachers]);

  // Today's school-wide attendance metrics for public display
  const schoolTodayStats = useMemo(() => {
    const todayRecs = records.filter((r) => r.tanggal === todayStr && (r.kategori === 'APEL' || !r.kategori));
    const total = students.length;
    const hadir = todayRecs.filter((r) => r.status === 'Hadir').length;
    const terlambat = todayRecs.filter((r) => r.status === 'Terlambat').length;
    const izinSakit = todayRecs.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
    const rate = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;
    return {
      total,
      hadir,
      terlambat,
      izinSakit,
      rate,
    };
  }, [students, records, todayStr]);

  // Filter students based on search query AND class filter
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = students;

    if (selectedClassFilter !== 'Semua') {
      list = list.filter((s) => s.kelas === selectedClassFilter);
    }

    if (!q) {
      // If no query but class is selected, show students of that class (up to 12)
      return selectedClassFilter !== 'Semua' ? list.slice(0, 16) : [];
    }

    return list
      .filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q))
      .slice(0, 16);
  }, [students, searchQuery, selectedClassFilter]);

  // Today's attendance records for the selected student
  const studentTodayRecords = useMemo(() => {
    if (!selectedStudent) return [];
    return records.filter(
      (r) => r.nisn === selectedStudent.nisn && r.tanggal === todayStr
    );
  }, [records, selectedStudent, todayStr]);

  // Gate Morning Record
  const morningRecord = useMemo(() => {
    return studentTodayRecords.find((r) => r.sesi === 'Pagi' && (r.kategori === 'APEL' || !r.kategori));
  }, [studentTodayRecords]);

  // Gate Afternoon Record
  const afternoonRecord = useMemo(() => {
    return studentTodayRecords.find((r) => r.sesi === 'Siang' && (r.kategori === 'APEL' || !r.kategori));
  }, [studentTodayRecords]);

  // In-Class Teaching Records for selected student today
  const inClassRecords = useMemo(() => {
    if (!selectedStudent) {
      return {
        directRecords: [] as AttendanceRecord[],
        journals: [] as TeachingJournal[],
      };
    }
    // From attendanceRecords with kategori KELAS
    const directClassRecords = studentTodayRecords.filter((r) => r.kategori === 'KELAS');

    // Also look up journals from today for this student's class
    const todayJournals = journals.filter(
      (j) => j.tanggal === todayStr && j.kelas === selectedStudent.kelas
    );

    return {
      directRecords: directClassRecords,
      journals: todayJournals,
    };
  }, [selectedStudent, studentTodayRecords, journals, todayStr]);

  // 7-day attendance history for selected student
  const recentDaysHistory = useMemo(() => {
    if (!selectedStudent) return [];

    const studentRecords = records.filter((r) => r.nisn === selectedStudent.nisn);
    const dateMap = new Map<string, AttendanceRecord[]>();

    studentRecords.forEach((r) => {
      const list = dateMap.get(r.tanggal) || [];
      list.push(r);
      dateMap.set(r.tanggal, list);
    });

    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateIso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      const recs = dateMap.get(dateIso) || [];

      let mainStatus: AttendanceStatus | 'Belum Ada Data' = 'Belum Ada Data';
      let scanTime = '-';

      const morn = recs.find((r) => r.sesi === 'Pagi');
      if (morn) {
        mainStatus = morn.status;
        scanTime = morn.waktu || '-';
      } else if (recs.length > 0) {
        mainStatus = recs[0].status;
        scanTime = recs[0].waktu || '-';
      }

      days.push({
        dateIso,
        dayName,
        status: mainStatus,
        time: scanTime,
        records: recs,
      });
    }

    return days;
  }, [selectedStudent, records]);

  // In-depth Daily Attendance History for the selected student
  const dailyAttendanceHistory = useMemo(() => {
    if (!selectedStudent) return [];

    const studentRecords = records.filter((r) => r.nisn === selectedStudent.nisn);
    const dateMap = new Map<string, AttendanceRecord[]>();

    studentRecords.forEach((r) => {
      const list = dateMap.get(r.tanggal) || [];
      list.push(r);
      dateMap.set(r.tanggal, list);
    });

    // Make sure today's date is always included
    if (!dateMap.has(todayStr)) {
      dateMap.set(todayStr, []);
    }

    const allDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

    return allDates.map((dateIso) => {
      const recs = dateMap.get(dateIso) || [];
      const morn = recs.find((r) => r.sesi === 'Pagi' && (r.kategori === 'APEL' || !r.kategori));
      const aft = recs.find((r) => r.sesi === 'Siang' && (r.kategori === 'APEL' || !r.kategori));
      const classRecs = recs.filter((r) => r.kategori === 'KELAS');

      // Determine day's primary status
      let primaryStatus: AttendanceStatus | 'Belum Scan' = 'Belum Scan';
      if (morn) {
        primaryStatus = morn.status;
      } else if (recs.length > 0) {
        primaryStatus = recs[0].status;
      }

      // Format Date in Indonesian
      const dateObj = new Date(dateIso + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return {
        dateIso,
        formattedDate,
        isToday: dateIso === todayStr,
        morning: morn,
        afternoon: aft,
        classRecs,
        status: primaryStatus,
        notes: morn?.catatan || (morn?.status === 'Terlambat' ? 'Terlambat kedatangan apel' : '-'),
      };
    });
  }, [selectedStudent, records, todayStr]);

  // Filtered daily history based on historyStatusFilter
  const filteredDailyHistory = useMemo(() => {
    if (historyStatusFilter === 'Semua') {
      return dailyAttendanceHistory;
    }
    return dailyAttendanceHistory.filter((item) => item.status === historyStatusFilter);
  }, [dailyAttendanceHistory, historyStatusFilter]);

  // Calculate attendance statistics for selected student
  const attendanceStats = useMemo(() => {
    if (!selectedStudent) return { percentage: 0, totalHadir: 0, totalTerlambat: 0, totalIzinSakit: 0, totalAlpa: 0 };
    const studentRecords = records.filter((r) => r.nisn === selectedStudent.nisn);
    if (studentRecords.length === 0) return { percentage: 100, totalHadir: 0, totalTerlambat: 0, totalIzinSakit: 0, totalAlpa: 0 };

    const totalHadir = studentRecords.filter((r) => r.status === 'Hadir').length;
    const totalTerlambat = studentRecords.filter((r) => r.status === 'Terlambat').length;
    const totalIzinSakit = studentRecords.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
    const totalAlpa = studentRecords.filter((r) => r.status === 'Alpa').length;
    const totalRecorded = studentRecords.length;

    const rate = Math.round(((totalHadir + totalTerlambat) / totalRecorded) * 100);
    return {
      percentage: Math.min(100, Math.max(0, rate)),
      totalHadir,
      totalTerlambat,
      totalIzinSakit,
      totalAlpa,
    };
  }, [selectedStudent, records]);

  // Generate QR for Digital Student Card when modal opens
  useEffect(() => {
    if (isDigitalCardOpen && selectedStudent) {
      setIsGeneratingQr(true);
      generateQrDataUrl(selectedStudent.nisn, 400)
        .then((url) => {
          setDigitalQrUrl(url);
        })
        .finally(() => {
          setIsGeneratingQr(false);
        });
    }
  }, [isDigitalCardOpen, selectedStudent]);

  // Handle WhatsApp Message for Leave/Sick Request
  const handleLaporWhatsApp = (alasan: 'Sakit' | 'Izin') => {
    if (!selectedStudent) return;
    const cleanPhone = (schoolConfig.kontak || '').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const text = encodeURIComponent(
      `Yth. Petugas Piket & Wali Kelas ${selectedStudent.kelas} di ${schoolConfig.namaSekolah},\n\n` +
      `Saya orang tua/wali dari:\n` +
      `• Nama Siswa : ${selectedStudent.nama}\n` +
      `• Kelas      : ${selectedStudent.kelas}\n` +
      `• NISN       : ${selectedStudent.nisn}\n\n` +
      `Mengonfirmasikan bahwa putra/putri kami pada hari ini (${formattedToday}) berhalangan hadir ke sekolah dikarenakan *${alasan.toUpperCase()}*.\n\n` +
      `Keterangan/Alasan: (Mohon jelaskan secara singkat disini)...\n\n` +
      `Mohon agar dapat dicatat dalam presensi harian sekolah. Terima kasih.`
    );

    window.open(`https://wa.me/${targetPhone}?text=${text}`, '_blank');
  };

  // Download digital QR image
  const handleDownloadQrImage = () => {
    if (!digitalQrUrl || !selectedStudent) return;
    const a = document.createElement('a');
    a.href = digitalQrUrl;
    a.download = `QR_SISWA_${selectedStudent.kelas}_${selectedStudent.nisn}_${selectedStudent.nama.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print Summary Handler
  const handlePrintSummary = () => {
    window.print();
  };

  // Mask Phone Number for Privacy (e.g. 0812-****-5678)
  const maskPhoneNumber = (phone?: string) => {
    if (!phone) return 'Belum terdaftar';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length <= 7) return clean;
    const start = clean.slice(0, 4);
    const end = clean.slice(-4);
    return `${start}-****-${end}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* ======================================================== */}
      {/* 1. HERO HEADER: WELCOME & OFFICIAL SCHOOL IDENTITY       */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-blue-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <SchoolLogo src={schoolConfig?.logoUrl} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white p-2 rounded-3xl shadow-xl border border-white/20 drop-shadow-md" />
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Portal Informasi Publik & Pemantauan Wali Murid</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {schoolConfig.namaSekolah}
              </h1>

              <p className="text-sm text-blue-100/90 leading-relaxed font-medium">
                Selamat datang di portal informasi resmi sekolah. Disediakan khusus bagi orang tua dan wali murid untuk memantau kehadiran harian putra/putri, mengirim surat izin/sakit mandiri, memeriksa jam belajar, dan mengakses profil akademik.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <a
                  href="#portal-cek-presensi"
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Cek Kehadiran Anak</span>
                </a>

                {onOpenLeaveRequest && (
                  <button
                    onClick={onOpenLeaveRequest}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ajukan Izin / Sakit</span>
                  </button>
                )}

                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/20 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-amber-300" />
                  <span>Login Petugas / Guru</span>
                </button>
              </div>
            </div>
          </div>

          {/* School Live Status & Clock Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 shrink-0 flex flex-col gap-2.5 text-xs text-blue-100 min-w-[250px]">
            <div className="flex items-center justify-between font-bold text-white text-sm pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="font-mono text-base font-black text-amber-300">{liveClock} WIB</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                Online
              </span>
            </div>
            <div>
              <span className="text-blue-300 block text-[10px] uppercase font-bold">Hari & Tanggal</span>
              <strong className="text-white font-semibold">{formattedToday}</strong>
            </div>
            <div>
              <span className="text-blue-300 block text-[10px] uppercase font-bold">Sesi Aktif</span>
              <strong className="text-white font-bold">
                {currentSession === 'Pagi' ? '☀️ Sesi Pagi (Apel & KBM)' : '🌤️ Sesi Siang (Apel Kepulangan)'}
              </strong>
            </div>
            <div>
              <span className="text-blue-300 block text-[10px] uppercase font-bold">Kepala Sekolah</span>
              <strong className="text-white font-semibold">{schoolConfig.namaKepsek}</strong>
              <p className="text-[10px] text-blue-300/80 font-mono">NPSN: {schoolConfig.npsn}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Quick Parent Service Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Cek Kehadiran */}
        <a 
          href="#portal-cek-presensi" 
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all group block"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <Search className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
            Cek Kehadiran Anak
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Pantau jam apel kedatangan & kehadiran jam pelajaran KBM
          </p>
        </a>

        {/* Card 2: Pengajuan Izin Mandiri */}
        <button 
          type="button"
          onClick={onOpenLeaveRequest}
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all group text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
            Ajukan Izin / Sakit
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Kirim surat dokter atau permohonan izin keluarga mandiri
          </p>
        </button>

        {/* Card 3: Pantau Nilai & Rapor */}
        <button 
          type="button"
          onClick={() => onOpenPantauAnak?.(students[0] || ({} as any))}
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all group text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
            Rapor & Pantau Anak
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Akses rekap nilai tugas, ujian, dan catatan wali kelas
          </p>
        </button>

        {/* Card 4: Jam Sekolah & Info */}
        <a 
          href="#info-operasional" 
          className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all group block"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition-transform">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
            Jam KBM & Kontak
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            Jadwal apel, tata tertib sekolah, dan nomor kontak resmi
          </p>
        </a>
      </div>

      {/* Ringkasan Kehadiran Sekolah Hari Ini (KPI Publik) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 rounded-3xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
            <Users className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Kehadiran Siswa Hari Ini</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono font-bold">
                {formattedToday}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Transparansi apel kedatangan gerbang ({currentSession}) untuk seluruh peserta didik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 self-stretch md:self-auto justify-around sm:justify-end border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">Tingkat Hadir</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400">{schoolTodayStats.rate}%</span>
          </div>
          <div className="h-7 w-px bg-white/15" />
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">Tepat Waktu</span>
            <span className="text-lg sm:text-xl font-black text-emerald-300">{schoolTodayStats.hadir}</span>
          </div>
          <div className="h-7 w-px bg-white/15" />
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">Terlambat</span>
            <span className="text-lg sm:text-xl font-black text-amber-300">{schoolTodayStats.terlambat}</span>
          </div>
          <div className="h-7 w-px bg-white/15" />
          <div className="text-center">
            <span className="text-[10px] text-slate-400 block font-semibold">Izin / Sakit</span>
            <span className="text-lg sm:text-xl font-black text-sky-300">{schoolTodayStats.izinSakit}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PORTAL CEK PRESENSI MANDIRI SISWA (FITUR ORANG TUA)    */}
      {/* ======================================================== */}
      <div id="portal-cek-presensi" className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Cek Kehadiran Anak Hari Ini
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Akses Terbuka
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cari berdasarkan Nama Siswa, nomor NISN, atau pilih Rombel Kelas untuk memeriksa status kedatangan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <span>{formattedToday}</span>
          </div>
        </div>

        {/* Filter Rombel Kelas Chips */}
        {classList.length > 0 && !selectedStudent && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Berdasarkan Kelas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedClassFilter('Semua')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedClassFilter === 'Semua'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Semua Kelas ({students.length})
              </button>
              {classList.map((cls) => {
                const count = students.filter((s) => s.kelas === cls).length;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedClassFilter === cls
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    Kelas {cls} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Input Bar */}
        <div className="space-y-4">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedStudent) {
                  setSelectedStudent(null);
                }
              }}
              placeholder="Ketik Nama Lengkap atau NISN Anak (Contoh: Ahmad, 0098765432)..."
              className="w-full h-13 pl-12 pr-12 text-sm font-semibold bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-hidden transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStudent(null);
                }}
                className="absolute right-3.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer transition-colors"
                title="Hapus pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* INLINE SEARCH RESULTS (Visible directly in page flow with rich student info cards!) */}
          {(searchQuery.trim() !== '' || selectedClassFilter !== 'Semua') && !selectedStudent && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                <span className="flex items-center gap-1.5 text-blue-900">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Ditemukan: {searchResults.length} Siswa {selectedClassFilter !== 'Semua' ? `(Kelas ${selectedClassFilter})` : ''}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Klik kartu siswa untuk melihat rincian presensi & KBM lengkap
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <User className="w-10 h-10 mx-auto text-slate-300" />
                  <h4 className="text-sm font-extrabold text-slate-700">Data Siswa Tidak Ditemukan</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tidak ada siswa yang cocok dengan kata kunci <span className="font-mono font-bold text-slate-800">"{searchQuery}"</span> {selectedClassFilter !== 'Semua' ? `di Kelas ${selectedClassFilter}` : ''}. Pastikan ejaan nama atau nomor NISN sudah sesuai.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {searchResults.map((s) => {
                    const studentRecs = records.filter((r) => r.nisn === s.nisn && r.tanggal === todayStr);
                    const morning = studentRecs.find((r) => r.sesi === 'Pagi');
                    const afternoon = studentRecs.find((r) => r.sesi === 'Siang');
                    const waliKelasName = waliKelasMap.get(s.kelas);

                    return (
                      <div
                        key={s.nisn}
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchQuery(s.nama);
                        }}
                        className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group relative"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Student Photo / Avatar with Live Status Dot */}
                          <div className="relative shrink-0">
                            {s.fotoUrl ? (
                              <img
                                src={s.fotoUrl}
                                alt={s.nama}
                                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
                                s.jk === 'L' ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
                              }`}>
                                {s.nama.charAt(0)}
                              </div>
                            )}

                            {/* Status Indicator Dot */}
                            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                              morning 
                                ? morning.status === 'Hadir' ? 'bg-emerald-500' : 'bg-amber-500' 
                                : 'bg-slate-300'
                            }`} title={morning ? `Status: ${morning.status}` : 'Belum Scan Masuk'} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-black text-[10px] uppercase">
                                Kelas {s.kelas}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                {s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                              </span>
                              {waliKelasName && (
                                <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={`Wali Kelas: ${waliKelasName}`}>
                                  • Wali: {waliKelasName}
                                </span>
                              )}
                            </div>

                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-blue-700 transition-colors mt-0.5 truncate">
                              {s.nama}
                            </h4>

                            <p className="text-[11px] font-mono text-slate-400">
                              NISN: <strong className="text-slate-600">{s.nisn}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Today's Badges & Scan Timestamps */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {morning ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                morning.status === 'Hadir' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Pagi: {morning.status} ({morning.waktu?.substring(0, 5)})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Pagi: Belum Scan</span>
                              </span>
                            )}

                            {afternoon && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                Pulang ({afternoon.waktu?.substring(0, 5)})
                              </span>
                            )}
                          </div>

                          <span className="text-blue-600 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                            <span>Detail Lengkap</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Student Suggestions Chips if None Selected and No Query and Filter is All */}
          {!selectedStudent && !searchQuery && selectedClassFilter === 'Semua' && students.length > 0 && (
            <div className="pt-1">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                Atau klik cepat salah satu nama siswa contoh untuk melihat laporan:
              </span>
              <div className="flex flex-wrap gap-2">
                {students.slice(0, 8).map((s) => (
                  <button
                    key={s.nisn}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(s);
                      setSearchQuery(s.nama);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{s.nama} ({s.kelas})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. DETAILED STUDENT RESULT DASHBOARD FOR PARENTS         */}
        {/* ======================================================== */}
        {selectedStudent && (
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
            
            {/* Top Navigation & Student Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition-colors cursor-pointer w-fit shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Kembali ke Pencarian Siswa</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span>Laporan Siswa:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-900 font-extrabold">
                  {selectedStudent.nama} (Kelas {selectedStudent.kelas})
                </span>
              </div>
            </div>

            {/* Student Identity Profile Card */}
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 rounded-2xl p-5 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {selectedStudent.fotoUrl ? (
                  <img
                    src={selectedStudent.fotoUrl}
                    alt={selectedStudent.nama}
                    className="w-18 h-18 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                  />
                ) : (
                  <div className={`w-18 h-18 rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-white shadow-md shrink-0 ${
                    selectedStudent.jk === 'L' ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {selectedStudent.nama.charAt(0)}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-wider">
                      Kelas {selectedStudent.kelas}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[11px] font-bold border border-slate-200">
                      {selectedStudent.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      NISN: <strong className="text-slate-900">{selectedStudent.nisn}</strong>
                    </span>
                    {waliKelasMap.get(selectedStudent.kelas) && (
                      <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold border border-indigo-200">
                        Wali Kelas: <strong>{waliKelasMap.get(selectedStudent.kelas)}</strong>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {selectedStudent.nama}
                  </h3>

                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Kontak Orang Tua Terdaftar: <strong>{maskPhoneNumber(selectedStudent.nomorTeleponOrtu)}</strong></span>
                  </p>
                </div>
              </div>

              {/* Action Buttons for Parent */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onOpenPantauAnak && (
                  <button
                    type="button"
                    onClick={() => onOpenPantauAnak(selectedStudent)}
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buka Pantau Anak</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDigitalCardOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-700 font-extrabold text-xs border border-blue-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Kartu QR Digital</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintSummary}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Cetak Ringkasan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Ganti Siswa
                </button>
              </div>
            </div>

            {/* Three Pillar Cards: Sesi Pagi (Masuk) | Sesi Siang (Pulang) | KBM (Kelas) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 1. Sesi Pagi / Gerbang Masuk */}
              <div className={`p-4 rounded-2xl border transition-all ${
                morningRecord
                  ? morningRecord.status === 'Hadir'
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : morningRecord.status === 'Terlambat'
                    ? 'bg-amber-50/80 border-amber-200'
                    : 'bg-blue-50/80 border-blue-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
                    1. Masuk Gerbang (Pagi)
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>

                {morningRecord ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-5 h-5 ${
                        morningRecord.status === 'Hadir' ? 'text-emerald-600' : 'text-amber-600'
                      }`} />
                      <span className="text-base font-black text-slate-900">
                        {morningRecord.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-600">
                      Pukul: {morningRecord.waktu} WIB
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {morningRecord.status === 'Hadir'
                        ? 'Tiba tepat waktu sebelum batas apel pagi.'
                        : 'Tercatat terlambat dari batas waktu kedatangan.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">Belum Scan Masuk</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Batas waktu tepat: {schoolConfig.jadwal?.pagiBatasTepatWaktu || '07:15'} WIB
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Sesi Siang / Gerbang Pulang */}
              <div className={`p-4 rounded-2xl border transition-all ${
                afternoonRecord
                  ? 'bg-indigo-50/80 border-indigo-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
                    2. Kepulangan (Siang)
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>

                {afternoonRecord ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      <span className="text-base font-black text-slate-900">
                        Sudah Scan Pulang
                      </span>
                    </div>
                    <p className="text-xs font-mono font-bold text-indigo-900">
                      Pukul: {afternoonRecord.waktu} WIB
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Siswa telah memindai kartu tanda kepulangan sekolah.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">Menunggu Jam Pulang</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Jadwal kepulangan: {schoolConfig.jadwal?.siangMulai || '12:00'} - {schoolConfig.jadwal?.siangBatasAkhir || '15:30'} WIB
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Kehadiran KBM di Dalam Kelas */}
              <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wide">
                    3. Presensi Tatap Muka (KBM)
                  </span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>

                {inClassRecords.directRecords.length > 0 || inClassRecords.journals.length > 0 ? (
                  <div className="space-y-1.5">
                    {inClassRecords.directRecords.map((cr) => (
                      <div key={cr.id} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 truncate max-w-[120px]">
                          {cr.mapel || 'Mata Pelajaran'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                          cr.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {cr.status} ({cr.waktu?.substring(0, 5)})
                        </span>
                      </div>
                    ))}
                    {inClassRecords.directRecords.length === 0 && (
                      <p className="text-[11px] text-slate-500">
                        {inClassRecords.journals.length} sesi pembelajaran tercatat oleh guru hari ini.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Belum ada sesi jurnal KBM kelas yang disimpan guru hari ini.
                  </p>
                )}
              </div>

            </div>

            {/* Attendance Consistency Check / Warning (Bolos / Selisih Status) */}
            {morningRecord && morningRecord.status === 'Hadir' && inClassRecords.directRecords.some((cr) => cr.status === 'Alpa') && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="block font-black text-rose-950">
                    Perhatian: Terdapat Catatan Tidak Hadir di Jam Pelajaran Tertentu!
                  </strong>
                  <p className="text-rose-800 mt-0.5 leading-relaxed">
                    Siswa tercatat melakukan pemindaian masuk gerbang pagi hari, namun pada salah satu mata pelajaran di ruang kelas tercatat berstatus tidak hadir/alpa. Silakan hubungi Wali Kelas atau Petugas Piket untuk verifikasi.
                  </p>
                </div>
              </div>
            )}

            {/* Rekap Kedisiplinan 7 Hari Terakhir & Statistik */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span>Rekap Kehadiran 7 Hari Terakhir</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Riwayat konsistensi kehadiran putra/putri Anda
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Tingkat Kedisiplinan:</span>
                  <span className="px-2.5 py-0.5 rounded-full font-black text-xs bg-emerald-100 text-emerald-800">
                    {attendanceStats.percentage}% Disiplin
                  </span>
                </div>
              </div>

              {/* Counter Badges: Hadir, Terlambat, Izin/Sakit, Alpa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 block">Total Hadir</span>
                  <span className="text-base font-black text-emerald-950">{attendanceStats.totalHadir} Kali</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] font-bold text-amber-800 block">Terlambat</span>
                  <span className="text-base font-black text-amber-950">{attendanceStats.totalTerlambat} Kali</span>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <span className="text-[10px] font-bold text-blue-800 block">Izin / Sakit</span>
                  <span className="text-base font-black text-blue-950">{attendanceStats.totalIzinSakit} Kali</span>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <span className="text-[10px] font-bold text-rose-800 block">Alpa / Tanpa Ket.</span>
                  <span className="text-base font-black text-rose-950">{attendanceStats.totalAlpa} Kali</span>
                </div>
              </div>

              {/* 7-Days Pills Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                {recentDaysHistory.map((day) => (
                  <div
                    key={day.dateIso}
                    className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                      day.status === 'Hadir'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : day.status === 'Terlambat'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : day.status === 'Izin' || day.status === 'Sakit'
                        ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                        : day.status === 'Alpa'
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold block">{day.dayName}</span>
                    <span className="text-xs font-black block">
                      {day.status === 'Belum Ada Data' ? '-' : day.status}
                    </span>
                    <span className="text-[9px] font-mono block opacity-75">
                      {day.time !== '-' ? day.time.substring(0, 5) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ======================================================== */}
            {/* TABEL RIWAYAT PRESENSI HARIAN MENDALAM                  */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Tabel Riwayat Presensi Harian Siswa
                    </h4>
                    <p className="text-xs text-slate-500">
                      Rincian status kehadiran (Hadir, Izin, Sakit, Alpa) dan jam pemindaian per tanggal
                    </p>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Semua', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setHistoryStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        historyStatusFilter === st
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3.5">Tanggal & Hari</th>
                      <th className="py-3 px-3.5">Sesi Pagi (Masuk)</th>
                      <th className="py-3 px-3.5">Sesi Siang (Pulang)</th>
                      <th className="py-3 px-3.5">Presensi KBM Kelas</th>
                      <th className="py-3 px-3.5 text-center">Status Kehadiran</th>
                      <th className="py-3 px-3.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDailyHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Tidak ada catatan presensi dengan status "{historyStatusFilter}".
                        </td>
                      </tr>
                    ) : (
                      filteredDailyHistory.map((item) => (
                        <tr 
                          key={item.dateIso}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            item.isToday ? 'bg-blue-50/20 font-medium' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900">{item.formattedDate}</span>
                              {item.isToday && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-black text-[9px] uppercase">
                                  Hari Ini
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block">{item.dateIso}</span>
                          </td>

                          {/* Sesi Pagi */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {item.morning ? (
                              <div>
                                <span className={`inline-flex items-center gap-1 font-bold ${
                                  item.morning.status === 'Hadir' ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  <span>{item.morning.waktu} WIB</span>
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {item.morning.status === 'Hadir' ? 'Tepat Waktu' : 'Terlambat'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          {/* Sesi Siang */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {item.afternoon ? (
                              <div className="text-indigo-900 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-600" />
                                <span>{item.afternoon.waktu} WIB</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          {/* KBM Kelas */}
                          <td className="py-3 px-3.5">
                            {item.classRecs.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                                <BookOpen className="w-3 h-3" />
                                <span>{item.classRecs.length} Mapel Diikuti</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.8 rounded-full font-black text-xs border ${
                              item.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : item.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : item.status === 'Izin'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : item.status === 'Sakit'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : item.status === 'Alpa'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>

                          {/* Catatan / Keterangan */}
                          <td className="py-3 px-3.5 text-slate-500 max-w-[180px] truncate text-[11px]">
                            {item.notes}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Summary */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1 px-1">
                <span>Total Data Ditampilkan: <strong className="text-slate-900">{filteredDailyHistory.length}</strong> tanggal</span>
                <span>Data tersimpan otomatis dari rekaman pemindai presensi</span>
              </div>
            </div>

            {/* Quick Actions: Lapor Izin / Sakit via WhatsApp */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <strong className="text-xs font-black text-blue-950 block">
                  Anak Tidak Masuk Karena Sakit / Ada Keperluan Keluarga?
                </strong>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Kirimkan konfirmasi izin resmi langsung via WhatsApp ke Petugas Piket Sekolah.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleLaporWhatsApp('Sakit')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Lapor Sakit (WA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLaporWhatsApp('Izin')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Lapor Izin (WA)</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* 4. JADWAL SEKOLAH & PANDUAN SISWA                        */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Jadwal Jam Presensi */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Jadwal & Batas Waktu Presensi
              </h3>
              <p className="text-xs text-slate-500">
                Aturan waktu kehadiran apel pagi dan kepulangan
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Sesi Pagi */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-amber-950 uppercase tracking-wide">
                  Sesi Pagi (Masuk / Apel)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                  Wajib
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Gerbang Dibuka:</span>
                  <strong className="text-slate-900 font-mono text-sm">{schoolConfig.jadwal?.pagiMulai || '06:30'} WIB</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Batas Tepat Waktu:</span>
                  <strong className="text-amber-800 font-mono text-sm">{schoolConfig.jadwal?.pagiBatasTepatWaktu || '07:15'} WIB</strong>
                </div>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 font-medium">
                * Siswa yang memindai kartu setelah pukul {schoolConfig.jadwal?.pagiBatasTepatWaktu || '07:15'} WIB akan tercatat berstatus <strong className="text-rose-600">Terlambat</strong>.
              </p>
            </div>

            {/* Sesi Siang */}
            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-indigo-950 uppercase tracking-wide">
                  Sesi Siang (Kepulangan)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-200 text-indigo-900">
                  Kepulangan
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Mulai Presensi:</span>
                  <strong className="text-slate-900 font-mono text-sm">{schoolConfig.jadwal?.siangMulai || '12:00'} WIB</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Batas Akhir:</span>
                  <strong className="text-indigo-900 font-mono text-sm">{schoolConfig.jadwal?.siangBatasAkhir || '15:30'} WIB</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Petunjuk Penggunaan untuk Siswa & Orang Tua */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Tata Cara Presensi Kartu QR
              </h3>
              <p className="text-xs text-slate-500">
                Langkah mudah memindai kehadiran di sekolah
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <strong className="text-slate-900 block font-bold">Siapkan Kartu Pelajar QR Code</strong>
                <p className="text-slate-500 mt-0.5">Pastikan kartu fisik atau gambar digital QR Code tidak kotor, terlipat, atau buram.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <strong className="text-slate-900 block font-bold">Arahkan ke Kamera Kiosk</strong>
                <p className="text-slate-500 mt-0.5">Posisikan kode QR di dalam kotak bidik kamera dengan jarak sekitar 15 - 25 cm.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <strong className="text-slate-900 block font-bold">Dengarkan Suara Notifikasi</strong>
                <p className="text-slate-500 mt-0.5">Sistem akan membunyikan nada dan memunculkan foto, nama, kelas, serta waktu scan.</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Jika kartu tertinggal, siswa dapat melaporkan NISN kepada Guru Piket untuk diinput manual.</span>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. PERTANYAAN UMUM ORANG TUA (FAQ)                      */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Pertanyaan yang Sering Diajukan Orang Tua (FAQ)
            </h3>
            <p className="text-xs text-slate-500">
              Informasi seputar kartu presensi digital dan absensi harian
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            {
              q: 'Bagaimana jika kartu pelajar fisik anak saya hilang atau tertinggal di rumah?',
              a: 'Orang tua dapat membuka menu pencarian di halaman ini, lalu klik tombol "Kartu QR Digital". Gambar kode QR dapat disimpan ke galeri HP anak dan diarahkan ke kamera scanner kiosk di gerbang sekolah, atau siswa cukup melaporkan NISN ke Petugas Piket.'
            },
            {
              q: 'Apakah presensi kelas (KBM) juga terpantau di sini?',
              a: 'Ya, saat guru memulai jam mata pelajaran di kelas dan melakukan absensi (baik scan QR di kelas atau verifikasi tatap muka), status kehadiran per mata pelajaran akan tercatat secara real-time.'
            },
            {
              q: 'Bagaimana cara mengajukan izin jika anak sedang sakit?',
              a: 'Orang tua dapat mencari nama anak di halaman ini, lalu menekan tombol "Lapor Sakit (WA)" atau "Lapor Izin (WA)". Pesan konfirmasi resmi siap kirim akan langsung tersusun dan terhubung ke WhatsApp Petugas Piket Sekolah.'
            }
          ].map((faq, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 bg-slate-50/60 hover:bg-slate-50 font-bold text-xs sm:text-sm text-slate-800 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-90' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. FOOTER KONTAK & ALAMAT SEKOLAH                        */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{schoolConfig.alamat}, {schoolConfig.kota}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Kontak Piket & Informasi: <strong className="text-slate-900">{schoolConfig.kontak}</strong></span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: KARTU QR DIGITAL SISWA (UNTUK CADANGAN ORANG TUA) */}
      {/* ======================================================== */}
      {isDigitalCardOpen && selectedStudent && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setIsDigitalCardOpen(false)}
          className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh] my-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 text-white text-center relative shrink-0">
              <button
                type="button"
                onClick={() => setIsDigitalCardOpen(false)}
                className="absolute right-3 top-3 p-1 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-extrabold text-sm text-white">Kartu QR Presensi Digital</h4>
              <p className="text-[11px] text-blue-100">{schoolConfig.namaSekolah}</p>
            </div>

            {/* Content: QR Code & Student Data */}
            <div className="p-5 text-center space-y-3.5 overflow-y-auto flex-1">
              <div className="w-44 h-44 mx-auto p-2 bg-white rounded-2xl border-2 border-dashed border-blue-400 shadow-inner flex items-center justify-center shrink-0">
                {isGeneratingQr ? (
                  <div className="text-xs text-slate-400 animate-pulse">Menghasilkan QR...</div>
                ) : digitalQrUrl ? (
                  <img src={digitalQrUrl} alt={`QR ${selectedStudent.nama}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-rose-500">Gagal memuat QR</div>
                )}
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                  Kelas {selectedStudent.kelas}
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">{selectedStudent.nama}</h3>
                <p className="font-mono text-xs text-slate-500">NISN: {selectedStudent.nisn}</p>
              </div>

              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Simpan gambar QR ini di galeri ponsel anak untuk cadangan saat kartu fisik tertinggal.
              </p>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadQrImage}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Simpan QR</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDigitalCardOpen(false)}
                className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
