import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, Zap } from 'lucide-react';
import { getWIBCurrentTimeString, normalize24HourFormat } from '../utils/wibTime';
import { TimePreset } from './TimePreset';

export { TimePreset };

interface TimePicker24hProps {
  value: string; // HH:mm format, e.g. "07:30"
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  quickPresets?: Array<{ label: string; value: string }>;
  showNowButton?: boolean;
  includeJPSlots?: boolean;
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
  includeJPSlots = true,
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

  // Handle outside click or Escape key to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
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
    if (valid !== null && valid !== '') {
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
    const clean24h = normalize24HourFormat(timeStr);
    setInputValue(clean24h);
    onChange(clean24h);
    setIsOpen(false);
  };

  const handleSetNow = () => {
    const nowWIB = getWIBCurrentTimeString();
    handleSetTime(nowWIB);
  };

  const adjustMinutes = (deltaMinutes: number) => {
    const current = validateAndNormalize(inputValue) || value || '07:00';
    const parts = current.split(':');
    const h = parseInt(parts[0] || '7', 10);
    const m = parseInt(parts[1] || '0', 10);

    let totalMinutes = h * 60 + m + deltaMinutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    totalMinutes = totalMinutes % (24 * 60);

    const newH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const newM = String(totalMinutes % 60).padStart(2, '0');
    const updated = `${newH}:${newM}`;
    setInputValue(updated);
    onChange(updated);
  };

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] font-mono tabular-nums text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
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
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={5}
          autoComplete="off"
          className="w-full pl-9 pr-20 py-2 text-sm font-mono tabular-nums font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 shadow-xs"
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {showNowButton && (
            <button
              type="button"
              onClick={handleSetNow}
              disabled={disabled}
              title="Set Jam WIB Sekarang"
              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Pilih Opsi TimePreset 24 Jam"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Popover Dropdown Menu containing Reusable TimePreset */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 right-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <TimePreset
            selectedTime={inputValue || value}
            onSelect={handleSetTime}
            onAdjustMinutes={adjustMinutes}
            customPresets={quickPresets}
            includeJPSlots={includeJPSlots}
            variant="dropdown"
          />
        </div>
      )}
    </div>
  );
};
