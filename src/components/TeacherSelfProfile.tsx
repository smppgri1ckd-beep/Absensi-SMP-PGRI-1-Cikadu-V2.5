import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, 
  GraduationCap, 
  Save, 
  Upload, 
  Phone, 
  BookOpen, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Printer, 
  FileDown, 
  Eye, 
  QrCode, 
  CheckCircle2, 
  Check, 
  Camera, 
  Image as ImageIcon,
  Sparkles,
  Calendar,
  Layers,
  Clock,
  Edit3,
  MapPin,
  X,
  Zap,
  Tag
} from 'lucide-react';
import { AuthUser, TeacherUser, SchoolConfig, TeachingAssignment, DayOfWeek, ClassScheduleItem } from '../types';
import { IdCardFront } from './IdCardFront';
import { IdCardBack } from './IdCardBack';
import { IdCardPreviewModal } from './IdCardPreviewModal';
import { EnlargedQrCodeModal } from './EnlargedQrCodeModal';
import { generateQrDataUrl } from '../utils/qr';
import { triggerDirectPrint } from '../utils/print';
import { useToast } from '../context/ToastContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface TeacherSelfProfileProps {
  currentUser: AuthUser;
  teachers: TeacherUser[];
  onSaveTeacher: (updated: TeacherUser) => Promise<void> | void;
  schoolConfig: SchoolConfig;
  schedules?: ClassScheduleItem[];
  onSaveSchedule?: (schedule: ClassScheduleItem) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
}

export const TeacherSelfProfile: React.FC<TeacherSelfProfileProps> = ({
  currentUser,
  teachers,
  onSaveTeacher,
  schoolConfig,
  schedules = [],
  onSaveSchedule,
  onDeleteSchedule,
}) => {
  const { toast } = useToast();

  // Find or create current teacher object
  const currentTeacher: TeacherUser = useMemo(() => {
    let matched = teachers.find((t) => t.id === currentUser.id);

    if (!matched && currentUser.username) {
      matched = teachers.find(
        (t) => t.username && t.username.toLowerCase().trim() === currentUser.username.toLowerCase().trim()
      );
    }

    const userNip = currentUser.nip?.trim();
    if (!matched && userNip && userNip !== '-') {
      matched = teachers.find(
        (t) => t.nip && t.nip.trim() !== '-' && t.nip.trim() === userNip
      );
    }

    if (!matched && currentUser.nama) {
      matched = teachers.find(
        (t) => t.nama && t.nama.toLowerCase().trim() === currentUser.nama.toLowerCase().trim()
      );
    }

    if (matched) return matched;

    return {
      id: currentUser.id || 'teacher-self',
      nama: currentUser.nama || 'Guru Sekolah',
      username: currentUser.username || 'guru',
      nip: currentUser.nip || '-',
      mapel: currentUser.mapel || 'Guru Mapel',
      role: (currentUser.role as any) || 'guru',
      fotoUrl: '',
      nomorHp: currentUser.nomorHp || '',
      status: 'Aktif',
      penugasanMapel: currentUser.penugasanMapel || [],
      waliKelas: currentUser.waliKelas || '',
      isGuruMapel: true,
      isWaliKelas: Boolean(currentUser.waliKelas),
      isGuruPiket: Boolean(currentUser.isAssignedPiketToday),
      piketDays: [],
    };
  }, [currentUser, teachers]);

  // Form State
  const [formData, setFormData] = useState<TeacherUser>(currentTeacher);
  const [isSaving, setIsSaving] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEnlargedQrOpen, setIsEnlargedQrOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');

  // Schedules for this specific teacher
  const mySchedules = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    const teacherId = formData.id || currentUser.id;
    const teacherNama = (formData.nama || currentUser.nama || '').toLowerCase().trim();
    const teacherNip = (formData.nip || currentUser.nip || '').trim();

    return schedules.filter((s) => {
      if (s.guruId && s.guruId === teacherId) return true;
      if (s.guruNip && teacherNip && teacherNip !== '-' && s.guruNip.trim() === teacherNip) return true;
      if (s.guruNama && teacherNama && s.guruNama.toLowerCase().trim().includes(teacherNama)) return true;
      return false;
    });
  }, [schedules, formData.id, formData.nama, formData.nip, currentUser.id, currentUser.nama, currentUser.nip]);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const [formSchedule, setFormSchedule] = useState<{
    hari: DayOfWeek;
    kelas: string;
    jamKe: string;
    jamMulai: string;
    jamSelesai: string;
    mapel: string;
    ruang: string;
    warna: string;
  }>({
    hari: 'Senin',
    kelas: '7A',
    jamKe: '1 - 2',
    jamMulai: '07:30',
    jamSelesai: '08:50',
    mapel: formData.mapel || 'Mata Pelajaran',
    ruang: 'R. Kelas 7A',
    warna: 'teal',
  });

  const resetScheduleForm = (overrideDay?: DayOfWeek) => {
    setEditingScheduleId(null);
    setFormSchedule({
      hari: overrideDay || 'Senin',
      kelas: '7A',
      jamKe: '1 - 2',
      jamMulai: '07:30',
      jamSelesai: '08:50',
      mapel: formData.mapel || 'Mata Pelajaran',
      ruang: 'R. Kelas 7A',
      warna: 'teal',
    });
  };

  const handleOpenNewScheduleModal = (day?: DayOfWeek) => {
    resetScheduleForm(day);
    setIsScheduleModalOpen(true);
  };

  const handleEditScheduleItem = (sch: ClassScheduleItem) => {
    setEditingScheduleId(sch.id);
    setFormSchedule({
      hari: sch.hari as DayOfWeek,
      kelas: sch.kelas,
      jamKe: sch.jamKe || '1 - 2',
      jamMulai: sch.jamMulai || '07:30',
      jamSelesai: sch.jamSelesai || '08:50',
      mapel: sch.mapel,
      ruang: sch.ruang || `R. Kelas ${sch.kelas}`,
      warna: sch.warna || 'teal',
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSchedule.kelas || !formSchedule.hari) {
      toast.error('Gagal Menyimpan', 'Pilih hari dan kelas mengajar.');
      return;
    }

    const scheduleItem: ClassScheduleItem = {
      id: editingScheduleId || `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      kelas: formSchedule.kelas,
      hari: formSchedule.hari,
      jamMulai: formSchedule.jamMulai || '07:30',
      jamSelesai: formSchedule.jamSelesai || '08:50',
      jamKe: formSchedule.jamKe || '1 - 2',
      mapel: formSchedule.mapel || formData.mapel || 'Mata Pelajaran',
      guruNama: formData.nama || currentUser.nama || 'Guru',
      guruId: formData.id || currentUser.id,
      guruNip: formData.nip || currentUser.nip || '',
      ruang: formSchedule.ruang || `R. Kelas ${formSchedule.kelas}`,
      warna: formSchedule.warna || 'teal',
    };

    try {
      setIsSavingSchedule(true);
      if (onSaveSchedule) {
        await onSaveSchedule(scheduleItem);
      }
      toast.success('Jadwal Pelajaran Tersimpan', `Jadwal ${scheduleItem.mapel} kelas ${scheduleItem.kelas} hari ${scheduleItem.hari} berhasil disinkronkan ke database.`);
      setIsScheduleModalOpen(false);
      resetScheduleForm();
    } catch (err) {
      console.error('Error saving schedule:', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat memetakan jadwal mengajar.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleDeleteScheduleSlot = async (id: string) => {
    if (!confirm('Hapus slot jadwal mengajar ini dari database sekolah?')) return;
    try {
      if (onDeleteSchedule) {
        await onDeleteSchedule(id);
      }
      toast.success('Jadwal Dihapus', 'Slot jadwal berhasil dihapus dari rekap.');
    } catch (err) {
      console.error('Error deleting schedule slot:', err);
      toast.error('Gagal Menghapus', 'Terjadi kesalahan saat menghapus slot jadwal.');
    }
  };

  const cardContainerRef = useRef<HTMLDivElement>(null);
  const singleCardPdfRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form data when currentTeacher changes
  useEffect(() => {
    setFormData(currentTeacher);
  }, [currentTeacher]);

  // Pre-generate teacher QR Code
  useEffect(() => {
    const generateQr = async () => {
      const qrVal = formData.nip && formData.nip !== '-' ? formData.nip : formData.username || formData.id;
      const url = await generateQrDataUrl(qrVal, 300);
      setQrCodeDataUrl(url);
    };
    generateQr();
  }, [formData.nip, formData.username, formData.id]);

  // Handle Photo File Upload
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format File Tidak Sesuai', 'Pilih file gambar (.jpg, .png, .jpeg)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran Terlalu Besar', 'Maksimal ukuran foto adalah 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData((prev) => ({ ...prev, fotoUrl: result }));
      toast.success('Foto Diunggah', 'Pratinjau foto profil berhasil diperbarui.');
    };
    reader.readAsDataURL(file);
  };

  // Add new teaching assignment item
  const handleAddAssignment = () => {
    const newAssign: TeachingAssignment = {
      id: `assign_${Date.now()}`,
      mapel: formData.mapel || 'Mata Pelajaran',
      kelas: ['7A'],
      bebanJam: 2,
    };
    setFormData((prev) => ({
      ...prev,
      penugasanMapel: [...(prev.penugasanMapel || []), newAssign],
    }));
  };

  // Remove teaching assignment item
  const handleRemoveAssignment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      penugasanMapel: (prev.penugasanMapel || []).filter((a) => a.id !== id),
    }));
  };

  // Save form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      toast.error('Gagal Menyimpan', 'Nama lengkap guru wajib diisi.');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveTeacher(formData);
      toast.success('Profil Diperbarui', 'Data akun, foto & penugasan Anda berhasil disimpan.');
    } catch (err) {
      console.error('Error saving teacher profile:', err);
      toast.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data profil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Download Single QR Image
  const handleDownloadQrPng = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `QR_GURU_${formData.nip || formData.username}_${formData.nama.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code Diunduh', `File PNG QR Code ${formData.nama} berhasil disimpan.`);
  };

  // Single Direct Print
  const handlePrintIndividualCard = () => {
    triggerDirectPrint({
      paperSize: 'F4',
      margins: '0',
      delayMs: 350,
    });
  };

  // Single PDF Export (1:1 Precision Scale on A4)
  const handleDownloadSinglePdf = async () => {
    if (!singleCardPdfRef.current || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      setPdfProgressText('Menyiapkan render kartu PDF presisi 1:1 pada halaman A4...');
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(singleCardPdfRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      const filename = `Kartu-Guru-${formData.nama.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF Kartu Siap', 'File PDF kartu identitas Anda berhasil disimpan (skala presisi 1:1 halaman A4).');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Gagal Membuat PDF', 'Silakan gunakan tombol Cetak Printer.');
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgressText('');
    }
  };

  // Format student interface for Preview Modal
  const previewPerson = useMemo(() => {
    return {
      id: formData.id,
      nisn: formData.nip && formData.nip !== '-' ? formData.nip : formData.username || formData.id,
      nama: formData.nama,
      kelas: formData.mapel || 'Guru Mapel',
      jk: (formData.jk as 'L' | 'P') || 'L',
      fotoUrl: formData.fotoUrl,
      rawTeacher: formData,
    };
  }, [formData]);

  const availableClasses = ['7A', '7B', '7C', '8A', '8B', '8C', '9A', '9B', '9C'];
  const allDays: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ===== BANNER HEADER ===== */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-bold">
              <GraduationCap className="w-4 h-4 text-teal-300" />
              <span>Portal Mandiri Guru &amp; Tendik</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Profil &amp; Kartu Identitas Saya
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 max-w-2xl leading-relaxed">
              Kelola foto resmi, NUPTK / ID, nomor kontak WhatsApp, penugasan mengajar, serta cetak kartu QR individu Anda untuk presensi harian.
            </p>
          </div>

          {/* Quick Teacher Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3.5 shrink-0 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-lg shadow-md overflow-hidden border border-amber-300/50 shrink-0">
              {formData.fotoUrl ? (
                <img src={formData.fotoUrl} alt={formData.nama} className="w-full h-full object-cover" />
              ) : (
                formData.nama.charAt(0).toUpperCase()
              )}
            </div>
            <div className="text-left min-w-0">
              <h4 className="text-sm font-extrabold text-white truncate max-w-[200px]">
                {formData.nama}
              </h4>
              <p className="text-[11px] font-mono text-amber-200 font-semibold truncate">
                NUPTK / ID: {formData.nip || '-'}
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 uppercase">
                {formData.mapel || 'Guru Mapel'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN TWO-COLUMN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===== LEFT COLUMN: FORM EDIT PROFIL & PENUGASAN (7 COLS) ===== */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Formulir Data Diri &amp; Penugasan
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui informasi pribadi dan jadwal penugasan sekolah Anda.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto Profil Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Foto Resmi Kartu Identitas
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Photo Box Preview */}
                <div className="w-24 h-32 rounded-2xl border-2 border-dashed border-teal-600/50 bg-white overflow-hidden flex flex-col items-center justify-center shrink-0 shadow-sm relative group">
                  {formData.fotoUrl ? (
                    <>
                      <img src={formData.fotoUrl} alt={formData.nama} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, fotoUrl: '' }))}
                        className="absolute inset-0 bg-slate-950/60 text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Hapus</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <Camera className="w-6 h-6 mx-auto mb-1 text-teal-600" />
                      <span className="text-[10px] font-bold block leading-tight text-slate-600">
                        Foto 2×3 cm
                      </span>
                    </div>
                  )}
                </div>

                {/* Upload & URL Input Controls */}
                <div className="flex-1 space-y-2.5 w-full">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah File Foto</span>
                    </button>
                    {formData.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, fotoUrl: '' }))}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Atau Masukkan URL Link Foto (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formData.fotoUrl || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, fotoUrl: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nama: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Contoh: Suryadi, S.Pd."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NUPTK / ID Guru
                </label>
                <input
                  type="text"
                  value={formData.nip || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nip: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Isi 16 Digit NUPTK atau ID Otomatis"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Kelamin
                </label>
                <select
                  value={formData.jk || 'L'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, jk: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.nomorHp || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nomorHp: e.target.value }))}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="081234567890"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Penugasan Mengajar Section */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>Penugasan &amp; Tugas Tambahan</span>
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran Utama
                </label>
                <input
                  type="text"
                  value={formData.mapel || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mapel: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Contoh: Bahasa Indonesia, Matematika, IPA, dll."
                />
              </div>

              {/* Checkbox Roles: Wali Kelas & Guru Piket */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Wali Kelas Role */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isWaliKelas)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isWaliKelas: e.target.checked }))}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span>Tugas Wali Kelas</span>
                  </label>
                  {formData.isWaliKelas && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Pilih Rombel Wali Kelas:</label>
                      <select
                        value={formData.waliKelas || '7A'}
                        onChange={(e) => setFormData((prev) => ({ ...prev, waliKelas: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-teal-900"
                      >
                        {availableClasses.map((c) => (
                          <option key={c} value={c}>
                            Kelas {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Guru Piket Role */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isGuruPiket)}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isGuruPiket: e.target.checked }))}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span>Tugas Guru Piket Sekolah</span>
                  </label>
                  {formData.isGuruPiket && (
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Pilih Hari Bertugas Piket:</label>
                      <div className="flex flex-wrap gap-1">
                        {allDays.map((day) => {
                          const isSelected = (formData.piketDays || []).includes(day);
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => {
                                const currentDays = formData.piketDays || [];
                                const newDays = isSelected
                                  ? currentDays.filter((d) => d !== day)
                                  : [...currentDays, day];
                                setFormData((prev) => ({ ...prev, piketDays: newDays }));
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Penugasan Mengajar per Kelas */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Rincian Penugasan Mengajar per Kelas
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAssignment}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Penugasan</span>
                  </button>
                </div>

                {(formData.penugasanMapel || []).length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-400 italic">
                    Belum ada rincian kelas mengajar. Klik &quot;Tambah Penugasan&quot; untuk menambahkan.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {(formData.penugasanMapel || []).map((a, idx) => (
                      <div key={a.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <input
                            type="text"
                            placeholder="Mata Pelajaran"
                            value={a.mapel}
                            onChange={(e) => {
                              const updated = [...(formData.penugasanMapel || [])];
                              updated[idx] = { ...updated[idx], mapel: e.target.value };
                              setFormData((prev) => ({ ...prev, penugasanMapel: updated }));
                            }}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                          <select
                            value={a.kelas[0] || '7A'}
                            onChange={(e) => {
                              const updated = [...(formData.penugasanMapel || [])];
                              updated[idx] = { ...updated[idx], kelas: [e.target.value] };
                              setFormData((prev) => ({ ...prev, penugasanMapel: updated }));
                            }}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                          >
                            {availableClasses.map((c) => (
                              <option key={c} value={c}>
                                Kelas {c}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Jam/Mgg"
                            min={1}
                            value={a.bebanJam || 2}
                            onChange={(e) => {
                              const updated = [...(formData.penugasanMapel || [])];
                              updated[idx] = { ...updated[idx], bebanJam: Number(e.target.value) || 2 };
                              setFormData((prev) => ({ ...prev, penugasanMapel: updated }));
                            }}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer shrink-0"
                          title="Hapus penugasan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== SECTION: PEMETAAN JADWAL MENGAJAR HARIAN ===== */}
              <div className="space-y-4 pt-4 border-t-2 border-dashed border-teal-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/80 p-4 rounded-2xl border border-teal-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-teal-950 flex items-center gap-2">
                        <span>Pemetaan Jadwal Mengajar Harian</span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black">
                          {mySchedules.length} Slot
                        </span>
                      </h4>
                      <p className="text-[11px] text-teal-800 font-medium leading-relaxed">
                        Petakan jadwal di hari apa saja dan di kelas mana saja. Otomatis masuk ke Rekap Jadwal &amp; Tersinkron Realtime.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenNewScheduleModal()}
                    className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Slot Jadwal</span>
                  </button>
                </div>

                {/* Days Schedule Grid */}
                <div className="space-y-3">
                  {allDays.map((day) => {
                    const daySlots = mySchedules.filter((s) => s.hari === day);
                    return (
                      <div key={day} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                        <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            <span>Hari {day}</span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              ({daySlots.length} Jam Tatap Muka)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenNewScheduleModal(day)}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah {day}</span>
                          </button>
                        </div>

                        <div className="p-2.5">
                          {daySlots.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic text-center py-2">
                              Belum ada jadwal terpetakan di hari {day}.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {daySlots.map((sch) => (
                                <div
                                  key={sch.id}
                                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800 uppercase tracking-wider">
                                        Kelas {sch.kelas}
                                      </span>
                                      <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                        {sch.jamMulai} - {sch.jamSelesai}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-extrabold text-slate-900 truncate">
                                      {sch.mapel}
                                    </h5>
                                    {sch.ruang && (
                                      <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                        <span>{sch.ruang}</span>
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleEditScheduleItem(sch)}
                                      className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                                      title="Edit slot ini"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteScheduleSlot(sch.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Hapus slot ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer hover:scale-105"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Profil &amp; Penugasan Saya'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ===== RIGHT COLUMN: STUDIO CETAK KARTU INDIVIDU (5 COLS) ===== */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Kartu Identitas Saya
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pratinjau &amp; cetak langsung kartu presensi individu.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePrintIndividualCard}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                title="Cetak langsung kartu ini ke printer fisik"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Printer</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSinglePdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                title="Unduh berkas PDF kartu berkualitas tinggi"
              >
                <FileDown className="w-4 h-4" />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                title="Unduh file gambar PNG QR Code"
              >
                <QrCode className="w-4 h-4" />
                <span>File QR PNG</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEnlargedQrOpen(true)}
                className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                title="Buka QR Code ukuran besar untuk dipindai di Kiosk Gerbang"
              >
                <QrCode className="w-4 h-4 text-slate-950" />
                <span>Perbesar QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                title="Buka pratinjau interaktif 3D"
              >
                <Eye className="w-4 h-4" />
                <span>Preview 3D</span>
              </button>
            </div>

            {/* Visual Card Stage */}
            <div className="p-4 bg-slate-100/90 rounded-2xl border border-slate-200 flex flex-col items-center justify-center overflow-x-auto">
              <div ref={cardContainerRef} className="p-3 bg-white rounded-2xl shadow-lg flex flex-col items-center gap-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest no-print">
                  Kartu Identitas Pendidik
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Front Card */}
                  <div className="shadow-md rounded-2xl overflow-hidden bg-white">
                    <IdCardFront
                      teacher={formData}
                      category="GURU"
                      config={schoolConfig}
                      qrDataUrl={qrCodeDataUrl}
                      paperSize="F4"
                      theme="pgri-blue"
                    />
                  </div>
                  {/* Back Card */}
                  <div className="shadow-md rounded-2xl overflow-hidden bg-white">
                    <IdCardBack
                      config={schoolConfig}
                      paperSize="F4"
                      category="GURU"
                      theme="pgri-blue"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Note */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px] text-amber-950 font-medium">
                Gunakan kartu ini untuk absensi harian di mesin <strong>Kiosk Gerbang Sekolah</strong> atau verifikasi tugas mengajar Anda.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 3D INTERACTIVE PREVIEW MODAL ===== */}
      <IdCardPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        student={previewPerson as any}
        studentsList={[previewPerson as any]}
        onSelectStudent={() => {}}
        config={schoolConfig}
        qrMap={{ [previewPerson.nisn]: qrCodeDataUrl }}
        paperSize="F4"
        category="GURU"
        onPrintSingle={() => handlePrintIndividualCard()}
        onDownloadSinglePdf={() => handleDownloadSinglePdf()}
      />

      {/* ===== ENLARGED QR CODE MODAL ===== */}
      <EnlargedQrCodeModal
        isOpen={isEnlargedQrOpen}
        onClose={() => setIsEnlargedQrOpen(false)}
        person={{
          id: formData.id,
          nama: formData.nama,
          nipOrNisn: formData.nip && formData.nip !== '-' ? formData.nip : formData.username || formData.id,
          roleOrKelas: 'Guru Mapel / Tendik',
          fotoUrl: formData.fotoUrl,
          mapel: formData.mapel,
        }}
        category="GURU"
        schoolConfig={schoolConfig}
      />

      {/* ===== MODAL TAMBAH / EDIT SLOT JADWAL MENGAJAR ===== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingScheduleId ? 'Edit Slot Jadwal' : 'Pemetaan Slot Jadwal Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tentukan hari, kelas, jam, dan mata pelajaran.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hari Mengajar <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSchedule.hari}
                    onChange={(e) => setFormSchedule((prev) => ({ ...prev, hari: e.target.value as DayOfWeek }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {allDays.map((d) => (
                      <option key={d} value={d}>
                        Hari {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kelas Rombel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSchedule.kelas}
                    onChange={(e) => setFormSchedule((prev) => ({ ...prev, kelas: e.target.value, ruang: `R. Kelas ${e.target.value}` }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Preset Jam Tatap Muka
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Jam 1 - 2 (07:30 - 08:50)', jamKe: '1 - 2', jamMulai: '07:30', jamSelesai: '08:50' },
                    { label: 'Jam 3 - 4 (09:05 - 10:25)', jamKe: '3 - 4', jamMulai: '09:05', jamSelesai: '10:25' },
                    { label: 'Jam 5 - 6 (10:40 - 12:00)', jamKe: '5 - 6', jamMulai: '10:40', jamSelesai: '12:00' },
                    { label: 'Jam 7 - 8 (13:00 - 14:20)', jamKe: '7 - 8', jamMulai: '13:00', jamSelesai: '14:20' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setFormSchedule((prev) => ({
                          ...prev,
                          jamKe: preset.jamKe,
                          jamMulai: preset.jamMulai,
                          jamSelesai: preset.jamSelesai,
                        }))
                      }
                      className={`p-2 rounded-xl text-[10px] font-bold border transition text-left cursor-pointer ${
                        formSchedule.jamKe === preset.jamKe && formSchedule.jamMulai === preset.jamMulai
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Ke</label>
                  <input
                    type="text"
                    value={formSchedule.jamKe}
                    onChange={(e) => setFormSchedule((prev) => ({ ...prev, jamKe: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none"
                    placeholder="1 - 2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formSchedule.jamMulai}
                    onChange={(e) => setFormSchedule((prev) => ({ ...prev, jamMulai: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formSchedule.jamSelesai}
                    onChange={(e) => setFormSchedule((prev) => ({ ...prev, jamSelesai: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={formSchedule.mapel}
                  onChange={(e) => setFormSchedule((prev) => ({ ...prev, mapel: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="Contoh: Matematika, Bahasa Indonesia"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ruangan Kelas (Opsional)</label>
                <input
                  type="text"
                  value={formSchedule.ruang}
                  onChange={(e) => setFormSchedule((prev) => ({ ...prev, ruang: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none"
                  placeholder="R. Kelas 7A"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-extrabold transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSchedule ? 'Menyimpan...' : 'Simpan Slot Jadwal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Off-screen Staging for 1:1 Scale Single Card PDF Export */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          zIndex: -9999,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div
          ref={singleCardPdfRef}
          style={{
            width: '210mm',
            height: '297mm',
            backgroundColor: '#ffffff',
            padding: '12mm 10mm',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header Note */}
          <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}
            </h2>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', margin: '0 0 4px 0' }}>
              DOKUMEN KARTU IDENTITAS GURU & TENAGA KEPENDIDIKAN (SKALA PRESISI 1:1)
            </p>
            <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>
              Petunjuk Cetak: Gunakan kertas A4/F4, atur skala printer "Actual Size / 100%" agar ukuran fisik kartu presisi 65 × 98 mm.
            </p>
          </div>

          {/* Cards Pair Container */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '6mm', alignItems: 'center', justifyContent: 'center', marginTop: '4mm' }}>
            <div style={{ width: '65mm', height: '98mm', flexShrink: 0, overflow: 'hidden', border: '1px dashed #94a3b8', borderRadius: '4px' }}>
              <IdCardFront
                teacher={formData}
                category="GURU"
                config={schoolConfig}
                qrDataUrl={qrCodeDataUrl}
                paperSize="F4"
                theme="pgri-blue"
              />
            </div>
            <div style={{ width: '65mm', height: '98mm', flexShrink: 0, overflow: 'hidden', border: '1px dashed #94a3b8', borderRadius: '4px' }}>
              <IdCardBack
                config={schoolConfig}
                paperSize="F4"
                category="GURU"
                theme="pgri-blue"
              />
            </div>
          </div>

          {/* Footer Guide */}
          <div style={{ marginTop: '10mm', fontSize: '8.5px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '4mm', width: '180mm' }}>
            Garis putus-putus abu-abu merupakan panduan pemotongan presisi. | Diterbitkan otomatis oleh SIAP SMP PGRI 1 CIKADU
          </div>
        </div>
      </div>
    </div>
  );
};
