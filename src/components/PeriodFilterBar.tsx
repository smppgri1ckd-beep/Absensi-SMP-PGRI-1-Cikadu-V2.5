import React from 'react';
import { Calendar, ChevronDown, Clock, Filter, Sparkles } from 'lucide-react';
import { TimePeriodFilter, getPeriodDateRange } from '../utils/datePeriodUtils';

interface PeriodFilterBarProps {
  period: TimePeriodFilter;
  onChangePeriod: (period: TimePeriodFilter) => void;
  customDate?: string;
  onChangeCustomDate?: (date: string) => void;
  counts?: Partial<Record<TimePeriodFilter, number>>;
  compact?: boolean;
  className?: string;
  showCustomDatePicker?: boolean;
}

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({
  period,
  onChangePeriod,
  customDate,
  onChangeCustomDate,
  counts,
  compact = false,
  className = '',
  showCustomDatePicker = true,
}) => {
  const currentRange = getPeriodDateRange(period, customDate);

  const periods: { key: TimePeriodFilter; label: string; icon?: string }[] = [
    { key: 'hari', label: 'Hari Ini' },
    { key: 'minggu', label: 'Minggu Ini' },
    { key: 'bulan', label: 'Bulan Ini' },
    { key: 'semester', label: 'Semester' },
    { key: 'tahun', label: 'Tahun Ini' },
    { key: 'semua', label: 'Semua' },
  ];

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${className}`}>
      {/* Buttons Tab List */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 scrollbar-none shrink-0">
        {periods.map(({ key, label }) => {
          const isActive = period === key;
          const count = counts?.[key];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChangePeriod(key)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <span>{label}</span>
              {count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail Range or Custom Date Picker */}
      <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-auto">
        {period === 'hari' && showCustomDatePicker && onChangeCustomDate && (
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <input
              type="date"
              value={customDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => onChangeCustomDate(e.target.value)}
              className="text-xs text-slate-800 font-semibold focus:outline-none bg-transparent cursor-pointer"
              title="Pilih tanggal spesifik"
            />
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1.5 text-slate-500 font-medium text-[11px] bg-white/70 px-2.5 py-1 rounded-xl border border-slate-200">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{currentRange.description}</span>
        </div>
      </div>
    </div>
  );
};
