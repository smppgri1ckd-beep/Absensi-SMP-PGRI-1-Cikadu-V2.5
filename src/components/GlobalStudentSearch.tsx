import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  X, 
  User, 
  CheckCircle2, 
  Clock, 
  Phone, 
  QrCode, 
  Users, 
  ExternalLink,
  ChevronRight,
  CalendarDays,
  Calendar,
  BookOpen,
  AlertCircle,
  Download,
  Filter,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  Printer
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { generateQrDataUrl } from '../utils/qr';

interface GlobalStudentSearchProps {
  students: Student[];
  records?: AttendanceRecord[];
  setActiveTab?: (tab: string) => void;
  onSelectStudent?: (student: Student) => void;
}

export const GlobalStudentSearch: React.FC<GlobalStudentSearchProps> = ({
  students,
  records = [],
  setActiveTab,
  onSelectStudent,
}) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedStudentModal, setSelectedStudentModal] = useState<Student | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('Semua');
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState<boolean>(false);
  const [digitalQrUrl, setDigitalQrUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Records for currently inspected student in modal
  const modalStudentRecords = useMemo(() => {
    if (!selectedStudentModal) return [];
    return records.filter((r) => r.nisn === selectedStudentModal.nisn);
  }, [records, selectedStudentModal]);

  // Today's specific sessions for inspected student in modal
  const modalStudentToday = useMemo(() => {
    if (!selectedStudentModal) return { morning: undefined, afternoon: undefined, classLogs: [] };
    const todayLogs = modalStudentRecords.filter((r) => r.tanggal === todayStr);
    const morning = todayLogs.find((r) => r.sesi === 'Pagi' && (r.kategori === 'APEL' || !r.kategori));
    const afternoon = todayLogs.find((r) => r.sesi === 'Siang' && (r.kategori === 'APEL' || !r.kategori));
    const classLogs = todayLogs.filter((r) => r.kategori === 'KELAS');
    return { morning, afternoon, classLogs };
  }, [modalStudentRecords, selectedStudentModal, todayStr]);

  // Cumulative statistics for inspected student in modal
  const modalStats = useMemo(() => {
    if (!selectedStudentModal || modalStudentRecords.length === 0) {
      return { percentage: 100, totalHadir: 0, totalTerlambat: 0, totalIzinSakit: 0, totalAlpa: 0, totalRecords: 0 };
    }
    const totalHadir = modalStudentRecords.filter((r) => r.status === 'Hadir').length;
    const totalTerlambat = modalStudentRecords.filter((r) => r.status === 'Terlambat').length;
    const totalIzinSakit = modalStudentRecords.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
    const totalAlpa = modalStudentRecords.filter((r) => r.status === 'Alpa').length;
    const totalRecords = modalStudentRecords.length;
    const percentage = Math.round(((totalHadir + totalTerlambat) / Math.max(1, totalRecords)) * 100);
    return { percentage, totalHadir, totalTerlambat, totalIzinSakit, totalAlpa, totalRecords };
  }, [selectedStudentModal, modalStudentRecords]);

  // Daily attendance history grouped by date
  const modalDailyHistory = useMemo(() => {
    if (!selectedStudentModal) return [];
    const dateMap = new Map<string, AttendanceRecord[]>();

    modalStudentRecords.forEach((r) => {
      const list = dateMap.get(r.tanggal) || [];
      list.push(r);
      dateMap.set(r.tanggal, list);
    });

    if (!dateMap.has(todayStr)) {
      dateMap.set(todayStr, []);
    }

    const allDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

    return allDates.map((dateIso) => {
      const recs = dateMap.get(dateIso) || [];
      const morn = recs.find((r) => r.sesi === 'Pagi' && (r.kategori === 'APEL' || !r.kategori));
      const aft = recs.find((r) => r.sesi === 'Siang' && (r.kategori === 'APEL' || !r.kategori));
      const classRecs = recs.filter((r) => r.kategori === 'KELAS');

      let primaryStatus: AttendanceStatus | 'Belum Scan' = 'Belum Scan';
      if (morn) {
        primaryStatus = morn.status;
      } else if (recs.length > 0) {
        primaryStatus = recs[0].status;
      }

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
        morn,
        aft,
        classRecs,
        status: primaryStatus,
        notes: morn?.catatan || (morn?.status === 'Terlambat' ? 'Terlambat kedatangan apel' : '-'),
      };
    });
  }, [selectedStudentModal, modalStudentRecords, todayStr]);

  const modalFilteredHistory = useMemo(() => {
    if (modalStatusFilter === 'Semua') return modalDailyHistory;
    return modalDailyHistory.filter((item) => item.status === modalStatusFilter);
  }, [modalDailyHistory, modalStatusFilter]);

  // Generate QR for Digital Student Card when modal opens
  useEffect(() => {
    if (isDigitalCardOpen && selectedStudentModal) {
      setIsGeneratingQr(true);
      generateQrDataUrl(selectedStudentModal.nisn, 400)
        .then((url) => {
          setDigitalQrUrl(url);
        })
        .finally(() => {
          setIsGeneratingQr(false);
        });
    }
  }, [isDigitalCardOpen, selectedStudentModal]);

  // Clean class name to avoid duplicate "KELAS KELAS"
  const formatClassName = (cls?: string) => {
    if (!cls) return '';
    const trimmed = cls.trim();
    return trimmed.toLowerCase().startsWith('kelas') ? trimmed : `Kelas ${trimmed}`;
  };

  // Filter students based on query & role access permissions
  const filteredStudents = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    // Access control:
    // Parents can ONLY see and search their own registered children
    let pool = students;
    if (user?.role === 'ortu') {
      const allowed = new Set(user.childrenNisns || []);
      pool = students.filter((s) => allowed.has(s.nisn));
    } else if (user?.role === 'guru') {
      const allowedClasses = new Set<string>();
      if (user.waliKelas) allowedClasses.add(user.waliKelas.toLowerCase());
      (user.penugasanMapel || []).forEach((asgn) => {
        asgn.kelas.forEach((c) => allowedClasses.add(c.toLowerCase()));
      });
      if (allowedClasses.size > 0) {
        pool = students.filter((s) => allowedClasses.has(s.kelas.toLowerCase()));
      }
    }

    // Filter by name or NISN
    const matches = pool.filter((s) => {
      const matchName = s.nama.toLowerCase().includes(clean);
      const matchNisn = s.nisn.toLowerCase().includes(clean);
      const matchKelas = s.kelas.toLowerCase().includes(clean);
      return matchName || matchNisn || matchKelas;
    });

    // Prioritize startsWith matches
    return matches.sort((a, b) => {
      const aStartsName = a.nama.toLowerCase().startsWith(clean);
      const bStartsName = b.nama.toLowerCase().startsWith(clean);
      const aStartsNisn = a.nisn.startsWith(clean);
      const bStartsNisn = b.nisn.startsWith(clean);

      if ((aStartsName || aStartsNisn) && !(bStartsName || bStartsNisn)) return -1;
      if (!(aStartsName || aStartsNisn) && (bStartsName || bStartsNisn)) return 1;
      return a.nama.localeCompare(b.nama);
    }).slice(0, 10); // Limit to top 10 for performance & neat layout
  }, [students, query, user]);

  // Today's attendance records map for quick lookup
  const todayAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    records.forEach((r) => {
      if (r.tanggal === todayStr) {
        const list = map.get(r.nisn) || [];
        list.push(r);
        map.set(r.nisn, list);
      }
    });
    return map;
  }, [records, todayStr]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener (Ctrl+K, Cmd+K, or '/')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Check window width
        if (window.innerWidth < 768) {
          setIsMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          desktopInputRef.current?.focus();
          setIsOpen(true);
        }
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          desktopInputRef.current?.focus();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredStudents]);

  const handleSelectStudent = (student: Student) => {
    setIsOpen(false);
    setIsMobileModalOpen(false);
    setSelectedStudentModal(student);
    if (onSelectStudent) {
      onSelectStudent(student);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredStudents.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredStudents.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredStudents.length) % filteredStudents.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStudents[selectedIndex]) {
        handleSelectStudent(filteredStudents[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsMobileModalOpen(false);
      desktopInputRef.current?.blur();
      mobileInputRef.current?.blur();
    }
  };

  // Helper for student attendance badge
  const renderAttendanceBadge = (studentNisn: string) => {
    const studentRecords = todayAttendanceMap.get(studentNisn);
    if (!studentRecords || studentRecords.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          <Clock className="w-2.5 h-2.5 opacity-60" />
          <span>Belum Hadir</span>
        </span>
      );
    }

    const latest = studentRecords[studentRecords.length - 1];
    if (latest.status === 'Hadir') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          <span>Hadir {latest.waktu?.substring(0, 5)}</span>
        </span>
      );
    } else if (latest.status === 'Terlambat') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-2.5 h-2.5 text-amber-600" />
          <span>Terlambat {latest.waktu?.substring(0, 5)}</span>
        </span>
      );
    } else if (latest.status === 'Izin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span>Izin</span>
        </span>
      );
    } else if (latest.status === 'Sakit') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span>Sakit</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span>Alpa</span>
        </span>
      );
    }
  };

  // Reusable Result Item component
  const renderStudentRow = (student: Student, idx: number) => {
    const isSelected = idx === selectedIndex;
    return (
      <div
        key={student.nisn}
        onClick={() => handleSelectStudent(student)}
        onMouseEnter={() => setSelectedIndex(idx)}
        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-blue-50/90 text-blue-950' 
            : 'hover:bg-slate-50 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {student.fotoUrl ? (
            <img
              src={student.fotoUrl}
              alt={student.nama}
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
            />
          ) : (
            <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
              student.jk === 'L' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {student.nama.charAt(0)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                {student.nama}
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200 shrink-0">
                {student.kelas}
              </span>
              <span className={`px-1 rounded-sm text-[9px] font-bold ${
                student.jk === 'L' ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50'
              }`}>
                {student.jk === 'L' ? 'L' : 'P'}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
              <span>NISN: <strong className="text-slate-600">{student.nisn}</strong></span>
              {student.nomorTeleponOrtu && (
                <span className="hidden sm:inline-flex text-[10px] text-slate-400">
                  • {student.nomorTeleponOrtu}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {renderAttendanceBadge(student.nisn)}
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP HEADER SEARCH BAR (Anchored, Width Balanced)   */}
      {/* ======================================================== */}
      <div ref={containerRef} className="relative w-full max-w-sm hidden md:block">
        <div className="relative flex items-center">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              user?.role === 'ortu' 
                ? 'Cari nama anak Anda...' 
                : !user 
                ? 'Cari anak / siswa (Ketik Nama atau NISN)...' 
                : 'Cari siswa (Nama / NISN)...'
            }
            className="w-full h-10 pl-9 pr-14 text-xs font-semibold bg-slate-100/90 hover:bg-slate-100 text-slate-900 placeholder:text-slate-400 rounded-2xl border border-slate-200/90 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/60 focus:outline-hidden transition-all shadow-2xs"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  desktopInputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold font-mono text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Live Search Results Dropdown on Desktop (Fixed & Anchored with Smooth Fade-in & Soft Highlight) */}
        {isOpen && query.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2.5 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25),0_0_0_1px_rgba(59,130,246,0.2)] border border-blue-400/40 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ease-out min-w-[340px] sm:min-w-[390px] lg:min-w-[430px] ring-4 ring-blue-500/10 transition-all">
            {/* Header */}
            <div className="sticky top-0 z-10 px-3.5 py-2.5 bg-slate-50/95 backdrop-blur-xs border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 shrink-0">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Hasil Pencarian ({filteredStudents.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Tekan ↵ untuk detail
              </span>
            </div>

            {/* List with constrained max-height and overflow-y auto */}
            <div className="max-h-64 sm:max-h-80 overflow-y-auto overscroll-contain divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-1">
                  <User className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada siswa ditemukan</p>
                  <p className="text-[11px] text-slate-400">
                    {user?.role === 'ortu'
                      ? 'Hanya anak yang terhubung dengan akun orang tua Anda yang dapat diakses.'
                      : 'Periksa kembali ejaan nama atau nomor NISN'}
                  </p>
                </div>
              ) : (
                filteredStudents.map((s, idx) => renderStudentRow(s, idx))
              )}
            </div>

            {filteredStudents.length > 0 && (
              <div className="sticky bottom-0 z-10 p-2 bg-slate-50/95 backdrop-blur-xs border-t border-slate-100 text-center shrink-0">
                <span className="text-[10px] font-semibold text-slate-400">
                  Total {students.length} siswa terdaftar di sistem Dapodik
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE SEARCH TRIGGER BUTTON (Compact & Clean)        */}
      {/* ======================================================== */}
      <div className="md:hidden w-full max-w-[150px] xs:max-w-[200px]">
        <button
          type="button"
          onClick={() => {
            setIsMobileModalOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 150);
          }}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 border border-slate-200 text-xs transition-colors cursor-pointer"
          title="Cari Data Siswa / Pantau Anak"
        >
          <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate text-[11px] font-semibold text-slate-600">
            {user?.role === 'ortu' ? 'Cari anak...' : 'Cari siswa...'}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE SPOTLIGHT SEARCH MODAL (Centered, Never Cuts)  */}
      {/* ======================================================== */}
      {isMobileModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 pt-4 sm:pt-16 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            
            {/* Search Input Bar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center gap-2.5 bg-slate-50/80">
              <Search className="w-5 h-5 text-blue-600 shrink-0 ml-1" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  user?.role === 'ortu' 
                    ? 'Ketik nama anak Anda...' 
                    : !user 
                    ? 'Ketik nama anak / siswa atau NISN...' 
                    : 'Ketik nama siswa atau NISN...'
                }
                className="w-full text-sm font-semibold bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    mobileInputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-bold text-xs shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Results in Modal */}
            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {!query.trim() ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Search className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Mulai Mengetik untuk Mencari Siswa</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Masukkan minimal 1 karakter nama siswa atau nomor NISN.
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <User className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada siswa ditemukan</p>
                  <p className="text-[11px] text-slate-400">
                    Tidak ditemukan siswa yang cocok dengan "{query}".
                  </p>
                </div>
              ) : (
                filteredStudents.map((s, idx) => renderStudentRow(s, idx))
              )}
            </div>

            {/* Modal Footer */}
            {query.trim() !== '' && filteredStudents.length > 0 && (
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] font-semibold text-slate-400">
                Menampilkan {filteredStudents.length} siswa • Tekan salah satu untuk melihat rincian
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 4. IN-DEPTH STUDENT PROFILE & ATTENDANCE MODAL           */}
      {/* ======================================================== */}
      {selectedStudentModal && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setSelectedStudentModal(null)}
          className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh] my-auto"
          >
            {/* Modal Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 sm:p-5 text-white relative shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 pr-8">
                {selectedStudentModal.fotoUrl ? (
                  <img
                    src={selectedStudentModal.fotoUrl}
                    alt={selectedStudentModal.nama}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                  />
                ) : (
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-white shadow-md shrink-0 ${
                    selectedStudentModal.jk === 'L' ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {selectedStudentModal.nama.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white">
                      {formatClassName(selectedStudentModal.kelas)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">
                      {selectedStudentModal.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>

                  <h3 className="font-black text-lg sm:text-xl text-white mt-1 truncate">
                    {selectedStudentModal.nama}
                  </h3>
                  <p className="text-blue-100 text-xs font-mono">
                    NISN: {selectedStudentModal.nisn}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* 1. Today's Attendance Three Pillars */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-blue-900">
                    <CalendarDays className="w-4 h-4 text-blue-600" />
                    <span>Status Presensi Hari Ini ({todayStr})</span>
                  </span>
                  <div>{renderAttendanceBadge(selectedStudentModal.nisn)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Sesi Pagi */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">1. Masuk Gerbang (Pagi)</span>
                    {modalStudentToday.morning ? (
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 font-black text-xs ${
                          modalStudentToday.morning.status === 'Hadir' ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{modalStudentToday.morning.status}</span>
                        </span>
                        <p className="text-[11px] font-mono text-slate-600 font-bold">Pukul {modalStudentToday.morning.waktu} WIB</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic mt-1">Belum scan masuk</p>
                    )}
                  </div>

                  {/* Sesi Siang */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">2. Kepulangan (Siang)</span>
                    {modalStudentToday.afternoon ? (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 font-black text-xs text-indigo-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sudah Pulang</span>
                        </span>
                        <p className="text-[11px] font-mono text-indigo-900 font-bold">Pukul {modalStudentToday.afternoon.waktu} WIB</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic mt-1">Menunggu jam pulang</p>
                    )}
                  </div>

                  {/* KBM Kelas */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">3. Tatap Muka (KBM)</span>
                    {modalStudentToday.classLogs.length > 0 ? (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 font-black text-xs text-blue-700">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{modalStudentToday.classLogs.length} Mapel Tercatat</span>
                        </span>
                        <p className="text-[10px] text-slate-500 truncate">Hadir di ruang kelas</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic mt-1">Belum ada jurnal kelas</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Cumulative Statistics */}
              <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800">Statistik Kehadiran Keseluruhan</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                    {modalStats.percentage}% Disiplin
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[9px] font-bold text-emerald-800 block">Hadir</span>
                    <strong className="text-emerald-950 font-black text-sm">{modalStats.totalHadir}</strong>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold text-amber-800 block">Terlambat</span>
                    <strong className="text-amber-950 font-black text-sm">{modalStats.totalTerlambat}</strong>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[9px] font-bold text-blue-800 block">Izin/Sakit</span>
                    <strong className="text-blue-950 font-black text-sm">{modalStats.totalIzinSakit}</strong>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[9px] font-bold text-rose-800 block">Alpa</span>
                    <strong className="text-rose-950 font-black text-sm">{modalStats.totalAlpa}</strong>
                  </div>
                </div>
              </div>

              {/* 3. In-depth Daily Attendance Table */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      Tabel Riwayat Presensi Harian
                    </span>
                  </div>

                  {/* Filter Status Chips */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {['Semua', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setModalStatusFilter(st)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          modalStatusFilter === st
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="py-2.5 px-3">Tanggal & Hari</th>
                        <th className="py-2.5 px-3">Masuk (Pagi)</th>
                        <th className="py-2.5 px-3">Pulang (Siang)</th>
                        <th className="py-2.5 px-3">KBM</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalFilteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                            Tidak ada catatan presensi dengan status "{modalStatusFilter}".
                          </td>
                        </tr>
                      ) : (
                        modalFilteredHistory.map((item) => (
                          <tr 
                            key={item.dateIso}
                            className={`hover:bg-blue-50/40 transition-colors ${
                              item.isToday ? 'bg-blue-50/20 font-medium' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-extrabold text-slate-900 block">{item.formattedDate}</span>
                              <span className="font-mono text-[9px] text-slate-400">{item.dateIso}</span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.morn ? (
                                <span className={`font-mono font-bold ${
                                  item.morn.status === 'Hadir' ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  {item.morn.waktu?.substring(0, 5)} WIB
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.aft ? (
                                <span className="font-mono font-bold text-indigo-700">
                                  {item.aft.waktu?.substring(0, 5)} WIB
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {item.classRecs.length > 0 ? (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[9px] border border-indigo-200">
                                  {item.classRecs.length} Mapel
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-black text-[10px] border ${
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

                            <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[140px] truncate">
                              {item.notes}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Parent Contact Information */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Informasi Kontak Wali / Orang Tua
                </span>
                {selectedStudentModal.nomorTeleponOrtu ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-extrabold text-emerald-950 block">
                          {selectedStudentModal.nomorTeleponOrtu}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Nomor Telepon / WhatsApp Orang Tua
                        </span>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/${selectedStudentModal.nomorTeleponOrtu.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Chat WA</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                    Nomor kontak orang tua belum dicatat pada Dapodik.
                  </div>
                )}
              </div>

              {/* 5. Navigation Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDigitalCardOpen(true)}
                  className="w-full sm:flex-1 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Lihat Kartu QR Digital</span>
                </button>

                {onSelectStudent ? (
                  <button
                    type="button"
                    onClick={() => {
                      const s = selectedStudentModal;
                      setSelectedStudentModal(null);
                      onSelectStudent(s);
                    }}
                    className="w-full sm:flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buka Dashboard Pantau Anak</span>
                  </button>
                ) : setActiveTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentModal(null);
                      setActiveTab('pantau-anak');
                    }}
                    className="w-full sm:flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Buka Pantau Anak</span>
                  </button>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* 5. SUB-MODAL: KARTU QR DIGITAL SISWA LENGKAP             */}
      {/* ======================================================== */}
      {isDigitalCardOpen && selectedStudentModal && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setIsDigitalCardOpen(false)}
          className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh] my-auto"
          >
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-4 text-white text-center relative shrink-0">
              <button
                type="button"
                onClick={() => setIsDigitalCardOpen(false)}
                className="absolute right-3 top-3 p-1 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                title="Tutup kartu"
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-extrabold text-sm text-white">Kartu QR Presensi Digital</h4>
              <p className="text-[11px] text-blue-100">{formatClassName(selectedStudentModal.kelas)}</p>
            </div>

            <div className="p-5 text-center space-y-3.5 overflow-y-auto flex-1">
              <div className="w-44 h-44 mx-auto p-2 bg-white rounded-2xl border-2 border-dashed border-blue-400 shadow-inner flex items-center justify-center shrink-0">
                {isGeneratingQr ? (
                  <div className="text-xs text-slate-400 animate-pulse">Menghasilkan QR...</div>
                ) : digitalQrUrl ? (
                  <img src={digitalQrUrl} alt={`QR ${selectedStudentModal.nama}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-xs text-rose-500">Gagal memuat QR</div>
                )}
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                  {formatClassName(selectedStudentModal.kelas)}
                </span>
                <h3 className="font-black text-base text-slate-900 mt-1">{selectedStudentModal.nama}</h3>
                <p className="font-mono text-xs text-slate-500">NISN: {selectedStudentModal.nisn}</p>
              </div>

              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Arahkan kode QR ini ke kamera scanner kiosk atau simpan gambar ke galeri ponsel untuk cadangan.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <a
                href={digitalQrUrl}
                download={`QR_${selectedStudentModal.nisn}_${selectedStudentModal.nama.replace(/\s+/g, '_')}.png`}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Simpan Gambar QR</span>
              </a>
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
    </>
  );
};
