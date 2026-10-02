import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileArchive, 
  Edit2, 
  Trash2, 
  CheckCircle,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Plus,
  Camera,
  Eye,
  X,
  BookOpen,
  Sparkles,
  Printer,
  MessageSquare
} from 'lucide-react';
import { Student, SchoolConfig } from '../types';
import { DatabaseService } from '../services/db';
import { downloadQrZipForStudents, generateQrDataUrl } from '../utils/qr';
import { exportStudentTemplateExcel } from '../utils/exportExcel';
import { generateStudentListPdf } from '../utils/exportPdf';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';
import { 
  filterStudentsForTeacher, 
  getTeacherAccessibleClasses, 
  isClassMatch, 
  isTeacherWaliKelas, 
  normalizeClassName 
} from '../utils/teacherFilter';

interface StudentManagementProps {
  students: Student[];
  onSaveStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (nisn: string) => Promise<void>;
  onBulkDeleteStudents?: (nisns: string[]) => Promise<void>;
  onBulkSaveStudents: (newStudents: Student[]) => Promise<void>;
  schoolConfig: SchoolConfig;
  onOpenWhatsApp?: (student: Student) => void;
  onOpenReportCard?: (student: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  onSaveStudent,
  onDeleteStudent,
  onBulkDeleteStudents,
  onBulkSaveStudents,
  schoolConfig,
  onOpenWhatsApp,
  onOpenReportCard,
}) => {
  const { user, actingAsPiket } = useAuth();
  const isTeacher = user?.role === 'guru' && !actingAsPiket;

  // Filter State
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [selectedNisns, setSelectedNisns] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Form State
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJk, setFormJk] = useState<'L' | 'P'>('L');
  const [formKelas, setFormKelas] = useState('7A');
  const [formPhone, setFormPhone] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  // Bulk import feedback
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Scoped students based on user role and teacher assignments
  const scopedStudents = useMemo(() => {
    return filterStudentsForTeacher(students, user, actingAsPiket);
  }, [students, user, actingAsPiket]);

  const teacherAccessibleClasses = useMemo(() => {
    return isTeacher ? getTeacherAccessibleClasses(user) : [];
  }, [isTeacher, user]);

  const classesList = useMemo(() => {
    return Array.from(new Set(scopedStudents.map((s) => s.kelas))).sort();
  }, [scopedStudents]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return scopedStudents.filter((s) => {
      if (selectedClass !== 'Semua') {
        if (selectedClass === 'WALI_KELAS') {
          if (!isTeacherWaliKelas(user, s.kelas)) return false;
        } else if (!isClassMatch(s.kelas, selectedClass)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.nama.toLowerCase().includes(q) || s.nisn.includes(q);
      }
      return true;
    });
  }, [scopedStudents, selectedClass, searchQuery, user]);

  // Modal Handlers
  const handleOpenAddStudent = () => {
    setIsEditingStudent(false);
    setFormNisn('');
    setFormNama('');
    setFormJk('L');
    setFormKelas(classesList[0] || '9A');
    setFormPhone('');
    setFormFotoUrl('');
    setModalError(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setIsEditingStudent(true);
    setFormNisn(student.nisn);
    setFormNama(student.nama);
    setFormJk(student.jk);
    setFormKelas(student.kelas);
    setFormPhone(student.nomorTeleponOrtu || '');
    setFormFotoUrl(student.fotoUrl || '');
    setModalError(null);
    setIsStudentModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setModalError('Ukuran foto maksimal 2MB. Silakan gunakan foto yang lebih kecil.');
      return;
    }
    setModalError(null);

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      if (typeof uploadEvt.target?.result === 'string') {
        setFormFotoUrl(uploadEvt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNisn.trim() || !formNama.trim() || !formKelas.trim()) return;

    const student: Student = {
      nisn: formNisn.trim(),
      nama: formNama.trim(),
      jk: formJk,
      kelas: formKelas.trim().toUpperCase(),
      fotoUrl: formFotoUrl.trim() || undefined,
      nomorTeleponOrtu: formPhone.trim() || undefined,
    };

    await onSaveStudent(student);
    setIsStudentModalOpen(false);
  };

  // Bulk Excel Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const parsedStudents: Student[] = [];

        data.forEach((row) => {
          const nisn = String(row['NISN'] || row['nisn'] || row['Nisn'] || '').trim();
          const nama = String(row['Nama Siswa'] || row['nama'] || row['Nama'] || row['NAMA'] || '').trim();
          const jkRaw = String(row['Jenis Kelamin (L/P)'] || row['jk'] || row['JK'] || row['L/P'] || 'L').trim().toUpperCase();
          const kelas = String(row['Kelas'] || row['kelas'] || row['KELAS'] || '7A').trim().toUpperCase();
          const phone = String(row['Nomor WhatsApp Orang Tua'] || row['phone'] || row['telepon'] || '').trim();

          if (nisn && nama) {
            parsedStudents.push({
              nisn,
              nama,
              jk: jkRaw.startsWith('P') ? 'P' : 'L',
              kelas: kelas || '7A',
              nomorTeleponOrtu: phone || undefined,
            });
          }
        });

        if (parsedStudents.length > 0) {
          await onBulkSaveStudents(parsedStudents);
          setImportStatus(`Berhasil mengimpor ${parsedStudents.length} siswa baru!`);
          setTimeout(() => setImportStatus(null), 5000);
        } else {
          setImportStatus('Tidak ada data valid yang ditemukan pada file.');
          setTimeout(() => setImportStatus(null), 5000);
        }
      } catch (err) {
        console.error('Error importing file:', err);
        setImportStatus('Gagal membaca file Excel. Pastikan format kolom sesuai template.');
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleDelete = async (nisn: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus data siswa "${nama}" (NISN: ${nisn})?`)) {
      await onDeleteStudent(nisn);
      setSelectedNisns((prev) => prev.filter((n) => n !== nisn));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNisns.length === 0) return;
    const count = selectedNisns.length;
    if (!confirm(`YAKIN INGIN MENGHAPUS ${count} DATA SISWA TERPILIH?\n\nSetiap data yang dihapus akan benar-benar hilang dari database sekolah (Firestore & Penyimpanan Lokal). Tindakan ini permanen.`)) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      if (onBulkDeleteStudents) {
        await onBulkDeleteStudents(selectedNisns);
      } else {
        await DatabaseService.bulkDeleteStudents(selectedNisns);
      }
      setSelectedNisns([]);
    } catch (err) {
      console.error('Failed to bulk delete students', err);
      alert('Gagal menghapus data siswa. Silakan coba lagi.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDownloadSingleQr = async (student: Student) => {
    const dataUrl = await generateQrDataUrl(student.nisn);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${student.kelas}_${student.nisn}_${student.nama.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  const handleDownloadClassZip = async () => {
    const label = selectedClass === 'Semua' ? 'SEMUA_KELAS' : `KELAS_${selectedClass}`;
    await downloadQrZipForStudents(filteredStudents, label, schoolConfig.namaSekolah);
  };

  const canManage = user?.role === 'admin';

  return (
    <div className="space-y-6">
      
      {/* Header & Action Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>
                  {isTeacher 
                    ? `Data Siswa Binaan (${scopedStudents.length} Siswa)` 
                    : `Data Pokok Siswa (${students.length} Siswa)`}
                </span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200">
                Dapodik Sekolah
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {schoolConfig.namaSekolah} • Kelola data siswa, foto profil, impor massal dari file Excel Dapodik, dan unduh berkas QR Code digital.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportStudentTemplateExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Download Template Format Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Format Excel</span>
          </button>

          {/* Export PDF Nominatif */}
          <button
            onClick={() => generateStudentListPdf(filteredStudents, schoolConfig, selectedClass)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
            title="Cetak Daftar Nominatif Siswa Resmi ke Dokumen PDF"
          >
            <Printer className="w-3.5 h-3.5 text-rose-600" />
            <span>Cetak PDF</span>
          </button>

          {canManage && (
            <label className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Impor Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}

          <button
            onClick={handleDownloadClassZip}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors cursor-pointer"
            title="Download Semua QR Code dalam format ZIP"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Unduh ZIP QR</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAddStudent}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* Import status notification */}
      {importStatus && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Teacher Teaching Assignment Banner if logged in as Guru */}
      {user?.role === 'guru' && (
        <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px] uppercase">
                Guru Mapel
              </span>
              <strong className="text-xs text-indigo-950 font-extrabold">{user.nama}</strong>
              {user.waliKelas && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-200 text-amber-900 font-extrabold text-[10px]">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>Wali Kelas {user.waliKelas}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-indigo-800 font-medium">
              Mata Pelajaran & Rombel Kelas yang Anda ampu:
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {user.penugasanMapel && user.penugasanMapel.length > 0 ? (
                user.penugasanMapel.map((asgn, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-indigo-200/80 text-indigo-950 font-bold text-xs shadow-2xs">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{asgn.mapel}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold">({asgn.kelas.join(', ')})</span>
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white text-indigo-900 font-bold text-xs border border-indigo-200">
                  {user.mapel || 'Guru Pengajar'}
                </span>
              )}
            </div>
          </div>

          {user.waliKelas && (
            <button
              onClick={() => setSelectedClass(user.waliKelas || 'Semua')}
              className="self-start md:self-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Filter Kelas Binaan ({user.waliKelas})
            </button>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="Semua">
                {isTeacher 
                  ? `Semua Rombel Binaan (${scopedStudents.length})` 
                  : `Semua Kelas (${students.length})`}
              </option>
              {isTeacher && user?.waliKelas && (
                <option value="WALI_KELAS">
                  ⭐ Khusus Kelas Wali Kelas ({user.waliKelas})
                </option>
              )}
              {classesList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c} ({scopedStudents.filter((s) => isClassMatch(s.kelas, c)).length} Siswa) {isTeacher && isTeacherWaliKelas(user, c) ? '★ Wali Kelas' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-bold self-end sm:self-center">
          Menampilkan <strong className="text-slate-900">{filteredStudents.length}</strong> siswa
        </div>
      </div>

      {/* Bulk Delete Floating/Action Bar */}
      {selectedNisns.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-rose-950 font-bold text-xs sm:text-sm">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
            <span>
              <strong>{selectedNisns.length}</strong> siswa dipilih untuk tindakan massal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedNisns([])}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
            >
              Batalkan Pilihan
            </button>
            {canManage && (
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-600/25 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isBulkDeleting ? 'Menghapus dari Database...' : `Hapus (${selectedNisns.length}) Siswa Terpilih`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                {canManage && (
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedNisns.length === filteredStudents.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNisns(filteredStudents.map((s) => s.nisn));
                        } else {
                          setSelectedNisns([]);
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Pilih Semua Siswa yang Tampil"
                    />
                  </th>
                )}
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Foto</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Nama Lengkap Siswa</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Kontak Orang Tua</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-slate-400">
                    Tidak ada siswa yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr 
                    key={s.nisn} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selectedNisns.includes(s.nisn) ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    {canManage && (
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedNisns.includes(s.nisn)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNisns((prev) => [...prev, s.nisn]);
                            } else {
                              setSelectedNisns((prev) => prev.filter((n) => n !== s.nisn));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="py-3 px-4 font-medium text-slate-500">{idx + 1}</td>
                    
                    {/* Student Profile Photo Preview */}
                    <td className="py-2.5 px-4">
                      <div 
                        onClick={() => setPreviewStudent(s)}
                        className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs group cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                        title="Klik untuk memperbesar foto siswa"
                      >
                        {s.fotoUrl ? (
                          <img
                            src={s.fotoUrl}
                            alt={s.nama}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex flex-col items-center justify-center font-black text-xs ${
                          s.jk === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <span>{s.nama.substring(0, 2).toUpperCase()}</span>
                        </div>
                        
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.nisn}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <span>{s.nama}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.jk === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                        {s.jk}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-extrabold text-slate-700">
                          {s.kelas}
                        </span>
                        {isTeacher && isTeacherWaliKelas(user, s.kelas) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                            <span>Wali Kelas</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {s.nomorTeleponOrtu || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* WhatsApp Notification Button */}
                        {onOpenWhatsApp && (
                          <button
                            type="button"
                            onClick={() => onOpenWhatsApp(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Kirim Notifikasi WhatsApp ke Orang Tua Siswa"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}

                        {/* Print / View Report Card Button */}
                        {onOpenReportCard && (
                          <button
                            type="button"
                            onClick={() => onOpenReportCard(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Cetak & Pratinjau Rapor Digital Siswa"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadSingleQr(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Unduh QR Code Siswa Ini"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditStudent(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Data Siswa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.nisn, s.nama)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Add/Edit Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {isEditingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Pastikan NISN unik dan belum pernah didaftarkan pada siswa lain.
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between gap-2">
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

            <form onSubmit={handleSubmitStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nomor Induk Siswa Nasional (NISN)
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditingStudent}
                  placeholder="Contoh: 0091234001"
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama sesuai akta / ijazah"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formJk}
                    onChange={(e) => setFormJk(e.target.value as 'L' | 'P')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Rombel / Kelas
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 7A, 8B, 9A"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Foto Profil Siswa (Opsional)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  {/* Photo Preview Thumbnail */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-2xs flex items-center justify-center">
                    {formFotoUrl ? (
                      <img
                        src={formFotoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-[10px]">
                        <Camera className="w-5 h-5 mb-0.5 text-slate-300" />
                        <span>Kosong</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>

                      {formFotoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormFotoUrl('')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Atau tempel URL gambar langsung..."
                      value={formFotoUrl}
                      onChange={(e) => setFormFotoUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono text-slate-600 truncate"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  No. WhatsApp / HP Orang Tua (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isEditingStudent ? 'Simpan Perubahan' : 'Tambahkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Photo Preview Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col items-center text-center relative">
            <button
              onClick={() => setPreviewStudent(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-slate-100 shadow-lg bg-slate-100 mb-4 flex items-center justify-center relative">
              {previewStudent.fotoUrl ? (
                <img
                  src={previewStudent.fotoUrl}
                  alt={previewStudent.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center font-black ${
                  previewStudent.jk === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <span className="text-4xl">{previewStudent.nama.substring(0, 2).toUpperCase()}</span>
                  <span className="text-xs font-bold uppercase mt-1">Belum Ada Foto</span>
                </div>
              )}
            </div>

            <h3 className="font-extrabold text-base text-slate-900 leading-tight">
              {previewStudent.nama}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-1">
              NISN: <strong className="text-slate-800">{previewStudent.nisn}</strong> • Kelas <strong className="text-blue-700">{previewStudent.kelas}</strong>
            </p>

            <div className="mt-3 flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                previewStudent.jk === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
              }`}>
                {previewStudent.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}
              </span>
              {previewStudent.nomorTeleponOrtu && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700">
                  WA: {previewStudent.nomorTeleponOrtu}
                </span>
              )}
            </div>

            <button
              onClick={() => setPreviewStudent(null)}
              className="mt-5 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
