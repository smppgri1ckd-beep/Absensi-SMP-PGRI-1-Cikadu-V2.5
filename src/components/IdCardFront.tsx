import React, { useState, useEffect } from 'react';
import { User, Scan } from 'lucide-react';
import { Student, SchoolConfig, IdCardTheme } from '../types';
import { PgriLogo } from './PgriLogo';

interface IdCardFrontProps {
  student: Student;
  config: SchoolConfig;
  qrDataUrl?: string;
  paperSize: 'F4' | 'A4';
  theme?: IdCardTheme;
}

const getThemeColors = (theme: IdCardTheme = 'pgri-blue') => {
  switch (theme) {
    case 'emerald-green':
      return {
        main: '#065f46',
        accent1: '#10b981',
        accent2: '#f59e0b',
        border: '#065f46',
        pillBg: '#064e3b',
      };
    case 'crimson-red':
      return {
        main: '#881337',
        accent1: '#f43f5e',
        accent2: '#f59e0b',
        border: '#881337',
        pillBg: '#4c0519',
      };
    case 'gold-amber':
      return {
        main: '#78350f',
        accent1: '#d97706',
        accent2: '#fbbf24',
        border: '#78350f',
        pillBg: '#451a03',
      };
    case 'pgri-blue':
    default:
      return {
        main: '#02509c',
        accent1: '#0ea5e9',
        accent2: '#f59e0b',
        border: '#0066cc',
        pillBg: '#004080',
      };
  }
};

export const IdCardFront: React.FC<IdCardFrontProps> = ({
  student,
  config,
  qrDataUrl,
  paperSize,
  theme = 'pgri-blue',
}) => {
  const isF4 = paperSize === 'F4';
  const [imgError, setImgError] = useState<boolean>(false);
  const themeColors = getThemeColors(theme);

  // Reset img error if student photo URL changes
  useEffect(() => {
    setImgError(false);
  }, [student.fotoUrl]);

  const isPlaceholderUrl = (url?: string) => {
    if (!url) return true;
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed === '' ||
      trimmed === '-' ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed.includes('placehold.co') ||
      trimmed.includes('placeholder')
    );
  };

  const hasValidPhoto = !isPlaceholderUrl(student.fotoUrl) && !imgError;

  const formattedGender =
    student.jk === 'L' ? 'Laki-laki' : student.jk === 'P' ? 'Perempuan' : student.jk;

  const schoolName = config.namaSekolah || 'SMP PGRI 1 CIKADU';
  const schoolAddressLine1 = config.alamat || 'Jl. Simpang - Koleberes Blok D Desa Cikadu';
  const schoolAddressLine2 = `${config.kota ? 'Kec. Cikadu Kab. ' + config.kota : 'Kec. Cikadu Kab. Cianjur'}`;

  return (
    <div
      className="student-id-card bg-white border border-slate-300 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs relative select-none"
      style={{
        width: isF4 ? '65mm' : '63mm',
        height: isF4 ? '98mm' : '88mm',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== HEADER WAVE SECTION ===== */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: isF4 ? '27mm' : '24mm' }}
      >
        {/* Background SVG Wave with Deep Blue, Gold, and Cyan curves */}
        <svg
          viewBox="0 0 500 210"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* Accent Wave 1 */}
          <path
            d="M0,0 L500,0 L500,185 Q380,215 240,165 T0,195 Z"
            fill={themeColors.accent1}
          />
          {/* Accent Wave 2 (Gold) */}
          <path
            d="M0,0 L500,0 L500,170 Q375,200 235,152 T0,180 Z"
            fill={themeColors.accent2}
          />
          {/* Main Themed Header */}
          <path
            d="M0,0 L500,0 L500,154 Q365,185 225,138 T0,165 Z"
            fill={themeColors.main}
          />
        </svg>

        {/* Header Content: Authentic Logo & School Text */}
        <div className="relative z-10 px-2 pt-1.5 flex items-center gap-2">
          {/* Authentic Circular PGRI Logo Emblem */}
          <PgriLogo
            className="w-9 h-9 sm:w-10 sm:h-10"
            customUrl={config.logoUrl}
          />

          {/* School Name & Address Details */}
          <div className="text-white text-left min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-[6.5px] sm:text-[7px] font-black uppercase tracking-wider text-white leading-tight">
              KARTU ABSENSI SISWA
            </p>
            <h4 className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-tight text-white truncate drop-shadow-xs leading-tight my-0.5">
              {schoolName}
            </h4>
            <p className="text-[5.5px] sm:text-[6px] font-medium text-white/95 truncate leading-tight">
              {schoolAddressLine1}
            </p>
            <p className="text-[5.5px] sm:text-[6px] font-medium text-white/95 truncate leading-tight">
              {schoolAddressLine2}
            </p>
          </div>
        </div>
      </div>

      {/* ===== STUDENT PHOTO & DETAILS SECTION ===== */}
      <div className="px-2 pt-0.5 flex items-center gap-1.5 shrink-0">
        {/* Student Photo (3x4 aspect ratio) */}
        <div
          className="rounded-lg border-2 border-[#02509c] overflow-hidden bg-gradient-to-b from-blue-50 to-slate-100 shrink-0 flex items-center justify-center shadow-2xs relative"
          style={{
            width: isF4 ? '19mm' : '17mm',
            height: isF4 ? '25mm' : '22mm',
            minWidth: isF4 ? '19mm' : '17mm',
            minHeight: isF4 ? '25mm' : '22mm',
            boxSizing: 'border-box',
          }}
        >
          {hasValidPhoto ? (
            <img
              src={student.fotoUrl}
              alt={student.nama}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-50/90 via-sky-50 to-slate-100 text-blue-500 p-0.5 text-center select-none">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100/90 flex items-center justify-center mb-0.5 border border-blue-200/80 shadow-2xs">
                <User className="w-3.5 h-3.5 text-blue-700" />
              </div>
              <span className="text-[5px] font-black uppercase text-blue-950 tracking-wider leading-tight">
                Pas Foto
              </span>
              <span className="text-[4px] font-bold text-blue-600/80 leading-tight">
                2 × 3 cm
              </span>
            </div>
          )}
        </div>

        {/* Student Details Grid (Nama, JK, NISN, Kelas) */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2.5px]">
          {/* Nama */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-7 font-black text-blue-950 shrink-0">Nama</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
              {student.nama}
            </div>
          </div>

          {/* JK */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-7 font-black text-blue-950 shrink-0">JK</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
              {formattedGender}
            </div>
          </div>

          {/* NISN */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-7 font-black text-blue-950 shrink-0">NISN</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-mono font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
              {student.nisn}
            </div>
          </div>

          {/* Kelas */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-7 font-black text-blue-950 shrink-0">Kelas</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
              {student.kelas}
            </div>
          </div>
        </div>
      </div>

      {/* ===== QR CODE & SCAN BADGE SECTION ===== */}
      <div className="relative flex flex-col items-center justify-center my-auto py-0.5 shrink-0">
        {/* Subtle Watermark Vector (Book & Laurel) */}
        <div className="absolute right-1 bottom-0 opacity-20 pointer-events-none z-0">
          <svg
            className="w-12 h-12 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            <path d="M12 7v14" />
          </svg>
        </div>

        {/* QR Code Frame with Themed Border */}
        <div
          className="relative z-10 p-1 bg-white rounded-xl shadow-2xs flex items-center justify-center border-[3px]"
          style={{
            borderColor: themeColors.border,
            width: isF4 ? '29mm' : '26mm',
            height: isF4 ? '29mm' : '26mm',
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR ${student.nisn}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <span className="text-[7px] font-bold">Memuat QR...</span>
            </div>
          )}
        </div>

        {/* Scan Pill Badge */}
        <div 
          className="relative z-10 mt-1 px-2.5 py-0.5 rounded-full text-white font-extrabold text-[5px] sm:text-[5.5px] tracking-wide uppercase flex items-center gap-1 shadow-xs"
          style={{ backgroundColor: themeColors.pillBg }}
        >
          <Scan className="w-2.5 h-2.5 text-white stroke-[2.5]" />
          <span>Scan untuk Absensi</span>
        </div>
      </div>

      {/* ===== FOOTER WAVE SECTION ===== */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: isF4 ? '11mm' : '9.5mm' }}
      >
        <svg
          viewBox="0 0 500 120"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* Accent Curve 1 */}
          <path
            d="M0,120 L500,120 L500,20 Q360,70 220,10 T0,40 Z"
            fill={themeColors.accent1}
          />
          {/* Golden Yellow Curve */}
          <path
            d="M0,120 L500,120 L500,32 Q360,82 220,22 T0,52 Z"
            fill={themeColors.accent2}
          />
          {/* Main Footer Curve */}
          <path
            d="M0,120 L500,120 L500,45 Q360,95 220,35 T0,65 Z"
            fill={themeColors.main}
          />
        </svg>
      </div>
    </div>
  );
};
