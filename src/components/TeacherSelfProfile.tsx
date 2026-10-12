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
  Layers
} from 'lucide-react';
import { AuthUser, TeacherUser, SchoolConfig, TeachingAssignment, DayOfWeek } from '../types';
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
}

export const TeacherSelfProfile: React.FC<TeacherSelfProfileProps> = ({
  currentUser,
  teachers,
  onSaveTeacher,
  schoolConfig,
}) => {
  const { toast } = useToast();

  // Find or create current teacher object
  const currentTeacher: TeacherUser = useMemo(() => {
    const matched = teachers.find(
      (t) => t.id === currentUser.id || t.username === currentUser.username || (currentUser.nip && t.nip === currentUser.nip)
    );
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

  const cardContainerRef = useRef<HTMLDivElement>(null);
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

  // Single PDF Export
  const handleDownloadSinglePdf = async () => {
    if (!cardContainerRef.current || isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      setPdfProgressText('Menyiapkan render kartu PDF...');
      await new Promise((r) => setTimeout(r, 150));

      const canvas = await html2canvas(cardContainerRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [215, 330],
      });

      doc.addImage(imgData, 'JPEG', 10, 10, 195, 120, undefined, 'FAST');
      const filename = `Kartu-Guru-${formData.nama.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('PDF Kartu Siap', 'File PDF kartu identitas Anda berhasil disimpan.');
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
    </div>
  );
};
