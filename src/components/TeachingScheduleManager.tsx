import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  User, 
  School, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  RotateCw, 
  X, 
  ChevronRight, 
  PlayCircle,
  MapPin,
  Tag,
  Zap,
  Layers,
  GraduationCap
} from 'lucide-react';
import { ClassScheduleItem, TeacherUser, SchoolConfig, DayOfWeek } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportClassSchedulesExcel } from '../utils/exportExcel';
import { generateClassSchedulesPdf } from '../utils/exportPdf';
import { 
  getTeacherAssignedSubjects, 
  getTeacherClassesForSubject, 
  filterSchedulesForTeacher,
  isSubjectMatch,
  isClassMatch,
  normalizeClassName
} from '../utils/teacherFilter';

interface TeachingScheduleManagerProps {
  schedules: ClassScheduleItem[];
  teachers: TeacherUser[];
  schoolConfig: SchoolConfig;
  availableClasses: string[];
  onSaveSchedule: (schedule: ClassScheduleItem) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onBulkDeleteSchedules?: (ids: string[]) => Promise<void>;
  onResetSchedules?: () => Promise<void>;
  onStartJournalFromSchedule?: (schedule: ClassScheduleItem) => void;
  defaultViewMode?: 'timeline' | 'grid' | 'manage';
}

const DAYS_LIST: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const TIME_PRESETS = [
  { label: 'Jam 1 - 2 (Pagi)', jamKe: '1 - 2', jamMulai: '07:30', jamSelesai: '08:50' },
  { label: 'Jam 3 - 4 (Menjelang Siang)', jamKe: '3 - 4', jamMulai: '09:05', jamSelesai: '10:25' },
  { label: 'Jam 5 - 6 (Siang)', jamKe: '5 - 6', jamMulai: '10:40', jamSelesai: '12:00' },
  { label: 'Jam 7 - 8 (Sore)', jamKe: '7 - 8', jamMulai: '13:00', jamSelesai: '14:20' },
  { label: 'Jumat Jam 1 - 2 (Pagi Singkat)', jamKe: '1 - 2', jamMulai: '07:30', jamSelesai: '08:45' },
  { label: 'Jumat Jam 3 - 4 (Sebelum Sholat)', jamKe: '3 - 4', jamMulai: '09:00', jamSelesai: '10:15' },
];

const COLOR_OPTIONS = [
  { label: 'Indigo', value: 'indigo', bg: 'bg-indigo-50 border-indigo-200 text-indigo-900', badge: 'bg-indigo-600' },
  { label: 'Biru', value: 'blue', bg: 'bg-blue-50 border-blue-200 text-blue-900', badge: 'bg-blue-600' },
  { label: 'Emerald', value: 'emerald', bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-600' },
  { label: 'Amber', value: 'amber', bg: 'bg-amber-50 border-amber-200 text-amber-900', badge: 'bg-amber-600' },
  { label: 'Rose', value: 'rose', bg: 'bg-rose-50 border-rose-200 text-rose-900', badge: 'bg-rose-600' },
  { label: 'Purple', value: 'purple', bg: 'bg-purple-50 border-purple-200 text-purple-900', badge: 'bg-purple-600' },
  { label: 'Cyan', value: 'cyan', bg: 'bg-cyan-50 border-cyan-200 text-cyan-900', badge: 'bg-cyan-600' },
  { label: 'Teal', value: 'teal', bg: 'bg-teal-50 border-teal-200 text-teal-900', badge: 'bg-teal-600' },
  { label: 'Fuchsia', value: 'fuchsia', bg: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900', badge: 'bg-fuchsia-600' },
];

export const TeachingScheduleManager: React.FC<TeachingScheduleManagerProps> = ({
  schedules,
  teachers,
  schoolConfig,
  availableClasses,
  onSaveSchedule,
  onDeleteSchedule,
  onBulkDeleteSchedules,
  onResetSchedules,
  onStartJournalFromSchedule,
  defaultViewMode = 'timeline',
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Determine current day in Indonesian
  const dayNameToday: DayOfWeek = useMemo(() => {
    const days: DayOfWeek[] = ['Sabtu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const idx = new Date().getDay(); // 0: Sunday -> map to Senin or default
    return idx === 0 ? 'Senin' : days[idx];
  }, []);

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>(dayNameToday);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Semua');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>(
    user?.role === 'guru' ? user.nama : 'Semua'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<'timeline' | 'grid' | 'manage'>(defaultViewMode);
  
  // Modal Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassScheduleItem | null>(null);

  // Form State
  const [formKelas, setFormKelas] = useState(availableClasses[0] || '7A');
  const [formHari, setFormHari] = useState<DayOfWeek>(dayNameToday);
  const [formJamKe, setFormJamKe] = useState('1 - 2');
  const [formJamMulai, setFormJamMulai] = useState('07:30');
  const [formJamSelesai, setFormJamSelesai] = useState('08:50');
  const [formGuruId, setFormGuruId] = useState(user?.role === 'guru' ? user.id : teachers[0]?.id || '');
  const [formGuruNama, setFormGuruNama] = useState(user?.role === 'guru' ? user.nama : teachers[0]?.nama || '');
  const [formGuruNip, setFormGuruNip] = useState(user?.role === 'guru' ? (user.nip || '') : (teachers[0]?.nip || ''));
  const [formMapel, setFormMapel] = useState(user?.mapel || teachers[0]?.mapel || 'Matematika');
  const [formRuang, setFormRuang] = useState('R. Kelas 7A');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formWarna, setFormWarna] = useState('indigo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Selection
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSchedule(null);
    const initialTeacher = user?.role === 'guru' ? user : (teachers[0] || null);
    setFormKelas(selectedClassFilter !== 'Semua' ? selectedClassFilter : (availableClasses[0] || '7A'));
    setFormHari((selectedDayFilter !== 'Semua' ? selectedDayFilter : dayNameToday) as DayOfWeek);
    setFormJamKe('1 - 2');
    setFormJamMulai('07:30');
    setFormJamSelesai('08:50');
    setFormGuruId(initialTeacher?.id || '');
    setFormGuruNama(initialTeacher?.nama || '');
    setFormGuruNip(initialTeacher?.nip || '');
    setFormMapel(initialTeacher?.mapel || 'Matematika');
    setFormRuang(`R. Kelas ${selectedClassFilter !== 'Semua' ? selectedClassFilter : (availableClasses[0] || '7A')}`);
    setFormKeterangan('');
    setFormWarna('indigo');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sch: ClassScheduleItem) => {
    setEditingSchedule(sch);
    setFormKelas(sch.kelas);
    setFormHari(sch.hari);
    setFormJamKe(sch.jamKe || '1 - 2');
    setFormJamMulai(sch.jamMulai);
    setFormJamSelesai(sch.jamSelesai);
    setFormGuruId(sch.guruId || '');
    setFormGuruNama(sch.guruNama);
    setFormGuruNip(sch.guruNip || '');
    setFormMapel(sch.mapel);
    setFormRuang(sch.ruang || `R. Kelas ${sch.kelas}`);
    setFormKeterangan(sch.keterangan || '');
    setFormWarna(sch.warna || 'indigo');
    setIsFormModalOpen(true);
  };

  // When teacher selection changes in form, auto-fill mapel & NUPTK
  const handleTeacherChange = (teacherId: string) => {
    setFormGuruId(teacherId);
    const tObj = teachers.find((t) => t.id === teacherId);
    if (tObj) {
      setFormGuruNama(tObj.nama);
      setFormGuruNip(tObj.nip || '');
      if (tObj.mapel) {
        setFormMapel(tObj.mapel);
      }
      if (tObj.penugasanMapel && tObj.penugasanMapel.length > 0) {
        setFormMapel(tObj.penugasanMapel[0].mapel);
        if (tObj.penugasanMapel[0].kelas.length > 0) {
          setFormKelas(tObj.penugasanMapel[0].kelas[0]);
          setFormRuang(`R. Kelas ${tObj.penugasanMapel[0].kelas[0]}`);
        }
      }
    }
  };

  // Apply Time Preset
  const handleApplyPreset = (preset: typeof TIME_PRESETS[0]) => {
    setFormJamKe(preset.jamKe);
    setFormJamMulai(preset.jamMulai);
    setFormJamSelesai(preset.jamSelesai);
  };

  // Check for potential conflicts
  const conflictWarning = useMemo(() => {
    if (!isFormModalOpen) return null;
    const sameDaySchedules = schedules.filter((s) => 
      s.hari === formHari && 
      (!editingSchedule || s.id !== editingSchedule.id)
    );

    // 1. Teacher Conflict
    const teacherConflict = sameDaySchedules.find((s) => 
      s.guruNama.toLowerCase() === formGuruNama.toLowerCase() &&
      s.jamMulai === formJamMulai &&
      s.jamSelesai === formJamSelesai
    );
    if (teacherConflict) {
      return `Perhatian: Guru ${formGuruNama} sudah memiliki jadwal mengajar di Kelas ${teacherConflict.kelas} pada ${formHari} pukul ${formJamMulai} - ${formJamSelesai}!`;
    }

    // 2. Class Conflict
    const classConflict = sameDaySchedules.find((s) => 
      s.kelas.toLowerCase() === formKelas.toLowerCase() &&
      s.jamMulai === formJamMulai &&
      s.jamSelesai === formJamSelesai
    );
    if (classConflict) {
      return `Perhatian: Kelas ${formKelas} sudah memiliki mapel ${classConflict.mapel} (${classConflict.guruNama}) pada jam tersebut!`;
    }

    return null;
  }, [schedules, formHari, formKelas, formGuruNama, formJamMulai, formJamSelesai, editingSchedule, isFormModalOpen]);

  // Submit Schedule Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKelas || !formHari || !formJamMulai || !formJamSelesai || !formMapel || !formGuruNama) {
      toast.warning('Form Belum Lengkap', 'Mohon lengkapi seluruh data jadwal mata pelajaran.');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduleItem: ClassScheduleItem = {
        id: editingSchedule ? editingSchedule.id : `SCH_${formKelas}_${formHari.substring(0, 3).toUpperCase()}_${Date.now()}`,
        kelas: formKelas,
        hari: formHari,
        jamKe: formJamKe,
        jamMulai: formJamMulai,
        jamSelesai: formJamSelesai,
        mapel: formMapel,
        guruNama: formGuruNama,
        guruId: formGuruId || undefined,
        guruNip: formGuruNip || undefined,
        ruang: formRuang || `R. Kelas ${formKelas}`,
        keterangan: formKeterangan || undefined,
        warna: formWarna || 'indigo',
      };

      await onSaveSchedule(scheduleItem);
      setIsFormModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan jadwal pelajaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete single schedule
  const handleDelete = async (id: string, mapel: string, kelas: string) => {
    if (window.confirm(`Hapus jadwal mata pelajaran ${mapel} kelas ${kelas}?`)) {
      try {
        await onDeleteSchedule(id);
      } catch (err) {
        console.error(err);
        toast.error('Gagal Menghapus', 'Terjadi kesalahan saat menghapus jadwal.');
      }
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedScheduleIds.length === 0) return;
    if (window.confirm(`Hapus ${selectedScheduleIds.length} jadwal mata pelajaran yang dipilih?`)) {
      setIsBulkDeleting(true);
      try {
        if (onBulkDeleteSchedules) {
          await onBulkDeleteSchedules(selectedScheduleIds);
        } else {
          for (const id of selectedScheduleIds) {
            await onDeleteSchedule(id);
          }
        }
        setSelectedScheduleIds([]);
      } catch (err) {
        console.error(err);
        toast.error('Gagal Menghapus Massal', 'Terjadi kesalahan saat menghapus jadwal.');
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  // Teacher-scoped base schedules
  const teacherScopedSchedules = useMemo(() => {
    return filterSchedulesForTeacher(schedules, user);
  }, [schedules, user]);

  const teacherAssignedSubjects = useMemo(() => {
    if (user?.role === 'guru') {
      const subs = getTeacherAssignedSubjects(user);
      return subs.length > 0 ? subs : [user.mapel || 'Pendidikan Pancasila & PKN'];
    }
    return [];
  }, [user]);

  const teacherAccessibleClassesForForm = useMemo(() => {
    if (user?.role === 'guru') {
      const cls = getTeacherClassesForSubject(user, formMapel);
      return cls.length > 0 ? cls : availableClasses;
    }
    return availableClasses;
  }, [user, formMapel, availableClasses]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return teacherScopedSchedules.filter((s) => {
      // Day Filter
      if (selectedDayFilter !== 'Semua' && s.hari !== selectedDayFilter) return false;
      // Class Filter
      if (selectedClassFilter !== 'Semua' && !isClassMatch(s.kelas, selectedClassFilter)) return false;
      // Teacher Filter
      if (user?.role !== 'guru' && selectedTeacherFilter !== 'Semua') {
        if (!s.guruNama.toLowerCase().includes(selectedTeacherFilter.toLowerCase())) return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMapel = s.mapel.toLowerCase().includes(q);
        const matchGuru = s.guruNama.toLowerCase().includes(q);
        const matchKelas = s.kelas.toLowerCase().includes(q);
        const matchRuang = (s.ruang || '').toLowerCase().includes(q);
        if (!matchMapel && !matchGuru && !matchKelas && !matchRuang) return false;
      }
      return true;
    });
  }, [teacherScopedSchedules, selectedDayFilter, selectedClassFilter, selectedTeacherFilter, searchQuery, user]);

  // Group schedules by Day for Timeline / Matrix
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, ClassScheduleItem[]> = {};
    DAYS_LIST.forEach((d) => {
      grouped[d] = [];
    });
    filteredSchedules.forEach((s) => {
      if (grouped[s.hari]) {
        grouped[s.hari].push(s);
      }
    });
    // Sort by jamMulai within each day
    Object.keys(grouped).forEach((d) => {
      grouped[d].sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
    });
    return grouped;
  }, [filteredSchedules]);

  // Live Time calculation for "Sedang Berlangsung" / "Mendatang" / "Selesai"
  const getScheduleStatus = (sch: ClassScheduleItem): { label: string; badgeClass: string; isOngoing: boolean } => {
    const now = new Date();
    const currentHhMm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isToday = sch.hari === dayNameToday;

    if (!isToday) {
      return { label: `Setiap ${sch.hari}`, badgeClass: 'bg-slate-100 text-slate-600 border-slate-200', isOngoing: false };
    }

    if (currentHhMm >= sch.jamMulai && currentHhMm <= sch.jamSelesai) {
      return { label: 'Sedang Berlangsung', badgeClass: 'bg-emerald-500 text-white animate-pulse shadow-xs', isOngoing: true };
    } else if (currentHhMm < sch.jamMulai) {
      return { label: 'Mendatang', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', isOngoing: false };
    } else {
      return { label: 'Selesai Hari Ini', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200', isOngoing: false };
    }
  };

  // Color helper
  const getColorStyle = (colorName?: string) => {
    const found = COLOR_OPTIONS.find((c) => c.value === colorName) || COLOR_OPTIONS[0];
    return found;
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & VIEW CONTROLS                            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Jadwal Pelajaran KBM Terpadu</span>
            </span>
            <span className="text-slate-400 text-xs font-mono">• Hari Ini: <strong>{dayNameToday}</strong></span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Jadwal Mengajar Guru & Rombel Kelas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola distribusi jam pelajaran, sinkronisasi agenda mengajar harian, serta pantau ruang kelas secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setDisplayMode('timeline')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                displayMode === 'timeline'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Timeline Harian
            </button>
            <button
              onClick={() => setDisplayMode('grid')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                displayMode === 'grid'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Mingguan
            </button>
            <button
              onClick={() => setDisplayMode('manage')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                displayMode === 'manage'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Kelola & Susun ({schedules.length})</span>
            </button>
          </div>

          {/* Export Excel */}
          <button
            onClick={() => {
              exportClassSchedulesExcel(filteredSchedules, schoolConfig, selectedDayFilter, selectedClassFilter);
              toast.success('Ekspor Excel Selesai', 'Jadwal pelajaran berhasil diunduh dalam format Excel.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
            title="Unduh jadwal pelajaran ke file Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={() => {
              generateClassSchedulesPdf(filteredSchedules, schoolConfig, selectedDayFilter, selectedClassFilter, selectedTeacherFilter);
              toast.success('Dokumen PDF Disiapkan', 'Jadwal pelajaran siap dicetak.');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            title="Cetak jadwal pelajaran ke dokumen PDF resmi"
          >
            <Printer className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Cetak PDF</span>
          </button>

          {/* Add Schedule Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DAY SELECTOR & FILTER TABS                            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
        
        {/* Days Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedDayFilter('Semua')}
            className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all cursor-pointer ${
              selectedDayFilter === 'Semua'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua Hari ({schedules.length})
          </button>

          {DAYS_LIST.map((day) => {
            const count = schedules.filter((s) => s.hari === day).length;
            const isToday = day === dayNameToday;
            const isSelected = selectedDayFilter === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Hari Ini
                  </span>
                )}
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-black/20 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters: Class, Teacher & Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* Class Filter */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <School className="w-3.5 h-3.5 text-slate-400" />
              <span>Kelas:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-transparent font-black text-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="Semua">Semua Kelas</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Guru:</span>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="bg-transparent font-black text-slate-900 focus:outline-hidden cursor-pointer max-w-[160px] truncate"
              >
                <option value="Semua">Semua Guru</option>
                {user?.role === 'guru' && <option value="Jadwal Saya">⭐ Jadwal Saya Saja</option>}
                {teachers.map((t) => (
                  <option key={t.id} value={t.nama}>{t.nama}</option>
                ))}
              </select>
            </div>

            {/* Reset Filter shortcut */}
            {(selectedClassFilter !== 'Semua' || selectedTeacherFilter !== 'Semua' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedClassFilter('Semua');
                  setSelectedTeacherFilter('Semua');
                  setSearchQuery('');
                }}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mapel, guru, ruang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN DISPLAY VIEW                                     */}
      {/* ======================================================== */}

      {/* VIEW A: TIMELINE HARIAN (DEFAULT) */}
      {displayMode === 'timeline' && (
        <div className="space-y-6">
          {Object.keys(schedulesByDay)
            .filter((day) => selectedDayFilter === 'Semua' || selectedDayFilter === day)
            .map((day) => {
              const daySchedules = schedulesByDay[day];
              const isToday = day === dayNameToday;

              return (
                <div key={day} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                  {/* Day Title Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs ${
                        isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {day.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-base">
                            Hari {day}
                          </h3>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {daySchedules.length} Sesi Jam Pelajaran Terjadwal
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setFormHari(day as DayOfWeek);
                        handleOpenAdd();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-indigo-600 text-xs font-bold border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah di Hari {day}</span>
                    </button>
                  </div>

                  {/* Schedule Cards Grid */}
                  {daySchedules.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      Tidak ada jadwal mata pelajaran untuk hari {day} dengan filter yang dipilih.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {daySchedules.map((sch) => {
                        const status = getScheduleStatus(sch);
                        const colStyle = getColorStyle(sch.warna);
                        const isMyClass = user?.nama && sch.guruNama.toLowerCase().includes(user.nama.toLowerCase());

                        return (
                          <div 
                            key={sch.id} 
                            className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between group ${
                              status.isOngoing 
                                ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/40 shadow-sm' 
                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs'
                            }`}
                          >
                            {/* Top Card: Time & Status Badge */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="font-mono">{sch.jamMulai} - {sch.jamSelesai}</span>
                                  {sch.jamKe && <span className="text-slate-400 font-mono text-[10px]">({sch.jamKe})</span>}
                                </div>

                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${status.badgeClass}`}>
                                  {status.label}
                                </span>
                              </div>

                              {/* Class & Subject */}
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-black text-xs shrink-0 shadow-2xs">
                                  Kelas {sch.kelas}
                                </span>
                                <h4 className="font-black text-slate-900 text-sm leading-snug">
                                  {sch.mapel}
                                </h4>
                              </div>

                              {/* Teacher & Room */}
                              <div className="space-y-1 text-xs text-slate-600 mt-2">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className={`font-semibold truncate ${isMyClass ? 'text-indigo-700 font-black' : 'text-slate-800'}`}>
                                    {sch.guruNama} {isMyClass && '(Anda)'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{sch.ruang || `R. Kelas ${sch.kelas}`}</span>
                                  {sch.keterangan && <span className="text-slate-400 italic">• {sch.keterangan}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Bottom Card Actions: Quick Start Journal & Edit */}
                            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              {/* Mulai KBM / Isi Jurnal Button */}
                              {onStartJournalFromSchedule && (
                                <button
                                  type="button"
                                  onClick={() => onStartJournalFromSchedule(sch)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                  title="Buka form jurnal dan isi otomatis materi KBM kelas ini"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Isi Jurnal KBM</span>
                                </button>
                              )}

                              {/* Edit & Delete */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(sch)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Edit jadwal ini"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(sch.id, sch.mapel, sch.kelas)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus jadwal ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* VIEW B: MATRIKS MINGGUAN (GRID) */}
      {displayMode === 'grid' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Matriks Jadwal Mingguan Seluruh Kelas
              </h3>
              <p className="text-xs text-slate-500">
                Tinjauan komprehensif susunan jam pelajaran per hari dan rombel kelas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[10px]">
                  <th className="border border-slate-200 py-2.5 px-3 w-28 text-center">Hari</th>
                  <th className="border border-slate-200 py-2.5 px-3 w-36 text-center">Waktu KBM</th>
                  {availableClasses
                    .filter((c) => selectedClassFilter === 'Semua' || selectedClassFilter === c)
                    .map((c) => (
                      <th key={c} className="border border-slate-200 py-2.5 px-3 text-center min-w-[150px]">
                        Kelas {c}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DAYS_LIST
                  .filter((d) => selectedDayFilter === 'Semua' || selectedDayFilter === d)
                  .map((day) => {
                    const daySchedules = schedules.filter((s) => s.hari === day);
                    const timeSlots = Array.from(new Set(daySchedules.map((s) => `${s.jamMulai} - ${s.jamSelesai}`))).sort();

                    if (timeSlots.length === 0) {
                      return (
                        <tr key={day}>
                          <td className="border border-slate-200 py-3 px-3 font-black text-slate-700 bg-slate-50 text-center">
                            {day}
                          </td>
                          <td colSpan={availableClasses.length + 1} className="border border-slate-200 py-3 px-3 text-center text-slate-400 italic">
                            Belum ada jadwal KBM pada hari {day}
                          </td>
                        </tr>
                      );
                    }

                    return timeSlots.map((slot, sIdx) => {
                      const [slotStart, slotEnd] = slot.split(' - ');
                      const isFirst = sIdx === 0;

                      return (
                        <tr key={`${day}_${slot}`} className="hover:bg-slate-50/70 transition-colors">
                          {isFirst && (
                            <td 
                              rowSpan={timeSlots.length} 
                              className="border border-slate-200 py-3 px-3 font-black text-slate-900 bg-slate-50/80 text-center align-top"
                            >
                              <div className="sticky top-4">
                                <span className="block text-sm">{day}</span>
                                {day === dayNameToday && (
                                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                                    Hari Ini
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="border border-slate-200 py-2.5 px-2 text-center font-mono font-bold text-slate-700 bg-slate-50/40 text-[11px]">
                            {slot}
                          </td>

                          {availableClasses
                            .filter((c) => selectedClassFilter === 'Semua' || selectedClassFilter === c)
                            .map((c) => {
                              const match = daySchedules.find((s) => 
                                s.kelas === c && 
                                s.jamMulai === slotStart
                              );

                              if (!match) {
                                return (
                                  <td key={c} className="border border-slate-200 py-2 px-2 text-center text-slate-300">
                                    -
                                  </td>
                                );
                              }

                              const isMy = user?.nama && match.guruNama.toLowerCase().includes(user.nama.toLowerCase());

                              return (
                                <td key={c} className={`border border-slate-200 p-2 text-xs ${
                                  isMy ? 'bg-indigo-50/80 font-bold' : ''
                                }`}>
                                  <div className="font-extrabold text-slate-900 leading-tight">
                                    {match.mapel}
                                  </div>
                                  <div className="text-[10.5px] text-slate-600 mt-0.5 flex items-center justify-between">
                                    <span className="truncate">{match.guruNama}</span>
                                    <span className="text-[9px] text-slate-400 font-mono">({match.ruang || 'R.Kls'})</span>
                                  </div>
                                </td>
                              );
                            })}
                        </tr>
                      );
                    });
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW C: KELOLA JADWAL (TABLE & BULK ACTIONS) */}
      {displayMode === 'manage' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Daftar Seluruh Data Jadwal Mata Pelajaran ({filteredSchedules.length} Data)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Lakukan edit, tambah, atau hapus jadwal mata pelajaran per kelas dan guru pengampu.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Reset to Default */}
              {onResetSchedules && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset seluruh jadwal mata pelajaran ke format standar sekolah?')) {
                      onResetSchedules();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Kembalikan data ke jadwal awal sekolah"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Default</span>
                </button>
              )}

              {/* Bulk Delete Button */}
              {selectedScheduleIds.length > 0 && (
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedScheduleIds.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Management Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedScheduleIds.length > 0 && selectedScheduleIds.length === filteredSchedules.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedScheduleIds(filteredSchedules.map((s) => s.id));
                        } else {
                          setSelectedScheduleIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Hari & Sesi</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Guru Pengampu</th>
                  <th className="py-3 px-3">Ruang / Lab</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada data jadwal yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((sch) => {
                    const isSelected = selectedScheduleIds.includes(sch.id);

                    return (
                      <tr 
                        key={sch.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScheduleIds((prev) => [...prev, sch.id]);
                              } else {
                                setSelectedScheduleIds((prev) => prev.filter((id) => id !== sch.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">
                            {sch.hari}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {sch.jamMulai} - {sch.jamSelesai} {sch.jamKe ? `(${sch.jamKe})` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-xs">
                            Kelas {sch.kelas}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {sch.mapel}
                          </div>
                          {sch.keterangan && (
                            <div className="text-[10px] text-slate-400 italic">
                              {sch.keterangan}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">
                            {sch.guruNama}
                          </div>
                          {sch.guruNip && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              NUPTK: {sch.guruNip}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-xs">
                          {sch.ruang || `R. Kelas ${sch.kelas}`}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sch)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit jadwal"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(sch.id, sch.mapel, sch.kelas)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: TAMBAH / EDIT JADWAL MATA PELAJARAN            */}
      {/* ======================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl border border-slate-200 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingSchedule ? 'Edit Jadwal Mata Pelajaran' : 'Tambah Jadwal Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur alokasi hari, jam pelajaran, kelas, dan guru pengampu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict Warning Banner */}
            {conflictWarning && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{conflictWarning}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              
              {/* Row 1: Hari & Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Hari Pelaksanaan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formHari}
                    onChange={(e) => setFormHari(e.target.value as DayOfWeek)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                    required
                  >
                    {DAYS_LIST.map((d) => (
                      <option key={d} value={d}>Hari {d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Rombongan Belajar (Kelas) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKelas}
                    onChange={(e) => {
                      setFormKelas(e.target.value);
                      if (!formRuang || formRuang.startsWith('R. Kelas')) {
                        setFormRuang(`R. Kelas ${e.target.value}`);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                    required
                  >
                    {teacherAccessibleClassesForForm.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Jam Pelajaran Presets & Custom Times */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Waktu & Jam Pelajaran</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Pilih Preset Cepat:</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {TIME_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        formJamMulai === p.jamMulai && formJamSelesai === p.jamSelesai
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Time Inputs */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Sesi Jam Ke-</label>
                    <input
                      type="text"
                      value={formJamKe}
                      onChange={(e) => setFormJamKe(e.target.value)}
                      placeholder="e.g. 1 - 2"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jam Mulai (WIB)</label>
                    <input
                      type="time"
                      value={formJamMulai}
                      onChange={(e) => setFormJamMulai(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jam Selesai (WIB)</label>
                    <input
                      type="time"
                      value={formJamSelesai}
                      onChange={(e) => setFormJamSelesai(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Guru Pengampu & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Guru Pengampu <span className="text-rose-500">*</span>
                  </label>
                  {user?.role === 'guru' ? (
                    <input
                      type="text"
                      value={user.nama}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={formGuruId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                      required
                    >
                      <option value="">-- Pilih Guru --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.nama} {t.mapel ? `(${t.mapel})` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  {user?.role === 'guru' && teacherAssignedSubjects.length > 0 ? (
                    <select
                      value={formMapel}
                      onChange={(e) => setFormMapel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                      required
                    >
                      {teacherAssignedSubjects.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formMapel}
                      onChange={(e) => setFormMapel(e.target.value)}
                      placeholder="e.g. Matematika / IPA"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Row 4: Ruang / Lokasi & Warna Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Ruang / Laboratorium
                  </label>
                  <input
                    type="text"
                    value={formRuang}
                    onChange={(e) => setFormRuang(e.target.value)}
                    placeholder="e.g. R. Kelas 7A / Lab IPA / Lab Komputer"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Warna Label Visual
                  </label>
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormWarna(c.value)}
                        className={`w-6 h-6 rounded-full ${c.badge} cursor-pointer transition-transform ${
                          formWarna === c.value ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Keterangan Tambahan */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="e.g. Membawa buku paket dan jangka matematika"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : editingSchedule ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal Baru'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
