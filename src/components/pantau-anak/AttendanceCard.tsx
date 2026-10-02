import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogIn,
  LogOut,
  CalendarDays
} from 'lucide-react';
import { AttendanceRecord, SchoolConfig } from '../../types';

interface AttendanceCardProps {
  morningRecord?: AttendanceRecord;
  afternoonRecord?: AttendanceRecord;
  schoolConfig: SchoolConfig;
  todayStr: string;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  morningRecord,
  afternoonRecord,
  schoolConfig,
  todayStr,
}) => {
  // Determine primary attendance status:
  // 🟢 HADIR
  // 🟡 BELUM HADIR
  // 🔵 IZIN
  // 🟣 SAKIT
  // 🔴 ALPA
  type StatusInfo = {
    emoji: string;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    pillBg: string;
    desc: string;
  };

  let statusInfo: StatusInfo;

  if (!morningRecord) {
    statusInfo = {
      emoji: '🟡',
      label: 'BELUM HADIR',
      bgColor: 'bg-amber-50/70',
      textColor: 'text-amber-900',
      borderColor: 'border-amber-200',
      pillBg: 'bg-amber-100 text-amber-900 border-amber-300',
      desc: 'Siswa belum terdata memindai kartu presensi di gerbang sekolah pagi ini.',
    };
  } else if (morningRecord.status === 'Hadir') {
    statusInfo = {
      emoji: '🟢',
      label: 'HADIR',
      bgColor: 'bg-emerald-50/70',
      textColor: 'text-emerald-900',
      borderColor: 'border-emerald-200',
      pillBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      desc: 'Siswa hadir tepat waktu mengikuti kegiatan pembelajaran sekolah.',
    };
  } else if (morningRecord.status === 'Terlambat') {
    statusInfo = {
      emoji: '🟢',
      label: 'HADIR (TERLAMBAT)',
      bgColor: 'bg-emerald-50/70',
      textColor: 'text-emerald-900',
      borderColor: 'border-emerald-200',
      pillBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      desc: morningRecord.catatan || 'Siswa hadir dan telah bergabung dalam kelas.',
    };
  } else if (morningRecord.status === 'Izin') {
    statusInfo = {
      emoji: '🔵',
      label: 'IZIN',
      bgColor: 'bg-blue-50/70',
      textColor: 'text-blue-900',
      borderColor: 'border-blue-200',
      pillBg: 'bg-blue-100 text-blue-900 border-blue-300',
      desc: morningRecord.catatan || 'Orang tua telah mengonfirmasi izin belajar anak.',
    };
  } else if (morningRecord.status === 'Sakit') {
    statusInfo = {
      emoji: '🟣',
      label: 'SAKIT',
      bgColor: 'bg-purple-50/70',
      textColor: 'text-purple-900',
      borderColor: 'border-purple-200',
      pillBg: 'bg-purple-100 text-purple-900 border-purple-300',
      desc: morningRecord.catatan || 'Siswa berhalangan hadir dikarenakan kondisi sakit.',
    };
  } else {
    statusInfo = {
      emoji: '🔴',
      label: 'ALPA',
      bgColor: 'bg-rose-50/70',
      textColor: 'text-rose-900',
      borderColor: 'border-rose-200',
      pillBg: 'bg-rose-100 text-rose-900 border-rose-300',
      desc: 'Tidak ada konfirmasi kehadiran dari orang tua/wali siswa.',
    };
  }

  const masukWib = morningRecord?.waktu ? `${morningRecord.waktu} WIB` : '-';
  const pulangWib = afternoonRecord?.waktu ? `${afternoonRecord.waktu} WIB` : '-';

  return (
    <div className={`rounded-3xl p-5 sm:p-6 border transition-all ${statusInfo.bgColor} ${statusInfo.borderColor} shadow-xs space-y-4`}>
      {/* Header Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Status Kehadiran Hari Ini
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Tanggal: {todayStr}
            </p>
          </div>
        </div>

        {/* Primary Status Badge with exact required Emoji & Color */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black border shadow-2xs ${statusInfo.pillBg}`}>
          <span className="text-sm">{statusInfo.emoji}</span>
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Cards: Masuk & Pulang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Waktu Masuk */}
        <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
              <LogIn className="w-4 h-4 text-emerald-600" />
              <span>Masuk:</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Batas Tepat Waktu: {schoolConfig.jadwal?.pagiBatasTepatWaktu || '07:15'} WIB
            </span>
          </div>

          <div className="pt-1 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {masukWib}
            </div>
            {morningRecord && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                morningRecord.status === 'Hadir' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : morningRecord.status === 'Terlambat'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {morningRecord.status}
              </span>
            )}
          </div>
        </div>

        {/* Waktu Pulang */}
        <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-indigo-600" />
              <span>Pulang:</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Jadwal Kepulangan: {schoolConfig.jadwal?.siangMulai || '12:00'} - {schoolConfig.jadwal?.siangBatasAkhir || '15:30'} WIB
            </span>
          </div>

          <div className="pt-1 flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {pulangWib}
            </div>
            {afternoonRecord && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                Tercatat
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed font-medium">
        {statusInfo.desc}
      </p>
    </div>
  );
};
