import React, { useState, useMemo } from 'react';
import { 
  TeacherUser, 
  TeacherAttendanceRecord, 
  TeacherLeaveRequest, 
  SchoolConfig, 
  AuthUser,
  AttendanceStatus 
} from '../types';
import { PeriodFilterBar } from './PeriodFilterBar';
import { TimePeriodFilter, filterItemsByPeriod } from '../utils/datePeriodUtils';
import { exportTeacherAttendanceExcel } from '../utils/exportExcel';
import { generateQrDataUrl, downloadQrZipForTeachers } from '../utils/qr';
import { generateTeacherAttendanceRecapPdf, generateTeacherDailyAttendancePdf } from '../utils/exportPdf';
import { soundService } from '../utils/audio';
import { useToast } from '../context/ToastContext';
import { 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Trash2,
  QrCode,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Download,
  Copy,
  FileArchive,
  Loader2,
  Check,
  Printer,
  Calendar,
  Grid
} from 'lucide-react';

interface TeacherAttendanceManagementProps {
  teachers: TeacherUser[];
  records: TeacherAttendanceRecord[];
  leaveRequests: TeacherLeaveRequest[];
  schoolConfig: SchoolConfig;
  currentUser: AuthUser | null;
  onSaveRecord: (record: TeacherAttendanceRecord) => Promise<void>;
  onSaveLeave: (leave: TeacherLeaveRequest) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onDeleteLeave: (id: string) => Promise<void>;
  onOpenCardPrinter: () => void;
}

export const TeacherAttendanceManagement: React.FC<TeacherAttendanceManagementProps> = ({
  teachers,
  records,
  leaveRequests,
  schoolConfig,
  currentUser,
  onSaveRecord,
  onSaveLeave,
  onDeleteRecord,
  onDeleteLeave,
  onOpenCardPrinter,
}) => {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'rekap' | 'matriks' | 'mandiri' | 'izin' | 'qr-generator'>('rekap');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodFilter>('hari');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQrQuery, setSearchQrQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');

  // Matrix Recap States
  const [selectedMonth, setSelectedMonth] = useState<string>('Oktober');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // QR Code States
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isZippingQr, setIsZippingQr] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pre-generate QR Code data URLs for all teachers
  React.useEffect(() => {
    let isSubscribed = true;
    const generateAll = async () => {
      const newMap: Record<string, string> = {};
      for (const t of teachers) {
        const qrVal = t.nip && t.nip !== '-' ? t.nip : t.username || t.id;
        const url = await generateQrDataUrl(qrVal, 350);
        newMap[t.id] = url;
      }
      if (isSubscribed) {
        setQrMap(newMap);
      }
    };
    generateAll();
    return () => {
      isSubscribed = false;
    };
  }, [teachers]);

  // Modal States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedTeacherForManual, setSelectedTeacherForManual] = useState<TeacherUser | null>(null);

  // Form states for manual attendance
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('Hadir');
  const [manualSesi, setManualSesi] = useState<'Masuk' | 'Pulang'>('Masuk');
  const [manualCatatan, setManualCatatan] = useState('');
  const [manualWaktu, setManualWaktu] = useState(() => new Date().toTimeString().slice(0, 5));

  // Form states for teacher leave request
  const [leaveJenis, setLeaveJenis] = useState<'Sakit' | 'Izin' | 'Dinas Luar' | 'Cuti'>('Dinas Luar');
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEnd, setLeaveEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveAlasan, setLeaveAlasan] = useState('');

  // Filter records by period
  const filteredByPeriodRecords = useMemo(() => {
    return filterItemsByPeriod(records, (r) => r.tanggal, selectedPeriod, customDate);
  }, [records, selectedPeriod, customDate]);

  // Apply search & status filter
  const displayedRecords = useMemo(() => {
    return filteredByPeriodRecords.filter((r) => {
      const matchSearch = 
        r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.nip && r.nip.includes(searchQuery)) ||
        (r.mapel && r.mapel.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'Semua' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [filteredByPeriodRecords, searchQuery, statusFilter]);

  // Compute KPI Statistics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = useMemo(() => {
    return records.filter((r) => r.tanggal === todayStr && r.sesi === 'Masuk');
  }, [records, todayStr]);

  const kpiStats = useMemo(() => {
    const totalTeachers = teachers.length;
    const hadir = todayRecords.filter((r) => r.status === 'Hadir').length;
    const terlambat = todayRecords.filter((r) => r.status === 'Terlambat').length;
    const izinSakitDinas = todayRecords.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
    const alpa = Math.max(0, totalTeachers - (hadir + terlambat + izinSakitDinas));
    const percentHadir = totalTeachers > 0 ? Math.round(((hadir + terlambat) / totalTeachers) * 100) : 0;

    return { totalTeachers, hadir, terlambat, izinSakitDinas, alpa, percentHadir };
  }, [teachers, todayRecords]);

  // Check if current user logged in is a teacher
  const currentTeacherObj = useMemo(() => {
    if (!currentUser) return null;
    return teachers.find((t) => t.id === currentUser.id || t.username === currentUser.username || t.nip === currentUser.nip) || null;
  }, [currentUser, teachers]);

  // Current teacher's status today
  const myTodayRecord = useMemo(() => {
    if (!currentTeacherObj) return null;
    return records.find((r) => r.teacherId === currentTeacherObj.id && r.tanggal === todayStr && r.sesi === 'Masuk');
  }, [currentTeacherObj, records, todayStr]);

  // Handle Self Check-In
  const handleSelfCheckIn = async (sesi: 'Masuk' | 'Pulang') => {
    if (!currentTeacherObj) {
      toast.error('Gagal Absen', 'Sesi login guru tidak ditemukan.');
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    // Determine status (Hadir vs Terlambat for Masuk)
    let status: AttendanceStatus = 'Hadir';
    let catatan = 'Absen Mandiri Portal Guru';

    if (sesi === 'Masuk') {
      const currentHoursMinutes = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentHoursMinutes > '07:15') {
        status = 'Terlambat';
        catatan = 'Absen Mandiri (Terlambat)';
      }
    }

    const recordId = `PRESENSI_GURU_${currentTeacherObj.id}_${dateStr}_${sesi}`;
    const newRecord: TeacherAttendanceRecord = {
      id: recordId,
      tanggal: dateStr,
      waktu: timeStr,
      teacherId: currentTeacherObj.id,
      nip: currentTeacherObj.nip || '-',
      nama: currentTeacherObj.nama,
      mapel: currentTeacherObj.mapel,
      sesi,
      status,
      kategori: 'Absen Mandiri',
      catatan,
    };

    try {
      await onSaveRecord(newRecord);
      soundService.playSuccess();
      toast.success('Presensi Berhasil', `Terima kasih Bpk/Ibu ${currentTeacherObj.nama}, presensi ${sesi} Anda telah dicatat!`);
    } catch {
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat mencatat presensi.');
    }
  };

  // Submit Manual Attendance Modal
  const handleSaveManualAttendance = async () => {
    if (!selectedTeacherForManual) {
      toast.error('Pilih Guru', 'Silakan pilih guru terlebih dahulu.');
      return;
    }

    const dateStr = todayStr;
    const recordId = `PRESENSI_GURU_${selectedTeacherForManual.id}_${dateStr}_${manualSesi}`;
    const newRecord: TeacherAttendanceRecord = {
      id: recordId,
      tanggal: dateStr,
      waktu: `${manualWaktu}:00`,
      teacherId: selectedTeacherForManual.id,
      nip: selectedTeacherForManual.nip || '-',
      nama: selectedTeacherForManual.nama,
      mapel: selectedTeacherForManual.mapel,
      sesi: manualSesi,
      status: manualStatus,
      kategori: 'Petugas Piket',
      catatan: manualCatatan || `Presensi Manual oleh ${currentUser?.nama || 'Admin'}`,
    };

    await onSaveRecord(newRecord);
    toast.success('Presensi Disimpan', `Presensi untuk ${selectedTeacherForManual.nama} berhasil diperbarui.`);
    setIsManualModalOpen(false);
    setSelectedTeacherForManual(null);
  };

  // Submit Teacher Leave Request
  const handleSaveLeaveRequest = async () => {
    if (!currentUser && !currentTeacherObj) {
      toast.error('Akses Ditolak', 'Silakan login terlebih dahulu.');
      return;
    }

    const teacher = currentTeacherObj || {
      id: currentUser?.id || 'T_ADMIN',
      nip: currentUser?.nip || '-',
      nama: currentUser?.nama || 'Guru',
    };

    if (!leaveAlasan.trim()) {
      toast.error('Alasan Wajib Diisi', 'Mohon isi alasan permohonan izin/dinas luar.');
      return;
    }

    const newLeave: TeacherLeaveRequest = {
      id: `TL_${Date.now()}`,
      teacherId: teacher.id,
      nip: teacher.nip,
      nama: teacher.nama,
      jenis: leaveJenis,
      tanggalMulai: leaveStart,
      tanggalSelesai: leaveEnd,
      alasan: leaveAlasan,
      statusPengajuan: currentUser?.role === 'admin' ? 'Disetujui' : 'Menunggu',
      tanggalPengajuan: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().slice(0, 5)}`,
      disetujuiOleh: currentUser?.role === 'admin' ? currentUser.nama : undefined,
    };

    await onSaveLeave(newLeave);
    toast.success('Pengajuan Dikirim', `Permohonan ${leaveJenis} telah berhasil dikirim.`);
    setIsLeaveModalOpen(false);
    setLeaveAlasan('');
  };

  // QR Code Single Download
  const handleDownloadSingleQr = (teacher: TeacherUser) => {
    const dataUrl = qrMap[teacher.id];
    if (!dataUrl) {
      toast.error('Gagal Mengunduh', 'QR Code sedang diproses...');
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_GURU_${teacher.nip || teacher.id}_${teacher.nama.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code Diunduh', `QR Code ${teacher.nama} berhasil disimpan.`);
  };

  // Copy QR text
  const handleCopyQrCodeText = (teacher: TeacherUser) => {
    const qrVal = teacher.nip && teacher.nip !== '-' ? teacher.nip : teacher.username || teacher.id;
    navigator.clipboard.writeText(qrVal);
    setCopiedId(teacher.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.info('Teks Disalin', `Kode QR (${qrVal}) berhasil disalin ke clipboard.`);
  };

  // Bulk ZIP Download
  const handleDownloadAllTeacherQrZip = async () => {
    if (teachers.length === 0) {
      toast.error('Tidak Ada Data', 'Belum ada data guru/tendik.');
      return;
    }
    setIsZippingQr(true);
    try {
      await downloadQrZipForTeachers(teachers, 'SEMUA_GURU', schoolConfig.namaSekolah);
      toast.success('Unduh ZIP Berhasil', `${teachers.length} file QR Code Guru berhasil dikompresi.`);
    } catch {
      toast.error('Gagal Mengunduh', 'Terjadi kesalahan saat mengompresi QR Code.');
    } finally {
      setIsZippingQr(false);
    }
  };

  // Filtered teachers for QR sub-tab
  const filteredTeachersForQr = useMemo(() => {
    if (!searchQrQuery.trim()) return teachers;
    const q = searchQrQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.nama.toLowerCase().includes(q) ||
        (t.nip && t.nip.includes(q)) ||
        (t.mapel && t.mapel.toLowerCase().includes(q)) ||
        (t.username && t.username.toLowerCase().includes(q))
    );
  }, [teachers, searchQrQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-teal-100 border border-white/20">
              <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
              Portal Kedisiplinan & Presensi Guru/Tendik
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Absensi Guru & Tenaga Kependidikan
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm max-w-xl">
              Pencatatan presensi realtime via QR Code Kiosk, Absen Mandiri HP, Izin Dinas Luar, serta Rekapitulasi Otomatis Harian hingga Tahunan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCardPrinter}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 backdrop-blur-sm transition-all cursor-pointer shadow-md hover:scale-105"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              Cetak Kartu QR Guru
            </button>
            <button
              onClick={() => exportTeacherAttendanceExcel(displayedRecords, schoolConfig, selectedPeriod)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer hover:scale-105"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Ekspor Excel
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('rekap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'rekap'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Rekap Presensi Harian
        </button>
        <button
          onClick={() => setActiveSubTab('matriks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'matriks'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Grid className="w-4 h-4 text-emerald-300" />
          Matriks Kehadiran Bulanan
        </button>
        <button
          onClick={() => setActiveSubTab('mandiri')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'mandiri'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Absen Mandiri Guru
        </button>
        <button
          onClick={() => setActiveSubTab('izin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'izin'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Izin & Dinas Luar Guru
        </button>
        <button
          onClick={() => setActiveSubTab('qr-generator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'qr-generator'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4 text-amber-400" />
          Generate QR Code Guru & Tendik
        </button>
      </div>

      {/* KPI Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Total Guru/Staff</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-800">{kpiStats.totalTeachers}</span>
            <span className="text-[10px] font-semibold text-slate-400">Orang</span>
          </div>
        </div>

        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-700">Hadir Tepat Waktu</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{kpiStats.hadir}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-700">Terlambat</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{kpiStats.terlambat}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-700">Izin / Sakit / Dinas</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-700">{kpiStats.izinSakitDinas}</span>
            <AlertCircle className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-rose-700">Alpa / Belum Absen</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-700">{kpiStats.alpa}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-indigo-700">% Kehadiran</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-indigo-700">{kpiStats.percentHadir}%</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Period Filter Bar */}
      <PeriodFilterBar
        period={selectedPeriod}
        onChangePeriod={setSelectedPeriod}
        customDate={customDate}
        onChangeCustomDate={setCustomDate}
      />

      {/* SUB-TAB 1: REKAP PRESENSI GURU */}
      {activeSubTab === 'rekap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Action Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama guru / NUPTK / ID / mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              >
                <option value="Semua">Semua Status</option>
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin / Dinas Luar</option>
                <option value="Sakit">Sakit</option>
                <option value="Alpa">Alpa</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const label = selectedPeriod === 'hari'
                    ? `Hari ini (${customDate})`
                    : selectedPeriod === 'bulan'
                    ? `Bulan (${customDate.substring(0, 7)})`
                    : selectedPeriod === 'minggu'
                    ? `Minggu (${customDate})`
                    : `Periode (${customDate})`;
                  generateTeacherDailyAttendancePdf({
                    records: displayedRecords,
                    teachers,
                    schoolConfig,
                    periodeLabel: label,
                    piketName: currentUser?.nama || schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
                    piketNip: currentUser?.nip || schoolConfig.nipPetugasPiket || '-',
                  });
                  toast.success('PDF Rekap Diunduh', 'Dokumen PDF rekapitulasi presensi harian guru/tendik berhasil dibuat.');
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Rekap</span>
              </button>

              <button
                onClick={() => {
                  exportTeacherAttendanceExcel(displayedRecords, schoolConfig, `Harian_${customDate}`);
                  toast.success('Excel Rekap Diunduh', 'File Excel rekap presensi guru berhasil dibuat.');
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel</span>
              </button>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Input Presensi Manual</span>
              </button>
            </div>
          </div>

          {/* Table List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">Tanggal & Waktu</th>
                  <th className="py-3 px-4">Nama Guru / Tendik</th>
                  <th className="py-3 px-4">Mapel Utama</th>
                  <th className="py-3 px-4">Sesi</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Metode Absen</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      Belum ada data presensi guru untuk periode/kriteria yang dipilih.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.map((r, idx) => {
                    const statusBadgeClass =
                      r.status === 'Hadir'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : r.status === 'Terlambat'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : r.status === 'Izin' || r.status === 'Sakit'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{r.tanggal}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{r.waktu} WIB</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{r.nama}</div>
                          <div className="text-[10px] text-slate-500 font-mono">NUPTK/ID: {r.nip || '-'}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{r.mapel || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            r.sesi === 'Masuk' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'
                          }`}>
                            {r.sesi}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${statusBadgeClass}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{r.kategori || 'Kiosk QR'}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {r.catatan || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onDeleteRecord(r.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Presensi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* SUB-TAB MATRIKS: REKAPITULASI KEHADIRAN BULANAN MATRIKS */}
      {activeSubTab === 'matriks' && (() => {
        const monthNamesIndo = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const monthIdx = monthNamesIndo.indexOf(selectedMonth);
        const daysInMonth = new Date(selectedYear, monthIdx >= 0 ? monthIdx + 1 : 10, 0).getDate();
        const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const monthStrPadded = String((monthIdx >= 0 ? monthIdx : 9) + 1).padStart(2, '0');
        const monthPrefix = `${selectedYear}-${monthStrPadded}`;

        const monthRecords = records.filter((r) => r.tanggal && r.tanggal.startsWith(monthPrefix));

        return (
          <div className="space-y-6">
            {/* Header Control Bar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Grid className="w-5 h-5 text-emerald-600" />
                  Matriks & Laporan Kehadiran Guru/Tendik Bulanan
                </h2>
                <p className="text-xs text-slate-500">
                  Rekapitulasi tanggal per tanggal kehadiran, jam datang, serta statistik persentase kedisiplinan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Month Selector */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  {monthNamesIndo.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {/* Year Selector */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value={2026}>Tahun 2026</option>
                  <option value={2025}>Tahun 2025</option>
                  <option value={2027}>Tahun 2027</option>
                </select>

                {/* PDF Print Button */}
                <button
                  onClick={() => generateTeacherAttendanceRecapPdf({
                    teachers,
                    records,
                    leaveRequests,
                    schoolConfig,
                    bulanNama: selectedMonth,
                    tahun: selectedYear,
                    piketName: currentUser?.nama || schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
                    piketNip: currentUser?.nip || schoolConfig.nipPetugasPiket || '-',
                  })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak PDF Resmi
                </button>

                {/* Excel Export Button */}
                <button
                  onClick={() => exportTeacherAttendanceExcel(monthRecords, schoolConfig, `${selectedMonth}_${selectedYear}`)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Ekspor Excel
                </button>
              </div>
            </div>

            {/* Matrix Legend Badge Bar */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="text-slate-500 font-bold">Keterangan Matriks:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                H = Hadir Tepat Waktu
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                T = Terlambat
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                I/S = Izin / Sakit
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">
                DL = Dinas Luar
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                A = Alpa
              </span>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <th className="p-2 w-8 text-center border-r border-slate-200">No</th>
                      <th className="p-2 min-w-[140px] border-r border-slate-200">Nama Guru / Tendik</th>
                      <th className="p-2 min-w-[120px] border-r border-slate-200">Mapel / Peran</th>
                      {dayNumbers.map((d) => (
                        <th key={d} className="p-1 w-7 text-center border-r border-slate-200 font-mono">
                          {d}
                        </th>
                      ))}
                      <th className="p-1 text-center bg-emerald-50 text-emerald-800 border-r border-slate-200">H</th>
                      <th className="p-1 text-center bg-amber-50 text-amber-800 border-r border-slate-200">T</th>
                      <th className="p-1 text-center bg-blue-50 text-blue-800 border-r border-slate-200">I/S</th>
                      <th className="p-1 text-center bg-rose-50 text-rose-800 border-r border-slate-200">A</th>
                      <th className="p-2 text-center bg-slate-200 text-slate-800 font-black min-w-[50px]">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {teachers.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth + 9} className="py-12 text-center text-slate-400">
                          Belum ada data guru / tendik terdaftar.
                        </td>
                      </tr>
                    ) : (
                      teachers.map((t, idx) => {
                        const tRecs = monthRecords.filter((r) => r.teacherId === t.id);

                        let countH = 0;
                        let countT = 0;
                        let countIS = 0;
                        let countA = 0;

                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 text-center font-bold text-slate-400 border-r border-slate-200">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                              {t.nama}
                              <div className="text-[9px] font-mono text-slate-400 font-normal">NUPTK/ID: {t.nip || '-'}</div>
                            </td>
                            <td className="p-2 text-slate-600 border-r border-slate-200 whitespace-nowrap">{t.mapel || 'Tendik'}</td>

                            {/* Render Day Cells */}
                            {dayNumbers.map((d) => {
                              const dayPadded = String(d).padStart(2, '0');
                              const dateStr = `${monthPrefix}-${dayPadded}`;
                              const dateObj = new Date(selectedYear, monthIdx, d);
                              const isSunday = dateObj.getDay() === 0;

                              const rec = tRecs.find((r) => r.tanggal === dateStr);

                              let label = '-';
                              let cellClass = 'text-slate-300';

                              if (rec) {
                                if (rec.status === 'Hadir') {
                                  label = 'H';
                                  cellClass = 'bg-emerald-500 text-white font-black';
                                  countH++;
                                } else if (rec.status === 'Terlambat') {
                                  label = 'T';
                                  cellClass = 'bg-amber-400 text-slate-900 font-black';
                                  countT++;
                                } else if (rec.status === 'Izin' || rec.status === 'Sakit') {
                                  label = rec.kategori === 'Dinas Luar' ? 'DL' : 'I';
                                  cellClass = 'bg-blue-500 text-white font-black';
                                  countIS++;
                                } else if (rec.status === 'Alpa') {
                                  label = 'A';
                                  cellClass = 'bg-rose-500 text-white font-black';
                                  countA++;
                                }
                              } else if (isSunday) {
                                cellClass = 'bg-rose-50 text-rose-300 font-bold';
                              }

                              return (
                                <td key={d} className={`p-0.5 text-center border-r border-slate-100 font-mono text-[10px] ${cellClass}`}>
                                  {label}
                                </td>
                              );
                            })}

                            {/* Summary Columns */}
                            <td className="p-1 text-center font-bold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">{countH}</td>
                            <td className="p-1 text-center font-bold text-amber-700 bg-amber-50/50 border-r border-slate-200">{countT}</td>
                            <td className="p-1 text-center font-bold text-blue-700 bg-blue-50/50 border-r border-slate-200">{countIS}</td>
                            <td className="p-1 text-center font-bold text-rose-700 bg-rose-50/50 border-r border-slate-200">{countA}</td>
                            
                            {/* % Attendance */}
                            {(() => {
                              const totalLogged = countH + countT + countIS + countA;
                              const pct = totalLogged > 0 ? Math.round(((countH + countT) / totalLogged) * 100) : 100;
                              return (
                                <td className={`p-2 text-center font-black text-xs ${
                                  pct >= 90 ? 'text-emerald-700' : pct >= 75 ? 'text-amber-700' : 'text-rose-700'
                                }`}>
                                  {pct}%
                                </td>
                              );
                            })()}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SUB-TAB 2: ABSEN MANDIRI GURU */}
      {activeSubTab === 'mandiri' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2 border-b border-slate-100 pb-6">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-2xl mb-2">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Absen Mandiri Perangkat Guru</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Lakukan konfirmasi kehadiran harian (Masuk/Pulang) secara mandiri dari smartphone/laptop Anda.
            </p>
          </div>

          {currentTeacherObj ? (
            <div className="space-y-6">
              {/* Profile info card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">Akun Teridentifikasi:</div>
                  <div className="font-black text-slate-800 text-base">{currentTeacherObj.nama}</div>
                  <div className="text-xs text-slate-500">NUPTK/ID: {currentTeacherObj.nip || '-'} • Mapel: {currentTeacherObj.mapel}</div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                  Aktif
                </span>
              </div>

              {/* Status today */}
              {myTodayRecord ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-800">Anda Sudah Absen Hari Ini!</div>
                    <div className="text-xs text-emerald-700">
                      Waktu Datang: <strong>{myTodayRecord.waktu} WIB</strong> ({myTodayRecord.status})
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div className="text-xs text-amber-800 font-medium">
                    Anda belum melakukan presensi <strong>Masuk</strong> untuk hari ini. Silakan klik tombol di bawah.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelfCheckIn('Masuk')}
                  className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-102"
                >
                  <UserCheck className="w-6 h-6" />
                  Absen Masuk
                </button>

                <button
                  onClick={() => handleSelfCheckIn('Pulang')}
                  className="py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-102"
                >
                  <Clock className="w-6 h-6" />
                  Absen Pulang
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                Silakan login menggunakan akun Guru/Tendik Anda untuk menggunakan fitur Absen Mandiri.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: IZIN & DINAS LUAR GURU */}
      {activeSubTab === 'izin' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Daftar Permohonan Izin & Dinas Luar Guru</h2>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Buat Pengajuan Izin / Dinas Luar
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">Nama Guru</th>
                  <th className="py-3 px-4">Jenis Permohonan</th>
                  <th className="py-3 px-4">Tanggal Tanggal</th>
                  <th className="py-3 px-4">Alasan / Tugas</th>
                  <th className="py-3 px-4">Status Pengajuan</th>
                  <th className="py-3 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada catatan permohonan izin atau dinas luar guru.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((l, idx) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{l.nama}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 font-bold rounded-md bg-purple-50 text-purple-700">
                          {l.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {l.tanggalMulai} s/d {l.tanggalSelesai}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-slate-600">{l.alasan}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                          l.statusPengajuan === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {l.statusPengajuan}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onDeleteLeave(l.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: GENERATE QR CODE GURU & TENDIK */}
      {activeSubTab === 'qr-generator' && (
        <div className="space-y-6">
          {/* Header Action Bar for QR Generator */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                Generate & Unduh QR Code Khusus Guru & Tendik
              </h2>
              <p className="text-xs text-slate-500">
                Gunakan QR Code ini untuk kartu identitas, pemindaian di mesin Kiosk gerbang, atau presensi mandiri.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama guru / NUPTK / ID..."
                  value={searchQrQuery}
                  onChange={(e) => setSearchQrQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleDownloadAllTeacherQrZip}
                disabled={isZippingQr || teachers.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                {isZippingQr ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Membuat ZIP...
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    Unduh Semua QR Guru (ZIP)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grid Cards of Teacher QR Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTeachersForQr.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
                <QrCode className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-xs font-medium">Tidak ada data guru/tendik yang sesuai pencarian.</p>
              </div>
            ) : (
              filteredTeachersForQr.map((t) => {
                const qrUrl = qrMap[t.id];
                const qrVal = t.nip && t.nip !== '-' ? t.nip : t.username || t.id;

                return (
                  <div key={t.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col items-center justify-between text-center space-y-4 relative group">
                    <div className="w-full space-y-2">
                      {/* Avatar / Badge Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px] rounded-full">
                          Guru / Tendik
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {t.status || 'Aktif'}
                        </span>
                      </div>

                      {/* QR Code Container */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block my-2 relative group-hover:scale-105 transition-transform">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={`QR ${t.nama}`}
                            className="w-36 h-36 object-contain mx-auto"
                          />
                        ) : (
                          <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}
                        <div className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                          {qrVal}
                        </div>
                      </div>

                      {/* Teacher Profile Info */}
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{t.nama}</h3>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{t.mapel || 'Pendidik'}</p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">NUPTK/ID: {t.nip || '-'}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleDownloadSingleQr(t)}
                        className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                        title="Unduh file PNG QR Code"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Unduh PNG
                      </button>

                      <button
                        onClick={() => handleCopyQrCodeText(t)}
                        className="flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
                        title="Salin isi teks QR Code"
                      >
                        {copiedId === t.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Disalin!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Salin Teks
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL INPUT PRESENSI MANUAL GURU */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3">Input Presensi Manual Guru</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Guru / Tendik</label>
                <select
                  value={selectedTeacherForManual?.id || ''}
                  onChange={(e) => {
                    const found = teachers.find((t) => t.id === e.target.value);
                    setSelectedTeacherForManual(found || null);
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Nama Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} ({t.mapel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sesi Presensi</label>
                  <select
                    value={manualSesi}
                    onChange={(e) => setManualSesi(e.target.value as 'Masuk' | 'Pulang')}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  >
                    <option value="Masuk">Masuk Pagi</option>
                    <option value="Pulang">Kepulangan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Datang</label>
                  <input
                    type="time"
                    value={manualWaktu}
                    onChange={(e) => setManualWaktu(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="Hadir">Hadir Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Izin">Izin / Dinas Luar</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Keterangan</label>
                <input
                  type="text"
                  placeholder="Keterangan opsional..."
                  value={manualCatatan}
                  onChange={(e) => setManualCatatan(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveManualAttendance}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Simpan Presensi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUAT IZIN / DINAS LUAR GURU */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3">Form Permohonan Izin / Dinas Luar Guru</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Permohonan</label>
                <select
                  value={leaveJenis}
                  onChange={(e) => setLeaveJenis(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="Dinas Luar">Dinas Luar / Tugas Sekolah</option>
                  <option value="Izin">Izin Keperluan Pribadi</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Cuti">Cuti Tahunan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan / Deskripsi Tugas Dinas</label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan keterangan rinci permohonan..."
                  value={leaveAlasan}
                  onChange={(e) => setLeaveAlasan(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveLeaveRequest}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Kirim Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
