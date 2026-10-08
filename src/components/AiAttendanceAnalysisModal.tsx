import React, { useState } from 'react';
import { Bot, Sparkles, X, Check, Copy, MessageCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DB } from '../services/db';
import { analyzeAttendanceWithAi, AiAnalysisResult } from '../services/ai';
import { useToast } from '../context/ToastContext';

export const AiAttendanceAnalysisModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const students = DB.getStudents();
      const attendance = DB.getAttendance();
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = attendance.filter((r) => r.date === today);

      const hadir = todayRecords.filter((r) => r.status === 'hadir').length;
      const terlambat = todayRecords.filter((r) => r.status === 'terlambat').length;
      const izin = todayRecords.filter((r) => r.status === 'izin').length;
      const sakit = todayRecords.filter((r) => r.status === 'sakit').length;
      const alpa = Math.max(0, students.length - hadir - terlambat - izin - sakit);

      const classSummaries: Record<string, { hadir: number; total: number }> = {};
      students.forEach((s) => {
        if (!classSummaries[s.className]) classSummaries[s.className] = { hadir: 0, total: 0 };
        classSummaries[s.className].total++;
      });
      todayRecords.forEach((r) => {
        if (classSummaries[r.className] && (r.status === 'hadir' || r.status === 'terlambat')) {
          classSummaries[r.className].hadir++;
        }
      });

      const atRiskStudents = todayRecords
        .filter((r) => r.status === 'terlambat' || r.status === 'alpa')
        .map((r) => ({
          nisn: r.nisn,
          name: r.studentName,
          className: r.className,
          status: r.status,
          notes: r.notes
        }));

      const res = await analyzeAttendanceWithAi({
        schoolName: 'SMP PGRI 1 Cikadu',
        date: today,
        totalStudents: students.length,
        stats: { hadir, terlambat, izin, sakit, alpa },
        classSummaries,
        atRiskStudents
      });

      setResult(res);
      showToast('Analisis kecerdasan presensi selesai!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses analisis AI', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWa = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Draf WhatsApp berhasil disalin!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Analisis Kedisiplinan AI</h2>
              <p className="text-[11px] text-slate-500">Evaluasi berbasis Gemini AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Mulai Evaluasi Presensi & Rekomendasi Tindakan
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                AI akan membaca data kehadiran hari ini, mengidentifikasi siswa yang terlambat atau alpa, dan menyiapkan draf pesan WhatsApp pendampingan orang tua.
              </p>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/25 transition"
            >
              {loading ? 'Menganalisis Data...' : 'Jalankan Analisis Sekarang'}
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto smooth-touch-scroll pr-1 text-xs">
            {/* Skor Kedisiplinan */}
            <div className="bg-purple-50 border border-purple-200/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-purple-700 uppercase">Skor Kedisiplinan Hari Ini</p>
                <p className="text-sm font-black text-purple-950 mt-0.5">{result.predikatKedisiplinan}</p>
              </div>
              <div className="text-2xl font-black text-purple-700 font-mono">
                {result.skorKedisiplinan}<span className="text-sm text-purple-400 font-normal">/100</span>
              </div>
            </div>

            {/* Ringkasan */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800 mb-1">Ringkasan Eksekutif:</p>
              <p className="text-slate-600 leading-relaxed">{result.ringkasanEksekutif}</p>
            </div>

            {/* Rekomendasi Sekolah */}
            <div>
              <p className="font-bold text-slate-800 mb-2">Saran Tindakan Guru Piket & BK:</p>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                {result.rekomendasiSekolah.map((rec, i) => (
                  <li key={i} className="leading-relaxed">{rec}</li>
                ))}
              </ul>
            </div>

            {/* Draf Pesan Siswa Berisiko */}
            {result.rekomendasiSiswa && result.rekomendasiSiswa.length > 0 && (
              <div className="pt-2">
                <p className="font-bold text-slate-800 mb-2">Draf Pendampingan Siswa & Pesan Orang Tua:</p>
                <div className="space-y-2.5">
                  {result.rekomendasiSiswa.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.nama} ({item.kelas})</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 uppercase">
                          {item.statusMasalah}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">Saran: {item.langkahPenanganan}</p>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-700 relative">
                        {item.draftPesanWhatsAppOrtu}
                        <button
                          onClick={() => handleCopyWa(item.draftPesanWhatsAppOrtu)}
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Draf WA</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setResult(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Analisis Ulang
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs bg-slate-900 text-white rounded-lg font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
