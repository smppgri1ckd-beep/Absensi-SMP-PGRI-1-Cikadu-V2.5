import React from 'react';
import { ArrowLeft, GraduationCap, ShieldCheck, Calendar, User, Printer, Home } from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig } from '../../types';
import { generateStudentReportCardPdf } from '../../utils/exportPdf';
import { DEFAULT_SCHOOL_CONFIG } from '../../services/db';
import { SchoolLogo } from '../../assets/schoolLogo';

interface ChildOverviewProps {
  student: Student;
  waliKelasNama?: string;
  onBack: () => void;
  onBackToPublic?: () => void;
  records?: AttendanceRecord[];
  schoolConfig?: SchoolConfig;
}

export const ChildOverview: React.FC<ChildOverviewProps> = ({
  student,
  waliKelasNama = 'Budi Santoso, S.Pd.',
  onBack,
  onBackToPublic,
  records = [],
  schoolConfig = DEFAULT_SCHOOL_CONFIG,
}) => {
  const handlePrintPdf = () => {
    generateStudentReportCardPdf(student, records, schoolConfig);
  };

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl border border-blue-800 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black border border-white/20 transition-all cursor-pointer backdrop-blur-xs shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-amber-300" />
              <span>← Cari Siswa Lain</span>
            </button>

            {onBackToPublic && (
              <button
                type="button"
                onClick={onBackToPublic}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer backdrop-blur-xs shadow-xs"
                title="Kembali ke Beranda Tampilan Publik"
              >
                <Home className="w-3.5 h-3.5 text-blue-200" />
                <span>Beranda Publik</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-950/20 transition-all cursor-pointer border border-rose-400/40"
              title="Cetak Lembar Laporan Kehadiran & Pantau Siswa Resmi ke PDF"
            >
              <Printer className="w-3.5 h-3.5 text-rose-100" />
              <span>Cetak Laporan PDF</span>
            </button>

            <span className="text-[11px] font-bold text-blue-200 bg-blue-500/20 px-3 py-1.5 rounded-xl border border-blue-400/30 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span>Tahun Ajaran: <strong>2026/2027</strong></span>
            </span>
          </div>
        </div>

        {/* Child Profile Information Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-1">
          <div className="flex items-start sm:items-center gap-4">
            {student.fotoUrl ? (
              <img
                src={student.fotoUrl}
                alt={student.nama}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-lg shrink-0 ring-4 ring-white/10"
              />
            ) : (
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl border-2 border-white shadow-lg shrink-0 ${
                student.jk === 'L' ? 'bg-blue-600 text-white' : 'bg-rose-500 text-white'
              }`}>
                {student.nama.charAt(0)}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-xs">
                  Kelas {student.kelas}
                </span>
                <span className="text-xs font-mono text-blue-200">
                  NISN: <strong className="text-white">{student.nisn}</strong>
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                Perkembangan {student.nama}
              </h1>

              {/* Informative Header Key-Values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-blue-100 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-blue-300 font-semibold">Nama:</span>
                  <strong className="text-white font-black">{student.nama}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-blue-300 font-semibold">Kelas:</span>
                  <strong className="text-white font-black">{student.kelas}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="text-blue-300 font-semibold">Wali Kelas:</span>
                  <strong className="text-white font-black">{waliKelasNama}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-blue-300 font-semibold">Tahun Ajaran:</span>
                  <strong className="text-amber-300 font-black">2026/2027</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2.5 p-3 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-xs">
            <SchoolLogo 
              src={schoolConfig?.logoUrl} 
              className="w-9 h-9 shrink-0 drop-shadow-xs" 
            />
            <div className="text-left text-xs">
              <span className="font-extrabold block text-white">{schoolConfig.namaSekolah}</span>
              <span className="text-[10px] text-blue-200">Dapodik & Presensi Real-Time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
