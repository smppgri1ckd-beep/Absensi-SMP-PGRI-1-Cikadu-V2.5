import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  Search, 
  Sparkles, 
  Flame, 
  Maximize2, 
  Minimize2, 
  RotateCw,
  Zap,
  CalendarDays,
  UploadCloud,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  Info,
  FileText
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  SchoolConfig, 
  AttendanceSession, 
  AttendanceStatus,
  JadwalPiketHarian,
  DayOfWeek
} from '../types';
import { soundService } from '../utils/audio';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../assets/schoolLogo';

interface KioskScannerProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onAddRecord: (record: AttendanceRecord) => Promise<void>;
  schoolConfig: SchoolConfig;
  currentSession: AttendanceSession;
  onOpenLogin?: () => void;
  onOpenLeaveRequest?: () => void;
  setActiveTab?: (tab: string) => void;
  jadwalPiket?: JadwalPiketHarian[];
}

interface CameraErrorInfo {
  type: 'permission_denied' | 'not_found' | 'in_use' | 'insecure_context' | 'unknown';
  title: string;
  message: string;
  suggestion: string;
}

export const KioskScanner: React.FC<KioskScannerProps> = ({
  students,
  attendanceRecords,
  onAddRecord,
  schoolConfig,
  currentSession,
  onOpenLogin,
  onOpenLeaveRequest,
  setActiveTab,
  jadwalPiket = [],
}) => {
  const { user } = useAuth();

  // Dynamic duty officer based on logged in user or today's scheduled guru piket
  const dutyOfficerDisplay = React.useMemo(() => {
    if (user) {
      return `${user.nama} (${user.role === 'admin' ? 'Admin' : user.role === 'guru' ? 'Guru' : 'Piket'})`;
    }
    const dayMap: Record<number, DayOfWeek> = {
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu',
    };
    const day = dayMap[new Date().getDay()];
    if (day && jadwalPiket && jadwalPiket.length > 0) {
      const dayData = jadwalPiket.find((j) => j.hari === day);
      if (dayData && dayData.petugas && dayData.petugas.length > 0) {
        return dayData.petugas.map((p) => p.nama).join(' & ');
      }
    }
    return schoolConfig.namaPetugasPiket || 'Petugas Piket SMP PGRI';
  }, [user, jadwalPiket, schoolConfig]);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState<boolean>(true);
  const [showTroubleshoot, setShowTroubleshoot] = useState<boolean>(false);
  const [manualNisn, setManualNisn] = useState<string>('');
  const [lastScannedResult, setLastScannedResult] = useState<{
    student: Student;
    record: AttendanceRecord;
    isDuplicate?: boolean;
  } | null>(null);
  const [bannerAlert, setBannerAlert] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transitionLockRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Safe helper to stop and clear scanner without throwing transition errors
  const safeStopScanner = async (scanner: Html5Qrcode | null): Promise<void> => {
    if (!scanner) return;
    try {
      const state = scanner.getState();
      // State 2 = SCANNING, 3 = PAUSED
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch {
      // Quietly ignore any transition error
    }
    try {
      scanner.clear();
    } catch {
      // Quietly ignore clear error
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Digital live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Indonesian Date & Time
  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Calculate today's stats for current session (Presensi Apel Gerbang Pagi & Siang)
  const todayStr = currentTime.toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(
    (r) => r.tanggal === todayStr && r.sesi === currentSession && (r.kategori === 'APEL' || !r.kategori)
  );
  const countHadir = todayRecords.filter((r) => r.status === 'Hadir').length;
  const countTerlambat = todayRecords.filter((r) => r.status === 'Terlambat').length;
  const totalScanned = todayRecords.length;

  // Initialize and inspect camera hardware safely
  const initCamera = async () => {
    setIsInitializingCamera(true);
    setCameraError(null);

    // 1. Check secure context (HTTPS / localhost required by browser security policies)
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setCameraError({
        type: 'insecure_context',
        title: 'Konteks Browser Belum Aman (Perlu HTTPS)',
        message: 'Browser memblokir akses perangkat kamera jika website dibuka melalui protokol non-HTTPS.',
        suggestion: 'Pastikan tautan website diakses via https:// bukan http://',
      });
      setIsInitializingCamera(false);
      return;
    }

    // 2. Check mediaDevices support
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError({
        type: 'not_found',
        title: 'Browser Tidak Mendukung Kamera',
        message: 'Browser ini tidak menyediakan API kamera (MediaDevices).',
        suggestion: 'Gunakan browser modern seperti Google Chrome, Microsoft Edge, atau Safari, atau gunakan Barcode Scanner USB / input NISN.',
      });
      setIsInitializingCamera(false);
      return;
    }

    try {
      // 3. Gentle probe stream to trigger browser permission request without failing on laptops/PCs
      let probeStream: MediaStream | null = null;
      try {
        probeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch {
        // Fallback to basic video: true (essential for PCs/laptops with only front/webcam)
        probeStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (probeStream) {
        probeStream.getTracks().forEach((track) => track.stop());
      }

      // 4. Query cameras from Html5Qrcode
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCam = devices.find(
          (d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
        );
        setSelectedCameraId(backCam ? backCam.id : devices[0].id);
      } else {
        setSelectedCameraId('environment-default');
      }
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera request error:', err);
      const errName = err?.name || '';
      const errMsg = String(err?.message || '');

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError({
          type: 'permission_denied',
          title: 'Izin Akses Kamera Ditolak / Diblokir',
          message: 'Browser tidak memiliki izin untuk mengaktifkan kamera gerbang sekolah.',
          suggestion: 'Klik ikon gembok 🔒 atau kamera 📷 pada bilah alamat (address bar) browser, aktifkan Kamera ke "Izinkan / Allow", lalu klik tombol Coba Lagi di bawah.',
        });
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError({
          type: 'not_found',
          title: 'Kamera / Webcam Tidak Ditemukan',
          message: 'Tidak ada perangkat kamera fisik yang terhubung ke komputer/HP ini.',
          suggestion: 'Pasang webcam USB atau gunakan Barcode Scanner genggam / ketik NISN manual.',
        });
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError({
          type: 'in_use',
          title: 'Kamera Sedang Dipakai Aplikasi Lain',
          message: 'Kamera tidak dapat diakses karena sedang dibuka oleh tab browser lain atau aplikasi meeting (Zoom/Meet).',
          suggestion: 'Tutup aplikasi lain yang sedang memakai webcam, lalu klik tombol Coba Lagi di bawah.',
        });
      } else {
        setCameraError({
          type: 'unknown',
          title: 'Kamera Belum Dapat Dimulai',
          message: errMsg || 'Kendala saat menghubungkan ke perangkat video kamera.',
          suggestion: 'Klik Coba Lagi, gunakan mode tab baru, atau gunakan scanner barcode USB / input NISN manual.',
        });
      }
    } finally {
      setIsInitializingCamera(false);
    }
  };

  useEffect(() => {
    initCamera();
  }, []);

  const stopCamera = async () => {
    setIsCameraEnabled(false);
    setIsScanning(false);
    
    // Wait for any in-flight transition to settle
    if (transitionLockRef.current) {
      try {
        await transitionLockRef.current;
      } catch {
        // ignore
      }
    }

    if (scannerRef.current) {
      const instance = scannerRef.current;
      scannerRef.current = null;
      await safeStopScanner(instance);
    }
  };

  const startCamera = () => {
    setIsCameraEnabled(true);
    setCameraError(null);
    if (!selectedCameraId) {
      initCamera();
    }
  };

  // Start scanner when camera is selected, enabled, and not in error state
  useEffect(() => {
    if (!isCameraEnabled || !selectedCameraId || cameraError) {
      return;
    }

    let isEffectCancelled = false;

    const runScanner = async () => {
      // 1. Wait for any in-flight transition to finish
      if (transitionLockRef.current) {
        try {
          await transitionLockRef.current;
        } catch {
          // ignore
        }
      }

      if (isEffectCancelled || !isMountedRef.current || !isCameraEnabled) return;

      // 2. Safely stop any previous scanner before creating a new one
      if (scannerRef.current) {
        const prev = scannerRef.current;
        scannerRef.current = null;
        await safeStopScanner(prev);
      }

      if (isEffectCancelled || !isMountedRef.current || !isCameraEnabled) return;

      const qrBoxId = 'qr-reader-kiosk';
      const containerEl = document.getElementById(qrBoxId);
      if (!containerEl) return;

      const transitionPromise = (async () => {
        let activeScanner: Html5Qrcode | null = null;
        try {
          activeScanner = new Html5Qrcode(qrBoxId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
            ],
            verbose: false,
          });

          scannerRef.current = activeScanner;

          const config = {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight);
              const boxSize = Math.max(180, Math.floor(edge * 0.72));
              return { width: boxSize, height: boxSize };
            },
            aspectRatio: 1.0,
          };

          const cameraParam = selectedCameraId === 'environment-default' 
            ? { facingMode: { ideal: 'environment' } } 
            : selectedCameraId;

          let started = false;
          try {
            await activeScanner.start(
              cameraParam,
              config,
              (decodedText) => {
                handleProcessCode(decodedText);
              },
              () => {}
            );
            started = true;
          } catch (firstErr) {
            console.warn('Initial camera start failed, trying fresh instance fallback:', firstErr);
            // Safely clean up previous instance
            await safeStopScanner(activeScanner);
            activeScanner = null;
            scannerRef.current = null;

            if (isEffectCancelled || !isMountedRef.current) return;

            // Create a FRESH instance for fallback
            const fallbackScanner = new Html5Qrcode(qrBoxId, {
              formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
              ],
              verbose: false,
            });
            scannerRef.current = fallbackScanner;
            activeScanner = fallbackScanner;

            await fallbackScanner.start(
              { facingMode: 'user' },
              config,
              (decodedText) => {
                handleProcessCode(decodedText);
              },
              () => {}
            );
            started = true;
          }

          if (isEffectCancelled || !isMountedRef.current) {
            await safeStopScanner(activeScanner);
            if (scannerRef.current === activeScanner) {
              scannerRef.current = null;
            }
            return;
          }

          if (started) {
            setIsScanning(true);
            setCameraError(null);
          }
        } catch (err: any) {
          if (isEffectCancelled || !isMountedRef.current) return;
          console.error('Failed to start scanner:', err);
          setIsScanning(false);
          if (activeScanner) {
            await safeStopScanner(activeScanner);
            if (scannerRef.current === activeScanner) {
              scannerRef.current = null;
            }
          }
          setCameraError({
            type: 'unknown',
            title: 'Gagal Membuka Aliran Video',
            message: err?.message || 'Kamera tidak dapat dimulai pada konfigurasi yang diminta.',
            suggestion: 'Coba pilih kamera lain dari menu dropdown atau gunakan scanner barcode USB / input NISN manual.',
          });
        }
      })();

      transitionLockRef.current = transitionPromise;
      await transitionPromise;
      if (transitionLockRef.current === transitionPromise) {
        transitionLockRef.current = null;
      }
    };

    runScanner();

    return () => {
      isEffectCancelled = true;
      (async () => {
        if (transitionLockRef.current) {
          try {
            await transitionLockRef.current;
          } catch {
            // ignore
          }
        }
        if (scannerRef.current) {
          const toStop = scannerRef.current;
          scannerRef.current = null;
          await safeStopScanner(toStop);
        }
      })();
    };
  }, [selectedCameraId, isCameraEnabled]);

  // Main barcode / QR handling logic
  const handleProcessCode = async (rawText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      let nisnClean = rawText.trim();
      // Handle JSON payload if student card encoded JSON
      if (nisnClean.startsWith('{') && nisnClean.endsWith('}')) {
        try {
          const parsed = JSON.parse(nisnClean);
          if (parsed.nisn) nisnClean = String(parsed.nisn).trim();
        } catch {
          // fallback to raw
        }
      }

      // Search student by NISN or name
      const student = students.find(
        (s) => s.nisn === nisnClean || s.nisn === nisnClean.padStart(10, '0')
      );

      if (!student) {
        soundService.playError();
        setBannerAlert({
          type: 'error',
          message: `QR / NISN "${nisnClean}" tidak terdaftar dalam basis data siswa!`,
        });
        setTimeout(() => setBannerAlert(null), 3500);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const recordId = `PRESENSI_APEL_${student.nisn}_${today}_${currentSession}`;

      // Check if already scanned today in the same session for Apel
      const existing = attendanceRecords.find(
        (r) => (r.id === recordId || r.id === `PRESENSI_${student.nisn}_${today}_${currentSession}` || (r.nisn === student.nisn && r.tanggal === today && r.sesi === currentSession)) &&
               (r.kategori === 'APEL' || (!r.kategori && !r.id.startsWith('PRESENSI_KBM_') && !r.mapel))
      );
      if (existing) {
        soundService.playAlreadyChecked();
        setLastScannedResult({
          student,
          record: existing,
          isDuplicate: true,
        });
        setBannerAlert({
          type: 'warning',
          message: `${student.nama} (${student.kelas}) sudah presensi Apel Sesi ${currentSession} pada ${existing.waktu}!`,
        });
        setTimeout(() => setBannerAlert(null), 4000);
        return;
      }

      // Determine Hadir vs Terlambat
      // Determine Hadir vs Terlambat with Friday and Tolerance Settings
      const now = new Date();
      const isFriday = now.getDay() === 5;
      const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss
      const currentHhMm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const thresholdTime = currentSession === 'Pagi' 
        ? (schoolConfig?.jadwal?.pagiBatasTepatWaktu || '07:15') 
        : (isFriday && schoolConfig?.jadwal?.jumatSesiKhusus && schoolConfig?.jadwal?.jumatSiangBatasTepatWaktu
            ? schoolConfig.jadwal.jumatSiangBatasTepatWaktu
            : (schoolConfig?.jadwal?.siangBatasTepatWaktu || '13:30'));

      const toleransiMenit = Number(schoolConfig?.jadwal?.toleransiMenit) || 0;
      const [thH, thM] = thresholdTime.split(':').map(Number);
      const thresholdMins = thH * 60 + thM;
      const [curH, curM] = currentHhMm.split(':').map(Number);
      const currentMins = curH * 60 + curM;
      const effectiveLimitMins = thresholdMins + toleransiMenit;

      let status: AttendanceStatus = 'Hadir';
      let catatan: string | undefined = undefined;

      if (currentMins > effectiveLimitMins) {
        status = 'Terlambat';
        soundService.playLate();
        const menitTelat = currentMins - thresholdMins;
        catatan = `Terlambat ${menitTelat} mnt (Presensi: ${currentHhMm}, Batas: ${thresholdTime}${toleransiMenit > 0 ? ` + Toleransi ${toleransiMenit}m` : ''})`;
      } else if (currentMins > thresholdMins) {
        status = 'Hadir';
        soundService.playSuccess();
        catatan = `Hadir pukul ${currentHhMm} (Dalam toleransi keterlambatan ${toleransiMenit} mnt)`;
      } else {
        status = 'Hadir';
        soundService.playSuccess();
      }

      const newRecord: AttendanceRecord = {
        id: recordId,
        tanggal: today,
        waktu: timeStr,
        nisn: student.nisn,
        nama: student.nama,
        kelas: student.kelas,
        sesi: currentSession,
        status,
        kategori: 'APEL',
        catatan,
      };

      await onAddRecord(newRecord);

      setLastScannedResult({
        student,
        record: newRecord,
        isDuplicate: false,
      });

      setBannerAlert({
        type: 'success',
        message: `Presensi Berhasil! Selamat datang, ${student.nama} (${student.kelas})`,
      });

      // Clear alert after delay
      setTimeout(() => {
        setBannerAlert(null);
      }, 4000);

    } finally {
      // Cooldown to prevent double scanning frame burst
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNisn.trim()) return;
    handleProcessCode(manualNisn);
    setManualNisn('');
    manualInputRef.current?.focus();
  };

  // Scan QR from image file upload safely on isolated runner without interfering with camera stream
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let fileScanner: Html5Qrcode | null = null;
    try {
      fileScanner = new Html5Qrcode('qr-file-runner', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });

      const decodedText = await fileScanner.scanFile(file, true);
      if (decodedText) {
        handleProcessCode(decodedText);
      }
    } catch {
      soundService.playError();
      setBannerAlert({
        type: 'error',
        message: 'Tidak ditemukan QR Code / Barcode yang dapat dibaca pada file gambar tersebut.',
      });
      setTimeout(() => setBannerAlert(null), 3500);
    } finally {
      if (fileScanner) {
        try {
          fileScanner.clear();
        } catch {
          // ignore
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const openInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Session Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <SchoolLogo src={schoolConfig?.logoUrl} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white/15 p-2 rounded-3xl border border-white/25 drop-shadow-lg shadow-inner" />
            <div>
              <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/20 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  PEMINDAI KARTU AKTIF
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  currentSession === 'Pagi' ? 'bg-amber-400 text-amber-950' : 'bg-sky-300 text-sky-950'
                }`}>
                  SESI {currentSession.toUpperCase()}
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Pindai Kartu Presensi Siswa
              </h1>
              <p className="text-blue-100 text-sm mt-1 max-w-xl">
                {schoolConfig.namaSekolah} • Arahkan QR Code kartu siswa ke kamera, atau masukkan nomor NISN.
              </p>

            {/* Duty Officer Status Strip */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-blue-200 font-semibold">Petugas Bertugas:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 backdrop-blur-xs font-bold text-white border border-white/20">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>{dutyOfficerDisplay}</span>
              </span>
              {onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[11px] transition-colors cursor-pointer shadow-xs"
                >
                  Ganti Petugas
                </button>
              )}
            </div>
          </div>
        </div>

          {/* Big Live Clock Display */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 flex flex-col items-center md:items-end justify-center shrink-0">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
              {formattedTime}
            </div>
            <div className="text-[11px] text-blue-200 mt-1 font-medium">
              Batas Tepat Waktu: <strong className="text-white">{currentSession === 'Pagi' ? (schoolConfig?.jadwal?.pagiBatasTepatWaktu || '07:15') : (schoolConfig?.jadwal?.siangBatasTepatWaktu || '13:30')}</strong>
            </div>
          </div>
        </div>

        {/* Counter Stats in Header */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
            <span className="text-xs text-blue-200 font-medium block">Total Presensi Sesi Ini</span>
            <span className="text-2xl sm:text-3xl font-black text-white">{totalScanned}</span>
          </div>
          <div className="bg-emerald-500/20 rounded-xl p-3 text-center border border-emerald-400/30">
            <span className="text-xs text-emerald-200 font-medium block">Hadir Tepat Waktu</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-300">{countHadir}</span>
          </div>
          <div className="bg-amber-500/20 rounded-xl p-3 text-center border border-amber-400/30">
            <span className="text-xs text-amber-200 font-medium block">Terlambat</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-300">{countTerlambat}</span>
          </div>
        </div>
      </div>

      {/* Quick Access Card for Parents & Public (Mudah Dilihat & Diakses di Tampilan Publik) */}
      {!user && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-white rounded-3xl p-5 sm:p-6 border border-amber-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                  Layanan Orang Tua / Wali Siswa
                </span>
                <span className="text-xs text-amber-800 font-bold hidden sm:inline">• Akses Mandiri Tanpa Login</span>
              </div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg mt-1">
                Pengajuan Surat Izin / Sakit Mandiri & Pantau Anak
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                Bagi orang tua / wali siswa yang putra-putrinya berhalangan hadir atau sakit hari ini, silakan ajukan surat izin/sakit langsung secara online.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 pt-2 md:pt-0">
            {onOpenLeaveRequest && (
              <button
                type="button"
                onClick={onOpenLeaveRequest}
                className="flex-1 md:flex-initial px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan Izin / Sakit Mandiri</span>
              </button>
            )}
            {setActiveTab && (
              <button
                type="button"
                onClick={() => setActiveTab('pantau-anak')}
                className="flex-1 md:flex-initial px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-slate-300"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Portal Pantau Anak</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Feedback Toast / Alert Banner */}
      {bannerAlert && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
          bannerAlert.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : bannerAlert.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {bannerAlert.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
          {bannerAlert.type === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />}
          {bannerAlert.type === 'error' && <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />}
          <div className="font-bold text-sm sm:text-base">{bannerAlert.message}</div>
        </div>
      )}

      {/* Main Grid: Scanner Left + Feedback & Live Feed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Camera Viewfinder */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm relative">
            
            {/* Viewfinder Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                {!isCameraEnabled ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Kamera Ditutup
                    </span>
                  </>
                ) : isInitializingCamera ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Menghubungkan Kamera...
                    </span>
                  </>
                ) : cameraError ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                      Kamera Bermasalah
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Lensa Kamera Siap
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Close / Open Camera Toggle Button */}
                <button
                  type="button"
                  onClick={isCameraEnabled ? stopCamera : startCamera}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${
                    isCameraEnabled
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={isCameraEnabled ? 'Tutup dan matikan kamera pemindai' : 'Buka dan nyalakan kamera pemindai'}
                >
                  {isCameraEnabled ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tutup Kamera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <span>Buka Kamera</span>
                    </>
                  )}
                </button>

                {/* Refresh camera */}
                {isCameraEnabled && (
                  <button
                    type="button"
                    onClick={initCamera}
                    title="Muat Ulang Kamera"
                    disabled={isInitializingCamera}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isInitializingCamera ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {/* Scan Image File Alternative */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileScan}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Pindai gambar/foto QR dari file"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Pindai Foto</span>
                </button>

                {/* Camera dropdown selector */}
                {isCameraEnabled && cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 max-w-[140px] truncate"
                  >
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Kamera ${c.id.substring(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={toggleFullscreen}
                  title="Layar Penuh Kiosk"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Camera Viewfinder Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square sm:aspect-4/3 flex items-center justify-center">
              <div id="qr-reader-kiosk" className="w-full h-full object-cover" />
              {/* Isolated container for file upload QR decoding to prevent camera state conflicts */}
              <div id="qr-file-runner" className="hidden" />

              {/* Camera Disabled / Closed Overlay */}
              {!isCameraEnabled && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-15">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center mb-3 shadow-inner">
                    <CameraOff className="w-8 h-8 text-rose-400" />
                  </div>
                  <h4 className="text-white font-extrabold text-base mb-1">
                    Kamera Sedang Ditutup
                  </h4>
                  <p className="text-slate-400 text-xs max-w-sm mb-4 leading-relaxed">
                    Lensa pemindaian dimatikan untuk menghemat daya atau menjaga privasi. Tetap dapat memindai dengan Barcode Scanner USB atau ketik NISN manual di bawah.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Buka Kamera Kembali
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                      Pindai Foto QR
                    </button>
                  </div>
                </div>
              )}

              {/* Initializing Spinner Overlay */}
              {isCameraEnabled && isInitializingCamera && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 text-white">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-200">Memeriksa izin dan perangkat kamera...</p>
                </div>
              )}

              {/* Camera Error / Permission Denied Overlay */}
              {isCameraEnabled && cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center z-20 overflow-y-auto">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 ${
                    cameraError.type === 'permission_denied' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : cameraError.type === 'not_found'
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {cameraError.type === 'not_found' ? <CameraOff className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>

                  <h4 className="text-white font-extrabold text-sm sm:text-base mb-1">
                    {cameraError.title}
                  </h4>
                  
                  <p className="text-slate-300 text-xs max-w-sm mb-2 leading-relaxed">
                    {cameraError.message}
                  </p>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 max-w-sm text-left mb-4">
                    <div className="flex items-start gap-2 text-xs text-amber-300 font-semibold mb-1">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Solusi Cepat:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-normal pl-5">
                      {cameraError.suggestion}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={initCamera}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Coba Lagi
                    </button>

                    <button
                      type="button"
                      onClick={openInNewTab}
                      title="Buka web langsung di tab browser baru"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka di Tab Baru
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Pindai Foto QR
                    </button>

                    <button
                      type="button"
                      onClick={() => manualInputRef.current?.focus()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Ketik NISN Manual
                    </button>
                  </div>

                  {/* Toggle detailed troubleshooting */}
                  <button
                    type="button"
                    onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    {showTroubleshoot ? 'Sembunyikan Panduan Izin' : 'Lihat Cara Mengaktifkan Izin Kamera di Browser'}
                  </button>

                  {showTroubleshoot && (
                    <div className="mt-3 text-left bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 max-w-sm space-y-2">
                      <div>
                        <strong className="text-white">🌐 Google Chrome & Microsoft Edge:</strong>
                        <p className="text-slate-400">1. Klik ikon gembok 🔒 atau pengaturan di kiri bilah URL.</p>
                        <p className="text-slate-400">2. Ubah Kamera / Camera menjadi "Izinkan" (Allow).</p>
                        <p className="text-slate-400">3. Muat ulang halaman (F5 / Refresh).</p>
                      </div>
                      <div>
                        <strong className="text-white">📱 Safari (iPhone / iPad):</strong>
                        <p className="text-slate-400">Buka Pengaturan HP &gt; Safari &gt; Kamera &gt; pilih "Tanya" atau "Izinkan".</p>
                      </div>
                      <div>
                        <strong className="text-white">🔌 PC Desktop Tanpa Webcam:</strong>
                        <p className="text-slate-400">Gunakan Barcode Scanner USB genggam, colokkan ke port USB, lalu tembak kartu siswa.</p>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Target Aiming Reticle Overlay */}
              {!cameraError && !isInitializingCamera && isCameraEnabled && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-dashed border-blue-400/70 rounded-3xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-xl -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-xl -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-xl -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-xl -mb-1 -mr-1" />
                    
                    {/* Laser line animation */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-lg shadow-sky-400" />
                  </div>
                </div>
              )}

              {/* Bottom Target Hint */}
              {!cameraError && !isInitializingCamera && isCameraEnabled && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[11px] font-semibold text-slate-300 border border-slate-700">
                    Posisikan QR Kartu Siswa di dalam kotak
                  </span>
                </div>
              )}
            </div>

            {/* Manual NISN / Barcode Input Bar */}
            <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={manualInputRef}
                  type="text"
                  placeholder="Ketik NISN siswa atau scan barcode scanner USB..."
                  value={manualNisn}
                  onChange={(e) => setManualNisn(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono placeholder:font-sans focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors shrink-0"
              >
                Proses
              </button>
            </form>

          </div>
        </div>

        {/* Right Column: Scan Result Card & Recent Feed */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Student Popup Card */}
          {lastScannedResult ? (
            <div className={`rounded-3xl p-6 border shadow-lg transition-all animate-in zoom-in-95 duration-300 ${
              lastScannedResult.isDuplicate
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : lastScannedResult.record.status === 'Terlambat'
                ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            }`}>
              
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {/* Student Profile Photo Preview */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0 bg-slate-200">
                    {lastScannedResult.student.fotoUrl ? (
                      <img
                        src={lastScannedResult.student.fotoUrl}
                        alt={lastScannedResult.student.nama}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex flex-col items-center justify-center font-black ${
                      lastScannedResult.student.jk === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <span className="text-xl sm:text-2xl">{lastScannedResult.student.nama.substring(0, 2).toUpperCase()}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider">{lastScannedResult.student.jk === 'P' ? 'Siswi' : 'Siswa'}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                      {lastScannedResult.student.nama}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      NISN: <span className="font-mono text-slate-700">{lastScannedResult.student.nisn}</span> • Kelas <span className="text-blue-600 font-extrabold">{lastScannedResult.student.kelas}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Jenis Kelamin: <strong className="text-slate-600">{lastScannedResult.student.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}</strong>
                    </p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                  lastScannedResult.isDuplicate
                    ? 'bg-amber-200 text-amber-900'
                    : lastScannedResult.record.status === 'Terlambat'
                    ? 'bg-orange-200 text-orange-900'
                    : 'bg-emerald-200 text-emerald-900'
                }`}>
                  {lastScannedResult.isDuplicate ? 'DUPLIKAT' : lastScannedResult.record.status.toUpperCase()}
                </span>
              </div>

              {/* Status details */}
              <div className="mt-5 p-3.5 bg-white/80 rounded-2xl border border-black/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Waktu Pindai:</span>
                  <span className="font-bold font-mono text-slate-900">{lastScannedResult.record.waktu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Sesi Kehadiran:</span>
                  <span className="font-bold text-slate-900">Sesi {lastScannedResult.record.sesi}</span>
                </div>
                {lastScannedResult.record.catatan && (
                  <div className="pt-1.5 border-t border-slate-200 text-slate-600 italic">
                    {lastScannedResult.record.catatan}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">Menunggu Pemindaian</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Data siswa yang berhasil dipindai akan langsung ditampilkan di panel ini.
              </p>
            </div>
          )}

          {/* Live Recent Feed */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h4 className="font-bold text-slate-900 text-sm">Aktivitas Terkini Hari Ini</h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {todayRecords.length} Siswa Terdaftar
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-2">
              {todayRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada presensi siswa untuk sesi ini.
                </div>
              ) : (
                todayRecords.slice(0, 8).map((r) => {
                  const studentObj = students.find((s) => s.nisn === r.nisn);
                  return (
                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Student Photo Preview Thumbnail */}
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
                          {studentObj?.fotoUrl ? (
                            <img
                              src={studentObj.fotoUrl}
                              alt={r.nama}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center font-bold text-xs ${
                            studentObj?.jk === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {r.nama.substring(0, 1)}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-800 truncate">{r.nama}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Kelas {r.kelas} • {r.waktu}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                        r.status === 'Terlambat'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
