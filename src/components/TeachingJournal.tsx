import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  BookOpen, 
  Plus, 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  UserCheck, 
  Award, 
  Trash2, 
  CheckCircle,
  CheckCircle2,
  GraduationCap, 
  ShieldCheck,
  Camera,
  CameraOff,
  QrCode,
  Scan,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  Users,
  CheckCheck,
  X,
  Eye,
  Search,
  RotateCw,
  Printer,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { 
  TeachingJournal, 
  Student, 
  SchoolConfig, 
  TeacherUser, 
  AttendanceRecord, 
  AttendanceStatus,
  ClassScheduleItem,
  DayOfWeek
} from '../types';
import { exportTeachingJournalsExcel } from '../utils/exportExcel';
import { generateTeachingJournalsPdf } from '../utils/exportPdf';
import { useAuth } from '../context/AuthContext';
import { soundService } from '../utils/audio';
import { SchoolLogo } from '../assets/schoolLogo';
import { 
  getTeacherAccessibleClasses, 
  isClassMatch, 
  normalizeClassName,
  getTeacherAssignedSubjects,
  getTeacherClassesForSubject,
  filterJournalsForTeacher,
  isSubjectMatch,
  isSubjectAllowedForTeacher
} from '../utils/teacherFilter';
import { DatabaseService } from '../services/db';
import { useToast } from '../context/ToastContext';
import { TeachingScheduleManager } from './TeachingScheduleManager';
import { WeeklyWorkloadSummary, calculateScheduleJP } from './WeeklyWorkloadSummary';

interface TeachingJournalProps {
  journals: TeachingJournal[];
  students: Student[];
  schoolConfig: SchoolConfig;
  teachers: TeacherUser[];
  schedules?: ClassScheduleItem[];
  records?: AttendanceRecord[];
  leaveRequests?: import('../types').LeaveRequest[];
  onSaveJournal: (journal: TeachingJournal, classAttendanceRecords?: AttendanceRecord[]) => Promise<void>;
  onDeleteJournal: (id: string) => Promise<void>;
  onBulkDeleteJournals?: (ids: string[]) => Promise<void>;
  onSaveSchedule?: (schedule: ClassScheduleItem) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
  onBulkDeleteSchedules?: (ids: string[]) => Promise<void>;
  onResetSchedules?: () => Promise<void>;
}

export const TeachingJournalComponent: React.FC<TeachingJournalProps> = ({
  journals,
  students,
  schoolConfig,
  teachers,
  schedules = [],
  records = [],
  leaveRequests = [],
  onSaveJournal,
  onDeleteJournal,
  onBulkDeleteJournals,
  onSaveSchedule,
  onDeleteSchedule,
  onBulkDeleteSchedules,
  onResetSchedules,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<'jurnal' | 'ringkasan' | 'jadwal' | 'kelola-jadwal'>('jurnal');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Semua');
  const [onlyMyJournals, setOnlyMyJournals] = useState<boolean>(user?.role === 'guru');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewDetailJournal, setViewDetailJournal] = useState<TeachingJournal | null>(null);
  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const [formTanggal, setFormTanggal] = useState(today);
  const [formGuruId, setFormGuruId] = useState(user?.role === 'guru' ? user.id : teachers[0]?.id || 'T1');
  const [formKelas, setFormKelas] = useState('7A');
  const [formMapel, setFormMapel] = useState(user?.mapel || 'Ilmu Pengetahuan Alam (IPA)');
  const [formPertemuanKe, setFormPertemuanKe] = useState<number>(1);
  const [formJamPelajaran, setFormJamPelajaran] = useState('1 - 2 (07.30 - 08.50)');
  const [formMateriPokok, setFormMateriPokok] = useState('');
  const [formKegiatan, setFormKegiatan] = useState('');
  const [formRefleksi, setFormRefleksi] = useState('');

  // Class student attendance inside journal
  const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [scannedViaQrNisns, setScannedViaQrNisns] = useState<Set<string>>(new Set());

  // In-Class QR Scanner State
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState<boolean>(false);
  const [manualScanInput, setManualScanInput] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(soundService.isSoundMuted());
  const [lastScannedResult, setLastScannedResult] = useState<{
    student: Student;
    time: string;
    status: AttendanceStatus;
  } | null>(null);
  const [scanAlert, setScanAlert] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const journalTransitionLockRef = useRef<Promise<void> | null>(null);
  const lastScannedThrottleRef = useRef<{ [nisn: string]: number }>({});

  const safeStopScanner = async (scanner: Html5Qrcode | null): Promise<void> => {
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // quiet catch transition error
    }
    try {
      scanner.clear();
    } catch {
      // quiet catch clear error
    }
  };

  const classesList = Array.from(new Set(students.map((s) => s.kelas))).sort();
  const teacherAccessibleClasses = user?.role === 'guru' ? getTeacherAccessibleClasses(user) : [];
  const displayClasses = teacherAccessibleClasses.length > 0 ? teacherAccessibleClasses : classesList;

  // Class students for selected formKelas
  const currentClassStudents = students.filter((s) => s.kelas === formKelas);

  // Helper to determine initial student attendance status for a given date
  const getInitialStatusForStudent = (nisn: string, date: string): { status: AttendanceStatus; isVerifiedLeave: boolean; leaveReason?: string } => {
    // 1. Check if there's an approved leave request on this date
    if (leaveRequests && leaveRequests.length > 0) {
      const activeLeave = leaveRequests.find((l) => {
        if (l.nisn !== nisn || l.statusPengajuan !== 'Disetujui') return false;
        const start = l.tanggalMulai;
        const end = l.tanggalSelesai || start;
        return date >= start && date <= end;
      });
      if (activeLeave) {
        return {
          status: activeLeave.jenis === 'Sakit' ? 'Sakit' : 'Izin',
          isVerifiedLeave: true,
          leaveReason: `[${activeLeave.jenis} Disetujui] ${activeLeave.alasan}`,
        };
      }
    }

    // 2. Check if there's an attendance record on this date marked as Izin or Sakit
    if (records && records.length > 0) {
      const rec = records.find((r) => r.nisn === nisn && r.tanggal === date && (r.status === 'Izin' || r.status === 'Sakit'));
      if (rec) {
        return {
          status: rec.status,
          isVerifiedLeave: true,
          leaveReason: rec.catatan || `Tercatat ${rec.status} pada presensi harian`,
        };
      }
    }

    // 3. Default to Alpa until scanned or manually verified
    return {
      status: 'Alpa',
      isVerifiedLeave: false,
    };
  };

  // Active selected teacher in form
  const activeTeacher = user?.role === 'guru'
    ? { id: user.id, nama: user.nama, mapel: user.mapel, penugasanMapel: user.penugasanMapel, isGuruMapel: user.isGuruMapel }
    : (teachers.find((t) => t.id === formGuruId) || null);

  const teacherAssignments = activeTeacher?.penugasanMapel && activeTeacher.penugasanMapel.length > 0
    ? activeTeacher.penugasanMapel
    : [{ id: 'asgn_def', mapel: activeTeacher?.mapel || formMapel, kelas: classesList, bebanJam: 4 }];

  const assignedSubjects = useMemo(() => {
    if (user?.role === 'guru') {
      const subs = getTeacherAssignedSubjects(user);
      return subs.length > 0 ? subs : [user.mapel || 'Pendidikan Pancasila & PKN'];
    }
    return Array.from(new Set(teacherAssignments.map((a) => a.mapel)));
  }, [user, teacherAssignments]);

  const availableMapelList = assignedSubjects;
  const currentAssignment = teacherAssignments.find((a) => isSubjectMatch(a.mapel, formMapel)) || teacherAssignments[0];
  const availableClassesForMapel = useMemo(() => {
    if (user?.role === 'guru') {
      const classesForMapel = getTeacherClassesForSubject(user, formMapel);
      return classesForMapel.length > 0 ? classesForMapel : displayClasses;
    }
    return currentAssignment?.kelas && currentAssignment.kelas.length > 0
      ? currentAssignment.kelas
      : classesList;
  }, [user, formMapel, displayClasses, currentAssignment, classesList]);

  // Change teacher in form
  const handleTeacherChange = (teacherId: string) => {
    setFormGuruId(teacherId);
    const tObj = teachers.find((t) => t.id === teacherId);
    if (tObj?.penugasanMapel && tObj.penugasanMapel.length > 0) {
      const firstAsgn = tObj.penugasanMapel[0];
      setFormMapel(firstAsgn.mapel);
      if (firstAsgn.kelas.length > 0) {
        handleClassChange(firstAsgn.kelas[0]);
      }
    } else if (tObj?.mapel) {
      setFormMapel(tObj.mapel);
    }
  };

  // Change mapel in form
  const handleMapelChange = (newMapel: string) => {
    setFormMapel(newMapel);
    const asgn = teacherAssignments.find((a) => a.mapel === newMapel);
    if (asgn && asgn.kelas.length > 0 && !asgn.kelas.includes(formKelas)) {
      handleClassChange(asgn.kelas[0]);
    }
  };

  // Change class in form
  const handleClassChange = (newKelas: string, targetDate = formTanggal) => {
    setFormKelas(newKelas);
    const newStudents = students.filter((s) => s.kelas === newKelas);
    const newMap: Record<string, AttendanceStatus> = {};
    newStudents.forEach((s) => {
      const init = getInitialStatusForStudent(s.nisn, targetDate);
      newMap[s.nisn] = init.status;
    });
    setStudentStatuses(newMap);
    setScannedViaQrNisns(new Set());
    setLastScannedResult(null);
    setScanAlert(null);
  };

  // Change date in form
  const handleDateChange = (newDate: string) => {
    setFormTanggal(newDate);
    const targetStudents = students.filter((s) => s.kelas === formKelas);
    setStudentStatuses((prev) => {
      const updated: Record<string, AttendanceStatus> = {};
      targetStudents.forEach((s) => {
        const init = getInitialStatusForStudent(s.nisn, newDate);
        if (init.isVerifiedLeave) {
          updated[s.nisn] = init.status;
        } else if (prev[s.nisn] === 'Izin' || prev[s.nisn] === 'Sakit') {
          // If previously Izin/Sakit only due to old date, re-evaluate
          updated[s.nisn] = init.status;
        } else {
          updated[s.nisn] = prev[s.nisn] || 'Alpa';
        }
      });
      return updated;
    });
  };

  // Determine current day of week in Indonesian
  const dayNameToday: DayOfWeek = useMemo(() => {
    const days: DayOfWeek[] = ['Sabtu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const idx = new Date().getDay();
    return idx === 0 ? 'Senin' : days[idx];
  }, []);

  // Today's teaching schedule for active user
  const todaySchedules = useMemo(() => {
    const todayList = schedules.filter((s) => s.hari === dayNameToday);
    if (user?.role === 'guru') {
      return todayList.filter((s) => 
        (user.nama && s.guruNama.toLowerCase().includes(user.nama.toLowerCase())) ||
        (s.guruId && s.guruId === user.id)
      ).sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
    }
    return todayList.sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  }, [schedules, dayNameToday, user]);

  // Weekly Workload Quick Stats for Active Teacher / All Teachers
  const weeklyWorkloadQuickStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const startStr = monday.toISOString().split('T')[0];
    
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const endStr = saturday.toISOString().split('T')[0];

    const mySchedules = schedules.filter((s) => {
      if (user?.role === 'guru') {
        return (user.nama && s.guruNama.toLowerCase().includes(user.nama.toLowerCase())) ||
               (s.guruId && s.guruId === user.id);
      }
      return true;
    });

    const myJournalsThisWeek = journals.filter((j) => {
      if (j.tanggal < startStr || j.tanggal > endStr) return false;
      if (user?.role === 'guru') {
        return (user.nama && j.guruNama.toLowerCase().includes(user.nama.toLowerCase())) ||
               (j.guruId && j.guruId === user.id);
      }
      return true;
    });

    const scheduledJP = mySchedules.reduce((acc, s) => acc + calculateScheduleJP(s), 0);
    const realizedJP = myJournalsThisWeek.reduce((acc, j) => {
      const match = mySchedules.find((s) => isClassMatch(s.kelas, j.kelas));
      return acc + (match ? calculateScheduleJP(match) : 2);
    }, 0);

    const percent = scheduledJP > 0 ? Math.round((realizedJP / scheduledJP) * 100) : 0;

    return {
      scheduledJP,
      realizedJP,
      journalsCount: myJournalsThisWeek.length,
      schedulesCount: mySchedules.length,
      percent,
      isTargetMet: realizedJP >= 24
    };
  }, [schedules, journals, user]);

  const handleStatusChange = (nisn: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [nisn]: status,
    }));
  };

  // Quick Start Journal from Schedule slot
  const handleStartJournalFromSchedule = (sch: ClassScheduleItem) => {
    setFormTanggal(today);
    setFormKelas(sch.kelas);
    setFormMapel(sch.mapel);
    if (sch.guruId) {
      setFormGuruId(sch.guruId);
    }
    const jamLabel = sch.jamKe ? `${sch.jamKe} (${sch.jamMulai} - ${sch.jamSelesai})` : `${sch.jamMulai} - ${sch.jamSelesai}`;
    setFormJamPelajaran(jamLabel);

    // Auto-calculate next pertemuanKe
    const pastJournals = journals.filter((j) => 
      isClassMatch(j.kelas, sch.kelas) && 
      j.mapel.toLowerCase() === sch.mapel.toLowerCase()
    );
    const maxPertemuan = pastJournals.reduce((max, j) => Math.max(max, j.pertemuanKe || 1), 0);
    setFormPertemuanKe(maxPertemuan > 0 ? maxPertemuan + 1 : 1);

    const targetStudents = students.filter((s) => s.kelas === sch.kelas);
    const initialMap: Record<string, AttendanceStatus> = {};
    targetStudents.forEach((s) => {
      const init = getInitialStatusForStudent(s.nisn, today);
      initialMap[s.nisn] = init.status;
    });
    setStudentStatuses(initialMap);
    setScannedViaQrNisns(new Set());
    setLastScannedResult(null);
    setScanAlert(null);
    setMainTab('jurnal');
    setIsModalOpen(true);
  };

  // Open Add Journal Modal
  const handleOpenAdd = () => {
    let targetClass = formKelas;
    if (user?.role === 'guru') {
      setFormGuruId(user.id);
      const myTeacher = teachers.find((t) => t.id === user.id);
      const myAssignments = user.penugasanMapel && user.penugasanMapel.length > 0
        ? user.penugasanMapel
        : myTeacher?.penugasanMapel;

      if (myAssignments && myAssignments.length > 0) {
        const firstAsgn = myAssignments[0];
        setFormMapel(firstAsgn.mapel);
        if (firstAsgn.kelas.length > 0) {
          targetClass = firstAsgn.kelas[0];
          setFormKelas(firstAsgn.kelas[0]);
        }
      } else if (user.mapel) {
        setFormMapel(user.mapel);
        if (user.waliKelas) {
          targetClass = user.waliKelas;
          setFormKelas(user.waliKelas);
        }
      }
    } else {
      const firstT = teachers[0];
      if (firstT?.penugasanMapel && firstT.penugasanMapel.length > 0) {
        setFormMapel(firstT.penugasanMapel[0].mapel);
        if (firstT.penugasanMapel[0].kelas.length > 0) {
          targetClass = firstT.penugasanMapel[0].kelas[0];
          setFormKelas(firstT.penugasanMapel[0].kelas[0]);
        }
      }
    }

    const targetStudents = students.filter((s) => s.kelas === targetClass);

    // Initial map: check verified leaves from leave requests / records
    const initialMap: Record<string, AttendanceStatus> = {};
    targetStudents.forEach((s) => {
      const init = getInitialStatusForStudent(s.nisn, formTanggal);
      initialMap[s.nisn] = init.status;
    });
    setStudentStatuses(initialMap);
    setScannedViaQrNisns(new Set());
    setLastScannedResult(null);
    setScanAlert(null);
    setIsModalOpen(true);
  };

  // ==========================================
  // IN-CLASS QR SCANNER IMPLEMENTATION
  // ==========================================

  // Stop scanner when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isModalOpen]);

  const stopScanner = async () => {
    setIsScannerActive(false);
    if (journalTransitionLockRef.current) {
      try {
        await journalTransitionLockRef.current;
      } catch {
        // ignore
      }
    }
    if (scannerRef.current) {
      const inst = scannerRef.current;
      scannerRef.current = null;
      await safeStopScanner(inst);
    }
  };

  const startScanner = async (cameraId?: string) => {
    if (journalTransitionLockRef.current) {
      try {
        await journalTransitionLockRef.current;
      } catch {
        // ignore
      }
    }

    setCameraPermissionDenied(false);

    let targetCamId = cameraId || selectedCameraId;

    // Check permission / cameras if not queried yet
    if (!targetCamId) {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          // Fallback to basic video constraint (essential on laptops / desktops)
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
            fallbackStream.getTracks().forEach((t) => t.stop());
          } catch {
            setCameraPermissionDenied(true);
            setIsScannerActive(true);
            return;
          }
        }
      }

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('rear')
          );
          targetCamId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(targetCamId);
        }
      } catch {
        // Enumerate devices not permitted or empty
      }
    }

    // Stop existing instance safely
    if (scannerRef.current) {
      const prev = scannerRef.current;
      scannerRef.current = null;
      await safeStopScanner(prev);
    }

    const qrBoxId = 'qr-reader-in-class';
    const transitionPromise = (async () => {
      let activeScanner: Html5Qrcode | null = null;
      try {
        activeScanner = new Html5Qrcode(qrBoxId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
          ],
          verbose: false,
        });

        scannerRef.current = activeScanner;

        const config = {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        const cameraParam = targetCamId || { facingMode: { ideal: 'environment' } };

        try {
          await activeScanner.start(
            cameraParam,
            config,
            (decodedText) => {
              handleProcessInClassQr(decodedText);
            },
            () => {}
          );
          setIsScannerActive(true);
          setCameraPermissionDenied(false);
        } catch (firstErr) {
          console.warn('First in-class scanner start failed, trying fresh instance fallback:', firstErr);
          await safeStopScanner(activeScanner);
          activeScanner = null;
          scannerRef.current = null;

          // Fresh instance for user-facing fallback
          const fallbackScanner = new Html5Qrcode(qrBoxId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
            ],
            verbose: false,
          });
          scannerRef.current = fallbackScanner;
          activeScanner = fallbackScanner;

          await fallbackScanner.start(
            { facingMode: 'user' },
            config,
            (decodedText) => {
              handleProcessInClassQr(decodedText);
            },
            () => {}
          );
          setIsScannerActive(true);
          setCameraPermissionDenied(false);
        }
      } catch {
        if (activeScanner) {
          await safeStopScanner(activeScanner);
          if (scannerRef.current === activeScanner) {
            scannerRef.current = null;
          }
        }
        setCameraPermissionDenied(true);
        setIsScannerActive(true);
      }
    })();

    journalTransitionLockRef.current = transitionPromise;
    await transitionPromise;
    if (journalTransitionLockRef.current === transitionPromise) {
      journalTransitionLockRef.current = null;
    }
  };

  const handleToggleScanner = () => {
    if (isScannerActive) {
      stopScanner();
    } else {
      setTimeout(() => {
        startScanner();
      }, 100);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    if (isScannerActive) {
      startScanner(newId);
    }
  };

  // Process In-Class Scanned Code
  const handleProcessInClassQr = (rawText: string) => {
    const cleanText = rawText.trim();
    if (!cleanText) return;

    const now = Date.now();
    const lastScanTime = lastScannedThrottleRef.current[cleanText] || 0;
    if (now - lastScanTime < 2500) {
      return; // prevent rapid repeat trigger
    }
    lastScannedThrottleRef.current[cleanText] = now;

    // Search student by NISN or stripped numeric
    const student = students.find((s) => s.nisn === cleanText || s.nisn === cleanText.replace(/[^0-9]/g, ''));

    if (!student) {
      soundService.playWarning();
      setScanAlert({
        type: 'warning',
        message: `Kode QR "${cleanText}" tidak ditemukan di database siswa.`,
      });
      return;
    }

    // Verify if student belongs to the CURRENT CLASS being taught
    if (student.kelas !== formKelas) {
      soundService.playWarning();
      setScanAlert({
        type: 'warning',
        message: `PERINGATAN: Siswa ${student.nama} adalah rombel Kelas ${student.kelas}, BUKAN Kelas ${formKelas}!`,
      });
      return;
    }

    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Mark as Hadir
    setStudentStatuses((prev) => ({
      ...prev,
      [student.nisn]: 'Hadir',
    }));

    setScannedViaQrNisns((prev) => {
      const next = new Set(prev);
      next.add(student.nisn);
      return next;
    });

    soundService.playSuccess();
    soundService.speakStudentName(student.nama);

    setLastScannedResult({
      student,
      time: nowTimeStr,
      status: 'Hadir',
    });

    setScanAlert({
      type: 'success',
      message: `Presensi Berhasil: ${student.nama} (${student.nisn}) tercatat HADIR di KBM ${formMapel}.`,
    });
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanInput.trim()) return;
    handleProcessInClassQr(manualScanInput.trim());
    setManualScanInput('');
  };

  // Quick Action Buttons
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    currentClassStudents.forEach((s) => {
      const init = getInitialStatusForStudent(s.nisn, formTanggal);
      if (init.isVerifiedLeave) {
        updated[s.nisn] = init.status; // Pertahankan status Izin/Sakit yang sudah disetujui
      } else {
        updated[s.nisn] = 'Hadir';
      }
    });
    setStudentStatuses(updated);
    soundService.playSuccess();
    setScanAlert({
      type: 'info',
      message: `Seluruh siswa Kelas ${formKelas} (${currentClassStudents.length} siswa) ditandai Hadir (siswa izin/sakit terverifikasi tetap dipertahankan).`,
    });
  };

  const handleSetUnscannedToAbsent = () => {
    setStudentStatuses((prev) => {
      const copy = { ...prev };
      currentClassStudents.forEach((s) => {
        const init = getInitialStatusForStudent(s.nisn, formTanggal);
        if (init.isVerifiedLeave) {
          copy[s.nisn] = init.status;
        } else if (!copy[s.nisn] || copy[s.nisn] === 'Alpa') {
          copy[s.nisn] = 'Alpa';
        }
      });
      return copy;
    });
    setScanAlert({
      type: 'info',
      message: `Siswa yang belum melakukan scan presensi disetel sebagai Alpa.`,
    });
  };

  const handleSubmitJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMateriPokok.trim()) return;

    const teacher = teachers.find((t) => t.id === formGuruId) || {
      nama: user?.nama || 'Guru Pengajar',
      nip: schoolConfig.nipPetugasPiket,
    };

    const studentList = currentClassStudents;
    const totalSiswa = studentList.length;
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    studentList.forEach((s) => {
      const st = studentStatuses[s.nisn] || 'Alpa';
      if (st === 'Hadir') hadir++;
      else if (st === 'Terlambat') terlambat++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else alpa++;
    });

    const totalMasuk = hadir + terlambat;
    const persentase = totalSiswa > 0 ? Math.round((totalMasuk / totalSiswa) * 100) : 0;

    const newJournal: TeachingJournal = {
      id: `JRNL_${Date.now()}`,
      guruId: formGuruId,
      guruNama: teacher.nama,
      guruNip: teacher.nip,
      kelas: formKelas,
      mapel: formMapel,
      tanggal: formTanggal,
      pertemuanKe: formPertemuanKe,
      jamPelajaran: formJamPelajaran,
      materiPokok: formMateriPokok.trim(),
      kegiatanPembelajaran: formKegiatan.trim() || undefined,
      catatanRefleksi: formRefleksi.trim() || undefined,
      totalSiswa,
      hadir,
      terlambat,
      izin,
      sakit,
      alpa,
      persentaseKehadiran: persentase,
      studentAttendances: studentStatuses,
      createdAt: new Date().toISOString(),
    };

    // Synchronize attendance records with main database
    const classRecords: AttendanceRecord[] = studentList.map((s) => ({
      id: `PRESENSI_KBM_${s.nisn}_${formTanggal}_${formMapel.replace(/\s+/g, '_')}_P${formPertemuanKe}`,
      tanggal: formTanggal,
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      nisn: s.nisn,
      nama: s.nama,
      kelas: s.kelas,
      sesi: 'Pagi',
      status: studentStatuses[s.nisn] || 'Alpa',
      kategori: 'KELAS',
      mapel: formMapel,
      pertemuanKe: formPertemuanKe,
      materiPokok: formMateriPokok.trim(),
      catatan: `KBM ${formMapel} Pertemuan Ke-${formPertemuanKe}`,
    }));

    stopScanner();
    await onSaveJournal(newJournal, classRecords);
    setIsModalOpen(false);
  };

  // Filter journals strictly for teacher
  const teacherScopedJournals = useMemo(() => {
    return filterJournalsForTeacher(journals, user);
  }, [journals, user]);

  const filteredJournals = useMemo(() => {
    return teacherScopedJournals.filter((j) => {
      if (onlyMyJournals && user?.role === 'guru') {
        if (j.guruId !== user.id && j.guruNama !== user.nama) return false;
      }
      if (selectedClassFilter !== 'Semua' && !isClassMatch(j.kelas, selectedClassFilter)) {
        return false;
      }
      return true;
    });
  }, [teacherScopedJournals, onlyMyJournals, user, selectedClassFilter]);

  const handleBulkDelete = async () => {
    if (selectedJournalIds.length === 0) return;
    const count = selectedJournalIds.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} CATATAN JURNAL MENGAJAR TERPILIH?\n\nCatatan agenda dan absensi KBM terpilih akan benar-benar dihapus dari database (Firestore & Penyimpanan Lokal). Tindakan ini permanen.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      if (onBulkDeleteJournals) {
        await onBulkDeleteJournals(selectedJournalIds);
      } else {
        await DatabaseService.bulkDeleteTeachingJournals(selectedJournalIds);
      }
      setSelectedJournalIds([]);
    } catch (err) {
      console.error('Failed to bulk delete journals', err);
      alert('Gagal menghapus jurnal mengajar. Silakan coba lagi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Calculate live counters in form modal
  const countHadir = currentClassStudents.filter((s) => studentStatuses[s.nisn] === 'Hadir').length;
  const countTerlambat = currentClassStudents.filter((s) => studentStatuses[s.nisn] === 'Terlambat').length;
  const countIzin = currentClassStudents.filter((s) => studentStatuses[s.nisn] === 'Izin').length;
  const countSakit = currentClassStudents.filter((s) => studentStatuses[s.nisn] === 'Sakit').length;
  const countAlpa = currentClassStudents.filter((s) => !studentStatuses[s.nisn] || studentStatuses[s.nisn] === 'Alpa').length;
  const currentAttendancePercent = currentClassStudents.length > 0 
    ? Math.round(((countHadir + countTerlambat) / currentClassStudents.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Role Notice Banner */}
      {user?.role === 'guru' ? (
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-white p-5 rounded-3xl border border-indigo-200 shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Ruang Pembelajaran Guru: {user.nama}
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Mata Pelajaran: <strong>{user.mapel || 'Guru Pengajar'}</strong> {user.waliKelas ? `• Wali Kelas ${user.waliKelas}` : ''}
                </p>
              </div>
            </div>

            {/* Quick Workload Status Badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMainTab('ringkasan')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-300 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
                title="Buka Ringkasan Beban Kerja Mingguan"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Beban Kerja Pekan Ini:</span>
                <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {weeklyWorkloadQuickStats.realizedJP} / {weeklyWorkloadQuickStats.scheduledJP} JP
                </span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  weeklyWorkloadQuickStats.percent >= 100 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {weeklyWorkloadQuickStats.percent}%
                </span>
              </button>

              <button
                onClick={() => setOnlyMyJournals(!onlyMyJournals)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  onlyMyJournals 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {onlyMyJournals ? 'Jurnal Saya' : 'Semua Jurnal'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 p-4 rounded-3xl border border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
              <div>
                <div className="text-xs font-black text-blue-900">
                  Supervisi Akademik & KBM (Administrator)
                </div>
                <p className="text-blue-700 text-[11px] mt-0.5 font-medium">
                  Sebagai Administrator, Anda dapat memantau keterlaksanaan KBM seluruh guru, memvalidasi pemenuhan target beban kerja mingguan, serta mengunduh rekap jurnal.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMainTab('ringkasan')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Audit Beban Guru</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs: Jurnal vs Ringkasan Beban vs Jadwal Mengajar vs Kelola Jadwal */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMainTab('jurnal')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            mainTab === 'jurnal'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Agenda & Jurnal Mengajar</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            mainTab === 'jurnal' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
          }`}>
            {journals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('ringkasan')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            mainTab === 'ringkasan'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Ringkasan Beban Mengajar (JP)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            mainTab === 'ringkasan'
              ? 'bg-emerald-100 text-emerald-800'
              : weeklyWorkloadQuickStats.realizedJP > 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {weeklyWorkloadQuickStats.realizedJP}/{weeklyWorkloadQuickStats.scheduledJP} JP
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('jadwal')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            mainTab === 'jadwal'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal Mengajar Harian & Mingguan</span>
          {todaySchedules.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              mainTab === 'jadwal' ? 'bg-indigo-100 text-indigo-800 animate-pulse' : 'bg-amber-100 text-amber-800'
            }`}>
              {todaySchedules.length} Hari Ini
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('kelola-jadwal')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            mainTab === 'kelola-jadwal'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Kelola Jadwal Pelajaran</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            mainTab === 'kelola-jadwal' ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-700'
          }`}>
            {schedules.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: AGENDA & JURNAL MENGAJAR                          */}
      {/* ======================================================== */}
      {mainTab === 'jurnal' && (
        <div className="space-y-6 animate-in fade-in duration-150">

          {/* Today's Teaching Schedule Strip / Widget */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-indigo-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-amber-400 font-black border border-white/10">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Jadwal Mengajar Hari Ini</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                      Hari {dayNameToday}
                    </span>
                  </h3>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {user?.role === 'guru' ? (
                      <span>Jadwal kelas KBM yang diampu oleh <strong>{user.nama}</strong></span>
                    ) : (
                      <span>Seluruh agenda KBM mata pelajaran aktif hari ini ({todaySchedules.length} sesi)</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMainTab('jadwal')}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                <span>Lihat Jadwal Mingguan Lengkap</span>
              </button>
            </div>

            {/* Timetable Slots for Today */}
            <div className="mt-4">
              {todaySchedules.length === 0 ? (
                <div className="py-6 text-center text-slate-300 text-xs bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-semibold">Tidak ada jadwal KBM yang terdaftar untuk hari {dayNameToday}.</p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Gunakan tab <strong>"Kelola Jadwal Pelajaran"</strong> untuk menambahkan jadwal mata pelajaran per kelas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {todaySchedules.map((sch: ClassScheduleItem) => (
                    <div
                      key={sch.id}
                      className="bg-white/10 hover:bg-white/15 backdrop-blur-xs rounded-2xl p-4 border border-white/15 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/30 text-blue-200 font-black text-xs border border-blue-400/20">
                            Kelas {sch.kelas}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {sch.jamMulai} - {sch.jamSelesai}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white mt-2 line-clamp-1 group-hover:text-amber-200 transition-colors">
                          {sch.mapel}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300">
                          {sch.ruang && <span>📍 {sch.ruang}</span>}
                          {user?.role !== 'guru' && <span className="truncate">👨‍🏫 {sch.guruNama}</span>}
                          {sch.jamKe && <span className="text-slate-400 font-mono">({sch.jamKe})</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartJournalFromSchedule(sch)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mulai KBM & Isi Jurnal</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Header and Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>Jurnal & Agenda Mengajar Guru (KBM)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {schoolConfig.namaSekolah} • Pencatatan materi pelajaran, refleksi KBM per tatap muka, dan absensi QR interaktif saat jam tatap muka.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Export Excel */}
              <button
                onClick={() => {
                  exportTeachingJournalsExcel(filteredJournals, schoolConfig);
                  toast.success('Ekspor Excel Selesai', 'File spreadsheet jurnal mengajar berhasil diunduh.');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                title="Unduh format spreadsheet Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>

              {/* Export PDF */}
              <button
                onClick={() => {
                  generateTeachingJournalsPdf(
                    filteredJournals, 
                    schoolConfig, 
                    user?.role === 'guru' ? user.nama : 'Semua', 
                    selectedClassFilter
                  );
                  toast.success('Dokumen PDF Disiapkan', 'Berkas jurnal KBM guru siap dicetak.');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                title="Cetak Jurnal KBM Guru Resmi ke Dokumen PDF"
              >
                <Printer className="w-4 h-4 text-rose-600" />
                <span>Cetak PDF</span>
              </button>

              {/* Add Journal Button */}
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm shadow-blue-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jurnal & Scan Presensi</span>
              </button>
            </div>
          </div>

      {/* Class filter tags */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedClassFilter('Semua')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
            selectedClassFilter === 'Semua'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Semua Kelas ({journals.length})
        </button>
        {displayClasses.map((c) => {
          const count = journals.filter((j) => isClassMatch(j.kelas, c)).length;
          return (
            <button
              key={c}
              onClick={() => setSelectedClassFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                selectedClassFilter === c
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Kelas {c} ({count})
            </button>
          );
        })}
      </div>

      {/* Bulk Delete Floating/Action Bar */}
      {selectedJournalIds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
            <span>
              <strong>{selectedJournalIds.length}</strong> catatan jurnal dipilih untuk tindakan massal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedJournalIds([])}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
            >
              Batalkan Pilihan
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isBulkDeleting ? 'Menghapus dari Database...' : `Hapus (${selectedJournalIds.length}) Jurnal Terpilih`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Select All Toggle for Journals */}
      {filteredJournals.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedJournalIds.length === filteredJournals.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedJournalIds(filteredJournals.map((j) => j.id));
                } else {
                  setSelectedJournalIds([]);
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>Pilih Semua Jurnal ({filteredJournals.length})</span>
          </label>
        </div>
      )}

      {/* Journal Cards Feed */}
      <div className="space-y-4">
        {filteredJournals.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-sm text-slate-600">Belum ada catatan jurnal mengajar.</p>
            <p className="text-xs text-slate-400 mt-1">Klik "Buat Jurnal & Scan Presensi" untuk mencatat kegiatan tatap muka KBM.</p>
          </div>
        ) : (
          filteredJournals.map((j) => {
            const isSelected = selectedJournalIds.includes(j.id);
            const canDeleteCard = user?.role === 'admin' || j.guruId === user?.id;

            return (
              <div
                key={j.id}
                className={`bg-white rounded-3xl p-6 border shadow-xs transition-all space-y-4 ${
                  isSelected ? 'border-rose-400 ring-2 ring-rose-300/40 bg-rose-50/20' : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Top Meta Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {canDeleteCard && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedJournalIds((prev) => [...prev, j.id]);
                          } else {
                            setSelectedJournalIds((prev) => prev.filter((id) => id !== j.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer mr-1"
                        title="Pilih jurnal ini"
                      />
                    )}
                    <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 font-black text-xs border border-blue-200">
                      Kelas {j.kelas}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 font-extrabold text-xs">
                      {j.mapel}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                      Pertemuan Ke-{j.pertemuanKe}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {j.tanggal}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {j.jamPelajaran}
                    </span>
                    {canDeleteCard && (
                      <button
                        onClick={() => onDeleteJournal(j.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Jurnal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              {/* Lesson Core Information */}
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Materi Pokok / Bahasan
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {j.materiPokok}
                  </h4>
                </div>

                {j.kegiatanPembelajaran && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Kegiatan & Metode Pembelajaran
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {j.kegiatanPembelajaran}
                    </p>
                  </div>
                )}

                {j.catatanRefleksi && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Refleksi & Catatan Guru
                    </span>
                    <p className="text-xs text-slate-500 italic mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{j.catatanRefleksi}"
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Attendance KPI Summary & View Details */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {j.guruNama.charAt(0)}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 block text-xs">
                      {j.guruNama}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      NUPTK: {j.guruNip || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-700">
                      Hadir: <strong className="text-emerald-700 font-black">{j.hadir + j.terlambat}</strong> / {j.totalSiswa}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      ({j.persentaseKehadiran}%)
                    </span>
                  </div>

                  <button
                    onClick={() => setViewDetailJournal(j)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail Presensi Siswa</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RINGKASAN BEBAN KERJA MENGAJAR MINGGUAN (JP)      */}
      {/* ======================================================== */}
      {mainTab === 'ringkasan' && (
        <div className="animate-in fade-in duration-150">
          <WeeklyWorkloadSummary
            journals={journals}
            schedules={schedules}
            teachers={teachers}
            schoolConfig={schoolConfig}
            students={students}
            onStartJournalFromSchedule={handleStartJournalFromSchedule}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: JADWAL MENGAJAR HARIAN & MINGGUAN (TIMELINE/GRID)  */}
      {/* ======================================================== */}
      {mainTab === 'jadwal' && (
        <div className="animate-in fade-in duration-150">
          <TeachingScheduleManager
            schedules={schedules}
            teachers={teachers}
            schoolConfig={schoolConfig}
            availableClasses={classesList}
            onSaveSchedule={onSaveSchedule || (async () => {})}
            onDeleteSchedule={onDeleteSchedule || (async () => {})}
            onBulkDeleteSchedules={onBulkDeleteSchedules}
            onResetSchedules={onResetSchedules}
            onStartJournalFromSchedule={handleStartJournalFromSchedule}
            defaultViewMode="timeline"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: KELOLA JADWAL PELAJARAN (ADMIN & GURU)            */}
      {/* ======================================================== */}
      {mainTab === 'kelola-jadwal' && (
        <div className="animate-in fade-in duration-150">
          <TeachingScheduleManager
            schedules={schedules}
            teachers={teachers}
            schoolConfig={schoolConfig}
            availableClasses={classesList}
            onSaveSchedule={onSaveSchedule || (async () => {})}
            onDeleteSchedule={onDeleteSchedule || (async () => {})}
            onBulkDeleteSchedules={onBulkDeleteSchedules}
            onResetSchedules={onResetSchedules}
            onStartJournalFromSchedule={handleStartJournalFromSchedule}
            defaultViewMode="manage"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BUAT JURNAL BARU & SCAN PRESENSI QR KELAS       */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 my-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Jurnal Mengajar & Presensi QR Kelas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Catat materi tatap muka dan lakukan scan kartu siswa langsung di dalam kelas
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopScanner();
                  setIsModalOpen(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitJournal} className="mt-4 space-y-4">
              
              {/* Row 1: Guru, Mapel, Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Guru Pengajar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Guru Pengajar
                  </label>
                  {user?.role === 'guru' ? (
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 truncate">
                      {user.nama}
                    </div>
                  ) : (
                    <select
                      value={formGuruId}
                      onChange={(e) => handleTeacherChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-blue-600 font-normal">({availableMapelList.length} Mapel)</span>
                  </label>
                  {availableMapelList.length > 0 ? (
                    <select
                      value={formMapel}
                      onChange={(e) => handleMapelChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    >
                      {availableMapelList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={formMapel}
                      onChange={(e) => handleMapelChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Kelas / Rombel */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas / Rombel KBM
                  </label>
                  <select
                    value={formKelas}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-blue-700 focus:ring-2 focus:ring-blue-500"
                  >
                    {availableClassesForMapel.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Tanggal, Pertemuan Ke-, Jam Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pertemuan
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pertemuan Ke-
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={64}
                    required
                    value={formPertemuanKe}
                    onChange={(e) => setFormPertemuanKe(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Ke- & Alokasi Waktu
                  </label>
                  <input
                    type="text"
                    required
                    value={formJamPelajaran}
                    onChange={(e) => setFormJamPelajaran(e.target.value)}
                    placeholder="Contoh: 1 - 2 (07.30 - 08.50)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Materi Pokok & Kegiatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Materi Pokok / Kompetensi Dasar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formMateriPokok}
                  onChange={(e) => setFormMateriPokok(e.target.value)}
                  placeholder="Contoh: Sistem Ekskresi pada Manusia dan Organ Ginjal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Uraian Kegiatan / Metode
                  </label>
                  <textarea
                    rows={2}
                    value={formKegiatan}
                    onChange={(e) => setFormKegiatan(e.target.value)}
                    placeholder="Contoh: Diskusi kelompok dan demonstrasi..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Refleksi KBM
                  </label>
                  <textarea
                    rows={2}
                    value={formRefleksi}
                    onChange={(e) => setFormRefleksi(e.target.value)}
                    placeholder="Contoh: Seluruh siswa aktif, materi tercapai..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ======================================================== */}
              {/* SECTION: PRESENSI SISWA KELAS DENGAN SCAN QR INTERAKTIF */}
              {/* ======================================================== */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100 p-3 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Presensi Tatap Muka Kelas {formKelas}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Siswa dapat di-scan QR atau diubah statusnya secara manual.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleScanner}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${
                        isScannerActive
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isScannerActive ? (
                        <>
                          <CameraOff className="w-3.5 h-3.5" />
                          <span>Tutup Scanner</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Buka Pemindai QR Kelas</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* IN-CLASS LIVE CAMERA QR SCANNER VIEWPORT */}
                {isScannerActive && (
                  <div className="bg-slate-900 rounded-3xl p-4 text-white space-y-3 animate-in zoom-in-95 duration-200 border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Scan className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-extrabold text-slate-200">
                          Kamera Presensi Kelas ({formKelas})
                        </span>
                      </div>

                      {/* Camera Selector */}
                      {cameras.length > 1 && (
                        <select
                          value={selectedCameraId}
                          onChange={handleCameraChange}
                          className="bg-slate-800 text-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700 focus:outline-hidden"
                        >
                          {cameras.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label || `Kamera ${c.id.substring(0, 5)}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Scanner box element */}
                    <div className="relative mx-auto w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black ring-2 ring-indigo-500/40 shadow-inner">
                      <div id="qr-reader-in-class" className="w-full h-full"></div>

                      {/* Camera Permission Denied Fallback Overlay */}
                      {cameraPermissionDenied && (
                        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-10">
                          <CameraOff className="w-8 h-8 text-amber-400 mb-2" />
                          <span className="text-xs font-bold text-white mb-1">Izin Kamera Belum Aktif</span>
                          <p className="text-[11px] text-slate-400 mb-3 max-w-[220px]">
                            Klik tombol di bawah untuk mengizinkan kamera browser, atau gunakan kolom input NISN di bawah.
                          </p>
                          <button
                            type="button"
                            onClick={() => startScanner()}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs"
                          >
                            Minta Izin Kamera
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Manual NISN input for Barcode Scanner Gun or Typing */}
                    <div className="flex items-center gap-1.5 max-w-sm mx-auto">
                      <input
                        type="text"
                        placeholder="Scan / ketik NISN manual..."
                        value={manualScanInput}
                        onChange={(e) => setManualScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleManualScanSubmit(e);
                          }
                        }}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleManualScanSubmit}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Input
                      </button>
                    </div>

                    {/* Last Scanned Result Badge */}
                    {lastScannedResult && (
                      <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
                        <div className="flex items-center gap-2">
                          {lastScannedResult.student.fotoUrl ? (
                            <img 
                              src={lastScannedResult.student.fotoUrl} 
                              alt={lastScannedResult.student.nama} 
                              className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                              {lastScannedResult.student.nama.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-extrabold text-white block">
                              {lastScannedResult.student.nama}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              NISN {lastScannedResult.student.nisn} • Jam {lastScannedResult.time}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px]">
                          HADIR
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scan Alert Notification */}
                {scanAlert && (
                  <div className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in ${
                    scanAlert.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : scanAlert.type === 'warning'
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : 'bg-blue-50 border border-blue-200 text-blue-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {scanAlert.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>{scanAlert.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScanAlert(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Live Statistics & Quick Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black text-[11px]">
                      Hadir: {countHadir + countTerlambat}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-900 font-bold text-[11px]">
                      Alpa / Belum Scan: {countAlpa}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-sky-100 text-sky-900 font-bold text-[11px]">
                      Sakit: {countSakit}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-[11px]">
                      Izin: {countIzin}
                    </span>
                    <span className="text-[11px] font-black text-blue-700 ml-1">
                      {currentAttendancePercent}% Hadir
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Tandai Semua Hadir
                    </button>
                    <button
                      type="button"
                      onClick={handleSetUnscannedToAbsent}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-extrabold transition-colors cursor-pointer"
                    >
                      Set Belum Scan = Alpa
                    </button>
                  </div>
                </div>

                {/* Student Attendance Checklist Table */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-2xs">
                  {currentClassStudents.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                      Tidak ada siswa yang terdaftar di kelas {formKelas}.
                    </div>
                  ) : (
                    currentClassStudents.map((s, idx) => {
                      const currentSt = studentStatuses[s.nisn] || 'Alpa';
                      const isScanned = scannedViaQrNisns.has(s.nisn);

                      return (
                        <div key={s.nisn} className="py-2 px-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-slate-400 font-mono text-[11px] w-5 shrink-0">
                              {idx + 1}.
                            </span>

                            {s.fotoUrl ? (
                              <img 
                                src={s.fotoUrl} 
                                alt={s.nama} 
                                className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {s.nama.charAt(0)}
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 truncate block text-xs">
                                {s.nama}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <span>{s.nisn}</span>
                                {isScanned && (
                                  <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-sans font-bold text-[9px] flex items-center gap-0.5">
                                    <QrCode className="w-2.5 h-2.5" />
                                    Scan QR
                                  </span>
                                )}
                                {(() => {
                                  const init = getInitialStatusForStudent(s.nisn, formTanggal);
                                  if (init.isVerifiedLeave) {
                                    return (
                                      <span 
                                        className={`px-1.5 py-0.2 rounded font-sans font-bold text-[9px] flex items-center gap-0.5 ${
                                          init.status === 'Sakit'
                                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                        }`}
                                        title={init.leaveReason || `Surat ${init.status} Disetujui`}
                                      >
                                        <Sparkles className="w-2.5 h-2.5" />
                                        <span>{init.status} Terverifikasi</span>
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {(['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'] as AttendanceStatus[]).map((st) => {
                              const isSelected = currentSt === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(s.nisn, st)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                    isSelected
                                      ? st === 'Hadir'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : st === 'Terlambat'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : st === 'Izin'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : st === 'Sakit'
                                        ? 'bg-sky-600 text-white shadow-xs'
                                        : 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    stopScanner();
                    setIsModalOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Jurnal & Rekap Presensi KBM</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DETAIL PRESENSI SISWA PADA JURNAL TERSIMPAN      */}
      {/* ======================================================== */}
      {viewDetailJournal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Detail Presensi Siswa KBM
                </h3>
                <p className="text-xs text-slate-500">
                  {viewDetailJournal.mapel} • Kelas {viewDetailJournal.kelas} • Pertemuan #{viewDetailJournal.pertemuanKe}
                </p>
              </div>
              <button
                onClick={() => setViewDetailJournal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Summary Badges */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <span className="text-[10px] block font-bold text-emerald-700">Hadir</span>
                  <span className="text-sm font-black">{viewDetailJournal.hadir}</span>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="text-[10px] block font-bold text-amber-700">Terlambat</span>
                  <span className="text-sm font-black">{viewDetailJournal.terlambat}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-900 border border-sky-200">
                  <span className="text-[10px] block font-bold text-sky-700">Sakit / Izin</span>
                  <span className="text-sm font-black">{viewDetailJournal.sakit + viewDetailJournal.izin}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-900 border border-rose-200">
                  <span className="text-[10px] block font-bold text-rose-700">Alpa</span>
                  <span className="text-sm font-black">{viewDetailJournal.alpa}</span>
                </div>
              </div>

              {/* Student Presence List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50">
                {students
                  .filter((s) => s.kelas === viewDetailJournal.kelas)
                  .map((s, idx) => {
                    const st = viewDetailJournal.studentAttendances?.[s.nisn] || (idx < viewDetailJournal.hadir ? 'Hadir' : 'Alpa');
                    return (
                      <div key={s.nisn} className="py-2 px-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px] w-5">{idx + 1}.</span>
                          <span className="font-bold text-slate-800">{s.nama}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                          st === 'Hadir'
                            ? 'bg-emerald-100 text-emerald-900'
                            : st === 'Terlambat'
                            ? 'bg-amber-100 text-amber-900'
                            : st === 'Sakit'
                            ? 'bg-sky-100 text-sky-900'
                            : st === 'Izin'
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}>
                          {st}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewDetailJournal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
