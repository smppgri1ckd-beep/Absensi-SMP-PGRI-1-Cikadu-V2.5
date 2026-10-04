import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Upload, 
  CheckCircle, 
  Calendar, 
  AlertCircle, 
  Phone, 
  User, 
  Clock, 
  ShieldAlert,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { Student, LeaveRequest, LeaveRequestType } from '../types';
import { useToast } from '../context/ToastContext';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student | null;
  onSubmit: (request: LeaveRequest) => Promise<void>;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  onSubmit,
}) => {
  const { toast } = useToast();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedNisn, setSelectedNisn] = useState<string>(initialStudent?.nisn || (students[0]?.nisn || ''));
  const [jenis, setJenis] = useState<LeaveRequestType>('Sakit');
  const [tanggalMulai, setTanggalMulai] = useState<string>(todayStr);
  const [tanggalSelesai, setTanggalSelesai] = useState<string>(todayStr);
  const [alasan, setAlasan] = useState<string>('');
  const [lampiranUrl, setLampiranUrl] = useState<string>('');
  const [kontakOrtu, setKontakOrtu] = useState<string>(initialStudent?.nomorTeleponOrtu || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialStudent) {
      setSelectedNisn(initialStudent.nisn);
      if (initialStudent.nomorTeleponOrtu) {
        setKontakOrtu(initialStudent.nomorTeleponOrtu);
      }
    }
  }, [initialStudent]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.nisn === selectedNisn);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Format Salah', 'Mohon pilih file foto gambar (JPG, PNG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Compress large image down to max 800px width/height for instant storage
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setLampiranUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setLampiranUrl(dataUrl);
        }
        toast.upload('Berkas Surat Diunggah', 'Foto surat dokter/izin berhasil dimuat.');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleUsePresetDoctorLetter = () => {
    setLampiranUrl('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80');
    toast.upload('Contoh Surat Dimuat', 'Surat keterangan dokter contoh berhasil diterapkan.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      alert('Mohon pilih siswa terlebih dahulu.');
      return;
    }
    if (!alasan.trim()) {
      alert('Mohon isi keterangan/alasan izin atau sakit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newReq: LeaveRequest = {
        id: `LEAVE_${Date.now()}_${currentStudent.nisn}`,
        nisn: currentStudent.nisn,
        nama: currentStudent.nama,
        kelas: currentStudent.kelas,
        jenis,
        tanggalMulai,
        tanggalSelesai,
        alasan: alasan.trim(),
        lampiranUrl: lampiranUrl || undefined,
        statusPengajuan: 'Menunggu',
        tanggalPengajuan: `${todayStr} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
        kontakOrtu: kontakOrtu.trim() || undefined,
      };

      await onSubmit(newReq);
      setSuccessMessage('Permohonan berhasil dikirim! Guru Piket akan segera memeriksa dan memverifikasi pengajuan Anda.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim permohonan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Pengajuan Izin / Sakit Mandiri
              </h3>
              <p className="text-xs text-blue-100">
                Kirim surat keterangan atau surat dokter resmi secara digital
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

        {/* Success Alert */}
        {successMessage && (
          <div className="m-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-black">Berhasil Dikirim!</p>
              <p className="text-[11px] mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Pilih Siswa */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Nama Siswa & Kelas</span>
            </label>
            <select
              value={selectedNisn}
              onChange={(e) => setSelectedNisn(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            >
              {students.map((s) => (
                <option key={s.nisn} value={s.nisn}>
                  {s.nama} ({s.kelas}) - NISN: {s.nisn}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Permohonan */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Kategori Permohonan</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setJenis('Sakit')}
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  jenis === 'Sakit'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Sakit (Surat Dokter / Ket)</span>
              </button>
              <button
                type="button"
                onClick={() => setJenis('Izin')}
                className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  jenis === 'Izin'
                    ? 'bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Izin (Keperluan Keluarga/Acara)</span>
              </button>
            </div>
          </div>

          {/* Rentang Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Dari Tanggal</span>
              </label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Sampai Tanggal</span>
              </label>
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                min={tanggalMulai}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
                required
              />
            </div>
          </div>

          {/* Keterangan / Alasan */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Keterangan / Alasan Lengkap</label>
            <textarea
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder={jenis === 'Sakit' ? 'Contoh: Ananda demam tinggi sejak semalam dan disarankan dokter beristirahat 2 hari...' : 'Contoh: Mengikuti acara keluarga khitanan di luar kota...'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              required
            />
          </div>

          {/* Nomor WhatsApp Ortu */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Nomor WhatsApp Orang Tua / Wali (Untuk Konfirmasi)</span>
            </label>
            <input
              type="tel"
              value={kontakOrtu}
              onChange={(e) => setKontakOrtu(e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
            />
          </div>

          {/* Upload Lampiran Bukti Foto (Surat Dokter / Surat Tertulis) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Foto Surat Dokter / Surat Izin Fisik (Opsional)</span>
              </label>
              {lampiranUrl && (
                <button
                  type="button"
                  onClick={() => setLampiranUrl('')}
                  className="text-[11px] text-rose-600 font-bold hover:underline"
                >
                  Hapus Foto
                </button>
              )}
            </div>

            {lampiranUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-900/10 flex items-center justify-center max-h-48 group">
                <img
                  src={lampiranUrl}
                  alt="Bukti Lampiran"
                  className="w-full max-h-48 object-contain"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 bg-white cursor-pointer transition-colors text-center group">
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1" />
                  <span className="font-bold text-xs text-slate-700 group-hover:text-blue-600">
                    Klik untuk Ambil Foto Kamera / Pilih File Foto
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Format JPG, PNG, atau WebP
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Quick Preset Button */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Tidak ada file saat ini?</span>
                  <button
                    type="button"
                    onClick={handleUsePresetDoctorLetter}
                    className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Gunakan Contoh Surat Dokter ↗
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Kirim Permohonan Izin</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
