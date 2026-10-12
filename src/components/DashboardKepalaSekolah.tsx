import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  FileText, 
  Printer, 
  Check, 
  X, 
  Award, 
  ChevronRight
} from 'lucide-react';
import { 
  SchoolConfig, 
  Student, 
  AttendanceRecord, 
  TeacherUser, 
  TeacherAttendanceRecord, 
  TeacherLeaveRequest, 
  TeachingJournal, 
  StudentGradeItem, 
  AuthUser 
} from '../types';
import { useToast } from '../context/ToastContext';
import { triggerDirectPrint } from '../utils/print';

interface DashboardKepalaSekolahProps {
  schoolConfig: SchoolConfig;
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  teachers: TeacherUser[];
  teacherRecords: TeacherAttendanceRecord[];
  teacherLeaves: TeacherLeaveRequest[];
  teachingJournals: TeachingJournal[];
  grades: StudentGradeItem[];
  currentUser: AuthUser;
  onSaveTeacherLeave: (leave: TeacherLeaveRequest) => Promise<void> | void;
  onOpenTab: (tab: string) => void;
}

export const DashboardKepalaSekolah: React.FC<DashboardKepalaSekolahProps> = ({
  schoolConfig,
  students,
  attendanceRecords,
  teachers,
  teacherRecords,
  teacherLeaves,
  teachingJournals,
  grades,
  currentUser,
  onSaveTeacherLeave,
  onOpenTab,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'persetujuan' | 'jurnal' | 'presensi' | 'nilai' | 'laporan'>('persetujuan');

  const [dispositionNotes, setDispositionNotes] = useState<Record<string, string>>({});
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Calculations for Students Today
  const todayStudentRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.tanggal === todayStr);
  }, [attendanceRecords, todayStr]);

  const studentStats = useMemo(() => {
    const total = students.length;
    const hadir = todayStudentRecords.filter((r) => r.status === 'Hadir').length;
    const terlambat = todayStudentRecords.filter((r) => r.status === 'Terlambat').length;
    const sakit = todayStudentRecords.filter((r) => r.status === 'Sakit').length;
    const izin = todayStudentRecords.filter((r) => r.status === 'Izin').length;
    const alpa = Math.max(0, total - (hadir + terlambat + sakit + izin));
    const percentHadir = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;

    return { total, hadir, terlambat, sakit, izin, alpa, percentHadir };
  }, [students, todayStudentRecords]);

  // 2. Calculations for Teachers Today
  const todayTeacherRecords = useMemo(() => {
    return teacherRecords.filter((r) => r.tanggal === todayStr && r.sesi === 'Masuk');
  }, [teacherRecords, todayStr]);

  const teacherStats = useMemo(() => {
    const total = teachers.length;
    const hadir = todayTeacherRecords.filter((r) => r.status === 'Hadir').length;
    const dinasLuar = todayTeacherRecords.filter((r) => r.kategori === 'Dinas Luar' || r.status === 'Izin').length;
    const percentHadir = total > 0 ? Math.round(((hadir + dinasLuar) / total) * 100) : 0;

    return { total, hadir, dinasLuar, percentHadir };
  }, [teachers, todayTeacherRecords]);

  // 3. Pending Leave Requests for Approval
  const pendingLeaves = useMemo(() => {
    return teacherLeaves.filter((l) => l.statusPengajuan === 'Menunggu');
  }, [teacherLeaves]);

  // 4. Teaching Journals Today
  const todayJournals = useMemo(() => {
    return teachingJournals.filter((j) => j.tanggal === todayStr);
  }, [teachingJournals, todayStr]);

  // Handle Leave Request Action (Approve / Reject)
  const handleLeaveApproval = async (leave: TeacherLeaveRequest, newStatus: 'Disetujui' | 'Ditolak') => {
    try {
      setProcessingLeaveId(leave.id);
      const notes = dispositionNotes[leave.id] || `Disetujui oleh Kepala Sekolah (${currentUser.nama})`;
      
      const updatedLeave: TeacherLeaveRequest = {
        ...leave,
        statusPengajuan: newStatus,
        disetujuiOleh: currentUser.nama || schoolConfig.namaKepsek || 'Kepala Sekolah',
        catatan: notes,
      };

      await onSaveTeacherLeave(updatedLeave);
      toast.success(
        `Pengajuan ${newStatus}`,
        `Permohonan ${leave.jenis} untuk Bpk/Ibu ${leave.nama} telah ${newStatus.toLowerCase()}.`
      );
    } catch {
      toast.error('Gagal Memproses', 'Terjadi kesalahan saat menyimpan keputusan disposisi.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  // Class breakdown for student presence
  const classBreakdown = useMemo(() => {
    const classes = ['7A', '7B', '8A', '8B', '9A', '9B'];
    return classes.map((cls) => {
      const classStudents = students.filter((s) => s.kelas === cls);
      const total = classStudents.length;
      const classRecords = todayStudentRecords.filter((r) => r.kelas === cls);
      const hadir = classRecords.filter((r) => r.status === 'Hadir').length;
      const terlambat = classRecords.filter((r) => r.status === 'Terlambat').length;
      const sakit = classRecords.filter((r) => r.status === 'Sakit').length;
      const izin = classRecords.filter((r) => r.status === 'Izin').length;
      const alpa = Math.max(0, total - (hadir + terlambat + sakit + izin));
      const pct = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;

      return { cls, total, hadir, terlambat, sakit, izin, alpa, pct };
    });
  }, [students, todayStudentRecords]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Executive Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/20">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-400/30">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Portal Supervisi Eksekutif Kepala Sekolah</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {schoolConfig.namaKepsek || 'CUNCUN MUHLISOH, S.Pd.'}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Monitoring KBM harian, supervisi kehadiran dewan guru & siswa, serta persetujuan resmi dinas luar & izin sekolah secara *real-time*.
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[120px]">
              <div className="text-[10px] text-amber-200 font-bold uppercase tracking-wider">
                Pending Approval
              </div>
              <div className="text-2xl font-black text-amber-300 mt-0.5">
                {pendingLeaves.length} <span className="text-xs font-normal text-slate-300">Berkas</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[120px]">
              <div className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
                Kehadiran Guru
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-0.5">
                {teacherStats.percentHadir}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Siswa Hadir Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Presensi Siswa</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {studentStats.percentHadir}%
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {studentStats.hadir + studentStats.terlambat} dari {studentStats.total} siswa hadir hari ini.
          </p>
        </div>

        {/* Kehadiran Guru Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Kehadiran Guru</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {teacherStats.percentHadir}%
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {teacherStats.hadir} Hadir • {teacherStats.dinasLuar} Izin/Dinas
          </p>
        </div>

        {/* Jurnal KBM Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Jurnal KBM Hari Ini</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {todayJournals.length} <span className="text-xs text-slate-500 font-normal">Sesi</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Jurnal KBM terisi hari ini di berbagai kelas.
          </p>
        </div>

        {/* Pengajuan Izin Waiting Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Persetujuan Disposisi</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {pendingLeaves.length} <span className="text-xs text-slate-500 font-normal">Menunggu</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Perlu konfirmasi persetujuan Kepala Sekolah.
          </p>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl gap-1 text-xs font-bold border border-slate-200">
        <button
          onClick={() => setActiveTab('persetujuan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'persetujuan'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Persetujuan Izin & Dinas Luar ({pendingLeaves.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('jurnal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'jurnal'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Supervisi Jurnal KBM ({todayJournals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('presensi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'presensi'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Supervisi Kehadiran Siswa & Guru</span>
        </button>

        <button
          onClick={() => setActiveTab('nilai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'nilai'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Supervisi Nilai & Capaian Rapor</span>
        </button>

        <button
          onClick={() => setActiveTab('laporan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'laporan'
              ? 'bg-amber-600 text-white shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Laporan Supervisi</span>
        </button>
      </div>

      {/* TAB 1: PERSETUJUAN IZIN & DINAS LUAR GURU */}
      {activeTab === 'persetujuan' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                Daftar Permohonan Izin & Dinas Luar Guru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi dan berikan persetujuan atau catatan disposisi resmi Kepala Sekolah.
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-500 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              <strong>{pendingLeaves.length}</strong> permohonan membutuhkan disposisi
            </div>
          </div>

          {teacherLeaves.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Belum ada permohonan izin atau dinas luar yang diajukan oleh dewan guru.
            </div>
          ) : (
            <div className="space-y-4">
              {teacherLeaves.map((leave) => (
                <div 
                  key={leave.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    leave.statusPengajuan === 'Menunggu'
                      ? 'border-amber-300 bg-amber-50/30 shadow-xs'
                      : leave.statusPengajuan === 'Disetujui'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left Details */}
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {leave.nama}
                        </span>
                        <span className="text-xs text-slate-500">
                          (NUPTK/ID: {leave.nip || '-'})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          leave.jenis === 'Dinas Luar'
                            ? 'bg-blue-100 text-blue-800'
                            : leave.jenis === 'Sakit'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {leave.jenis}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          leave.statusPengajuan === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-800'
                            : leave.statusPengajuan === 'Ditolak'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {leave.statusPengajuan}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-slate-200/80 space-y-1">
                        <div><strong>Tanggal TMT:</strong> {leave.tanggalMulai} s/d {leave.tanggalSelesai}</div>
                        <div><strong>Alasan / Tugas:</strong> {leave.alasan}</div>
                        {leave.catatan && (
                          <div className="text-amber-900 font-medium pt-1 border-t border-slate-100">
                            <strong>Disposisi Kepsek:</strong> {leave.catatan} ({leave.disetujuiOleh})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Approval Actions */}
                    {leave.statusPengajuan === 'Menunggu' && (
                      <div className="flex flex-col gap-2 min-w-[280px]">
                        <input
                          type="text"
                          placeholder="Catatan disposisi Kepala Sekolah..."
                          value={dispositionNotes[leave.id] || ''}
                          onChange={(e) => setDispositionNotes({ ...dispositionNotes, [leave.id]: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            disabled={processingLeaveId === leave.id}
                            onClick={() => handleLeaveApproval(leave, 'Disetujui')}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Setujui</span>
                          </button>
                          <button
                            disabled={processingLeaveId === leave.id}
                            onClick={() => handleLeaveApproval(leave, 'Ditolak')}
                            className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPERVISI JURNAL KBM */}
      {activeTab === 'jurnal' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                Supervisi Jurnal Mengajar KBM Guru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan keterlaksanaan KBM harian di seluruh rombel dan mata pelajaran.
              </p>
            </div>

            <button
              onClick={() => onOpenTab('journal')}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka Menu Jurnal KBM Lengkap</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Mata Pelajaran & Guru</th>
                  <th className="py-3 px-4">Materi / Sub Pokok Bahasan</th>
                  <th className="py-3 px-4 text-center">Kehadiran Siswa</th>
                  <th className="py-3 px-4">Catatan KBM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachingJournals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada data jurnal mengajar KBM yang terisi.
                    </td>
                  </tr>
                ) : (
                  teachingJournals.map((j, idx) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {j.tanggal} <span className="text-[10px] text-slate-500 font-normal">({j.jamPelajaran})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-xs">
                          Kelas {j.kelas}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{j.mapel}</div>
                        <div className="text-[11px] text-slate-500">{j.guruNama}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs font-medium text-slate-800">
                        {j.materiPokok}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-full text-[11px]">
                          {j.hadir} / {j.totalSiswa || (j.hadir + j.sakit + j.izin + j.alpa)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic">
                        {j.catatanRefleksi || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPERVISI PRESENSI SISWA & GURU */}
      {activeTab === 'presensi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Siswa Breakdown per Kelas */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 text-amber-600" />
              Presensi Siswa per Rombel Hari Ini
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3 text-center">Total</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">Hadir</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">Telat</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">S/I</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">Alpa</th>
                    <th className="py-2.5 px-3 text-right">% Presentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classBreakdown.map((c) => (
                    <tr key={c.cls} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-extrabold text-slate-900">Kelas {c.cls}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{c.total}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{c.hadir}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">{c.terlambat}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">{c.sakit + c.izin}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">{c.alpa}</td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                          c.pct >= 90 ? 'bg-emerald-100 text-emerald-800' : c.pct >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {c.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kehadiran Guru Hari Ini */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <GraduationCap className="w-5 h-5 text-amber-600" />
              Kehadiran Dewan Guru & Tendik Hari Ini
            </h3>

            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 bg-slate-100 z-10">
                    <th className="py-2.5 px-3">Nama Guru</th>
                    <th className="py-2.5 px-3">Mapel Utama</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Waktu Datang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => {
                    const rec = todayTeacherRecords.find((r) => r.teacherId === t.id);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {t.nama}
                          <div className="text-[10px] text-slate-500 font-normal">NUPTK: {t.nip || '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{t.mapel || 'Guru Pengajar'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            rec?.status === 'Hadir'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec?.kategori === 'Dinas Luar'
                              ? 'bg-blue-100 text-blue-800'
                              : rec?.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rec?.status || 'Belum Absen'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 font-bold">
                          {rec?.waktu ? `${rec.waktu} WIB` : '-'}
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

      {/* TAB 4: SUPERVISI NILAI & CAPAIAN RAPOR */}
      {activeTab === 'nilai' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Supervisi Capaian Pembelajaran & Nilai Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring ketercapaian KKM (75) dan distribusi nilai harian/ujian.
              </p>
            </div>

            <button
              onClick={() => onOpenTab('grades')}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka Menu Olah Nilai Lengkap</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">KKM Default Sekolah</div>
              <div className="text-2xl font-black text-emerald-950">75.0</div>
              <div className="text-[11px] text-emerald-700">Target ketuntasan minimal hasil belajar.</div>
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Total Data Nilai Terinput</div>
              <div className="text-2xl font-black text-indigo-950">{grades.length} Rekam</div>
              <div className="text-[11px] text-indigo-700">Tugas, Ulangan Harian, UTS, & UAS.</div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Rata-Rata Rapor Sekolah</div>
              <div className="text-2xl font-black text-amber-950">
                {grades.length > 0 ? Math.round(grades.reduce((a, b) => a + (b.nilai || 0), 0) / grades.length) : 85}
              </div>
              <div className="text-[11px] text-amber-700">Pencapaian akademik melampaui KKM.</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CETAK LAPORAN SUPERVISI KEPSEK */}
      {activeTab === 'laporan' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                Cetak Laporan Supervisi Eksekutif Sekolah
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cetak dokumen rekapitulasi kehadiran dan KBM resmi bertanda tangan Kepala Sekolah.
              </p>
            </div>

            <button
              onClick={() => triggerDirectPrint()}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF Laporan</span>
            </button>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-w-2xl mx-auto">
            <div className="text-center space-y-1 pb-4 border-b border-slate-200">
              <h4 className="font-black text-slate-900 text-sm uppercase">{schoolConfig.namaSekolah}</h4>
              <p className="text-xs text-slate-600">LAPORAN SUPERVISI AKADEMIK & OPERASIONAL SEKOLAH</p>
              <p className="text-[11px] text-slate-500 font-mono">Periode Hari Ini: {todayStr}</p>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Presentase Kehadiran Siswa:</span>
                <strong className="text-slate-900">{studentStats.percentHadir}% ({studentStats.hadir + studentStats.terlambat}/{studentStats.total} Siswa)</strong>
              </div>
              <div className="flex justify-between">
                <span>Presentase Kehadiran Guru:</span>
                <strong className="text-slate-900">{teacherStats.percentHadir}% ({teacherStats.hadir + teacherStats.dinasLuar}/{teacherStats.total} Guru)</strong>
              </div>
              <div className="flex justify-between">
                <span>Jurnal KBM Terisi:</span>
                <strong className="text-slate-900">{todayJournals.length} Sesi Pembelajaran</strong>
              </div>
              <div className="flex justify-between">
                <span>Izin & Dinas Luar Disetujui:</span>
                <strong className="text-slate-900">{teacherLeaves.filter(l => l.statusPengajuan === 'Disetujui').length} Berkas Disposisi</strong>
              </div>
            </div>

            <div className="pt-8 flex justify-end text-center text-xs text-slate-800">
              <div className="space-y-12">
                <div>
                  <p>Cikadu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold mt-1">Kepala Sekolah {schoolConfig.namaSekolah}</p>
                </div>
                <div>
                  <p className="font-black underline uppercase">{schoolConfig.namaKepsek || 'CUNCUN MUHLISOH, S.Pd.'}</p>
                  <p className="text-[11px] text-slate-600 font-mono">NUPTK: {schoolConfig.nipKepsek || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
