/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { 
  Student, 
  AttendanceRecord, 
  SchoolConfig, 
  KalenderHeb, 
  TeacherUser, 
  TeachingJournal, 
  AttendanceSession, 
  AttendanceStatus,
  StudentGradeItem,
  LeaveRequest,
  LeaveRequestStatus,
  JadwalPiketHarian,
  SchoolEventItem,
  ClassScheduleItem,
  TeacherAttendanceRecord,
  TeacherLeaveRequest,
  PetugasPiketItem,
  DayOfWeek,
  AssignmentItem
} from './types';
import { DatabaseService, DEFAULT_SCHOOL_CONFIG } from './services/db';
import { soundService } from './utils/audio';
import { DailyAutoUpdateService } from './utils/dailyAutoUpdate';
import { isSubjectMatch } from './utils/teacherFilter';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { KioskScanner } from './components/KioskScanner';
import { Dashboard } from './components/Dashboard';
import { CardPrinter } from './components/CardPrinter';
import { StudentManagement } from './components/StudentManagement';
import { TeacherManagement } from './components/TeacherManagement';
import { TeacherAttendanceManagement } from './components/TeacherAttendanceManagement';
import { TeacherSelfProfile } from './components/TeacherSelfProfile';
import { GuruPiketManagement } from './components/GuruPiketManagement';
import { TeachingJournalComponent } from './components/TeachingJournal';
import { AssignmentManagement } from './components/AssignmentManagement';
import { Reports } from './components/Reports';
import { PetugasApelAttendance } from './components/PetugasApelAttendance';
import { CalendarHeb } from './components/CalendarHeb';
import { PublicInfo } from './components/PublicInfo';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { RoleSessionBanner } from './components/RoleSessionBanner';
import { DashboardKepalaSekolah } from './components/DashboardKepalaSekolah';
import { PantauAnakDashboard } from './components/pantau-anak/PantauAnakDashboard';
import { LeaveRequestModal } from './components/LeaveRequestModal';
import { LeaveApprovalModal } from './components/LeaveApprovalModal';
import { GradeManagementModal } from './components/GradeManagementModal';
import { WhatsAppNotificationModal } from './components/WhatsAppNotificationModal';
import { AgendaSekolahModal } from './components/AgendaSekolahModal';
import { AiAttendanceAnalysisModal } from './components/AiAttendanceAnalysisModal';
import { StudentReportCardModal } from './components/StudentReportCardModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AutoUpdateStatusBar } from './components/AutoUpdateStatusBar';
import { BellRing, ShieldCheck, LogIn, CalendarDays, Sparkles, Loader2, School, QrCode } from 'lucide-react';

function AppContent() {
  const { user, actingAsPiket, effectiveRole, updateCurrentUserTeacherData } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('public-info');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Data States (Cache-First: instan dari penyimpanan lokal/IndexedDB)
  const initialLocalData = useMemo(() => DatabaseService.getInitialLocalState(), []);
  const [students, setStudents] = useState<Student[]>(initialLocalData.students);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialLocalData.records);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(initialLocalData.schoolConfig);
  const [kalenderHeb, setKalenderHeb] = useState<KalenderHeb>(initialLocalData.kalenderHeb);
  const [teachers, setTeachers] = useState<TeacherUser[]>(initialLocalData.teachers);
  const [journals, setJournals] = useState<TeachingJournal[]>(initialLocalData.journals);
  const [grades, setGrades] = useState<StudentGradeItem[]>(initialLocalData.grades);
  const [schedules, setSchedules] = useState<ClassScheduleItem[]>(initialLocalData.schedules);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLocalData.leaveRequests);
  const [jadwalPiket, setJadwalPiket] = useState<JadwalPiketHarian[]>(initialLocalData.jadwalPiket);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEventItem[]>(initialLocalData.schoolEvents);
  const [teacherRecords, setTeacherRecords] = useState<TeacherAttendanceRecord[]>(initialLocalData.teacherRecords);
  const [teacherLeaves, setTeacherLeaves] = useState<TeacherLeaveRequest[]>(initialLocalData.teacherLeaves);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialLocalData.assignments);
  const availableClasses = useMemo(() => Array.from(new Set(students.map((s) => s.kelas))).sort(), [students]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(100);
  const [loadingStepText, setLoadingStepText] = useState<string>('Pangkalan data siap.');
  const [selectedPantauStudent, setSelectedPantauStudent] = useState<Student | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isLeaveRequestOpen, setIsLeaveRequestOpen] = useState<boolean>(false);
  const [isLeaveApprovalOpen, setIsLeaveApprovalOpen] = useState<boolean>(false);
  const [isGradeManagementOpen, setIsGradeManagementOpen] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | null>(null);
  const [whatsAppDefaultContext, setWhatsAppDefaultContext] = useState<'terlambat' | 'alpa' | 'izin' | 'umum'>('umum');
  const [isAgendaOpen, setIsAgendaOpen] = useState<boolean>(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState<boolean>(false);
  const [isReportCardOpen, setIsReportCardOpen] = useState<boolean>(false);
  const [reportCardStudent, setReportCardStudent] = useState<Student | null>(null);
  const [leaveTargetStudent, setLeaveTargetStudent] = useState<Student | null>(null);

  // Session State & Automation
  const [currentSession, setCurrentSession] = useState<AttendanceSession>('Pagi');
  const [sessionSwitchToast, setSessionSwitchToast] = useState<string | null>(null);
  const prevSessionRef = useRef<AttendanceSession>('Pagi');
  const prevUserRoleRef = useRef<string | null>(null);

  // Auto switch tab when effective role changes
  useEffect(() => {
    const currentRole = effectiveRole;
    if (prevUserRoleRef.current !== null && prevUserRoleRef.current !== currentRole) {
      if (currentRole === 'public') {
        setActiveTab('public-info');
      } else if (currentRole === 'ortu') {
        setActiveTab('pantau-anak');
      } else if (currentRole === 'guru') {
        setActiveTab('journal');
      } else if (currentRole === 'piket') {
        setActiveTab('apel-attendance');
      } else if (currentRole === 'admin') {
        setActiveTab('dashboard');
      } else if (currentRole === 'kepsek') {
        setActiveTab('kepsek');
      }
    }
    prevUserRoleRef.current = currentRole;
  }, [effectiveRole]);

  // Load initial data from cache-first local storage and sync seamlessly via real-time subscriptions
  const loadAllData = useCallback(async () => {
    try {
      const cached = DatabaseService.getInitialLocalState();
      setSchoolConfig(cached.schoolConfig);
      setStudents(cached.students);
      setRecords(cached.records);
      setKalenderHeb(cached.kalenderHeb);
      setTeachers(cached.teachers);
      setJournals(cached.journals);
      setGrades(cached.grades);
      setSchedules(cached.schedules);
      setLeaveRequests(cached.leaveRequests);
      setJadwalPiket(cached.jadwalPiket);
      setSchoolEvents(cached.schoolEvents);
      setTeacherRecords(cached.teacherRecords);
      setTeacherLeaves(cached.teacherLeaves);
      setAssignments(cached.assignments);
      setLoadingProgress(100);
      setLoadingStepText('Pangkalan data siap.');
    } catch (e) {
      console.error('Error loading data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Start automatic daily update daemon
    DailyAutoUpdateService.startDaemon();
    const unsubAutoUpdate = DailyAutoUpdateService.subscribe(() => {
      loadAllData();
    });

    loadAllData();

    // Real-time synchronization across all devices and open tabs
    const unsubStudents = DatabaseService.subscribeStudents((data) => setStudents(data));
    const unsubAttendance = DatabaseService.subscribeAttendance((data) => setRecords(data));
    const unsubGrades = DatabaseService.subscribeGrades((data) => setGrades(data));
    const unsubLeaves = DatabaseService.subscribeLeaveRequests((data) => setLeaveRequests(data));
    const unsubJournals = DatabaseService.subscribeTeachingJournals((data) => setJournals(data));
    const unsubSchedules = DatabaseService.subscribeClassSchedules((data) => setSchedules(data));
    const unsubTeachers = DatabaseService.subscribeTeachers((data) => setTeachers(data));
    const unsubTeacherRecs = DatabaseService.subscribeTeacherAttendanceRecords((data) => setTeacherRecords(data));
    const unsubTeacherLeaves = DatabaseService.subscribeTeacherLeaveRequests((data) => setTeacherLeaves(data));
    const unsubConfig = DatabaseService.subscribeSchoolConfig((data) => setSchoolConfig(data));
    const unsubHeb = DatabaseService.subscribeKalenderHeb((data) => setKalenderHeb(data));
    const unsubPiket = DatabaseService.subscribeJadwalPiket((data) => setJadwalPiket(data));
    const unsubEvents = DatabaseService.subscribeSchoolEvents((data) => setSchoolEvents(data));
    const unsubAssignments = DatabaseService.subscribeAssignments((data) => setAssignments(data));

    return () => {
      unsubAutoUpdate();
      unsubStudents();
      unsubAttendance();
      unsubGrades();
      unsubLeaves();
      unsubJournals();
      unsubSchedules();
      unsubTeachers();
      unsubTeacherRecs();
      unsubTeacherLeaves();
      unsubConfig();
      unsubHeb();
      unsubPiket();
      unsubEvents();
      unsubAssignments();
    };
  }, [loadAllData]);

  // Automatic Session calculation based on current time (with Friday session adaptation)
  const calculateCurrentSession = useCallback((config: SchoolConfig): AttendanceSession => {
    const now = new Date();
    const isFriday = now.getDay() === 5;
    const currentHhMm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const siangStart = isFriday && config.jadwal?.jumatSesiKhusus && config.jadwal?.jumatSiangMulai
      ? config.jadwal.jumatSiangMulai
      : config.jadwal?.siangMulai || '12:00';

    if (currentHhMm >= siangStart) {
      return 'Siang';
    }
    return 'Pagi';
  }, []);

  // Interval check for automatic session switch
  useEffect(() => {
    const checkSession = () => {
      const detected = calculateCurrentSession(schoolConfig);
      if (detected !== prevSessionRef.current) {
        prevSessionRef.current = detected;
        setCurrentSession(detected);
        soundService.playSessionSwitch();
        toast.info('Sesi Presensi Dialihkan', `Sesi presensi otomatis dialihkan ke Sesi ${detected}!`);
      } else {
        setCurrentSession(detected);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 30000);
    return () => clearInterval(interval);
  }, [schoolConfig, calculateCurrentSession]);

  // =========================================================================
  // DEBOUNCE MECHANISM UNTUK PENULISAN DATABASE (Mencegah lonjakan kueri Firestore)
  // =========================================================================
  interface PendingDebounce {
    timer: NodeJS.Timeout;
    fn: () => Promise<void>;
    resolve: () => void;
    reject: (err: unknown) => void;
  }

  const debounceMapRef = useRef<Map<string, PendingDebounce>>(new Map());

  const debouncedDbWrite = useCallback((key: string, fn: () => Promise<void>, delayMs = 400): Promise<void> => {
    const existing = debounceMapRef.current.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      existing.resolve(); // Selesaikan panggilan sebelumnya yang digantikan oleh input terbaru
      debounceMapRef.current.delete(key);
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(async () => {
        debounceMapRef.current.delete(key);
        try {
          await fn();
          resolve();
        } catch (err) {
          console.error(`Gagal penulisan debounce Firestore untuk [${key}]:`, err);
          reject(err);
        }
      }, delayMs);

      debounceMapRef.current.set(key, { timer, fn, resolve, reject });
    });
  }, []);

  const cancelDebouncedWrite = useCallback((key: string) => {
    const existing = debounceMapRef.current.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      existing.resolve();
      debounceMapRef.current.delete(key);
    }
  }, []);

  // Flush seluruh penulisan yang tertunda saat aplikasi ditutup / unmount
  useEffect(() => {
    const flushAll = () => {
      debounceMapRef.current.forEach((task) => {
        clearTimeout(task.timer);
        task.fn().catch((err) => console.error('Error saat flush penulisan:', err));
      });
      debounceMapRef.current.clear();
    };

    window.addEventListener('beforeunload', flushAll);
    return () => {
      window.removeEventListener('beforeunload', flushAll);
      flushAll();
    };
  }, []);

  // Record handlers
  const handleAddRecord = async (record: AttendanceRecord) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });
    await DatabaseService.addAttendanceRecord(record);
    toast.success('Presensi Tercatat', `${record.nama} (${record.kelas}) tercatat ${record.status} sesi ${record.sesi}.`);
  };

  const handleUpdateRecordStatus = async (
    id: string, 
    status: AttendanceStatus, 
    catatan?: string
  ) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, catatan: catatan ?? r.catatan } : r))
    );
    await debouncedDbWrite(`attendance_status_${id}`, async () => {
      await DatabaseService.updateAttendanceStatus(id, status, catatan);
    }, 350);
    toast.info('Status Presensi Diperbarui', `Status kehadiran berhasil diubah menjadi ${status}.`);
  };

  const handleDeleteRecord = async (id: string) => {
    cancelDebouncedWrite(`attendance_status_${id}`);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    await DatabaseService.deleteAttendanceRecord(id);
    toast.delete('Presensi Dihapus', 'Data presensi berhasil dihapus.');
  };

  const handleBulkDeleteRecords = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`attendance_status_${id}`));
    const idSet = new Set(ids);
    setRecords((prev) => prev.filter((r) => !idSet.has(r.id)));
    await DatabaseService.bulkDeleteAttendanceRecords(ids);
    toast.delete('Presensi Massal Dihapus', `${ids.length} data presensi terpilih berhasil dihapus.`);
  };

  const handleBulkSaveAttendance = async (recordsToSave: AttendanceRecord[]) => {
    setRecords((prev) => {
      const map = new Map<string, AttendanceRecord>();
      prev.forEach((r) => map.set(r.id, r));
      recordsToSave.forEach((r) => map.set(r.id, r));
      return Array.from(map.values());
    });
    await DatabaseService.bulkSaveAttendanceRecords(recordsToSave);
    toast.success('Presensi Rombel Disimpan', `${recordsToSave.length} data presensi apel rombel berhasil disimpan.`);
  };

  // Student handlers (Debounced pada penulisan database, State instan)
  const handleSaveStudent = async (student: Student) => {
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.nisn === student.nisn);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = student;
        return copy;
      }
      return [...prev, student];
    });
    await debouncedDbWrite(`student_${student.nisn}`, async () => {
      await DatabaseService.saveStudent(student);
    }, 400);
    toast.success('Data Siswa Disimpan', `Data siswa ${student.nama} (${student.kelas}) berhasil disimpan.`);
  };

  const handleDeleteStudent = async (nisn: string) => {
    cancelDebouncedWrite(`student_${nisn}`);
    setStudents((prev) => prev.filter((s) => s.nisn !== nisn));
    await DatabaseService.deleteStudent(nisn);
    toast.delete('Data Siswa Dihapus', 'Data siswa berhasil dihapus dari sistem.');
  };

  const handleBulkDeleteStudents = async (nisns: string[]) => {
    nisns.forEach((n) => cancelDebouncedWrite(`student_${n}`));
    const nisnSet = new Set(nisns);
    setStudents((prev) => prev.filter((s) => !nisnSet.has(s.nisn)));
    await DatabaseService.bulkDeleteStudents(nisns);
    toast.delete('Siswa Dihapus Massal', `${nisns.length} data siswa berhasil dihapus dari database.`);
  };

  const handleBulkSaveStudents = async (newStudents: Student[]) => {
    await DatabaseService.bulkSaveStudents(newStudents);
    const updated = await DatabaseService.getStudents();
    setStudents(updated);
    toast.upload('Impor Siswa Berhasil', `${newStudents.length} data siswa berhasil diimpor ke database.`);
  };

  // Teacher handlers: Synchronize immediately to Firestore, sync Piket Schedule, and unlock roles
  const handleSaveTeacher = async (teacher: TeacherUser) => {
    setTeachers((prev) => {
      const idx = prev.findIndex((t) => t.id === teacher.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = teacher;
        return copy;
      }
      return [...prev, teacher];
    });

    await DatabaseService.saveTeacher(teacher);

    // Synchronize Guru Piket duties with jadwalPiket
    if (teacher.piketDays !== undefined) {
      setJadwalPiket((prevPiket) => {
        const updatedPiket = prevPiket.map((dayItem) => {
          const isAssigned = Boolean(teacher.isGuruPiket) && teacher.piketDays?.includes(dayItem.hari);
          const existingIdx = dayItem.petugas.findIndex((p) => 
            (p.teacherId && p.teacherId === teacher.id) ||
            (p.nama && p.nama.toLowerCase().trim() === teacher.nama.toLowerCase().trim())
          );

          if (isAssigned) {
            const officerObj: PetugasPiketItem = {
              id: existingIdx >= 0 ? dayItem.petugas[existingIdx].id : `piket_${dayItem.hari.toLowerCase()}_${teacher.id}`,
              teacherId: teacher.id,
              nama: teacher.nama,
              nip: teacher.nip || '-',
              nomorHp: teacher.nomorHp,
              peran: teacher.piketRole || 'Piket Disiplin & Kerapian Siswa',
              jamMulai: '06:30',
              jamSelesai: '14:30',
              syncUserRole: true,
            };
            if (existingIdx >= 0) {
              const list = [...dayItem.petugas];
              list[existingIdx] = officerObj;
              return { ...dayItem, petugas: list };
            } else {
              return { ...dayItem, petugas: [...dayItem.petugas, officerObj] };
            }
          } else {
            if (existingIdx >= 0) {
              return { ...dayItem, petugas: dayItem.petugas.filter((_, idx) => idx !== existingIdx) };
            }
          }
          return dayItem;
        });

        DatabaseService.saveJadwalPiket(updatedPiket).catch((err) => console.warn('Sync piket error:', err));
        return updatedPiket;
      });
    }

    // Immediately unlock roles in AuthContext if current user is this teacher
    if (user && (user.id === teacher.id || user.nama.toLowerCase().trim() === teacher.nama.toLowerCase().trim())) {
      updateCurrentUserTeacherData(teacher);
    }

    toast.success('Akun & Penugasan Disimpan', `Data penugasan peran ${teacher.nama} berhasil disinkronkan ke database.`);
  };

  const handleDeleteTeacher = async (id: string) => {
    cancelDebouncedWrite(`teacher_${id}`);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    await DatabaseService.deleteTeacher(id);
    toast.delete('Akun Guru Dihapus', 'Data akun guru berhasil dihapus.');
  };

  const handleBulkDeleteTeachers = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`teacher_${id}`));
    const idSet = new Set(ids);
    setTeachers((prev) => prev.filter((t) => !idSet.has(t.id)));
    await DatabaseService.bulkDeleteTeachers(ids);
    toast.delete('Akun Guru Dihapus Massal', `${ids.length} akun guru berhasil dihapus.`);
  };

  const handleBulkSaveTeachers = async (newTeachers: TeacherUser[]) => {
    await DatabaseService.bulkSaveTeachers(newTeachers);
    const updated = await DatabaseService.getTeachers();
    setTeachers(updated);
    toast.upload('Impor Data Guru Berhasil', `${newTeachers.length} data guru berhasil diimpor ke database.`);
  };

  // Teaching Journal handlers (Debounced pada penulisan database, State instan)
  const handleSaveJournal = async (journal: TeachingJournal, classAttendanceRecords?: AttendanceRecord[]) => {
    setJournals((prev) => {
      const idx = prev.findIndex((j) => j.id === journal.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = journal;
        return copy;
      }
      return [journal, ...prev];
    });

    if (classAttendanceRecords && classAttendanceRecords.length > 0) {
      setRecords((prev) => {
        const map = new Map<string, AttendanceRecord>();
        prev.forEach((r) => map.set(r.id, r));
        classAttendanceRecords.forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
      });
    }

    await debouncedDbWrite(`journal_${journal.id}`, async () => {
      await DatabaseService.saveTeachingJournal(journal);
      if (classAttendanceRecords && classAttendanceRecords.length > 0) {
        await DatabaseService.bulkSaveAttendanceRecords(classAttendanceRecords);
      }
    }, 400);
    toast.success('Jurnal KBM Disimpan', `Jurnal pembelajaran materi "${journal.materiPokok}" berhasil disimpan.`);
  };

  const handleDeleteJournal = async (id: string) => {
    cancelDebouncedWrite(`journal_${id}`);
    setJournals((prev) => prev.filter((j) => j.id !== id));
    await DatabaseService.deleteTeachingJournal(id);
    toast.delete('Jurnal KBM Dihapus', 'Jurnal pembelajaran berhasil dihapus.');
  };

  const handleBulkDeleteJournals = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`journal_${id}`));
    const idSet = new Set(ids);
    setJournals((prev) => prev.filter((j) => !idSet.has(j.id)));
    await DatabaseService.bulkDeleteTeachingJournals(ids);
    toast.delete('Jurnal Dihapus Massal', `${ids.length} jurnal pembelajaran berhasil dihapus.`);
  };

  // HEB & Config handlers (Debounced pada penulisan database, State instan)
  const handleSaveKalenderHeb = async (heb: KalenderHeb) => {
    setKalenderHeb(heb);
    await debouncedDbWrite('kalender_heb', async () => {
      await DatabaseService.saveKalenderHeb(heb);
    }, 450);
    toast.success('Kalender HEB Disimpan', 'Rincian hari efektif belajar berhasil diperbarui.');
  };

  const handleSaveConfig = async (newConfig: SchoolConfig) => {
    setSchoolConfig(newConfig);
    await debouncedDbWrite('school_config', async () => {
      await DatabaseService.saveSchoolConfig(newConfig);
    }, 450);
    toast.success('Pengaturan Sekolah Disimpan', 'Konfigurasi sekolah dan identitas berhasil diperbarui.');
  };

  // Grade Handlers (Debounced pada penulisan database, State instan)
  const handleSaveGrade = async (grade: StudentGradeItem) => {
    setGrades((prev) => {
      const idx = prev.findIndex((g) => g.id === grade.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = grade;
        return copy;
      }
      return [grade, ...prev];
    });
    await debouncedDbWrite(`grade_${grade.id}`, async () => {
      await DatabaseService.saveStudentGrade(grade);
    }, 400);
    const studentName = students.find((s) => s.nisn === grade.nisn)?.nama || grade.nisn;
    toast.success('Nilai Siswa Disimpan', `Nilai ${grade.jenisPenilaian} (${grade.namaPenilaian}) untuk ${studentName} berhasil dicatat.`);
  };

  const handleDeleteGrade = async (id: string) => {
    cancelDebouncedWrite(`grade_${id}`);
    setGrades((prev) => prev.filter((g) => g.id !== id));
    await DatabaseService.deleteStudentGrade(id);
    toast.delete('Nilai Siswa Dihapus', 'Data nilai berhasil dihapus.');
  };

  const handleBulkDeleteGrades = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`grade_${id}`));
    const idSet = new Set(ids);
    setGrades((prev) => prev.filter((g) => !idSet.has(g.id)));
    await DatabaseService.bulkDeleteStudentGrades(ids);
    toast.delete('Nilai Dihapus Massal', `${ids.length} data nilai siswa berhasil dihapus.`);
  };

  const handleBulkSaveGrades = async (newGrades: StudentGradeItem[]) => {
    await DatabaseService.bulkSaveStudentGrades(newGrades);
    const updated = await DatabaseService.getStudentGrades();
    setGrades(updated);
    toast.success('Nilai Siswa Disimpan', `${newGrades.length} data nilai siswa berhasil dicatat ke database.`);
  };

  // Schedule Handlers: Synchronize immediately to database, update teacher workload, and unlock roles
  const handleSaveSchedule = async (schedule: ClassScheduleItem) => {
    // 1. Immediately update schedule in state
    setSchedules((prev) => {
      const idx = prev.findIndex((s) => s.id === schedule.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = schedule;
        return copy;
      }
      return [...prev, schedule];
    });

    // 2. Persist schedule to database immediately
    await DatabaseService.saveClassSchedule(schedule);

    // 3. Automatically sync with Teacher User (guru_users) and unlock roles!
    const targetTeacher = teachers.find((t) => {
      if (schedule.guruId && t.id === schedule.guruId) return true;
      if (schedule.guruNip && t.nip && t.nip.trim() !== '-' && t.nip.trim() === schedule.guruNip.trim()) return true;
      if (schedule.guruNama && t.nama && t.nama.toLowerCase().trim() === schedule.guruNama.toLowerCase().trim()) return true;
      return false;
    });

    if (targetTeacher) {
      const currentAssignments = targetTeacher.penugasanMapel ? [...targetTeacher.penugasanMapel] : [];
      const updatedMapel = targetTeacher.mapel || schedule.mapel;

      const existingAsgnIdx = currentAssignments.findIndex((a) => isSubjectMatch(a.mapel, schedule.mapel));
      if (existingAsgnIdx >= 0) {
        const asgn = { ...currentAssignments[existingAsgnIdx] };
        const kelasList = asgn.kelas || [];
        if (!kelasList.includes(schedule.kelas)) {
          asgn.kelas = [...kelasList, schedule.kelas];
          currentAssignments[existingAsgnIdx] = asgn;
        }
      } else {
        currentAssignments.push({
          id: `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          mapel: schedule.mapel,
          kelas: [schedule.kelas],
          bebanJam: 2,
        });
      }

      const totalJam = currentAssignments.reduce((acc, a) => acc + (a.bebanJam || 2), 0);

      const updatedTeacher: TeacherUser = {
        ...targetTeacher,
        mapel: updatedMapel,
        penugasanMapel: currentAssignments,
        totalJamMengajar: totalJam,
        isGuruMapel: true, // Otomatis membuka role Guru Mapel
      };

      await DatabaseService.saveTeacher(updatedTeacher);
      setTeachers((prev) => prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));

      // If current logged-in user is this teacher, immediately unlock roles
      if (user && (user.id === targetTeacher.id || user.nama.toLowerCase().trim() === targetTeacher.nama.toLowerCase().trim())) {
        updateCurrentUserTeacherData(updatedTeacher);
      }
    }

    toast.success('Jadwal Pelajaran Disimpan', `Jadwal ${schedule.mapel} kelas ${schedule.kelas} hari ${schedule.hari} berhasil disinkronkan ke database.`);
  };

  const handleDeleteSchedule = async (id: string) => {
    cancelDebouncedWrite(`schedule_${id}`);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    await DatabaseService.deleteClassSchedule(id);
    toast.delete('Jadwal Pelajaran Dihapus', 'Jadwal pelajaran berhasil dihapus.');
  };

  const handleBulkDeleteSchedules = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`schedule_${id}`));
    const idSet = new Set(ids);
    setSchedules((prev) => prev.filter((s) => !idSet.has(s.id)));
    await DatabaseService.bulkDeleteClassSchedules(ids);
    toast.delete('Jadwal Dihapus Massal', `${ids.length} jadwal pelajaran berhasil dihapus.`);
  };

  const handleResetSchedules = async () => {
    const defaultSchedules = await DatabaseService.resetClassSchedulesToDefault();
    setSchedules(defaultSchedules);
    toast.success('Jadwal Direset', 'Jadwal pelajaran berhasil dikembalikan ke format standar sekolah.');
  };

  // Assignment Handlers (Tugas Siswa): Synchronize immediately to database and automatically unlock teacher roles
  const handleSaveAssignment = async (assignment: AssignmentItem) => {
    setAssignments((prev) => {
      const idx = prev.findIndex((a) => a.id === assignment.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = assignment;
        return copy;
      }
      return [assignment, ...prev];
    });

    await DatabaseService.saveAssignment(assignment);

    const targetTeacher = teachers.find((t) => {
      if (assignment.guruId && t.id === assignment.guruId) return true;
      if (assignment.guruNama && t.nama && t.nama.toLowerCase().trim() === assignment.guruNama.toLowerCase().trim()) return true;
      return false;
    });

    if (targetTeacher) {
      const currentAssignments = targetTeacher.penugasanMapel ? [...targetTeacher.penugasanMapel] : [];
      const updatedMapel = targetTeacher.mapel || assignment.mapel;

      const existingAsgnIdx = currentAssignments.findIndex((a) => isSubjectMatch(a.mapel, assignment.mapel));
      if (existingAsgnIdx >= 0) {
        const asgn = { ...currentAssignments[existingAsgnIdx] };
        const kelasList = asgn.kelas || [];
        if (!kelasList.includes(assignment.kelas)) {
          asgn.kelas = [...kelasList, assignment.kelas];
          currentAssignments[existingAsgnIdx] = asgn;
        }
      } else {
        currentAssignments.push({
          id: `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          mapel: assignment.mapel,
          kelas: [assignment.kelas],
          bebanJam: 2,
        });
      }

      const updatedTeacher: TeacherUser = {
        ...targetTeacher,
        mapel: updatedMapel,
        penugasanMapel: currentAssignments,
        isGuruMapel: true,
      };

      await DatabaseService.saveTeacher(updatedTeacher);
      setTeachers((prev) => prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));

      if (user && (user.id === targetTeacher.id || user.nama.toLowerCase().trim() === targetTeacher.nama.toLowerCase().trim())) {
        updateCurrentUserTeacherData(updatedTeacher);
      }
    }

    toast.success('Tugas Siswa Disimpan', `Tugas "${assignment.judul}" untuk kelas ${assignment.kelas} berhasil disinkronkan ke database.`);
  };

  const handleDeleteAssignment = async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    await DatabaseService.deleteAssignment(id);
    toast.delete('Tugas Dihapus', 'Data tugas siswa berhasil dihapus dari database.');
  };

  // Leave Request Handlers
  const handleSubmitLeaveRequest = async (req: LeaveRequest) => {
    setLeaveRequests((prev) => [req, ...prev]);
    await debouncedDbWrite(`leave_${req.id}`, async () => {
      await DatabaseService.saveLeaveRequest(req);
    }, 400);
    toast.upload('Permohonan Izin Terkirim', `Surat izin/sakit ${req.nama} berhasil dikirim ke guru piket.`);
  };

  const handleUpdateLeaveStatus = async (
    id: string, 
    status: LeaveRequestStatus, 
    catatan?: string
  ) => {
    const approver = user ? `${user.nama} (${user.role === 'admin' ? 'Admin' : 'Guru Piket'})` : 'Petugas Piket';
    await DatabaseService.updateLeaveRequestStatus(id, status, approver, catatan);
    const updatedLeaves = await DatabaseService.getLeaveRequests();
    setLeaveRequests(updatedLeaves);
    // Refresh attendance records because approved leaves auto-generate attendance records
    const updatedRecords = await DatabaseService.getAttendanceRecords();
    setRecords(updatedRecords);
    toast.info('Status Permohonan Diperbarui', `Permohonan izin/sakit telah ${status.toLowerCase()}.`);
  };

  const handleDeleteLeaveRequest = async (id: string) => {
    cancelDebouncedWrite(`leave_${id}`);
    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    await DatabaseService.deleteLeaveRequest(id);
    toast.delete('Permohonan Dihapus', 'Surat permohonan izin berhasil dihapus.');
  };

  const handleBulkDeleteLeaveRequests = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`leave_${id}`));
    const idSet = new Set(ids);
    setLeaveRequests((prev) => prev.filter((r) => !idSet.has(r.id)));
    await DatabaseService.bulkDeleteLeaveRequests(ids);
    toast.delete('Permohonan Dihapus Massal', `${ids.length} permohonan izin berhasil dihapus.`);
  };

  const handleSaveJadwalPiket = async (updated: JadwalPiketHarian[]) => {
    setJadwalPiket(updated);
    await DatabaseService.saveJadwalPiket(updated);

    // Sync piket assignment back to teachers in guru_users
    const teacherPiketMap = new Map<string, { days: DayOfWeek[]; peran?: string }>();
    updated.forEach((dayData) => {
      dayData.petugas.forEach((p) => {
        const key = p.teacherId || p.nama.toLowerCase().trim();
        const existing = teacherPiketMap.get(key) || { days: [] };
        if (!existing.days.includes(dayData.hari)) {
          existing.days.push(dayData.hari);
        }
        if (p.peran) existing.peran = p.peran;
        teacherPiketMap.set(key, existing);
      });
    });

    const updatedTeachers = teachers.map((t) => {
      const piketInfo = teacherPiketMap.get(t.id) || teacherPiketMap.get(t.nama.toLowerCase().trim());
      if (piketInfo && piketInfo.days.length > 0) {
        return {
          ...t,
          isGuruPiket: true,
          piketDays: piketInfo.days,
          piketRole: piketInfo.peran || t.piketRole,
        };
      }
      return t;
    });

    setTeachers(updatedTeachers);
    await DatabaseService.bulkSaveTeachers(updatedTeachers);

    // Unlock or update roles for current user if impacted
    if (user) {
      const found = updatedTeachers.find((t) => t.id === user.id || t.nama.toLowerCase().trim() === user.nama.toLowerCase().trim());
      if (found) {
        updateCurrentUserTeacherData(found);
      }
    }

    toast.success('Jadwal Piket Disimpan', 'Jadwal penugasan guru piket mingguan berhasil disinkronkan ke database.');
  };

  // Teacher Attendance Handlers
  const handleSaveTeacherAttendance = async (rec: TeacherAttendanceRecord) => {
    setTeacherRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === rec.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = rec;
        return copy;
      }
      return [rec, ...prev];
    });
    await DatabaseService.saveTeacherAttendanceRecord(rec);
  };

  const handleSaveTeacherLeave = async (leave: TeacherLeaveRequest) => {
    setTeacherLeaves((prev) => {
      const idx = prev.findIndex((l) => l.id === leave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = leave;
        return copy;
      }
      return [leave, ...prev];
    });
    await DatabaseService.saveTeacherLeaveRequest(leave);
  };

  const handleDeleteTeacherAttendance = async (id: string) => {
    setTeacherRecords((prev) => prev.filter((r) => r.id !== id));
    await DatabaseService.deleteTeacherAttendanceRecord(id);
    toast.delete('Presensi Dihapus', 'Data presensi guru berhasil dihapus.');
  };

  const handleDeleteTeacherLeave = async (id: string) => {
    setTeacherLeaves((prev) => prev.filter((l) => l.id !== id));
    await DatabaseService.deleteTeacherLeaveRequest(id);
    toast.delete('Permohonan Dihapus', 'Surat permohonan izin guru berhasil dihapus.');
  };

  const pendingLeaveCount = leaveRequests.filter((r) => r.statusPengajuan === 'Menunggu').length;

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col lg:flex-row text-slate-900 relative">
      
      {/* 1. SIDEBAR ON THE SIDE (Hanya aktif dan ditampilkan jika ada akun login) */}
      {user && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenSettings={() => {
            if (user?.role === 'admin') setIsSettingsOpen(true);
          }}
          onOpenLogin={() => setIsLoginOpen(true)}
          schoolConfig={schoolConfig}
          pendingLeaveCount={pendingLeaveCount}
          onOpenLeaveApproval={() => setIsLeaveApprovalOpen(true)}
          onOpenLeaveRequest={() => {
            setLeaveTargetStudent(null);
            setIsLeaveRequestOpen(true);
          }}
          onOpenGradeManagement={() => setIsGradeManagementOpen(true)}
          onOpenWhatsApp={() => {
            setWhatsAppTargetStudent(null);
            setWhatsAppDefaultContext('umum');
            setIsWhatsAppOpen(true);
          }}
          onOpenAgenda={() => setIsAgendaOpen(true)}
          onOpenAiAnalysis={() => setIsAiAnalysisOpen(true)}
        />
      )}

      {/* 2. MAIN APP CONTENT CONTAINER (Offset hanya jika ada sidebar akun login) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all ${user ? 'lg:pl-72' : ''}`}>
        
        {/* Top Header Navbar */}
        <Navbar
          activeTab={activeTab}
          currentSession={currentSession}
          onOpenSettings={() => {
            if (user?.role === 'admin') setIsSettingsOpen(true);
          }}
          onOpenLogin={() => setIsLoginOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          schoolConfig={schoolConfig}
          students={students}
          records={records}
          setActiveTab={setActiveTab}
          onSelectStudent={(student) => {
            setSelectedPantauStudent(student);
            setActiveTab('pantau-anak');
          }}
          pendingLeaveCount={pendingLeaveCount}
          onOpenLeaveApproval={() => setIsLeaveApprovalOpen(true)}
          onOpenLeaveRequest={() => {
            setLeaveTargetStudent(null);
            setIsLeaveRequestOpen(true);
          }}
          onOpenGradeManagement={() => setIsGradeManagementOpen(true)}
          onOpenWhatsApp={() => {
            setWhatsAppTargetStudent(null);
            setWhatsAppDefaultContext('umum');
            setIsWhatsAppOpen(true);
          }}
          onOpenAgenda={() => setIsAgendaOpen(true)}
          onOpenAiAnalysis={() => setIsAiAnalysisOpen(true)}
        />

        {/* Global User Role & Session Bar */}
        <RoleSessionBanner
          onOpenLoginModal={() => setIsLoginOpen(true)}
          onOpenSettings={() => {
            if (user?.role === 'admin') setIsSettingsOpen(true);
          }}
          setActiveTab={setActiveTab}
        />

        {/* Automatic Session Switch Toast Notification */}
        {sessionSwitchToast && (
          <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-indigo-900 text-white shadow-xl border border-indigo-700 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <BellRing className="w-5 h-5 text-amber-300 animate-bounce" />
            <div className="text-xs font-bold">{sessionSwitchToast}</div>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
          {isLoading ? (
            <div className="py-16 sm:py-24 flex flex-col items-center justify-center px-4">
              <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-blue-100/70 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-indigo-100/70 rounded-full blur-3xl pointer-events-none" />

                {/* Header branding */}
                <div className="flex flex-col items-center text-center relative z-10 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-3.5 relative">
                    <School className="w-8 h-8 text-white" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                      <Sparkles className="w-2.5 h-2.5 text-white animate-spin" />
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {schoolConfig.namaSekolah || 'SMP PGRI 1 CIBINONG'}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Sistem Manajemen & Presensi Digital Terpadu
                  </p>
                </div>

                {/* Smooth Progress Bar Container */}
                <div className="relative z-10 space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs font-bold gap-2">
                    <span className="text-slate-600 flex items-center gap-1.5 truncate">
                      <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                      <span className="truncate">{loadingStepText}</span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full font-black text-[11px] border border-blue-200/70 shrink-0 shadow-xs">
                      {loadingProgress}%
                    </span>
                  </div>

                  {/* Outer track */}
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out relative overflow-hidden"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      {/* Animated Shimmer Bar overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-pulse rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Module loading status checklist */}
                <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-500 font-medium bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${loadingProgress >= 30 ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300 animate-pulse'}`} />
                    <span className={`truncate ${loadingProgress >= 30 ? 'text-slate-800 font-bold' : ''}`}>Siswa & Rombel</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-medium bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${loadingProgress >= 50 ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300 animate-pulse'}`} />
                    <span className={`truncate ${loadingProgress >= 50 ? 'text-slate-800 font-bold' : ''}`}>Presensi & Apel</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-medium bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${loadingProgress >= 75 ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300 animate-pulse'}`} />
                    <span className={`truncate ${loadingProgress >= 75 ? 'text-slate-800 font-bold' : ''}`}>Jurnal & Rapor</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-medium bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-100">
                    <span className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${loadingProgress >= 90 ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300 animate-pulse'}`} />
                    <span className={`truncate ${loadingProgress >= 90 ? 'text-slate-800 font-bold' : ''}`}>Piket & Izin</span>
                  </div>
                </div>

                {/* Footer security & status info */}
                <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Koneksi Aman & Sinkronisasi Cloud Real-Time</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Daily Auto Update Status & Date Control Bar */}
              <AutoUpdateStatusBar onRefreshAllData={loadAllData} className="mb-5" />

              {/* Tab: KIOSK SCANNER (Khusus Guru Piket, Guru Mapel & Staf Sekolah) */}
              {activeTab === 'kiosk' && (
                user ? (
                  <KioskScanner
                    students={students}
                    attendanceRecords={records}
                    onAddRecord={handleAddRecord}
                    schoolConfig={schoolConfig}
                    currentSession={currentSession}
                    teachers={teachers}
                    teacherAttendanceRecords={teacherRecords}
                    onAddTeacherRecord={handleSaveTeacherAttendance}
                    onOpenLogin={() => setIsLoginOpen(true)}
                    onOpenLeaveRequest={() => {
                      setLeaveTargetStudent(null);
                      setIsLeaveRequestOpen(true);
                    }}
                    setActiveTab={setActiveTab}
                    jadwalPiket={jadwalPiket}
                  />
                ) : (
                  <div className="py-16 text-center max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Layar Pindai Khusus Petugas Sekolah
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                        Pindai kartu presensi di gerbang sekolah dikhususkan untuk Guru Piket dan Staf Admin. Untuk aktivitas orang tua murid, silakan gunakan Portal Pantau Anak.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      <button
                        onClick={() => setActiveTab('pantau-anak')}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Buka Pantau Anak (Orang Tua)</span>
                      </button>
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Guru Piket / Admin</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: ABSENSI APEL PETUGAS (PAGI & SIANG) */}
              {activeTab === 'apel-attendance' && (
                user ? (
                  <PetugasApelAttendance
                    students={students}
                    records={records}
                    schoolConfig={schoolConfig}
                    currentSession={currentSession}
                    teachers={teachers}
                    onBulkSave={handleBulkSaveAttendance}
                    onOpenScanner={() => setActiveTab('kiosk')}
                    onRefresh={loadAllData}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Khusus Petugas Piket & Admin</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Lembar presensi apel harian per rombel hanya dapat diakses oleh Petugas Piket Sekolah dan Administrator.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Petugas Piket</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: DASHBOARD (Mode Publik atau Staff) */}
              {activeTab === 'dashboard' && (
                <Dashboard
                  students={students}
                  records={records}
                  schoolConfig={schoolConfig}
                  currentSession={currentSession}
                  teachers={teachers}
                  onUpdateStatus={handleUpdateRecordStatus}
                  onDeleteRecord={handleDeleteRecord}
                  onBulkDeleteRecords={handleBulkDeleteRecords}
                  onAddManualRecord={handleAddRecord}
                  onRefresh={loadAllData}
                  onOpenLogin={() => setIsLoginOpen(true)}
                  setActiveTab={setActiveTab}
                  onOpenAiAnalysis={() => setIsAiAnalysisOpen(true)}
                  onOpenWhatsApp={(targetSts, ctx) => {
                    setWhatsAppTargetStudent(targetSts && targetSts.length === 1 ? targetSts[0] : null);
                    setWhatsAppDefaultContext(ctx || 'umum');
                    setIsWhatsAppOpen(true);
                  }}
                  onOpenAgenda={() => setIsAgendaOpen(true)}
                  schoolEvents={schoolEvents}
                />
              )}

              {/* Tab: SUPERVISI KEPALA SEKOLAH */}
              {activeTab === 'kepsek' && (
                user ? (
                  <DashboardKepalaSekolah
                    schoolConfig={schoolConfig}
                    students={students}
                    attendanceRecords={records}
                    teachers={teachers}
                    teacherRecords={teacherRecords}
                    teacherLeaves={teacherLeaves}
                    teachingJournals={journals}
                    grades={grades}
                    currentUser={user}
                    onSaveTeacherLeave={handleSaveTeacherLeave}
                    onOpenTab={setActiveTab}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4">
                    <ShieldCheck className="w-12 h-12 text-amber-600 mx-auto" />
                    <h3 className="text-xl font-black text-slate-900">Portal Supervisi Kepala Sekolah</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Silakan login menggunakan akun Kepala Sekolah untuk mengakses portal supervisi eksekutif KBM, persetujuan izin, dan rekapitulasi sekolah.
                    </p>
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Login Kepala Sekolah
                    </button>
                  </div>
                )
              )}

              {/* Tab: PANTAU ANAK (Khusus Orang Tua / Wali Siswa) */}
              {activeTab === 'pantau-anak' && (
                <PantauAnakDashboard
                  students={students}
                  records={records}
                  schoolConfig={schoolConfig}
                  teachers={teachers}
                  initialStudent={selectedPantauStudent}
                  onOpenLoginModal={() => setIsLoginOpen(true)}
                  onBackToSearch={() => setSelectedPantauStudent(null)}
                  onBackToPublic={() => setActiveTab('public-info')}
                  leaveRequests={leaveRequests}
                  onOpenLeaveRequest={(student) => {
                    setLeaveTargetStudent(student || null);
                    setIsLeaveRequestOpen(true);
                  }}
                  onOpenGradeManagement={() => setIsGradeManagementOpen(true)}
                />
              )}

              {/* Tab: JADWAL & PROFIL SEKOLAH (Khusus Mode Publik / Monitoring Orang Tua) */}
              {activeTab === 'public-info' && (
                <PublicInfo
                  schoolConfig={schoolConfig}
                  students={students}
                  records={records}
                  journals={journals}
                  teachers={teachers}
                  jadwalPiket={jadwalPiket}
                  currentSession={currentSession}
                  schoolEvents={schoolEvents}
                  onOpenLogin={() => setIsLoginOpen(true)}
                  onOpenScanner={() => setActiveTab('kiosk')}
                  onOpenLeaveRequest={() => {
                    setLeaveTargetStudent(null);
                    setIsLeaveRequestOpen(true);
                  }}
                  onOpenAgenda={() => setIsAgendaOpen(true)}
                  onOpenPantauAnak={(student) => {
                    setSelectedPantauStudent(student || null);
                    setActiveTab('pantau-anak');
                  }}
                />
              )}

              {/* Tab: CETAK KARTU (Hanya untuk pengguna login) */}
              {(activeTab === 'cards' || activeTab === 'cards-guru') && (
                user ? (
                  <CardPrinter
                    students={students}
                    teachers={teachers}
                    schoolConfig={schoolConfig}
                    defaultCategory={activeTab === 'cards-guru' ? 'GURU' : 'SISWA'}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas: Cetak Kartu Digital</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pencetakan kartu QR siswa &amp; guru dapat diakses oleh Administrator Sistem dan Pendidik Sekolah.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Pegawai / Guru</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: JURNAL KBM & JADWAL MENGAJAR (Khusus Guru & Supervisi Admin) */}
              {activeTab === 'journal' && (
                user ? (
                  <TeachingJournalComponent
                    journals={journals}
                    students={students}
                    schoolConfig={schoolConfig}
                    teachers={teachers}
                    schedules={schedules}
                    records={records}
                    leaveRequests={leaveRequests}
                    assignments={assignments}
                    onSaveJournal={handleSaveJournal}
                    onDeleteJournal={handleDeleteJournal}
                    onBulkDeleteJournals={handleBulkDeleteJournals}
                    onSaveSchedule={handleSaveSchedule}
                    onDeleteSchedule={handleDeleteSchedule}
                    onBulkDeleteSchedules={handleBulkDeleteSchedules}
                    onResetSchedules={handleResetSchedules}
                    onSaveAssignment={handleSaveAssignment}
                    onDeleteAssignment={handleDeleteAssignment}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas: Jurnal Mengajar KBM</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pengisian agenda mengajar dan absensi mapel dikhususkan bagi Dewan Guru dan Administrator Sekolah.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Akun Guru</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: KELOLA TUGAS & PR SISWA (Admin & Guru) */}
              {activeTab === 'assignments' && (
                user ? (
                  <AssignmentManagement
                    assignments={assignments}
                    teachers={teachers}
                    schoolConfig={schoolConfig}
                    availableClasses={availableClasses}
                    onSaveAssignment={handleSaveAssignment}
                    onDeleteAssignment={handleDeleteAssignment}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 text-indigo-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Khusus: Kelola Tugas Siswa</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manajemen penugasan, PR, dan proyek siswa dapat diakses oleh Dewan Guru dan Administrator Sekolah.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Akun Guru / Admin</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: DATA POKOK SISWA (Khusus Admin / Guru) */}
              {activeTab === 'students' && (
                user ? (
                  <StudentManagement
                    students={students}
                    onSaveStudent={handleSaveStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onBulkDeleteStudents={handleBulkDeleteStudents}
                    onBulkSaveStudents={handleBulkSaveStudents}
                    schoolConfig={schoolConfig}
                    onOpenWhatsApp={(st) => {
                      setWhatsAppTargetStudent(st);
                      setWhatsAppDefaultContext('umum');
                      setIsWhatsAppOpen(true);
                    }}
                    onOpenReportCard={(st) => {
                      setReportCardStudent(st);
                      setIsReportCardOpen(true);
                    }}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas: Data Pokok Siswa</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pengelolaan database Dapodik siswa hanya dapat dilakukan oleh staf sekolah terverifikasi.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Pegawai / Guru</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: DATA & AKUN GURU (Khusus Admin) */}
              {activeTab === 'teachers' && (
                user && user.role === 'admin' ? (
                  <TeacherManagement
                    teachers={teachers}
                    onSaveTeacher={handleSaveTeacher}
                    onDeleteTeacher={handleDeleteTeacher}
                    onBulkDeleteTeachers={handleBulkDeleteTeachers}
                    onBulkSaveTeachers={handleBulkSaveTeachers}
                    schoolConfig={schoolConfig}
                    jadwalPiket={jadwalPiket}
                    setActiveTab={setActiveTab}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Khusus Administrator</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Manajemen akun guru, penugasan mata pelajaran, dan beban jam mengajar hanya dapat diakses oleh Administrator Sistem.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Administrator</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: PROFIL & KARTU SAYA (Mandiri Guru) */}
              {activeTab === 'my-profile' && (
                user ? (
                  <TeacherSelfProfile
                    currentUser={user}
                    teachers={teachers}
                    onSaveTeacher={handleSaveTeacher}
                    schoolConfig={schoolConfig}
                    schedules={schedules}
                    onSaveSchedule={handleSaveSchedule}
                    onDeleteSchedule={handleDeleteSchedule}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Khusus Pegawai &amp; Dewan Guru</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Silakan login ke akun pribadi guru Anda untuk mengelola foto, penugasan, dan mencetak kartu identitas individu.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Guru / Pegawai</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: ABSENSI GURU & TENDIK */}
              {activeTab === 'teacher-attendance' && (
                user ? (
                  <TeacherAttendanceManagement
                    teachers={teachers}
                    records={teacherRecords}
                    leaveRequests={teacherLeaves}
                    schoolConfig={schoolConfig}
                    currentUser={user}
                    onSaveRecord={handleSaveTeacherAttendance}
                    onSaveLeave={handleSaveTeacherLeave}
                    onDeleteRecord={handleDeleteTeacherAttendance}
                    onDeleteLeave={handleDeleteTeacherLeave}
                    onOpenCardPrinter={() => setActiveTab('cards-guru')}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Khusus Pegawai & Dewan Guru</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Portal Absensi Guru & Tendik dapat diakses setelah melakukan login akun pendidik atau administrator.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Guru / Pegawai</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: JADWAL & GURU PIKET */}
              {activeTab === 'guru-piket' && (
                user ? (
                  <GuruPiketManagement
                    jadwalPiket={jadwalPiket}
                    onSaveJadwalPiket={handleSaveJadwalPiket}
                    teachers={teachers}
                    onSaveTeacher={handleSaveTeacher}
                    schoolConfig={schoolConfig}
                    setActiveTab={setActiveTab}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas: Jadwal Guru Piket</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pengaturan dan monitoring penugasan guru piket harian sekolah dapat diakses oleh staf sekolah dan administrator.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Pegawai / Guru</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: LAPORAN REKAP BULANAN (Apel & Pembelajaran KBM Terpisah) */}
              {(activeTab === 'reports' || activeTab === 'reports-apel' || activeTab === 'reports-kbm') && (
                user ? (
                  <Reports
                    students={students}
                    records={records}
                    schoolConfig={schoolConfig}
                    kalenderHeb={kalenderHeb}
                    journals={journals}
                    teachers={teachers}
                    initialReportType={activeTab === 'reports-kbm' ? 'kbm' : 'apel'}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas: Laporan Bulanan</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Laporan rekapitulasi presensi bulanan dan ekspor berkas resmi dapat diakses setelah melakukan login.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Pegawai / Guru</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Tab: KALENDER HEB (Hari Efektif Belajar) */}
              {activeTab === 'heb-calendar' && (
                user ? (
                  <CalendarHeb
                    kalenderHeb={kalenderHeb}
                    onSaveKalender={handleSaveKalenderHeb}
                    schoolConfig={schoolConfig}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Kalender Hari Efektif Belajar</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pengaturan dan monitoring kalender hari efektif belajar sekolah dapat diakses oleh staf sekolah.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Login Pegawai / Guru</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </main>

        {/* Footer (Hidden during Print) */}
        <footer className="print:hidden border-t border-slate-200 bg-white py-6 mt-12 text-slate-500 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="font-extrabold text-slate-800">
                {schoolConfig.namaSekolah} • NPSN {schoolConfig.npsn}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {schoolConfig.alamat} • {schoolConfig.kota}
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sistem Terenkripsi & Terintegrasi
              </span>
              <span>•</span>
              <span>v2.4 Production Edition</span>
            </div>
          </div>
        </footer>

        {/* Settings Modal (Khusus Administrator Sistem) */}
        <SettingsModal
          isOpen={isSettingsOpen && user?.role === 'admin'}
          onClose={() => setIsSettingsOpen(false)}
          config={schoolConfig}
          onSaveConfig={handleSaveConfig}
        />

        {/* Login Modal (Wajib Masukkan Username & Password) */}
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          schoolConfig={schoolConfig}
        />

        {/* Modal Pengajuan Izin / Sakit Mandiri */}
        <LeaveRequestModal
          isOpen={isLeaveRequestOpen}
          onClose={() => {
            setIsLeaveRequestOpen(false);
            setLeaveTargetStudent(null);
          }}
          students={students}
          initialStudent={leaveTargetStudent}
          onSubmit={handleSubmitLeaveRequest}
        />

        {/* Modal Verifikasi Permohonan Izin / Sakit (Piket & Admin) */}
        <LeaveApprovalModal
          isOpen={isLeaveApprovalOpen}
          onClose={() => setIsLeaveApprovalOpen(false)}
          requests={leaveRequests}
          onUpdateStatus={handleUpdateLeaveStatus}
          onDeleteRequest={handleDeleteLeaveRequest}
          onBulkDeleteRequests={handleBulkDeleteLeaveRequests}
          currentUserName={user?.nama || 'Petugas Piket'}
        />

        {/* Modal Input & Kelola Nilai Siswa (Guru & Admin) */}
        <GradeManagementModal
          isOpen={isGradeManagementOpen}
          onClose={() => setIsGradeManagementOpen(false)}
          students={students}
          grades={grades}
          schoolConfig={schoolConfig}
          attendanceRecords={records}
          teachers={teachers}
          onSaveGrade={handleSaveGrade}
          onBulkSaveGrades={handleBulkSaveGrades}
          onDeleteGrade={handleDeleteGrade}
          onBulkDeleteGrades={handleBulkDeleteGrades}
          currentTeacherName={user?.nama}
          defaultMapel={user?.mapel}
        />

        {/* Modal Notifikasi WhatsApp */}
        <WhatsAppNotificationModal
          isOpen={isWhatsAppOpen}
          onClose={() => {
            setIsWhatsAppOpen(false);
            setWhatsAppTargetStudent(null);
          }}
          targetStudent={whatsAppTargetStudent}
          schoolConfig={schoolConfig}
          allStudents={students}
          allTodayRecords={records}
        />

        {/* Modal Agenda Kegiatan Sekolah */}
        <AgendaSekolahModal
          isOpen={isAgendaOpen}
          onClose={() => setIsAgendaOpen(false)}
          canManage={user?.role === 'admin' || user?.role === 'piket' || user?.role === 'guru'}
        />

        {/* Modal Analisis Kehadiran Berbasis AI (Gemini) */}
        <AiAttendanceAnalysisModal
          isOpen={isAiAnalysisOpen}
          onClose={() => setIsAiAnalysisOpen(false)}
          students={students}
          records={records}
          schoolConfig={schoolConfig}
          onOpenWhatsApp={(st) => {
            setWhatsAppTargetStudent(st);
            setIsWhatsAppOpen(true);
          }}
        />

        {/* Modal Cetak Rapor Digital Siswa */}
        {reportCardStudent && (
          <StudentReportCardModal
            isOpen={isReportCardOpen}
            onClose={() => {
              setIsReportCardOpen(false);
              setReportCardStudent(null);
            }}
            student={reportCardStudent}
            grades={grades}
            schoolConfig={schoolConfig}
            attendanceRecords={records}
            teachers={teachers}
          />
        )}

        {/* Mobile Bottom Navigation Bar (Touch-Friendly thumb navigation) */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenLeaveModal={() => {
            if (user && (user.role === 'admin' || user.role === 'piket')) {
              setIsLeaveApprovalOpen(true);
            } else {
              setLeaveTargetStudent(null);
              setIsLeaveRequestOpen(true);
            }
          }}
          pendingLeaveCount={pendingLeaveCount}
        />

      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
