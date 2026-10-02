import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Bookmark, Sparkles } from 'lucide-react';
import { AcademicCalendarEvent } from '../../types';

interface AcademicCalendarProps {
  events: AcademicCalendarEvent[];
}

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({ events }) => {
  // Calendar month state: October 2026
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-05');

  // Month names
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Number of days in October 2026
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  // Event type emoji and badge mapping
  const eventTypeMap: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
    SEKOLAH: { emoji: '📚', label: 'Hari sekolah', bg: 'bg-blue-100', text: 'text-blue-900' },
    UJIAN: { emoji: '📝', label: 'Ujian', bg: 'bg-purple-100', text: 'text-purple-900' },
    KEGIATAN: { emoji: '🎉', label: 'Kegiatan sekolah', bg: 'bg-emerald-100', text: 'text-emerald-900' },
    LIBUR: { emoji: '🏖', label: 'Libur', bg: 'bg-amber-100', text: 'text-amber-900' },
    PENTING: { emoji: '📌', label: 'Acara penting', bg: 'bg-rose-100', text: 'text-rose-900' },
    DEADLINE: { emoji: '⏰', label: 'Deadline tugas', bg: 'bg-orange-100', text: 'text-orange-900' },
  };

  // Map events by date
  const eventsByDate = new Map<string, AcademicCalendarEvent[]>();
  events.forEach((ev) => {
    const list = eventsByDate.get(ev.tanggal) || [];
    list.push(ev);
    eventsByDate.set(ev.tanggal, list);
  });

  // Selected date events
  const selectedDayEvents = eventsByDate.get(selectedDate) || [];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Kalender Akademik
            </h3>
            <p className="text-xs text-slate-500">
              Klik tanggal untuk melihat jadwal kegiatan dan agenda sekolah
            </p>
          </div>
        </div>

        {/* Legend requested by user:
            📚 Hari sekolah | 📝 Ujian | 🎉 Kegiatan sekolah | 🏖 Libur | 📌 Acara penting | ⏰ Deadline tugas */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">📚 Hari sekolah</span>
          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">📝 Ujian</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">🎉 Kegiatan sekolah</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">🏖 Libur</span>
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">📌 Acara penting</span>
          <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200">⏰ Deadline tugas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Interactive Calendar Grid */}
        <div className="lg:col-span-2 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="font-black text-sm text-slate-900 font-mono">
              {monthNames[currentMonth]} {currentYear}
            </h4>
            <span className="text-[11px] text-slate-500 font-semibold">
              SMP PGRI 1 CIKADU
            </span>
          </div>

          {/* Weekday headers: Min Sen Sel Rab Kam Jum Sab */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-500 uppercase tracking-wider">
            <span className="text-rose-600">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-14 rounded-xl" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isSelected = selectedDate === dateStr;
              const isSunday = (firstDayIndex + idx) % 7 === 0;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-14 p-1 rounded-xl transition-all flex flex-col justify-between items-center cursor-pointer border text-center relative ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : dayEvents.length > 0
                      ? 'bg-white hover:bg-blue-50 border-blue-300 shadow-2xs'
                      : isSunday
                      ? 'bg-rose-50/50 text-rose-700 border-rose-200'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className={`text-xs font-mono font-bold ${
                    isSelected ? 'text-white' : isSunday ? 'text-rose-600' : 'text-slate-800'
                  }`}>
                    {dayNum}
                  </span>

                  {/* Marker Emoji for Event */}
                  {dayEvents.length > 0 && (
                    <div className="flex items-center gap-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((e, eIdx) => (
                        <span key={eIdx} className="text-[10px]" title={e.judul}>
                          {eventTypeMap[e.tipe]?.emoji || '📌'}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col: Event Details for Clicked Date */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Agenda Tanggal:
              </span>
              <strong className="text-sm font-black text-slate-900 font-mono">
                {selectedDate}
              </strong>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {selectedDayEvents.length} Kegiatan
            </span>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <span className="text-2xl block">📚</span>
              <p className="text-xs font-bold text-slate-600">Hari Belajar Reguler</p>
              <p className="text-[11px] text-slate-400">
                Tidak ada agenda ujian khusus atau libur pada tanggal ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDayEvents.map((ev) => {
                const info = eventTypeMap[ev.tipe] || { emoji: '📌', label: 'Acara', bg: 'bg-slate-100', text: 'text-slate-800' };
                return (
                  <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{info.emoji}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${info.bg} ${info.text}`}>
                        {info.label}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-xs text-slate-900 pt-0.5">
                      {ev.judul}
                    </h5>

                    {ev.keterangan && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {ev.keterangan}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
