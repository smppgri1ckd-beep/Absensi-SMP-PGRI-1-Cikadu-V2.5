import React from 'react';
import { 
  Award, 
  TrendingUp, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  HelpCircle,
  Percent
} from 'lucide-react';

interface LearningSummaryProps {
  averageGrade: number;
  uncompletedTasks: number;
  submittedTasks: number;
  lateTasks: number;
  attendancePercentage: number;
  quizCount?: number;
  examCount?: number;
  examAverage?: number;
  taskAverage?: number;
  completedTopicsCount?: number;
}

export const LearningSummary: React.FC<LearningSummaryProps> = ({
  averageGrade,
  uncompletedTasks,
  submittedTasks,
  lateTasks,
  attendancePercentage,
  quizCount = 6,
  examCount = 3,
  examAverage = 88.5,
  taskAverage = 90.2,
  completedTopicsCount = 14,
}) => {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Ringkasan Pembelajaran
            </h3>
            <p className="text-xs text-slate-500">
              Perkembangan akademis, tugas, dan ketuntasan materi anak
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Status Aktif</span>
        </span>
      </div>

      {/* 5 Primary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Nilai Rata-rata */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 text-center space-y-1">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block">
            Nilai rata-rata:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
            {averageGrade.toFixed(1)}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold block">Skala 0 - 100</span>
        </div>

        {/* 2. Tugas Belum Selesai */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50/50 border border-rose-200 text-center space-y-1">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide block">
            Tugas belum selesai:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-950 font-mono">
            {uncompletedTasks}
          </div>
          <span className="text-[10px] text-rose-700 font-semibold block">Perlu dikerjakan</span>
        </div>

        {/* 3. Tugas Sudah Dikumpulkan */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 text-center space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block">
            Tugas sudah dikumpulkan:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
            {submittedTasks}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">Sudah diserahkan</span>
        </div>

        {/* 4. Tugas Terlambat */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/30 border border-slate-200 text-center space-y-1">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
            Tugas terlambat:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {lateTasks}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold block">Melewati batas</span>
        </div>

        {/* 5. Kehadiran */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 text-center space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide block">
            Kehadiran:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 font-mono">
            {attendancePercentage}%
          </div>
          <span className="text-[10px] text-blue-700 font-semibold block">Disiplin apel & KBM</span>
        </div>
      </div>

      {/* Additional Educational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Jumlah kuis:</span>
          <strong className="text-slate-900 font-mono font-black text-base">{quizCount} Kuis</strong>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Jumlah ujian:</span>
          <strong className="text-slate-900 font-mono font-black text-base">{examCount} Ujian</strong>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Rata-rata nilai ujian:</span>
          <strong className="text-indigo-900 font-mono font-black text-base">{examAverage}</strong>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[11px] text-slate-500 font-medium block">Rata-rata nilai tugas:</span>
          <strong className="text-emerald-900 font-mono font-black text-base">{taskAverage}</strong>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 font-medium block">Materi dipelajari:</span>
          <strong className="text-amber-900 font-mono font-black text-base">{completedTopicsCount} Modul</strong>
        </div>
      </div>
    </div>
  );
};
