import React, { useState, useMemo } from 'react';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  User, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Tag, 
  X,
  FileText,
  Layers,
  ChevronRight,
  Award
} from 'lucide-react';
import { AssignmentItem, TeacherUser, SchoolConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getTeacherAccessibleClasses, normalizeClassName, isClassMatch } from '../utils/teacherFilter';

interface AssignmentManagementProps {
  assignments: AssignmentItem[];
  teachers: TeacherUser[];
  schoolConfig: SchoolConfig;
  availableClasses: string[];
  onSaveAssignment: (assignment: AssignmentItem) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
}

export const AssignmentManagement: React.FC<AssignmentManagementProps> = ({
  assignments,
  teachers,
  schoolConfig,
  availableClasses,
  onSaveAssignment,
  onDeleteAssignment,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('Semua');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('Semua');
  const [onlyMyAssignments, setOnlyMyAssignments] = useState(user?.role === 'guru');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scoped classes for teacher vs admin
  const teacherAccessibleClasses = useMemo(() => {
    return user?.role === 'guru' ? getTeacherAccessibleClasses(user) : [];
  }, [user]);

  const targetClassesList = useMemo(() => {
    if (user?.role === 'guru' && teacherAccessibleClasses.length > 0) {
      return teacherAccessibleClasses;
    }
    return availableClasses.length > 0 ? availableClasses : ['7A', '7B', '8A', '8B', '9A', '9B'];
  }, [user, teacherAccessibleClasses, availableClasses]);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formKelas, setFormKelas] = useState(targetClassesList[0] || '7A');
  const [formMapel, setFormMapel] = useState(user?.mapel || 'Matematika');
  const [formJudul, setFormJudul] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formDeadline, setFormDeadline] = useState(todayStr);
  const [formDeadlineTime, setFormDeadlineTime] = useState('23:59');
  const [formTipe, setFormTipe] = useState<'Tugas' | 'Ulangan' | 'Praktikum' | 'Proyek'>('Tugas');
  const [formGuruId, setFormGuruId] = useState(user?.role === 'guru' ? user.id : teachers[0]?.id || '');
  const [formGuruNama, setFormGuruNama] = useState(user?.role === 'guru' ? user.nama : teachers[0]?.nama || '');

  // Teacher available subjects
  const teacherSubjects = useMemo(() => {
    if (user?.role === 'guru') {
      const subs = new Set<string>();
      if (user.mapel) subs.add(user.mapel);
      if (Array.isArray(user.penugasanMapel)) {
        user.penugasanMapel.forEach((a) => {
          if (a.mapel) subs.add(a.mapel);
        });
      }
      return Array.from(subs);
    }
    return [];
  }, [user]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setFormKelas(targetClassesList[0] || '7A');
    setFormMapel(user?.mapel || teacherSubjects[0] || 'Matematika');
    setFormJudul('');
    setFormDeskripsi('');
    // Default deadline: 3 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setFormDeadline(d.toISOString().split('T')[0]);
    setFormDeadlineTime('23:59');
    setFormTipe('Tugas');
    setFormGuruId(user?.role === 'guru' ? user.id : teachers[0]?.id || '');
    setFormGuruNama(user?.role === 'guru' ? user.nama : teachers[0]?.nama || '');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (asgn: AssignmentItem) => {
    setEditingAssignment(asgn);
    setFormKelas(asgn.kelas);
    setFormMapel(asgn.mapel);
    setFormJudul(asgn.judul);
    setFormDeskripsi(asgn.deskripsi);
    
    // Parse deadline
    if (asgn.deadline.includes('T')) {
      const [d, t] = asgn.deadline.split('T');
      setFormDeadline(d);
      setFormDeadlineTime(t.substring(0, 5) || '23:59');
    } else {
      setFormDeadline(asgn.deadline);
      setFormDeadlineTime('23:59');
    }

    setFormTipe(asgn.tipe);
    setFormGuruId(asgn.guruId || (user?.role === 'guru' ? user.id : teachers[0]?.id || ''));
    setFormGuruNama(asgn.guruNama);
    setIsModalOpen(true);
  };

  // Submit Assignment Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formKelas || !formMapel.trim() || !formDeadline) {
      toast.warning('Form Belum Lengkap', 'Mohon lengkapi judul, kelas, mapel, dan batas waktu pengumpulan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullDeadline = `${formDeadline}T${formDeadlineTime || '23:59'}:00`;
      const assignmentData: AssignmentItem = {
        id: editingAssignment ? editingAssignment.id : `ASGN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        kelas: formKelas,
        mapel: formMapel.trim(),
        guruNama: user?.role === 'guru' ? user.nama : formGuruNama,
        guruId: user?.role === 'guru' ? user.id : formGuruId,
        judul: formJudul.trim(),
        deskripsi: formDeskripsi.trim(),
        deadline: fullDeadline,
        tipe: formTipe,
        createdAt: editingAssignment?.createdAt || new Date().toISOString(),
      };

      await onSaveAssignment(assignmentData);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save assignment', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan tugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Assignment
  const handleDelete = async (id: string, judul: string) => {
    if (!confirm(`Hapus tugas "${judul}" dari database? Tindakan ini permanen.`)) return;
    try {
      await onDeleteAssignment(id);
    } catch (err) {
      console.error('Failed to delete assignment', err);
      toast.error('Gagal Menghapus', 'Terjadi kesalahan saat menghapus data tugas.');
    }
  };

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Guru Scope: Only display assignments for classes assigned to this teacher!
      if (user?.role === 'guru' && teacherAccessibleClasses.length > 0) {
        if (!teacherAccessibleClasses.includes(normalizeClassName(a.kelas))) {
          return false;
        }
      }
      // Author filter (if toggled)
      if (onlyMyAssignments && user?.role === 'guru') {
        const isAuthor = (a.guruId && a.guruId === user.id) || 
          (a.guruNama && user.nama && a.guruNama.toLowerCase().trim() === user.nama.toLowerCase().trim());
        if (!isAuthor) return false;
      }
      // Class Filter
      if (selectedClassFilter !== 'Semua' && !isClassMatch(a.kelas, selectedClassFilter)) {
        return false;
      }
      // Type Filter
      if (selectedTypeFilter !== 'Semua' && a.tipe !== selectedTypeFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchJudul = a.judul.toLowerCase().includes(q);
        const matchMapel = a.mapel.toLowerCase().includes(q);
        const matchGuru = a.guruNama.toLowerCase().includes(q);
        const matchDesk = a.deskripsi.toLowerCase().includes(q);
        if (!matchJudul && !matchMapel && !matchGuru && !matchDesk) return false;
      }
      return true;
    });
  }, [assignments, onlyMyAssignments, user, selectedClassFilter, selectedTypeFilter, searchQuery]);

  // Quick statistics
  const stats = useMemo(() => {
    const now = new Date().toISOString();
    const active = assignments.filter((a) => (a.deadline || '') >= now).length;
    const expired = assignments.length - active;
    const uniqueClasses = new Set(assignments.map((a) => a.kelas)).size;
    return { total: assignments.length, active, expired, uniqueClasses };
  }, [assignments]);

  const canEditAssignment = (asgn: AssignmentItem) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'guru') {
      return (asgn.guruId && asgn.guruId === user.id) ||
        (asgn.guruNama && user.nama && asgn.guruNama.toLowerCase().trim() === user.nama.toLowerCase().trim());
    }
    return false;
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Role Info */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Sinkronisasi Otomatis Guru &amp; Admin</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <FileCheck className="w-7 h-7 text-indigo-400" />
              <span>Kelola Tugas &amp; PR Siswa</span>
            </h2>
            <p className="text-xs text-indigo-200/90 max-w-2xl leading-relaxed">
              Input tugas harian, PR, praktikum, dan proyek pembelajaran. Data tugas langsung tersinkronkan ke pangkalan data cloud, otomatis membuka hak akses kelas untuk guru, dan langsung tampil di menu admin &amp; portal orang tua (Pantau Anak).
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="self-start md:self-auto px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs shadow-lg shadow-indigo-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Buat Tugas Baru</span>
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-indigo-800/60">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] font-bold text-indigo-200">Total Tugas</div>
            <div className="text-xl font-black text-white">{stats.total}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
            <div className="text-[11px] font-bold text-emerald-300">Tugas Aktif</div>
            <div className="text-xl font-black text-emerald-300">{stats.active}</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20">
            <div className="text-[11px] font-bold text-amber-300">Lewat Tenggat</div>
            <div className="text-xl font-black text-amber-300">{stats.expired}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20">
            <div className="text-[11px] font-bold text-indigo-300">Kelas Terlayani</div>
            <div className="text-xl font-black text-indigo-300">{stats.uniqueClasses} Rombel</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul tugas, mapel, materi, atau guru pengampu..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter Kelas */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="Semua">Semua Kelas</option>
                {targetClassesList.map((c) => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>
            </div>

            {/* Filter Tipe */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="Semua">Semua Tipe</option>
                <option value="Tugas">Tugas</option>
                <option value="Ulangan">Ulangan</option>
                <option value="Praktikum">Praktikum</option>
                <option value="Proyek">Proyek</option>
              </select>
            </div>

            {/* Toggle Only My Assignments (for Guru) */}
            {user?.role === 'guru' && (
              <button
                type="button"
                onClick={() => setOnlyMyAssignments(!onlyMyAssignments)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer border ${
                  onlyMyAssignments 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {onlyMyAssignments ? '⭐ Tugas Saya Saja' : 'Semua Guru'}
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Assignment Cards List */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">Belum Ada Tugas Siswa</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {searchQuery || selectedClassFilter !== 'Semua' || selectedTypeFilter !== 'Semua'
              ? 'Tidak ditemukan tugas yang sesuai dengan filter pencarian.'
              : 'Guru dan Admin dapat menambahkan penugasan baru agar siswa dan orang tua dapat memantau tugas secara langsung.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tugas Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((asgn) => {
            const isExpired = Boolean(asgn.deadline && new Date(asgn.deadline) < new Date());
            const deadlineFormatted = asgn.deadline
              ? new Date(asgn.deadline).toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '-';

            const canManage = canEditAssignment(asgn);

            return (
              <div 
                key={asgn.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-black text-[11px]">
                      Kelas {asgn.kelas}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        asgn.tipe === 'Ulangan' 
                          ? 'bg-rose-100 text-rose-800' 
                          : asgn.tipe === 'Praktikum'
                          ? 'bg-purple-100 text-purple-800'
                          : asgn.tipe === 'Proyek'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {asgn.tipe}
                      </span>
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px]">
                          Selesai
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Aktif</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      {asgn.mapel}
                    </div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {asgn.judul}
                    </h4>
                  </div>

                  {/* Description */}
                  {asgn.deskripsi && (
                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                      {asgn.deskripsi}
                    </p>
                  )}
                </div>

                {/* Footer Info & Actions */}
                <div className="pt-4 mt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold truncate">{asgn.guruNama}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{deadlineFormatted}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(asgn)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Edit tugas"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asgn.id, asgn.judul)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Assignment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 my-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingAssignment ? 'Edit Tugas Siswa' : 'Buat Tugas Siswa Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Sinkronisasi otomatis ke database, menu admin &amp; portal orang tua
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Row 1: Kelas & Tipe */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Kelas (Rombel) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                    required
                  >
                    {targetClassesList.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Tipe Tugas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTipe}
                    onChange={(e) => setFormTipe(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                    required
                  >
                    <option value="Tugas">Tugas Harian / PR</option>
                    <option value="Ulangan">Ulangan / UH</option>
                    <option value="Praktikum">Praktikum</option>
                    <option value="Proyek">Proyek Kelompok</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Mata Pelajaran */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={formMapel}
                    onChange={(e) => setFormMapel(e.target.value)}
                    placeholder="e.g. Matematika / IPA / Bahasa Indonesia"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                  />
                  {teacherSubjects.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">Pilih Cepat:</span>
                      {teacherSubjects.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormMapel(s)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            formMapel.toLowerCase() === s.toLowerCase()
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Judul Tugas */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Judul Tugas / Penugasan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  placeholder="e.g. Latihan Persamaan Linear Soal No 1-10 Halaman 45"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  required
                />
              </div>

              {/* Row 4: Guru Pengampu (Admin only picks, Guru is automatic) */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Guru Pengampu <span className="text-rose-500">*</span>
                </label>
                {user?.role === 'guru' ? (
                  <div>
                    <input
                      type="text"
                      value={user.nama}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-emerald-700 font-bold mt-1">
                      ✓ Penugasan otomatis terhubung dengan akun guru Anda &amp; membuka role kelas ini
                    </p>
                  </div>
                ) : (
                  <select
                    value={formGuruId}
                    onChange={(e) => {
                      const sel = teachers.find((t) => t.id === e.target.value);
                      setFormGuruId(e.target.value);
                      if (sel) {
                        setFormGuruNama(sel.nama);
                        if (sel.mapel) setFormMapel(sel.mapel);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Guru Pengampu --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.nama} {t.mapel ? `(${t.mapel})` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Row 5: Deadline Tanggal & Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Batas Tanggal (Deadline) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Pukul Selesai
                  </label>
                  <input
                    type="time"
                    value={formDeadlineTime}
                    onChange={(e) => setFormDeadlineTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Row 6: Deskripsi & Petunjuk */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Deskripsi &amp; Petunjuk Pengerjaan
                </label>
                <textarea
                  rows={3}
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Tuliskan petunjuk pengerjaan tugas, buku acuan, atau instruksi pengumpulan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Info Banner */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-900">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Tugas ini akan otomatis masuk ke database cloud, dapat diedit oleh Guru dan Admin, serta otomatis tampil di aplikasi Pantau Anak untuk orang tua.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-black cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Menyimpan ke Cloud...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingAssignment ? 'Simpan Perubahan' : 'Terbitkan Tugas'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
