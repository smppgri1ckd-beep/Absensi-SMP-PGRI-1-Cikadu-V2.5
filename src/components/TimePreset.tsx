import React, { useMemo, useState } from 'react';
import { Clock, Check, Zap, BookOpen, Sparkles } from 'lucide-react';
import {
  getWIBCurrentTimeString,
  normalize24HourFormat,
  generateDefaultJPSlots,
  GeneratedJPSlot
} from '../utils/wibTime';
import { DatabaseService } from '../services/db';

export interface TimePresetOption {
  label: string;
  value: string; // Strictly "HH:mm" 24-hour format
  category?: 'standard' | 'jp' | 'custom';
  subLabel?: string;
}

export interface TimePresetProps {
  /** Currently selected time in "HH:mm" format */
  selectedTime?: string;
  /** Callback invoked with a guaranteed clean "HH:mm" 24-hour string */
  onSelect: (time24h: string) => void;
  /** Optional minute adjustment handler (-30, -15, +15, +30) */
  onAdjustMinutes?: (deltaMinutes: number) => void;
  /** Optional custom presets passed by a parent form */
  customPresets?: Array<{ label: string; value: string }>;
  /** Whether to include active School JP (Jam Pelajaran) slots (default: true) */
  includeJPSlots?: boolean;
  /** Display mode: inside dropdown popover (default) or inline bar */
  variant?: 'dropdown' | 'inline';
  /** Optional additional class names */
  className?: string;
}

/**
 * Default Standard School Time Presets (24-Hour WIB)
 * Covers requested common times: 07:00, 07:30, 08:30, 12:00, 13:00, 14:15
 */
export const STANDARD_SCHOOL_PRESETS: TimePresetOption[] = [
  { label: '07:00', subLabel: 'Masuk / Apel', value: '07:00', category: 'standard' },
  { label: '07:30', subLabel: 'Awal KBM', value: '07:30', category: 'standard' },
  { label: '08:30', subLabel: 'Pagi', value: '08:30', category: 'standard' },
  { label: '12:00', subLabel: 'Tengah Hari', value: '12:00', category: 'standard' },
  { label: '13:00', subLabel: 'Sesi Siang', value: '13:00', category: 'standard' },
  { label: '14:15', subLabel: 'Pulang', value: '14:15', category: 'standard' },
];

export const TimePreset: React.FC<TimePresetProps> = ({
  selectedTime = '',
  onSelect,
  onAdjustMinutes,
  customPresets = [],
  includeJPSlots = true,
  variant = 'dropdown',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'utama' | 'jp'>('utama');

  const normalizedSelected = useMemo(() => {
    return selectedTime ? normalize24HourFormat(selectedTime) : '';
  }, [selectedTime]);

  // Load active JP slots from schoolConfig in local cache or fallback to default 10 JP slots
  const jpSlots: GeneratedJPSlot[] = useMemo(() => {
    if (!includeJPSlots) return [];
    try {
      const { schoolConfig } = DatabaseService.getInitialLocalState();
      if (
        schoolConfig?.jadwal?.jamPelajaranMaster &&
        schoolConfig.jadwal.jamPelajaranMaster.length > 0
      ) {
        return schoolConfig.jadwal.jamPelajaranMaster.map((s) => ({
          ...s,
          isIstirahat: Boolean(s.isIstirahat),
        }));
      }
    } catch {
      // Fallback to default generator if local state unavailable
    }
    return generateDefaultJPSlots('07:15', 40, 10, [4, 7], 30);
  }, [includeJPSlots]);

  // Ensure any injected time is strictly normalized to clean "HH:mm" 24-hour format
  const handleInjectTime = (rawTime: string) => {
    const clean24h = normalize24HourFormat(rawTime);
    onSelect(clean24h);
  };

  const handleInjectNow = () => {
    const nowWIB = getWIBCurrentTimeString();
    handleInjectTime(nowWIB);
  };

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 pt-1 ${className}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-0.5">
          <Clock className="w-3 h-3" />
          Preset:
        </span>
        {STANDARD_SCHOOL_PRESETS.map((preset) => {
          const isSelected = normalizedSelected === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleInjectTime(preset.value)}
              title={`${preset.subLabel} (${preset.value} WIB)`}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono tabular-nums font-bold transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {preset.value}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header & Quick Now Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-extrabold text-slate-800">TimePreset 24 Jam</span>
        </div>
        <button
          type="button"
          onClick={handleInjectNow}
          className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          title="Gunakan Jam WIB Saat Ini"
        >
          <Zap className="w-3 h-3 fill-emerald-500 text-emerald-600" />
          <span>Sekarang (WIB)</span>
        </button>
      </div>

      {/* Minute Adjustments if provided */}
      {onAdjustMinutes && (
        <div className="grid grid-cols-4 gap-1">
          {[-30, -15, 15, 30].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onAdjustMinutes(delta)}
              className="py-1 px-1.5 text-[11px] font-mono tabular-nums font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-center cursor-pointer"
            >
              {delta > 0 ? `+${delta}m` : `${delta}m`}
            </button>
          ))}
        </div>
      )}

      {/* Category Switcher (Jam Utama vs Jam JP Aktif) */}
      {includeJPSlots && jpSlots.length > 0 && (
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('utama')}
            className={`py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'utama'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Jam Standar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jp')}
            className={`py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'jp'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Jam JP Aktif</span>
          </button>
        </div>
      )}

      {/* TAB 1: Jam Standar Sekolah (07:00, 07:30, 08:30, 12:00, 13:00, 14:15) + Custom Presets */}
      {activeTab === 'utama' && (
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Jam Standar Sekolah (HH:mm)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {STANDARD_SCHOOL_PRESETS.map((preset) => {
                const isSelected = normalizedSelected === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleInjectTime(preset.value)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                        : 'bg-slate-50/80 hover:bg-emerald-50/60 border-slate-200 hover:border-emerald-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[11px] text-slate-600 truncate mr-1">
                      {preset.subLabel}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono tabular-nums font-extrabold text-slate-900">
                        {preset.value}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Context Presets if provided */}
          {customPresets.length > 0 && (
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Opsi Konteks Form
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {customPresets.map((preset, idx) => {
                  const cleanVal = normalize24HourFormat(preset.value);
                  const isSelected = normalizedSelected === cleanVal;
                  return (
                    <button
                      key={`${cleanVal}-${idx}`}
                      type="button"
                      onClick={() => handleInjectTime(cleanVal)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                          : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span className="truncate mr-2 text-[11px]">{preset.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono tabular-nums font-bold text-slate-700">
                          {cleanVal}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Jam JP Aktif (Mulai & Selesai per JP) */}
      {activeTab === 'jp' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Slot JP Sekolah</span>
            <span>Mulai / Selesai</span>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {jpSlots.map((slot, idx) => {
              const startNorm = normalize24HourFormat(slot.jamMulai);
              const endNorm = normalize24HourFormat(slot.jamSelesai);
              const isStartSelected = normalizedSelected === startNorm;
              const isEndSelected = normalizedSelected === endNorm;

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs ${
                    slot.isIstirahat
                      ? 'bg-amber-50/60 border-amber-200/80 text-amber-900'
                      : 'bg-slate-50/70 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-bold truncate mr-1.5">
                    {slot.isIstirahat ? 'Istirahat' : `JP ${slot.jamKe}`}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInjectTime(startNorm)}
                      title={`Pilih Jam Mulai ${slot.label} (${startNorm})`}
                      className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-[11px] font-bold transition-colors cursor-pointer border ${
                        isStartSelected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 border-slate-200'
                      }`}
                    >
                      {startNorm}
                    </button>
                    <span className="text-slate-400 text-[10px]">-</span>
                    <button
                      type="button"
                      onClick={() => handleInjectTime(endNorm)}
                      title={`Pilih Jam Selesai ${slot.label} (${endNorm})`}
                      className={`px-1.5 py-0.5 rounded font-mono tabular-nums text-[11px] font-bold transition-colors cursor-pointer border ${
                        isEndSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 border-slate-200'
                      }`}
                    >
                      {endNorm}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
