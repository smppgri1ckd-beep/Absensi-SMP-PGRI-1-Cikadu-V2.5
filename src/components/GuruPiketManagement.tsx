import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  Phone, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  X,
  Search,
  FileText,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { JadwalPiketHarian, PetugasPiketItem, DayOfWeek, TeacherUser, SchoolConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';
import { INITIAL_JADWAL_PIKET } from '../services/db';

interface GuruPiketManagementProps {
  jadwalPiket: JadwalPiketHarian[];
  onSaveJadwalPiket: (jadwal: JadwalPiketHarian[]) => Promise<void>;
  teachers: TeacherUser[];
  onSaveTeacher?: (teacher: TeacherUser) => Promise<void>;
  schoolConfig: SchoolConfig;
  setActiveTab?: (tab: string) => void;
}

const DAYS_LIST: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const PERAN_PRESETS = [
  'Koordinator Piket & Apel Utama',
  'Piket Gerbang & Pemindai QR Pagi',
  'Piket Apel Pagi & Siang per Rombel',
  'Piket Pemeriksaan Izin & Surat Dokter',
  'Piket Ketertiban, Disiplin & Kerapian',
  'Piket Pengawasan KBM & Jam Efektif',
  'Piket Ketertiban Sholat Dhuha / Dzuhur',
  'Piket Pemantau Kepulangan Siswa',
];

export const GuruPiketManagement: React.FC<GuruPiketManagementProps> = ({
  jadwalPiket,
  onSaveJadwalPiket,
  teachers,
  onSaveTeacher,
  schoolConfig,
  setActiveTab,
}) => {
  const { user, actingAsPiket, setActingAsPiket } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Determine current day of week in Indonesian
  const currentDayOfWeek = useMemo<DayOfWeek | null>(() => {
    const dayIdx = new Date().getDay();
    const map: Record<number, DayOfWeek> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };
    return map[dayIdx] || null;
  }, []);

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'jadwal' | 'distribusi'>('jadwal');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Modal State for Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ day: DayOfWeek; item: PetugasPiketItem } | null>(null);

  // Form Fields
  const [formHari, setFormHari] = useState<DayOfWeek>('Senin');
  const [formTeacherId, setFormTeacherId] = useState<string>('');
  const [formNama, setFormNama] = useState<string>('');
  const [formNip, setFormNip] = useState<string>('');
  const [formNomorHp, setFormNomorHp] = useState<string>('');
  const [formPeran, setFormPeran] = useState<string>('Koordinator Piket & Apel Utama');
  const [formJamMulai, setFormJamMulai] = useState<string>('06:30');
  const [formJamSelesai, setFormJamSelesai] = useState<string>('14:30');
  const [formRoleAuthorityMode, setFormRoleAuthorityMode] = useState<'dual_role' | 'permanent_piket' | 'schedule_only'>('dual_role');
  const [formError, setFormError] = useState<string | null>(null);

  // Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Bulk delete state
  const [selectedOfficerKeys, setSelectedOfficerKeys] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Ensure all 6 days exist in data
  const normalizedJadwal = useMemo<JadwalPiketHarian[]>(() => {
    return DAYS_LIST.map((day) => {
      const existing = jadwalPiket.find((j) => j.hari === day);
      if (existing) return existing;
      const initialDefault = INITIAL_JADWAL_PIKET.find((j) => j.hari === day);
      return initialDefault || { hari: day, petugas: [] };
    });
  }, [jadwalPiket]);

  // Today's active duty teachers
  const todayOfficers = useMemo(() => {
    if (!currentDayOfWeek) return [];
    const dayData = normalizedJadwal.find((j) => j.hari === currentDayOfWeek);
    return dayData?.petugas || [];
  }, [normalizedJadwal, currentDayOfWeek]);

  // Teacher Piket Distribution Summary across all teachers
  const teacherDistribution = useMemo(() => {
    return teachers.map((t) => {
      const duties: { hari: DayOfWeek; peran: string; jam: string }[] = [];
      normalizedJadwal.forEach((j) => {
        j.petugas.forEach((p) => {
          if (
            (p.teacherId && p.teacherId === t.id) ||
            (p.nama && t.nama && p.nama.toLowerCase().trim() === t.nama.toLowerCase().trim()) ||
            (p.nip && t.nip && p.nip.trim() === t.nip.trim())
          ) {
            duties.push({
              hari: j.hari,
              peran: p.peran || 'Petugas Piket',
              jam: `${p.jamMulai || '06:30'} - ${p.jamSelesai || '14:30'}`,
            });
          }
        });
      });
      return {
        teacher: t,
        duties,
        totalDays: duties.length,
      };
    });
  }, [teachers, normalizedJadwal]);

  // Open modal to add new officer
  const handleOpenAddModal = (targetDay?: DayOfWeek, preselectedTeacherId?: string) => {
    setEditingItem(null);
    setFormHari(targetDay || (currentDayOfWeek || 'Senin'));
    setFormPeran('Koordinator Piket & Apel Utama');
    setFormJamMulai('06:30');
    setFormJamSelesai(targetDay === 'Jumat' ? '11:45' : '14:30');
    setFormRoleAuthorityMode('dual_role');
    setFormError(null);

    if (preselectedTeacherId) {
      handleTeacherSelect(preselectedTeacherId);
    } else {
      setFormTeacherId('');
      setFormNama('');
      setFormNip('');
      setFormNomorHp('');
    }
    setIsFormModalOpen(true);
  };

  // Open modal to edit existing officer
  const handleOpenEditModal = (day: DayOfWeek, item: PetugasPiketItem) => {
    setEditingItem({ day, item });
    setFormHari(day);
    setFormTeacherId(item.teacherId || '');
    setFormNama(item.nama);
    setFormNip(item.nip || '');
    setFormNomorHp(item.nomorHp || '');
    setFormPeran(item.peran || 'Koordinator Piket & Apel Utama');
    setFormJamMulai(item.jamMulai || '06:30');
    setFormJamSelesai(item.jamSelesai || '14:30');

    // Determine initial authority mode
    const matchedTeacher = teachers.find(
      (t) => (item.teacherId && t.id === item.teacherId) || 
      (t.nama && item.nama && t.nama.toLowerCase().trim() === item.nama.toLowerCase().trim())
    );
    if (matchedTeacher?.role === 'piket') {
      setFormRoleAuthorityMode('permanent_piket');
    } else if (item.syncUserRole === false) {
      setFormRoleAuthorityMode('schedule_only');
    } else {
      setFormRoleAuthorityMode('dual_role');
    }

    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Handle teacher select in dropdown
  const handleTeacherSelect = (teacherId: string) => {
    setFormTeacherId(teacherId);
    if (!teacherId) return;
    const selected = teachers.find((t) => t.id === teacherId);
    if (selected) {
      setFormNama(selected.nama);
      setFormNip(selected.nip || '');
      setFormNomorHp(selected.nomorHp || '');
      if (selected.role === 'piket') {
        setFormRoleAuthorityMode('permanent_piket');
      } else {
        setFormRoleAuthorityMode('dual_role');
      }
    }
  };

  // Save Add/Edit
  const handleSaveOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setFormError('Nama Petugas Guru Piket wajib diisi.');
      return;
    }

    try {
      const updated = normalizedJadwal.map((dayData) => {
        // If editing and changing day: remove from old day
        if (editingItem && editingItem.day === dayData.hari && editingItem.day !== formHari) {
          return {
            ...dayData,
            petugas: dayData.petugas.filter((p) => p.id !== editingItem.item.id),
          };
        }

        // If target day
        if (dayData.hari === formHari) {
          const newItem: PetugasPiketItem = {
            id: editingItem?.item.id || `piket_${formHari.toLowerCase()}_${Date.now()}`,
            teacherId: formTeacherId || undefined,
            nama: formNama.trim(),
            nip: formNip.trim() || undefined,
            nomorHp: formNomorHp.trim() || undefined,
            peran: formPeran.trim() || 'Koordinator Piket & Apel Utama',
            jamMulai: formJamMulai || '06:30',
            jamSelesai: formJamSelesai || '14:30',
            syncUserRole: formRoleAuthorityMode !== 'schedule_only',
          };

          if (editingItem && editingItem.day === formHari) {
            return {
              ...dayData,
              petugas: dayData.petugas.map((p) => (p.id === editingItem.item.id ? newItem : p)),
            };
          } else {
            return {
              ...dayData,
              petugas: [...dayData.petugas, newItem],
            };
          }
        }

        return dayData;
      });

      await onSaveJadwalPiket(updated);

      // Handle role updates based on formRoleAuthorityMode
      if (formTeacherId && onSaveTeacher) {
        const foundT = teachers.find((t) => t.id === formTeacherId);
        if (foundT && foundT.role !== 'admin') {
          if (formRoleAuthorityMode === 'permanent_piket' && foundT.role !== 'piket') {
            await onSaveTeacher({
              ...foundT,
              role: 'piket',
            }).catch(() => {});
          } else if (formRoleAuthorityMode === 'dual_role' && foundT.role === 'piket') {
            await onSaveTeacher({
              ...foundT,
              role: 'guru',
            }).catch(() => {});
          }
        }
      }

      setIsFormModalOpen(false);
      const authorityDesc = formRoleAuthorityMode === 'permanent_piket' 
        ? 'Petugas Piket Utama (Permanen)' 
        : formRoleAuthorityMode === 'dual_role'
        ? 'Dual-Role Cerdas (Guru Mapel + Piket Otomatis)'
        : 'Pencatatan Jadwal Saja';
      setFeedbackBanner({
        text: `Petugas Guru Piket (${formNama}) berhasil disimpan untuk hari ${formHari} dengan model: ${authorityDesc}!`,
        type: 'success',
      });
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch {
      setFormError('Gagal menyimpan jadwal piket. Coba lagi.');
    }
  };

  // Delete officer
  const handleDeleteOfficer = async (day: DayOfWeek, officerId: string, officerName: string) => {
    if (!window.confirm(`Hapus ${officerName} dari jadwal guru piket hari ${day}?`)) return;

    try {
      const updated = normalizedJadwal.map((dayData) => {
        if (dayData.hari === day) {
          return {
            ...dayData,
            petugas: dayData.petugas.filter((p) => p.id !== officerId),
          };
        }
        return dayData;
      });

      await onSaveJadwalPiket(updated);
      setSelectedOfficerKeys((prev) => prev.filter((k) => k !== `${day}___${officerId}`));
      setFeedbackBanner({
        text: `${officerName} telah dihapus dari jadwal piket hari ${day}.`,
        type: 'info',
      });
      setTimeout(() => setFeedbackBanner(null), 3500);
    } catch {
      alert('Gagal menghapus data petugas.');
    }
  };

  // Bulk delete officers
  const handleBulkDeleteOfficers = async () => {
    if (selectedOfficerKeys.length === 0) return;
    const count = selectedOfficerKeys.length;
    if (!window.confirm(`YAKIN INGIN MENGHAPUS ${count} PENUGASAN GURU PIKET TERPILIH?\n\nData penugasan piket terpilih akan benar-benar dihapus permanen dari database (Firestore & Penyimpanan Lokal). Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const selectedSet = new Set(selectedOfficerKeys);
      const updated = normalizedJadwal.map((dayData) => ({
        ...dayData,
        petugas: dayData.petugas.filter((p) => !selectedSet.has(`${dayData.hari}___${p.id}`)),
      }));

      await onSaveJadwalPiket(updated);
      setSelectedOfficerKeys([]);
      setFeedbackBanner({
        text: `${count} penugasan guru piket berhasil dihapus permanen dari jadwal database.`,
        type: 'success',
      });
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch {
      alert('Gagal menghapus data guru piket terpilih.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Reset to default schedule
  const handleResetToDefault = async () => {
    if (!window.confirm('Reset jadwal guru piket ke susunan bawaan standar sekolah? Semua perubahan kustom akan diperbarui.')) {
      return;
    }
    try {
      await onSaveJadwalPiket(INITIAL_JADWAL_PIKET);
      setFeedbackBanner({
        text: 'Jadwal guru piket telah berhasil dikembalikan ke standar awal sekolah!',
        type: 'success',
      });
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch {
      alert('Gagal mengatur ulang jadwal.');
    }
  };

  // Filtered view by day tab and search
  const displayedDays = useMemo(() => {
    return normalizedJadwal.filter((d) => {
      if (selectedDayFilter !== 'Semua' && d.hari !== selectedDayFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hasMatch = d.petugas.some(
          (p) =>
            p.nama.toLowerCase().includes(q) ||
            p.peran?.toLowerCase().includes(q) ||
            p.nip?.includes(q)
        );
        return hasMatch;
      }
      return true;
    });
  }, [normalizedJadwal, selectedDayFilter, searchQuery]);

  const allVisibleOfficerKeys = useMemo(() => {
    const keys: string[] = [];
    displayedDays.forEach((dayData) => {
      const dayPetugas = dayData.petugas.filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.nama.toLowerCase().includes(q) ||
          p.peran?.toLowerCase().includes(q) ||
          p.nip?.includes(q)
        );
      });
      dayPetugas.forEach((p) => keys.push(`${dayData.hari}___${p.id}`));
    });
    return keys;
  }, [displayedDays, searchQuery]);

  const totalAllOfficers = useMemo(() => {
    return normalizedJadwal.reduce((acc, curr) => acc + curr.petugas.length, 0);
  }, [normalizedJadwal]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Hero Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-950/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <SchoolLogo src={schoolConfig?.logoUrl} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white/10 p-2.5 rounded-3xl border border-white/20 shadow-inner" />
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 shadow-xs flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  PENGATURAN GURU PIKET
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 border border-white/20">
                  {schoolConfig.sistemHariSekolah === '5_HARI' ? '5 Hari Sekolah (Senin - Jumat)' : '6 Hari Sekolah (Senin - Sabtu)'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Jadwal & Penugasan Guru Piket
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                {schoolConfig.namaSekolah} • Kelola pembagian jadwal guru piket harian, pengawasan apel pagi/siang, verifikasi izin siswa, dan operasional pemindai kartu presensi.
              </p>
            </div>
          </div>

          {/* Action Buttons Top */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Guru Piket</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/25 backdrop-blur-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>Cetak SK / Jadwal</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white rounded-xl border border-white/20 transition-colors cursor-pointer"
                title="Atur Ulang ke Bawaan Standar Sekolah"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Active Duty Status Banner Today */}
        <div className="mt-6 pt-5 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-amber-950 font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bertugas Hari Ini ({currentDayOfWeek || 'Libur'}):</span>
            </span>
            {todayOfficers.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                {todayOfficers.map((o, idx) => (
                  <span key={o.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-xs font-extrabold text-white border border-white/20">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{o.nama}</span>
                    <span className="text-[10px] text-emerald-200 font-normal">({o.peran || 'Piket'})</span>
                    {idx < todayOfficers.length - 1 && <span className="text-white/40">•</span>}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-emerald-200 italic">
                {currentDayOfWeek ? 'Belum ada guru piket yang ditugaskan hari ini.' : 'Hari libur / tidak ada KBM.'}
              </span>
            )}
          </div>

          <div className="text-emerald-200 font-semibold text-[11px]">
            Total Penugasan: <strong className="text-white">{totalAllOfficers} Guru Piket</strong> Terjadwal
          </div>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedbackBanner && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200 ${
          feedbackBanner.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-sky-50 border-sky-200 text-sky-900'
        }`}>
          <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackBanner.text}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Controls & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Mode Switcher: Jadwal Harian vs Distribusi Beban Guru */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold w-full md:w-auto">
            <button
              type="button"
              onClick={() => setViewMode('jadwal')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'jadwal'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwal Harian (Senin - Sabtu)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('distribusi')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                viewMode === 'distribusi'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Distribusi & Rekap Wewenang Guru</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, peran, atau NUPTK..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Days Tab Filters (Hanya pada mode Jadwal) */}
        {viewMode === 'jadwal' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedDayFilter('Semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedDayFilter === 'Semua'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Hari
            </button>
            {DAYS_LIST.map((day) => {
              const count = normalizedJadwal.find((j) => j.hari === day)?.petugas.length || 0;
              const isToday = currentDayOfWeek === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    selectedDayFilter === day
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isToday
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedDayFilter === day ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                  {isToday && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Hari Ini" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Delete Floating/Action Bar */}
      {selectedOfficerKeys.length > 0 && isAdmin && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
            <span>
              <strong>{selectedOfficerKeys.length}</strong> penugasan guru piket dipilih untuk tindakan massal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedOfficerKeys([])}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
            >
              Batalkan Pilihan
            </button>
            <button
              type="button"
              disabled={isBulkDeleting}
              onClick={handleBulkDeleteOfficers}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isBulkDeleting ? 'Menghapus dari Database...' : `Hapus (${selectedOfficerKeys.length}) Petugas Terpilih`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Select All Toggle for All Visible Duty Officers */}
      {isAdmin && allVisibleOfficerKeys.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allVisibleOfficerKeys.length > 0 && selectedOfficerKeys.length === allVisibleOfficerKeys.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedOfficerKeys(allVisibleOfficerKeys);
                } else {
                  setSelectedOfficerKeys([]);
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span>Pilih Semua Petugas Piket yang Tampil ({allVisibleOfficerKeys.length})</span>
          </label>
        </div>
      )}

      {/* 3. Daily Duty Schedule Grid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {displayedDays.map((dayData) => {
          const isToday = currentDayOfWeek === dayData.hari;
          const dayPetugas = dayData.petugas.filter((p) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              p.nama.toLowerCase().includes(q) ||
              p.peran?.toLowerCase().includes(q) ||
              p.nip?.includes(q)
            );
          });

          return (
            <div
              key={dayData.hari}
              className={`bg-white rounded-3xl border transition-all overflow-hidden flex flex-col justify-between ${
                isToday
                  ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20'
                  : 'border-slate-200/90 shadow-xs hover:border-slate-300'
              }`}
            >
              {/* Card Day Header */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
                isToday ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/5 border-amber-200' : 'bg-slate-50/80 border-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                    isToday ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-800 text-white'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900">
                        Hari {dayData.hari}
                      </h3>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs animate-pulse">
                          Hari Ini
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {dayData.petugas.length} Guru Piket Ditugaskan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && dayPetugas.length > 0 && (
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer select-none mr-1 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200">
                      <input
                        type="checkbox"
                        checked={dayPetugas.every((p) => selectedOfficerKeys.includes(`${dayData.hari}___${p.id}`))}
                        onChange={(e) => {
                          const keys = dayPetugas.map((p) => `${dayData.hari}___${p.id}`);
                          if (e.target.checked) {
                            setSelectedOfficerKeys((prev) => Array.from(new Set([...prev, ...keys])));
                          } else {
                            setSelectedOfficerKeys((prev) => prev.filter((k) => !keys.includes(k)));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        title={`Pilih semua petugas hari ${dayData.hari}`}
                      />
                      <span className="hidden sm:inline text-xs">Pilih Hari Ini</span>
                    </label>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(dayData.hari)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Duty Teachers List */}
              <div className="p-4 sm:p-5 flex-1 divide-y divide-slate-100">
                {dayPetugas.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">Belum ada guru piket yang terjadwal untuk hari {dayData.hari}</p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(dayData.hari)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                      >
                        + Tambahkan Petugas Sekarang
                      </button>
                    )}
                  </div>
                ) : (
                  dayPetugas.map((officer) => {
                    const officerKey = `${dayData.hari}___${officer.id}`;
                    const isOfficerSelected = selectedOfficerKeys.includes(officerKey);
                    const matchedTeacher = teachers.find(
                      (t) => (officer.teacherId && t.id === officer.teacherId) ||
                      (t.nama && officer.nama && t.nama.toLowerCase().trim() === officer.nama.toLowerCase().trim()) ||
                      (t.nip && officer.nip && t.nip.trim() === officer.nip.trim())
                    );
                    const isTodayDuty = dayData.hari === currentDayOfWeek;
                    const isCurrentUser = user && (
                      (officer.teacherId && user.id === officer.teacherId) ||
                      (user.nama && officer.nama && user.nama.toLowerCase().trim() === officer.nama.toLowerCase().trim())
                    );

                    return (
                      <div
                        key={officer.id}
                        className={`py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group px-2.5 rounded-2xl transition-all ${
                          isOfficerSelected ? 'bg-rose-50/70 ring-1 ring-rose-200' : isTodayDuty ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {isAdmin && (
                            <input
                              type="checkbox"
                              checked={isOfficerSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOfficerKeys((prev) => [...prev, officerKey]);
                                } else {
                                  setSelectedOfficerKeys((prev) => prev.filter((k) => k !== officerKey));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0 mt-3"
                              title="Pilih petugas ini"
                            />
                          )}

                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs text-white ${
                            matchedTeacher?.role === 'piket'
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                              : isTodayDuty
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-400'
                              : 'bg-gradient-to-br from-teal-500 to-emerald-600'
                          }`}>
                            {officer.nama.charAt(0)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                {officer.nama}
                              </h4>
                              {isTodayDuty && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                                  Piket Hari Ini
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                {officer.peran || 'Koordinator Piket & Apel Utama'}
                              </span>

                              {/* Authority Mode Badge */}
                              {matchedTeacher?.role === 'piket' ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-bold flex items-center gap-1" title="Akun bertugas utama sebagai Petugas Piket Presensi">
                                  <UserCheck className="w-2.5 h-2.5 text-blue-600" />
                                  <span>Petugas Piket Utama</span>
                                </span>
                              ) : officer.syncUserRole !== false ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100/70 text-emerald-900 border border-emerald-200 text-[9px] font-extrabold flex items-center gap-1" title="Dual-Role: Tetap Guru Mapel/Wali Kelas & Otomatis Memegang Hak Piket di Hari Ini">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Dual-Role Aktif</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-medium" title="Penugasan dicatat pada papan informasi sekolah">
                                  Papan Jadwal
                                </span>
                              )}

                              {matchedTeacher?.mapel && (
                                <span className="text-[10px] text-slate-500 font-medium truncate">
                                  • {matchedTeacher.mapel}
                                </span>
                              )}

                              {officer.nip && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  • NUPTK: {officer.nip}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{officer.jamMulai || '06:30'} - {officer.jamSelesai || '14:30'} WIB</span>
                              </span>

                              {officer.nomorHp && (
                                <a
                                  href={`https://wa.me/${officer.nomorHp.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                                  title="Hubungi via WhatsApp"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{officer.nomorHp}</span>
                                </a>
                              )}

                              {/* Interactive quick action for the logged in teacher */}
                              {isCurrentUser && isTodayDuty && (
                                <div className="ml-auto sm:ml-0">
                                  {!actingAsPiket ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActingAsPiket(true);
                                        setActiveTab?.('apel-attendance');
                                      }}
                                      className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-xs flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span>Buka Lembar Apel Sekarang</span>
                                    </button>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Mode Piket Sedang Berjalan</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(dayData.hari, officer)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                              title="Edit Guru Piket"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOfficer(dayData.hari, officer.id, officer.nama)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              title="Hapus dari Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day Card Footer note */}
              {dayData.keteranganKhusus && (
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{dayData.keteranganKhusus}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. MODAL: TAMBAH / EDIT GURU PIKET */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingItem ? 'Edit Penugasan Guru Piket' : 'Tambah Petugas Guru Piket'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Penugasan piket presensi & ketertiban sekolah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOfficer} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Hari Tugas */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Hari Dinas Piket <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {DAYS_LIST.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormHari(d)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        formHari === d
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Select from Teacher Master Data */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Pilih dari Data Guru Terdaftar
                </label>
                <select
                  value={formTeacherId}
                  onChange={(e) => handleTeacherSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">-- Pilih Guru (Otomatis isi Nama, NUPTK & Akun) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} {t.mapel ? `(${t.mapel})` : ''} - @{t.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Teacher Account Preview */}
              {(() => {
                const selectedTeacher = teachers.find((t) => t.id === formTeacherId);
                if (!selectedTeacher) return null;
                return (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 truncate">
                          Akun Terhubung: <span className="font-mono text-indigo-700">@{selectedTeacher.username}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          Mapel: {selectedTeacher.mapel || 'Guru'} • Status: <strong className="text-emerald-700">{selectedTeacher.status || 'Aktif'}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-white text-indigo-900 border border-indigo-200 shrink-0">
                      {selectedTeacher.role === 'admin' ? 'Admin' : selectedTeacher.role === 'piket' ? 'Petugas Piket' : 'Guru Mapel'}
                    </span>
                  </div>
                );
              })()}

              {/* Nama Guru Piket */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Nama Petugas Guru Piket <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Hj. Siti Maryam, S.Pd."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  required
                />
              </div>

              {/* NUPTK & Nomor HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="Contoh: 16 Digit NUPTK"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formNomorHp}
                    onChange={(e) => setFormNomorHp(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Peran / Tugas Piket */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Peran / Tugas Utama Piket
                </label>
                <input
                  type="text"
                  value={formPeran}
                  onChange={(e) => setFormPeran(e.target.value)}
                  placeholder="Contoh: Koordinator Piket & Apel Pagi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white mb-2"
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {PERAN_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormPeran(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        formPeran === preset
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jam Dinas Piket */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Jam Mulai Piket
                  </label>
                  <input
                    type="time"
                    value={formJamMulai}
                    onChange={(e) => setFormJamMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Jam Selesai Piket
                  </label>
                  <input
                    type="time"
                    value={formJamSelesai}
                    onChange={(e) => setFormJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Otoritas & Integrasi Peran Akun Guru */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700">
                  Model Wewenang & Hak Akses Akun Guru <span className="text-rose-500">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Mode 1: Dual-Role Cerdas */}
                  <div
                    onClick={() => setFormRoleAuthorityMode('dual_role')}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                      formRoleAuthorityMode === 'dual_role'
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Rekomendasi
                        </span>
                      </div>
                      <h5 className="font-black text-xs text-slate-900">Dual-Role Cerdas</h5>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Tetap sebagai Guru Mapel/Wali Kelas. Di hari piketnya, otomatis memegang hak akses operasional Petugas Piket lengkap.
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>KBM & Piket Terintegrasi</span>
                    </div>
                  </div>

                  {/* Mode 2: Petugas Piket Utama */}
                  <div
                    onClick={() => setFormRoleAuthorityMode('permanent_piket')}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                      formRoleAuthorityMode === 'permanent_piket'
                        ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="p-1.5 rounded-xl bg-blue-600 text-white shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                          Peran Utama
                        </span>
                      </div>
                      <h5 className="font-black text-xs text-slate-900">Petugas Piket Utama</h5>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Menetapkan peran akun login guru ini sebagai Petugas Piket permanen untuk operasional gerbang & apel harian.
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Fokus Presensi Apel</span>
                    </div>
                  </div>

                  {/* Mode 3: Pencatatan Jadwal Saja */}
                  <div
                    onClick={() => setFormRoleAuthorityMode('schedule_only')}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                      formRoleAuthorityMode === 'schedule_only'
                        ? 'bg-slate-100 border-slate-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="p-1.5 rounded-xl bg-slate-500 text-white shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Jadwal Saja
                        </span>
                      </div>
                      <h5 className="font-black text-xs text-slate-900">Penugasan Jadwal</h5>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Hanya dicatat pada papan jadwal piket sekolah tanpa sinkronisasi hak akses akun sistem.
                      </p>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-slate-600 flex items-center gap-1">
                      <span>Pencatatan Papan Informasi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Jadwal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: CETAK SK / JADWAL RESMI */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Pratinjau Cetak Jadwal Guru Piket Resmi
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Sekarang (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Content */}
            <div className="p-6 sm:p-8 overflow-y-auto bg-white text-slate-900 space-y-6">
              {/* Kop Surat Resmi */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center gap-4 text-center">
                <SchoolLogo src={schoolConfig?.logoUrl} className="w-18 h-18 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-xs sm:text-sm tracking-wide uppercase text-slate-900 leading-tight">
                    PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN
                  </p>
                  <p className="font-bold text-xs sm:text-sm tracking-wide uppercase text-slate-900 leading-tight">
                    PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR
                  </p>
                  <h1 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight uppercase mt-1">
                    {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}
                  </h1>
                  <p className="text-xs text-slate-700 font-sans mt-0.5">
                    {schoolConfig.alamat || 'Kp. Koleberes Blok D RT. 04 RW. 09 Desa Cikadu Kec. Cikadu Kab. Cianjur'}
                  </p>
                  <p className="text-xs text-slate-700 font-sans">
                    Telp: 0852 1258 7750 | e-mail: smp.pgri1ckd@gmail.com | NPSN: {schoolConfig.npsn || '69919136'}
                  </p>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center space-y-1">
                <h3 className="font-black text-base sm:text-lg uppercase tracking-wide underline underline-offset-4 text-slate-900">
                  JADWAL PENUGASAN GURU PIKET & KETERTIBAN SEKOLAH
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Tahun Ajaran 2026/2027 • Sistem Presensi Digital & Apel Harian
                </p>
              </div>

              {/* Table of Duties */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-black text-slate-800 border-b border-slate-300 text-center uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 border-r border-slate-300">No</th>
                      <th className="py-2.5 px-3 w-28 border-r border-slate-300">Hari</th>
                      <th className="py-2.5 px-4 border-r border-slate-300">Nama Petugas Guru Piket</th>
                      <th className="py-2.5 px-4 border-r border-slate-300">NIP / NUPTK</th>
                      <th className="py-2.5 px-4 border-r border-slate-300">Peran & Tanggung Jawab</th>
                      <th className="py-2.5 px-3 w-32">Jam Tugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {DAYS_LIST.map((day, dIdx) => {
                      const dayData = normalizedJadwal.find((j) => j.hari === day);
                      const officers = dayData?.petugas || [];

                      if (officers.length === 0) {
                        return (
                          <tr key={day}>
                            <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-slate-400">{dIdx + 1}</td>
                            <td className="py-2 px-3 font-bold border-r border-slate-200">{day}</td>
                            <td colSpan={4} className="py-2 px-4 text-center text-slate-400 italic">
                              Tidak ada penugasan piket
                            </td>
                          </tr>
                        );
                      }

                      return officers.map((officer, oIdx) => (
                        <tr key={officer.id} className="hover:bg-slate-50">
                          {oIdx === 0 && (
                            <>
                              <td rowSpan={officers.length} className="py-2.5 px-3 text-center border-r border-slate-200 font-mono align-top font-bold text-slate-500">
                                {dIdx + 1}
                              </td>
                              <td rowSpan={officers.length} className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-200 align-top">
                                {day}
                              </td>
                            </>
                          )}
                          <td className="py-2 px-4 font-bold text-slate-900 border-r border-slate-200">
                            {officer.nama}
                          </td>
                          <td className="py-2 px-4 font-mono text-slate-600 border-r border-slate-200 text-[11px]">
                            {officer.nip || '-'}
                          </td>
                          <td className="py-2 px-4 text-slate-700 border-r border-slate-200 font-medium">
                            {officer.peran || 'Petugas Piket'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                            {officer.jamMulai || '06:30'} - {officer.jamSelesai || '14:30'}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan: Kepala Sekolah di Kiri, Koordinator Piket di Kanan */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                {/* Kolom Kiri: Kepala Sekolah */}
                <div>
                  <p className="text-slate-600">Mengetahui,</p>
                  <p className="font-bold text-slate-900">Kepala {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}</p>
                  <div className="h-16" />
                  <p className="font-black text-slate-900 underline uppercase">{schoolConfig.namaKepsek || 'CUNCUN MUHLISOH, S.Pd.'}</p>
                  <p className="text-slate-500 font-mono text-[10px]">NUPTK: {schoolConfig.nipKepsek || '-'}</p>
                </div>

                {/* Kolom Kanan: Koordinator Guru Piket */}
                <div>
                  <p className="text-slate-600">{schoolConfig.kota || 'Cianjur'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold text-slate-900">Koordinator Guru Piket</p>
                  <div className="h-16" />
                  <p className="font-black text-slate-900 underline uppercase">{schoolConfig.namaPetugasPiket || 'AI SITI ROSITA'}</p>
                  <p className="text-slate-500 font-mono text-[10px]">NUPTK: {schoolConfig.nipPetugasPiket || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
