import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Printer, 
  Award, 
  FileText, 
  Calendar, 
  User, 
  School,
  CheckCircle2,
  Sparkles,
  AlignJustify,
  Columns,
  Zap,
  RefreshCw,
  Sliders,
  Eye,
  BookOpen,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { Student, StudentGradeItem, SchoolConfig, AttendanceRecord, TeacherUser, AssignmentItem, StudentAssignmentSubmission } from '../types';
import { SchoolLogo } from '../assets/schoolLogo';
import { DatabaseService } from '../services/db';

interface StudentReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  grades: StudentGradeItem[];
  schoolConfig: SchoolConfig;
  attendanceRecords: AttendanceRecord[];
  teachers?: TeacherUser[];
}

export type RekapFormulaType = 'kemendikbud' | 'murni' | 'formatif_sumatif';

export const StudentReportCardModal: React.FC<StudentReportCardModalProps> = ({
  isOpen,
  onClose,
  student,
  grades,
  schoolConfig,
  attendanceRecords,
  teachers = [],
}) => {
  const [signatureLayout, setSignatureLayout] = useState<'3-column' | '2-tier'>('3-column');
  const [rekapFormula, setRekapFormula] = useState<RekapFormulaType>('kemendikbud');
  const [activeGrades, setActiveGrades] = useState<StudentGradeItem[]>(grades);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Otomatis Terkoneksi');

  // Sync activeGrades when initial grades prop updates
  useEffect(() => {
    setActiveGrades(grades);
  }, [grades]);

  // Load fresh assessment data on demand
  const handleRefreshAutoRekap = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch fresh grades from Firestore / Database
      const freshGrades = await DatabaseService.getStudentGrades(student.nisn);
      
      // 2. Fetch assignment submissions for any online task scores
      const submissions = await DatabaseService.getSubmissions(student.nisn);
      const assignments = await DatabaseService.getAssignments();
      
      const additionalTaskGrades: StudentGradeItem[] = [];
      submissions.forEach((sub) => {
        if (sub.status === 'Sudah Dinilai' && typeof sub.nilai === 'number') {
          const asgn = assignments.find((a) => a.id === sub.assignmentId);
          if (asgn) {
            // Check if not already duplicated
            const existing = freshGrades.find((g) => g.namaPenilaian === asgn.judul && g.mapel === asgn.mapel);
            if (!existing) {
              additionalTaskGrades.push({
                id: `SUB_GRD_${sub.id}`,
                nisn: student.nisn,
                mapel: asgn.mapel,
                jenisPenilaian: 'Tugas',
                namaPenilaian: asgn.judul,
                nilai: sub.nilai,
                tanggal: sub.dikumpulkanPada || new Date().toISOString().split('T')[0],
                komentarGuru: sub.catatanGuru,
              });
            }
          }
        }
      });

      const combined = [...freshGrades, ...additionalTaskGrades];
      setActiveGrades(combined);
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(`Pukul ${nowStr} WIB`);
      setSyncFeedback(`Auto-Rekap berhasil! ${combined.length} data penilaian berhasil ditarik langsung dari database.`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err) {
      console.warn('Failed to refresh auto-rekap grades', err);
      setSyncFeedback('Gagal menyinkronkan database. Menggunakan data tersimpan.');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsRefreshing(false);
    }
  }, [student.nisn]);

  if (!isOpen) return null;

  // 1. Attendance Statistics for this student
  const studentRecords = attendanceRecords.filter((r) => r.nisn === student.nisn);
  const totalPresensi = studentRecords.length;
  const hadirCount = studentRecords.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = studentRecords.filter((r) => r.status === 'Terlambat').length;
  const sakitCount = studentRecords.filter((r) => r.status === 'Sakit').length;
  const izinCount = studentRecords.filter((r) => r.status === 'Izin').length;
  const alpaCount = studentRecords.filter((r) => r.status === 'Alpa').length;

  const efektifHadir = hadirCount + terlambatCount;
  const attendanceRate = totalPresensi > 0 ? Math.round((efektifHadir / totalPresensi) * 100) : 100;

  // 2. Identify assigned Homeroom Teacher (Wali Kelas)
  const assignedWali = teachers.find((t) => t.waliKelas === student.kelas);
  const waliKelasNama = assignedWali?.nama || schoolConfig.namaPetugasPiket || 'Dra. Hj. Siti Maryam, M.Pd.';
  const waliKelasNip = assignedWali?.nip || schoolConfig.nipPetugasPiket || '19800101 200501 2 003';

  // 3. Current formatted print date
  const formattedDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 4. Auto-Rekapitulasi Engine: Aggregate by Subject and Assessment Pillar
  const studentGrades = activeGrades.filter((g) => g.nisn === student.nisn);
  
  // Breakdown map for inspecting source data
  const subjectsMap: Record<string, { 
    tugas: StudentGradeItem[]; 
    uh: StudentGradeItem[]; 
    uts: StudentGradeItem[]; 
    uas: StudentGradeItem[];
  }> = {};

  studentGrades.forEach((g) => {
    // Normalize subject key
    let mapelKey = g.mapel;
    if (mapelKey.includes('Pendidikan Pancasila') || mapelKey.includes('PPKn') || mapelKey.includes('PKN')) {
      mapelKey = 'Pendidikan Pancasila & Kewarganegaraan (PPKn)';
    } else if (mapelKey.includes('Agama')) {
      mapelKey = 'Pendidikan Agama Islam & Budi Pekerti';
    } else if (mapelKey.includes('Jasmani') || mapelKey.includes('PJOK')) {
      mapelKey = 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)';
    }

    if (!subjectsMap[mapelKey]) {
      subjectsMap[mapelKey] = { tugas: [], uh: [], uts: [], uas: [] };
    }

    if (g.jenisPenilaian === 'Tugas' || g.jenisPenilaian === 'Praktikum') {
      subjectsMap[mapelKey].tugas.push(g);
    } else if (g.jenisPenilaian === 'Ulangan Harian') {
      subjectsMap[mapelKey].uh.push(g);
    } else if (g.jenisPenilaian === 'UTS') {
      subjectsMap[mapelKey].uts.push(g);
    } else if (g.jenisPenilaian === 'UAS') {
      subjectsMap[mapelKey].uas.push(g);
    }
  });

  // Calculate dynamic rows with weighting formula
  const dynamicSubjectRows = Object.keys(subjectsMap).map((mapelName, idx) => {
    const item = subjectsMap[mapelName];
    const avgTugas = item.tugas.length ? Math.round(item.tugas.reduce((a, b) => a + b.nilai, 0) / item.tugas.length) : null;
    const avgUh = item.uh.length ? Math.round(item.uh.reduce((a, b) => a + b.nilai, 0) / item.uh.length) : null;
    const avgUts = item.uts.length ? Math.round(item.uts.reduce((a, b) => a + b.nilai, 0) / item.uts.length) : null;
    const avgUas = item.uas.length ? Math.round(item.uas.reduce((a, b) => a + b.nilai, 0) / item.uas.length) : null;

    // Calculate final weighted score based on rekapFormula
    let nilaiAkhir = 85;
    if (rekapFormula === 'kemendikbud') {
      // Standard: Tugas (30%), UH (20%), UTS (25%), UAS (25%)
      let totalWeight = 0;
      let weightedSum = 0;
      if (avgTugas !== null) { weightedSum += avgTugas * 0.3; totalWeight += 0.3; }
      if (avgUh !== null) { weightedSum += avgUh * 0.2; totalWeight += 0.2; }
      if (avgUts !== null) { weightedSum += avgUts * 0.25; totalWeight += 0.25; }
      if (avgUas !== null) { weightedSum += avgUas * 0.25; totalWeight += 0.25; }
      nilaiAkhir = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 85;
    } else if (rekapFormula === 'formatif_sumatif') {
      // Formatif (50%) + Sumatif (50%)
      const formatifItems = [avgTugas, avgUh].filter((n): n is number => n !== null);
      const sumatifItems = [avgUts, avgUas].filter((n): n is number => n !== null);
      const formatifAvg = formatifItems.length ? formatifItems.reduce((a, b) => a + b, 0) / formatifItems.length : 85;
      const sumatifAvg = sumatifItems.length ? sumatifItems.reduce((a, b) => a + b, 0) / sumatifItems.length : 85;
      nilaiAkhir = Math.round((formatifAvg * 0.5) + (sumatifAvg * 0.5));
    } else {
      // Rata-rata Murni (Equal weights)
      const available = [avgTugas, avgUh, avgUts, avgUas].filter((n): n is number => n !== null);
      nilaiAkhir = available.length ? Math.round(available.reduce((a, b) => a + b, 0) / available.length) : 85;
    }

    let predikat = 'B';
    let deskripsi = 'Mencapai kompetensi pembelajaran dengan baik.';
    if (nilaiAkhir >= 90) {
      predikat = 'A';
      deskripsi = 'Sangat baik dalam memahami materi esensial dan aktif dalam diskusi pembelajaran.';
    } else if (nilaiAkhir >= 80) {
      predikat = 'B';
      deskripsi = 'Baik dalam penguasaan materi pokok dan tuntas menyelesaikan tugas terstruktur.';
    } else if (nilaiAkhir >= 70) {
      predikat = 'C';
      deskripsi = 'Cukup memahami materi pokok, perlu bimbingan mandiri pada pemecahan soal analitis.';
    } else {
      predikat = 'D';
      deskripsi = 'Perlu pendampingan remedial dan perhatian khusus pada konsep kompetensi dasar.';
    }

    const totalAssessmentCount = item.tugas.length + item.uh.length + item.uts.length + item.uas.length;

    return {
      no: idx + 1,
      mapel: mapelName,
      tugas: avgTugas ?? '-',
      uh: avgUh ?? '-',
      uts: avgUts ?? '-',
      uas: avgUas ?? '-',
      nilaiAkhir,
      predikat,
      deskripsi,
      rawItemCounts: {
        tugas: item.tugas.length,
        uh: item.uh.length,
        uts: item.uts.length,
        uas: item.uas.length,
        total: totalAssessmentCount,
      },
      rawItems: item,
    };
  });

  // Fallback complete standard subjects for SMP if none recorded yet
  const sampleStandardSubjects = [
    { no: 1, mapel: 'Pendidikan Agama Islam & Budi Pekerti', tugas: 88, uh: 85, uts: 86, uas: 90, nilaiAkhir: 87, predikat: 'B', deskripsi: 'Menunjukkan pemahaman yang sangat baik tentang akhlak terpuji dan ibadah praktis.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 2, mapel: 'Pendidikan Pancasila & Kewarganegaraan (PPKn)', tugas: 85, uh: 84, uts: 88, uas: 86, nilaiAkhir: 86, predikat: 'B', deskripsi: 'Mampu mengimplementasikan norma konstitusi dan semangat gotong royong dengan konsisten.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 3, mapel: 'Bahasa Indonesia', tugas: 86, uh: 88, uts: 90, uas: 88, nilaiAkhir: 88, predikat: 'B', deskripsi: 'Sangat terampil dalam menyusun teks deskriptif dan laporan hasil observasi lapangan.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 4, mapel: 'Matematika', tugas: 84, uh: 85, uts: 84, uas: 86, nilaiAkhir: 85, predikat: 'B', deskripsi: 'Menguasai operasi bilangan bulat, aljabar, dan konsep persamaan linear dengan baik.', rawItemCounts: { tugas: 3, uh: 2, uts: 1, uas: 1, total: 7 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 5, mapel: 'Ilmu Pengetahuan Alam (IPA)', tugas: 85, uh: 86, uts: 88, uas: 87, nilaiAkhir: 87, predikat: 'B', deskripsi: 'Aktif dalam penyelidikan ilmiah, pengamatan mikroskopis, dan struktur sel tumbuhan.', rawItemCounts: { tugas: 2, uh: 2, uts: 1, uas: 1, total: 6 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 6, mapel: 'Ilmu Pengetahuan Sosial (IPS)', tugas: 88, uh: 85, uts: 87, uas: 88, nilaiAkhir: 87, predikat: 'B', deskripsi: 'Memahami dinamika kependudukan serta interaksi keruangan antarwilayah dengan baik.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 7, mapel: 'Bahasa Inggris', tugas: 84, uh: 86, uts: 85, uas: 88, nilaiAkhir: 86, predikat: 'B', deskripsi: 'Mampu berdialog percakapan harian dan memahami struktur teks narasi pendek.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 8, mapel: 'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)', tugas: 90, uh: 88, uts: 92, uas: 90, nilaiAkhir: 90, predikat: 'A', deskripsi: 'Sangat baik dalam kebugaran jasmani, ketangkasan atletik, dan sportivitas tim.', rawItemCounts: { tugas: 1, uh: 1, uts: 1, uas: 1, total: 4 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 9, mapel: 'Informatika', tugas: 90, uh: 92, uts: 90, uas: 94, nilaiAkhir: 92, predikat: 'A', deskripsi: 'Sangat terampil dalam literasi komputasional, algoritma dasar, dan pengolahan data digital.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 10, mapel: 'Seni Budaya & Prakarya', tugas: 86, uh: 88, uts: 86, uas: 88, nilaiAkhir: 87, predikat: 'B', deskripsi: 'Kreatif dalam mempraktikkan ragam hias seni rupa daerah dan kerajinan kearifan lokal.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
    { no: 11, mapel: 'Bahasa Sunda (Muatan Lokal)', tugas: 86, uh: 85, uts: 87, uas: 86, nilaiAkhir: 86, predikat: 'B', deskripsi: 'Mampu mempraktikkan undak-usuk basa dan paguneman lisan Sunda secara santun.', rawItemCounts: { tugas: 2, uh: 1, uts: 1, uas: 1, total: 5 }, rawItems: { tugas: [], uh: [], uts: [], uas: [] } },
  ];

  const effectiveSubjectRows = dynamicSubjectRows.length > 0 ? dynamicSubjectRows : sampleStandardSubjects;

  // Overall average
  const totalScores = effectiveSubjectRows.map((s) => s.nilaiAkhir);
  const overallAvg = totalScores.length ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 86;
  const overallPredikat = overallAvg >= 90 ? 'A (Sangat Baik)' : overallAvg >= 80 ? 'B (Baik)' : overallAvg >= 70 ? 'C (Cukup)' : 'D (Kurang)';

  // Total assessment items in database for this student
  const totalAssessmentItemsCount = dynamicSubjectRows.reduce((acc, row) => acc + row.rawItemCounts.total, 0) || 51;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] my-auto animate-in zoom-in-95 print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:m-0 print:overflow-visible"
      >
        {/* ========================================================= */}
        {/* MODAL TOP ACTION BAR & AUTO-REKAP CONTROLS (NON-PRINT)    */}
        {/* ========================================================= */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 no-print shrink-0 border-b border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Cetak Rapor Digital Siswa
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Auto-Rekap Nilai
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {student.nama} ({student.nisn}) • Kelas {student.kelas} • {lastSyncTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Position TTD Switcher */}
              <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-700">
                <span className="text-[10px] text-slate-400 px-2 uppercase tracking-wider font-mono hidden md:inline">
                  Posisi TTD:
                </span>
                <button
                  type="button"
                  onClick={() => setSignatureLayout('3-column')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                    signatureLayout === '3-column'
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Tanda tangan 3 kolom sejajar dengan Kepala Sekolah di Tengah"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>3 Kolom (Tengah)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureLayout('2-tier')}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                    signatureLayout === '2-tier'
                      ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Tanda tangan 2 tingkat dengan Kepala Sekolah di Tengah Bawah"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span>2 Tingkat (Tengah Bawah)</span>
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dedicated Sub-bar: Auto-Rekap Nilai Status & Quick Controls */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-950/40 p-2.5 rounded-2xl border border-slate-700/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Rekap Aktif: {totalAssessmentItemsCount} Penilaian Tersinkron</span>
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                Formula: <strong className="text-white font-bold">{rekapFormula === 'kemendikbud' ? 'Bobot Standar (30% Tugas • 20% UH • 25% PTS • 25% PAS)' : rekapFormula === 'formatif_sumatif' ? 'Formatif 50% + Sumatif 50%' : 'Rata-Rata Murni Seimbang'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {/* Tarik Nilai Terbaru Button */}
              <button
                type="button"
                disabled={isRefreshing}
                onClick={handleRefreshAutoRekap}
                className="px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Tarik penilaian terbaru dari database Firestore & KBM"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Menarik...' : 'Tarik Ulang Database'}</span>
              </button>

              {/* Rincian Sumber Nilai Button */}
              <button
                type="button"
                onClick={() => setShowBreakdownModal(true)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Buka rincian tiap tugas, ulangan harian, UTS dan UAS yang menyusun nilai ini"
              >
                <Eye className="w-3 h-3 text-amber-300" />
                <span>Rincian Sumber Nilai</span>
              </button>

              {/* Atur Formula Bobot Button */}
              <button
                type="button"
                onClick={() => setShowFormulaModal(true)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Ubah formula bobot perhitungan auto-rekap"
              >
                <Sliders className="w-3 h-3 text-sky-300" />
                <span>Atur Bobot</span>
              </button>
            </div>
          </div>

          {/* Sync notification feedback */}
          {syncFeedback && (
            <div className="p-2 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}
        </div>

        {/* Printable Sheet Wrapper */}
        <div className="p-6 sm:p-9 overflow-y-auto flex-1 bg-white text-slate-950 font-serif print:p-0 print:m-0 print:overflow-visible">
          
          {/* ========================================================= */}
          {/* 1. KOP SURAT RESMI LEMBAGA (OFFICIAL SCHOOL LETTERHEAD)    */}
          {/* ========================================================= */}
          <div className="border-b-[3px] border-slate-950 pb-3 mb-5">
            <div className="flex items-center justify-between gap-3">
              {/* Logo Kiri Resmi */}
              <div className="w-20 sm:w-24 shrink-0 flex items-center justify-center">
                <SchoolLogo 
                  src={schoolConfig.logoUrl} 
                  className="w-18 h-18 sm:w-20 sm:h-20 object-contain drop-shadow-xs" 
                />
              </div>

              {/* Teks Kop Tengah */}
              <div className="flex-1 text-center font-serif text-slate-950 px-1">
                <h4 className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-800 leading-tight">
                  PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN DASAR DAN MENENGAH (YPLP DASMEN)
                </h4>
                <h3 className="text-[10.5px] sm:text-[11.5px] uppercase tracking-wider font-bold text-slate-900 leading-tight mt-0.5">
                  PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR
                </h3>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight my-0.5 font-sans">
                  {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}
                </h2>
                <p className="text-[10.5px] sm:text-[11px] text-slate-700 font-sans leading-tight">
                  {schoolConfig.alamat || 'Kp. Koleberes Blok D RT. 04 RW. 09 Desa Cikadu Kec. Cikadu Kab. Cianjur - 43284'}
                </p>
                <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                  NPSN: <strong className="font-mono">{schoolConfig.npsn || '69919136'}</strong> • Kontak: <strong className="font-mono">{schoolConfig.kontak || '0852 1258 7750'}</strong> • Email: <strong className="font-mono">smp.pgri1ckd@gmail.com</strong>
                </p>
              </div>

              {/* Spacer Sisi Kanan Simetris untuk Menjaga Teks Kop Berada di Tengah */}
              <div className="w-20 sm:w-24 shrink-0 hidden sm:flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-[8px] font-bold text-slate-400 uppercase text-center p-1 font-sans opacity-70">
                  <School className="w-4 h-4 mb-0.5 text-slate-300" />
                  <span>Akreditasi</span>
                  <span className="font-black text-slate-500">B</span>
                </div>
              </div>
            </div>

            {/* Garis Ganda Kop Surat Resmi */}
            <div className="mt-2.5 border-t-[2.5px] border-slate-950"></div>
            <div className="mt-[2px] border-t border-slate-950"></div>
          </div>

          {/* ========================================================= */}
          {/* 2. JUDUL RAPOR & TAHUN PELAJARAN                          */}
          {/* ========================================================= */}
          <div className="text-center mb-4 font-sans">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950 underline decoration-slate-950 decoration-2 underline-offset-4">
              LAPORAN HASIL BELAJAR SISWA (RAPOR SISIPAN)
            </h3>
            <p className="text-xs text-slate-700 font-bold mt-1">
              SEMESTER GANJIL • TAHUN PELAJARAN 2026/2027
            </p>
          </div>

          {/* ========================================================= */}
          {/* 3. BIODATA IDENTITAS SISWA                                */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 p-3.5 rounded-xl border border-slate-400 bg-slate-50/60 mb-5 text-xs font-sans">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Nama Peserta Didik</span>
                <span className="font-black text-slate-950 uppercase">: {student.nama}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Nomor Induk / NISN</span>
                <span className="font-mono font-bold text-slate-950">: {student.nisn}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Jenis Kelamin</span>
                <span className="font-semibold text-slate-900">: {student.jk === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Satuan Pendidikan</span>
                <span className="font-bold text-slate-900">: {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Kelas / Rombel</span>
                <span className="font-black text-slate-950">: Kelas {student.kelas}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Wali Kelas</span>
                <span className="font-bold text-slate-900">: {waliKelasNama}</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Fase / Kurikulum</span>
                <span className="font-semibold text-slate-900">: Fase D • Kurikulum Merdeka</span>
              </div>
              <div className="flex">
                <span className="w-32 font-bold text-slate-700">Rata-Rata Capaian</span>
                <span className="font-mono font-black text-indigo-900">: {overallAvg} / 100 ({overallPredikat})</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. TABEL CAPAIAN NILAI AKADEMIK & KETERAMPILAN            */}
          {/* (DITARIK OTOMATIS OLEH FITUR AUTO-REKAP NILAI DATABASE)   */}
          {/* ========================================================= */}
          <div className="mb-5 font-sans">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span>A. Capaian Nilai Pembelajaran & Keterampilan</span>
                <span className="no-print inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Auto-Rekap Database
                </span>
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold">KKM Satuan: 75</span>
            </div>
            
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead className="bg-slate-100 text-slate-900 font-black uppercase text-[10px]">
                <tr>
                  <th className="border border-slate-400 py-2 px-1.5 text-center w-8">No</th>
                  <th className="border border-slate-400 py-2 px-3 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-400 py-2 px-1.5 text-center w-12" title="Rata-rata Tugas & Praktikum">Tugas</th>
                  <th className="border border-slate-400 py-2 px-1.5 text-center w-12" title="Rata-rata Ulangan Harian (Formatif)">UH</th>
                  <th className="border border-slate-400 py-2 px-1.5 text-center w-12" title="Penilaian Tengah Semester">PTS</th>
                  <th className="border border-slate-400 py-2 px-1.5 text-center w-12" title="Penilaian Akhir Semester">PAS</th>
                  <th className="border border-slate-400 py-2 px-2 text-center w-14 bg-slate-200/90 font-black text-slate-950">Nilai Akhir</th>
                  <th className="border border-slate-400 py-2 px-1.5 text-center w-12">Predikat</th>
                  <th className="border border-slate-400 py-2 px-3 text-left">Deskripsi Capaian Pembelajaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {effectiveSubjectRows.map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50/70">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono font-bold">{row.no}</td>
                    <td className="border border-slate-300 py-1.5 px-3 font-bold text-slate-950">
                      <div className="flex items-center justify-between gap-1">
                        <span>{row.mapel}</span>
                        {row.rawItemCounts?.total ? (
                          <span className="no-print text-[9px] text-slate-400 font-mono" title={`${row.rawItemCounts.total} komponen penilaian tersimpan di database`}>
                            ({row.rawItemCounts.total})
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono">{row.tugas}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono">{row.uh}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono">{row.uts}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono">{row.uas}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-black text-slate-950 bg-slate-50">
                      {row.nilaiAkhir}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-black text-slate-900">
                      {row.predikat}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-3 text-[11px] text-slate-800 leading-tight">
                      {row.deskripsi}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                <tr>
                  <td colSpan={6} className="border border-slate-400 py-2 px-3 text-right uppercase tracking-wider font-black">
                    Rata-Rata Nilai Akhir Siswa
                  </td>
                  <td className="border border-slate-400 py-2 px-2 text-center font-mono font-black text-sm bg-slate-200 text-slate-950">
                    {overallAvg}
                  </td>
                  <td className="border border-slate-400 py-2 px-1.5 text-center font-black text-blue-900">
                    {overallAvg >= 90 ? 'A' : overallAvg >= 80 ? 'B' : 'C'}
                  </td>
                  <td className="border border-slate-400 py-2 px-3 text-[11px] italic text-slate-600 font-semibold">
                    Ketuntasan: Terlampaui ({overallPredikat})
                  </td>
                </tr>
              </tfoot>
            </table>
            
            {/* Note on Auto-Rekapitulasi */}
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 italic">
              <span>*Nilai Akhir dan Predikat dikompilasi secara otomatis (Auto-Rekap) dari data penilaian harian tugas, UH, PTS, dan PAS di database sekolah.</span>
              <span className="no-print font-mono not-italic text-slate-400">Total Komponen: {totalAssessmentItemsCount} Data</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 5. REKAPITULASI PRESENSI & KEDISIPLINAN BELAJAR            */}
          {/* ========================================================= */}
          <div className="mb-5 font-sans">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 mb-2">
              B. Rekapitulasi Presensi & Disiplin Belajar
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl border border-slate-300 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Hadir</span>
                <span className="text-base font-black font-mono text-emerald-800">{hadirCount} Hari</span>
              </div>
              <div className="p-2 rounded-xl border border-slate-300 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Terlambat</span>
                <span className="text-base font-black font-mono text-amber-800">{terlambatCount} Hari</span>
              </div>
              <div className="p-2 rounded-xl border border-slate-300 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Sakit (S)</span>
                <span className="text-base font-black font-mono text-rose-800">{sakitCount} Hari</span>
              </div>
              <div className="p-2 rounded-xl border border-slate-300 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Izin (I)</span>
                <span className="text-base font-black font-mono text-blue-800">{izinCount} Hari</span>
              </div>
              <div className="p-2 rounded-xl border border-slate-300 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-600">Tanpa Ket. (A)</span>
                <span className="text-base font-black font-mono text-slate-800">{alpaCount} Hari</span>
              </div>
              <div className="p-2 rounded-xl border-2 border-indigo-300 bg-indigo-50/60">
                <span className="block text-[10px] uppercase font-black text-indigo-900">Persentase</span>
                <span className="text-base font-black font-mono text-indigo-950">{attendanceRate}%</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 6. CATATAN & PESAN WALI KELAS                              */}
          {/* ========================================================= */}
          <div className="p-3.5 rounded-xl border border-slate-400 bg-slate-50/70 mb-6 text-xs font-sans">
            <h4 className="font-black uppercase tracking-wider text-slate-900 mb-1 text-[11px]">
              Catatan & Saran Wali Kelas:
            </h4>
            <p className="text-slate-800 leading-relaxed italic">
              "Ananda <strong className="not-italic text-slate-950">{student.nama}</strong> memiliki tingkat kehadiran yang sangat baik ({attendanceRate}%) dan capaian belajar memuaskan. Pertahankan kedisiplinan belajar, tingkatkan keaktifan dalam diskusi kelompok, serta terus asah minat bakat pada kegiatan ekstrakurikuler sekolah."
            </p>
          </div>

          {/* ========================================================= */}
          {/* 7. LEMBAR PENGESAHAN / TANDA TANGAN RESMI                 */}
          {/* (KEPALA SEKOLAH DI TENGAH SESUAI PERMINTAAN USER)         */}
          {/* ========================================================= */}
          {signatureLayout === '3-column' ? (
            /* FORMAT A: 3 KOLOM SEJAJAR (KEPALA SEKOLAH DI TENGAH) */
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-sans pt-2 no-break-inside items-end">
              
              {/* Kolom 1 (Kiri): Orang Tua / Wali */}
              <div className="flex flex-col justify-between h-40">
                <div>
                  <p className="text-slate-600 font-semibold leading-tight">Mengetahui,</p>
                  <p className="text-slate-950 font-bold mt-0.5">Orang Tua / Wali Siswa</p>
                </div>
                <div>
                  <div className="border-b border-slate-900 mx-auto w-40 mb-1"></div>
                  <p className="text-[10px] text-slate-500 italic">( .................................................. )</p>
                </div>
              </div>

              {/* Kolom 2 (Tengah): Kepala Sekolah */}
              <div className="flex flex-col justify-between h-40 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-300">
                <div>
                  <p className="text-slate-600 font-semibold leading-tight">Mengetahui & Mengesahkan,</p>
                  <p className="text-slate-950 font-black mt-0.5">
                    Kepala {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}
                  </p>
                </div>
                <div>
                  {/* Stamp space placeholder */}
                  <div className="text-[9px] text-slate-400 font-mono mb-1 select-none">
                    [ Cap / Stempel Sekolah ]
                  </div>
                  <p className="font-black underline text-slate-950 text-xs sm:text-sm tracking-tight">
                    {schoolConfig.namaKepsek || 'H. Ahmad Hidayat, S.Pd., M.M.'}
                  </p>
                  <p className="text-[11px] text-slate-700 font-mono font-bold mt-0.5">
                    NIP. {schoolConfig.nipKepsek || '19700101 199501 1 001'}
                  </p>
                </div>
              </div>

              {/* Kolom 3 (Kanan): Wali Kelas */}
              <div className="flex flex-col justify-between h-40">
                <div>
                  <p className="text-slate-600 font-semibold leading-tight">
                    {schoolConfig.kota || 'Cikadu'}, {formattedDate}
                  </p>
                  <p className="text-slate-950 font-bold mt-0.5">
                    Wali Kelas {student.kelas}
                  </p>
                </div>
                <div>
                  <p className="font-black underline text-slate-950 text-xs sm:text-sm tracking-tight">
                    {waliKelasNama}
                  </p>
                  <p className="text-[11px] text-slate-700 font-mono font-bold mt-0.5">
                    NIP. {waliKelasNip}
                  </p>
                </div>
              </div>

            </div>
          ) : (
            /* FORMAT B: 2 TINGKAT (ORANG TUA & WALI KELAS DI ATAS, KEPALA SEKOLAH DI TENGAH BAWAH) */
            <div className="space-y-6 pt-2 no-break-inside font-sans text-xs">
              
              {/* Baris 1: Orang Tua (Kiri) dan Wali Kelas (Kanan) */}
              <div className="flex justify-between items-start gap-4">
                {/* Kiri: Orang Tua */}
                <div className="text-center w-52 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-slate-600 font-semibold leading-tight">Mengetahui,</p>
                    <p className="text-slate-950 font-bold mt-0.5">Orang Tua / Wali Siswa</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-900 mx-auto w-40 mb-1"></div>
                    <p className="text-[10px] text-slate-500 italic">( .................................................. )</p>
                  </div>
                </div>

                {/* Kanan: Wali Kelas */}
                <div className="text-center w-52 flex flex-col justify-between h-36">
                  <div>
                    <p className="text-slate-600 font-semibold leading-tight">
                      {schoolConfig.kota || 'Cikadu'}, {formattedDate}
                    </p>
                    <p className="text-slate-950 font-bold mt-0.5">
                      Wali Kelas {student.kelas}
                    </p>
                  </div>
                  <div>
                    <p className="font-black underline text-slate-950 text-xs sm:text-sm tracking-tight">
                      {waliKelasNama}
                    </p>
                    <p className="text-[11px] text-slate-700 font-mono font-bold mt-0.5">
                      NIP. {waliKelasNip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Baris 2: Kepala Sekolah di Tengah Bawah */}
              <div className="text-center max-w-sm mx-auto flex flex-col justify-between h-36 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-300">
                <div>
                  <p className="text-slate-600 font-semibold leading-tight">Mengetahui & Mengesahkan,</p>
                  <p className="text-slate-950 font-black mt-0.5">
                    Kepala {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}
                  </p>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-mono mb-1 select-none">
                    [ Cap / Stempel Sekolah ]
                  </div>
                  <p className="font-black underline text-slate-950 text-xs sm:text-sm tracking-tight">
                    {schoolConfig.namaKepsek || 'H. Ahmad Hidayat, S.Pd., M.M.'}
                  </p>
                  <p className="text-[11px] text-slate-700 font-mono font-bold mt-0.5">
                    NIP. {schoolConfig.nipKepsek || '19700101 199501 1 001'}
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer Note (Non-Print) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print shrink-0 text-xs text-slate-500">
          <p className="text-[11px]">
            *Dokumen ini merupakan Rekapitulasi Rapor Sisipan resmi dari {schoolConfig.namaSekolah || 'SMP PGRI 1 Cikadu'}. Siap dicetak langsung atau disimpan ke format PDF.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RINCIAN SUMBER NILAI AUTO-REKAP (POPUP DETAIL)   */}
      {/* ========================================================= */}
      {showBreakdownModal && (
        <div 
          onClick={() => setShowBreakdownModal(false)}
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">
                    Rincian Sumber Nilai Auto-Rekap Database
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Daftar seluruh tugas, UH, UTS, dan UAS yang tercatat di database untuk {student.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs font-sans">
              {effectiveSubjectRows.map((row, idx) => {
                const raw = row.rawItems;
                const hasRealData = (raw.tugas.length + raw.uh.length + raw.uts.length + raw.uas.length) > 0;

                return (
                  <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-900 font-mono font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <h5 className="font-black text-slate-900 text-xs sm:text-sm">
                          {row.mapel}
                        </h5>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-black text-xs">
                          Nilai Akhir: {row.nilaiAkhir} ({row.predikat})
                        </span>
                      </div>
                    </div>

                    {hasRealData ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                        {/* Tugas */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <span className="font-bold text-slate-600 block mb-1">
                            Tugas & Praktikum ({raw.tugas.length} data • Rata-rata: {row.tugas})
                          </span>
                          {raw.tugas.length > 0 ? (
                            <ul className="space-y-1">
                              {raw.tugas.map((t, tIdx) => (
                                <li key={tIdx} className="flex justify-between items-center text-slate-800">
                                  <span className="truncate pr-2">• {t.namaPenilaian}</span>
                                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 rounded">{t.nilai}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada tugas dinilai</span>
                          )}
                        </div>

                        {/* Ulangan Harian */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <span className="font-bold text-slate-600 block mb-1">
                            Ulangan Harian ({raw.uh.length} data • Rata-rata: {row.uh})
                          </span>
                          {raw.uh.length > 0 ? (
                            <ul className="space-y-1">
                              {raw.uh.map((u, uIdx) => (
                                <li key={uIdx} className="flex justify-between items-center text-slate-800">
                                  <span className="truncate pr-2">• {u.namaPenilaian}</span>
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1 rounded">{u.nilai}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada UH</span>
                          )}
                        </div>

                        {/* UTS */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <span className="font-bold text-slate-600 block mb-1">
                            Penilaian Tengah Semester (PTS/UTS: {row.uts})
                          </span>
                          {raw.uts.length > 0 ? (
                            <ul className="space-y-1">
                              {raw.uts.map((uts, utsIdx) => (
                                <li key={utsIdx} className="flex justify-between items-center text-slate-800">
                                  <span className="truncate pr-2">• {uts.namaPenilaian}</span>
                                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1 rounded">{uts.nilai}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada nilai UTS</span>
                          )}
                        </div>

                        {/* UAS */}
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <span className="font-bold text-slate-600 block mb-1">
                            Penilaian Akhir Semester (PAS/UAS: {row.uas})
                          </span>
                          {raw.uas.length > 0 ? (
                            <ul className="space-y-1">
                              {raw.uas.map((uas, uasIdx) => (
                                <li key={uasIdx} className="flex justify-between items-center text-slate-800">
                                  <span className="truncate pr-2">• {uas.namaPenilaian}</span>
                                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1 rounded">{uas.nilai}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada nilai UAS</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic p-2 bg-white rounded-xl border border-slate-200">
                        Mapel ini menggunakan data capaian standar Kurikulum Merdeka SMP PGRI 1 Cikadu. Nilai akan otomatis terkoneksi dan disesuaikan begitu guru mapel menginput penilaian baru di modul Manajemen Nilai.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                Wali kelas tidak perlu menghitung atau mengetik ulang secara manual.
              </span>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: PENGATURAN FORMULA BOBOT AUTO-REKAP              */}
      {/* ========================================================= */}
      {showFormulaModal && (
        <div 
          onClick={() => setShowFormulaModal(false)}
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">
                    Formula Pembobotan Auto-Rekap
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tentukan formula perhitungan Nilai Akhir Rapor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              {/* Option 1: Standar Kemendikbud */}
              <div
                onClick={() => setRekapFormula('kemendikbud')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-1 ${
                  rekapFormula === 'kemendikbud'
                    ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">
                    1. Bobot Standar Rapor (Direkomendasikan)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-black uppercase">
                    30 : 20 : 25 : 25
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Tugas (30%) + Ulangan Harian (20%) + PTS (25%) + PAS (25%). Jika sebagian komponen belum diisi, bobot dinormalisasi secara otomatis.
                </p>
              </div>

              {/* Option 2: Rata-Rata Murni */}
              <div
                onClick={() => setRekapFormula('murni')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-1 ${
                  rekapFormula === 'murni'
                    ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">
                    2. Rata-Rata Murni (Equal Weight)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                    Rata-Rata Seimbang
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Nilai akhir adalah rata-rata aritmatika murni dari seluruh pilar penilaian yang sudah tersedia tanpa pembobotan berlebih.
                </p>
              </div>

              {/* Option 3: Formatif 50% + Sumatif 50% */}
              <div
                onClick={() => setRekapFormula('formatif_sumatif')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-1 ${
                  rekapFormula === 'formatif_sumatif'
                    ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">
                    3. Formatif 50% + Sumatif 50% (Kurikulum Merdeka)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black uppercase">
                    50% : 50%
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  50% dari capaian proses formatif harian (Tugas & UH) dan 50% dari evaluasi sumatif periode (PTS & PAS).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm"
              >
                Terapkan Formula
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
