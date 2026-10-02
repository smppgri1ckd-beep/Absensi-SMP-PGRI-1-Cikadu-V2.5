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
  schoolConfig: SchoolConfig;
}

const DAYS_LIST: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const PERAN_PRESETS = [
  'Koordinator Piket & Apel Pagi',
  'Piket Gerbang & Pemindai QR',
  'Piket Apel Pagi & Siang',
  'Piket Pemindai QR & Ketertiban',
  'Piket Pemeriksaan Izin & Sakit',
  'Piket Ketertiban Sholat Dhuha / Jumat',
  'Piket Pengawasan Istirahat & Kantin',
  'Piket Kepulangan Siswa',
];

export const GuruPiketManagement: React.FC<GuruPiketManagementProps> = ({
  jadwalPiket,
  onSaveJadwalPiket,
  teachers,
  schoolConfig,
}) => {
  const { user } = useAuth();
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
  const [formPeran, setFormPeran] = useState<string>('Koordinator Piket & Apel Pagi');
  const [formJamMulai, setFormJamMulai] = useState<string>('06:30');
  const [formJamSelesai, setFormJamSelesai] = useState<string>('14:30');
  const [formError, setFormError] = useState<string | null>(null);

  // Print Preview Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  // Open modal to add new officer
  const handleOpenAddModal = (targetDay?: DayOfWeek) => {
    setEditingItem(null);
    setFormHari(targetDay || (currentDayOfWeek || 'Senin'));
    setFormTeacherId('');
    setFormNama('');
    setFormNip('');
    setFormNomorHp('');
    setFormPeran('Koordinator Piket & Apel Pagi');
    setFormJamMulai('06:30');
    setFormJamSelesai(targetDay === 'Jumat' ? '11:45' : '14:30');
    setFormError(null);
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
    setFormPeran(item.peran || 'Koordinator Piket');
    setFormJamMulai(item.jamMulai || '06:30');
    setFormJamSelesai(item.jamSelesai || '14:30');
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
            peran: formPeran.trim() || 'Petugas Piket',
            jamMulai: formJamMulai || '06:30',
            jamSelesai: formJamSelesai || '14:30',
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
      setIsFormModalOpen(false);
      setFeedbackBanner({
        text: `Petugas Guru Piket (${formNama}) berhasil disimpan untuk hari ${formHari}!`,
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
      setFeedbackBanner({
        text: `${officerName} telah dihapus dari jadwal piket hari ${day}.`,
        type: 'info',
      });
      setTimeout(() => setFeedbackBanner(null), 3500);
    } catch {
      alert('Gagal menghapus data petugas.');
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
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Days Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
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

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru / peran piket..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

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
                  dayPetugas.map((officer) => (
                    <div
                      key={officer.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {officer.nama.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {officer.nama}
                          </h4>
                          
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                              {officer.peran || 'Petugas Piket'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              NIP: {officer.nip || '-'}
                            </span>
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
                  ))
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
                  <option value="">-- Pilih Guru (Otomatis isi Nama & NIP) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} {t.mapel ? `(${t.mapel})` : ''}
                    </option>
                  ))}
                </select>
              </div>

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

              {/* NIP & Nomor HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="Contoh: 19750918 200501 2 006"
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
                  <p className="text-slate-500 font-mono text-[10px]">NIP/NUPTK: {schoolConfig.nipKepsek || '-'}</p>
                </div>

                {/* Kolom Kanan: Koordinator Guru Piket */}
                <div>
                  <p className="text-slate-600">{schoolConfig.kota || 'Cianjur'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold text-slate-900">Koordinator Guru Piket</p>
                  <div className="h-16" />
                  <p className="font-black text-slate-900 underline uppercase">{schoolConfig.namaPetugasPiket || 'AI SITI ROSITA'}</p>
                  <p className="text-slate-500 font-mono text-[10px]">NIP/NUPTK: {schoolConfig.nipPetugasPiket || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
