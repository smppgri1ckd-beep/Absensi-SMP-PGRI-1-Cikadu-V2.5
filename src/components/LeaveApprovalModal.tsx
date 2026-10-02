import React, { useState, useMemo } from 'react';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Phone, 
  User, 
  FileText, 
  Search, 
  ExternalLink,
  Filter,
  ShieldCheck,
  Eye,
  Trash2,
  MessageSquare,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { LeaveRequest, LeaveRequestStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { filterLeaveRequestsForTeacher, isTeacherWaliKelas } from '../utils/teacherFilter';

interface LeaveApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: LeaveRequest[];
  onUpdateStatus: (id: string, status: LeaveRequestStatus, catatanPiket?: string) => Promise<void>;
  onDeleteRequest?: (id: string) => Promise<void>;
  currentUserName: string;
}

export const LeaveApprovalModal: React.FC<LeaveApprovalModalProps> = ({
  isOpen,
  onClose,
  requests,
  onUpdateStatus,
  onDeleteRequest,
  currentUserName,
}) => {
  const { user, actingAsPiket } = useAuth();
  const isTeacher = user?.role === 'guru' && !actingAsPiket;

  const [activeFilter, setActiveFilter] = useState<'Semua' | LeaveRequestStatus>('Menunggu');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Scoped requests for teacher
  const scopedRequests = useMemo(() => {
    return filterLeaveRequestsForTeacher(requests, user, actingAsPiket);
  }, [requests, user, actingAsPiket]);

  if (!isOpen) return null;

  const filteredRequests = scopedRequests.filter((r) => {
    const matchesFilter = activeFilter === 'Semua' || r.statusPengajuan === activeFilter;
    const matchesSearch = 
      r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.nisn.includes(searchTerm) ||
      r.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.alasan.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = scopedRequests.filter((r) => r.statusPengajuan === 'Menunggu').length;

  const handleApprove = async (req: LeaveRequest) => {
    const note = actionNotes[req.id] || 'Surat keterangan telah diverifikasi dan disetujui.';
    setProcessingId(req.id);
    try {
      await onUpdateStatus(req.id, 'Disetujui', note);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: LeaveRequest) => {
    const note = actionNotes[req.id] || 'Berkas permohonan belum lengkap atau tidak valid.';
    setProcessingId(req.id);
    try {
      await onUpdateStatus(req.id, 'Ditolak', note);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Verifikasi Permohonan Izin & Sakit Mandiri
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-xs">
                    {pendingCount} Menunggu
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">
                Pemeriksaan surat dokter / surat izin ortu oleh Guru Piket & Admin
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

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Tab Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['Menunggu', 'Semua', 'Disetujui', 'Ditolak'] as const).map((tab) => {
              const count = tab === 'Semua' ? requests.length : requests.filter((r) => r.statusPengajuan === tab).length;
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa, NISN, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">Tidak ada permohonan</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeFilter === 'Menunggu' 
                  ? 'Semua permohonan izin/sakit sudah selesai diverifikasi.' 
                  : 'Tidak ada data permohonan yang sesuai dengan filter ini.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.statusPengajuan === 'Menunggu';
              const isApproved = req.statusPengajuan === 'Disetujui';
              const isRejected = req.statusPengajuan === 'Ditolak';

              return (
                <div
                  key={req.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                    isPending
                      ? 'bg-amber-50/40 border-amber-200 shadow-xs'
                      : isApproved
                      ? 'bg-white border-emerald-200'
                      : 'bg-white border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    
                    {/* Left: Student & Reason Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${
                          req.jenis === 'Sakit'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {req.jenis}
                        </span>

                        <span className="font-extrabold text-sm sm:text-base text-slate-900">
                          {req.nama}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200">
                          Kelas {req.kelas}
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">
                          NISN: {req.nisn}
                        </span>
                      </div>

                      {/* Dates and Reason */}
                      <div className="p-3 bg-white/80 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>
                            Rentang Tanggal: <strong>{req.tanggalMulai}</strong> {req.tanggalMulai !== req.tanggalSelesai ? `s/d ${req.tanggalSelesai}` : '(1 Hari)'}
                          </span>
                        </div>

                        <p className="text-slate-800 leading-relaxed">
                          <strong>Alasan:</strong> {req.alasan}
                        </p>

                        {/* Kontak Ortu */}
                        {req.kontakOrtu && (
                          <div className="flex items-center gap-2 pt-1 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Kontak Ortu: <strong>{req.kontakOrtu}</strong></span>
                            <a
                              href={`https://wa.me/${req.kontakOrtu.replace(/^0/, '62').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Halo Bapak/Ibu wali dari ananda ${req.nama} (${req.kelas}), kami dari pihak SMP PGRI 1 Cikadu ingin mengonfirmasi permohonan ${req.jenis}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              Hubungi WhatsApp ↗
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Timestamp & Reviewer Info */}
                      <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Diajukan: {req.tanggalPengajuan}
                        </span>
                        {req.disetujuiOleh && (
                          <span className="text-emerald-700 font-bold">
                            ✓ Diverifikasi oleh: {req.disetujuiOleh}
                          </span>
                        )}
                        {req.catatanPiket && (
                          <span className="text-slate-600 italic">
                            Catatan: "{req.catatanPiket}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Attachment Photo & Action Controls */}
                    <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-start gap-3 shrink-0">
                      
                      {/* Photo Thumbnail */}
                      {req.lampiranUrl ? (
                        <div 
                          onClick={() => setPreviewImage(req.lampiranUrl || null)}
                          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 cursor-pointer group shadow-2xs"
                        >
                          <img
                            src={req.lampiranUrl}
                            alt="Surat Dokter"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Perbesar</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-center p-2 text-[10px]">
                          <FileText className="w-5 h-5 mb-1 text-slate-300" />
                          <span>Tanpa Foto Surat</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="text-right">
                        {isPending && (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 inline-block">
                            ⏳ Menunggu Verifikasi
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-200 inline-block">
                            ✓ Disetujui
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-xs border border-rose-200 inline-block">
                            ✕ Ditolak
                          </span>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Actions for Pending Requests */}
                  {isPending && (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <input
                        type="text"
                        placeholder="Catatan verifikasi piket (opsional)..."
                        value={actionNotes[req.id] || ''}
                        onChange={(e) => setActionNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs flex-1 text-slate-800 focus:outline-none focus:border-blue-500"
                      />

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleReject(req)}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>

                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleApprove(req)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Setujui Permohonan</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete option if needed */}
                  {onDeleteRequest && !isPending && (
                    <div className="mt-2 pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onDeleteRequest(req.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Arsip</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            *Permohonan yang <strong>Disetujui</strong> otomatis tercatat pada presensi harian siswa sebagai status <strong>Sakit / Izin</strong>.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* Photo Lightbox Modal */}
        {previewImage && (
          <div 
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-60 bg-slate-950/90 flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="relative max-w-2xl max-h-[90vh] bg-black rounded-3xl overflow-hidden border border-white/20">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Lampiran Full"
                className="w-full max-h-[85vh] object-contain"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
