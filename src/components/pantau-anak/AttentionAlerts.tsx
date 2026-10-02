import React from 'react';
import { Bell, Info } from 'lucide-react';

interface AttentionAlertsProps {
  uncompletedTasksCount: number;
  lateTasksCount?: number;
  attendanceDecreased?: boolean;
  hasNewGrade?: boolean;
}

export const AttentionAlerts: React.FC<AttentionAlertsProps> = ({
  uncompletedTasksCount,
  lateTasksCount = 1,
  attendanceDecreased = false,
  hasNewGrade = true,
}) => {
  // Alerts list conforming to requested examples:
  // 🔴 2 tugas belum selesai
  // 🟡 1 tugas melewati deadline
  // 🟡 Kehadiran bulan ini menurun
  // 🔵 Ada nilai baru
  // 🟢 Semua tugas sudah dikumpulkan
  const alerts: Array<{
    emoji: string;
    text: string;
    detail: string;
    bg: string;
    border: string;
    textCol: string;
  }> = [];

  if (uncompletedTasksCount > 0) {
    alerts.push({
      emoji: '🔴',
      text: `${uncompletedTasksCount} tugas belum selesai`,
      detail: 'Terdapat latihan atau laporan tugas yang perlu dikerjakan dan didampingi.',
      bg: 'bg-rose-50/70',
      border: 'border-rose-200',
      textCol: 'text-rose-950',
    });
  } else {
    alerts.push({
      emoji: '🟢',
      text: 'Semua tugas sudah dikumpulkan',
      detail: 'Seluruh pekerjaan rumah dan tugas terjadwal telah diselesaikan dengan baik.',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      textCol: 'text-emerald-950',
    });
  }

  if (lateTasksCount > 0) {
    alerts.push({
      emoji: '🟡',
      text: `${lateTasksCount} tugas melewati deadline`,
      detail: 'Terdapat 1 tugas yang melewati batas tenggat, siswa masih dapat mengumpulkan susulan.',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      textCol: 'text-amber-950',
    });
  }

  if (attendanceDecreased) {
    alerts.push({
      emoji: '🟡',
      text: 'Kehadiran bulan ini menurun',
      detail: 'Terdapat catatan izin/sakit pada pekan ini, mohon pantau kesehatan ananda.',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      textCol: 'text-amber-950',
    });
  }

  if (hasNewGrade) {
    alerts.push({
      emoji: '🔵',
      text: 'Ada nilai baru',
      detail: 'Guru telah menerbitkan hasil penilaian tugas/ulangan terbaru. Silakan cek di bagian Nilai.',
      bg: 'bg-blue-50/70',
      border: 'border-blue-200',
      textCol: 'text-blue-950',
    });
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
          <Bell className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
            Perlu Perhatian
          </h4>
          <p className="text-[11px] text-slate-500">
            Notifikasi informatif dan objektif mengenai perkembangan anak
          </p>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((al, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-2xl border ${al.bg} ${al.border} space-y-1 transition-all shadow-2xs`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0">{al.emoji}</span>
              <strong className={`text-xs font-black ${al.textCol}`}>
                {al.text}
              </strong>
            </div>
            <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
              {al.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
