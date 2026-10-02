import React from 'react';

interface QuickActionsProps {
  onScrollTo: (sectionId: string) => void;
  onOpenLeaveRequest?: () => void;
  onOpenReportCard?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onScrollTo,
  onOpenLeaveRequest,
  onOpenReportCard,
}) => {
  // Exact requested quick action buttons:
  // [📊 Lihat Nilai]
  // [📝 Lihat Tugas]
  // [📅 Jadwal]
  // [🟢 Kehadiran]
  // [📢 Pengumuman]
  // [👨‍🏫 Catatan Guru]
  // [📆 Kalender]
  const actions = [
    { label: '📊 Lihat Nilai', targetId: 'section-grades', color: 'hover:bg-amber-50 hover:text-amber-800' },
    { label: '📝 Lihat Tugas', targetId: 'section-assignments', color: 'hover:bg-rose-50 hover:text-rose-800' },
    { label: '📅 Jadwal', targetId: 'section-schedule', color: 'hover:bg-indigo-50 hover:text-indigo-800' },
    { label: '🟢 Kehadiran', targetId: 'section-attendance', color: 'hover:bg-emerald-50 hover:text-emerald-800' },
    { label: '📢 Pengumuman', targetId: 'section-announcements', color: 'hover:bg-amber-50 hover:text-amber-800' },
    { label: '👨‍🏫 Catatan Guru', targetId: 'section-notes', color: 'hover:bg-purple-50 hover:text-purple-800' },
    { label: '📆 Kalender', targetId: 'section-calendar', color: 'hover:bg-teal-50 hover:text-teal-800' },
  ];

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
          Quick Action
        </span>
        <span className="text-[11px] text-slate-400">
          Klik tombol cepat untuk melompat ke bagian yang dituju
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {onOpenLeaveRequest && (
          <button
            type="button"
            onClick={onOpenLeaveRequest}
            className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>📝 Ajukan Izin / Sakit</span>
          </button>
        )}
        {onOpenReportCard && (
          <button
            type="button"
            onClick={onOpenReportCard}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>🖨️ Cetak Rapor Digital</span>
          </button>
        )}
        {actions.map((act, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onScrollTo(act.targetId)}
            className={`px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black transition-all shrink-0 cursor-pointer shadow-2xs hover:border-slate-300 ${act.color}`}
          >
            <span>{act.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
