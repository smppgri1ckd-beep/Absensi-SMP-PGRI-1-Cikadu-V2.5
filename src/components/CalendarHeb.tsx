import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  Save, 
  Info,
  Printer 
} from 'lucide-react';
import { KalenderHeb, SchoolConfig } from '../types';
import { SchoolLogo } from '../assets/schoolLogo';
import { generateHebCalendarPdf } from '../utils/exportPdf';
import { useToast } from '../context/ToastContext';

interface CalendarHebProps {
  kalenderHeb: KalenderHeb;
  onSaveKalender: (heb: KalenderHeb) => Promise<void>;
  schoolConfig: SchoolConfig;
}

export const CalendarHeb: React.FC<CalendarHebProps> = ({
  kalenderHeb,
  onSaveKalender,
  schoolConfig,
}) => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [localMap, setLocalMap] = useState<Record<string, boolean>>(kalenderHeb.kalenderData || {});
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const toggleDay = (dayNum: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setLocalMap((prev) => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }));
  };

  // Quick Presets
  const applyPreset = (mode: '5_HARI' | '6_HARI') => {
    const nextMap = { ...localMap };
    for (let d = 1; d <= daysInMonth; d++) {
      const dObj = new Date(year, month, d);
      const dayIdx = dObj.getDay(); // 0 Min, 6 Sab
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      if (mode === '5_HARI') {
        nextMap[key] = dayIdx >= 1 && dayIdx <= 5; // Mon-Fri
      } else {
        nextMap[key] = dayIdx >= 1 && dayIdx <= 6; // Mon-Sat
      }
    }
    setLocalMap(nextMap);
  };

  const handleSave = async () => {
    await onSaveKalender({ kalenderData: localMap });
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  // Count active HEB this month
  let hebCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (localMap[key] !== false) {
      hebCount++;
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <SchoolLogo src={schoolConfig?.logoUrl} className="w-12 h-12 shrink-0 drop-shadow-xs bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs" />
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span>Kalender Hari Efektif Belajar (HEB)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {schoolConfig.namaSekolah} • Tentukan hari sekolah aktif sebagai pembagi persentase kehadiran resmi bulanan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export PDF Button */}
          <button
            onClick={() => {
              generateHebCalendarPdf(kalenderHeb, year, month, schoolConfig);
              toast.success('Kalender HEB Disiapkan', 'Berkas PDF kalender hari efektif belajar siap dicetak.');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors shadow-2xs"
            title="Cetak Berkas PDF Resmi Kalender HEB"
          >
            <Printer className="w-3.5 h-3.5 text-rose-600" />
            <span>Cetak PDF HEB</span>
          </button>

          {/* Preset Buttons */}
          <button
            onClick={() => {
              applyPreset('6_HARI');
              toast.info('Pola 6 Hari Diterapkan', 'Klik tombol "Simpan Perubahan" untuk menyimpan ke database.');
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Pola 6 Hari (Sen-Sab)
          </button>
          <button
            onClick={() => {
              applyPreset('5_HARI');
              toast.info('Pola 5 Hari Diterapkan', 'Klik tombol "Simpan Perubahan" untuk menyimpan ke database.');
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
          >
            Pola 5 Hari (Sen-Jum)
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Kalender</span>
          </button>
        </div>
      </div>

      {isSavedBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan kalender HEB berhasil disimpan ke Cloud!</span>
        </div>
      )}

      {/* Month Navigator & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-extrabold text-slate-900">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
            Total HEB: {hebCount} Hari
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map((d, idx) => (
          <div 
            key={d} 
            className={`text-center py-2 text-xs font-extrabold ${
              idx === 0 ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            {d}
          </div>
        ))}

        {/* Empty cells before month start */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/50" />
        ))}

        {/* Month days */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isEffective = localMap[key] !== false;
          const dayDate = new Date(year, month, dayNum);
          const isSunday = dayDate.getDay() === 0;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => toggleDay(dayNum)}
              className={`h-14 sm:h-16 rounded-2xl p-2 border flex flex-col justify-between text-left transition-all ${
                isEffective
                  ? 'bg-white border-blue-200 shadow-2xs hover:border-blue-400'
                  : 'bg-rose-50/60 border-rose-200/80 hover:border-rose-300'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`text-xs font-extrabold ${isSunday ? 'text-rose-600' : 'text-slate-900'}`}>
                  {dayNum}
                </span>
                {isEffective ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                )}
              </div>

              <span className={`text-[9px] font-bold ${isEffective ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isEffective ? 'Efektif' : 'Libur'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          Klik pada kotak tanggal untuk mengubah status menjadi <strong>Hari Efektif</strong> (Hijau) atau <strong>Hari Libur</strong> (Merah).
        </span>
      </div>

    </div>
  );
};
