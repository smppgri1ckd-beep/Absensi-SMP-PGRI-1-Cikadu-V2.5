import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import {
  QrCode,
  CheckCircle2,
  Clock,
  AlertCircle,
  Volume2,
  RefreshCw,
  Search,
  User,
  ArrowRight
} from 'lucide-react';
import { DB } from '../services/db';
import { Student, AttendanceRecord } from '../types';
import { playSuccessBeep, playWarningBeep } from '../utils/audio';
import { useToast } from '../context/ToastContext';

export const KioskScanner: React.FC = () => {
  const { showToast } = useToast();
  const [manualNisn, setManualNisn] = useState('');
  const [lastScanned, setLastScanned] = useState<{
    student: Student;
    record: AttendanceRecord;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize html5-qrcode
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    try {
      scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleProcessCode(decodedText, 'qr');
        },
        (_error) => {
          // ignore frames without QR
        }
      );
      scannerRef.current = scanner;
    } catch (err) {
      console.warn('Camera scanner initialization error', err);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          // cleanup
        }
      }
    };
  }, []);

  const handleProcessCode = (code: string, method: 'qr' | 'manual') => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const students = DB.getStudents();
    const student = students.find((s) => s.nisn === cleanCode || s.id === cleanCode);

    if (!student) {
      playWarningBeep();
      showToast(`Siswa dengan kode ${cleanCode} tidak ditemukan!`, 'error');
      return;
    }

    // Determine status (Threshold: 07.00 WIB)
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 7 || (hours === 7 && minutes > 0);
    const status = isLate ? 'terlambat' : 'hadir';

    const record = DB.recordAttendance({
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      className: student.className,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      status,
      method,
      notes: isLate ? 'Tiba setelah jam 07.00 WIB' : 'Tepat Waktu'
    });

    playSuccessBeep();
    setLastScanned({ student, record });
    showToast(`Presensi berhasil: ${student.name} (${status.toUpperCase()})`, 'success');
    setManualNisn('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(manualNisn, 'manual');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight">
              Kiosk Presensi Mandiri (Apel & Masuk Pagi)
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Arahkan kartu QR siswa ke kamera atau masukkan NISN untuk presensi otomatis
          </p>
        </div>

        {/* Live Clock Display */}
        <div className="bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-center">
          <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-blue-400">
            {currentTime.toLocaleTimeString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Batas Tepat Waktu: 07.00 WIB
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Scanner Column */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                Kamera Pemindai QR
              </span>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                Suara Aktif
              </span>
            </div>

            {/* html5-qrcode element */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black min-h-[260px] flex items-center justify-center">
              <div id="reader" className="w-full" />
            </div>

            {/* Manual NISN Fallback Input */}
            <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ketik NISN atau scan barcode..."
                  value={manualNisn}
                  onChange={(e) => setManualNisn(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!manualNisn.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center gap-1"
              >
                <span>Catat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Scan Result Column */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                Hasil Pemindaian Terakhir
              </h2>

              {lastScanned ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center shrink-0 border border-blue-200">
                      {lastScanned.student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {lastScanned.student.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        NISN: {lastScanned.student.nisn}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                        Kelas {lastScanned.student.className}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Status Masuk</p>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          lastScanned.record.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {lastScanned.record.status === 'hadir' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {lastScanned.record.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Waktu Tercatat</p>
                      <p className="text-xs font-bold font-mono text-slate-800">
                        {lastScanned.record.time} WIB
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400">
                  <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Belum ada pemindaian.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Silakan letakkan kartu QR di depan kamera.
                  </p>
                </div>
              )}
            </div>

            {/* Instruction Tip */}
            <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-[11px] leading-relaxed">
              <span className="font-bold">Tips Guru Piket:</span> Pastikan pencahayaan cukup dan kartu dipegang stabil sekitar 15-20 cm dari lensa kamera.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
