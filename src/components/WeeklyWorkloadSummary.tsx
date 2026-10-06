import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  TrendingUp, 
  User, 
  Users, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Printer, 
  FileSpreadsheet, 
  Award, 
  Layers, 
  CheckCheck,
  Zap,
  Info,
  ArrowUpRight
} from 'lucide-react';
import { 
  TeachingJournal, 
  ClassScheduleItem, 
  TeacherUser, 
  SchoolConfig, 
  Student, 
  DayOfWeek 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isClassMatch } from '../utils/teacherFilter';
import { SchoolLogo } from '../assets/schoolLogo';
import jsPDF from 'jspdf';

interface WeeklyWorkloadSummaryProps {
  journals: TeachingJournal[];
  schedules: ClassScheduleItem[];
  teachers: TeacherUser[];
  schoolConfig: SchoolConfig;
  students: Student[];
  onStartJournalFromSchedule?: (schedule: ClassScheduleItem) => void;
}

// Calculate JP (Jam Pelajaran) count from schedule
export function calculateScheduleJP(sch: ClassScheduleItem): number {
  if (sch.jamKe) {
    const parts = sch.jamKe.split('-').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n));
    if (parts.length === 2 && parts[1] >= parts[0]) {
      return parts[1] - parts[0] + 1;
    } else if (parts.length === 1) {
      return 1;
    }
  }
  if (sch.jamMulai && sch.jamSelesai) {
    const [h1, m1] = sch.jamMulai.split(':').map(Number);
    const [h2, m2] = sch.jamSelesai.split(':').map(Number);
    const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMinutes > 0) {
      return Math.max(1, Math.round(diffMinutes / 40));
    }
  }
  return 2; // Default 2 JP per meeting
}

// Get dates for a given week offset (0 = current week, -1 = last week, etc.)
function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offsetWeeks * 7);
  const day = now.getDay(); // 0 is Sunday
  
  // Calculate Monday of this week
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Saturday of this week
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const label = `${monday.toLocaleDateString('id-ID', options)} - ${saturday.toLocaleDateString('id-ID', options)}`;

  return {
    startDate: formatDate(monday),
    endDate: formatDate(saturday),
    label,
    monday,
    saturday
  };
}

export const WeeklyWorkloadSummary: React.FC<WeeklyWorkloadSummaryProps> = ({
  journals,
  schedules,
  teachers,
  schoolConfig,
  students,
  onStartJournalFromSchedule,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    user?.role === 'guru' ? user.id : 'ALL'
  );
  const [targetWeeklyJP, setTargetWeeklyJP] = useState<number>(24); // Standar 24 JP/pekan (Permendikbud)
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('Semua');

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  // Current journals inside this week
  const weekJournals = useMemo(() => {
    return journals.filter((j) => j.tanggal >= weekRange.startDate && j.tanggal <= weekRange.endDate);
  }, [journals, weekRange]);

  // Target teacher object if single
  const currentSelectedTeacher = useMemo(() => {
    if (selectedTeacherId === 'ALL') return null;
    return teachers.find((t) => t.id === selectedTeacherId) || 
      (user?.role === 'guru' ? { id: user.id, nama: user.nama, nip: user.nip, mapel: user.mapel } : null);
  }, [selectedTeacherId, teachers, user]);

  // Workload computation per teacher and per subject
  const workloadData = useMemo(() => {
    // 1. Filter schedules for target teacher or all
    const relevantSchedules = schedules.filter((s) => {
      if (selectedTeacherId !== 'ALL') {
        const tObj = currentSelectedTeacher;
        if (!tObj) return false;
        const matchName = s.guruNama && tObj.nama && s.guruNama.toLowerCase().includes(tObj.nama.toLowerCase());
        const matchId = s.guruId && s.guruId === tObj.id;
        return matchName || matchId;
      }
      return true;
    });

    // 2. Filter journals for target teacher or all
    const relevantJournals = weekJournals.filter((j) => {
      if (selectedTeacherId !== 'ALL') {
        const tObj = currentSelectedTeacher;
        if (!tObj) return false;
        const matchName = j.guruNama && tObj.nama && j.guruNama.toLowerCase().includes(tObj.nama.toLowerCase());
        const matchId = j.guruId && s_matchTeacher(j.guruId, tObj.id);
        return matchName || matchId;
      }
      return true;
    });

    function s_matchTeacher(idA?: string, idB?: string) {
      return idA && idB && idA === idB;
    }

    // 3. Group by subject (Mapel)
    const mapelMap = new Map<string, {
      mapel: string;
      classesSet: Set<string>;
      schedules: ClassScheduleItem[];
      totalJadwalJP: number;
      realizedJournals: TeachingJournal[];
      totalRealisasiJP: number;
      studentAttendanceTotals: { hadir: number; total: number };
    }>();

    relevantSchedules.forEach((sch) => {
      const mapelKey = sch.mapel.trim();
      if (!mapelMap.has(mapelKey)) {
        mapelMap.set(mapelKey, {
          mapel: mapelKey,
          classesSet: new Set(),
          schedules: [],
          totalJadwalJP: 0,
          realizedJournals: [],
          totalRealisasiJP: 0,
          studentAttendanceTotals: { hadir: 0, total: 0 }
        });
      }
      const entry = mapelMap.get(mapelKey)!;
      entry.classesSet.add(sch.kelas);
      entry.schedules.push(sch);
      entry.totalJadwalJP += calculateScheduleJP(sch);
    });

    // Also include any subjects from journals if not in schedule
    relevantJournals.forEach((j) => {
      const mapelKey = j.mapel.trim();
      if (!mapelMap.has(mapelKey)) {
        mapelMap.set(mapelKey, {
          mapel: mapelKey,
          classesSet: new Set([j.kelas]),
          schedules: [],
          totalJadwalJP: 0,
          realizedJournals: [],
          totalRealisasiJP: 0,
          studentAttendanceTotals: { hadir: 0, total: 0 }
        });
      }
      const entry = mapelMap.get(mapelKey)!;
      entry.classesSet.add(j.kelas);
      entry.realizedJournals.push(j);

      // Estimate JP for this journal
      const matchingSch = entry.schedules.find((s) => isClassMatch(s.kelas, j.kelas));
      const jpCount = matchingSch ? calculateScheduleJP(matchingSch) : 2;
      entry.totalRealisasiJP += jpCount;

      entry.studentAttendanceTotals.hadir += (j.hadir + j.terlambat);
      entry.studentAttendanceTotals.total += j.totalSiswa;
    });

    // Convert map to array with slot breakdown
    const subjectList = Array.from(mapelMap.values()).map((item) => {
      // Determine per-slot completion status
      const slots = item.schedules.map((sch) => {
        const jp = calculateScheduleJP(sch);
        // Find if there is a journal matching this schedule in this week
        const journalMatch = relevantJournals.find((j) => 
          isClassMatch(j.kelas, sch.kelas) && 
          j.mapel.toLowerCase() === sch.mapel.toLowerCase()
        );
        return {
          id: sch.id,
          hari: sch.hari,
          jamKe: sch.jamKe,
          jamMulai: sch.jamMulai,
          jamSelesai: sch.jamSelesai,
          kelas: sch.kelas,
          ruang: sch.ruang,
          guruNama: sch.guruNama,
          jp,
          isCompletedThisWeek: !!journalMatch,
          journalEntry: journalMatch
        };
      });

      const totalClasses = Array.from(item.classesSet);
      const persentase = item.totalJadwalJP > 0
        ? Math.min(100, Math.round((item.totalRealisasiJP / item.totalJadwalJP) * 100))
        : item.totalRealisasiJP > 0 ? 100 : 0;

      const avgAttendance = item.studentAttendanceTotals.total > 0
        ? Math.round((item.studentAttendanceTotals.hadir / item.studentAttendanceTotals.total) * 100)
        : 0;

      return {
        mapel: item.mapel,
        kelas: totalClasses,
        schedulesCount: item.schedules.length,
        totalJadwalJP: item.totalJadwalJP,
        totalRealisasiJP: item.totalRealisasiJP,
        realizedJournalsCount: item.realizedJournals.length,
        persentase,
        slots,
        avgAttendance
      };
    }).sort((a, b) => b.totalJadwalJP - a.totalJadwalJP);

    // Global summary
    const totalJadwalJP = subjectList.reduce((sum, s) => sum + s.totalJadwalJP, 0);
    const totalRealisasiJP = subjectList.reduce((sum, s) => sum + s.totalRealisasiJP, 0);
    const totalSlotsCount = subjectList.reduce((sum, s) => sum + s.schedulesCount, 0);
    const totalJournalsCount = subjectList.reduce((sum, s) => sum + s.realizedJournalsCount, 0);

    const distinctClasses = Array.from(new Set(subjectList.flatMap((s) => s.kelas)));

    // Calculate total students taught
    const totalStudentsTaught = students.filter((st) => distinctClasses.some((c) => isClassMatch(st.kelas, c))).length;

    // Overall attendance rate across all subjects
    const totalHadirAll = relevantJournals.reduce((sum, j) => sum + j.hadir + j.terlambat, 0);
    const totalSiswaAll = relevantJournals.reduce((sum, j) => sum + j.totalSiswa, 0);
    const avgAttendanceAll = totalSiswaAll > 0 ? Math.round((totalHadirAll / totalSiswaAll) * 100) : 0;

    // Workload fulfillment percentage
    const target = targetWeeklyJP || 24;
    const persentaseTarget = Math.round((totalRealisasiJP / target) * 100);
    const persentaseJadwal = totalJadwalJP > 0 ? Math.round((totalRealisasiJP / totalJadwalJP) * 100) : 0;

    return {
      subjectList,
      totalJadwalJP,
      totalRealisasiJP,
      totalSlotsCount,
      totalJournalsCount,
      distinctClasses,
      totalStudentsTaught,
      avgAttendanceAll,
      persentaseTarget,
      persentaseJadwal,
      target
    };
  }, [schedules, weekJournals, selectedTeacherId, currentSelectedTeacher, targetWeeklyJP, students]);

  // Teacher Comparison Table for Admin / Supervisor
  const allTeachersSummary = useMemo(() => {
    return teachers.map((t) => {
      const tSchedules = schedules.filter((s) => 
        (s.guruNama && s.guruNama.toLowerCase().includes(t.nama.toLowerCase())) ||
        (s.guruId && s.guruId === t.id)
      );

      const tJournals = weekJournals.filter((j) => 
        (j.guruNama && j.guruNama.toLowerCase().includes(t.nama.toLowerCase())) ||
        (j.guruId && j.guruId === t.id)
      );

      const scheduledJP = tSchedules.reduce((sum, s) => sum + calculateScheduleJP(s), 0);
      const realizedJP = tJournals.reduce((sum, j) => {
        const matchSch = tSchedules.find((s) => isClassMatch(s.kelas, j.kelas));
        return sum + (matchSch ? calculateScheduleJP(matchSch) : 2);
      }, 0);

      const mapelNames = Array.from(new Set([
        ...(t.penugasanMapel?.map((p) => p.mapel) || []),
        t.mapel || '',
        ...tSchedules.map((s) => s.mapel)
      ].filter(Boolean)));

      const classesNames = Array.from(new Set(tSchedules.map((s) => s.kelas)));

      const pct = scheduledJP > 0 ? Math.round((realizedJP / scheduledJP) * 100) : (realizedJP > 0 ? 100 : 0);

      return {
        id: t.id,
        nama: t.nama,
        nip: t.nip,
        role: t.role,
        mapelList: mapelNames,
        classesList: classesNames,
        scheduledJP,
        realizedJP,
        journalsCount: tJournals.length,
        schedulesCount: tSchedules.length,
        persentase: pct,
        isTargetMet: realizedJP >= targetWeeklyJP
      };
    }).sort((a, b) => b.scheduledJP - a.scheduledJP);
  }, [teachers, schedules, weekJournals, targetWeeklyJP]);

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    if (selectedSubjectFilter === 'Semua') return workloadData.subjectList;
    return workloadData.subjectList.filter((s) => s.mapel === selectedSubjectFilter);
  }, [workloadData.subjectList, selectedSubjectFilter]);

  // Export PDF Workload Summary
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      let y = 16;

      // School Kop
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI (YPLP PGRI)', pageWidth / 2, y, { align: 'center' });
      y += 5.5;

      doc.setFontSize(13);
      doc.text(schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU', pageWidth / 2, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(schoolConfig.alamat || 'Kecamatan Cikadu, Kabupaten Cianjur - Jawa Barat', pageWidth / 2, y, { align: 'center' });
      y += 4.5;
      doc.text(`NPSN: ${schoolConfig.npsn || '20252877'} • Email: ${schoolConfig.email || 'smp.pgri1ckd@gmail.com'}`, pageWidth / 2, y, { align: 'center' });
      y += 4;

      // Double Line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(14, y, pageWidth - 14, y);
      y += 1;
      doc.setLineWidth(0.2);
      doc.line(14, y, pageWidth - 14, y);
      y += 7;

      // Document Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('LAPORAN PEMENUHAN BEBAN KERJA MENGAJAR MINGGUAN GURU', pageWidth / 2, y, { align: 'center' });
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const teacherNameText = currentSelectedTeacher ? currentSelectedTeacher.nama : 'Seluruh Dewan Guru SMP PGRI 1 Cikadu';
      doc.text(`Guru: ${teacherNameText}  |  Periode Pekan: ${weekRange.label}`, pageWidth / 2, y, { align: 'center' });
      y += 7;

      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(14, y, pageWidth - 28, 18, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`Target Beban Kerja: ${targetWeeklyJP} JP/Minggu`, 20, y + 6);
      doc.text(`Total JP Terjadwal: ${workloadData.totalJadwalJP} JP`, 20, y + 12);

      doc.text(`Realisasi Terlaksana: ${workloadData.totalRealisasiJP} JP (${workloadData.persentaseJadwal}%)`, 100, y + 6);
      doc.text(`Status: ${workloadData.totalRealisasiJP >= targetWeeklyJP ? 'MEMENUHI TARGET' : 'SEDANG BERJALAN'}`, 100, y + 12);

      y += 22;

      // Table Breakdown
      const colX = [14, 22, 75, 105, 125, 145, 165, 196];
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      doc.text('No', 18, y + 4.5, { align: 'center' });
      doc.text('Mata Pelajaran', 24, y + 4.5);
      doc.text('Rombel', 77, y + 4.5);
      doc.text('JP Jadwal', 115, y + 4.5, { align: 'right' });
      doc.text('JP Realisasi', 135, y + 4.5, { align: 'right' });
      doc.text('Capaian', 155, y + 4.5, { align: 'right' });
      doc.text('Kehadiran', 180, y + 4.5, { align: 'right' });

      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      workloadData.subjectList.forEach((sub, idx) => {
        doc.setDrawColor(226, 232, 240);
        doc.line(14, y, pageWidth - 14, y);

        doc.text(String(idx + 1), 18, y + 4.5, { align: 'center' });
        doc.text(sub.mapel.length > 30 ? sub.mapel.slice(0, 28) + '...' : sub.mapel, 24, y + 4.5);
        doc.text(sub.kelas.join(', '), 77, y + 4.5);
        doc.text(`${sub.totalJadwalJP} JP`, 115, y + 4.5, { align: 'right' });
        doc.text(`${sub.totalRealisasiJP} JP`, 135, y + 4.5, { align: 'right' });
        doc.text(`${sub.persentase}%`, 155, y + 4.5, { align: 'right' });
        doc.text(`${sub.avgAttendance}%`, 180, y + 4.5, { align: 'right' });

        y += 6.5;
      });

      doc.setDrawColor(148, 163, 184);
      doc.line(14, y, pageWidth - 14, y);
      y += 1;

      // Table Total Footer
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 6.5, 'F');
      doc.text('TOTAL KESELURUHAN', 24, y + 4.5);
      doc.text(`${workloadData.totalJadwalJP} JP`, 115, y + 4.5, { align: 'right' });
      doc.text(`${workloadData.totalRealisasiJP} JP`, 135, y + 4.5, { align: 'right' });
      doc.text(`${workloadData.persentaseJadwal}%`, 155, y + 4.5, { align: 'right' });
      doc.text(`${workloadData.avgAttendanceAll}%`, 180, y + 4.5, { align: 'right' });
      y += 15;

      // Signature Block (clean without frame boxes)
      const signY = y + 10 > 240 ? 240 : y + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Cikadu, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 145, signY);
      doc.text('Guru Mata Pelajaran,', 145, signY + 5);
      doc.text('Mengetahui,', 25, signY);
      doc.text('Kepala ' + (schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'), 25, signY + 5);

      const nameY = signY + 26;
      doc.setFont('helvetica', 'bold');
      doc.text(teacherNameText, 145, nameY);
      doc.text(schoolConfig.namaKepsek || 'Hj. Siti Rohmah, S.Pd.', 25, nameY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`NUPTK: ${currentSelectedTeacher?.nip || '-'}`, 145, nameY + 4);
      doc.text(`NUPTK: ${schoolConfig.nipKepsek || '-'}`, 25, nameY + 4);

      doc.save(`Rekap_Beban_Mengajar_${teacherNameText.replace(/\s+/g, '_')}_${weekRange.startDate}.pdf`);
      toast.success('Unduhan Siap', 'Laporan beban mengajar mingguan PDF berhasil diunduh.');
    } catch (err) {
      console.error('Failed to generate PDF', err);
      toast.error('Gagal Cetak PDF', 'Terjadi kesalahan saat memproses laporan.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Filter Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Ringkasan & Beban Kerja Mengajar Mingguan (JP)</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-extrabold border border-indigo-200">
                  Target: {targetWeeklyJP} JP / Pekan
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan akumulasi jam mengajar tatap muka, target 24 JP sertifikasi, dan realisasi jurnal KBM pekan berjalan.
              </p>
            </div>
          </div>

          {/* Quick Actions: Week Navigator & PDF Print */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Week Offset Navigator */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Pekan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 font-bold text-slate-800 text-center min-w-[140px]">
                {weekOffset === 0 ? (
                  <span className="text-indigo-700 font-extrabold">Pekan Ini</span>
                ) : weekOffset === -1 ? (
                  <span>Pekan Lalu</span>
                ) : (
                  <span>Pekan {weekOffset > 0 ? `+${weekOffset}` : weekOffset}</span>
                )}
                <div className="text-[10px] text-slate-500 font-normal">{weekRange.label}</div>
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                title="Pekan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Reset to this week */}
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer"
              >
                Kembali ke Pekan Ini
              </button>
            )}

            {/* Print / Export PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-rose-600" />
              <span>Cetak Rekap PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Teacher Selector (for admin) & Target JP Setting */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          
          {/* Guru Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Guru Pengajar
            </label>
            {user?.role === 'guru' ? (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{user.nama}</span>
                <span className="text-[10px] text-indigo-600 font-mono">Akun Aktif</span>
              </div>
            ) : (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">-- Seluruh Dewan Guru (Supervisi Sekolah) --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama} {t.mapel ? `(${t.mapel})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Standar Target Beban JP */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
              <span>Target Beban Kerja Mingguan</span>
              <span className="text-[10px] text-slate-400 font-normal">(Standar Kemendikbud: 24 JP)</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={targetWeeklyJP}
                onChange={(e) => setTargetWeeklyJP(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={24}>24 JP / Minggu (Standar Sertifikasi Penuh)</option>
                <option value={18}>18 JP / Minggu (Beban Minimum)</option>
                <option value={30}>30 JP / Minggu (Beban Penuh Plus)</option>
                <option value={workloadData.totalJadwalJP}>Sesuaikan Sesuai Jadwal Terdaftar ({workloadData.totalJadwalJP} JP)</option>
              </select>
            </div>
          </div>

          {/* Filter Mapel */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Filter Mata Pelajaran
            </label>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Semua">Semua Mata Pelajaran ({workloadData.subjectList.length})</option>
              {workloadData.subjectList.map((s) => (
                <option key={s.mapel} value={s.mapel}>
                  {s.mapel} ({s.totalJadwalJP} JP)
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* KPI Cards: Workload Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total JP Terjadwal */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-3xl p-5 border border-indigo-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-900">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">JP Terjadwal / Pekan</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {workloadData.totalJadwalJP}
            </span>
            <span className="text-xs font-bold text-slate-500">JP / Pekan</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
            <span>{workloadData.totalSlotsCount} Sesi Tatap Muka</span>
            <span>•</span>
            <span>{workloadData.distinctClasses.length} Rombel Kelas</span>
          </div>
        </div>

        {/* Card 2: Realisasi JP Pekan Ini */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl p-5 border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-900">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Realisasi Pekan Ini</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {workloadData.totalRealisasiJP}
            </span>
            <span className="text-xs font-bold text-slate-500">/ {workloadData.totalJadwalJP} JP</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
            <span>{workloadData.totalJournalsCount} Jurnal KBM Diisi</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">{workloadData.persentaseJadwal}% Terlaksana</span>
          </div>
        </div>

        {/* Card 3: Capaian Beban Kerja (Target 24 JP) */}
        <div className={`bg-gradient-to-br rounded-3xl p-5 border shadow-2xs ${
          workloadData.totalRealisasiJP >= targetWeeklyJP
            ? 'from-blue-50 to-indigo-50/60 border-blue-200/80'
            : 'from-amber-50 to-orange-50/60 border-amber-200/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Target Beban Kerja</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
              workloadData.totalRealisasiJP >= targetWeeklyJP ? 'bg-blue-600' : 'bg-amber-600'
            }`}>
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {workloadData.persentaseTarget}%
            </span>
            <span className="text-xs font-bold text-slate-500">Target ({targetWeeklyJP} JP)</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-200/80 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                workloadData.totalRealisasiJP >= targetWeeklyJP ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, workloadData.persentaseTarget)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 4: Rata-Rata Kehadiran Siswa di KBM */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-3xl p-5 border border-purple-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-purple-900">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Kehadiran Siswa</span>
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {workloadData.avgAttendanceAll > 0 ? `${workloadData.avgAttendanceAll}%` : '-'}
            </span>
            <span className="text-xs font-bold text-slate-500">di Jam KBM</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
            <span>{workloadData.totalStudentsTaught} Siswa Terdaftar</span>
            <span>•</span>
            <span>{workloadData.distinctClasses.join(', ')}</span>
          </div>
        </div>

      </div>

      {/* Main Breakdown per Subject */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Rincian Jam Mengajar per Mata Pelajaran</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi beban jam pelajaran (JP), jadwal kelas, dan status pengisian jurnal KBM pekan ini ({weekRange.label}).
            </p>
          </div>

          <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            Total {filteredSubjects.length} Mata Pelajaran Terdata
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-sm text-slate-600">Tidak ada jadwal mata pelajaran yang cocok.</p>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan penugasan mata pelajaran atau jadwal di tab "Kelola Jadwal Pelajaran".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubjects.map((sub) => {
              const isCompleted = sub.totalRealisasiJP >= sub.totalJadwalJP && sub.totalJadwalJP > 0;
              const isPartiallyDone = sub.totalRealisasiJP > 0 && sub.totalRealisasiJP < sub.totalJadwalJP;

              return (
                <div
                  key={sub.mapel}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all p-5 shadow-2xs space-y-4 group"
                >
                  {/* Subject Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors">
                          {sub.mapel}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-black border border-indigo-200">
                          {sub.totalJadwalJP} JP Terjadwal
                        </span>
                        {isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200 flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>100% Terlaksana</span>
                          </span>
                        ) : isPartiallyDone ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200">
                            {sub.persentase}% Selesai
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-black border border-rose-200">
                            Belum Diisi Pekan Ini
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span>Rombel Kelas: <strong>{sub.kelas.join(', ')}</strong></span>
                        <span>•</span>
                        <span>Realisasi: <strong>{sub.totalRealisasiJP} JP</strong> ({sub.realizedJournalsCount} pertemuan)</span>
                        {sub.avgAttendance > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">Kehadiran Siswa: {sub.avgAttendance}%</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mini Progress Circle or Percentage */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : isPartiallyDone ? 'bg-amber-500' : 'bg-rose-400'
                          }`}
                          style={{ width: `${sub.persentase}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-black text-slate-800 w-10 text-right">
                        {sub.persentase}%
                      </span>
                    </div>
                  </div>

                  {/* Slot-by-Slot Timetable for This Subject */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                    {sub.slots.map((slot) => {
                      return (
                        <div
                          key={slot.id}
                          className={`rounded-xl p-3 border text-xs transition-all flex flex-col justify-between gap-2 ${
                            slot.isCompletedThisWeek
                              ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                                Hari {slot.hari}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-indigo-700">
                                {slot.jp} JP
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600">
                              <span className="font-bold">Kelas {slot.kelas}</span>
                              <span className="font-mono">{slot.jamMulai} - {slot.jamSelesai}</span>
                            </div>
                            {slot.ruang && (
                              <div className="text-[10px] text-slate-400">
                                📍 {slot.ruang}
                              </div>
                            )}
                          </div>

                          <div className="pt-1 flex items-center justify-between border-t border-slate-200/60">
                            {slot.isCompletedThisWeek ? (
                              <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Jurnal Terisi (P-{slot.journalEntry?.pertemuanKe})</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Belum Tercatat</span>
                              </span>
                            )}

                            {onStartJournalFromSchedule && !slot.isCompletedThisWeek && (
                              <button
                                type="button"
                                onClick={() => {
                                  const rawSch = schedules.find((s) => s.id === slot.id);
                                  if (rawSch) onStartJournalFromSchedule(rawSch);
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Isi Jurnal</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Admin / Supervisor View: Rekapitulasi Seluruh Guru */}
      {(user?.role === 'admin' || selectedTeacherId === 'ALL') && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Rekapitulasi Beban Mengajar Seluruh Dewan Guru</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring keterpenuhan jam tatap muka mingguan seluruh guru untuk pemenuhan beban kerja dan sertifikasi.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-xl text-xs font-extrabold border border-blue-200 self-start sm:self-auto">
              {allTeachersSummary.length} Tenaga Pendidik
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-4">Nama Guru & NUPTK</th>
                  <th className="py-3 px-4">Mata Pelajaran & Rombel</th>
                  <th className="py-3 px-3 text-center">JP Terjadwal</th>
                  <th className="py-3 px-3 text-center">JP Realisasi</th>
                  <th className="py-3 px-3 text-center">% Capaian</th>
                  <th className="py-3 px-3 text-center">Status Beban</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {allTeachersSummary.map((item, idx) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{item.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NUPTK: {item.nip || '-'}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-indigo-900 truncate">
                          {item.mapelList.join(', ') || 'Guru Mapel'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Kelas: {item.classesList.join(', ') || '-'} ({item.schedulesCount} sesi/minggu)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-slate-900 text-sm">{item.scheduledJP}</span>
                        <span className="text-[10px] text-slate-400 block">JP / Pekan</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-emerald-700 text-sm">{item.realizedJP}</span>
                        <span className="text-[10px] text-slate-400 block">{item.journalsCount} Jurnal</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-slate-800">{item.persentase}%</div>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.persentase >= 100 ? 'bg-emerald-600' : item.persentase >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, item.persentase)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.realizedJP >= targetWeeklyJP ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCheck className="w-3 h-3" />
                            <span>Terpenuhi</span>
                          </span>
                        ) : item.realizedJP > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Sedang Berjalan</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Belum Ada KBM</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherId(item.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] transition-colors cursor-pointer"
                        >
                          Lihat Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
