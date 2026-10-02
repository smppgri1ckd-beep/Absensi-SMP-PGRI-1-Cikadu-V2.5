import React, { useMemo } from 'react';
import { Clock, BookOpen, User, CheckCircle } from 'lucide-react';
import { ClassScheduleItem } from '../../types';

interface TodayScheduleProps {
  schedules: ClassScheduleItem[];
  currentHhMm?: string;
}

export const TodaySchedule: React.FC<TodayScheduleProps> = ({
  schedules,
  currentHhMm,
}) => {
  const activeTime = useMemo(() => {
    if (currentHhMm) return currentHhMm;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }, [currentHhMm]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Jadwal Hari Ini
            </h3>
            <p className="text-xs text-slate-500">
              Jadwal mata pelajaran berdasarkan waktu dan guru pengajar
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
          Waktu: {activeTime} WIB
        </span>
      </div>

      {/* Schedules List / Timeline */}
      {schedules.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">Tidak ada jadwal KBM tatap muka hari ini.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Hari ini kemungkinan hari libur atau kegiatan khusus sekolah.</p>
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-100 before:pointer-events-none">
          {schedules.map((item, idx) => {
            const isOngoing = activeTime >= item.jamMulai && activeTime <= item.jamSelesai;
            const isFinished = activeTime > item.jamSelesai;

            return (
              <div
                key={item.id || idx}
                className={`relative pl-10 transition-all ${
                  isOngoing ? 'scale-[1.01]' : ''
                }`}
              >
                {/* Timeline Dot Indicator */}
                <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 flex items-center justify-center shadow-xs ${
                  isOngoing 
                    ? 'bg-emerald-500 ring-4 ring-emerald-100' 
                    : isFinished 
                    ? 'bg-slate-300' 
                    : 'bg-blue-500'
                }`}>
                  {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                </div>

                {/* Schedule Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isOngoing
                    ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border-emerald-300 shadow-md ring-2 ring-emerald-500/10'
                    : isFinished
                    ? 'bg-slate-50/70 border-slate-200 opacity-80'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs font-black text-slate-700 block">
                        {item.jamMulai} - {item.jamSelesai}
                      </span>
                      <h4 className="font-black text-base text-slate-900">
                        {item.mapel}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 pt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Guru: <strong className="text-slate-800">{item.guruNama}</strong></span>
                      </p>
                    </div>

                    {/* Status Badge with requested format: 🟢 Sedang berlangsung */}
                    <div>
                      {isOngoing ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs animate-pulse">
                          <span>🟢</span>
                          <span>Sedang berlangsung</span>
                        </span>
                      ) : isFinished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                          <CheckCircle className="w-3 h-3 text-slate-400" />
                          <span>Selesai</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                          Akan datang
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
