import React, { useState, useEffect } from 'react';
import { User, Scan, GraduationCap } from 'lucide-react';
import { Student, TeacherUser, SchoolConfig, IdCardTheme } from '../types';
import { PgriLogo } from './PgriLogo';

interface IdCardFrontProps {
  student?: Student;
  teacher?: TeacherUser;
  config: SchoolConfig;
  qrDataUrl?: string;
  paperSize: 'F4' | 'A4';
  theme?: IdCardTheme;
  category?: 'SISWA' | 'GURU';
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
  teacher,
  config,
  qrDataUrl,
  paperSize,
  theme = 'pgri-blue',
  category = teacher ? 'GURU' : 'SISWA',
}) => {
  const isF4 = paperSize === 'F4';
  const isTeacher = category === 'GURU' || Boolean(teacher);
  const [imgError, setImgError] = useState<boolean>(false);
  const themeColors = getThemeColors(theme);

  const fotoUrl = isTeacher ? teacher?.fotoUrl : student?.fotoUrl;

  useEffect(() => {
    setImgError(false);
  }, [fotoUrl]);

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

  const hasValidPhoto = !isPlaceholderUrl(fotoUrl) && !imgError;

  const schoolName = config.namaSekolah || 'SMP PGRI 1 CIKADU';
  const schoolAddressLine1 = config.alamat || 'Jl. Simpang - Koleberes Blok D Desa Cikadu';
  const schoolAddressLine2 = `${config.kota ? 'Kec. Cikadu Kab. ' + config.kota : 'Kec. Cikadu Kab. Cianjur'}`;

  // Display details
  const personName = isTeacher ? (teacher?.nama || 'NAMA GURU') : (student?.nama || 'NAMA SISWA');
  const field1Label = 'Nama';
  const field1Val = personName;

  const field2Label = isTeacher ? 'NIP/ID' : 'JK';
  const field2Val = isTeacher
    ? (teacher?.nip && teacher?.nip !== '-' ? teacher.nip : teacher?.username || teacher?.id || '-')
    : student?.jk === 'L' ? 'Laki-laki' : student?.jk === 'P' ? 'Perempuan' : student?.jk || '-';

  const formatTeacherTugas = (t?: TeacherUser) => {
    if (t?.role === 'admin' && (!t.mapel || t.mapel === '-')) return 'Administrator Sekolah';
    return 'Guru Mapel';
  };

  const field3Label = isTeacher ? 'Tugas' : 'NISN';
  const field3Val = isTeacher
    ? formatTeacherTugas(teacher)
    : student?.nisn || '-';

  const field4Label = isTeacher ? '' : 'Kelas';
  const field4Val = isTeacher ? '' : student?.kelas || '-';

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
        <svg
          viewBox="0 0 500 210"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path d="M0,0 L500,0 L500,185 Q380,215 240,165 T0,195 Z" fill={themeColors.accent1} />
          <path d="M0,0 L500,0 L500,170 Q375,200 235,152 T0,180 Z" fill={themeColors.accent2} />
          <path d="M0,0 L500,0 L500,154 Q365,185 225,138 T0,165 Z" fill={themeColors.main} />
        </svg>

        <div className="relative z-10 px-2 pt-1.5 flex items-center gap-2">
          <PgriLogo className="w-9 h-9 sm:w-10 sm:h-10" customUrl={config.logoUrl} />
          <div className="text-white text-left min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-[6.5px] sm:text-[7px] font-black uppercase tracking-wider text-amber-300 leading-tight">
              {isTeacher ? 'KARTU IDENTITAS GURU & TENDIK' : 'KARTU ABSENSI SISWA'}
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

      {/* ===== PHOTO & DETAILS SECTION ===== */}
      <div className="px-2 pt-0.5 flex items-center gap-1.5 shrink-0">
        <div
          className={`rounded-lg border-2 ${isTeacher ? 'border-amber-600' : 'border-[#02509c]'} overflow-hidden bg-gradient-to-b from-blue-50 to-slate-100 shrink-0 flex items-center justify-center shadow-2xs relative`}
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
              src={fotoUrl}
              alt={personName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-50/90 via-sky-50 to-slate-100 text-blue-500 p-0.5 text-center select-none">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100/90 flex items-center justify-center mb-0.5 border border-blue-200/80 shadow-2xs">
                {isTeacher ? (
                  <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-700" />
                )}
              </div>
              <span className="text-[5px] font-black uppercase text-blue-950 tracking-wider leading-tight">
                {isTeacher ? 'Foto Guru' : 'Pas Foto'}
              </span>
              <span className="text-[4px] font-bold text-blue-600/80 leading-tight">
                2 × 3 cm
              </span>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2.5px]">
          {/* Field 1: Nama */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-8 font-black text-blue-950 shrink-0">{field1Label}</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
              {field1Val}
            </div>
          </div>

          {/* Field 2: NIP / JK */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-8 font-black text-blue-950 shrink-0">{field2Label}</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight font-mono">
              {field2Val}
            </div>
          </div>

          {/* Field 3: Tugas / NISN */}
          <div className="flex items-center text-[6px] sm:text-[6.5px]">
            <span className="w-8 font-black text-blue-950 shrink-0">{field3Label}</span>
            <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
            <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
              {field3Val}
            </div>
          </div>

          {/* Field 4: Kelas (Siswa Only) */}
          {!isTeacher && (
            <div className="flex items-center text-[6px] sm:text-[6.5px]">
              <span className="w-8 font-black text-blue-950 shrink-0">{field4Label}</span>
              <span className="font-black text-blue-950 px-0.5 shrink-0">:</span>
              <div className="bg-[#dceeff] text-blue-950 font-black rounded px-1.5 py-[1px] flex-1 truncate text-left shadow-2xs leading-tight">
                {field4Val}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== QR CODE & SCAN BADGE SECTION ===== */}
      <div className="relative flex flex-col items-center justify-center my-auto py-0.5 shrink-0">
        <div className="absolute right-1 bottom-0 opacity-20 pointer-events-none z-0">
          <svg className="w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            <path d="M12 7v14" />
          </svg>
        </div>

        <div
          className="relative z-10 p-1 bg-white rounded-xl shadow-2xs flex items-center justify-center border-[3px]"
          style={{ borderColor: themeColors.border }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR ${personName}`}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
              <Scan className="w-6 h-6 mb-1" />
              <span className="text-[6px] font-mono">Loading QR</span>
            </div>
          )}
        </div>

        <div
          className="relative z-10 px-2 py-0.5 mt-1 rounded-full text-white font-black text-[6px] uppercase tracking-wider flex items-center gap-1 shadow-2xs"
          style={{ backgroundColor: themeColors.pillBg }}
        >
          <Scan className="w-2.5 h-2.5 text-amber-300" />
          <span>{isTeacher ? 'SCAN QR PRESENSI GURU' : 'SCAN QR CODE KIOSK ABSENSI'}</span>
        </div>
      </div>

      {/* ===== FOOTER WAVE & SIGNATURE SECTION ===== */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: isF4 ? '18mm' : '16mm' }}
      >
        <svg
          viewBox="0 0 500 180"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <path d="M0,180 L500,180 L500,30 Q360,90 220,10 T0,50 Z" fill={themeColors.accent1} />
          <path d="M0,180 L500,180 L500,45 Q360,105 220,25 T0,65 Z" fill={themeColors.accent2} />
          <path d="M0,180 L500,180 L500,60 Q360,120 220,40 T0,80 Z" fill={themeColors.main} />
        </svg>

        <div className="relative z-10 w-full h-full px-2.5 pb-1 flex items-end justify-between text-white">
          <div className="text-left leading-tight mb-0.5">
            <p className="text-[5px] font-bold text-white/90">Diterbitkan oleh:</p>
            <p className="text-[6px] font-black text-amber-300 uppercase tracking-tight">{schoolName}</p>
          </div>

          <div className="text-right leading-tight mb-0.5">
            <p className="text-[5px] font-bold text-white/90">
              {config.kota || 'Cianjur'}, {new Date().getFullYear()}
            </p>
            <p className="text-[5.5px] font-black text-white uppercase tracking-tight mt-[1px]">Kepala Sekolah</p>
            <p className="text-[6px] font-black text-amber-300 underline tracking-tight mt-[1px]">
              {config.namaKepsek || 'H. SURYADI, M.Pd.'}
            </p>
            <p className="text-[4.5px] font-bold text-white/80 font-mono">
              NIP. {config.nipKepsek || '19700101 199501 1 001'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
