import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Filter, 
  Printer, 
  Award, 
  TrendingUp, 
  Layers,
  ShieldCheck,
  BookOpen,
  Calendar,
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Info,
  X
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  SchoolConfig, 
  KalenderHeb, 
  TeachingJournal, 
  TeacherUser 
} from '../types';
import { exportApelRecapExcel, exportLearningRecapExcel } from '../utils/exportExcel';
import { generateApelRecapPdf, generateLearningRecapPdf, generateTeachingJournalsPdf } from '../utils/exportPdf';
import { SchoolLogo } from '../assets/schoolLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isSubjectMatch, isSubjectAllowedForTeacher, isClassMatch } from '../utils/teacherFilter';

interface ReportsProps {
  students: Student[];
  records: AttendanceRecord[];
  schoolConfig: SchoolConfig;
  kalenderHeb: KalenderHeb;
  journals?: TeachingJournal[];
  teachers?: TeacherUser[];
  initialReportType?: 'apel' | 'kbm';
}

export const Reports: React.FC<ReportsProps> = ({
  students,
  records,
  schoolConfig,
  kalenderHeb,
  journals = [],
  teachers = [],
  initialReportType,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();

  // Active Report Category: 'apel' (Absensi Apel Pagi & Siang) OR 'kbm' (Absensi Pembelajaran Guru)
  const [reportType, setReportType] = useState<'apel' | 'kbm'>(
    initialReportType || (user?.role === 'guru' ? 'kbm' : 'apel')
  );

  React.useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType]);

  React.useEffect(() => {
    if (user?.role === 'guru' && user.nama) {
      setSelectedTeacher(user.nama);
      if (user.mapel) {
        setSelectedMapel(user.mapel);
      }
      setReportType('kbm');
    }
  }, [user]);

  // Common Filters
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [filterMode, setFilterMode] = useState<'bulan' | 'tanggal'>('bulan');
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Apel Specific Filter: 'Semua' | 'Pagi' | 'Siang'
  const [apelSessionFilter, setApelSessionFilter] = useState<'Semua' | 'Pagi' | 'Siang'>('Semua');

  // KBM Specific Filters
  const [selectedMapel, setSelectedMapel] = useState<string>(
    user?.role === 'guru' && user.mapel ? user.mapel : 'Semua'
  );
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    user?.role === 'guru' ? user.nama : 'Semua'
  );
  const [kbmSubView, setKbmSubView] = useState<'students' | 'journals'>('students');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const classesList = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

  // Distinct subjects from journals and teachers
  const mapelList = useMemo(() => {
    const set = new Set<string>();
    journals.forEach((j) => { if (j.mapel) set.add(j.mapel); });
    teachers.forEach((t) => {
      if (t.mapel) set.add(t.mapel);
      t.penugasanMapel?.forEach((p) => { if (p.mapel) set.add(p.mapel); });
    });
    return Array.from(set).sort();
  }, [journals, teachers]);

  // If user is a guru, prioritize/limit to their specific subjects
  const teacherMapelList = useMemo(() => {
    if (user?.role === 'guru') {
      const set = new Set<string>();
      if (user.mapel) set.add(user.mapel);
      user.penugasanMapel?.forEach((p) => { if (p.mapel) set.add(p.mapel); });
      journals.forEach((j) => {
        if (j.guruNama?.toLowerCase() === user.nama?.toLowerCase() && j.mapel) {
          set.add(j.mapel);
        }
      });
      const list = Array.from(set).sort();
      return list.length > 0 ? list : mapelList;
    }
    return mapelList;
  }, [user, journals, mapelList]);

  const currentTeacherObj = useMemo(() => {
    const targetName = user?.role === 'guru' ? user.nama : selectedTeacher;
    if (targetName === 'Semua') return null;
    return teachers.find(
      (t) => t.nama.toLowerCase() === targetName.toLowerCase() || t.username === targetName
    ) || null;
  }, [user, selectedTeacher, teachers]);

  // Calculate Target HEB for selected month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const totalHebDays = useMemo(() => {
    let heb = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (kalenderHeb.kalenderData?.[key] !== false) {
        heb++;
      }
    }
    return heb;
  }, [selectedYear, selectedMonth, daysInMonth, kalenderHeb]);

  const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const activeStartDate = filterMode === 'bulan' ? `${monthPrefix}-01` : customStartDate;
  const activeEndDate = filterMode === 'bulan' ? `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}` : customEndDate;

  // =========================================================
  // 1. DATA COMPUTATION FOR REPORT 1: ABSENSI APEL (PAGI & SIANG)
  // =========================================================
  const apelRecords = useMemo(() => {
    return records.filter((r) => {
      // Must be strictly Apel (not in-class KBM)
      const isApel = r.kategori === 'APEL' || (!r.kategori && !r.id.startsWith('PRESENSI_KBM_') && !r.mapel);
      if (!isApel) return false;
      if (filterMode === 'bulan') {
        if (!r.tanggal.startsWith(monthPrefix)) return false;
      } else {
        if (r.tanggal < activeStartDate || r.tanggal > activeEndDate) return false;
      }
      if (apelSessionFilter !== 'Semua' && r.sesi !== apelSessionFilter) return false;
      return true;
    });
  }, [records, filterMode, monthPrefix, activeStartDate, activeEndDate, apelSessionFilter]);

  const filteredStudents = useMemo(() => {
    let list = selectedClass === 'Semua'
      ? students
      : students.filter((s) => s.kelas === selectedClass);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
    }
    return list;
  }, [students, selectedClass, searchQuery]);

  const apelSummaryRows = useMemo(() => {
    const targetKehadiran = apelSessionFilter === 'Semua' ? totalHebDays * 2 : totalHebDays;

    return filteredStudents.map((s, idx) => {
      const sRecords = apelRecords.filter((r) => r.nisn === s.nisn);
      
      const pagiRecords = sRecords.filter((r) => r.sesi === 'Pagi');
      const siangRecords = sRecords.filter((r) => r.sesi === 'Siang');

      const pagiHadir = pagiRecords.filter((r) => r.status === 'Hadir').length;
      const pagiTelat = pagiRecords.filter((r) => r.status === 'Terlambat').length;
      const siangHadir = siangRecords.filter((r) => r.status === 'Hadir').length;

      const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
      const izin = sRecords.filter((r) => r.status === 'Izin').length;
      const alpa = sRecords.filter((r) => r.status === 'Alpa').length;

      const totalHadirApel = pagiHadir + pagiTelat + siangHadir;
      const persentase = targetKehadiran > 0 
        ? Math.min(100, Math.round((totalHadirApel / targetKehadiran) * 100)) 
        : 0;

      return {
        no: idx + 1,
        student: s,
        pagiHadir,
        pagiTelat,
        siangHadir,
        sakit,
        izin,
        alpa,
        totalHadirApel,
        targetKehadiran,
        persentase,
      };
    });
  }, [filteredStudents, apelRecords, totalHebDays, apelSessionFilter]);

  // Overall Apel KPI
  const avgApelPercentage = useMemo(() => {
    if (apelSummaryRows.length === 0) return 0;
    const sum = apelSummaryRows.reduce((acc, r) => acc + r.persentase, 0);
    return Math.round(sum / apelSummaryRows.length);
  }, [apelSummaryRows]);

  const totalApelPagiHadir = useMemo(() => {
    return apelRecords.filter((r) => r.sesi === 'Pagi' && (r.status === 'Hadir' || r.status === 'Terlambat')).length;
  }, [apelRecords]);

  const totalApelSiangHadir = useMemo(() => {
    return apelRecords.filter((r) => r.sesi === 'Siang' && r.status === 'Hadir').length;
  }, [apelRecords]);

  // =========================================================
  // 2. DATA COMPUTATION FOR REPORT 2: ABSENSI PEMBELAJARAN (KBM)
  // =========================================================
  const kbmJournals = useMemo(() => {
    const targetGuru = user?.role === 'guru' ? user.nama : selectedTeacher;

    return journals.filter((j) => {
      if (filterMode === 'bulan') {
        if (!j.tanggal.startsWith(monthPrefix)) return false;
      } else {
        if (j.tanggal < activeStartDate || j.tanggal > activeEndDate) return false;
      }
      if (user?.role === 'guru') {
        if (selectedMapel !== 'Semua') {
          if (!isSubjectMatch(j.mapel, selectedMapel)) return false;
        } else {
          if (!isSubjectAllowedForTeacher(user, j.mapel)) return false;
        }
        if (j.guruNama.toLowerCase() !== user.nama.toLowerCase() && j.guruId !== user.id) {
          if (!isSubjectAllowedForTeacher(user, j.mapel)) return false;
        }
      } else {
        if (selectedMapel !== 'Semua' && !isSubjectMatch(j.mapel, selectedMapel)) return false;
        if (targetGuru !== 'Semua' && j.guruNama.toLowerCase() !== targetGuru.toLowerCase() && j.guruId !== targetGuru) return false;
      }
      if (selectedClass !== 'Semua' && !isClassMatch(j.kelas, selectedClass)) return false;
      return true;
    });
  }, [journals, filterMode, monthPrefix, activeStartDate, activeEndDate, selectedMapel, user, selectedTeacher, selectedClass]);

  const kbmClassRecords = useMemo(() => {
    return records.filter((r) => {
      // Must be KELAS / PEMBELAJARAN
      const isKbm = r.kategori === 'KELAS' || r.kategori === 'PEMBELAJARAN' || r.id.startsWith('PRESENSI_KBM_') || !!r.mapel;
      if (!isKbm) return false;
      if (filterMode === 'bulan') {
        if (!r.tanggal.startsWith(monthPrefix)) return false;
      } else {
        if (r.tanggal < activeStartDate || r.tanggal > activeEndDate) return false;
      }
      if (user?.role === 'guru') {
        if (selectedMapel !== 'Semua') {
          if (!isSubjectMatch(r.mapel, selectedMapel)) return false;
        } else {
          if (!isSubjectAllowedForTeacher(user, r.mapel)) return false;
        }
      } else {
        if (selectedMapel !== 'Semua' && !isSubjectMatch(r.mapel, selectedMapel)) return false;
      }
      if (selectedClass !== 'Semua' && !isClassMatch(r.kelas, selectedClass)) return false;
      return true;
    });
  }, [records, filterMode, monthPrefix, activeStartDate, activeEndDate, selectedMapel, selectedClass, user]);

  const totalKbmPertemuan = kbmJournals.length;

  const kbmStudentSummaryRows = useMemo(() => {
    return filteredStudents.map((s, idx) => {
      const sRecords = kbmClassRecords.filter((r) => r.nisn === s.nisn);
      const hadir = sRecords.filter((r) => r.status === 'Hadir').length;
      const terlambat = sRecords.filter((r) => r.status === 'Terlambat').length;
      const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
      const izin = sRecords.filter((r) => r.status === 'Izin').length;
      const alpa = sRecords.filter((r) => r.status === 'Alpa').length;

      const totalHadir = hadir + terlambat;
      const totalPertemuanTarget = totalKbmPertemuan > 0 ? totalKbmPertemuan : sRecords.length;
      const persentase = totalPertemuanTarget > 0 
        ? Math.min(100, Math.round((totalHadir / totalPertemuanTarget) * 100)) 
        : 100;

      return {
        no: idx + 1,
        student: s,
        mapel: selectedMapel === 'Semua' ? 'Seluruh Mapel KBM' : selectedMapel,
        totalPertemuan: totalPertemuanTarget,
        hadir,
        terlambat,
        sakit,
        izin,
        alpa,
        totalHadir,
        persentase,
        predikat: persentase >= 85 ? 'Tuntas' : (persentase >= 75 ? 'Cukup' : 'Perlu Pembinaan'),
      };
    });
  }, [filteredStudents, kbmClassRecords, totalKbmPertemuan, selectedMapel]);

  const avgKbmPercentage = useMemo(() => {
    if (kbmStudentSummaryRows.length === 0) return 0;
    const sum = kbmStudentSummaryRows.reduce((acc, r) => acc + r.persentase, 0);
    return Math.round(sum / kbmStudentSummaryRows.length);
  }, [kbmStudentSummaryRows]);

  const tuntasKbmCount = useMemo(() => {
    return kbmStudentSummaryRows.filter((r) => r.persentase >= 85).length;
  }, [kbmStudentSummaryRows]);

  const perluPembinaanKbmCount = useMemo(() => {
    return kbmStudentSummaryRows.filter((r) => r.persentase < 75).length;
  }, [kbmStudentSummaryRows]);

  // =========================================================
  // EXPORT HANDLERS & STATUS
  // =========================================================
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setExportNotice({ text, type });
    if (type === 'success') {
      toast.success('Laporan Siap', text);
    } else if (type === 'error') {
      toast.error('Gagal Mengunduh', text);
    } else {
      toast.info('Menyiapkan Laporan', text);
    }
    setTimeout(() => setExportNotice(null), 4500);
  };

  const handleExportApelExcel = () => {
    try {
      exportApelRecapExcel(
        students,
        records,
        apelSessionFilter,
        monthNames[selectedMonth],
        selectedYear,
        totalHebDays,
        schoolConfig,
        selectedClass
      );
      showNotice('File Excel Rekap Presensi Apel berhasil diunduh!');
    } catch (e) {
      console.error(e);
      showNotice('Gagal mengekspor file Excel.', 'error');
    }
  };

  const handleExportApelPdf = () => {
    setIsExporting(true);
    showNotice('Menyusun PDF Rekap Presensi Apel Resmi...', 'info');
    setTimeout(() => {
      try {
        generateApelRecapPdf(
          students,
          records,
          apelSessionFilter,
          monthNames[selectedMonth],
          selectedYear,
          totalHebDays,
          schoolConfig,
          selectedClass,
          { startDate: activeStartDate, endDate: activeEndDate }
        );
        showNotice(`Dokumen PDF Rekapitulasi Presensi (${activeStartDate} s/d ${activeEndDate}) berhasil diunduh!`);
      } catch (e) {
        console.error(e);
        showNotice('Gagal menyusun PDF presensi apel.', 'error');
      } finally {
        setIsExporting(false);
      }
    }, 120);
  };

  const handleExportKbmExcel = () => {
    try {
      exportLearningRecapExcel(
        students,
        records,
        journals,
        selectedMapel,
        selectedTeacher,
        selectedClass,
        monthNames[selectedMonth],
        selectedYear,
        schoolConfig
      );
      showNotice('File Excel Rekap Presensi KBM berhasil diunduh!');
    } catch (e) {
      console.error(e);
      showNotice('Gagal mengekspor file Excel.', 'error');
    }
  };

  const handleExportKbmPdf = () => {
    setIsExporting(true);
    showNotice('Menyusun PDF Rekapitulasi Presensi KBM Siswa...', 'info');
    setTimeout(() => {
      try {
        const teacherInfo = {
          nama: user?.role === 'guru' ? user.nama : (selectedTeacher !== 'Semua' ? selectedTeacher : (journals[0]?.guruNama || 'Guru Mata Pelajaran')),
          nip: (user?.role === 'guru' ? user.nip : currentTeacherObj?.nip) || '-',
          mapel: user?.role === 'guru' ? (selectedMapel !== 'Semua' ? selectedMapel : (user.mapel || '')) : (selectedMapel !== 'Semua' ? selectedMapel : ''),
        };

        generateLearningRecapPdf(
          students,
          records,
          journals,
          selectedMapel,
          selectedTeacher,
          selectedClass,
          monthNames[selectedMonth],
          selectedYear,
          schoolConfig,
          teacherInfo
        );
        showNotice(`Dokumen PDF Rekap KBM (${selectedMapel} - ${monthNames[selectedMonth]} ${selectedYear}) berhasil diunduh!`);
      } catch (e) {
        console.error(e);
        showNotice('Gagal menyusun PDF presensi KBM.', 'error');
      } finally {
        setIsExporting(false);
      }
    }, 120);
  };

  const handleExportTeachingJournalsPdf = () => {
    setIsExporting(true);
    showNotice('Menyusun PDF Buku Agenda Catatan Jurnal KBM Guru...', 'info');
    setTimeout(() => {
      try {
        const teacherInfo = {
          nama: user?.role === 'guru' ? user.nama : (selectedTeacher !== 'Semua' ? selectedTeacher : (journals[0]?.guruNama || 'Guru Mata Pelajaran')),
          nip: (user?.role === 'guru' ? user.nip : currentTeacherObj?.nip) || '-',
          mapel: user?.role === 'guru' ? (selectedMapel !== 'Semua' ? selectedMapel : (user.mapel || '')) : (selectedMapel !== 'Semua' ? selectedMapel : ''),
        };

        generateTeachingJournalsPdf(
          journals,
          schoolConfig,
          selectedTeacher,
          selectedClass,
          selectedMapel,
          monthNames[selectedMonth],
          selectedYear,
          teacherInfo
        );
        showNotice(`Dokumen PDF Buku Agenda Jurnal Mengajar (${selectedClass} - ${monthNames[selectedMonth]} ${selectedYear}) berhasil diunduh!`);
      } catch (e) {
        console.error(e);
        showNotice('Gagal menyusun PDF jurnal KBM.', 'error');
      } finally {
        setIsExporting(false);
      }
    }, 120);
  };

  return (
    <div className="space-y-6">

      {/* Floating / Top Notice for Export Feedback */}
      {exportNotice && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm ${
          exportNotice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : exportNotice.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
            {exportNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : exportNotice.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            <span>{exportNotice.text}</span>
          </div>
          <button 
            type="button"
            onClick={() => setExportNotice(null)} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* 1. TOP HEADER & REPORT CATEGORY SWITCHER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-3.5">
          <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Pusat Rekap Laporan Presensi Resmi
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase tracking-wide">
                SMP PGRI 1 Cikadu
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dua format rekap terpisah: <strong>Absensi Apel Gerbang (Pagi/Siang)</strong> dan <strong>Absensi Pembelajaran KBM (Guru)</strong>.
            </p>
          </div>
        </div>

        {/* Big Tab Selector */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
          <button
            type="button"
            onClick={() => setReportType('apel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
              reportType === 'apel'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <div className="text-left">
              <div className="leading-none">Rekap Absensi Apel</div>
              <div className={`text-[9px] mt-0.5 font-normal ${reportType === 'apel' ? 'text-blue-100' : 'text-slate-400'}`}>
                Petugas Piket • Pagi & Siang
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setReportType('kbm')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
              reportType === 'kbm'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <div className="text-left">
              <div className="leading-none">Rekap Absensi Pembelajaran</div>
              <div className={`text-[9px] mt-0.5 font-normal ${reportType === 'kbm' ? 'text-indigo-100' : 'text-slate-400'}`}>
                Guru Mata Pelajaran • KBM Kelas
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. FILTER CONTROLS BAR */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterMode('bulan')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'bulan' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('tanggal')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'tanggal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rentang Tanggal
              </button>
            </div>

            {filterMode === 'bulan' ? (
              <>
                {/* Filter Month */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Year */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                />
                <span className="text-slate-400 text-xs">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
                />
              </div>
            )}

            {/* Filter Class */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="Semua">Semua Kelas</option>
                {classesList.map((c) => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>

            {/* Conditional Filter for Apel vs KBM */}
            {reportType === 'apel' ? (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['Semua', 'Pagi', 'Siang'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setApelSessionFilter(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      apelSessionFilter === s
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'Pagi' && <Sun className="w-3 h-3" />}
                    {s === 'Siang' && <Moon className="w-3 h-3" />}
                    <span>{s === 'Semua' ? 'Pagi & Siang' : `Sesi ${s}`}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Filter Mapel */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <select
                    value={selectedMapel}
                    onChange={(e) => setSelectedMapel(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-hidden cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="Semua">{user?.role === 'guru' ? 'Semua Mapel Saya' : 'Semua Mata Pelajaran'}</option>
                    {teacherMapelList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Guru */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  {user?.role === 'guru' ? (
                    <div className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg max-w-[220px] truncate">
                      Guru: <span className="font-black">{user.nama}</span>
                    </div>
                  ) : (
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-hidden cursor-pointer max-w-[180px] truncate"
                    >
                      <option value="Semua">Semua Guru</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.nama}>{t.nama}</option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reportType === 'apel' ? handleExportApelExcel : handleExportKbmExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Unduh Laporan ke Format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel {reportType === 'apel' ? 'Apel' : 'KBM'}</span>
            </button>

            {reportType === 'apel' ? (
              <button
                type="button"
                onClick={handleExportApelPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Cetak & Arsipkan Rekap Presensi Apel Resmi ke Format Dokumen PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak PDF Presensi Apel</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleExportKbmPdf}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Cetak Rekap Presensi KBM Siswa ke Format PDF Resmi"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF Presensi Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTeachingJournalsPdf}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Cetak Buku Agenda Catatan Jurnal KBM Guru ke Dokumen PDF Resmi"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Cetak PDF Jurnal Guru</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search bar inside filter */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa berdasarkan nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {reportType === 'kbm' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Tampilan KBM:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setKbmSubView('students')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    kbmSubView === 'students'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rekap Kehadiran Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setKbmSubView('journals')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    kbmSubView === 'journals'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buku Agenda Jurnal Guru ({kbmJournals.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. REPORT TAB 1: ABSENSI APEL PAGI & SIANG                */}
      {/* ========================================================= */}
      {reportType === 'apel' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target HEB Sekolah</span>
              <span className="text-base font-extrabold text-blue-600 mt-1 block">
                {totalHebDays} Hari Efektif
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {apelSessionFilter === 'Semua' ? `${totalHebDays * 2} Sesi (Pagi & Siang)` : `Sesi ${apelSessionFilter}`}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-rata Kehadiran Apel</span>
              <span className={`text-base font-extrabold mt-1 block ${
                avgApelPercentage >= 85 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {avgApelPercentage}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Target ketuntasan &ge; 85%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scan Apel Pagi</span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {totalApelPagiHadir} Hadir
              </span>
              <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                Sesi Kedatangan Gerbang
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scan Apel Siang</span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {totalApelSiangHadir} Hadir
              </span>
              <span className="text-[10px] text-sky-600 font-bold block mt-0.5">
                Sesi Kepulangan Siswa
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Siswa Terfilter</span>
              <span className="text-base font-extrabold text-slate-800 mt-1 block">
                {filteredStudents.length} Siswa
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {selectedClass === 'Semua' ? 'Seluruh Kelas' : `Kelas ${selectedClass}`}
              </span>
            </div>
          </div>

          {/* Table Apel */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Tabel Rekapitulasi Presensi Apel Pagi & Siang
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Bulan: <strong>{monthNames[selectedMonth]} {selectedYear}</strong> • Sesi: <strong>{apelSessionFilter}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleExportApelPdf}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Cetak & Unduh Dokumen PDF Resmi Presensi Apel"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF Apel</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3 w-28 font-mono">NISN</th>
                    <th className="py-3 px-4">Nama Lengkap Siswa</th>
                    <th className="py-3 px-2 text-center w-12">L/P</th>
                    <th className="py-3 px-2 text-center w-16">Kelas</th>
                    <th className="py-3 px-2 text-center bg-emerald-50 text-emerald-800" title="Apel Pagi: Hadir / Terlambat">
                      Pagi (H/T)
                    </th>
                    <th className="py-3 px-2 text-center bg-sky-50 text-sky-800" title="Apel Siang: Hadir">
                      Siang (H)
                    </th>
                    <th className="py-3 px-2 text-center text-amber-700">Sakit</th>
                    <th className="py-3 px-2 text-center text-indigo-700">Izin</th>
                    <th className="py-3 px-2 text-center text-rose-700">Alpa</th>
                    <th className="py-3 px-3 text-center font-black text-blue-700">Total Masuk</th>
                    <th className="py-3 px-3 text-center text-slate-500">Target</th>
                    <th className="py-3 px-4 text-right">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apelSummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        Tidak ada data siswa yang cocok dengan filter kriteria di atas.
                      </td>
                    </tr>
                  ) : (
                    apelSummaryRows.map((r) => (
                      <tr key={r.student.nisn} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-400 text-center">{r.no}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">{r.student.nisn}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{r.student.nama}</td>
                        <td className="py-3 px-2 text-center font-bold text-slate-500">{r.student.jk}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-extrabold text-slate-700">
                            {r.student.kelas}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center bg-emerald-50/50 font-bold text-emerald-700">
                          {r.pagiHadir}{r.pagiTelat > 0 ? ` (+${r.pagiTelat}T)` : ''}
                        </td>
                        <td className="py-3 px-2 text-center bg-sky-50/50 font-bold text-sky-700">
                          {r.siangHadir}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-amber-600">{r.sakit || '-'}</td>
                        <td className="py-3 px-2 text-center font-bold text-indigo-600">{r.izin || '-'}</td>
                        <td className="py-3 px-2 text-center font-bold text-rose-600">{r.alpa || '-'}</td>
                        <td className="py-3 px-3 text-center font-black text-blue-700">{r.totalHadirApel}</td>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">{r.targetKehadiran}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                              <div 
                                className={`h-full rounded-full ${r.persentase >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                style={{ width: `${r.persentase}%` }} 
                              />
                            </div>
                            <span className={`font-mono font-black text-xs ${
                              r.persentase >= 85 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {r.persentase}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. REPORT TAB 2: ABSENSI PEMBELAJARAN (KBM GURU)           */}
      {/* ========================================================= */}
      {reportType === 'kbm' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Summary KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pertemuan Terlaksana</span>
              <span className="text-base font-extrabold text-indigo-600 mt-1 block">
                {totalKbmPertemuan} Pertemuan
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Mapel: {selectedMapel === 'Semua' ? 'Seluruh Mapel' : selectedMapel}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-rata Kehadiran KBM</span>
              <span className={`text-base font-extrabold mt-1 block ${
                avgKbmPercentage >= 85 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {avgKbmPercentage}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Kriteria ketuntasan &ge; 85%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Siswa Kehadiran Tuntas</span>
              <span className="text-base font-extrabold text-emerald-600 mt-1 block">
                {tuntasKbmCount} Siswa
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Kehadiran di KBM &ge; 85%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Perlu Pembinaan Guru</span>
              <span className={`text-base font-extrabold mt-1 block ${
                perluPembinaanKbmCount > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}>
                {perluPembinaanKbmCount} Siswa
              </span>
              <span className="text-[10px] text-rose-500 font-bold block mt-0.5">
                Kehadiran di KBM &lt; 75%
              </span>
            </div>
          </div>

          {/* Sub View 1: Rekap Siswa di KBM */}
          {kbmSubView === 'students' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Rekapitulasi Kehadiran Siswa pada Pembelajaran (KBM)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Mapel: <strong className="text-indigo-700">{selectedMapel}</strong> • Kelas: <strong>{selectedClass}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleExportKbmPdf}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Cetak & Unduh Dokumen PDF Resmi Presensi KBM Siswa"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF Presensi</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3 w-28 font-mono">NISN</th>
                      <th className="py-3 px-4">Nama Lengkap Siswa</th>
                      <th className="py-3 px-2 text-center w-12">L/P</th>
                      <th className="py-3 px-2 text-center w-16">Kelas</th>
                      <th className="py-3 px-3">Mata Pelajaran</th>
                      <th className="py-3 px-2 text-center font-bold text-slate-700">Total TM</th>
                      <th className="py-3 px-2 text-center text-emerald-700">Hadir</th>
                      <th className="py-3 px-2 text-center text-amber-700">Telat</th>
                      <th className="py-3 px-2 text-center text-sky-700">Sakit</th>
                      <th className="py-3 px-2 text-center text-indigo-700">Izin</th>
                      <th className="py-3 px-2 text-center text-rose-700">Alpa</th>
                      <th className="py-3 px-3 text-right">% Kehadiran</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kbmStudentSummaryRows.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-slate-400">
                          Tidak ada data catatan presensi KBM yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      kbmStudentSummaryRows.map((r) => (
                        <tr key={r.student.nisn} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-400 text-center">{r.no}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">{r.student.nisn}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{r.student.nama}</td>
                          <td className="py-3 px-2 text-center font-bold text-slate-500">{r.student.jk}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-extrabold text-slate-700">
                              {r.student.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-indigo-700 truncate max-w-[150px]">
                            {r.mapel}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                            {r.totalPertemuan}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-emerald-700">{r.hadir}</td>
                          <td className="py-3 px-2 text-center font-bold text-amber-600">{r.terlambat || '-'}</td>
                          <td className="py-3 px-2 text-center font-bold text-sky-600">{r.sakit || '-'}</td>
                          <td className="py-3 px-2 text-center font-bold text-indigo-600">{r.izin || '-'}</td>
                          <td className="py-3 px-2 text-center font-bold text-rose-600">{r.alpa || '-'}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-mono font-black text-xs ${
                              r.persentase >= 85 ? 'text-emerald-600' : (r.persentase >= 75 ? 'text-amber-600' : 'text-rose-600')
                            }`}>
                              {r.persentase}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              r.predikat === 'Tuntas' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : (r.predikat === 'Cukup' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                            }`}>
                              {r.predikat}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Sub View 2: Buku Agenda Jurnal Guru KBM */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Buku Agenda Catatan Pelaksanaan Jurnal KBM Guru
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold hidden sm:inline">
                    Total {kbmJournals.length} Catatan Pertemuan
                  </span>
                  <button
                    type="button"
                    onClick={handleExportTeachingJournalsPdf}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Cetak & Unduh Dokumen PDF Resmi Buku Agenda Jurnal Mengajar Guru"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak PDF Buku Agenda</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">No</th>
                      <th className="py-3 px-3 w-24">Tanggal & Jam</th>
                      <th className="py-3 px-3">Guru Pengajar</th>
                      <th className="py-3 px-3">Mata Pelajaran</th>
                      <th className="py-3 px-2 text-center w-16">Kelas</th>
                      <th className="py-3 px-2 text-center w-14">TM</th>
                      <th className="py-3 px-4">Materi Pokok / Agenda</th>
                      <th className="py-3 px-3 text-center">Presensi KBM</th>
                      <th className="py-3 px-3 text-right">% Masuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kbmJournals.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          Belum ada jurnal KBM yang tercatat pada kriteria pencarian ini.
                        </td>
                      </tr>
                    ) : (
                      kbmJournals.map((j, idx) => (
                        <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{j.tanggal}</div>
                            <div className="text-[10px] text-slate-400">{j.jamPelajaran || '-'}</div>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">{j.guruNama}</td>
                          <td className="py-3 px-3 font-bold text-indigo-700">{j.mapel}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                              {j.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                            P-{j.pertemuanKe}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{j.materiPokok}</div>
                            {j.kegiatanPembelajaran && (
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {j.kegiatanPembelajaran}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <span className="text-emerald-700 font-bold">{j.hadir}H</span>
                              {j.terlambat > 0 && <span className="text-amber-700 font-bold">+{j.terlambat}T</span>}
                              {j.sakit > 0 && <span className="text-sky-700">{j.sakit}S</span>}
                              {j.izin > 0 && <span className="text-indigo-700">{j.izin}I</span>}
                              {j.alpa > 0 && <span className="text-rose-700 font-bold">{j.alpa}A</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-black text-xs text-emerald-600">
                              {j.persentaseKehadiran}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
