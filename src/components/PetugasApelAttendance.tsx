import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Users, 
  Save, 
  Search, 
  QrCode, 
  Sparkles, 
  CheckCheck, 
  RotateCcw,
  Sun,
  Moon,
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  SchoolConfig, 
  AttendanceStatus, 
  AttendanceSession,
  TeacherUser 
} from '../types';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';
import { soundService } from '../utils/audio';

interface PetugasApelAttendanceProps {
  students: Student[];
  records: AttendanceRecord[];
  schoolConfig: SchoolConfig;
  currentSession: AttendanceSession;
  teachers?: TeacherUser[];
  onBulkSave: (records: AttendanceRecord[]) => Promise<void>;
  onOpenScanner?: () => void;
  onRefresh?: () => Promise<void>;
}

export const PetugasApelAttendance: React.FC<PetugasApelAttendanceProps> = ({
  students,
  records,
  schoolConfig,
  currentSession,
  teachers = [],
  onBulkSave,
  onOpenScanner,
  onRefresh,
}) => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession>(currentSession);
  const [selectedClass, setSelectedClass] = useState<string>('7A');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Local state of statuses for the currently selected class, date, and session
  // Key: NISN => { status: AttendanceStatus, catatan?: string, waktu?: string }
  const [classAttendanceMap, setClassAttendanceMap] = useState<Record<string, {
    status: AttendanceStatus;
    catatan?: string;
    waktu?: string;
  }>>({});

  // List of all classes
  const classesList = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

  // Set default class if current selectedClass is not in list
  useEffect(() => {
    if (classesList.length > 0 && !classesList.includes(selectedClass)) {
      setSelectedClass(classesList[0]);
    }
  }, [classesList, selectedClass]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return students.filter((s) => s.kelas === selectedClass);
  }, [students, selectedClass]);

  // When class, date, or session changes, initialize attendance map from records
  useEffect(() => {
    const newMap: Record<string, { status: AttendanceStatus; catatan?: string; waktu?: string }> = {};

    classStudents.forEach((student) => {
      // Look for existing APEL record for this student on this date and session
      const existing = records.find(
        (r) => (r.nisn === student.nisn && r.tanggal === selectedDate && r.sesi === selectedSession) &&
               (r.kategori === 'APEL' || (!r.kategori && !r.id.startsWith('PRESENSI_KBM_') && !r.mapel))
      );

      if (existing) {
        newMap[student.nisn] = {
          status: existing.status,
          catatan: existing.catatan || '',
          waktu: existing.waktu || '',
        };
      } else {
        // Default to not yet marked, or 'Alpa' if past date, or undefined
        newMap[student.nisn] = {
          status: 'Alpa',
          catatan: '',
          waktu: '',
        };
      }
    });

    setClassAttendanceMap(newMap);
  }, [selectedClass, selectedDate, selectedSession, classStudents, records]);

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter((s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
  }, [classStudents, searchQuery]);

  // Metrics for current class
  const metrics = useMemo(() => {
    const total = classStudents.length;
    let hadir = 0;
    let telat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    classStudents.forEach((s) => {
      const st = classAttendanceMap[s.nisn]?.status;
      if (st === 'Hadir') hadir++;
      else if (st === 'Terlambat') telat++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else alpa++;
    });

    const totalMasuk = hadir + telat;
    const persentase = total > 0 ? Math.round((totalMasuk / total) * 100) : 0;

    return { total, hadir, telat, izin, sakit, alpa, totalMasuk, persentase };
  }, [classStudents, classAttendanceMap]);

  // Update status for a single student
  const handleSetStatus = (nisn: string, status: AttendanceStatus) => {
    const currentTime = new Date().toTimeString().split(' ')[0];
    setClassAttendanceMap((prev) => ({
      ...prev,
      [nisn]: {
        ...prev[nisn],
        status,
        waktu: prev[nisn]?.waktu || currentTime,
      },
    }));
  };

  // Update note for a single student
  const handleSetCatatan = (nisn: string, catatan: string) => {
    setClassAttendanceMap((prev) => ({
      ...prev,
      [nisn]: {
        ...prev[nisn],
        catatan,
      },
    }));
  };

  // Mark all students as 'Hadir'
  const handleMarkAllHadir = () => {
    const currentTime = new Date().toTimeString().split(' ')[0];
    setClassAttendanceMap((prev) => {
      const copy = { ...prev };
      classStudents.forEach((s) => {
        copy[s.nisn] = {
          status: 'Hadir',
          catatan: copy[s.nisn]?.catatan || '',
          waktu: copy[s.nisn]?.waktu || currentTime,
        };
      });
      return copy;
    });
    soundService.playSuccess();
  };

  // Reset or mark remaining to Alpa
  const handleMarkUnmarkedToAlpa = () => {
    setClassAttendanceMap((prev) => {
      const copy = { ...prev };
      classStudents.forEach((s) => {
        if (!copy[s.nisn] || copy[s.nisn].status === 'Alpa') {
          copy[s.nisn] = {
            status: 'Alpa',
            catatan: copy[s.nisn]?.catatan || '',
            waktu: '',
          };
        }
      });
      return copy;
    });
  };

  // Save all records for this class & date & session
  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const currentTime = new Date().toTimeString().split(' ')[0];
      const recordsToSave: AttendanceRecord[] = classStudents.map((s) => {
        const item = classAttendanceMap[s.nisn] || { status: 'Alpa' };
        return {
          id: `PRESENSI_APEL_${s.nisn}_${selectedDate}_${selectedSession}`,
          tanggal: selectedDate,
          waktu: item.waktu || currentTime,
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          sesi: selectedSession,
          status: item.status,
          kategori: 'APEL',
          catatan: item.catatan || undefined,
        };
      });

      await onBulkSave(recordsToSave);
      soundService.playSuccess();
      setSaveSuccessMessage(
        `Presensi Apel ${selectedSession} Kelas ${selectedClass} (${recordsToSave.length} Siswa) berhasil disimpan!`
      );
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (e) {
      console.error('Failed to save apel attendance', e);
      soundService.playError();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SchoolLogo 
            src={schoolConfig?.logoUrl} 
            className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" 
          />
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Absensi Apel Petugas (Pagi & Siang)
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                <UserCheck className="w-3 h-3" />
                <span>Petugas Piket: {user?.nama || schoolConfig.namaPetugasPiket || 'Petugas Sekolah'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {schoolConfig.namaSekolah} • Lembar pencatatan presensi apel harian oleh petugas sekolah per rombongan belajar.
            </p>
          </div>
        </div>

        {/* Action button to open Scanner Kiosk */}
        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Buka Layar Pindai Kartu</span>
          </button>
        )}
      </div>

      {/* Filter and Session Controls */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Tanggal */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Tanggal Apel</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sesi Apel: Pagi vs Siang */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Sesi Apel</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSession('Pagi')}
                className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedSession === 'Pagi'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Apel Pagi</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSession('Siang')}
                className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedSession === 'Siang'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Apel Siang</span>
              </button>
            </div>
          </div>

          {/* Kelas / Rombel */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pilih Kelas / Rombel</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {classesList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c} ({students.filter((s) => s.kelas === c).length} Siswa)
                </option>
              ))}
            </select>
          </div>

          {/* Cari Siswa */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cari Siswa</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ketik nama / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Quick Class Selector Pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Rombel:</span>
          {classesList.map((c) => {
            const count = students.filter((s) => s.kelas === c).length;
            const isSelected = selectedClass === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedClass(c)}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c} <span className="text-[10px] opacity-75 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats for Selected Class & Session */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 mb-1">Total Siswa</div>
          <div className="text-2xl font-black text-slate-900">{metrics.total}</div>
          <span className="text-[10px] text-slate-400 font-medium">Kelas {selectedClass}</span>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 mb-1">Hadir Tepat</div>
          <div className="text-2xl font-black text-emerald-700">{metrics.hadir}</div>
          <span className="text-[10px] text-emerald-600 font-bold">Apel {selectedSession}</span>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-800 mb-1">Terlambat</div>
          <div className="text-2xl font-black text-amber-700">{metrics.telat}</div>
          <span className="text-[10px] text-amber-600 font-bold">Dispensasi apel</span>
        </div>

        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 shadow-2xs">
          <div className="text-[11px] font-bold text-sky-800 mb-1">Izin</div>
          <div className="text-2xl font-black text-sky-700">{metrics.izin}</div>
          <span className="text-[10px] text-sky-600 font-bold">Surat resmi</span>
        </div>

        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-800 mb-1">Sakit</div>
          <div className="text-2xl font-black text-purple-700">{metrics.sakit}</div>
          <span className="text-[10px] text-purple-600 font-bold">Surat dokter / UKS</span>
        </div>

        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-800 mb-1">Alpa / Belum</div>
          <div className="text-2xl font-black text-rose-700">{metrics.alpa}</div>
          <span className="text-[10px] text-rose-600 font-bold">Tanpa keterangan</span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{saveSuccessMessage}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full">
            Firestore Tersimpan
          </span>
        </div>
      )}

      {/* Main Student Checklist Roster */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Daftar Siswa Kelas {selectedClass} • Sesi {selectedSession}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Tanggal: <span className="font-bold text-slate-800">{selectedDate}</span> • Kehadiran: <span className="font-bold text-blue-700">{metrics.persentase}%</span> ({metrics.totalMasuk}/{metrics.total} Siswa)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Button: Tandai Semua Hadir */}
            <button
              type="button"
              onClick={handleMarkAllHadir}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Hadir</span>
            </button>

            {/* Quick Button: Alpakan yang belum */}
            <button
              type="button"
              onClick={handleMarkUnmarkedToAlpa}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Alpa</span>
            </button>

            {/* Main Save Button */}
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Presensi Kelas'}</span>
            </button>
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa & NISN</th>
                <th className="py-3 px-4 w-20 text-center">L/P</th>
                <th className="py-3 px-4 min-w-[340px]">Status Kehadiran Apel</th>
                <th className="py-3 px-4 min-w-[200px]">Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">Tidak ada siswa yang ditemukan</p>
                    <p className="text-[11px] text-slate-400">Cek kembali filter pencarian atau rombel yang dipilih.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const item = classAttendanceMap[student.nisn] || { status: 'Alpa' };
                  const currentStatus = item.status;

                  return (
                    <tr key={student.nisn} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 overflow-hidden">
                            {student.fotoUrl ? (
                              <img src={student.fotoUrl} alt={student.nama} className="w-full h-full object-cover" />
                            ) : (
                              student.nama.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{student.nama}</div>
                            <div className="text-[11px] font-mono text-slate-400">NISN: {student.nisn}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          student.jk === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {student.jk}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* HADIR */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.nisn, 'Hadir')}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                              currentStatus === 'Hadir'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {currentStatus === 'Hadir' && <Check className="w-3.5 h-3.5" />}
                            <span>Hadir</span>
                          </button>

                          {/* TERLAMBAT */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.nisn, 'Terlambat')}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                              currentStatus === 'Terlambat'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            {currentStatus === 'Terlambat' && <Check className="w-3.5 h-3.5" />}
                            <span>Telat</span>
                          </button>

                          {/* IZIN */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.nisn, 'Izin')}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                              currentStatus === 'Izin'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                            }`}
                          >
                            {currentStatus === 'Izin' && <Check className="w-3.5 h-3.5" />}
                            <span>Izin</span>
                          </button>

                          {/* SAKIT */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.nisn, 'Sakit')}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                              currentStatus === 'Sakit'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                            }`}
                          >
                            {currentStatus === 'Sakit' && <Check className="w-3.5 h-3.5" />}
                            <span>Sakit</span>
                          </button>

                          {/* ALPA */}
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.nisn, 'Alpa')}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                              currentStatus === 'Alpa'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            {currentStatus === 'Alpa' && <Check className="w-3.5 h-3.5" />}
                            <span>Alpa</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Catatan (opsional)..."
                          value={item.catatan || ''}
                          onChange={(e) => handleSetCatatan(student.nisn, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Save Summary Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Perubahan disimpan sebagai <strong className="text-slate-800">Presensi Apel {selectedSession}</strong> dan terhubung langsung ke Cloud Firestore.
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan ke Cloud...' : `Simpan Presensi Kelas ${selectedClass}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
