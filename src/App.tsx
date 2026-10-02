/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  SchoolEventItem
} from './types';
import { DatabaseService, DEFAULT_SCHOOL_CONFIG } from './services/db';
import { soundService } from './utils/audio';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { KioskScanner } from './components/KioskScanner';
import { Dashboard } from './components/Dashboard';
import { CardPrinter } from './components/CardPrinter';
import { StudentManagement } from './components/StudentManagement';
import { TeacherManagement } from './components/TeacherManagement';
import { GuruPiketManagement } from './components/GuruPiketManagement';
import { TeachingJournalComponent } from './components/TeachingJournal';
import { Reports } from './components/Reports';
import { PetugasApelAttendance } from './components/PetugasApelAttendance';
import { CalendarHeb } from './components/CalendarHeb';
import { PublicInfo } from './components/PublicInfo';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { RoleSessionBanner } from './components/RoleSessionBanner';
import { PantauAnakDashboard } from './components/pantau-anak/PantauAnakDashboard';
import { LeaveRequestModal } from './components/LeaveRequestModal';
import { LeaveApprovalModal } from './components/LeaveApprovalModal';
import { GradeManagementModal } from './components/GradeManagementModal';
import { WhatsAppNotificationModal } from './components/WhatsAppNotificationModal';
import { AgendaSekolahModal } from './components/AgendaSekolahModal';
import { AiAttendanceAnalysisModal } from './components/AiAttendanceAnalysisModal';
import { StudentReportCardModal } from './components/StudentReportCardModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BellRing, ShieldCheck, LogIn, CalendarDays, Sparkles } from 'lucide-react';

function AppContent() {
  const { user, actingAsPiket, effectiveRole } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('kiosk');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  
  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);
  const [kalenderHeb, setKalenderHeb] = useState<KalenderHeb>({ kalenderData: {} });
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [grades, setGrades] = useState<StudentGradeItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [jadwalPiket, setJadwalPiket] = useState<JadwalPiketHarian[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        setActiveTab('kiosk');
      } else if (currentRole === 'ortu') {
        setActiveTab('pantau-anak');
      } else if (currentRole === 'guru') {
        setActiveTab('journal');
      } else if (currentRole === 'piket') {
        setActiveTab('apel-attendance');
      } else if (currentRole === 'admin') {
        setActiveTab('dashboard');
      }
    }
    prevUserRoleRef.current = currentRole;
  }, [effectiveRole]);

  // Load all initial data from database service
  const loadAllData = useCallback(async () => {
    try {
      const [
        cfg, 
        studentList, 
        recordList, 
        heb, 
        teacherList, 
        journalList,
        gradeList,
        leaveList,
        piketList,
        eventList
      ] = await Promise.all([
        DatabaseService.getSchoolConfig(),
        DatabaseService.getStudents(),
        DatabaseService.getAttendanceRecords(),
        DatabaseService.getKalenderHeb(),
        DatabaseService.getTeachers(),
        DatabaseService.getTeachingJournals(),
        DatabaseService.getStudentGrades(),
        DatabaseService.getLeaveRequests(),
        DatabaseService.getJadwalPiket(),
        DatabaseService.getSchoolEvents(),
      ]);

      setSchoolConfig(cfg);
      setStudents(studentList);
      setRecords(recordList);
      setKalenderHeb(heb);
      setTeachers(teacherList);
      setJournals(journalList);
      setGrades(gradeList);
      setLeaveRequests(leaveList);
      setJadwalPiket(piketList);
      setSchoolEvents(eventList);
    } catch (e) {
      console.error('Error loading data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    // Real-time synchronization across all devices and open tabs
    const unsubStudents = DatabaseService.subscribeStudents((data) => setStudents(data));
    const unsubAttendance = DatabaseService.subscribeAttendance((data) => setRecords(data));
    const unsubGrades = DatabaseService.subscribeGrades((data) => setGrades(data));
    const unsubLeaves = DatabaseService.subscribeLeaveRequests((data) => setLeaveRequests(data));
    const unsubJournals = DatabaseService.subscribeTeachingJournals((data) => setJournals(data));
    const unsubTeachers = DatabaseService.subscribeTeachers((data) => setTeachers(data));
    const unsubConfig = DatabaseService.subscribeSchoolConfig((data) => setSchoolConfig(data));
    const unsubPiket = DatabaseService.subscribeJadwalPiket((data) => setJadwalPiket(data));
    const unsubEvents = DatabaseService.subscribeSchoolEvents((data) => setSchoolEvents(data));

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubGrades();
      unsubLeaves();
      unsubJournals();
      unsubTeachers();
      unsubConfig();
      unsubPiket();
      unsubEvents();
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
        setSessionSwitchToast(`Sesi presensi otomatis dialihkan ke Sesi ${detected}!`);
        setTimeout(() => setSessionSwitchToast(null), 5000);
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
  };

  const handleDeleteRecord = async (id: string) => {
    cancelDebouncedWrite(`attendance_status_${id}`);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    await DatabaseService.deleteAttendanceRecord(id);
  };

  const handleBulkDeleteRecords = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`attendance_status_${id}`));
    const idSet = new Set(ids);
    setRecords((prev) => prev.filter((r) => !idSet.has(r.id)));
    await DatabaseService.bulkDeleteAttendanceRecords(ids);
  };

  const handleBulkSaveAttendance = async (recordsToSave: AttendanceRecord[]) => {
    setRecords((prev) => {
      const map = new Map<string, AttendanceRecord>();
      prev.forEach((r) => map.set(r.id, r));
      recordsToSave.forEach((r) => map.set(r.id, r));
      return Array.from(map.values());
    });
    await DatabaseService.bulkSaveAttendanceRecords(recordsToSave);
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
  };

  const handleDeleteStudent = async (nisn: string) => {
    cancelDebouncedWrite(`student_${nisn}`);
    setStudents((prev) => prev.filter((s) => s.nisn !== nisn));
    await DatabaseService.deleteStudent(nisn);
  };

  const handleBulkDeleteStudents = async (nisns: string[]) => {
    nisns.forEach((n) => cancelDebouncedWrite(`student_${n}`));
    const nisnSet = new Set(nisns);
    setStudents((prev) => prev.filter((s) => !nisnSet.has(s.nisn)));
    await DatabaseService.bulkDeleteStudents(nisns);
  };

  const handleBulkSaveStudents = async (newStudents: Student[]) => {
    await DatabaseService.bulkSaveStudents(newStudents);
    const updated = await DatabaseService.getStudents();
    setStudents(updated);
  };

  // Teacher handlers (Debounced pada penulisan database, State instan)
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
    await debouncedDbWrite(`teacher_${teacher.id}`, async () => {
      await DatabaseService.saveTeacher(teacher);
    }, 400);
  };

  const handleDeleteTeacher = async (id: string) => {
    cancelDebouncedWrite(`teacher_${id}`);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    await DatabaseService.deleteTeacher(id);
  };

  const handleBulkDeleteTeachers = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`teacher_${id}`));
    const idSet = new Set(ids);
    setTeachers((prev) => prev.filter((t) => !idSet.has(t.id)));
    await DatabaseService.bulkDeleteTeachers(ids);
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
  };

  const handleDeleteJournal = async (id: string) => {
    cancelDebouncedWrite(`journal_${id}`);
    setJournals((prev) => prev.filter((j) => j.id !== id));
    await DatabaseService.deleteTeachingJournal(id);
  };

  const handleBulkDeleteJournals = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`journal_${id}`));
    const idSet = new Set(ids);
    setJournals((prev) => prev.filter((j) => !idSet.has(j.id)));
    await DatabaseService.bulkDeleteTeachingJournals(ids);
  };

  // HEB & Config handlers (Debounced pada penulisan database, State instan)
  const handleSaveKalenderHeb = async (heb: KalenderHeb) => {
    setKalenderHeb(heb);
    await debouncedDbWrite('kalender_heb', async () => {
      await DatabaseService.saveKalenderHeb(heb);
    }, 450);
  };

  const handleSaveConfig = async (newConfig: SchoolConfig) => {
    setSchoolConfig(newConfig);
    await debouncedDbWrite('school_config', async () => {
      await DatabaseService.saveSchoolConfig(newConfig);
    }, 450);
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
  };

  const handleDeleteGrade = async (id: string) => {
    cancelDebouncedWrite(`grade_${id}`);
    setGrades((prev) => prev.filter((g) => g.id !== id));
    await DatabaseService.deleteStudentGrade(id);
  };

  const handleBulkDeleteGrades = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`grade_${id}`));
    const idSet = new Set(ids);
    setGrades((prev) => prev.filter((g) => !idSet.has(g.id)));
    await DatabaseService.bulkDeleteStudentGrades(ids);
  };

  // Leave Request Handlers
  const handleSubmitLeaveRequest = async (req: LeaveRequest) => {
    setLeaveRequests((prev) => [req, ...prev]);
    await debouncedDbWrite(`leave_${req.id}`, async () => {
      await DatabaseService.saveLeaveRequest(req);
    }, 400);
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
  };

  const handleDeleteLeaveRequest = async (id: string) => {
    cancelDebouncedWrite(`leave_${id}`);
    setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    await DatabaseService.deleteLeaveRequest(id);
  };

  const handleBulkDeleteLeaveRequests = async (ids: string[]) => {
    ids.forEach((id) => cancelDebouncedWrite(`leave_${id}`));
    const idSet = new Set(ids);
    setLeaveRequests((prev) => prev.filter((r) => !idSet.has(r.id)));
    await DatabaseService.bulkDeleteLeaveRequests(ids);
  };

  const handleSaveJadwalPiket = async (updated: JadwalPiketHarian[]) => {
    setJadwalPiket(updated);
    await debouncedDbWrite('jadwal_piket', async () => {
      await DatabaseService.saveJadwalPiket(updated);
    }, 400);
  };

  const pendingLeaveCount = leaveRequests.filter((r) => r.statusPengajuan === 'Menunggu').length;

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 pb-16 md:pb-0">
      
      {/* 1. SIDEBAR ON THE SIDE (Memindahkan semua menu ke samping sesuai permintaan) */}
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

      {/* 2. MAIN APP CONTENT CONTAINER (Offset for left sidebar on large screens) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        
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
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center text-slate-400">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="font-extrabold text-slate-700 text-sm">Menyiapkan Sistem Presensi Digital...</p>
              <p className="text-xs text-slate-400 mt-1">{schoolConfig.namaSekolah}</p>
            </div>
          ) : (
            <>
              {/* Tab: KIOSK SCANNER */}
              {activeTab === 'kiosk' && (
                <KioskScanner
                  students={students}
                  attendanceRecords={records}
                  onAddRecord={handleAddRecord}
                  schoolConfig={schoolConfig}
                  currentSession={currentSession}
                  onOpenLogin={() => setIsLoginOpen(true)}
                  onOpenLeaveRequest={() => {
                    setLeaveTargetStudent(null);
                    setIsLeaveRequestOpen(true);
                  }}
                  setActiveTab={setActiveTab}
                  jadwalPiket={jadwalPiket}
                />
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
                  currentSession={currentSession}
                  onOpenLogin={() => setIsLoginOpen(true)}
                  onOpenScanner={() => setActiveTab('kiosk')}
                  onOpenPantauAnak={(student) => {
                    setSelectedPantauStudent(student);
                    setActiveTab('pantau-anak');
                  }}
                />
              )}

              {/* Tab: CETAK KARTU (Hanya untuk pengguna login) */}
              {activeTab === 'cards' && (
                user ? (
                  <CardPrinter
                    students={students}
                    schoolConfig={schoolConfig}
                  />
                ) : (
                  <div className="py-20 text-center max-w-lg mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Akses Terbatas: Cetak Kartu Digital</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Pencetakan kartu QR siswa dapat diakses oleh Administrator Sistem dan Petugas Piket Sekolah.
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

              {/* Tab: JURNAL KBM (Khusus Guru & Supervisi Admin) */}
              {activeTab === 'journal' && (
                user ? (
                  <TeachingJournalComponent
                    journals={journals}
                    students={students}
                    schoolConfig={schoolConfig}
                    teachers={teachers}
                    onSaveJournal={handleSaveJournal}
                    onDeleteJournal={handleDeleteJournal}
                    onBulkDeleteJournals={handleBulkDeleteJournals}
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
                    schoolConfig={schoolConfig}
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

              {/* Tab: JADWAL & GURU PIKET */}
              {activeTab === 'guru-piket' && (
                user ? (
                  <GuruPiketManagement
                    jadwalPiket={jadwalPiket}
                    onSaveJadwalPiket={handleSaveJadwalPiket}
                    teachers={teachers}
                    schoolConfig={schoolConfig}
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
          onSaveGrade={handleSaveGrade}
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
      <AppContent />
    </AuthProvider>
  );
}
