import React, { useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  Percent, 
  Filter, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Plus, 
  Edit3, 
  Trash2,
  Search,
  Check,
  X,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  SchoolConfig, 
  AttendanceStatus, 
  AttendanceSession, 
  TeacherUser, 
  SchoolEventItem 
} from '../types';
import { DatabaseService } from '../services/db';
import { exportDailyAttendanceExcel } from '../utils/exportExcel';
import { generateDailyAttendancePdf } from '../utils/exportPdf';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, GraduationCap, ArrowLeft, Sparkles } from 'lucide-react';
import { SchoolLogo } from '../assets/schoolLogo';
import { 
  filterStudentsForTeacher, 
  filterRecordsForTeacher, 
  getTeacherAccessibleClasses, 
  isClassMatch 
} from '../utils/teacherFilter';

interface DashboardProps {
  students: Student[];
  records: AttendanceRecord[];
  schoolConfig: SchoolConfig;
  currentSession: AttendanceSession;
  teachers?: TeacherUser[];
  onUpdateStatus: (id: string, status: AttendanceStatus, catatan?: string) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onBulkDeleteRecords?: (ids: string[]) => Promise<void>;
  onAddManualRecord: (record: AttendanceRecord) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenLogin?: () => void;
  setActiveTab?: (tab: string) => void;
  onOpenAiAnalysis?: () => void;
  onOpenWhatsApp?: (targetStudents?: Student[], defaultContext?: 'terlambat' | 'alpa' | 'umum') => void;
  onOpenAgenda?: () => void;
  schoolEvents?: SchoolEventItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  records,
  schoolConfig,
  currentSession,
  teachers = [],
  onUpdateStatus,
  onDeleteRecord,
  onBulkDeleteRecords,
  onAddManualRecord,
  onRefresh,
  onOpenLogin,
  setActiveTab,
  onOpenAiAnalysis,
  onOpenWhatsApp,
  onOpenAgenda,
  schoolEvents = [],
}) => {
  const { user, actingAsPiket } = useAuth();
  const isTeacher = user?.role === 'guru' && !actingAsPiket;

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession>(currentSession);
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Manual Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualStudentNisn, setManualStudentNisn] = useState('');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('Hadir');
  const [manualNote, setManualNote] = useState('');

  // Status edit inline state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<AttendanceStatus>('Hadir');
  const [tempNote, setTempNote] = useState<string>('');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [isBulkDeletingRecords, setIsBulkDeletingRecords] = useState(false);

  const handleBulkDeleteRecords = async () => {
    if (selectedRecordIds.length === 0) return;
    const count = selectedRecordIds.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} CATATAN PRESENSI TERPILIH?\n\nSetiap data yang dihapus akan benar-benar hilang dari database sekolah (Firestore & Penyimpanan Lokal). Tindakan ini permanen.`)) {
      return;
    }
    setIsBulkDeletingRecords(true);
    try {
      if (onBulkDeleteRecords) {
        await onBulkDeleteRecords(selectedRecordIds);
      } else {
        await DatabaseService.bulkDeleteAttendanceRecords(selectedRecordIds);
      }
      setSelectedRecordIds([]);
    } catch (err) {
      console.error('Failed to bulk delete attendance records', err);
      alert('Gagal menghapus catatan presensi. Silakan coba lagi.');
    } finally {
      setIsBulkDeletingRecords(false);
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'piket' || (user?.role === 'guru' && actingAsPiket);

  // Scoped students and records based on role
  const scopedStudents = React.useMemo(() => {
    return filterStudentsForTeacher(students, user, actingAsPiket);
  }, [students, user, actingAsPiket]);

  const scopedRecords = React.useMemo(() => {
    return filterRecordsForTeacher(records, user, actingAsPiket);
  }, [records, user, actingAsPiket]);

  // Filter records for selected date & session (Operasional Presensi Apel Pagi & Siang)
  const dateSessionRecords = scopedRecords.filter(
    (r) => r.tanggal === selectedDate && r.sesi === selectedSession && (r.kategori === 'APEL' || !r.kategori)
  );

  // Distinct classes based on scoped students
  const classesList = React.useMemo(() => {
    return Array.from(new Set(scopedStudents.map((s) => s.kelas))).sort();
  }, [scopedStudents]);

  // Filtered by class and status and search
  const displayedRecords = dateSessionRecords.filter((r) => {
    if (selectedClass !== 'Semua' && !isClassMatch(r.kelas, selectedClass)) return false;
    if (statusFilter !== 'Semua' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.nama.toLowerCase().includes(q) || r.nisn.includes(q);
    }
    return true;
  });

  // Calculate high-level metrics
  const targetStudents = selectedClass === 'Semua' 
    ? scopedStudents 
    : scopedStudents.filter((s) => isClassMatch(s.kelas, selectedClass));

  const totalSiswa = targetStudents.length;
  const countHadir = dateSessionRecords.filter(
    (r) => r.status === 'Hadir' && (selectedClass === 'Semua' || isClassMatch(r.kelas, selectedClass))
  ).length;
  const countTerlambat = dateSessionRecords.filter(
    (r) => r.status === 'Terlambat' && (selectedClass === 'Semua' || isClassMatch(r.kelas, selectedClass))
  ).length;
  const countIzin = dateSessionRecords.filter(
    (r) => r.status === 'Izin' && (selectedClass === 'Semua' || isClassMatch(r.kelas, selectedClass))
  ).length;
  const countSakit = dateSessionRecords.filter(
    (r) => r.status === 'Sakit' && (selectedClass === 'Semua' || isClassMatch(r.kelas, selectedClass))
  ).length;
  const countAlpaRecorded = dateSessionRecords.filter(
    (r) => r.status === 'Alpa' && (selectedClass === 'Semua' || isClassMatch(r.kelas, selectedClass))
  ).length;

  const totalRecorded = countHadir + countTerlambat + countIzin + countSakit + countAlpaRecorded;
  const belumHadir = Math.max(0, totalSiswa - (countHadir + countTerlambat + countIzin + countSakit));
  const ratePersentase = totalSiswa > 0 ? Math.min(100, Math.round(((countHadir + countTerlambat) / totalSiswa) * 100)) : 0;

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Handle Export
  const handleExportExcel = () => {
    exportDailyAttendanceExcel(records, selectedDate, schoolConfig, selectedClass);
  };

  const handleExportPdf = () => {
    generateDailyAttendancePdf(records, selectedDate, schoolConfig, selectedClass);
  };

  // Handle manual submit
  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentNisn) return;
    const student = students.find((s) => s.nisn === manualStudentNisn);
    if (!student) return;

    const timeNow = new Date().toTimeString().split(' ')[0];
    const newRecord: AttendanceRecord = {
      id: `PRESENSI_APEL_${student.nisn}_${selectedDate}_${selectedSession}`,
      tanggal: selectedDate,
      waktu: timeNow,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      sesi: selectedSession,
      status: manualStatus,
      kategori: 'APEL',
      catatan: manualNote || undefined,
    };

    await onAddManualRecord(newRecord);
    setIsAddModalOpen(false);
    setManualStudentNisn('');
    setManualNote('');
  };

  const handleStartEdit = (record: AttendanceRecord) => {
    setEditingRecordId(record.id);
    setTempStatus(record.status);
    setTempNote(record.catatan || '');
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateStatus(id, tempStatus, tempNote);
    setEditingRecordId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Monitoring Presensi Apel (Pagi & Siang)
              </h2>
              {user && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  user.role === 'admin'
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : user.role === 'guru'
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {user.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : user.role === 'guru' ? <GraduationCap className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                  <span>{user.role === 'admin' ? 'Admin' : user.role === 'guru' ? `Guru: ${user.mapel}` : 'Petugas Piket'} • {user.nama.split(',')[0]}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {schoolConfig.namaSekolah} • Operasional presensi apel kedatangan (Pagi) & kepulangan (Siang) oleh petugas sekolah.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />

          {/* Session Switch */}
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value as AttendanceSession)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="Pagi">Sesi Pagi</option>
            <option value="Siang">Sesi Siang</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Export Actions */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
            title="Download Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            title="Cetak PDF Resmi"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* AI Attendance Analysis Button */}
          {onOpenAiAnalysis && (
            <button
              onClick={onOpenAiAnalysis}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-colors cursor-pointer shadow-2xs"
              title="Analisis Kehadiran Berbasis AI (Gemini)"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Analisis AI</span>
            </button>
          )}

          {/* WhatsApp Notification Button */}
          {onOpenWhatsApp && (
            <button
              onClick={() => onOpenWhatsApp()}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
              title="Kirim Notifikasi Presensi WhatsApp ke Orang Tua"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Notif WhatsApp</span>
            </button>
          )}

          {/* Agenda Kegiatan Sekolah Button */}
          {onOpenAgenda && (
            <button
              onClick={onOpenAgenda}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
              title="Buka Agenda Kegiatan Sekolah & Kalender"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Agenda Sekolah</span>
            </button>
          )}

          {/* Presensi Apel Petugas per Kelas Button (Only for Admin & Piket) */}
          {(user?.role === 'admin' || user?.role === 'piket') && (
            <button
              onClick={() => setActiveTab?.('apel-attendance')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Buka Lembar Presensi Apel per Kelas Petugas"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Presensi Apel Kelas</span>
            </button>
          )}

          {/* Manual Add Button (Only for Admin & Piket) */}
          {(user?.role === 'admin' || user?.role === 'piket') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Entri Manual</span>
            </button>
          )}
        </div>
      </div>

      {/* Upcoming School Events Quick Banner */}
      {schoolEvents && schoolEvents.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              <Calendar className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Agenda Kegiatan Sekolah Terdekat</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-mono font-bold">
                  {schoolEvents.length} Terdaftar
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white mt-0.5 line-clamp-1">
                {schoolEvents[0].judul} ({schoolEvents[0].tanggalMulai})
              </h4>
              <p className="text-xs text-blue-200 mt-0.5 line-clamp-1">
                {schoolEvents[0].lokasi ? `Lokasi: ${schoolEvents[0].lokasi} • ` : ''}{schoolEvents[0].keterangan}
              </p>
            </div>
          </div>
          {onOpenAgenda && (
            <button
              onClick={onOpenAgenda}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer transition border border-white/20 shrink-0 flex items-center gap-1.5"
            >
              <span>Kelola &amp; Lihat Agenda</span>
              <span>↗</span>
            </button>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total Siswa */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Siswa</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSiswa}</div>
          <span className="text-[10px] text-slate-400 font-medium">Target terdaftar</span>
        </div>

        {/* Hadir */}
        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold">Hadir Tepat</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{countHadir}</div>
          <span className="text-[10px] text-emerald-600 font-bold">Tepat Waktu</span>
        </div>

        {/* Terlambat */}
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">Terlambat</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{countTerlambat}</div>
          <span className="text-[10px] text-amber-600 font-bold">Presensi di atas jam</span>
        </div>

        {/* Izin & Sakit */}
        <div className="bg-sky-50/70 rounded-2xl p-4 border border-sky-200 shadow-2xs">
          <div className="flex items-center justify-between text-sky-800 mb-2">
            <span className="text-xs font-bold">Izin / Sakit</span>
            <AlertCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700">{countIzin + countSakit}</div>
          <span className="text-[10px] text-sky-600 font-bold">Izin: {countIzin} • Sakit: {countSakit}</span>
        </div>

        {/* Belum Presensi / Alpa */}
        <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 mb-2">
            <span className="text-xs font-bold">Belum Hadir</span>
            <HelpCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{belumHadir}</div>
          <span className="text-[10px] text-rose-600 font-bold">Belum Scan QR</span>
        </div>

        {/* Persentase */}
        <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-200 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-800 mb-2">
            <span className="text-xs font-bold">% Kehadiran</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{ratePersentase}%</div>
          <span className="text-[10px] text-indigo-600 font-bold">Target Harian</span>
        </div>

      </div>

      {/* Class Breakdown Progress Bars */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center justify-between">
          <span>Tingkat Kehadiran per Rombongan Belajar (Rombel)</span>
          <span className="text-xs font-semibold text-slate-500">Sesi {selectedSession}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {classesList.map((c) => {
            const classStudents = students.filter((s) => s.kelas === c);
            const classTotal = classStudents.length;
            const classRecords = dateSessionRecords.filter((r) => r.kelas === c);
            const present = classRecords.filter((r) => r.status === 'Hadir' || r.status === 'Terlambat').length;
            const pct = classTotal > 0 ? Math.round((present / classTotal) * 100) : 0;

            return (
              <div key={c} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-extrabold text-xs text-slate-800">Kelas {c}</span>
                  <span className="font-mono font-bold text-xs text-blue-700">{pct}% ({present}/{classTotal})</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Table: Detailed Log for Date & Session */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Controls Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Daftar Presensi ({displayedRecords.length} Data)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
              {selectedDate} • {selectedSession}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="Semua">Semua Kelas</option>
              {classesList.map((c) => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="Semua">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpa">Alpa</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bulk Delete Floating/Action Bar */}
        {selectedRecordIds.length > 0 && (
          <div className="m-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
              <span>
                <strong>{selectedRecordIds.length}</strong> catatan presensi dipilih untuk tindakan massal
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecordIds([])}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
              >
                Batalkan Pilihan
              </button>
              {canManage && (
                <button
                  type="button"
                  disabled={isBulkDeletingRecords}
                  onClick={handleBulkDeleteRecords}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isBulkDeletingRecords ? 'Menghapus dari Database...' : `Hapus (${selectedRecordIds.length}) Presensi Terpilih`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                {canManage && (
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={displayedRecords.length > 0 && selectedRecordIds.length === displayedRecords.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecordIds(displayedRecords.map((r) => r.id));
                        } else {
                          setSelectedRecordIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Pilih Semua Log yang Tampil"
                    />
                  </th>
                )}
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Catatan / Keterangan</th>
                {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-slate-400">
                    Tidak ada catatan presensi pada filter ini.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r, idx) => {
                  const isEditing = editingRecordId === r.id;

                  return (
                    <tr 
                      key={r.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedRecordIds.includes(r.id) ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {canManage && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRecordIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecordIds((prev) => [...prev, r.id]);
                              } else {
                                setSelectedRecordIds((prev) => prev.filter((id) => id !== r.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.waktu}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{r.nisn}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.nama}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                          {r.kelas}
                        </span>
                      </td>

                      {/* Status Column (inline edit if editing) */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={tempStatus}
                            onChange={(e) => setTempStatus(e.target.value as AttendanceStatus)}
                            className="bg-white border border-blue-400 rounded-lg px-2 py-1 text-xs font-bold"
                          >
                            <option value="Hadir">Hadir</option>
                            <option value="Terlambat">Terlambat</option>
                            <option value="Izin">Izin</option>
                            <option value="Sakit">Sakit</option>
                            <option value="Alpa">Alpa</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            r.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'Sakit'
                              ? 'bg-sky-100 text-sky-800'
                              : r.status === 'Izin'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {r.status}
                          </span>
                        )}
                      </td>

                      {/* Notes Column */}
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {isEditing ? (
                          <input
                            type="text"
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            placeholder="Catatan..."
                            className="w-full bg-white border border-blue-400 rounded-lg px-2 py-1 text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {r.kategori === 'KELAS' ? (
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-extrabold shrink-0">
                                KBM: {r.mapel || 'Mapel'} {r.pertemuanKe ? `(P-${r.pertemuanKe})` : ''}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold shrink-0">
                                Gerbang
                              </span>
                            )}
                            <span className="truncate">{r.catatan || '-'}</span>
                          </div>
                        )}
                      </td>

                      {/* Action buttons (only for Admin and Piket) */}
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleSaveEdit(r.id)}
                                className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                title="Simpan"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingRecordId(null)}
                                className="p-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleStartEdit(r)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Ubah Status"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteRecord(r.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Manual Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Input Presensi Manual
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Gunakan untuk mencatat siswa yang tidak membawa kartu atau izin/sakit melalui surat.
            </p>

            <form onSubmit={handleSaveManualRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Pilih Siswa
                </label>
                <select
                  required
                  value={manualStudentNisn}
                  onChange={(e) => setManualStudentNisn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Cari / Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.nisn} value={s.nisn}>
                      [{s.kelas}] {s.nisn} - {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Izin">Izin (Surat Keterangan)</option>
                  <option value="Sakit">Sakit (Surat Dokter / Orang Tua)</option>
                  <option value="Alpa">Alpa (Tanpa Keterangan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Keterangan / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Contoh: Mengikuti lomba pramuka kabupaten..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
