import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Check, Zap } from 'lucide-react';
import { getWIBCurrentTimeString } from '../utils/wibTime';

interface TimePicker24hProps {
  value: string; // HH:mm format, e.g. "07:30"
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  quickPresets?: Array<{ label: string; value: string }>;
  showNowButton?: boolean;
  required?: boolean;
  id?: string;
}

export const TimePicker24h: React.FC<TimePicker24hProps> = ({
  value,
  onChange,
  label,
  placeholder = '07:30',
  disabled = false,
  className = '',
  quickPresets = [],
  showNowButton = true,
  required = false,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync internal input value with prop value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format and validate 24-hour time "HH:mm"
  const validateAndNormalize = (raw: string): string | null => {
    const clean = raw.trim().replace(/[^0-9:]/g, '');
    if (!clean) return '';
    
    // Auto-insert colon if user typed 4 digits like "0730"
    let formatted = clean;
    if (/^\d{4}$/.test(clean)) {
      formatted = `${clean.slice(0, 2)}:${clean.slice(2, 4)}`;
    }

    const match = formatted.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (match) {
      const h = match[1].padStart(2, '0');
      const m = match[2];
      return `${h}:${m}`;
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // If matches complete HH:mm, emit change immediately
    const valid = validateAndNormalize(val);
    if (valid !== null) {
      onChange(valid);
    }
  };

  const handleBlur = () => {
    const normalized = validateAndNormalize(inputValue);
    if (normalized !== null && normalized !== '') {
      setInputValue(normalized);
      onChange(normalized);
    } else if (inputValue !== '' && !normalized) {
      // Revert to prop value if invalid
      setInputValue(value || '');
    }
  };

  const handleSetTime = (timeStr: string) => {
    setInputValue(timeStr);
    onChange(timeStr);
    setIsOpen(false);
  };

  const handleSetNow = () => {
    const nowWIB = getWIBCurrentTimeString();
    handleSetTime(nowWIB);
  };

  const adjustMinutes = (deltaMinutes: number) => {
    const current = validateAndNormalize(inputValue) || value || '07:00';
    const parts = current.split(':');
    let h = parseInt(parts[0] || '7', 10);
    let m = parseInt(parts[1] || '0', 10);

    let totalMinutes = h * 60 + m + deltaMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = totalMinutes % (24 * 60);

    const newH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const newM = String(totalMinutes % 60).padStart(2, '0');
    handleSetTime(`${newH}:${newM}`);
  };

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            24 Jam WIB
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Clock className="w-4 h-4" />
        </div>

        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={5}
          className="w-full pl-9 pr-20 py-2 text-sm font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 shadow-xs"
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {showNowButton && (
            <button
              type="button"
              onClick={handleSetNow}
              disabled={disabled}
              title="Set Jam WIB Sekarang"
              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-0.5"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Pilih Opsi Jam 24h"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Popover Menu Preset & Increment */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 right-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">Penyesuaian Jam (24 Jam)</span>
            <span className="text-[10px] font-mono text-slate-500">WIB</span>
          </div>

          {/* Increments */}
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => adjustMinutes(-30)}
              className="py-1 px-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-center"
            >
              -30m
            </button>
            <button
              type="button"
              onClick={() => adjustMinutes(-15)}
              className="py-1 px-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-center"
            >
              -15m
            </button>
            <button
              type="button"
              onClick={() => adjustMinutes(15)}
              className="py-1 px-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-center"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => adjustMinutes(30)}
              className="py-1 px-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-center"
            >
              +30m
            </button>
          </div>

          {/* Quick Presets if provided */}
          {quickPresets.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pilihan Jam Preset</span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {quickPresets.map((preset, idx) => {
                  const isSelected = value === preset.value;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSetTime(preset.value)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-slate-500">{preset.value}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Default Standard School Presets if no custom presets provided */}
          {quickPresets.length === 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jam Sekolah Populer</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Masuk Pagi', val: '07:15' },
                  { label: 'JP 1 Mulai', val: '07:30' },
                  { label: 'JP 2 Mulai', val: '08:10' },
                  { label: 'Istirahat 1', val: '10:10' },
                  { label: 'Sesi Siang', val: '12:00' },
                  { label: 'Pulang', val: '14:15' }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSetTime(p.val)}
                    className="flex items-center justify-between px-2 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded-lg text-xs transition-colors"
                  >
                    <span className="text-[11px] truncate">{p.label}</span>
                    <span className="font-mono font-bold">{p.val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
