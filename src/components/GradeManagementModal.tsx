import React, { useState } from 'react';
import { 
  X, 
  Award, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Search, 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  User, 
  Filter,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { Student, StudentGradeItem } from '../types';
import { DatabaseService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { getTeacherAccessibleClasses, isClassMatch, isTeacherWaliKelas } from '../utils/teacherFilter';

interface GradeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  grades: StudentGradeItem[];
  onSaveGrade: (grade: StudentGradeItem) => Promise<void>;
  onDeleteGrade: (id: string) => Promise<void>;
  onBulkDeleteGrades?: (ids: string[]) => Promise<void>;
  currentTeacherName?: string;
  defaultMapel?: string;
}

const DEFAULT_MAPEL_LIST = [
  'Pendidikan Pancasila & PKN',
  'Pendidikan Pancasila dan Kewarganegaraan (PPKn)',
  'Matematika',
  'Ilmu Pengetahuan Alam (IPA)',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pendidikan Agama Islam (PAI)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Seni Budaya',
  'Pendidikan Jasmani & Olahraga (PJOK)',
  'Informatika',
  'Prakarya & Kewirausahaan',
  'Bahasa Sunda (Mulok)',
  'Bahasa Arab (Mulok)',
];

export const GradeManagementModal: React.FC<GradeManagementModalProps> = ({
  isOpen,
  onClose,
  students,
  grades,
  onSaveGrade,
  onDeleteGrade,
  onBulkDeleteGrades,
  currentTeacherName,
  defaultMapel,
}) => {
  const { user, actingAsPiket } = useAuth();
  const isTeacher = user?.role === 'guru' && !actingAsPiket;
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Teacher classes
  const teacherClasses = React.useMemo(() => {
    return isTeacher ? getTeacherAccessibleClasses(user) : [];
  }, [isTeacher, user]);

  // Classes list
  const classes = React.useMemo(() => {
    if (isTeacher && teacherClasses.length > 0) {
      return teacherClasses;
    }
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [isTeacher, teacherClasses, students]);

  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || '9A');
  const [selectedStudentNisn, setSelectedStudentNisn] = useState<string>('');
  const [mapel, setMapel] = useState<string>(user?.mapel || defaultMapel || 'Pendidikan Pancasila & PKN');
  const [jenisPenilaian, setJenisPenilaian] = useState<StudentGradeItem['jenisPenilaian']>('Tugas');
  const [namaPenilaian, setNamaPenilaian] = useState<string>('');
  const [nilai, setNilai] = useState<number>(85);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [komentarGuru, setKomentarGuru] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Scoped students in class
  const studentsInClass = students.filter((s) => isClassMatch(s.kelas, selectedClass));

  // Set default student if class changes
  React.useEffect(() => {
    if (studentsInClass.length > 0 && (!selectedStudentNisn || !studentsInClass.some((s) => s.nisn === selectedStudentNisn))) {
      setSelectedStudentNisn(studentsInClass[0].nisn);
    }
  }, [selectedClass, studentsInClass, selectedStudentNisn]);

  // Sync selectedClass if not in allowed classes
  React.useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => isClassMatch(c, selectedClass))) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  if (!isOpen) return null;

  const handleEdit = (item: StudentGradeItem) => {
    setEditingId(item.id);
    const stu = students.find((s) => s.nisn === item.nisn);
    if (stu) {
      setSelectedClass(stu.kelas);
      setSelectedStudentNisn(stu.nisn);
    }
    setMapel(item.mapel);
    setJenisPenilaian(item.jenisPenilaian);
    setNamaPenilaian(item.namaPenilaian);
    setNilai(item.nilai);
    setTanggal(item.tanggal);
    setKomentarGuru(item.komentarGuru || '');
  };

  const handleResetForm = () => {
    setEditingId(null);
    setNamaPenilaian('');
    setNilai(85);
    setKomentarGuru('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentNisn) {
      alert('Pilih siswa terlebih dahulu.');
      return;
    }
    if (!namaPenilaian.trim()) {
      alert('Isi nama tugas atau ujian.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: StudentGradeItem = {
        id: editingId || `GRD_${Date.now()}_${selectedStudentNisn}`,
        nisn: selectedStudentNisn,
        mapel,
        jenisPenilaian,
        namaPenilaian: namaPenilaian.trim(),
        nilai: Number(nilai),
        tanggal,
        komentarGuru: komentarGuru.trim() || undefined,
        semester: 'Ganjil',
        tahunAjaran: '2026/2027',
      };

      await onSaveGrade(payload);
      handleResetForm();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan nilai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter grades
  const filteredGrades = grades.filter((g) => {
    const student = students.find((s) => s.nisn === g.nisn);
    const matchesClass = selectedClass === 'Semua' || (student && student.kelas === selectedClass);
    const matchesSearch = 
      (student && student.nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
      g.nisn.includes(searchQuery) ||
      g.namaPenilaian.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.mapel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleBulkDelete = async () => {
    if (selectedGradeIds.length === 0) return;
    const count = selectedGradeIds.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} DATA NILAI SISWA TERPILIH?\n\nData nilai terpilih akan benar-benar dihapus permanen dari database (Firestore & Penyimpanan Lokal). Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      if (onBulkDeleteGrades) {
        await onBulkDeleteGrades(selectedGradeIds);
      } else {
        await DatabaseService.bulkDeleteStudentGrades(selectedGradeIds);
      }
      setSelectedGradeIds([]);
    } catch (err) {
      console.error('Failed to bulk delete student grades', err);
      alert('Gagal menghapus data nilai. Silakan coba lagi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Manajemen Nilai & Rapor Siswa
              </h3>
              <p className="text-xs text-blue-100">
                Input dan kelola perolehan nilai tugas, ulangan harian, PTS, dan PAS siswa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout: Form on top/left, List on bottom/right */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form Input Section */}
          <div className="lg:col-span-5 bg-slate-50 p-4 sm:p-5 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>{editingId ? 'Edit Nilai Siswa' : 'Tambah Nilai Baru'}</span>
              </h4>
              {editingId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Filter Kelas & Pilih Siswa */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kelas</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
                  <select
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  >
                    {DEFAULT_MAPEL_LIST.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nama Siswa */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Siswa</label>
                <select
                  value={selectedStudentNisn}
                  onChange={(e) => setSelectedStudentNisn(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800"
                >
                  {studentsInClass.map((s) => (
                    <option key={s.nisn} value={s.nisn}>
                      {s.nama} ({s.nisn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Penilaian & Nilai */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Penilaian</label>
                  <select
                    value={jenisPenilaian}
                    onChange={(e) => setJenisPenilaian(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800"
                  >
                    <option value="Tugas">Tugas / PR</option>
                    <option value="Ulangan Harian">Ulangan Harian (UH)</option>
                    <option value="UTS">UTS / Penilaian Tengah Semester</option>
                    <option value="UAS">UAS / Penilaian Akhir Semester</option>
                    <option value="Praktikum">Praktikum / Kinerja</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Angka Nilai (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={nilai}
                    onChange={(e) => setNilai(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-mono font-black text-slate-900 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Nama Penilaian / Judul */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Tugas / Judul Ujian</label>
                <input
                  type="text"
                  placeholder="Contoh: Ulangan Harian 1: Aljabar dan Persamaan"
                  value={namaPenilaian}
                  onChange={(e) => setNamaPenilaian(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                  required
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                  required
                />
              </div>

              {/* Komentar Guru */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Komentar / Catatan Guru (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Penguasaan konsep sangat baik, tingkatkan ketelitian pada soal pecahan..."
                  value={komentarGuru}
                  onChange={(e) => setKomentarGuru(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Perbarui Nilai' : 'Simpan Nilai Siswa'}</span>
              </button>
            </form>
          </div>

          {/* Table List Section */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h4 className="font-extrabold text-sm text-slate-800">
                Daftar Nilai Tercatat ({filteredGrades.length})
              </h4>
              
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nilai, siswa, mapel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Bulk Delete Floating/Action Bar */}
            {selectedGradeIds.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
                  <span>
                    <strong>{selectedGradeIds.length}</strong> nilai dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGradeIds([])}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isBulkDeleting ? 'Menghapus...' : `Hapus (${selectedGradeIds.length})`}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={filteredGrades.length > 0 && selectedGradeIds.length === filteredGrades.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGradeIds(filteredGrades.map((g) => g.id));
                          } else {
                            setSelectedGradeIds([]);
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Pilih Semua Nilai"
                      />
                    </th>
                    <th className="py-2.5 px-3">Siswa</th>
                    <th className="py-2.5 px-3">Mapel & Tugas</th>
                    <th className="py-2.5 px-3 text-center">Nilai</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGrades.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada data nilai di kelas ini.
                      </td>
                    </tr>
                  ) : (
                    filteredGrades.map((g) => {
                      const student = students.find((s) => s.nisn === g.nisn);
                      const isSelected = selectedGradeIds.includes(g.id);

                      return (
                        <tr 
                          key={g.id} 
                          className={`hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGradeIds((prev) => [...prev, g.id]);
                                } else {
                                  setSelectedGradeIds((prev) => prev.filter((id) => id !== g.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{student?.nama || g.nisn}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Kelas {student?.kelas || '-'}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-700 block">{g.mapel}</span>
                            <span className="text-[11px] text-slate-500">{g.namaPenilaian}</span>
                            <span className="text-[10px] text-blue-600 font-mono ml-1">({g.jenisPenilaian})</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-black text-xs border ${
                              g.nilai >= 85 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              g.nilai >= 75 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {g.nilai}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(g)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Edit Nilai"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteGrade(g.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus Nilai"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
