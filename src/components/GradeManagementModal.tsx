import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Award, 
  Trash2, 
  Edit3, 
  Save, 
  Search, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Filter, 
  Sparkles, 
  GraduationCap,
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  RotateCcw,
  TrendingUp,
  FileText,
  Users,
  Table,
  Eye,
  Printer,
  ChevronRight,
  AlertCircle,
  BarChart3,
  SlidersHorizontal,
  CheckSquare,
  Sliders,
  Target
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, StudentGradeItem, SchoolConfig, AttendanceRecord, TeacherUser } from '../types';
import { DatabaseService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  getTeacherAccessibleClasses, 
  isClassMatch, 
  getTeacherAssignedSubjects,
  getTeacherClassesForSubject,
  isSubjectMatch,
  normalizeClassName
} from '../utils/teacherFilter';
import { 
  exportGradeTemplateExcel, 
  exportClassGradeLedgerTemplateExcel,
  exportStudentGradesExcel 
} from '../utils/exportExcel';
import { StudentReportCardModal } from './StudentReportCardModal';

interface GradeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  grades: StudentGradeItem[];
  schoolConfig?: SchoolConfig;
  attendanceRecords?: AttendanceRecord[];
  teachers?: TeacherUser[];
  onSaveGrade: (grade: StudentGradeItem) => Promise<void>;
  onBulkSaveGrades?: (grades: StudentGradeItem[]) => Promise<void>;
  onDeleteGrade: (id: string) => Promise<void>;
  onBulkDeleteGrades?: (ids: string[]) => Promise<void>;
  currentTeacherName?: string;
  defaultMapel?: string;
}

const DEFAULT_MAPEL_LIST = [
  'Pendidikan Pancasila & PKN',
  'Pendidikan Pancasila dan Kewarganegaraan (PPKn)',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pendidikan Agama Islam (PAI)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Seni Budaya',
  'Pendidikan Jasmani & Olahraga (PJOK)',
  'Informatika',
  'Prakarya & Kewirausahaan',
  'Bahasa Sunda (Mulok)',
  'Bahasa Arab (Mulok)',
];

const ASSESSMENT_TYPES: Array<StudentGradeItem['jenisPenilaian']> = [
  'Tugas',
  'Ulangan Harian',
  'UTS',
  'UAS',
  'Praktikum'
];

const QUICK_NOTES = [
  'Sangat Baik & Aktif',
  'Tuntas KKM',
  'Perlu Remedial',
  'Pemahaman Cukup',
  'Tugas Selesai Tepat Waktu',
  'Perlu Pendampingan',
  'Pertahankan Prestasi'
];

export const GradeManagementModal: React.FC<GradeManagementModalProps> = ({
  isOpen,
  onClose,
  students,
  grades,
  schoolConfig = {
    namaSekolah: 'SMP PGRI 1 CIKADU',
    npsn: '20252877',
    kota: 'Cianjur',
    alamat: 'Kecamatan Cikadu, Kabupaten Cianjur',
    kontak: '08123456789',
    namaKepsek: 'Kepala Sekolah, M.Pd.',
    nipKepsek: '-',
    namaPetugasPiket: 'Petugas Piket',
    sistemHariSekolah: '6_HARI',
    kkmDefault: 75,
    kkmPerMapel: {
      'Pendidikan Agama Islam (PAI)': 75,
      'Pendidikan Pancasila & PKN': 75,
      'Bahasa Indonesia': 75,
      'Matematika': 70,
      'Ilmu Pengetahuan Alam (IPA)': 70,
      'Ilmu Pengetahuan Sosial (IPS)': 75,
      'Bahasa Inggris': 70,
      'Seni Budaya': 75,
      'Pendidikan Jasmani & Olahraga (PJOK)': 75,
      'Informatika': 75,
      'Prakarya & Kewirausahaan': 75,
      'Bahasa Sunda (Mulok)': 75,
      'Bahasa Arab (Mulok)': 75,
    },
    jadwal: {
      pagiMulai: '06:30',
      pagiBatasTepatWaktu: '07:15',
      pagiBatasAkhir: '11:30',
      siangMulai: '12:00',
      siangBatasTepatWaktu: '13:30',
      siangBatasAkhir: '15:30',
      toleransiMenit: 5,
    }
  },
  attendanceRecords = [],
  teachers = [],
  onSaveGrade,
  onBulkSaveGrades,
  onDeleteGrade,
  onBulkDeleteGrades,
  defaultMapel,
}) => {
  const { user, actingAsPiket } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.role === 'guru' && !actingAsPiket;

  // Active Main Tabs:
  // 'kolektif' = Input Daftar Siswa
  // 'matrix' = Buku Nilai Komplet Rombel
  // 'excel' = Impor & Ekspor Excel
  // 'kkm' = Pengaturan KKM Mapel & Sekolah
  // 'riwayat' = Riwayat & Rekap Nilai
  // 'rapor' = Rekap Rapor Digital Kelas
  const [activeTab, setActiveTab] = useState<'kolektif' | 'matrix' | 'excel' | 'kkm' | 'riwayat' | 'rapor'>('kolektif');

  // Teacher Scoped Classes & Mapel
  const teacherClasses = useMemo(() => {
    return isTeacher ? getTeacherAccessibleClasses(user) : [];
  }, [isTeacher, user]);

  const teacherAssignedSubjects = useMemo(() => {
    if (isTeacher) {
      const subs = getTeacherAssignedSubjects(user);
      return subs.length > 0 ? subs : [user.mapel || 'Pendidikan Pancasila & PKN'];
    }
    return DEFAULT_MAPEL_LIST;
  }, [isTeacher, user]);

  // Target mapel list specifically scoped for KKM configuration
  const kkmTargetMapelList = useMemo(() => {
    if (isTeacher) {
      const subs = getTeacherAssignedSubjects(user);
      return subs.length > 0 ? subs : [user?.mapel || 'Pendidikan Pancasila & PKN'];
    }
    return DEFAULT_MAPEL_LIST;
  }, [isTeacher, user]);

  const [mapel, setMapel] = useState<string>(
    isTeacher && teacherAssignedSubjects.length > 0 
      ? teacherAssignedSubjects[0] 
      : (user?.mapel || defaultMapel || 'Pendidikan Pancasila & PKN')
  );

  // Auto-sync mapel if teacher only has specific subjects
  useEffect(() => {
    if (isTeacher && teacherAssignedSubjects.length > 0 && !teacherAssignedSubjects.some(s => isSubjectMatch(s, mapel))) {
      setMapel(teacherAssignedSubjects[0]);
    }
  }, [isTeacher, teacherAssignedSubjects, mapel]);

  // Classes list scoped per subject for teacher
  const classes = useMemo(() => {
    if (isTeacher) {
      const cls = getTeacherClassesForSubject(user, mapel);
      if (cls.length > 0) return cls;
      if (teacherClasses.length > 0) return teacherClasses;
    }
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [isTeacher, teacherClasses, students, user, mapel]);

  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || '7A');
  const [jenisPenilaian, setJenisPenilaian] = useState<StudentGradeItem['jenisPenilaian']>('Tugas');
  const [namaPenilaian, setNamaPenilaian] = useState<string>('Tugas 1');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

  // -------------------------------------------------------------
  // KKM (Kriteria Ketuntasan Minimal) State & Calculations
  // -------------------------------------------------------------
  const [localKkmMap, setLocalKkmMap] = useState<Record<string, number>>(() => schoolConfig.kkmPerMapel || {});
  const [localDefaultKkm, setLocalDefaultKkm] = useState<number>(schoolConfig.kkmDefault || 75);
  const [isSavingKkm, setIsSavingKkm] = useState<boolean>(false);

  // Keep synced if schoolConfig updates
  useEffect(() => {
    if (schoolConfig.kkmPerMapel) {
      setLocalKkmMap(schoolConfig.kkmPerMapel);
    }
    if (schoolConfig.kkmDefault) {
      setLocalDefaultKkm(schoolConfig.kkmDefault);
    }
  }, [schoolConfig]);

  // Active KKM for current subject
  const activeKkm = useMemo(() => {
    return localKkmMap[mapel] ?? schoolConfig.kkmPerMapel?.[mapel] ?? localDefaultKkm ?? 75;
  }, [localKkmMap, schoolConfig.kkmPerMapel, localDefaultKkm, mapel]);

  const handleSaveKkmSettings = async () => {
    setIsSavingKkm(true);
    try {
      const updatedConfig: SchoolConfig = {
        ...schoolConfig,
        kkmDefault: localDefaultKkm,
        kkmPerMapel: localKkmMap,
      };
      await DatabaseService.saveSchoolConfig(updatedConfig);
      toast.success('Pengaturan KKM Berhasil Disimpan', 'Nilai KKM telah diperbarui dan disinkronkan ke seluruh sistem.');
    } catch (err) {
      console.error('Failed to save KKM', err);
      toast.error('Gagal Menyimpan KKM', 'Terjadi kesalahan saat menyimpan pengaturan KKM.');
    } finally {
      setIsSavingKkm(false);
    }
  };

  const handleQuickSetMapelKkm = async (newVal: number) => {
    const clamped = Math.max(0, Math.min(100, newVal));
    const nextMap = { ...localKkmMap, [mapel]: clamped };
    setLocalKkmMap(nextMap);
    try {
      const updatedConfig: SchoolConfig = {
        ...schoolConfig,
        kkmPerMapel: nextMap,
      };
      await DatabaseService.saveSchoolConfig(updatedConfig);
      toast.info('KKM Mapel Diperbarui', `KKM untuk ${mapel} disetel ke ${clamped}.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Sync selectedClass if not in allowed classes
  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => isClassMatch(c, selectedClass))) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  // Filter students in current class
  const [studentSearch, setStudentSearch] = useState<string>('');

  const classStudents = useMemo(() => {
    return students
      .filter((s) => isClassMatch(s.kelas, selectedClass))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [students, selectedClass]);

  const displayedStudents = useMemo(() => {
    if (!studentSearch.trim()) return classStudents;
    const q = studentSearch.toLowerCase();
    return classStudents.filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
  }, [classStudents, studentSearch]);

  // -------------------------------------------------------------
  // COLLECTIVE BATCH GRADE STATE (Per Class Student List)
  // -------------------------------------------------------------
  const [batchScores, setBatchScores] = useState<Record<string, number | ''>>({});
  const [batchNotes, setBatchNotes] = useState<Record<string, string>>({});
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // Input refs for smooth keyboard navigation (Enter/Arrow keys)
  const scoreInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Initialize or load existing grades when class, mapel, or assessment name changes
  useEffect(() => {
    const initialScores: Record<string, number | ''> = {};
    const initialNotes: Record<string, string> = {};

    classStudents.forEach((s) => {
      const existing = grades.find((g) => 
        g.nisn === s.nisn &&
        isSubjectMatch(g.mapel, mapel) &&
        g.jenisPenilaian === jenisPenilaian &&
        g.namaPenilaian.trim().toLowerCase() === namaPenilaian.trim().toLowerCase()
      );

      if (existing) {
        initialScores[s.nisn] = existing.nilai;
        initialNotes[s.nisn] = existing.komentarGuru || '';
      } else {
        initialScores[s.nisn] = '';
        initialNotes[s.nisn] = '';
      }
    });

    setBatchScores(initialScores);
    setBatchNotes(initialNotes);
  }, [classStudents, mapel, jenisPenilaian, namaPenilaian, grades]);

  // Batch Quick Set Handlers
  const handleQuickSetAllScores = (score: number) => {
    const next: Record<string, number | ''> = {};
    classStudents.forEach((s) => {
      next[s.nisn] = score;
    });
    setBatchScores(next);
    toast.info('Nilai Diisi Cepat', `Seluruh siswa rombel Kelas ${selectedClass} disetel nilai ${score}.`);
  };

  const handleClearAllScores = () => {
    const next: Record<string, number | ''> = {};
    const nextNotes: Record<string, string> = {};
    classStudents.forEach((s) => {
      next[s.nisn] = '';
      nextNotes[s.nisn] = '';
    });
    setBatchScores(next);
    setBatchNotes(nextNotes);
    toast.info('Form Dikosongkan', `Nilai dan catatan rombel Kelas ${selectedClass} dikosongkan.`);
  };

  const handleScoreChange = (nisn: string, valueStr: string) => {
    if (valueStr === '') {
      setBatchScores((prev) => ({ ...prev, [nisn]: '' }));
      return;
    }
    const val = Number(valueStr);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(100, val));
      setBatchScores((prev) => ({ ...prev, [nisn]: clamped }));
    }
  };

  const handleNoteChange = (nisn: string, note: string) => {
    setBatchNotes((prev) => ({ ...prev, [nisn]: note }));
  };

  const handleQuickTagNote = (nisn: string, tag: string) => {
    setBatchNotes((prev) => {
      const current = prev[nisn]?.trim();
      if (!current) return { ...prev, [nisn]: tag };
      if (current.includes(tag)) return prev;
      return { ...prev, [nisn]: `${current}, ${tag}` };
    });
  };

  // Keyboard navigation between student rows
  const handleScoreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIdx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextStudent = displayedStudents[currentIdx + 1];
      if (nextStudent && scoreInputRefs.current[nextStudent.nisn]) {
        scoreInputRefs.current[nextStudent.nisn]?.focus();
        scoreInputRefs.current[nextStudent.nisn]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevStudent = displayedStudents[currentIdx - 1];
      if (prevStudent && scoreInputRefs.current[prevStudent.nisn]) {
        scoreInputRefs.current[prevStudent.nisn]?.focus();
        scoreInputRefs.current[prevStudent.nisn]?.select();
      }
    }
  };

  // Submit Collective Batch Grades
  const handleSaveBatchGrades = async () => {
    if (!namaPenilaian.trim()) {
      toast.warning('Nama Penilaian Kosong', 'Harap isi nama penilaian atau kompetensi dasar (e.g. Tugas 1 / UH 1).');
      return;
    }

    const itemsToSave: StudentGradeItem[] = [];
    classStudents.forEach((s) => {
      const score = batchScores[s.nisn];
      if (score !== '' && score !== undefined && typeof score === 'number') {
        const gradeId = `GRD_${s.nisn}_${mapel.replace(/[^a-zA-Z0-9]/g, '_')}_${jenisPenilaian}_${namaPenilaian.replace(/[^a-zA-Z0-9]/g, '_')}`;
        itemsToSave.push({
          id: gradeId,
          nisn: s.nisn,
          mapel: mapel.trim(),
          jenisPenilaian,
          namaPenilaian: namaPenilaian.trim(),
          nilai: score,
          tanggal,
          komentarGuru: batchNotes[s.nisn]?.trim() || undefined,
          semester,
          tahunAjaran: '2026/2027',
        });
      }
    });

    if (itemsToSave.length === 0) {
      toast.warning('Belum Ada Nilai', 'Harap isi nilai minimal untuk 1 orang siswa sebelum menyimpan.');
      return;
    }

    setIsSavingBatch(true);
    try {
      if (onBulkSaveGrades) {
        await onBulkSaveGrades(itemsToSave);
      } else {
        await DatabaseService.bulkSaveStudentGrades(itemsToSave);
        for (const item of itemsToSave) {
          await onSaveGrade(item);
        }
      }
      toast.success('Nilai Kelas Berhasil Disimpan', `${itemsToSave.length} nilai siswa ${jenisPenilaian} (${namaPenilaian}) Kelas ${selectedClass} berhasil disimpan.`);
    } catch (err) {
      console.error('Failed to save batch grades', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan nilai siswa.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Collective Live Statistics using activeKkm
  const batchStats = useMemo(() => {
    const filledScores = classStudents
      .map((s) => batchScores[s.nisn])
      .filter((v): v is number => typeof v === 'number');

    const total = classStudents.length;
    const filledCount = filledScores.length;
    if (filledCount === 0) {
      return { total, filledCount, avg: 0, tuntas: 0, belumTuntas: 0, highest: 0, lowest: 0 };
    }

    const sum = filledScores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / filledCount) * 10) / 10;
    const tuntas = filledScores.filter((s) => s >= activeKkm).length;
    const belumTuntas = filledScores.filter((s) => s < activeKkm).length;
    const highest = Math.max(...filledScores);
    const lowest = Math.min(...filledScores);

    return { total, filledCount, avg, tuntas, belumTuntas, highest, lowest };
  }, [classStudents, batchScores, activeKkm]);

  // -------------------------------------------------------------
  // TAB 4: RIWAYAT & REKAP DATA NILAI SISWA
  // -------------------------------------------------------------
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('Semua');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('Semua');
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Single Edit Modal State
  const [editingGrade, setEditingGrade] = useState<StudentGradeItem | null>(null);
  const [editScore, setEditScore] = useState<number>(85);
  const [editNote, setEditNote] = useState<string>('');
  const [editNamaPenilaian, setEditNamaPenilaian] = useState<string>('');
  const [isUpdatingSingle, setIsUpdatingSingle] = useState<boolean>(false);

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      // 1. Teacher subject scope
      if (isTeacher && teacherAssignedSubjects.length > 0) {
        const isAllowed = teacherAssignedSubjects.some((m) => isSubjectMatch(m, g.mapel));
        if (!isAllowed) return false;
      }
      // 2. Class filter
      const student = students.find((s) => s.nisn === g.nisn);
      if (historyClassFilter !== 'Semua' && (!student || !isClassMatch(student.kelas, historyClassFilter))) {
        return false;
      }
      // 3. Assessment Type filter
      if (historyTypeFilter !== 'Semua' && g.jenisPenilaian !== historyTypeFilter) {
        return false;
      }
      // 4. Search query
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchStudent = student && (student.nama.toLowerCase().includes(q) || student.nisn.includes(q));
        const matchMapel = g.mapel.toLowerCase().includes(q);
        const matchPenilaian = g.namaPenilaian.toLowerCase().includes(q);
        const matchNote = g.komentarGuru && g.komentarGuru.toLowerCase().includes(q);
        if (!matchStudent && !matchMapel && !matchPenilaian && !matchNote) return false;
      }
      return true;
    });
  }, [grades, isTeacher, teacherAssignedSubjects, students, historyClassFilter, historyTypeFilter, historySearch]);

  const handleOpenEditSingle = (item: StudentGradeItem) => {
    setEditingGrade(item);
    setEditScore(item.nilai);
    setEditNote(item.komentarGuru || '');
    setEditNamaPenilaian(item.namaPenilaian);
  };

  const handleSaveEditSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrade) return;

    setIsUpdatingSingle(true);
    try {
      const updated: StudentGradeItem = {
        ...editingGrade,
        nilai: editScore,
        namaPenilaian: editNamaPenilaian.trim() || editingGrade.namaPenilaian,
        komentarGuru: editNote.trim() || undefined,
      };
      await onSaveGrade(updated);
      setEditingGrade(null);
      toast.success('Nilai Diperbarui', 'Perubahan nilai siswa berhasil disimpan.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal Memperbarui', 'Terjadi kesalahan saat menyimpan nilai.');
    } finally {
      setIsUpdatingSingle(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGradeIds.length === 0) return;
    const count = selectedGradeIds.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} DATA NILAI SISWA TERPILIH?\n\nData nilai terpilih akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      if (onBulkDeleteGrades) {
        await onBulkDeleteGrades(selectedGradeIds);
      } else {
        await DatabaseService.bulkDeleteStudentGrades(selectedGradeIds);
      }
      setSelectedGradeIds([]);
      toast.delete('Nilai Dihapus', `${count} data nilai siswa berhasil dihapus.`);
    } catch (err) {
      console.error('Failed to bulk delete student grades', err);
      toast.error('Gagal Menghapus', 'Terjadi kesalahan saat menghapus data nilai.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: EXCEL IMPORT & EXPORT TAB STATE
  // -------------------------------------------------------------
  const [templateKelas, setTemplateKelas] = useState<string>(classes[0] || '7A');
  const [templateMapel, setTemplateMapel] = useState<string>(mapel);
  const [templateJenis, setTemplateJenis] = useState<StudentGradeItem['jenisPenilaian']>('Tugas');
  const [templateNama, setTemplateNama] = useState<string>('Tugas 1');
  const [templateTanggal, setTemplateTanggal] = useState<string>(tanggal);

  const [importedPreview, setImportedPreview] = useState<StudentGradeItem[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isProcessingImport, setIsProcessingImport] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download Single Excel Template
  const handleDownloadTemplate = () => {
    exportGradeTemplateExcel(
      students,
      schoolConfig,
      templateKelas,
      templateMapel,
      templateJenis,
      templateNama,
      templateTanggal
    );
    toast.success('Template Excel Diunduh', `Format pengisian nilai Kelas ${templateKelas} (${templateMapel}) siap diisi di laptop.`);
  };

  // 2. Download Multi-Assessment Ledger Template
  const handleDownloadLedgerTemplate = () => {
    exportClassGradeLedgerTemplateExcel(
      students,
      schoolConfig,
      templateKelas,
      templateMapel
    );
    toast.success('Template Buku Nilai Diunduh', `Format buku nilai lengkap (Tugas, UH, UTS, UAS) Kelas ${templateKelas} siap diisi di laptop.`);
  };

  // 3. Export Current Filtered Grades to Excel
  const handleExportGradesExcel = () => {
    exportStudentGradesExcel(
      filteredGrades,
      students,
      schoolConfig,
      historyClassFilter,
      mapel
    );
    toast.success('Ekspor Excel Berhasil', `${filteredGrades.length} data nilai siswa berhasil diunduh ke Excel.`);
  };

  // 4. Upload & Parse Excel File for Grades (Supports Single & Multi-Column Ledger!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.upload('Membaca Berkas Excel Nilai', 'Memvalidasi data nilai siswa...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const parsedList: StudentGradeItem[] = [];

        rawData.forEach((row) => {
          const rawNisn = String(
            row['NISN'] || 
            row['nisn'] || 
            row['Nisn'] || ''
          ).trim();

          const rawNama = String(
            row['Nama Lengkap Siswa'] || 
            row['Nama Siswa'] || 
            row['Nama'] || ''
          ).trim();

          const student = students.find((s) => 
            (rawNisn && s.nisn === rawNisn) || 
            (rawNama && s.nama.toLowerCase().trim() === rawNama.toLowerCase().trim())
          );

          const studentNisn = student?.nisn || rawNisn;
          if (!studentNisn) return;

          const rowMapel = String(
            row['Mata Pelajaran'] || 
            row['Mapel'] || 
            templateMapel || mapel
          ).trim();

          // Check if multi-assessment columns exist in the row
          const possibleAssessments: Array<{ key: string; jenis: StudentGradeItem['jenisPenilaian']; nama: string }> = [
            { key: 'Tugas 1', jenis: 'Tugas', nama: 'Tugas 1' },
            { key: 'Tugas 2', jenis: 'Tugas', nama: 'Tugas 2' },
            { key: 'UH 1 (Ulangan Harian 1)', jenis: 'Ulangan Harian', nama: 'UH 1' },
            { key: 'UH 1', jenis: 'Ulangan Harian', nama: 'UH 1' },
            { key: 'UH 2 (Ulangan Harian 2)', jenis: 'Ulangan Harian', nama: 'UH 2' },
            { key: 'UH 2', jenis: 'Ulangan Harian', nama: 'UH 2' },
            { key: 'PTS / UTS', jenis: 'UTS', nama: 'UTS' },
            { key: 'PTS', jenis: 'UTS', nama: 'UTS' },
            { key: 'UTS', jenis: 'UTS', nama: 'UTS' },
            { key: 'PAS / UAS', jenis: 'UAS', nama: 'UAS' },
            { key: 'PAS', jenis: 'UAS', nama: 'UAS' },
            { key: 'UAS', jenis: 'UAS', nama: 'UAS' },
          ];

          let foundMultiColumn = false;
          const rowNote = String(
            row['Catatan & Evaluasi Guru'] || 
            row['Catatan / Komentar Guru'] || 
            row['Catatan'] || 
            row['Komentar'] || ''
          ).trim();

          possibleAssessments.forEach((asmt) => {
            if (row[asmt.key] !== undefined && row[asmt.key] !== '') {
              const val = Number(row[asmt.key]);
              if (!isNaN(val)) {
                foundMultiColumn = true;
                const score = Math.max(0, Math.min(100, val));
                const gradeId = `GRD_${studentNisn}_${rowMapel.replace(/[^a-zA-Z0-9]/g, '_')}_${asmt.jenis}_${asmt.nama.replace(/[^a-zA-Z0-9]/g, '_')}`;
                parsedList.push({
                  id: gradeId,
                  nisn: studentNisn,
                  mapel: rowMapel,
                  jenisPenilaian: asmt.jenis,
                  namaPenilaian: asmt.nama,
                  nilai: score,
                  tanggal: new Date().toISOString().split('T')[0],
                  komentarGuru: rowNote || undefined,
                  semester: 'Ganjil',
                  tahunAjaran: '2026/2027',
                });
              }
            }
          });

          // Single-column fallback
          if (!foundMultiColumn) {
            const rowJenisRaw = String(
              row['Jenis Penilaian'] || 
              row['Jenis'] || 
              templateJenis || 'Tugas'
            ).trim();

            let rowJenis: StudentGradeItem['jenisPenilaian'] = 'Tugas';
            if (rowJenisRaw.toLowerCase().includes('ulangan') || rowJenisRaw.toLowerCase().includes('uh')) rowJenis = 'Ulangan Harian';
            else if (rowJenisRaw.toLowerCase().includes('uts') || rowJenisRaw.toLowerCase().includes('tengah')) rowJenis = 'UTS';
            else if (rowJenisRaw.toLowerCase().includes('uas') || rowJenisRaw.toLowerCase().includes('akhir')) rowJenis = 'UAS';
            else if (rowJenisRaw.toLowerCase().includes('praktik') || rowJenisRaw.toLowerCase().includes('kinerja')) rowJenis = 'Praktikum';

            const rowNamaPenilaian = String(
              row['Nama Penilaian / KD / Materi'] || 
              row['Nama Penilaian'] || 
              row['KD'] || 
              row['Materi'] || 
              templateNama || 'Tugas 1'
            ).trim();

            const rowTanggal = String(
              row['Tanggal (YYYY-MM-DD)'] || 
              row['Tanggal'] || 
              templateTanggal || tanggal
            ).trim();

            const rawNilai = Number(
              row['Nilai (0 - 100)'] || 
              row['Nilai'] || 
              row['Angka'] || 0
            );
            const score = isNaN(rawNilai) ? 0 : Math.max(0, Math.min(100, rawNilai));

            const gradeId = `GRD_${studentNisn}_${rowMapel.replace(/[^a-zA-Z0-9]/g, '_')}_${rowJenis}_${rowNamaPenilaian.replace(/[^a-zA-Z0-9]/g, '_')}`;

            parsedList.push({
              id: gradeId,
              nisn: studentNisn,
              mapel: rowMapel,
              jenisPenilaian: rowJenis,
              namaPenilaian: rowNamaPenilaian,
              nilai: score,
              tanggal: rowTanggal || new Date().toISOString().split('T')[0],
              komentarGuru: rowNote || undefined,
              semester: 'Ganjil',
              tahunAjaran: '2026/2027',
            });
          }
        });

        if (parsedList.length > 0) {
          setImportedPreview(parsedList);
          setIsImportModalOpen(true);
          toast.success('Berkas Excel Terbaca', `Ditemukan ${parsedList.length} data nilai siswa siap diimpor.`);
        } else {
          toast.warning('Berkas Kosong', 'Tidak ada data nilai siswa yang valid pada berkas Excel.');
        }
      } catch (err) {
        console.error('Error importing grades Excel file:', err);
        toast.error('Gagal Membaca File', 'Pastikan format kolom Excel sesuai dengan template.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 5. Confirm and Bulk Save Imported Grades
  const handleConfirmImport = async () => {
    if (importedPreview.length === 0) return;
    setIsProcessingImport(true);
    try {
      if (onBulkSaveGrades) {
        await onBulkSaveGrades(importedPreview);
      } else {
        await DatabaseService.bulkSaveStudentGrades(importedPreview);
        for (const g of importedPreview) {
          await onSaveGrade(g);
        }
      }
      setIsImportModalOpen(false);
      setImportedPreview([]);
      setActiveTab('riwayat');
      toast.success('Impor Nilai Berhasil', `${importedPreview.length} data nilai siswa dari Excel berhasil disimpan.`);
    } catch (err) {
      console.error('Failed to save imported grades', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan nilai dari Excel.');
    } finally {
      setIsProcessingImport(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 5: REKAP RAPOR DIGITAL & CETAK RAPOR PER KELAS
  // -------------------------------------------------------------
  const [selectedRaporStudent, setSelectedRaporStudent] = useState<Student | null>(null);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-7xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] my-auto animate-in zoom-in-95"
      >
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold shadow-inner">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Manajemen Nilai & Rapor Siswa
                </h3>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                  {isTeacher ? `Guru: ${user?.nama}` : 'Admin Supervisi'}
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium mt-0.5">
                Daftaran input nilai per rombel, catatan guru, impor/ekspor Excel laptop, pengaturan KKM, serta rekap rapor digital
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-colors"
            title="Tutup Jendela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('kolektif')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'kolektif'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Daftar Input Nilai & Catatan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>2. Buku Nilai Lengkap (Leger)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('excel')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>3. Impor & Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kkm')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'kkm'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-4 h-4 text-purple-600" />
              <span>4. Pengaturan KKM (Target: {activeKkm})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('riwayat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'riwayat'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>5. Riwayat Semua Nilai ({filteredGrades.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rapor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                activeTab === 'rapor'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>6. Rekap Rapor Digital</span>
            </button>
          </div>

          {/* Quick Context Pill with KKM indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
              🎯 KKM: <strong>{activeKkm}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 truncate max-w-xs">
              Mapel: <strong>{mapel}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
              Kelas: <strong>{selectedClass}</strong> ({classStudents.length} Siswa)
            </span>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================= */}
          {/* TAB 1: FORM INPUT NILAI KOLEKTIF PER ROMBEL (DAFTARAN)     */}
          {/* ========================================================= */}
          {activeTab === 'kolektif' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Configuration Bar: Kelas, Mapel, KKM, Jenis Penilaian, Nama Penilaian, Tanggal */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 rounded-3xl border border-indigo-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Pengaturan Penilaian & Kelas Aktif
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Acuan KKM: <strong className="text-purple-700 font-black">{activeKkm}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kkm')}
                      className="px-2.5 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[11px] border border-purple-300 transition-colors cursor-pointer"
                    >
                      ⚙️ Atur KKM
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  
                  {/* 1. Pilih Kelas */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1 uppercase tracking-wider">
                      Rombel Kelas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer shadow-2xs"
                    >
                      {classes.map((c) => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Pilih Mapel */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1 uppercase tracking-wider">
                      Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mapel}
                      onChange={(e) => setMapel(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer shadow-2xs truncate"
                    >
                      {teacherAssignedSubjects.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Jenis Penilaian */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1 uppercase tracking-wider">
                      Jenis Penilaian <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={jenisPenilaian}
                      onChange={(e) => setJenisPenilaian(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer shadow-2xs"
                    >
                      {ASSESSMENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Nama Penilaian / KD */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1 uppercase tracking-wider">
                      Nama Penilaian / KD <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaPenilaian}
                      onChange={(e) => setNamaPenilaian(e.target.value)}
                      placeholder="e.g. Tugas 1 / UH 1"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
                      required
                    />
                  </div>

                  {/* 5. Tanggal Penilaian */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 mb-1 uppercase tracking-wider">
                      Tanggal Pelaksanaan
                    </label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
                    />
                  </div>
                </div>

                {/* Quick Suggestion Chips for Assessment Name & Batch Preset Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  
                  {/* Suggestions for Assessment Name */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-500">Pilihan Cepat Judul:</span>
                    {['Tugas 1', 'Tugas 2', 'UH 1 (Bab 1)', 'UH 2 (Bab 2)', 'UTS Ganjil', 'UAS Ganjil', 'Praktik Kinerja'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setNamaPenilaian(sug)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          namaPenilaian === sug 
                            ? 'bg-indigo-600 text-white shadow-2xs' 
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>

                  {/* Quick Fill Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-500">Isi Cepat Semua:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickSetAllScores(85)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition-colors cursor-pointer"
                      title="Set semua siswa nilai 85"
                    >
                      ⚡ Isi Semua 85
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetAllScores(80)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] transition-colors cursor-pointer"
                      title="Set semua siswa nilai 80"
                    >
                      ⚡ Isi Semua 80
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSetAllScores(activeKkm)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[11px] transition-colors cursor-pointer"
                      title={`Set semua siswa nilai batas KKM (${activeKkm})`}
                    >
                      ⚡ KKM ({activeKkm})
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllScores}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                      title="Kosongkan nilai seluruh siswa"
                    >
                      <RotateCcw className="w-3 h-3 inline mr-1" />
                      Kosongkan
                    </button>
                  </div>
                </div>
              </div>

              {/* STUDENT LIST TABLE FOR BATCH GRADE ENTRY */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                        Daftaran Siswa Rombel Kelas {selectedClass} ({classStudents.length} Siswa)
                      </h4>
                    </div>

                    {/* In-table search filter */}
                    <div className="relative w-48 sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari siswa di kelas..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('excel')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unduh / Impor Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveBatchGrades}
                      disabled={isSavingBatch}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingBatch ? 'Menyimpan...' : 'Simpan Semua Nilai'}</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3.5 text-center w-12">No</th>
                        <th className="py-3 px-3 w-28">NISN</th>
                        <th className="py-3 px-4 min-w-[200px]">Nama Lengkap Siswa</th>
                        <th className="py-3 px-3 text-center w-12">L/P</th>
                        <th className="py-3 px-4 w-44 text-center">Nilai (0 - 100)</th>
                        <th className="py-3 px-3 text-center w-32">Predikat & Status</th>
                        <th className="py-3 px-4 min-w-[280px]">Catatan / Evaluasi Guru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            {classStudents.length === 0 
                              ? `Tidak ada siswa terdaftar pada Rombel Kelas ${selectedClass}.` 
                              : 'Tidak ada siswa yang cocok dengan pencarian.'}
                          </td>
                        </tr>
                      ) : (
                        displayedStudents.map((student, idx) => {
                          const currentScore = batchScores[student.nisn];
                          const scoreNum = typeof currentScore === 'number' ? currentScore : null;
                          const currentNote = batchNotes[student.nisn] || '';

                          let predikatText = '-';
                          let predikatBadge = 'bg-slate-100 text-slate-500';
                          let statusText = '-';
                          let statusBadge = 'bg-slate-100 text-slate-400';

                          if (scoreNum !== null) {
                            if (scoreNum >= 88) {
                              predikatText = 'A (Sangat Baik)';
                              predikatBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                            } else if (scoreNum >= activeKkm) {
                              predikatText = 'B (Tuntas KKM)';
                              predikatBadge = 'bg-blue-100 text-blue-800 border-blue-200';
                            } else if (scoreNum >= Math.max(50, activeKkm - 15)) {
                              predikatText = 'C (Cukup)';
                              predikatBadge = 'bg-amber-100 text-amber-800 border-amber-200';
                            } else {
                              predikatText = 'D (Kurang)';
                              predikatBadge = 'bg-rose-100 text-rose-800 border-rose-200';
                            }

                            if (scoreNum >= activeKkm) {
                              statusText = 'Tuntas';
                              statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            } else {
                              statusText = 'Remedial';
                              statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                            }
                          }

                          return (
                            <tr 
                              key={student.nisn}
                              className={`hover:bg-indigo-50/30 transition-colors ${
                                scoreNum !== null ? 'bg-white' : 'bg-slate-50/30'
                              }`}
                            >
                              {/* No */}
                              <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                                {idx + 1}
                              </td>

                              {/* NISN */}
                              <td className="py-3 px-3 font-mono font-bold text-slate-700">
                                {student.nisn}
                              </td>

                              {/* Nama Siswa */}
                              <td className="py-3 px-4">
                                <div className="font-extrabold text-slate-900 text-xs">
                                  {student.nama}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Kelas {student.kelas}
                                </div>
                              </td>

                              {/* L/P */}
                              <td className="py-3 px-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  student.jk === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                }`}>
                                  {student.jk}
                                </span>
                              </td>

                              {/* Input Nilai */}
                              <td className="py-2.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    ref={(el) => { scoreInputRefs.current[student.nisn] = el; }}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={currentScore}
                                    onChange={(e) => handleScoreChange(student.nisn, e.target.value)}
                                    onKeyDown={(e) => handleScoreKeyDown(e, idx)}
                                    placeholder="0 - 100"
                                    className={`w-28 text-center font-mono font-black text-sm px-2.5 py-1.5 rounded-xl border transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs ${
                                      scoreNum !== null 
                                        ? (scoreNum >= activeKkm ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-black' : 'bg-rose-50/80 border-rose-300 text-rose-950')
                                        : 'bg-white border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Predikat & Status */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${predikatBadge}`}>
                                    {predikatText}
                                  </span>
                                  {scoreNum !== null && (
                                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${statusBadge}`}>
                                      {statusText}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Catatan / Evaluasi Guru */}
                              <td className="py-2.5 px-4">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={currentNote}
                                    onChange={(e) => handleNoteChange(student.nisn, e.target.value)}
                                    placeholder="Tulis catatan perkembangan belajar / evaluasi siswa..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                  />
                                  <div className="flex flex-wrap items-center gap-1">
                                    {QUICK_NOTES.map((tag) => (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleQuickTagNote(student.nisn, tag)}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 transition-colors cursor-pointer"
                                      >
                                        +{tag}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* REAL-TIME KPI SUMMARY FOOTER */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 font-medium">Terisi: </span>
                      <strong className="text-slate-900">{batchStats.filledCount} / {batchStats.total} Siswa</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs">
                      <span className="text-indigo-700 font-medium">Rata-Rata: </span>
                      <strong className="text-indigo-950 font-black">{batchStats.avg}</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs">
                      <span className="text-emerald-700 font-medium">Tuntas (≥{activeKkm}): </span>
                      <strong className="text-emerald-950 font-black">{batchStats.tuntas} Siswa</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 shadow-2xs">
                      <span className="text-rose-700 font-medium">Remedial (&lt;{activeKkm}): </span>
                      <strong className="text-rose-950 font-black">{batchStats.belumTuntas} Siswa</strong>
                    </div>

                    {batchStats.filledCount > 0 && (
                      <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                        <span className="text-blue-700 font-medium">Rentang: </span>
                        <strong className="text-blue-950 font-black">{batchStats.lowest} - {batchStats.highest}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveBatchGrades}
                      disabled={isSavingBatch}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingBatch ? 'Menyimpan...' : 'Simpan Seluruh Nilai Rombel Ini'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: BUKU NILAI LENGKAP / LEGER ROMBEL (MULTI-PENILAIAN) */}
          {/* ========================================================= */}
          {activeTab === 'matrix' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Rombel Kelas</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                    >
                      {classes.map((c) => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Mata Pelajaran</label>
                    <select
                      value={mapel}
                      onChange={(e) => setMapel(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                    >
                      {teacherAssignedSubjects.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadLedgerTemplate}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Leger Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('excel')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Impor Leger Excel</span>
                  </button>
                </div>
              </div>

              {/* Multi-Assessment Matrix Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 text-center w-10">No</th>
                        <th className="py-3 px-3 w-28">NISN</th>
                        <th className="py-3 px-4 min-w-[180px]">Nama Lengkap Siswa</th>
                        <th className="py-3 px-2.5 text-center w-20">Tugas 1</th>
                        <th className="py-3 px-2.5 text-center w-20">Tugas 2</th>
                        <th className="py-3 px-2.5 text-center w-20">UH 1</th>
                        <th className="py-3 px-2.5 text-center w-20">UH 2</th>
                        <th className="py-3 px-2.5 text-center w-20">PTS</th>
                        <th className="py-3 px-2.5 text-center w-20">PAS</th>
                        <th className="py-3 px-3 text-center w-24">Rata-Rata</th>
                        <th className="py-3 px-3 text-center w-24">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map((student, idx) => {
                        const studentSubjectGrades = grades.filter((g) => g.nisn === student.nisn && isSubjectMatch(g.mapel, mapel));
                        
                        const getVal = (jenis: string, namaSub: string) => {
                          const match = studentSubjectGrades.find(
                            (g) => g.jenisPenilaian === jenis && g.namaPenilaian.toLowerCase().includes(namaSub.toLowerCase())
                          );
                          return match ? match.nilai : '-';
                        };

                        const tugas1 = getVal('Tugas', '1');
                        const tugas2 = getVal('Tugas', '2');
                        const uh1 = getVal('Ulangan Harian', '1');
                        const uh2 = getVal('Ulangan Harian', '2');
                        const pts = getVal('UTS', '');
                        const pas = getVal('UAS', '');

                        const numericScores = [tugas1, tugas2, uh1, uh2, pts, pas].filter((v): v is number => typeof v === 'number');
                        const avgScore = numericScores.length > 0 
                          ? Math.round((numericScores.reduce((a, b) => a + b, 0) / numericScores.length) * 10) / 10 
                          : null;

                        return (
                          <tr key={student.nisn} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 font-bold">{student.nisn}</td>
                            <td className="py-2.5 px-4 font-extrabold text-slate-900">{student.nama}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700">{tugas1}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700">{tugas2}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700">{uh1}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-700">{uh2}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-indigo-700">{pts}</td>
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-indigo-700">{pas}</td>
                            <td className="py-2.5 px-3 text-center">
                              {avgScore !== null ? (
                                <span className={`font-mono font-black ${avgScore >= activeKkm ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {avgScore}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {avgScore !== null ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  avgScore >= 88 ? 'bg-emerald-100 text-emerald-800' : avgScore >= activeKkm ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {avgScore >= 88 ? 'A' : avgScore >= activeKkm ? 'B' : avgScore >= Math.max(50, activeKkm - 15) ? 'C' : 'D'}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: IMPOR & EKSPOR EXCEL (UNTUK LAPTOP GURU)           */}
          {/* ========================================================= */}
          {activeTab === 'excel' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CARD 1: UNDUH TEMPLATE EXCEL */}
                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/60 p-6 rounded-3xl border border-blue-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm mb-3">
                      <Download className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-base text-slate-900">
                      1. Unduh Format Template Excel Nilai
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Unduh berkas Excel yang sudah otomatis terisi daftar nama dan NISN seluruh siswa di kelas Anda. Guru dapat mengisi nilai dan komentar secara leluasa di laptop.
                    </p>

                    <div className="mt-4 space-y-3 bg-white p-4 rounded-2xl border border-blue-200/80">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilih Kelas</label>
                          <select
                            value={templateKelas}
                            onChange={(e) => setTemplateKelas(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                          >
                            <option value="Semua">Semua Kelas</option>
                            {classes.map((c) => (
                              <option key={c} value={c}>Kelas {c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                          <select
                            value={templateMapel}
                            onChange={(e) => setTemplateMapel(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold truncate"
                          >
                            {teacherAssignedSubjects.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Penilaian</label>
                          <select
                            value={templateJenis}
                            onChange={(e) => setTemplateJenis(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                          >
                            {ASSESSMENT_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Judul / KD</label>
                          <input
                            type="text"
                            value={templateNama}
                            onChange={(e) => setTemplateNama(e.target.value)}
                            placeholder="e.g. Tugas 1"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Format Penilaian Single ({templateNama})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadLedgerTemplate}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Table className="w-4 h-4" />
                      <span>Unduh Format Buku Nilai Lengkap (Tugas, UH, PTS, PAS)</span>
                    </button>
                  </div>
                </div>

                {/* CARD 2: UNGGAH / IMPOR EXCEL HASIL PENGISIAN */}
                <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/60 p-6 rounded-3xl border border-emerald-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h4 className="font-black text-base text-slate-900">
                      2. Unggah & Impor File Excel Nilai
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Setelah selesai mengisi nilai dan catatan di laptop, pilih berkas Excel Anda di bawah ini untuk disimpan langsung ke database sistem.
                    </p>

                    <div className="mt-4 p-6 bg-white rounded-2xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-center space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                      <div className="text-xs font-bold text-slate-800">
                        Pilih file Excel (.xlsx / .xls)
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Mendukung format single penilaian maupun format leger multi-kolom
                      </p>
                    </div>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Pilih File Excel & Mulai Impor Nilai</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 3: EKSPOR SELURUH REKAP */}
              <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      Ekspor Laporan & Rekap Lengkap Nilai Siswa
                    </h4>
                    <p className="text-xs text-slate-500">
                      Unduh seluruh data perolehan nilai siswa, predikat A/B/C/D, status ketuntasan, dan catatan guru ke format spreadsheet.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportGradesExcel}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Unduh Rekap Excel ({filteredGrades.length} Data)</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: PENGATURAN KKM (KRITERIA KETUNTASAN MINIMAL)        */}
          {/* ========================================================= */}
          {activeTab === 'kkm' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Header explanation banner */}
              <div className="p-5 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-blue-500/15 rounded-3xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                    <Target className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900">
                        Pengaturan Kriteria Ketuntasan Minimal (KKM)
                      </h4>
                      {isTeacher && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-300">
                          Khusus Guru Mapel
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {isTeacher 
                        ? `Anda bertindak sebagai Guru Mapel (${kkmTargetMapelList.join(', ')}). Hanya mata pelajaran penugasan Anda yang ditampilkan untuk menjaga independensi KKM antar guru.`
                        : 'Administrator memiliki akses supervisi penuh untuk mengatur KKM Standar Sekolah dan seluruh Mata Pelajaran.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const def = localDefaultKkm || 75;
                      const next = { ...localKkmMap };
                      kkmTargetMapelList.forEach((m) => {
                        next[m] = def;
                      });
                      setLocalKkmMap(next);
                      toast.info('KKM Standar Disalin', `Nilai ${def} disalin ke mapel Anda (${kkmTargetMapelList.join(', ')}).`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-900 font-extrabold text-xs border border-purple-300 transition-colors shadow-2xs cursor-pointer"
                  >
                    ⚡ Terapkan KKM Standar ({localDefaultKkm})
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveKkmSettings}
                    disabled={isSavingKkm}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingKkm ? 'Menyimpan...' : 'Simpan KKM Mapel'}</span>
                  </button>
                </div>
              </div>

              {/* Global Default Setting Card (Admin Only Editable, Informative for Teachers) */}
              {!isTeacher && (
                <div className="p-5 bg-white rounded-3xl border border-purple-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                      Nilai KKM Standar Umum Sekolah (Supervisi Administrator)
                    </span>
                    <p className="text-xs text-slate-500">
                      Nilai default yang digunakan jika suatu mata pelajaran belum memiliki KKM khusus.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[70, 75, 78, 80].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLocalDefaultKkm(preset)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          localDefaultKkm === preset
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-purple-100 text-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={localDefaultKkm}
                      onChange={(e) => setLocalDefaultKkm(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-20 text-center font-mono font-black text-sm bg-purple-50 border border-purple-300 text-purple-950 rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Per-Subject KKM Table Scoped for the Logged-in Teacher */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {isTeacher 
                        ? `Daftar Nilai KKM Mata Pelajaran Anda (${kkmTargetMapelList.length} Mapel)` 
                        : `Daftar Nilai KKM Seluruh Mata Pelajaran (${DEFAULT_MAPEL_LIST.length} Mapel)`}
                    </h4>
                  </div>
                  <span className="text-[11px] text-purple-700 font-bold">
                    {isTeacher ? `Guru: ${user?.nama || 'Pengajar'}` : 'Hak Akses Admin'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3.5 text-center w-12">No</th>
                        <th className="py-3 px-4 min-w-[220px]">Mata Pelajaran Ditugaskan</th>
                        <th className="py-3 px-4 text-center w-36">Nilai KKM (0-100)</th>
                        <th className="py-3 px-4 min-w-[200px]">Pilihan Cepat KKM</th>
                        <th className="py-3 px-4 text-center w-36">Rentang Tuntas (B)</th>
                        <th className="py-3 px-4 text-center w-36">Sangat Baik (A)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kkmTargetMapelList.map((subj, idx) => {
                        const currentSubjKkm = localKkmMap[subj] ?? localDefaultKkm ?? 75;
                        const isCurrentActive = isSubjectMatch(subj, mapel);

                        return (
                          <tr 
                            key={subj} 
                            className={`hover:bg-purple-50/30 transition-colors ${
                              isCurrentActive ? 'bg-purple-50/50' : ''
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                                <span>{subj}</span>
                                {isCurrentActive && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-600 text-white">
                                    Mapel Aktif Form
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={currentSubjKkm}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                  setLocalKkmMap((prev) => ({ ...prev, [subj]: val }));
                                }}
                                className="w-20 text-center font-mono font-black text-sm px-2 py-1 bg-white border border-purple-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs text-purple-950"
                              />
                            </td>

                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {[70, 75, 78, 80].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      setLocalKkmMap((prev) => ({ ...prev, [subj]: preset }));
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                      currentSubjKkm === preset
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-100 hover:bg-purple-100 text-slate-600'
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                                {currentSubjKkm} - 87
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                88 - 100
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    {isTeacher 
                      ? 'Perubahan KKM hanya akan berlaku pada mata pelajaran yang Anda bimbing.' 
                      : 'Pastikan klik simpan agar pengaturan KKM terbaru tersimpan ke database sekolah.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveKkmSettings}
                    disabled={isSavingKkm}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingKkm ? 'Menyimpan...' : 'Simpan Pengaturan KKM'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: RIWAYAT & REKAP DATA NILAI SISWA                   */}
          {/* ========================================================= */}
          {activeTab === 'riwayat' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Filter Controls Bar */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  
                  {/* Search */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari siswa, NISN, materi..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Filter Kelas */}
                  <select
                    value={historyClassFilter}
                    onChange={(e) => setHistoryClassFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>

                  {/* Filter Jenis Penilaian */}
                  <select
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Semua">Semua Jenis Penilaian</option>
                    {ASSESSMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                  {selectedGradeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Terpilih ({selectedGradeIds.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportGradesExcel}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor ke Excel</span>
                  </button>
                </div>
              </div>

              {/* Table of Records */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={filteredGrades.length > 0 && selectedGradeIds.length === filteredGrades.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGradeIds(filteredGrades.map((g) => g.id));
                              } else {
                                setSelectedGradeIds([]);
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-3 w-28">Tanggal</th>
                        <th className="py-3 px-4 min-w-[180px]">Siswa & Kelas</th>
                        <th className="py-3 px-3.5">Mata Pelajaran</th>
                        <th className="py-3 px-3.5">Jenis & Nama Penilaian</th>
                        <th className="py-3 px-3 text-center w-24">Nilai</th>
                        <th className="py-3 px-4 min-w-[200px]">Catatan Guru</th>
                        <th className="py-3 px-3 text-right w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGrades.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            Tidak ada riwayat nilai siswa yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredGrades.map((g) => {
                          const student = students.find((s) => s.nisn === g.nisn);
                          const isSelected = selectedGradeIds.includes(g.id);
                          const mapelKkm = localKkmMap[g.mapel] ?? localDefaultKkm ?? 75;

                          return (
                            <tr key={g.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedGradeIds((prev) => [...prev, g.id]);
                                    } else {
                                      setSelectedGradeIds((prev) => prev.filter((id) => id !== g.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              <td className="py-3 px-3 font-mono text-slate-500">
                                {g.tanggal}
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-extrabold text-slate-900">
                                  {student?.nama || g.nisn}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  NISN: {g.nisn} • Kelas {student?.kelas || '-'}
                                </div>
                              </td>

                              <td className="py-3 px-3.5 font-bold text-slate-700">
                                {g.mapel}
                              </td>

                              <td className="py-3 px-3.5">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {g.jenisPenilaian}
                                  </span>
                                  <span>{g.namaPenilaian}</span>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-xl font-mono font-black text-xs ${
                                  g.nilai >= mapelKkm ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {g.nilai}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-slate-600">
                                {g.komentarGuru || '-'}
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSingle(g)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                    title="Edit nilai siswa ini"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Hapus nilai ${g.jenisPenilaian} (${g.namaPenilaian}) untuk ${student?.nama || g.nisn}?`)) {
                                        onDeleteGrade(g.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Hapus nilai"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: REKAP RAPOR DIGITAL KELAS (WALI KELAS & GURU)       */}
          {/* ========================================================= */}
          {activeTab === 'rapor' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-3xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900">
                      Rapor Digital & Rekap Capaian Kelas {selectedClass}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Nilai yang telah diisi oleh Bapak/Ibu Guru otomatis tersinkronisasi ke lembar Rapor Siswa resmi Kemendikbudristek.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Report Card List */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-3 px-3.5 text-center w-12">No</th>
                        <th className="py-3 px-3 w-28">NISN</th>
                        <th className="py-3 px-4 min-w-[200px]">Nama Lengkap Siswa</th>
                        <th className="py-3 px-3 text-center w-12">L/P</th>
                        <th className="py-3 px-3.5 text-center w-32">Total Penilaian</th>
                        <th className="py-3 px-3.5 text-center w-32">Rata-Rata Umum</th>
                        <th className="py-3 px-3.5 text-center w-28">Predikat</th>
                        <th className="py-3 px-4 text-right w-44">Cetak / Buka Rapor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map((student, idx) => {
                        const studentGrades = grades.filter((g) => g.nisn === student.nisn);
                        const count = studentGrades.length;
                        const avg = count > 0 
                          ? Math.round((studentGrades.reduce((sum, g) => sum + g.nilai, 0) / count) * 10) / 10 
                          : null;

                        return (
                          <tr key={student.nisn} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-700">{student.nisn}</td>
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900">{student.nama}</div>
                              <div className="text-[10px] text-slate-400">Kelas {student.kelas}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold">{student.jk}</td>
                            <td className="py-3 px-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {count} Nilai Terinput
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              {avg !== null ? (
                                <span className={`font-mono font-black text-sm ${avg >= localDefaultKkm ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {avg}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">Belum Ada</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              {avg !== null ? (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  avg >= 88 ? 'bg-emerald-100 text-emerald-800' : avg >= localDefaultKkm ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {avg >= 88 ? 'A (Sangat Baik)' : avg >= localDefaultKkm ? 'B (Baik)' : 'C (Cukup)'}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedRaporStudent(student)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat & Cetak</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* SINGLE EDIT MODAL */}
        {editingGrade && (
          <div className="fixed inset-0 z-60 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>Edit Nilai Siswa</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingGrade(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditSingle} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Siswa</label>
                  <div className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-900">
                    {students.find((s) => s.nisn === editingGrade.nisn)?.nama || editingGrade.nisn} ({editingGrade.nisn})
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Penilaian / KD</label>
                  <input
                    type="text"
                    value={editNamaPenilaian}
                    onChange={(e) => setEditNamaPenilaian(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Angka Nilai (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editScore}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-black text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Catatan / Komentar Guru</label>
                  <textarea
                    rows={2}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Catatan guru..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGrade(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingSingle}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl"
                  >
                    {isUpdatingSingle ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EXCEL IMPORT PREVIEW MODAL */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[88vh] flex flex-col animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-black text-base text-slate-900">
                      Konfirmasi Impor Nilai dari Excel
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ditemukan {importedPreview.length} baris penilaian siswa yang siap disimpan ke database
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-black text-[10px] uppercase text-slate-700 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Mapel</th>
                      <th className="py-2.5 px-3">Jenis / KD</th>
                      <th className="py-2.5 px-3 text-center">Nilai</th>
                      <th className="py-2.5 px-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importedPreview.map((item, idx) => {
                      const stu = students.find((s) => s.nisn === item.nisn);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">{item.nisn}</td>
                          <td className="py-2 px-3 font-extrabold text-slate-900">{stu?.nama || item.nisn}</td>
                          <td className="py-2 px-3 text-slate-600">{item.mapel}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{item.jenisPenilaian} ({item.namaPenilaian})</td>
                          <td className="py-2 px-3 text-center font-mono font-black text-indigo-700">{item.nilai}</td>
                          <td className="py-2 px-3 text-slate-500 truncate max-w-[150px]">{item.komentarGuru || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Pastikan seluruh baris telah sesuai sebelum menekan tombol konfirmasi.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isProcessingImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isProcessingImport ? 'Menyimpan ke Database...' : 'Konfirmasi & Simpan Nilai'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EMBEDDED STUDENT REPORT CARD MODAL VIEW */}
        {selectedRaporStudent && (
          <StudentReportCardModal
            isOpen={Boolean(selectedRaporStudent)}
            onClose={() => setSelectedRaporStudent(null)}
            student={selectedRaporStudent}
            grades={grades}
            schoolConfig={schoolConfig}
            attendanceRecords={attendanceRecords}
            teachers={teachers}
          />
        )}

      </div>
    </div>
  );
};
