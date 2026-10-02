import React, { useState } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  ShieldCheck, 
  BookOpen, 
  X,
  UserCheck,
  CheckCircle2,
  Lock,
  Phone,
  Clock,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { TeacherUser, SchoolConfig, TeachingAssignment, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';
import { generateTeacherListPdf } from '../utils/exportPdf';

interface TeacherManagementProps {
  teachers: TeacherUser[];
  onSaveTeacher: (teacher: TeacherUser) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  schoolConfig: SchoolConfig;
}

const STANDARD_MAPEL_LIST = [
  'Pendidikan Agama Islam (PAI)',
  'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Bahasa Inggris',
  'Seni Budaya',
  'Pendidikan Jasmani & Olahraga (PJOK)',
  'Prakarya & Kewirausahaan',
  'Informatika',
  'Bahasa Sunda (Mulok)',
  'Bahasa Arab (Mulok)',
  'Bimbingan Konseling (BK)',
];

const AVAILABLE_CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B'];

const ASSIGNMENT_PALETTE = [
  'bg-indigo-50/70 border-indigo-200/80 text-indigo-950',
  'bg-amber-50/70 border-amber-200/80 text-amber-950',
  'bg-emerald-50/70 border-emerald-200/80 text-emerald-950',
  'bg-sky-50/70 border-sky-200/80 text-sky-950',
  'bg-violet-50/70 border-violet-200/80 text-violet-950',
  'bg-rose-50/70 border-rose-200/80 text-rose-950',
  'bg-teal-50/70 border-teal-200/80 text-teal-950',
  'bg-orange-50/70 border-orange-200/80 text-orange-950',
  'bg-cyan-50/70 border-cyan-200/80 text-cyan-950',
  'bg-fuchsia-50/70 border-fuchsia-200/80 text-fuchsia-950',
];

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  teachers,
  onSaveTeacher,
  onDeleteTeacher,
  schoolConfig,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'Semua' | UserRole>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [teacherId, setTeacherId] = useState('');
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherNama, setTeacherNama] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('edudigital');
  const [teacherRole, setTeacherRole] = useState<UserRole>('guru');
  const [teacherWaliKelas, setTeacherWaliKelas] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherStatus, setTeacherStatus] = useState<'Aktif' | 'Non-Aktif'>('Aktif');

  // Penugasan Mapel (Hingga 3 Mapel dengan kelas berbeda!)
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([
    { id: 'asgn_1', mapel: 'Ilmu Pengetahuan Alam (IPA)', kelas: ['7A', '7B'], bebanJam: 8 },
  ]);

  const canManage = user?.role === 'admin';

  // Filtered teachers list
  const filteredTeachers = teachers.filter((t) => {
    if (filterRole !== 'Semua' && (t.role || 'guru') !== filterRole) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    // Check in penugasanMapel
    const hasMapelMatch = t.penugasanMapel?.some(
      (asgn) => asgn.mapel.toLowerCase().includes(q) || asgn.kelas.some((k) => k.toLowerCase().includes(q))
    );

    return (
      t.nama.toLowerCase().includes(q) ||
      t.mapel.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      (t.nip && t.nip.includes(q)) ||
      (t.waliKelas && t.waliKelas.toLowerCase().includes(q)) ||
      hasMapelMatch
    );
  });

  // Calculate stats
  const totalBebanJamSemua = teachers.reduce((acc, t) => {
    const sumJam = t.penugasanMapel?.reduce((s, a) => s + (a.bebanJam || 0), 0) || t.totalJamMengajar || 0;
    return acc + sumJam;
  }, 0);

  const totalWaliKelas = teachers.filter((t) => !!t.waliKelas).length;
  const totalPiket = teachers.filter((t) => t.role === 'piket').length;

  const handleOpenAdd = () => {
    setIsEditing(false);
    setTeacherId(`T${Date.now()}`);
    setTeacherNip('');
    setTeacherNama('');
    setTeacherUsername('');
    setTeacherPassword('edudigital');
    setTeacherRole('guru');
    setTeacherWaliKelas('');
    setTeacherPhone('');
    setTeacherStatus('Aktif');
    setAssignments([
      { id: `asgn_${Date.now()}_1`, mapel: 'Ilmu Pengetahuan Alam (IPA)', kelas: ['7A'], bebanJam: 4 },
    ]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: TeacherUser) => {
    setIsEditing(true);
    setTeacherId(t.id);
    setTeacherNip(t.nip || '');
    setTeacherNama(t.nama);
    setTeacherUsername(t.username);
    setTeacherPassword(t.password || 'edudigital');
    setTeacherRole((t.role as UserRole) || 'guru');
    setTeacherWaliKelas(t.waliKelas || '');
    setTeacherPhone(t.nomorHp || '');
    setTeacherStatus((t.status as 'Aktif' | 'Non-Aktif') || 'Aktif');

    if (t.penugasanMapel && t.penugasanMapel.length > 0) {
      setAssignments(JSON.parse(JSON.stringify(t.penugasanMapel)));
    } else {
      // Fallback from legacy single mapel
      setAssignments([
        { id: `asgn_${Date.now()}`, mapel: t.mapel, kelas: t.waliKelas ? [t.waliKelas] : ['7A'], bebanJam: 4 },
      ]);
    }

    setModalError(null);
    setIsModalOpen(true);
  };

  // Assignment helpers
  const handleAddAssignmentSlot = () => {
    if (assignments.length >= 10) {
      setModalError('Maksimal 10 penugasan mata pelajaran & rombel kelas untuk setiap guru.');
      return;
    }
    setModalError(null);
    const nextSlotNum = assignments.length + 1;
    setAssignments([
      ...assignments,
      {
        id: `asgn_${Date.now()}_${nextSlotNum}`,
        mapel: STANDARD_MAPEL_LIST[(nextSlotNum + 2) % STANDARD_MAPEL_LIST.length] || 'Informatika',
        kelas: ['8A'],
        bebanJam: 4,
      },
    ]);
  };

  const handleRemoveAssignmentSlot = (idx: number) => {
    if (assignments.length <= 1) {
      setModalError('Guru harus memiliki minimal 1 mata pelajaran yang diampu.');
      return;
    }
    setModalError(null);
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const handleToggleClassInAssignment = (asgnIdx: number, kelasName: string) => {
    setModalError(null);
    setAssignments((prev) =>
      prev.map((item, idx) => {
        if (idx !== asgnIdx) return item;
        const exists = item.kelas.includes(kelasName);
        const updatedKelas = exists
          ? item.kelas.filter((k) => k !== kelasName)
          : [...item.kelas, kelasName];
        return {
          ...item,
          kelas: updatedKelas,
        };
      })
    );
  };

  const handleUpdateAssignmentField = (
    asgnIdx: number,
    field: keyof TeachingAssignment,
    value: string | number
  ) => {
    setAssignments((prev) =>
      prev.map((item, idx) => (idx === asgnIdx ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherNama.trim() || !teacherUsername.trim()) return;

    if (assignments.length === 0) {
      setModalError('Guru harus memiliki minimal 1 penugasan mata pelajaran.');
      return;
    }

    // Validate that every assignment has at least one class
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i].kelas.length === 0) {
        setModalError(`Harap pilih minimal 1 kelas untuk Mata Pelajaran ke-${i + 1} (${assignments[i].mapel}).`);
        return;
      }
    }

    // Total jam mengajar
    const calculatedTotalJam = assignments.reduce((acc, a) => acc + (Number(a.bebanJam) || 0), 0);
    const primaryMapel = assignments[0].mapel;

    const teacherObj: TeacherUser = {
      id: teacherId,
      nip: teacherNip.trim() || undefined,
      nama: teacherNama.trim(),
      username: teacherUsername.trim().toLowerCase(),
      password: teacherPassword.trim() || 'edudigital',
      role: teacherRole,
      mapel: primaryMapel,
      penugasanMapel: assignments,
      waliKelas: teacherWaliKelas.trim().toUpperCase() || undefined,
      nomorHp: teacherPhone.trim() || undefined,
      status: teacherStatus,
      totalJamMengajar: calculatedTotalJam,
    };

    await onSaveTeacher(teacherObj);
    setIsModalOpen(false);
    setFeedbackBanner(`Data guru "${teacherNama}" berhasil disimpan dengan ${assignments.length} penugasan mapel!`);
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus akun guru "${nama}"?`)) {
      await onDeleteTeacher(id);
      setFeedbackBanner(`Akun guru "${nama}" telah dihapus dari sistem.`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    }
  };

  const handleQuickResetPassword = async (t: TeacherUser) => {
    if (confirm(`Reset kata sandi akun guru "${t.nama}" kembali ke default "edudigital"?`)) {
      const updated: TeacherUser = {
        ...t,
        password: 'edudigital',
      };
      await onSaveTeacher(updated);
      setFeedbackBanner(`Kata sandi akun @${t.username} berhasil direset ke "edudigital".`);
      setTimeout(() => setFeedbackBanner(null), 4000);
    }
  };

  const handleToggleStatus = async (t: TeacherUser) => {
    const nextStatus = t.status === 'Non-Aktif' ? 'Aktif' : 'Non-Aktif';
    const updated: TeacherUser = {
      ...t,
      status: nextStatus,
    };
    await onSaveTeacher(updated);
    setFeedbackBanner(`Status akun @${t.username} diubah menjadi ${nextStatus}.`);
    setTimeout(() => setFeedbackBanner(null), 3000);
  };

  const handlePrintScheduleMatrix = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Data Guru & Penugasan Mapel ({teachers.length} Guru)</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                Multi-Mapel & Kelas
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {schoolConfig.namaSekolah} • Kelola data guru, kredensial login, peran operasional, penugasan mata pelajaran, dan beban jam tatap muka.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateTeacherListPdf(filteredTeachers, schoolConfig)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-all cursor-pointer"
            title="Cetak Berkas PDF Resmi Daftar Tenaga Pendidik"
          >
            <Printer className="w-4 h-4 text-rose-600" />
            <span>Cetak PDF Data Guru</span>
          </button>

          <button
            onClick={handlePrintScheduleMatrix}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
            title="Cetak Matriks Penugasan KBM"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak SK Pembagian Tugas</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Guru & Mapel</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner Notification */}
      {feedbackBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tenaga Pendidik</span>
          <span className="text-lg font-black text-slate-800 mt-1 block">
            {teachers.length} Guru
          </span>
          <span className="text-[10px] text-slate-400 font-medium">SMP PGRI 1 CIKADU</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Beban Mengajar</span>
          <span className="text-lg font-black text-indigo-700 mt-1 block">
            {totalBebanJamSemua} Jam/Minggu
          </span>
          <span className="text-[10px] text-indigo-600/80 font-medium">Terdistribusi ke Rombel</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Penugasan Wali Kelas</span>
          <span className="text-lg font-black text-amber-700 mt-1 block">
            {totalWaliKelas} Guru
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Kelas 7, 8, dan 9</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Merangkap Petugas Piket</span>
          <span className="text-lg font-black text-emerald-700 mt-1 block">
            {totalPiket} Petugas
          </span>
          <span className="text-[10px] text-emerald-600/80 font-medium">Operasional Kiosk Gerbang</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, mapel, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterRole('Semua')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterRole === 'Semua' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterRole('guru')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterRole === 'guru' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Guru Mapel
            </button>
            <button
              onClick={() => setFilterRole('piket')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterRole === 'piket' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Petugas Piket
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold self-end sm:self-center">
          Menampilkan <strong className="text-slate-900">{filteredTeachers.length}</strong> dari <strong className="text-slate-900">{teachers.length}</strong> guru terdaftar
        </div>
      </div>

      {/* Teachers List Table with Multi-Subject Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">No</th>
                <th className="py-3.5 px-4 min-w-[200px]">Nama Guru & NIP</th>
                <th className="py-3.5 px-4">Role & Hak Akses</th>
                <th className="py-3.5 px-4 min-w-[300px]">Penugasan Mapel & Rombel (Hingga 10 Mapel)</th>
                <th className="py-3.5 px-4">Wali Kelas</th>
                <th className="py-3.5 px-4">Akun Login</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {canManage && <th className="py-3.5 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="py-12 text-center text-slate-400">
                    Tidak ada data guru yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  const teacherAssignments = t.penugasanMapel && t.penugasanMapel.length > 0 
                    ? t.penugasanMapel 
                    : [{ id: 'legacy', mapel: t.mapel, kelas: t.waliKelas ? [t.waliKelas] : ['7A'], bebanJam: 4 }];

                  const totalJam = teacherAssignments.reduce((acc, a) => acc + (a.bebanJam || 0), 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-400">{idx + 1}</td>
                      
                      {/* Name & NIP */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {t.nama}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          NIP: {t.nip || 'Belum diisi'}
                        </div>
                        {t.nomorHp && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{t.nomorHp}</span>
                          </div>
                        )}
                      </td>

                      {/* Role & Privileges */}
                      <td className="py-3.5 px-4">
                        {t.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 border border-blue-200 font-black text-[10px] uppercase">
                            <ShieldCheck className="w-3 h-3 text-blue-700" />
                            <span>Admin Sistem</span>
                          </span>
                        ) : t.role === 'piket' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 font-black text-[10px] uppercase">
                            <UserCheck className="w-3 h-3 text-emerald-700" />
                            <span>Petugas Piket</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200 font-black text-[10px] uppercase">
                            <GraduationCap className="w-3 h-3 text-indigo-700" />
                            <span>Guru Mapel</span>
                          </span>
                        )}
                      </td>

                      {/* Penugasan Mapel (Hingga 10 Mapel dengan Rombel Berbeda) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                            {teacherAssignments.map((asgn, asgnIdx) => (
                              <div 
                                key={asgn.id || asgnIdx} 
                                className={`p-2 rounded-xl border flex flex-col gap-1 ${
                                  ASSIGNMENT_PALETTE[asgnIdx % ASSIGNMENT_PALETTE.length]
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-[11px] truncate flex items-center gap-1.5">
                                    <BookOpen className="w-3 h-3 opacity-70 shrink-0" />
                                    <span className="truncate">{asgn.mapel}</span>
                                  </span>
                                  {asgn.bebanJam && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white/80 border border-slate-200/60 shrink-0">
                                      {asgn.bebanJam} Jam
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  <span className="text-[10px] text-slate-500 font-medium">Kelas:</span>
                                  {asgn.kelas && asgn.kelas.length > 0 ? (
                                    asgn.kelas.map((k) => (
                                      <span 
                                        key={k} 
                                        className="px-1.5 py-0.2 rounded bg-white text-slate-800 font-mono font-bold text-[10px] border border-slate-200"
                                      >
                                        {k}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-rose-500 font-bold">Belum ada kelas</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-100">
                            <span>Total Beban: <strong className="text-slate-800">{totalJam} Jam</strong>/mgg</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 font-bold font-mono text-[9px]">
                              {teacherAssignments.length} Mapel
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Wali Kelas */}
                      <td className="py-3.5 px-4">
                        {t.waliKelas ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 font-black text-xs">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Kelas {t.waliKelas}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Login Credentials */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 text-xs">
                          @{t.username}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Sandi terenkripsi</span>
                        </div>
                      </td>

                      {/* Status Aktif */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => canManage && handleToggleStatus(t)}
                          disabled={!canManage}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${
                            t.status === 'Non-Aktif'
                              ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          } ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                          title="Klik untuk ubah status aktif/non-aktif"
                        >
                          <CheckCircle2 className={`w-3 h-3 ${t.status === 'Non-Aktif' ? 'text-slate-400' : 'text-emerald-600'}`} />
                          <span>{t.status || 'Aktif'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleQuickResetPassword(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Reset Kata Sandi Akun ke 'edudigital'"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Edit Data Guru & Penugasan Mapel"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id, t.nama)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Akun Guru"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Teacher Add/Edit Modal (Multi-Subject Assignment up to 3 Mapel) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {isEditing ? 'Edit Data & Penugasan Guru' : 'Tambah Guru & Akun Pembelajaran'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi hingga 10 mata pelajaran dengan rombel kelas yang berbeda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2">
                <span>{modalError}</span>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-rose-500 hover:text-rose-800 font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Identitas Guru */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Guru & Gelar Akademik <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dra. Hj. Siti Maryam, M.Pd."
                    value={teacherNama}
                    onChange={(e) => setTeacherNama(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NIP / NUPTK (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="198001012005011001"
                      value={teacherNip}
                      onChange={(e) => setTeacherNip(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      placeholder="08123456789"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tugas Wali Kelas
                    </label>
                    <select
                      value={teacherWaliKelas}
                      onChange={(e) => setTeacherWaliKelas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="">Bukan Wali Kelas</option>
                      {AVAILABLE_CLASSES.map((c) => (
                        <option key={c} value={c}>Wali Kelas {c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Role Pengguna & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Peran Pengguna (*Role*) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={teacherRole}
                      onChange={(e) => setTeacherRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="guru">Guru Pengajar / Wali Kelas (Akses KBM & Jurnal)</option>
                      <option value="piket">Petugas Piket Harian (Scan Gerbang & Absensi Harian)</option>
                      <option value="admin">Administrator Sistem (Hak Akses Penuh)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Status Keaktifan Akun
                    </label>
                    <select
                      value={teacherStatus}
                      onChange={(e) => setTeacherStatus(e.target.value as 'Aktif' | 'Non-Aktif')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Aktif">Aktif (Dapat Masuk Sistem)</option>
                      <option value="Non-Aktif">Non-Aktif (Akses Ditangguhkan)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: PENUGASAN MATA PELAJARAN (Hingga 10 Mapel dengan Rombel Berbeda) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Penugasan Mata Pelajaran ({assignments.length} dari maks. 10)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tentukan mata pelajaran yang diampu beserta rombel kelas masing-masing.
                    </p>
                  </div>

                  {assignments.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddAssignmentSlot}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Mapel ke-{assignments.length + 1}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {assignments.map((asgn, idx) => (
                    <div 
                      key={asgn.id || idx}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-black text-[10px] uppercase tracking-wider">
                          Mata Pelajaran #{idx + 1}
                        </span>

                        {assignments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAssignmentSlot(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Penugasan Mapel Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Mapel Name & Jam */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Nama Mata Pelajaran
                          </label>
                          <input
                            type="text"
                            required
                            list="standard-mapel-options"
                            placeholder="Ketik atau pilih mapel..."
                            value={asgn.mapel}
                            onChange={(e) => handleUpdateAssignmentField(idx, 'mapel', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Beban Jam / Minggu
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="40"
                              value={asgn.bebanJam || 4}
                              onChange={(e) => handleUpdateAssignmentField(idx, 'bebanJam', Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-slate-500 font-semibold shrink-0">Jam</span>
                          </div>
                        </div>
                      </div>

                      {/* Rombel Kelas Selection */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          Pilih Rombel Kelas yang Diajar pada Mapel Ini:
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {AVAILABLE_CLASSES.map((kelasName) => {
                            const isSelected = asgn.kelas.includes(kelasName);
                            return (
                              <button
                                key={kelasName}
                                type="button"
                                onClick={() => handleToggleClassInAssignment(idx, kelasName)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Kelas {kelasName}
                              </button>
                            );
                          })}
                        </div>
                        {asgn.kelas.length === 0 && (
                          <p className="text-[11px] text-rose-500 font-bold mt-1">
                            * Wajib memilih minimal 1 kelas yang diajar.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <datalist id="standard-mapel-options">
                  {STANDARD_MAPEL_LIST.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              {/* Kredensial Akun Login */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">
                  Kredensial Akun Masuk Sistem:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username Login <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: guru.ipa"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Default: edudigital"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isEditing ? 'Simpan Penugasan Guru' : 'Daftarkan Guru & Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
