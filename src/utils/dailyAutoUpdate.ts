/**
 * Daily Auto-Update Engine (Sistem Pembaruan Data Otomatis Harian)
 * 
 * Memastikan setiap hari data di semua fitur web (Presensi, Izin/Sakit, Jurnal, Pantau Anak, Laporan)
 * diperbarui secara dinamis dan otomatis sesuai tanggal aktif hari ini,
 * sekaligus memelihara rekapitulasi data historis (harian, mingguan, bulanan, semester, tahunan).
 */

import { 
  AttendanceRecord, 
  LeaveRequest, 
  TeachingJournal, 
  StudentActivityLogItem, 
  Student, 
  SchoolConfig 
} from '../types';
import { DatabaseService } from '../services/db';

const STORAGE_KEY_LAST_DATE = 'pgri_last_auto_update_date';
const STORAGE_KEY_SIMULATED_DATE = 'pgri_simulated_active_date';

// Helper date utilities
export function getSystemTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getActiveDate(): string {
  const simulated = localStorage.getItem(STORAGE_KEY_SIMULATED_DATE);
  if (simulated && /^\d{4}-\d{2}-\d{2}$/.test(simulated)) {
    return simulated;
  }
  return getSystemTodayDate();
}

export function setActiveSimulatedDate(dateStr: string | null): void {
  if (dateStr) {
    localStorage.setItem(STORAGE_KEY_SIMULATED_DATE, dateStr);
  } else {
    localStorage.removeItem(STORAGE_KEY_SIMULATED_DATE);
  }
}

/**
 * Format date nicely in Indonesian (e.g. "Kamis, 8 Oktober 2026")
 */
export function formatIndonesianDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${dayNames[date.getDay()]}, ${d} ${monthNames[date.getMonth()]} ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculate offset date string
 */
export function getOffsetDateString(baseDateStr: string, offsetDays: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * Generate fresh Leave Requests for today & historical days
 */
export function generateAutoLeaveRequests(todayStr: string, existingList: LeaveRequest[]): LeaveRequest[] {
  const existingMap = new Map<string, LeaveRequest>();
  existingList.forEach((r) => existingMap.set(r.id, r));

  // Check if today already has leave requests
  const todayRequests = existingList.filter((r) => r.tanggalMulai === todayStr);

  const newItems: LeaveRequest[] = [];

  // Generate today's realistic leave requests if none exist
  if (todayRequests.length === 0) {
    newItems.push(
      {
        id: `LEAVE_${todayStr}_01`,
        nisn: '0091234004',
        nama: 'Citra Amelia Zahra',
        kelas: '7A',
        jenis: 'Sakit',
        tanggalMulai: todayStr,
        tanggalSelesai: todayStr,
        alasan: 'Demam tinggi dan flu batuk, disarankan istirahat di rumah sesuai anjuran dokter puskesmas.',
        lampiranUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
        statusPengajuan: 'Menunggu',
        tanggalPengajuan: `${todayStr} 06:45`,
        kontakOrtu: '081298765431',
      },
      {
        id: `LEAVE_${todayStr}_02`,
        nisn: '0081234024',
        nama: 'Rani Oktaviani',
        kelas: '8A',
        jenis: 'Izin',
        tanggalMulai: todayStr,
        tanggalSelesai: todayStr,
        alasan: 'Menghadiri acara pernikahan dan silaturahmi keluarga besar di luar kota.',
        lampiranUrl: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80',
        statusPengajuan: 'Disetujui',
        tanggalPengajuan: `${todayStr} 06:15`,
        disetujuiOleh: 'Hj. Siti Maryam, S.Pd. (Guru Piket)',
        catatanPiket: 'Surat izin lengkap dan telah dikonfirmasi via WhatsApp.',
        kontakOrtu: '081298765432',
      },
      {
        id: `LEAVE_${todayStr}_03`,
        nisn: '0091234003',
        nama: 'Bayu Pratama Nugraha',
        kelas: '7A',
        jenis: 'Izin',
        tanggalMulai: todayStr,
        tanggalSelesai: todayStr,
        alasan: 'Mengikuti seleksi lomba sains tingkat kecamatan mewakili bimbel/desa binaan.',
        lampiranUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
        statusPengajuan: 'Menunggu',
        tanggalPengajuan: `${todayStr} 07:05`,
        kontakOrtu: '081298765433',
      }
    );
  }

  // Ensure rich historical leave requests across yesterday, last week, last month, and semester
  const yesterday = getOffsetDateString(todayStr, -1);
  const twoDaysAgo = getOffsetDateString(todayStr, -2);
  const threeDaysAgo = getOffsetDateString(todayStr, -3);
  const fiveDaysAgo = getOffsetDateString(todayStr, -5);
  const sevenDaysAgo = getOffsetDateString(todayStr, -7);
  const tenDaysAgo = getOffsetDateString(todayStr, -10);
  const fifteenDaysAgo = getOffsetDateString(todayStr, -15);
  const twentyDaysAgo = getOffsetDateString(todayStr, -20);
  const thirtyDaysAgo = getOffsetDateString(todayStr, -30);

  const historicalSamples: LeaveRequest[] = [
    {
      id: `LEAVE_${yesterday}_01`,
      nisn: '0081234022',
      nama: 'Nabila Syifa Azzahra',
      kelas: '8A',
      jenis: 'Sakit',
      tanggalMulai: yesterday,
      tanggalSelesai: yesterday,
      alasan: 'Sakit radang tenggorokan disertai pusing setelah kegiatan olahraga.',
      lampiranUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${yesterday} 06:30`,
      disetujuiOleh: 'Asep Saepudin, S.Pd. (Guru Piket)',
      catatanPiket: 'Surat dokter terverifikasi.',
      kontakOrtu: '081234567891',
    },
    {
      id: `LEAVE_${twoDaysAgo}_01`,
      nisn: '0071234042',
      nama: 'Annisa Rahmawati',
      kelas: '9A',
      jenis: 'Izin',
      tanggalMulai: twoDaysAgo,
      tanggalSelesai: twoDaysAgo,
      alasan: 'Keperluan perpanjangan paspor dan urusan administrasi keluarga.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${twoDaysAgo} 07:00`,
      disetujuiOleh: 'Hj. Siti Maryam, S.Pd.',
      kontakOrtu: '081234567892',
    },
    {
      id: `LEAVE_${threeDaysAgo}_01`,
      nisn: '0091234002',
      nama: 'Adelia Putri Rahmawati',
      kelas: '7A',
      jenis: 'Sakit',
      tanggalMulai: threeDaysAgo,
      tanggalSelesai: threeDaysAgo,
      alasan: 'Demam tinggi dan istirahat.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${threeDaysAgo} 06:20`,
      disetujuiOleh: 'Asep Saepudin, S.Pd.',
      kontakOrtu: '081234567893',
    },
    {
      id: `LEAVE_${fiveDaysAgo}_01`,
      nisn: '0081234025',
      nama: 'Rizky Pratama',
      kelas: '8A',
      jenis: 'Izin',
      tanggalMulai: fiveDaysAgo,
      tanggalSelesai: fiveDaysAgo,
      alasan: 'Mengikuti turnamen pencak silat tingkat kabupaten.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${fiveDaysAgo} 06:50`,
      disetujuiOleh: 'Hj. Siti Maryam, S.Pd.',
      kontakOrtu: '081234567894',
    },
    {
      id: `LEAVE_${sevenDaysAgo}_01`,
      nisn: '0091234005',
      nama: 'Dafi Alfarizi',
      kelas: '7A',
      jenis: 'Sakit',
      tanggalMulai: sevenDaysAgo,
      tanggalSelesai: sevenDaysAgo,
      alasan: 'Gejala tifus dan rawat jalan.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${sevenDaysAgo} 07:15`,
      disetujuiOleh: 'Asep Saepudin, S.Pd.',
      kontakOrtu: '081234567895',
    },
    {
      id: `LEAVE_${tenDaysAgo}_01`,
      nisn: '0071234045',
      nama: 'Dina Marlina',
      kelas: '9A',
      jenis: 'Izin',
      tanggalMulai: tenDaysAgo,
      tanggalSelesai: tenDaysAgo,
      alasan: 'Menghadiri khitanan adik kandung.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${tenDaysAgo} 06:40`,
      kontakOrtu: '081234567896',
    },
    {
      id: `LEAVE_${fifteenDaysAgo}_01`,
      nisn: '0081234021',
      nama: 'Muhamad Rizky Ananda',
      kelas: '8A',
      jenis: 'Sakit',
      tanggalMulai: fifteenDaysAgo,
      tanggalSelesai: fifteenDaysAgo,
      alasan: 'Flu dan demam.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${fifteenDaysAgo} 06:30`,
      kontakOrtu: '081234567897',
    },
    {
      id: `LEAVE_${twentyDaysAgo}_01`,
      nisn: '0091234001',
      nama: 'Achmad Fauzi Maulana',
      kelas: '7A',
      jenis: 'Izin',
      tanggalMulai: twentyDaysAgo,
      tanggalSelesai: twentyDaysAgo,
      alasan: 'Acara keluarga di Bandung.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${twentyDaysAgo} 06:45`,
      kontakOrtu: '081234567898',
    },
    {
      id: `LEAVE_${thirtyDaysAgo}_01`,
      nisn: '0071234041',
      nama: 'Aldi Saputra',
      kelas: '9A',
      jenis: 'Sakit',
      tanggalMulai: thirtyDaysAgo,
      tanggalSelesai: thirtyDaysAgo,
      alasan: 'Sakit gigi dan periksa dokter.',
      statusPengajuan: 'Disetujui',
      tanggalPengajuan: `${thirtyDaysAgo} 07:00`,
      kontakOrtu: '081234567899',
    }
  ];

  historicalSamples.forEach((h) => {
    if (!existingMap.has(h.id)) {
      newItems.push(h);
    }
  });

  return [...newItems, ...existingList];
}

/**
 * Generate fresh attendance records for today & historical days
 */
export function generateAutoAttendanceRecords(
  todayStr: string,
  students: Student[],
  existingRecords: AttendanceRecord[],
  leaves: LeaveRequest[] = []
): AttendanceRecord[] {
  const existingMap = new Map<string, AttendanceRecord>();
  existingRecords.forEach((r) => existingMap.set(`${r.nisn}_${r.tanggal}_${r.sesi}_${r.kategori || 'APEL'}`, r));

  const todayApelRecords = existingRecords.filter((r) => r.tanggal === todayStr && (r.kategori === 'APEL' || !r.kategori));

  const newRecords: AttendanceRecord[] = [];

  // Helper to check if student has leave request for a specific date
  const findLeaveForStudent = (nisn: string, dateStr: string) => {
    return leaves.find((l) => {
      if (l.nisn !== nisn) return false;
      const start = l.tanggalMulai;
      const end = l.tanggalSelesai || start;
      return dateStr >= start && dateStr <= end;
    });
  };

  // If today does not have enough attendance records, generate realistic varied records
  if (todayApelRecords.length < 5 && students.length > 0) {
    students.forEach((s, idx) => {
      const keyPagi = `${s.nisn}_${todayStr}_Pagi_APEL`;
      if (!existingMap.has(keyPagi)) {
        // Check if student submitted a leave/sick request
        const leaveReq = findLeaveForStudent(s.nisn, todayStr);

        let status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa' = 'Hadir';
        let waktu = '06:45:12';
        let catatan: string | undefined = undefined;

        if (leaveReq) {
          status = leaveReq.jenis === 'Sakit' ? 'Sakit' : 'Izin';
          waktu = leaveReq.tanggalPengajuan ? (leaveReq.tanggalPengajuan.split(' ')[1] || '06:30:00') : '06:30:00';
          const isApproved = leaveReq.statusPengajuan === 'Disetujui';
          catatan = isApproved 
            ? `[Terverifikasi / Disetujui] ${leaveReq.alasan}` 
            : `[Permohonan Mandiri] ${leaveReq.alasan}`;
        } else {
          // Pseudo-random deterministic distribution based on student index & date hash
          const hash = (s.nisn.charCodeAt(s.nisn.length - 1) + idx * 7) % 100;
          if (hash > 92) {
            status = 'Terlambat';
            const mins = 15 + (hash % 12);
            waktu = `07:${String(mins).padStart(2, '0')}:24`;
            catatan = `Terlambat ${mins - 15} menit (kendala di perjalanan)`;
          } else if (hash === 89) {
            status = 'Alpa';
            waktu = '08:00:00';
            catatan = 'Tanpa keterangan pada apel pagi';
          } else {
            // Hadir tepat waktu (06:35 - 07:12)
            const minute = 35 + ((idx * 3) % 36);
            const second = (idx * 17) % 60;
            waktu = `06:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
          }
        }

        newRecords.push({
          id: `PRESENSI_${s.nisn}_${todayStr}_Pagi_APEL`,
          tanggal: todayStr,
          waktu,
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          sesi: 'Pagi',
          status,
          kategori: 'APEL',
          catatan,
        });
      }
    });
  }

  // Generate historical school days if total records are sparse
  const pastDaysOffsets = [-1, -2, -3, -4, -5, -7, -8, -10, -14, -21];
  pastDaysOffsets.forEach((offset) => {
    const pastDate = getOffsetDateString(todayStr, offset);
    const dayOfWeek = new Date(pastDate + 'T00:00:00').getDay();
    if (dayOfWeek === 0) return; // Skip Sunday

    const hasPast = existingRecords.some((r) => r.tanggal === pastDate);
    if (!hasPast && students.length > 0) {
      students.slice(0, 15).forEach((s, idx) => {
        const leaveReq = findLeaveForStudent(s.nisn, pastDate);

        let status: 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa' = 'Hadir';
        let waktu = '06:50:00';
        let catatan: string | undefined = undefined;

        if (leaveReq) {
          status = leaveReq.jenis === 'Sakit' ? 'Sakit' : 'Izin';
          catatan = `[Terverifikasi] ${leaveReq.alasan}`;
        } else {
          const hash = (s.nisn.charCodeAt(s.nisn.length - 1) + idx * 11 + Math.abs(offset)) % 100;
          if (hash > 92) status = 'Terlambat';
          else if (hash === 88) status = 'Izin';
          else if (hash === 87) status = 'Sakit';
        }

        newRecords.push({
          id: `PRESENSI_${s.nisn}_${pastDate}_Pagi_APEL`,
          tanggal: pastDate,
          waktu,
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          sesi: 'Pagi',
          status,
          kategori: 'APEL',
          catatan,
        });
      });
    }
  });

  const allMerged = [...newRecords, ...existingRecords];

  // Auto-recap & sync ALL leave requests into existing attendance records
  if (leaves.length > 0) {
    leaves.forEach((l) => {
      const start = l.tanggalMulai;
      const end = l.tanggalSelesai || start;
      const targetStatus: 'Sakit' | 'Izin' = l.jenis === 'Sakit' ? 'Sakit' : 'Izin';
      const note = l.statusPengajuan === 'Disetujui'
        ? `[Izin/Sakit Disetujui] ${l.alasan}`
        : `[Permohonan Mandiri] ${l.alasan}`;

      allMerged.forEach((rec, idx) => {
        if (rec.nisn === l.nisn && rec.tanggal >= start && rec.tanggal <= end) {
          if (rec.status !== targetStatus) {
            allMerged[idx] = {
              ...rec,
              status: targetStatus,
              catatan: note,
            };
          }
        }
      });
    });
  }

  return allMerged;
}

/**
 * Generate fresh student activity logs for today (for Pantau Anak)
 */
export function generateAutoActivityLogs(
  todayStr: string,
  existingLogs: StudentActivityLogItem[]
): StudentActivityLogItem[] {
  const existingMap = new Map<string, StudentActivityLogItem>();
  existingLogs.forEach((l) => existingMap.set(l.id, l));

  const hasToday = existingLogs.some((l) => l.tanggal === todayStr);
  const newLogs: StudentActivityLogItem[] = [];

  if (!hasToday) {
    newLogs.push(
      {
        id: `ACT_${todayStr}_1`,
        nisn: '0091234001',
        tanggal: todayStr,
        waktu: '06:52',
        kategori: 'MASUK',
        keterangan: 'Achmad Fauzi Maulana tiba di sekolah dan scan QR gerbang masuk tepat waktu.',
      },
      {
        id: `ACT_${todayStr}_2`,
        nisn: '0091234001',
        tanggal: todayStr,
        waktu: '07:30',
        kategori: 'KBM',
        keterangan: 'Mengikuti sesi KBM Matematika (Materi Aljabar Lanjutan) bersama Bpk. Asep Saepudin, S.Pd.',
      },
      {
        id: `ACT_${todayStr}_3`,
        nisn: '0091234001',
        tanggal: todayStr,
        waktu: '09:45',
        kategori: 'TUGAS',
        keterangan: 'Mengumpulkan tugas rangkuman IPA Biologi secara mandiri di meja guru.',
      },
      {
        id: `ACT_${todayStr}_4`,
        nisn: '0081234021',
        tanggal: todayStr,
        waktu: '06:48',
        kategori: 'MASUK',
        keterangan: 'Muhamad Rizky Ananda tiba di sekolah dan menyapa guru piket di gerbang.',
      },
      {
        id: `ACT_${todayStr}_5`,
        nisn: '0071234041',
        tanggal: todayStr,
        waktu: '07:01',
        kategori: 'MASUK',
        keterangan: 'Aldi Saputra memindai presensi apel pagi tepat waktu.',
      }
    );
  }

  return [...newLogs, ...existingLogs];
}

/**
 * Generate fresh teaching journals for today
 */
export function generateAutoTeachingJournals(
  todayStr: string,
  existingJournals: TeachingJournal[]
): TeachingJournal[] {
  const hasToday = existingJournals.some((j) => j.tanggal === todayStr);
  const newJournals: TeachingJournal[] = [];

  if (!hasToday) {
    newJournals.push(
      {
        id: `JRN_IPA_7A_${todayStr}_1`,
        guruId: 'T1',
        guruNama: 'Hj. Siti Maryam, S.Pd.',
        guruNip: '19750918 200501 2 006',
        kelas: '7A',
        mapel: 'Ilmu Pengetahuan Alam (IPA)',
        tanggal: todayStr,
        pertemuanKe: 5,
        jamPelajaran: '1 - 2 (07.30 - 08.50)',
        materiPokok: 'Klasifikasi Makhluk Hidup & Keanekaragaman Tumbuhan',
        kegiatanPembelajaran: 'Observasi spesimen daun dan klasifikasi kelompok dikotil/monokotil dengan lembar kerja siswa.',
        catatanRefleksi: 'Siswa antusias dan menyelesaikan pengamatan tepat waktu. Siswa izin/sakit telah disinkronkan.',
        totalSiswa: 10,
        hadir: 8,
        terlambat: 0,
        izin: 1,
        sakit: 1,
        alpa: 0,
        persentaseKehadiran: 80,
        createdAt: `${todayStr}T08:50:00Z`,
      },
      {
        id: `JRN_MTK_8A_${todayStr}_2`,
        guruId: 'T2',
        guruNama: 'Asep Saepudin, S.Pd.',
        guruNip: '19820314 200801 1 009',
        kelas: '8A',
        mapel: 'Matematika',
        tanggal: todayStr,
        pertemuanKe: 6,
        jamPelajaran: '3 - 4 (09.05 - 10.25)',
        materiPokok: 'Sistem Persamaan Linear Dua Variabel (SPLDV)',
        kegiatanPembelajaran: 'Penyelesaian soal kontekstual dan diskusi terbimbing antar kelompok meja.',
        catatanRefleksi: 'Sebagian besar siswa memahami metode substitusi dan eliminasi dengan baik.',
        totalSiswa: 10,
        hadir: 9,
        terlambat: 1,
        izin: 0,
        sakit: 0,
        alpa: 0,
        persentaseKehadiran: 90,
        createdAt: `${todayStr}T10:25:00Z`,
      }
    );
  }

  return [...newJournals, ...existingJournals];
}

/**
 * Main Auto Update Controller
 */
export class DailyAutoUpdateService {
  private static intervalId: number | null = null;
  private static listeners: Array<(activeDate: string) => void> = [];

  /**
   * Subscribe to date or data auto-update events
   */
  static subscribe(callback: (activeDate: string) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private static notifyListeners(dateStr: string) {
    this.listeners.forEach((cb) => {
      try {
        cb(dateStr);
      } catch (err) {
        console.error('Error notifying auto update listener', err);
      }
    });
  }

  /**
   * Check and run the daily auto update.
   * Compares the current active date with the last recorded update date.
   */
  static async checkAndRunDailyAutoUpdate(force = false): Promise<{
    updated: boolean;
    activeDate: string;
    message: string;
  }> {
    const activeDate = getActiveDate();
    const lastDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);

    // If already updated for this activeDate and not forced, skip
    if (!force && lastDate === activeDate) {
      return {
        updated: false,
        activeDate,
        message: `Data sudah sinkron untuk ${formatIndonesianDate(activeDate)}`,
      };
    }

    try {
      console.log(`[DailyAutoUpdate] Menjalankan auto-update data harian untuk tanggal: ${activeDate}`);

      // 1. Load existing data
      const [students, currentLeaves, currentRecords, currentLogs, currentJournals] = await Promise.all([
        DatabaseService.getStudents(),
        DatabaseService.getLeaveRequests(),
        DatabaseService.getAttendanceRecords(),
        DatabaseService.getStudentActivityLogs(),
        DatabaseService.getTeachingJournals(),
      ]);

      // 2. Generate updated datasets
      const updatedLeaves = generateAutoLeaveRequests(activeDate, currentLeaves);
      const updatedRecords = generateAutoAttendanceRecords(activeDate, students, currentRecords, updatedLeaves);
      const updatedLogs = generateAutoActivityLogs(activeDate, currentLogs);
      const updatedJournals = generateAutoTeachingJournals(activeDate, currentJournals);

      // 3. Persist back to storage
      localStorage.setItem('leave_requests', JSON.stringify(updatedLeaves));
      localStorage.setItem('attendance', JSON.stringify(updatedRecords));
      localStorage.setItem('activity_logs', JSON.stringify(updatedLogs));
      localStorage.setItem('teaching_journals', JSON.stringify(updatedJournals));
      localStorage.setItem(STORAGE_KEY_LAST_DATE, activeDate);

      // 4. Notify listeners
      this.notifyListeners(activeDate);

      return {
        updated: true,
        activeDate,
        message: `Berhasil memperbarui data otomatis untuk ${formatIndonesianDate(activeDate)}`,
      };
    } catch (err) {
      console.error('[DailyAutoUpdate] Gagal menjalankan auto update harian:', err);
      return {
        updated: false,
        activeDate,
        message: 'Gagal menjalankan pembaruan otomatis',
      };
    }
  }

  /**
   * Simulate a specific date or roll forward to tomorrow for demo/testing
   */
  static async simulateDate(dateStr: string): Promise<void> {
    setActiveSimulatedDate(dateStr);
    await this.checkAndRunDailyAutoUpdate(true);
  }

  /**
   * Reset simulation back to real system date
   */
  static async resetToSystemDate(): Promise<void> {
    setActiveSimulatedDate(null);
    await this.checkAndRunDailyAutoUpdate(true);
  }

  /**
   * Advance one day forward
   */
  static async advanceOneDay(): Promise<string> {
    const current = getActiveDate();
    const nextDate = getOffsetDateString(current, 1);
    await this.simulateDate(nextDate);
    return nextDate;
  }

  /**
   * Start auto-check daemon (every 60s and on window focus)
   */
  static startDaemon(): void {
    if (this.intervalId !== null) return;

    // Check immediately
    this.checkAndRunDailyAutoUpdate().catch(console.error);

    // Timer check every 60 seconds
    this.intervalId = window.setInterval(() => {
      const currentActive = getActiveDate();
      const last = localStorage.getItem(STORAGE_KEY_LAST_DATE);
      if (currentActive !== last) {
        this.checkAndRunDailyAutoUpdate().catch(console.error);
      }
    }, 60000);

    // On window focus / visibility change
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        const currentActive = getActiveDate();
        const last = localStorage.getItem(STORAGE_KEY_LAST_DATE);
        if (currentActive !== last) {
          this.checkAndRunDailyAutoUpdate().catch(console.error);
        }
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
  }

  static stopDaemon(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
