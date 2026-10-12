import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  Download, 
  Copy, 
  Sparkles, 
  Zap, 
  UserCheck, 
  Clock, 
  Calendar,
  Sun,
  Moon,
  QrCode
} from 'lucide-react';
import { generateQrDataUrl } from '../utils/qr';
import { SchoolConfig, AttendanceRecord, TeacherAttendanceRecord } from '../types';
import { soundService } from '../utils/audio';
import { SchoolLogo } from '../assets/schoolLogo';

export interface EnlargedQrPerson {
  id: string;
  nama: string;
  nipOrNisn: string;
  roleOrKelas: string;
  fotoUrl?: string;
  mapel?: string;
}

interface EnlargedQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: EnlargedQrPerson | null;
  category: 'GURU' | 'SISWA';
  schoolConfig: SchoolConfig;
  attendanceRecords?: AttendanceRecord[];
  teacherAttendanceRecords?: TeacherAttendanceRecord[];
}

export const EnlargedQrCodeModal: React.FC<EnlargedQrCodeModalProps> = ({
  isOpen,
  onClose,
  person,
  category,
  schoolConfig,
  attendanceRecords = [],
  teacherAttendanceRecords = [],
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Realtime notification state when scanned
  const [scanNotification, setScanNotification] = useState<{
    status: string;
    sesi: string;
    waktu: string;
    tanggal: string;
    catatan?: string;
  } | null>(null);

  const prevRecordCountRef = useRef<number>(0);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Generate high resolution QR Data URL whenever person changes
  useEffect(() => {
    if (!person || !isOpen) {
      setQrDataUrl('');
      setScanNotification(null);
      return;
    }

    const codeValue = person.nipOrNisn && person.nipOrNisn !== '-' 
      ? person.nipOrNisn 
      : person.id;

    generateQrDataUrl(codeValue, 450).then((url) => {
      setQrDataUrl(url);
    });
  }, [person, isOpen]);

  // Real-time listener for today's attendance scan
  useEffect(() => {
    if (!isOpen || !person) return;

    const todayStr = new Date().toISOString().split('T')[0];

    if (category === 'SISWA') {
      const match = attendanceRecords.find(
        (r) => (r.nisn === person.nipOrNisn || r.nisn === person.id) && r.tanggal === todayStr
      );
      if (match) {
        setScanNotification({
          status: match.status,
          sesi: match.sesi,
          waktu: match.waktu,
          tanggal: match.tanggal,
          catatan: match.catatan,
        });
      }
    } else {
      const match = teacherAttendanceRecords.find(
        (r) => (r.teacherId === person.id || r.nip === person.nipOrNisn) && r.tanggal === todayStr
      );
      if (match) {
        setScanNotification({
          status: match.status,
          sesi: match.sesi,
          waktu: match.waktu,
          tanggal: match.tanggal,
          catatan: match.catatan,
        });
      }
    }
  }, [isOpen, person, category, attendanceRecords, teacherAttendanceRecords]);

  // Trigger sound effect when scanNotification first appears
  useEffect(() => {
    if (scanNotification) {
      soundService.playSuccess();
    }
  }, [scanNotification?.waktu]);

  if (!isOpen || !person) return null;

  const codeValue = person.nipOrNisn && person.nipOrNisn !== '-' 
    ? person.nipOrNisn 
    : person.id;

  const toggleModalFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        setIsFullscreen(!isFullscreen);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${category}_${person.nama.replace(/\s+/g, '_')}_${codeValue}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        ref={modalContainerRef}
        className={`relative w-full ${
          isFullscreen 
            ? 'max-w-none h-screen rounded-none p-6 sm:p-10 flex flex-col justify-between' 
            : 'max-w-lg rounded-3xl p-5 sm:p-8'
        } bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 text-white shadow-2xl transition-all duration-300 my-auto`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-3">
            <SchoolLogo src={schoolConfig?.logoUrl} className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 p-1 rounded-2xl border border-white/20" />
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black tracking-wider uppercase ${
                  category === 'GURU' 
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {category === 'GURU' ? 'KARTU GURU & TENDIK' : 'KARTU PRESENSI SISWA'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-200 mt-0.5">
                {schoolConfig.namaSekolah}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleModalFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              title="Tutup Modal"
              className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realtime Attendance Scan Notification Banner */}
        {scanNotification && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-950/40 border border-emerald-400/30 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
            <div className="flex items-start gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 animate-pulse">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full text-white">
                    PRESENSI TERVERIFIKASI
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-100 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {scanNotification.waktu}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white mt-1">
                  STATUS: {scanNotification.status.toUpperCase()} ({scanNotification.sesi})
                </h4>
                <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                  {scanNotification.catatan || `Presensi ${scanNotification.sesi} berhasil dicatat di sistem.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main QR Display Section */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 my-auto py-2">
          
          {/* User Profile Summary */}
          <div className="flex items-center gap-3 bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/60 w-full max-w-md">
            {person.fotoUrl ? (
              <img 
                src={person.fotoUrl} 
                alt={person.nama} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-400/50 shadow-md shrink-0" 
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0 border-2 border-blue-400/30">
                {person.nama.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-left flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate leading-snug">
                {person.nama}
              </h2>
              <div className="text-xs text-blue-300 font-mono font-semibold mt-0.5">
                {category === 'GURU' ? 'NUPTK / ID:' : 'NISN:'} {codeValue}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {person.roleOrKelas} {person.mapel ? `• ${person.mapel}` : ''}
              </div>
            </div>
          </div>

          {/* Enormous QR Code Container */}
          <div className="p-4 sm:p-6 bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border-4 border-slate-700 max-w-xs sm:max-w-sm w-full flex flex-col items-center justify-center relative group">
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt={`QR Code ${person.nama}`} 
                className="w-full h-auto aspect-square object-contain drop-shadow-sm select-none"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400 text-xs">
                <QrCode className="w-12 h-12 animate-pulse text-slate-300" />
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-slate-100 w-full text-center">
              <span className="text-[11px] font-mono font-bold text-slate-800 tracking-wider">
                {codeValue}
              </span>
            </div>
          </div>

          {/* Instruction Note */}
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-blue-950/60 px-4 py-2 rounded-2xl border border-blue-800/50 max-w-md">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs text-blue-100 font-medium">
              Arahkan Kode QR ini tepat ke kamera scanner kiosk gerbang untuk absensi.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 text-slate-400" />
              {copied ? 'Tersalin!' : 'Salin Kode'}
            </button>
            <button
              onClick={handleDownloadQr}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Unduh Gambar QR
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer ml-auto"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
