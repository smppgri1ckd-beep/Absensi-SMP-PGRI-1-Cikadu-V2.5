import React, { useState } from 'react';
import { 
  Award, 
  ChevronRight, 
  Calendar, 
  X, 
  BarChart3,
  TrendingUp,
  MessageSquare,
  Printer,
  Plus
} from 'lucide-react';
import { StudentGradeItem } from '../../types';

interface RecentGradesProps {
  grades: StudentGradeItem[];
  onOpenReportCard?: () => void;
  onOpenGradeManagement?: () => void;
  canManageGrades?: boolean;
}

export const RecentGrades: React.FC<RecentGradesProps> = ({ 
  grades,
  onOpenReportCard,
  onOpenGradeManagement,
  canManageGrades = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('Semua');

  // Distinct subjects
  const subjects = Array.from(new Set(grades.map((g) => g.mapel))).sort();

  // Filtered grades for modal
  const filteredGrades = selectedSubjectFilter === 'Semua' 
    ? grades 
    : grades.filter((g) => g.mapel === selectedSubjectFilter);

  // Grade badge color helper
  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  // Monthly trend data for the chart (Jul, Agu, Sep, Okt)
  const monthlyProgression = [
    { bulan: 'Jul', nilai: 82, label: 'Ulangan Pengantar' },
    { bulan: 'Agu', nilai: 86, label: 'Kuis Aljabar' },
    { bulan: 'Sep', nilai: 88, label: 'Ulangan Harian 1' },
    { bulan: 'Okt', nilai: 92, label: 'Tugas Terapan' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Nilai & Capaian Belajar
            </h3>
            <p className="text-xs text-slate-500">
              Daftar perolehan hasil belajar, kuis, dan ujian anak
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {canManageGrades && onOpenGradeManagement && (
            <button
              type="button"
              onClick={onOpenGradeManagement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Nilai</span>
            </button>
          )}

          {onOpenReportCard && (
            <button
              type="button"
              onClick={onOpenReportCard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cetak Rapor Digital</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black transition-colors cursor-pointer border border-blue-200"
          >
            <span>Semua Nilai</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Daftar Nilai Terbaru (Examples as requested) */}
      {grades.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-400">Belum ada nilai yang diterbitkan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {grades.slice(0, 3).map((g) => (
            <div
              key={g.id}
              className="p-4 rounded-2xl bg-slate-50/80 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between space-y-2.5"
            >
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-black text-[10px] border border-slate-200 uppercase inline-block">
                  {g.mapel}
                </span>

                <h4 className="font-bold text-xs text-slate-800 line-clamp-1" title={g.namaPenilaian}>
                  {g.namaPenilaian}
                </h4>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-xs font-semibold text-slate-500">Nilai:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono font-black text-sm border shadow-2xs ${getScoreBadge(g.nilai)}`}>
                  {g.nilai}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple & Responsive Chart: Perkembangan Nilai Berdasarkan Waktu */}
      <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Grafik Perkembangan Nilai Matematika</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Semester Ganjil 2026</span>
        </div>

        {/* Responsive Visual ASCII / Point Line Chart */}
        <div className="relative pt-2 pl-8 pb-4 pr-2">
          {/* Y Axis Labels (100, 90, 80, 70) */}
          <div className="absolute left-0 top-1 bottom-6 flex flex-col justify-between text-[10px] font-mono text-slate-400 font-bold select-none text-right w-6">
            <span>100 ┤</span>
            <span>90 ┤</span>
            <span>80 ┤</span>
            <span>70 ┤</span>
          </div>

          {/* Grid Bars & Data Points */}
          <div className="h-28 border-b-2 border-slate-300 relative flex items-end justify-around">
            {/* Horizontal guide lines */}
            <div className="absolute inset-x-0 top-0 border-b border-dashed border-slate-200 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/3 border-b border-dashed border-slate-200 pointer-events-none" />
            <div className="absolute inset-x-0 top-2/3 border-b border-dashed border-slate-200 pointer-events-none" />

            {monthlyProgression.map((item, idx) => {
              // Map score 70..100 to percentage height 0..100
              const bottomPercent = Math.max(10, Math.min(95, ((item.nilai - 70) / 30) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end relative group">
                  {/* Point Marker ● */}
                  <div
                    style={{ bottom: `${bottomPercent}%` }}
                    className="absolute flex flex-col items-center group-hover:scale-125 transition-transform"
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[8px] font-bold">
                      ●
                    </span>
                    <span className="text-[10px] font-mono font-black text-blue-900 bg-white px-1.5 py-0.2 rounded-md border border-slate-200 shadow-2xs -top-5 absolute whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {item.nilai} ({item.label})
                    </span>
                  </div>

                  {/* Vertical bar guide */}
                  <div
                    style={{ height: `${bottomPercent}%` }}
                    className="w-1.5 bg-blue-200/60 rounded-t-sm"
                  />
                </div>
              );
            })}
          </div>

          {/* X Axis Labels (Jul Agu Sep Okt) */}
          <div className="flex justify-around pt-1 text-[11px] font-mono font-black text-slate-600 select-none">
            {monthlyProgression.map((item, idx) => (
              <span key={idx}>{item.bulan}</span>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: LIHAT SEMUA NILAI */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base sm:text-lg">Semua Nilai & Hasil Belajar Siswa</h3>
                <p className="text-xs text-blue-100">Daftar nilai tugas, ulangan harian, dan ujian lengkap</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Mapel */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Filter Mapel:</span>
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('Semua')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubjectFilter === 'Semua' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Semua ({grades.length})
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(sub)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedSubjectFilter === sub ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Table Content: Mata pelajaran | Jenis penilaian | Nama tugas/ujian | Nilai | Tanggal | Komentar guru */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                    <tr>
                      <th className="py-3 px-3.5 whitespace-nowrap">Mata Pelajaran</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Jenis Penilaian</th>
                      <th className="py-3 px-3.5">Nama Tugas / Ujian</th>
                      <th className="py-3 px-3.5 text-center">Nilai</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Tanggal</th>
                      <th className="py-3 px-3.5">Komentar Guru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGrades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-900">
                          {g.mapel}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                            {g.jenisPenilaian}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-extrabold text-slate-800">
                          {g.namaPenilaian}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-black text-xs border ${getScoreBadge(g.nilai)}`}>
                            {g.nilai}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {g.tanggal}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                          {g.komentarGuru || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
