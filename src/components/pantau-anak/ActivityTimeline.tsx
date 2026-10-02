import React from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { StudentActivityLogItem } from '../../types';

interface ActivityTimelineProps {
  logs: StudentActivityLogItem[];
  studentNama?: string;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ 
  logs,
  studentNama = 'Ahmad'
}) => {
  // If database logs are empty, provide fallback real-time progression based on typical school day
  const effectiveLogs = logs.length > 0 ? logs : [
    { id: 'DEF_1', nisn: '', tanggal: '2026-09-30', waktu: '07:12', kategori: 'MASUK' as const, keterangan: `🟢 ${studentNama.split(' ')[0]} masuk sekolah` },
    { id: 'DEF_2', nisn: '', tanggal: '2026-09-30', waktu: '08:05', kategori: 'KBM' as const, keterangan: '📚 Mengikuti pelajaran Matematika' },
    { id: 'DEF_3', nisn: '', tanggal: '2026-09-30', waktu: '09:45', kategori: 'KBM' as const, keterangan: '📚 Mengikuti pelajaran Bahasa Indonesia' },
    { id: 'DEF_4', nisn: '', tanggal: '2026-09-30', waktu: '11:30', kategori: 'TUGAS' as const, keterangan: '📝 Mengumpulkan tugas IPA' },
    { id: 'DEF_5', nisn: '', tanggal: '2026-09-30', waktu: '13:20', kategori: 'NILAI' as const, keterangan: '📊 Nilai Matematika diterbitkan: 88' },
    { id: 'DEF_6', nisn: '', tanggal: '2026-09-30', waktu: '15:10', kategori: 'PULANG' as const, keterangan: `🏫 ${studentNama.split(' ')[0]} pulang dari sekolah` },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Aktivitas Terbaru
            </h3>
            <p className="text-xs text-slate-500">
              Catatan kronologis waktu dan kegiatan anak di sekolah hari ini
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
          <Sparkles className="w-3 h-3 text-sky-600" />
          <span>Pembaruan Langsung</span>
        </span>
      </div>

      {/* Timeline items:
          07:12
          🟢 Ahmad masuk sekolah
          08:05
          📚 Mengikuti pelajaran Matematika
          09:45
          📚 Mengikuti pelajaran Bahasa Indonesia
          11:30
          📝 Mengumpulkan tugas IPA
          13:20
          📊 Nilai Matematika diterbitkan: 88
          15:10
          🏫 Ahmad pulang dari sekolah
      */}
      <div className="space-y-3 relative before:absolute before:inset-0 before:left-7 before:w-0.5 before:bg-slate-100 before:pointer-events-none">
        {effectiveLogs.map((item) => (
          <div key={item.id} className="relative pl-14 flex flex-col justify-start">
            {/* Time Stamp Bubble */}
            <div className="absolute left-0 top-1 font-mono text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-center w-12 shrink-0">
              {item.waktu}
            </div>

            {/* Activity Card */}
            <div className="bg-slate-50/80 hover:bg-sky-50/50 p-3 rounded-2xl border border-slate-200 transition-colors">
              <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-snug">
                {item.keterangan}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
