import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  RefreshCw, 
  ShieldAlert, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Lightbulb,
  Award,
  Layers,
  Phone
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig } from '../types';
import { AiService, AttendanceAiAnalysisResult } from '../services/ai';
import { buildWhatsAppLink } from '../services/db';

interface AiAttendanceAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  records: AttendanceRecord[];
  schoolConfig: SchoolConfig;
  onOpenWhatsApp?: (student: Student, record?: AttendanceRecord) => void;
}

export const AiAttendanceAnalysisModal: React.FC<AiAttendanceAnalysisModalProps> = ({
  isOpen,
  onClose,
  students,
  records,
  schoolConfig,
  onOpenWhatsApp,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AttendanceAiAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const runAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await AiService.analyzeAttendance(
        schoolConfig.namaSekolah,
        todayStr,
        students,
        records
      );
      setAnalysisResult(data);
    } catch (e: any) {
      console.error('Error running AI attendance analysis:', e);
      setErrorMessage(e?.message || 'Gagal memproses analisis AI presensi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysisResult) {
      runAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Analisis Cerdas Presensi & Kedisiplinan
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-400 text-indigo-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  AI Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-medium">
                Pemeriksaan pola ketidakhadiran, deteksi dini siswa rentan, & rekomendasi bimbingan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Perbarui Analisis"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto"></div>
              <div>
                <p className="font-extrabold text-sm text-slate-800">
                  AI sedang menganalisis seluruh data presensi siswa...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Mendeteksi tren per kelas, pola keterlambatan, dan menyusun rekomendasi bimbingan.
                </p>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
              <p className="font-bold text-sm text-rose-900">{errorMessage}</p>
              <button
                type="button"
                onClick={runAnalysis}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Coba Analisis Ulang
              </button>
            </div>
          ) : analysisResult ? (
            <>
              {/* Executive Summary Card */}
              <div className="p-5 bg-white rounded-2xl border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2 flex-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    Ringkasan Eksekutif Kedisiplinan
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    {analysisResult.ringkasanEksekutif}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100">
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Indeks Disiplin</span>
                    <span className="text-3xl font-black text-indigo-950 font-mono">
                      {analysisResult.skorKedisiplinan}
                    </span>
                    <span className="text-xs text-slate-500 font-bold block">/ 100</span>
                  </div>
                  <div className="h-10 w-px bg-indigo-200"></div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Predikat</span>
                    <span className="text-xs font-black text-purple-700">
                      {analysisResult.predikatKedisiplinan}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rekomendasi Sekolah & BK */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Rekomendasi Tindakan untuk Sekolah, Wali Kelas & Guru BK
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {analysisResult.rekomendasiSekolah.map((rek, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rek}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Siswa yang Butuh Perhatian Khusus */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Siswa Perlu Perhatian Khusus & Draf Pesan WhatsApp
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    {analysisResult.rekomendasiSiswa.length} Siswa Teridentifikasi
                  </span>
                </div>

                <div className="space-y-3">
                  {analysisResult.rekomendasiSiswa.map((siswa, idx) => {
                    const studentObj = students.find((s) => s.nisn === siswa.nisn || s.nama.toLowerCase() === siswa.nama.toLowerCase());
                    const phone = studentObj?.nomorTeleponOrtu || '';

                    return (
                      <div 
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs sm:text-sm text-slate-900">
                                {siswa.nama}
                              </span>
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                Kelas {siswa.kelas}
                              </span>
                              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {siswa.statusMasalah}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Dugaan Masalah: <span className="text-slate-700 italic">{siswa.akarMasalahDugaan}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {phone && (
                              <button
                                type="button"
                                onClick={() => {
                                  window.open(buildWhatsAppLink(phone, siswa.draftPesanWhatsAppOrtu), '_blank');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Kirim WA Ortu</span>
                              </button>
                            )}
                            {onOpenWhatsApp && studentObj && (
                              <button
                                type="button"
                                onClick={() => onOpenWhatsApp(studentObj)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                Buka Pesan
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Recommendation & WhatsApp Draft */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                              Saran Tindakan Penanganan
                            </span>
                            <p className="text-slate-700 leading-snug">{siswa.langkahPenanganan}</p>
                          </div>

                          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                              Draf Pesan WhatsApp Otomatis
                            </span>
                            <p className="text-[11px] text-slate-700 italic font-mono leading-relaxed line-clamp-3">
                              "{siswa.draftPesanWhatsAppOrtu}"
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Analisis per Rombel */}
              {analysisResult.analisisPerKelas && analysisResult.analisisPerKelas.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Tingkat Kehadiran & Catatan per Rombongan Belajar (Kelas)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {analysisResult.analisisPerKelas.map((cls, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-slate-900">Kelas {cls.kelas}</span>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {cls.tingkatKehadiran}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{cls.catatan}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            *Analisis diproses secara privat & aman berdasarkan model Gemini AI.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
