import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Student, 
  AttendanceRecord, 
  TeachingJournal, 
  TeacherUser, 
  SchoolConfig, 
  KalenderHeb,
  ParentUser,
  ClassScheduleItem,
  AssignmentItem,
  StudentAssignmentSubmission,
  StudentGradeItem,
  SchoolAnnouncementItem,
  TeacherNoteItem,
  AcademicCalendarEvent,
  StudentActivityLogItem,
  LeaveRequest,
  LeaveRequestStatus,
  JadwalPiketHarian,
  PetugasPiketItem,
  DayOfWeek,
  SchoolEventItem,
  WhatsAppTemplate,
  IdCardTheme,
  AppTheme
} from '../types';
import { SCHOOL_LOGO_PNG_DATA_URL } from '../assets/schoolLogo';

// Default initial config for SMP PGRI 1 CIKADU
export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  namaSekolah: 'SMP PGRI 1 CIKADU',
  npsn: '69919136',
  kota: 'Cianjur',
  alamat: 'Kp. Koleberes Blok D RT. 04 RW. 09 Desa Cikadu Kec. Cikadu Kab. Cianjur',
  kontak: 'Telp: 0852 1258 7750 | e-mail: smp.pgri1ckd@gmail.com | NPSN: 69919136',
  namaKepsek: 'CUNCUN MUHLISOH, S.Pd.',
  nipKepsek: '-',
  namaPetugasPiket: 'AI SITI ROSITA',
  nipPetugasPiket: '-',
  logoUrl: SCHOOL_LOGO_PNG_DATA_URL,
  sistemHariSekolah: '6_HARI',
  jadwal: {
    pagiMulai: '06:30',
    pagiBatasTepatWaktu: '07:15',
    pagiBatasAkhir: '11:30',
    siangMulai: '12:00',
    siangBatasTepatWaktu: '13:30',
    siangBatasAkhir: '15:30',
    toleransiMenit: 10,
    jumatSesiKhusus: true,
    jumatPagiBatasAkhir: '11:00',
    jumatSiangMulai: '13:00',
  },
};

export const INITIAL_STUDENTS: Student[] = [
  // Kelas 7A
  { nisn: '0091234001', nama: 'Achmad Fauzi Maulana', jk: 'L', kelas: '7A', nomorTeleponOrtu: '081234567801', fotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234002', nama: 'Adelia Putri Rahmawati', jk: 'P', kelas: '7A', nomorTeleponOrtu: '081234567802', fotoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234003', nama: 'Bayu Pratama Nugraha', jk: 'L', kelas: '7A', nomorTeleponOrtu: '081234567803', fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234004', nama: 'Citra Amelia Zahra', jk: 'P', kelas: '7A', nomorTeleponOrtu: '081234567804', fotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234005', nama: 'Diki Wahyudi Saputra', jk: 'L', kelas: '7A', nomorTeleponOrtu: '081234567805', fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234006', nama: 'Dinda Lestari', jk: 'P', kelas: '7A', nomorTeleponOrtu: '081234567806', fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234007', nama: 'Fajar Hidayatullah', jk: 'L', kelas: '7A', nomorTeleponOrtu: '081234567807', fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234008', nama: 'Fitri Handayani', jk: 'P', kelas: '7A', nomorTeleponOrtu: '081234567808', fotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234009', nama: 'Gilang Ramadhan', jk: 'L', kelas: '7A', nomorTeleponOrtu: '081234567809', fotoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234010', nama: 'Hana Nurfadilah', jk: 'P', kelas: '7A', nomorTeleponOrtu: '081234567810', fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },

  // Kelas 7B
  { nisn: '0091234011', nama: 'Iqbal Kurniawan', jk: 'L', kelas: '7B', nomorTeleponOrtu: '081234567811', fotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234012', nama: 'Intan Permatasari', jk: 'P', kelas: '7B', nomorTeleponOrtu: '081234567812', fotoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234013', nama: 'Jaka Firmansyah', jk: 'L', kelas: '7B', nomorTeleponOrtu: '081234567813', fotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234014', nama: 'Kania Dewi Anggraeni', jk: 'P', kelas: '7B', nomorTeleponOrtu: '081234567814', fotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234015', nama: 'Lukman Hakim', jk: 'L', kelas: '7B', nomorTeleponOrtu: '081234567815', fotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0091234016', nama: 'Melani Putri', jk: 'P', kelas: '7B', nomorTeleponOrtu: '081234567816', fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },

  // Kelas 8A
  { nisn: '0081234021', nama: 'Muhamad Rizky Ananda', jk: 'L', kelas: '8A', nomorTeleponOrtu: '081234567821', fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234022', nama: 'Nabila Syifa Azzahra', jk: 'P', kelas: '8A', nomorTeleponOrtu: '081234567822', fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234023', nama: 'Panji Gumilang', jk: 'L', kelas: '8A', nomorTeleponOrtu: '081234567823', fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234024', nama: 'Rani Oktaviani', jk: 'P', kelas: '8A', nomorTeleponOrtu: '081234567824', fotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234025', nama: 'Rian Maulana', jk: 'L', kelas: '8A', nomorTeleponOrtu: '081234567825', fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234026', nama: 'Salma Nurul Izzah', jk: 'P', kelas: '8A', nomorTeleponOrtu: '081234567826', fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },

  // Kelas 8B
  { nisn: '0081234031', nama: 'Surya Kencana', jk: 'L', kelas: '8B', nomorTeleponOrtu: '081234567831', fotoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234032', nama: 'Tia Monica', jk: 'P', kelas: '8B', nomorTeleponOrtu: '081234567832', fotoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234033', nama: 'Wildan Ardiansyah', jk: 'L', kelas: '8B', nomorTeleponOrtu: '081234567833', fotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0081234034', nama: 'Yuni Astuti', jk: 'P', kelas: '8B', nomorTeleponOrtu: '081234567834', fotoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },

  // Kelas 9A
  { nisn: '0071234041', nama: 'Aldi Saputra', jk: 'L', kelas: '9A', nomorTeleponOrtu: '081234567841', fotoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234042', nama: 'Anisa Rahmawati', jk: 'P', kelas: '9A', nomorTeleponOrtu: '081234567842', fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234043', nama: 'Budi Santoso', jk: 'L', kelas: '9A', nomorTeleponOrtu: '081234567843', fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234044', nama: 'Dewi Sartika', jk: 'P', kelas: '9A', nomorTeleponOrtu: '081234567844', fotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234045', nama: 'Eko Prasetyo', jk: 'L', kelas: '9A', nomorTeleponOrtu: '081234567845', fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },

  // Kelas 9B
  { nisn: '0071234051', nama: 'Farhan Nurhakim', jk: 'L', kelas: '9B', nomorTeleponOrtu: '081234567851', fotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234052', nama: 'Gita Gutawa', jk: 'P', kelas: '9B', nomorTeleponOrtu: '081234567852', fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234053', nama: 'Hendra Gunawan', jk: 'L', kelas: '9B', nomorTeleponOrtu: '081234567853', fotoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { nisn: '0071234054', nama: 'Ika Nurjanah', jk: 'P', kelas: '9B', nomorTeleponOrtu: '081234567854', fotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' },
];

export const INITIAL_TEACHERS: TeacherUser[] = [
  {
    id: 'T_SURYADI',
    nip: '-',
    nama: 'SURYADI',
    username: 'suryadi',
    password: 'edudigital',
    role: 'guru',
    mapel: 'Pendidikan Pancasila & PKN',
    waliKelas: '9A',
    nomorHp: '085212587750',
    status: 'Aktif',
    penugasanMapel: [
      { id: 'ASGN_SURYADI_1', mapel: 'Pendidikan Pancasila & PKN', kelas: ['9A', '9B'], bebanJam: 6 },
    ],
    totalJamMengajar: 6,
  },
  {
    id: 'T1',
    nip: '19750918 200501 2 006',
    nama: 'Hj. Siti Maryam, S.Pd.',
    username: 'guru.ipa',
    password: 'edudigital',
    role: 'guru',
    mapel: 'Ilmu Pengetahuan Alam (IPA)',
    waliKelas: '7A',
    nomorHp: '08123456701',
    status: 'Aktif',
    penugasanMapel: [
      { id: 'ASGN_1_1', mapel: 'Ilmu Pengetahuan Alam (IPA)', kelas: ['7A', '7B'], bebanJam: 8 },
      { id: 'ASGN_1_2', mapel: 'Prakarya & Kewirausahaan', kelas: ['8A', '8B'], bebanJam: 4 },
      { id: 'ASGN_1_3', mapel: 'Informatika', kelas: ['9A'], bebanJam: 2 },
    ],
    totalJamMengajar: 14,
  },
  {
    id: 'T2',
    nip: '19810314 200801 1 009',
    nama: 'Asep Saepudin, S.Pd.',
    username: 'guru.matematika',
    password: 'edudigital',
    role: 'guru',
    mapel: 'Matematika',
    waliKelas: '8A',
    nomorHp: '08123456702',
    status: 'Aktif',
    penugasanMapel: [
      { id: 'ASGN_2_1', mapel: 'Matematika', kelas: ['8A', '8B'], bebanJam: 10 },
      { id: 'ASGN_2_2', mapel: 'Matematika', kelas: ['9A', '9B'], bebanJam: 10 },
      { id: 'ASGN_2_3', mapel: 'Informatika', kelas: ['7A', '7B'], bebanJam: 4 },
    ],
    totalJamMengajar: 24,
  },
  {
    id: 'T3',
    nip: '19861102 201001 2 015',
    nama: 'Rina Kusmayanti, M.Pd.',
    username: 'guru.indonesia',
    password: 'edudigital',
    role: 'guru',
    mapel: 'Bahasa Indonesia',
    waliKelas: '9A',
    nomorHp: '08123456703',
    status: 'Aktif',
    penugasanMapel: [
      { id: 'ASGN_3_1', mapel: 'Bahasa Indonesia', kelas: ['9A', '9B'], bebanJam: 12 },
      { id: 'ASGN_3_2', mapel: 'Bahasa Sunda (Mulok)', kelas: ['7A', '7B', '8A'], bebanJam: 6 },
    ],
    totalJamMengajar: 18,
  },
  {
    id: 'T4',
    nip: '19900215 201402 1 003',
    nama: 'Dedi Kurniawan, S.Pd.',
    username: 'guru.inggris',
    password: 'edudigital',
    role: 'piket', // Merangkap Petugas Piket
    mapel: 'Bahasa Inggris',
    waliKelas: '7B',
    nomorHp: '08123456704',
    status: 'Aktif',
    penugasanMapel: [
      { id: 'ASGN_4_1', mapel: 'Bahasa Inggris', kelas: ['7A', '7B'], bebanJam: 8 },
      { id: 'ASGN_4_2', mapel: 'Pendidikan Jasmani & Olahraga (PJOK)', kelas: ['8A', '8B'], bebanJam: 6 },
      { id: 'ASGN_4_3', mapel: 'Seni Budaya', kelas: ['7A'], bebanJam: 2 },
    ],
    totalJamMengajar: 16,
  },
  {
    id: 'T5',
    nip: '19840722 200901 1 007',
    nama: 'Ustadz Ahmad Fauzi, S.Pd.I.',
    username: 'guru.pai',
    password: 'edudigital',
    role: 'guru',
    mapel: 'Pendidikan Agama Islam (PAI)',
    waliKelas: '8B',
    nomorHp: '08123456705',
    status: 'Aktif',
    penugasanMapel: [
      { id: 'ASGN_5_1', mapel: 'Pendidikan Agama Islam (PAI)', kelas: ['7A', '7B', '8A', '8B'], bebanJam: 12 },
      { id: 'ASGN_5_2', mapel: 'Seni Budaya', kelas: ['8A', '8B'], bebanJam: 4 },
      { id: 'ASGN_5_3', mapel: 'Bahasa Arab (Mulok)', kelas: ['9A', '9B'], bebanJam: 4 },
    ],
    totalJamMengajar: 20,
  },
];

// Helper for local storage key prefixes and real-time cross-tab broadcast
const STORAGE_PREFIX = 'presensi_pgri_';

export const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('presensi_pgri_sync')
  : null;

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to read ${key} from local storage`, e);
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    syncChannel?.postMessage({ type: 'SYNC_UPDATE', key, timestamp: Date.now() });
  } catch (e) {
    console.error(`Failed to write ${key} to local storage`, e);
  }
}

// Clean object helper: ensures no unsupported 'undefined' values are passed to Firestore
function cleanData<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

export const INITIAL_JADWAL_PIKET: JadwalPiketHarian[] = [
  {
    hari: 'Senin',
    petugas: [
      {
        id: 'piket_senin_1',
        teacherId: 'T1',
        nama: 'Hj. Siti Maryam, S.Pd.',
        nip: '19750918 200501 2 006',
        nomorHp: '08123456701',
        peran: 'Koordinator Piket & Apel Pagi',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
      {
        id: 'piket_senin_2',
        teacherId: 'T2',
        nama: 'Asep Saepudin, S.Pd.',
        nip: '19810314 200801 1 009',
        nomorHp: '08123456702',
        peran: 'Piket Gerbang & Pemindai QR',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
    ],
    keteranganKhusus: 'Fokus pengawasan kerapian seragam & kedisiplinan Upacara Bendera.',
  },
  {
    hari: 'Selasa',
    petugas: [
      {
        id: 'piket_selasa_1',
        teacherId: 'T3',
        nama: 'Drs. H. Dedi Mulyadi',
        nip: '19671120 199303 1 005',
        nomorHp: '08123456703',
        peran: 'Koordinator Piket',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
      {
        id: 'piket_selasa_2',
        teacherId: 'T4',
        nama: 'Neneng Hasanah, S.Pd.',
        nip: '19840712 200902 2 004',
        nomorHp: '08123456704',
        peran: 'Piket Pemindai QR & Izin Keluar',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
    ],
  },
  {
    hari: 'Rabu',
    petugas: [
      {
        id: 'piket_rabu_1',
        teacherId: 'T5',
        nama: 'Rahmat Hidayat, S.Pd.',
        nip: '19790215 200604 1 011',
        nomorHp: '08123456705',
        peran: 'Koordinator Piket & Apel Siang',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
      {
        id: 'piket_rabu_2',
        teacherId: 'T6',
        nama: 'Dewi Sartika, S.Pd.',
        nip: '19880523 201101 2 012',
        nomorHp: '08123456706',
        peran: 'Piket Gerbang & Ketertiban',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
    ],
  },
  {
    hari: 'Kamis',
    petugas: [
      {
        id: 'piket_kamis_1',
        teacherId: 'T7',
        nama: 'Budi Santoso, S.Pd.',
        nip: '19830419 200801 1 015',
        nomorHp: '08123456707',
        peran: 'Koordinator Piket',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
      {
        id: 'piket_kamis_2',
        teacherId: 'T8',
        nama: 'Iwan Setiawan, S.Pd.',
        nip: '19800611 200701 1 008',
        nomorHp: '08123456708',
        peran: 'Piket Gerbang & Pemindai QR',
        jamMulai: '06:30',
        jamSelesai: '14:30',
      },
    ],
  },
  {
    hari: 'Jumat',
    petugas: [
      {
        id: 'piket_jumat_1',
        teacherId: 'T1',
        nama: 'Hj. Siti Maryam, S.Pd.',
        nip: '19750918 200501 2 006',
        nomorHp: '08123456701',
        peran: 'Koordinator Piket & Sholat Dhuha',
        jamMulai: '06:30',
        jamSelesai: '11:45',
      },
      {
        id: 'piket_jumat_2',
        teacherId: 'T9',
        nama: 'Hendra Wijaya, S.Pd.',
        nip: '19860904 201001 1 013',
        nomorHp: '08123456709',
        peran: 'Piket Ketertiban Sholat Jumat',
        jamMulai: '06:30',
        jamSelesai: '11:45',
      },
    ],
  },
  {
    hari: 'Sabtu',
    petugas: [
      {
        id: 'piket_sabtu_1',
        teacherId: 'T2',
        nama: 'Asep Saepudin, S.Pd.',
        nip: '19810314 200801 1 009',
        nomorHp: '08123456702',
        peran: 'Koordinator Piket & Ekstrakurikuler',
        jamMulai: '06:30',
        jamSelesai: '13:00',
      },
      {
        id: 'piket_sabtu_2',
        teacherId: 'T5',
        nama: 'Rahmat Hidayat, S.Pd.',
        nip: '19790215 200604 1 011',
        nomorHp: '08123456705',
        peran: 'Piket Pemindai QR & Kepulangan',
        jamMulai: '06:30',
        jamSelesai: '13:00',
      },
    ],
  },
];

// Today's default mock attendances if fresh
function getInitialAttendanceRecords(): AttendanceRecord[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: `PRESENSI_0091234001_${today}_Pagi`,
      tanggal: today,
      waktu: '06:55:12',
      nisn: '0091234001',
      nama: 'Achmad Fauzi Maulana',
      kelas: '7A',
      sesi: 'Pagi',
      status: 'Hadir',
      kategori: 'APEL',
    },
    {
      id: `PRESENSI_0091234002_${today}_Pagi`,
      tanggal: today,
      waktu: '07:02:45',
      nisn: '0091234002',
      nama: 'Adelia Putri Rahmawati',
      kelas: '7A',
      sesi: 'Pagi',
      status: 'Hadir',
      kategori: 'APEL',
    },
    {
      id: `PRESENSI_0091234003_${today}_Pagi`,
      tanggal: today,
      waktu: '07:23:10',
      nisn: '0091234003',
      nama: 'Bayu Pratama Nugraha',
      kelas: '7A',
      sesi: 'Pagi',
      status: 'Terlambat',
      kategori: 'APEL',
      catatan: 'Terlambat 8 menit karena ban kempes',
    },
    {
      id: `PRESENSI_0081234021_${today}_Pagi`,
      tanggal: today,
      waktu: '06:48:30',
      nisn: '0081234021',
      nama: 'Muhamad Rizky Ananda',
      kelas: '8A',
      sesi: 'Pagi',
      status: 'Hadir',
      kategori: 'APEL',
    },
    {
      id: `PRESENSI_0081234022_${today}_Pagi`,
      tanggal: today,
      waktu: '07:05:19',
      nisn: '0081234022',
      nama: 'Nabila Syifa Azzahra',
      kelas: '8A',
      sesi: 'Pagi',
      status: 'Hadir',
      kategori: 'APEL',
    },
    {
      id: `PRESENSI_0071234041_${today}_Pagi`,
      tanggal: today,
      waktu: '07:00:02',
      nisn: '0071234041',
      nama: 'Aldi Saputra',
      kelas: '9A',
      sesi: 'Pagi',
      status: 'Hadir',
      kategori: 'APEL',
    },
  ];
}

export class DatabaseService {
  // --- SCHOOL CONFIG ---
  static async getSchoolConfig(): Promise<SchoolConfig> {
    const rawLocal = getLocal<Partial<SchoolConfig>>('school_config', DEFAULT_SCHOOL_CONFIG);
    const local: SchoolConfig = {
      ...DEFAULT_SCHOOL_CONFIG,
      ...rawLocal,
      logoUrl: rawLocal?.logoUrl || SCHOOL_LOGO_PNG_DATA_URL,
      jadwal: {
        ...DEFAULT_SCHOOL_CONFIG.jadwal,
        ...(rawLocal?.jadwal || {}),
      },
    };
    if (!db) return local;

    try {
      const docRef = doc(db, 'pengaturan', 'identitas_sekolah');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<SchoolConfig>;
        const merged: SchoolConfig = {
          ...DEFAULT_SCHOOL_CONFIG,
          ...data,
          logoUrl: data?.logoUrl || rawLocal?.logoUrl || SCHOOL_LOGO_PNG_DATA_URL,
          jadwal: {
            ...DEFAULT_SCHOOL_CONFIG.jadwal,
            ...(data?.jadwal || {}),
          },
        };
        setLocal('school_config', merged);
        return merged;
      } else {
        await setDoc(docRef, local);
      }
    } catch (e) {
      console.warn('Firestore getSchoolConfig fallback to local', e);
    }
    return local;
  }

  static async saveSchoolConfig(config: SchoolConfig): Promise<void> {
    setLocal('school_config', config);
    if (!db) return;
    try {
      const docRef = doc(db, 'pengaturan', 'identitas_sekolah');
      await setDoc(docRef, config);
    } catch (e) {
      console.warn('Firestore saveSchoolConfig offline cache used', e);
    }
  }

  // --- STUDENTS ---
  static async getStudents(): Promise<Student[]> {
    const local = getLocal<Student[]>('students', INITIAL_STUDENTS);
    if (!db) return local;

    try {
      const colRef = collection(db, 'siswa');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const students: Student[] = [];
        snap.forEach((docSnap) => {
          students.push(docSnap.data() as Student);
        });
        setLocal('students', students);
        return students;
      } else {
        // Seed if remote collection empty
        const batch = writeBatch(db!);
        local.forEach((s) => {
          const docRef = doc(db!, 'siswa', s.nisn);
          batch.set(docRef, s);
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getStudents fallback to local', e);
    }
    return local;
  }

  static async saveStudent(student: Student): Promise<void> {
    const students = await this.getStudents();
    const idx = students.findIndex((s) => s.nisn === student.nisn);
    if (idx >= 0) {
      students[idx] = student;
    } else {
      students.push(student);
    }
    setLocal('students', students);

    if (!db) return;
    try {
      const docRef = doc(db, 'siswa', student.nisn);
      await setDoc(docRef, cleanData(student));
    } catch (e) {
      console.warn('Firestore saveStudent offline cache used', e);
    }
  }

  static async deleteStudent(nisn: string): Promise<void> {
    const students = await this.getStudents();
    const filtered = students.filter((s) => s.nisn !== nisn);
    setLocal('students', filtered);

    if (!db) return;
    try {
      const docRef = doc(db, 'siswa', nisn);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore deleteStudent offline cache used', e);
    }
  }

  static async bulkSaveStudents(newStudents: Student[]): Promise<void> {
    const students = await this.getStudents();
    const map = new Map<string, Student>();
    students.forEach((s) => map.set(s.nisn, s));
    newStudents.forEach((s) => map.set(s.nisn, s));

    const combined = Array.from(map.values());
    setLocal('students', combined);

    if (!db) return;
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < newStudents.length; i += CHUNK_SIZE) {
        const chunk = newStudents.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((s) => {
          const docRef = doc(db!, 'siswa', s.nisn);
          batch.set(docRef, cleanData(s));
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Firestore bulkSaveStudents offline cache used', e);
    }
  }

  // --- ATTENDANCE ---
  static async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const local = getLocal<AttendanceRecord[]>('attendance', getInitialAttendanceRecords());
    if (!db) return local;

    try {
      const colRef = collection(db, 'presensi');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const records: AttendanceRecord[] = [];
        snap.forEach((docSnap) => {
          records.push(docSnap.data() as AttendanceRecord);
        });
        setLocal('attendance', records);
        return records;
      } else {
        // Seed remote collection if empty
        const batch = writeBatch(db);
        local.forEach((a) => {
          const docRef = doc(db!, 'presensi', a.id);
          batch.set(docRef, cleanData(a));
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getAttendanceRecords fallback to local', e);
    }
    return local;
  }

  static async addAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const records = await this.getAttendanceRecords();
    const existsIdx = records.findIndex((r) => r.id === record.id);
    if (existsIdx >= 0) {
      records[existsIdx] = record;
    } else {
      records.unshift(record);
    }
    setLocal('attendance', records);

    if (!db) return;
    try {
      const docRef = doc(db, 'presensi', record.id);
      await setDoc(docRef, cleanData(record));
    } catch (e) {
      console.warn('Firestore addAttendanceRecord offline cache used', e);
    }
  }

  static async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    return this.addAttendanceRecord(record);
  }

  static async updateAttendanceStatus(
    id: string, 
    status: AttendanceRecord['status'], 
    catatan?: string
  ): Promise<void> {
    const records = await this.getAttendanceRecords();
    const item = records.find((r) => r.id === id);
    if (!item) return;

    item.status = status;
    if (catatan !== undefined) item.catatan = catatan;
    setLocal('attendance', records);

    if (!db) return;
    try {
      const docRef = doc(db, 'presensi', id);
      await setDoc(docRef, cleanData(item), { merge: true });
    } catch (e) {
      console.warn('Firestore updateAttendanceStatus offline cache used', e);
    }
  }

  static async deleteAttendanceRecord(id: string): Promise<void> {
    const records = await this.getAttendanceRecords();
    const filtered = records.filter((r) => r.id !== id);
    setLocal('attendance', filtered);

    if (!db) return;
    try {
      const docRef = doc(db, 'presensi', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore deleteAttendanceRecord offline cache used', e);
    }
  }

  static async bulkSaveAttendanceRecords(newRecords: AttendanceRecord[]): Promise<void> {
    if (!newRecords || newRecords.length === 0) return;
    const records = await this.getAttendanceRecords();
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => map.set(r.id, r));
    newRecords.forEach((r) => map.set(r.id, r));

    const combined = Array.from(map.values());
    combined.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
    setLocal('attendance', combined);

    if (!db) return;
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < newRecords.length; i += CHUNK_SIZE) {
        const chunk = newRecords.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((r) => {
          const docRef = doc(db!, 'presensi', r.id);
          batch.set(docRef, cleanData(r));
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Firestore bulkSaveAttendanceRecords error:', e);
    }
  }

  // --- TEACHERS ---
  static async getTeachers(): Promise<TeacherUser[]> {
    const local = getLocal<TeacherUser[]>('teachers', INITIAL_TEACHERS);
    if (!db) return local;

    try {
      const colRef = collection(db, 'guru_users');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const teachers: TeacherUser[] = [];
        snap.forEach((docSnap) => {
          teachers.push(docSnap.data() as TeacherUser);
        });

        // Ensure Suryadi is updated with PKN classes 9A & 9B and waliKelas 9A
        const suryadiIdx = teachers.findIndex((t) => t.id === 'T_SURYADI' || t.username.toLowerCase() === 'suryadi');
        if (suryadiIdx >= 0) {
          const s = teachers[suryadiIdx];
          const hasOldClasses = s.penugasanMapel?.some((p) => p.kelas.includes('7A') || p.kelas.includes('8A'));
          if (hasOldClasses || !s.waliKelas || !s.penugasanMapel || s.penugasanMapel.length === 0) {
            const updatedSuryadi: TeacherUser = {
              ...s,
              mapel: 'Pendidikan Pancasila & PKN',
              waliKelas: '9A',
              penugasanMapel: [
                { id: 'ASGN_SURYADI_1', mapel: 'Pendidikan Pancasila & PKN', kelas: ['9A', '9B'], bebanJam: 6 },
              ],
              totalJamMengajar: 6,
            };
            teachers[suryadiIdx] = updatedSuryadi;
            if (db) {
              const docRef = doc(db, 'guru_users', updatedSuryadi.id);
              setDoc(docRef, cleanData(updatedSuryadi)).catch(() => {});
            }
          }
        } else {
          // If Suryadi doesn't exist in Firestore collection yet, add him
          const initialSuryadi = INITIAL_TEACHERS.find((t) => t.id === 'T_SURYADI');
          if (initialSuryadi) {
            teachers.unshift(initialSuryadi);
            if (db) {
              const docRef = doc(db, 'guru_users', initialSuryadi.id);
              setDoc(docRef, cleanData(initialSuryadi)).catch(() => {});
            }
          }
        }

        setLocal('teachers', teachers);
        return teachers;
      } else {
        const batch = writeBatch(db);
        local.forEach((t) => {
          const docRef = doc(db!, 'guru_users', t.id);
          batch.set(docRef, t);
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getTeachers fallback to local', e);
    }
    return local;
  }

  static async saveTeacher(teacher: TeacherUser): Promise<void> {
    const teachers = await this.getTeachers();
    const idx = teachers.findIndex((t) => t.id === teacher.id);
    if (idx >= 0) {
      teachers[idx] = teacher;
    } else {
      teachers.push(teacher);
    }
    setLocal('teachers', teachers);

    if (!db) return;
    try {
      const docRef = doc(db, 'guru_users', teacher.id);
      await setDoc(docRef, cleanData(teacher));
    } catch (e) {
      console.warn('Firestore saveTeacher offline cache used', e);
    }
  }

  static async deleteTeacher(id: string): Promise<void> {
    const teachers = await this.getTeachers();
    const filtered = teachers.filter((t) => t.id !== id);
    setLocal('teachers', filtered);

    if (!db) return;
    try {
      const docRef = doc(db, 'guru_users', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore deleteTeacher offline cache used', e);
    }
  }

  // --- TEACHING JOURNALS ---
  static async getTeachingJournals(): Promise<TeachingJournal[]> {
    const today = new Date().toISOString().split('T')[0];
    const defaultJournal: TeachingJournal[] = [
      {
        id: `JRN_IPA_7A_${today}_1`,
        guruId: 'T1',
        guruNama: 'Hj. Siti Maryam, S.Pd.',
        guruNip: '19750918 200501 2 006',
        kelas: '7A',
        mapel: 'Ilmu Pengetahuan Alam (IPA)',
        tanggal: today,
        pertemuanKe: 4,
        jamPelajaran: '1 - 2 (07.30 - 08.50)',
        materiPokok: 'Klasifikasi Makhluk Hidup dan Pengelompokan Tumbuhan',
        kegiatanPembelajaran: 'Observasi spesimen daun di taman sekolah dan identifikasi dikotil/monokotil dengan panduan LKPD.',
        catatanRefleksi: 'Siswa sangat aktif berdiskusi kelompok. 2 siswa terlambat telah bergabung dan menyelesaikan LKPD.',
        totalSiswa: 10,
        hadir: 8,
        terlambat: 2,
        izin: 0,
        sakit: 0,
        alpa: 0,
        persentaseKehadiran: 100,
        createdAt: new Date().toISOString(),
      },
    ];

    const local = getLocal<TeachingJournal[]>('teaching_journals', defaultJournal);
    if (!db) return local;

    try {
      const colRef = collection(db, 'jurnal_mengajar');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const journals: TeachingJournal[] = [];
        snap.forEach((docSnap) => {
          journals.push(docSnap.data() as TeachingJournal);
        });
        setLocal('teaching_journals', journals);
        return journals;
      } else {
        const batch = writeBatch(db);
        local.forEach((j) => {
          const docRef = doc(db!, 'jurnal_mengajar', j.id);
          batch.set(docRef, cleanData(j));
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getTeachingJournals fallback to local', e);
    }
    return local;
  }

  static async saveTeachingJournal(journal: TeachingJournal): Promise<void> {
    const journals = await this.getTeachingJournals();
    const idx = journals.findIndex((j) => j.id === journal.id);
    if (idx >= 0) {
      journals[idx] = journal;
    } else {
      journals.unshift(journal);
    }
    setLocal('teaching_journals', journals);

    if (!db) return;
    try {
      const docRef = doc(db, 'jurnal_mengajar', journal.id);
      await setDoc(docRef, cleanData(journal));
    } catch (e) {
      console.warn('Firestore saveTeachingJournal offline cache used', e);
    }
  }

  static async deleteTeachingJournal(id: string): Promise<void> {
    const journals = await this.getTeachingJournals();
    const filtered = journals.filter((j) => j.id !== id);
    setLocal('teaching_journals', filtered);

    if (!db) return;
    try {
      const docRef = doc(db, 'jurnal_mengajar', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore deleteTeachingJournal offline cache used', e);
    }
  }

  // --- HEB CALENDAR ---
  static async getKalenderHeb(): Promise<KalenderHeb> {
    // Generate default effective days for current month (Mon-Sat are true, Sun is false)
    const defaultData: Record<string, boolean> = {};
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const dayOfWeek = dayDate.getDay(); // 0 = Sun
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      defaultData[dateStr] = dayOfWeek !== 0; // Mon-Sat true
    }

    const local = getLocal<KalenderHeb>('kalender_heb', { kalenderData: defaultData });
    if (!db) return local;

    try {
      const docRef = doc(db, 'kalender_heb', 'active');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as KalenderHeb;
        setLocal('kalender_heb', data);
        return data;
      } else {
        await setDoc(docRef, cleanData(local));
      }
    } catch (e) {
      console.warn('Firestore getKalenderHeb fallback to local', e);
    }
    return local;
  }

  static async saveKalenderHeb(heb: KalenderHeb): Promise<void> {
    setLocal('kalender_heb', heb);
    if (!db) return;
    try {
      const docRef = doc(db, 'kalender_heb', 'active');
      await setDoc(docRef, cleanData(heb));
    } catch (e) {
      console.warn('Firestore saveKalenderHeb offline cache used', e);
    }
  }

  // ==========================================================
  // --- JADWAL & PENUGASAN GURU PIKET SERVICES ---
  // ==========================================================

  static async getJadwalPiket(): Promise<JadwalPiketHarian[]> {
    const local = getLocal<JadwalPiketHarian[]>('jadwal_piket_data', INITIAL_JADWAL_PIKET);
    if (!db) return local;

    try {
      const docRef = doc(db, 'pengaturan', 'jadwal_guru_piket');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data()?.list as JadwalPiketHarian[];
        if (data && Array.isArray(data)) {
          setLocal('jadwal_piket_data', data);
          return data;
        }
      } else {
        await setDoc(docRef, { list: cleanData(local) });
      }
    } catch (e) {
      console.warn('Firestore getJadwalPiket fallback to local', e);
    }
    return local;
  }

  static async saveJadwalPiket(jadwal: JadwalPiketHarian[]): Promise<void> {
    setLocal('jadwal_piket_data', jadwal);
    if (!db) return;
    try {
      const docRef = doc(db, 'pengaturan', 'jadwal_guru_piket');
      await setDoc(docRef, { list: cleanData(jadwal) });
    } catch (e) {
      console.warn('Firestore saveJadwalPiket offline cache used', e);
    }
  }

  static subscribeJadwalPiket(callback: (jadwal: JadwalPiketHarian[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<JadwalPiketHarian[]>('jadwal_piket_data', INITIAL_JADWAL_PIKET));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const docRef = doc(db, 'pengaturan', 'jadwal_guru_piket');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()?.list as JadwalPiketHarian[];
        if (data && Array.isArray(data)) {
          setLocal('jadwal_piket_data', data);
          callback(data);
        }
      }
    }, (err) => console.warn('Firestore onSnapshot error (jadwal_guru_piket):', err));
  }

  // ==========================================================
  // --- PANTAU ANAK (PORTAL ORANG TUA / WALI) DATA SERVICES ---
  // ==========================================================

  static async getParents(): Promise<ParentUser[]> {
    const local = getLocal<ParentUser[]>('parents_data', INITIAL_PARENTS);
    if (!db) return local;
    try {
      const colRef = collection(db, 'orang_tua');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: ParentUser[] = [];
        snap.forEach((d) => list.push(d.data() as ParentUser));
        setLocal('parents_data', list);
        return list;
      } else {
        const batch = writeBatch(db);
        local.forEach((p) => {
          batch.set(doc(db!, 'orang_tua', p.id), p);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Firestore getParents fallback to local', e);
    }
    return local;
  }

  static async getClassSchedules(kelas?: string): Promise<ClassScheduleItem[]> {
    const local = getLocal<ClassScheduleItem[]>('class_schedules', INITIAL_SCHEDULES);
    if (kelas) {
      return local.filter((s) => s.kelas.toLowerCase() === kelas.toLowerCase());
    }
    return local;
  }

  static async getAssignments(kelas?: string): Promise<AssignmentItem[]> {
    const local = getLocal<AssignmentItem[]>('assignments_data', INITIAL_ASSIGNMENTS);
    if (kelas) {
      return local.filter((a) => a.kelas.toLowerCase() === kelas.toLowerCase());
    }
    return local;
  }

  static async getSubmissions(nisn?: string): Promise<StudentAssignmentSubmission[]> {
    const local = getLocal<StudentAssignmentSubmission[]>('submissions_data', INITIAL_SUBMISSIONS);
    if (nisn) {
      return local.filter((s) => s.nisn === nisn);
    }
    return local;
  }

  static async getStudentGrades(nisn?: string): Promise<StudentGradeItem[]> {
    const local = getLocal<StudentGradeItem[]>('student_grades', INITIAL_GRADES);
    if (!db) {
      return nisn ? local.filter((g) => g.nisn === nisn) : local;
    }
    try {
      const colRef = collection(db, 'nilai_siswa');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: StudentGradeItem[] = [];
        snap.forEach((d) => list.push(d.data() as StudentGradeItem));
        setLocal('student_grades', list);
        return nisn ? list.filter((g) => g.nisn === nisn) : list;
      } else {
        const batch = writeBatch(db);
        local.forEach((g) => {
          batch.set(doc(db!, 'nilai_siswa', g.id), g);
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getStudentGrades fallback to local', e);
    }
    return nisn ? local.filter((g) => g.nisn === nisn) : local;
  }

  static async saveStudentGrade(grade: StudentGradeItem): Promise<void> {
    const list = await this.getStudentGrades();
    const idx = list.findIndex((g) => g.id === grade.id);
    if (idx >= 0) {
      list[idx] = grade;
    } else {
      list.unshift(grade);
    }
    setLocal('student_grades', list);

    if (!db) return;
    try {
      const docRef = doc(db, 'nilai_siswa', grade.id);
      await setDoc(docRef, cleanData(grade));
    } catch (e) {
      console.warn('Firestore saveStudentGrade offline cache used', e);
    }
  }

  static async deleteStudentGrade(id: string): Promise<void> {
    const list = await this.getStudentGrades();
    const filtered = list.filter((g) => g.id !== id);
    setLocal('student_grades', filtered);

    if (!db) return;
    try {
      const docRef = doc(db, 'nilai_siswa', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore deleteStudentGrade offline cache used', e);
    }
  }

  static async bulkSaveStudentGrades(newGrades: StudentGradeItem[]): Promise<void> {
    const list = await this.getStudentGrades();
    const map = new Map<string, StudentGradeItem>();
    list.forEach((g) => map.set(g.id, g));
    newGrades.forEach((g) => map.set(g.id, g));

    const combined = Array.from(map.values());
    setLocal('student_grades', combined);

    if (!db) return;
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < newGrades.length; i += CHUNK_SIZE) {
        const chunk = newGrades.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((g) => {
          batch.set(doc(db!, 'nilai_siswa', g.id), cleanData(g));
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('Firestore bulkSaveStudentGrades offline cache used', e);
    }
  }

  // --- LEAVE REQUESTS (PENGAJUAN IZIN / SAKIT MANDIRI) ---
  static async getLeaveRequests(): Promise<LeaveRequest[]> {
    const local = getLocal<LeaveRequest[]>('leave_requests', INITIAL_LEAVE_REQUESTS);
    if (!db) return local;

    try {
      const colRef = collection(db, 'permohonan_izin');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: LeaveRequest[] = [];
        snap.forEach((d) => list.push(d.data() as LeaveRequest));
        setLocal('leave_requests', list);
        return list;
      } else {
        const batch = writeBatch(db);
        local.forEach((r) => {
          batch.set(doc(db!, 'permohonan_izin', r.id), cleanData(r));
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getLeaveRequests fallback to local', e);
    }
    return local;
  }

  static async saveLeaveRequest(req: LeaveRequest): Promise<void> {
    const list = await this.getLeaveRequests();
    const idx = list.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      list[idx] = req;
    } else {
      list.unshift(req);
    }
    setLocal('leave_requests', list);

    if (!db) return;
    try {
      const docRef = doc(db, 'permohonan_izin', req.id);
      await setDoc(docRef, cleanData(req));
    } catch (e) {
      console.warn('Firestore saveLeaveRequest offline cache used', e);
    }
  }

  static async updateLeaveRequestStatus(
    id: string,
    status: LeaveRequestStatus,
    disetujuiOleh?: string,
    catatanPiket?: string
  ): Promise<void> {
    const list = await this.getLeaveRequests();
    const item = list.find((r) => r.id === id);
    if (!item) return;

    item.statusPengajuan = status;
    if (disetujuiOleh) item.disetujuiOleh = disetujuiOleh;
    if (catatanPiket) item.catatanPiket = catatanPiket;
    setLocal('leave_requests', list);

    if (db) {
      try {
        const docRef = doc(db, 'permohonan_izin', id);
        await setDoc(docRef, cleanData(item), { merge: true });
      } catch (e) {
        console.warn('Firestore updateLeaveRequestStatus offline cache used', e);
      }
    }

    // Auto-sinkronisasi ke AttendanceRecords jika disetujui
    if (status === 'Disetujui') {
      const attendances = await this.getAttendanceRecords();
      const sessions: ('Pagi' | 'Siang')[] = ['Pagi', 'Siang'];
      
      const newRecords: AttendanceRecord[] = [];
      for (const ses of sessions) {
        const recId = `PRESENSI_${item.nisn}_${item.tanggalMulai}_${ses}`;
        const existingIdx = attendances.findIndex((a) => a.id === recId);
        const recordData: AttendanceRecord = {
          id: recId,
          tanggal: item.tanggalMulai,
          waktu: '07:00:00',
          nisn: item.nisn,
          nama: item.nama,
          kelas: item.kelas,
          sesi: ses,
          status: item.jenis === 'Sakit' ? 'Sakit' : 'Izin',
          kategori: 'APEL',
          catatan: `[Izin Mandiri Disetujui] ${item.alasan}${item.disetujuiOleh ? ` (Oleh: ${item.disetujuiOleh})` : ''}`,
        };

        if (existingIdx >= 0) {
          attendances[existingIdx] = recordData;
        } else {
          attendances.unshift(recordData);
        }
        newRecords.push(recordData);
      }

      setLocal('attendance', attendances);

      if (db) {
        try {
          const batch = writeBatch(db);
          newRecords.forEach((r) => {
            batch.set(doc(db!, 'presensi', r.id), cleanData(r));
          });
          await batch.commit().catch(() => {});
        } catch (e) {
          console.warn('Firestore auto attendance sync error', e);
        }
      }
    }
  }

  static async deleteLeaveRequest(id: string): Promise<void> {
    const list = await this.getLeaveRequests();
    const filtered = list.filter((r) => r.id !== id);
    setLocal('leave_requests', filtered);

    if (!db) return;
    try {
      const docRef = doc(db, 'permohonan_izin', id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore deleteLeaveRequest offline cache used', e);
    }
  }

  // --- BACKUP & CLOUD FULL-SYNC TOOLS ---
  static async exportAllData(): Promise<string> {
    const [
      schoolConfig,
      students,
      attendance,
      teachers,
      teachingJournals,
      kalenderHeb,
      grades,
      leaveRequests,
      jadwalPiket,
    ] = await Promise.all([
      this.getSchoolConfig(),
      this.getStudents(),
      this.getAttendanceRecords(),
      this.getTeachers(),
      this.getTeachingJournals(),
      this.getKalenderHeb(),
      this.getStudentGrades(),
      this.getLeaveRequests(),
      this.getJadwalPiket(),
    ]);

    const backupPayload = {
      appVersion: '2.5.0',
      exportTimestamp: new Date().toISOString(),
      schoolName: schoolConfig.namaSekolah,
      data: {
        schoolConfig,
        students,
        attendance,
        teachers,
        teachingJournals,
        kalenderHeb,
        grades,
        leaveRequests,
        jadwalPiket,
      },
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  static async importAllData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) throw new Error('Format cadangan tidak valid (field data hilang)');

      const d = parsed.data;
      if (d.schoolConfig) setLocal('school_config', d.schoolConfig);
      if (Array.isArray(d.students)) setLocal('students', d.students);
      if (Array.isArray(d.attendance)) setLocal('attendance', d.attendance);
      if (Array.isArray(d.teachers)) setLocal('teachers', d.teachers);
      if (Array.isArray(d.teachingJournals)) setLocal('teaching_journals', d.teachingJournals);
      if (d.kalenderHeb) setLocal('kalender_heb', d.kalenderHeb);
      if (Array.isArray(d.grades)) setLocal('student_grades', d.grades);
      if (Array.isArray(d.leaveRequests)) setLocal('leave_requests', d.leaveRequests);
      if (Array.isArray(d.jadwalPiket)) setLocal('jadwal_piket_data', d.jadwalPiket);

      // Sinkronkan ke remote jika db tersedia
      if (db) {
        if (d.schoolConfig) await this.saveSchoolConfig(d.schoolConfig).catch(() => {});
        if (Array.isArray(d.students)) await this.bulkSaveStudents(d.students).catch(() => {});
        if (Array.isArray(d.jadwalPiket)) await this.saveJadwalPiket(d.jadwalPiket).catch(() => {});
      }

      return true;
    } catch (e) {
      console.error('Error importing backup data', e);
      return false;
    }
  }

  static async syncAllWithCloud(): Promise<{ success: boolean; message: string; count: number }> {
    if (!db) {
      return {
        success: false,
        message: 'Koneksi Firestore belum terkonfigurasi. Data tetap aman di penyimpanan lokal.',
        count: 0,
      };
    }

    try {
      const [
        students,
        attendance,
        teachers,
        journals,
        grades,
        leaveRequests,
        config,
        heb,
        jadwalPiket
      ] = await Promise.all([
        this.getStudents(),
        this.getAttendanceRecords(),
        this.getTeachers(),
        this.getTeachingJournals(),
        this.getStudentGrades(),
        this.getLeaveRequests(),
        this.getSchoolConfig(),
        this.getKalenderHeb(),
        this.getJadwalPiket(),
      ]);

      let count = 0;
      const CHUNK_SIZE = 400;

      // School config & HEB & Jadwal Guru Piket
      await setDoc(doc(db, 'pengaturan', 'identitas_sekolah'), cleanData(config));
      count++;
      await setDoc(doc(db, 'kalender_heb', 'active'), cleanData(heb));
      count++;
      await setDoc(doc(db, 'pengaturan', 'jadwal_guru_piket'), { list: cleanData(jadwalPiket) });
      count++;

      // Siswa
      for (let i = 0; i < students.length; i += CHUNK_SIZE) {
        const chunk = students.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((s) => {
          batch.set(doc(db!, 'siswa', s.nisn), cleanData(s));
          count++;
        });
        await batch.commit();
      }

      // Presensi
      for (let i = 0; i < attendance.length; i += CHUNK_SIZE) {
        const chunk = attendance.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((a) => {
          batch.set(doc(db!, 'presensi', a.id), cleanData(a));
          count++;
        });
        await batch.commit();
      }

      // Guru
      for (let i = 0; i < teachers.length; i += CHUNK_SIZE) {
        const chunk = teachers.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((t) => {
          batch.set(doc(db!, 'guru_users', t.id), cleanData(t));
          count++;
        });
        await batch.commit();
      }

      // Jurnal
      for (let i = 0; i < journals.length; i += CHUNK_SIZE) {
        const chunk = journals.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((j) => {
          batch.set(doc(db!, 'jurnal_mengajar', j.id), cleanData(j));
          count++;
        });
        await batch.commit();
      }

      // Nilai
      for (let i = 0; i < grades.length; i += CHUNK_SIZE) {
        const chunk = grades.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((g) => {
          batch.set(doc(db!, 'nilai_siswa', g.id), cleanData(g));
          count++;
        });
        await batch.commit();
      }

      // Izin
      for (let i = 0; i < leaveRequests.length; i += CHUNK_SIZE) {
        const chunk = leaveRequests.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((r) => {
          batch.set(doc(db!, 'permohonan_izin', r.id), cleanData(r));
          count++;
        });
        await batch.commit();
      }

      return {
        success: true,
        message: `Berhasil menyinkronkan seluruh data (${count} entri) langsung ke Firestore Database!`,
        count,
      };
    } catch (e: any) {
      console.error('Sync to cloud error', e);
      return {
        success: false,
        message: `Gagal sinkronisasi cloud: ${e?.message || 'Koneksi jaringan atau aturan keamanan menolak'}`,
        count: 0,
      };
    }
  }

  /**
   * Diagnostic method to check and test live read/write connectivity to Firestore
   */
  static async testDatabaseConnection(): Promise<{ 
    connected: boolean; 
    message: string; 
    latencyMs?: number;
    details?: { lastSync: string; totalRecords: number; databaseId: string };
  }> {
    if (!db) {
      return { 
        connected: false, 
        message: 'Koneksi Firebase belum diinisialisasi atau SDK tidak aktif.' 
      };
    }

    try {
      const start = Date.now();
      const testRef = doc(db, '_connection_test', 'status');
      const nowStr = new Date().toISOString();
      await setDoc(testRef, {
        app: 'e-Presensi SMP PGRI 1 Cikadu',
        lastTest: nowStr,
        status: 'ONLINE'
      });
      const snap = await getDoc(testRef);
      const latencyMs = Date.now() - start;

      if (snap.exists()) {
        const records = await this.getAttendanceRecords();
        return {
          connected: true,
          message: 'Koneksi ke Database Cloud Berhasil & Aktif! Seluruh input data tersimpan langsung secara aman.',
          latencyMs,
          details: {
            lastSync: nowStr,
            totalRecords: records.length,
            databaseId: 'ai-studio-absensismppgri1c-06352d9c-5331-4e81-8118-7e572ccd7d34'
          }
        };
      }
      return { connected: false, message: 'Gagal memverifikasi dokumen tes dari database cloud.' };
    } catch (err: any) {
      console.error('Test database connection error', err);
      return { 
        connected: false, 
        message: `Gagal terhubung ke database cloud: ${err?.message || 'Koneksi jaringan terputus'}` 
      };
    }
  }

  static async getAnnouncements(): Promise<SchoolAnnouncementItem[]> {
    return getLocal<SchoolAnnouncementItem[]>('school_announcements', INITIAL_ANNOUNCEMENTS);
  }

  static async getTeacherNotes(nisn?: string): Promise<TeacherNoteItem[]> {
    const local = getLocal<TeacherNoteItem[]>('teacher_notes', INITIAL_TEACHER_NOTES);
    if (nisn) {
      return local.filter((n) => n.nisn === nisn);
    }
    return local;
  }

  static async getAcademicCalendarEvents(): Promise<AcademicCalendarEvent[]> {
    return getLocal<AcademicCalendarEvent[]>('academic_calendar_events', INITIAL_ACADEMIC_EVENTS);
  }

  static async getStudentActivityLogs(nisn?: string, tanggal?: string): Promise<StudentActivityLogItem[]> {
    const local = getLocal<StudentActivityLogItem[]>('student_activity_logs', INITIAL_ACTIVITY_LOGS);
    let list = local;
    if (nisn) {
      list = list.filter((l) => l.nisn === nisn);
    }
    if (tanggal) {
      list = list.filter((l) => l.tanggal === tanggal);
    }
    return list;
  }

  // ==========================================================
  // --- REAL-TIME LISTENERS (OTOMATIS MASUK DATABASE LANGSUNG)
  // ==========================================================

  static subscribeStudents(callback: (students: Student[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<Student[]>('students', INITIAL_STUDENTS));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'siswa');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: Student[] = [];
        snap.forEach((d) => list.push(d.data() as Student));
        list.sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
        setLocal('students', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (siswa):', err));
  }

  static subscribeAttendance(callback: (records: AttendanceRecord[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<AttendanceRecord[]>('attendance', getInitialAttendanceRecords()));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'presensi');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: AttendanceRecord[] = [];
        snap.forEach((d) => list.push(d.data() as AttendanceRecord));
        list.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
        setLocal('attendance', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (presensi):', err));
  }

  static subscribeGrades(callback: (grades: StudentGradeItem[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<StudentGradeItem[]>('student_grades', INITIAL_GRADES));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'nilai_siswa');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: StudentGradeItem[] = [];
        snap.forEach((d) => list.push(d.data() as StudentGradeItem));
        list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        setLocal('student_grades', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (nilai_siswa):', err));
  }

  static subscribeLeaveRequests(callback: (requests: LeaveRequest[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<LeaveRequest[]>('leave_requests', INITIAL_LEAVE_REQUESTS));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'permohonan_izin');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: LeaveRequest[] = [];
        snap.forEach((d) => list.push(d.data() as LeaveRequest));
        list.sort((a, b) => b.tanggalPengajuan.localeCompare(a.tanggalPengajuan));
        setLocal('leave_requests', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (permohonan_izin):', err));
  }

  static subscribeTeachingJournals(callback: (journals: TeachingJournal[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<TeachingJournal[]>('teaching_journals', []));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'jurnal_mengajar');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: TeachingJournal[] = [];
        snap.forEach((d) => list.push(d.data() as TeachingJournal));
        list.sort((a, b) => (b.tanggal + b.createdAt).localeCompare(a.tanggal + a.createdAt));
        setLocal('teaching_journals', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (jurnal_mengajar):', err));
  }

  static subscribeTeachers(callback: (teachers: TeacherUser[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<TeacherUser[]>('teachers', INITIAL_TEACHERS));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'guru_users');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: TeacherUser[] = [];
        snap.forEach((d) => list.push(d.data() as TeacherUser));
        list.sort((a, b) => a.nama.localeCompare(b.nama));
        setLocal('teachers', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (guru_users):', err));
  }

  static subscribeSchoolConfig(callback: (config: SchoolConfig) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<SchoolConfig>('school_config', DEFAULT_SCHOOL_CONFIG));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const docRef = doc(db, 'pengaturan', 'identitas_sekolah');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SchoolConfig;
        setLocal('school_config', data);
        callback(data);
      }
    }, (err) => console.warn('Firestore onSnapshot error (pengaturan):', err));
  }

  // --- AGENDA KEGIATAN SEKOLAH ---
  static async getSchoolEvents(): Promise<SchoolEventItem[]> {
    const local = getLocal<SchoolEventItem[]>('school_events', INITIAL_SCHOOL_EVENTS);
    if (!db) return local;

    try {
      const colRef = collection(db, 'agenda_sekolah');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list: SchoolEventItem[] = [];
        snap.forEach((d) => list.push(d.data() as SchoolEventItem));
        list.sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
        setLocal('school_events', list);
        return list;
      } else {
        // Seed initial events if empty
        const batch = writeBatch(db);
        local.forEach((ev) => {
          batch.set(doc(db!, 'agenda_sekolah', ev.id), cleanData(ev));
        });
        await batch.commit().catch(() => {});
      }
    } catch (e) {
      console.warn('Firestore getSchoolEvents fallback to local', e);
    }
    return local;
  }

  static async saveSchoolEvent(event: SchoolEventItem): Promise<void> {
    const list = await this.getSchoolEvents();
    const idx = list.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      list[idx] = event;
    } else {
      list.push(event);
    }
    list.sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
    setLocal('school_events', list);

    if (db) {
      try {
        const docRef = doc(db, 'agenda_sekolah', event.id);
        await setDoc(docRef, cleanData(event));
      } catch (e) {
        console.warn('Firestore saveSchoolEvent error', e);
      }
    }
  }

  static async deleteSchoolEvent(id: string): Promise<void> {
    const list = await this.getSchoolEvents();
    const filtered = list.filter((e) => e.id !== id);
    setLocal('school_events', filtered);

    if (db) {
      try {
        const docRef = doc(db, 'agenda_sekolah', id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Firestore deleteSchoolEvent error', e);
      }
    }
  }

  static subscribeSchoolEvents(callback: (events: SchoolEventItem[]) => void): () => void {
    if (!db) {
      const handler = () => callback(getLocal<SchoolEventItem[]>('school_events', INITIAL_SCHOOL_EVENTS));
      syncChannel?.addEventListener('message', handler);
      return () => syncChannel?.removeEventListener('message', handler);
    }
    const colRef = collection(db, 'agenda_sekolah');
    return onSnapshot(colRef, (snap) => {
      if (!snap.empty) {
        const list: SchoolEventItem[] = [];
        snap.forEach((d) => list.push(d.data() as SchoolEventItem));
        list.sort((a, b) => a.tanggalMulai.localeCompare(b.tanggalMulai));
        setLocal('school_events', list);
        callback(list);
      }
    }, (err) => console.warn('Firestore onSnapshot error (agenda_sekolah):', err));
  }

  // --- WHATSAPP TEMPLATES ---
  static getWhatsAppTemplates(): WhatsAppTemplate[] {
    return getLocal<WhatsAppTemplate[]>('wa_templates', DEFAULT_WA_TEMPLATES);
  }

  static saveWhatsAppTemplates(templates: WhatsAppTemplate[]): void {
    setLocal('wa_templates', templates);
  }

  // --- THEME SETTINGS ---
  static getAppTheme(): AppTheme {
    return getLocal<AppTheme>('app_theme', 'default');
  }

  static saveAppTheme(theme: AppTheme): void {
    setLocal('app_theme', theme);
  }

  static getIdCardTheme(): IdCardTheme {
    return getLocal<IdCardTheme>('id_card_theme', 'pgri-blue');
  }

  static saveIdCardTheme(theme: IdCardTheme): void {
    setLocal('id_card_theme', theme);
  }
}

// ==========================================================
// --- INITIAL MOCK DATASETS UNTUK FITUR PANTAU ANAK ---
// ==========================================================

export const INITIAL_PARENTS: ParentUser[] = [
  {
    id: 'PARENT_1',
    username: 'ortu.achmad',
    nama: 'H. Suryana Maulana, S.E.',
    password: 'ortu123',
    nomorTelepon: '081234567801',
    childrenNisns: ['0091234001', '0081234021'], // 2 anak: Achmad Fauzi Maulana (7A) & Muhamad Rizky Ananda (8A)
    alamat: 'Kp. Pasir Salam RT 02/04, Cikadu, Cianjur',
  },
  {
    id: 'PARENT_2',
    username: 'ortu.adelia',
    nama: 'Dra. Hj. Rahmawati',
    password: 'ortu123',
    nomorTelepon: '081234567802',
    childrenNisns: ['0091234002'], // Adelia Putri Rahmawati (7A)
    alamat: 'Jl. Simpang Cikadu No. 14, Cikadu',
  },
  {
    id: 'PARENT_3',
    username: 'ortu.aldi',
    nama: 'Bambang Fauzan, M.Pd.',
    password: 'ortu123',
    nomorTelepon: '081234567803',
    childrenNisns: ['0071234041', '0071234042'], // 2 anak di kelas 9A: Aldi Saputra & Anisa Rahmawati
    alamat: 'Ds. Mekarwangi RT 01/01, Cikadu',
  },
];

export const INITIAL_SCHEDULES: ClassScheduleItem[] = [
  // Jadwal Kelas 7A (Senin - Sabtu)
  { id: 'SCH_7A_1', kelas: '7A', hari: 'Rabu', jamMulai: '07:30', jamSelesai: '09:00', mapel: 'Matematika', guruNama: 'Asep Saepudin, S.Pd.', ruang: 'R. Kelas 7A' },
  { id: 'SCH_7A_2', kelas: '7A', hari: 'Rabu', jamMulai: '09:15', jamSelesai: '10:45', mapel: 'Bahasa Indonesia', guruNama: 'Rina Kusmayanti, M.Pd.', ruang: 'R. Kelas 7A' },
  { id: 'SCH_7A_3', kelas: '7A', hari: 'Rabu', jamMulai: '11:00', jamSelesai: '12:30', mapel: 'Ilmu Pengetahuan Alam (IPA)', guruNama: 'Hj. Siti Maryam, S.Pd.', ruang: 'Lab IPA' },
  { id: 'SCH_7A_4', kelas: '7A', hari: 'Rabu', jamMulai: '13:00', jamSelesai: '14:30', mapel: 'Pendidikan Agama Islam (PAI)', guruNama: 'Ustadz Ahmad Fauzi, S.Pd.I.', ruang: 'R. Kelas 7A' },
  
  { id: 'SCH_7A_5', kelas: '7A', hari: 'Kamis', jamMulai: '07:30', jamSelesai: '09:00', mapel: 'Bahasa Inggris', guruNama: 'Dedi Kurniawan, S.Pd.', ruang: 'R. Kelas 7A' },
  { id: 'SCH_7A_6', kelas: '7A', hari: 'Kamis', jamMulai: '09:15', jamSelesai: '10:45', mapel: 'Prakarya & Kewirausahaan', guruNama: 'Hj. Siti Maryam, S.Pd.', ruang: 'Lab Prakarya' },
  { id: 'SCH_7A_7', kelas: '7A', hari: 'Kamis', jamMulai: '11:00', jamSelesai: '12:30', mapel: 'Informatika', guruNama: 'Asep Saepudin, S.Pd.', ruang: 'Lab Komputer' },

  // Jadwal Kelas 8A
  { id: 'SCH_8A_1', kelas: '8A', hari: 'Rabu', jamMulai: '07:30', jamSelesai: '09:00', mapel: 'Bahasa Indonesia', guruNama: 'Rina Kusmayanti, M.Pd.', ruang: 'R. Kelas 8A' },
  { id: 'SCH_8A_2', kelas: '8A', hari: 'Rabu', jamMulai: '09:15', jamSelesai: '10:45', mapel: 'Matematika', guruNama: 'Asep Saepudin, S.Pd.', ruang: 'R. Kelas 8A' },
  { id: 'SCH_8A_3', kelas: '8A', hari: 'Rabu', jamMulai: '11:00', jamSelesai: '12:30', mapel: 'Bahasa Inggris', guruNama: 'Dedi Kurniawan, S.Pd.', ruang: 'R. Kelas 8A' },

  // Jadwal Kelas 9A
  { id: 'SCH_9A_1', kelas: '9A', hari: 'Rabu', jamMulai: '07:30', jamSelesai: '09:00', mapel: 'Ilmu Pengetahuan Alam (IPA)', guruNama: 'Hj. Siti Maryam, S.Pd.', ruang: 'Lab IPA' },
  { id: 'SCH_9A_2', kelas: '9A', hari: 'Rabu', jamMulai: '09:15', jamSelesai: '10:45', mapel: 'Matematika', guruNama: 'Asep Saepudin, S.Pd.', ruang: 'R. Kelas 9A' },
  { id: 'SCH_9A_3', kelas: '9A', hari: 'Rabu', jamMulai: '11:00', jamSelesai: '12:30', mapel: 'Bahasa Indonesia', guruNama: 'Rina Kusmayanti, M.Pd.', ruang: 'R. Kelas 9A' },
];

export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: 'ASGN_1',
    kelas: '7A',
    mapel: 'Matematika',
    guruNama: 'Asep Saepudin, S.Pd.',
    judul: 'Latihan Persamaan Linear Satu Variabel',
    deskripsi: 'Kerjakan soal halaman 45 No. 1-10 di buku latihan matematika berpetak, sertakan langkah pengerjaan lengkap.',
    deadline: '2026-10-02 23:59',
    tipe: 'Tugas',
  },
  {
    id: 'ASGN_2',
    kelas: '7A',
    mapel: 'Ilmu Pengetahuan Alam (IPA)',
    guruNama: 'Hj. Siti Maryam, S.Pd.',
    judul: 'Laporan Praktikum Pengamatan Sel Tumbuhan',
    deskripsi: 'Susun laporan hasil praktikum mikroskop sel bawang merah dan sel epitel pipi sesuai format laporan ilmiah.',
    deadline: '2026-10-04 15:00',
    tipe: 'Praktikum',
  },
  {
    id: 'ASGN_3',
    kelas: '7A',
    mapel: 'Bahasa Indonesia',
    guruNama: 'Rina Kusmayanti, M.Pd.',
    judul: 'Menulis Cerpen Bertema Sahabat Sejati',
    deskripsi: 'Tulis cerpen orisinal 500-1000 kata dengan kaidah penulisan naratif dan struktur cerita yang utuh.',
    deadline: '2026-09-28 23:59',
    tipe: 'Tugas',
  },
  {
    id: 'ASGN_4',
    kelas: '7A',
    mapel: 'Bahasa Inggris',
    guruNama: 'Dedi Kurniawan, S.Pd.',
    judul: 'Vocabulary & Self Introduction Video',
    deskripsi: 'Rekam video perkenalan diri dalam bahasa Inggris durasi 1-2 menit menggunakan ekspresi perkenalan formal.',
    deadline: '2026-10-06 20:00',
    tipe: 'Proyek',
  },
  {
    id: 'ASGN_5',
    kelas: '8A',
    mapel: 'Matematika',
    guruNama: 'Asep Saepudin, S.Pd.',
    judul: 'Teorema Pythagoras & Soal Cerita Terapan',
    deskripsi: 'Selesaikan 5 soal cerita aplikasi rumus phytagoras dalam kehidupan sehari-hari.',
    deadline: '2026-10-03 23:59',
    tipe: 'Tugas',
  },
];

export const INITIAL_SUBMISSIONS: StudentAssignmentSubmission[] = [
  {
    id: 'SUB_1',
    assignmentId: 'ASGN_1',
    nisn: '0091234001', // Achmad Fauzi
    status: 'Belum Dikerjakan',
  },
  {
    id: 'SUB_2',
    assignmentId: 'ASGN_2',
    nisn: '0091234001',
    status: 'Belum Dikerjakan',
  },
  {
    id: 'SUB_3',
    assignmentId: 'ASGN_3',
    nisn: '0091234001',
    status: 'Sudah Dinilai',
    dikumpulkanPada: '2026-09-28 14:20',
    nilai: 92,
    catatanGuru: 'Alur cerita sangat runtut dan tata bahasa sastra yang memukau. Kerja bagus!',
  },
  {
    id: 'SUB_4',
    assignmentId: 'ASGN_4',
    nisn: '0091234001',
    status: 'Sudah Dikumpulkan',
    dikumpulkanPada: '2026-09-29 18:30',
  },
  // Submissions untuk siswa 8A
  {
    id: 'SUB_5',
    assignmentId: 'ASGN_5',
    nisn: '0081234021', // Muhamad Rizky Ananda
    status: 'Belum Dikerjakan',
  },
];

export const INITIAL_GRADES: StudentGradeItem[] = [
  // Nilai untuk Achmad Fauzi Maulana (0091234001)
  {
    id: 'GRD_1',
    nisn: '0091234001',
    mapel: 'Matematika',
    jenisPenilaian: 'Ulangan Harian',
    namaPenilaian: 'Ulangan Harian 1: Bilangan Bulat & Pecahan',
    nilai: 88,
    tanggal: '2026-09-12',
    komentarGuru: 'Memahami konsep dasar operasi bilangan dengan sangat teliti.',
  },
  {
    id: 'GRD_2',
    nisn: '0091234001',
    mapel: 'Bahasa Indonesia',
    jenisPenilaian: 'Tugas',
    namaPenilaian: 'Tugas Cerpen: Struktur Narasi',
    nilai: 92,
    tanggal: '2026-09-28',
    komentarGuru: 'Daya imajinasi tinggi dan ejaan sesuai PUEBI.',
  },
  {
    id: 'GRD_3',
    nisn: '0091234001',
    mapel: 'Ilmu Pengetahuan Alam (IPA)',
    jenisPenilaian: 'UTS',
    namaPenilaian: 'Ujian Bab 2: Klasifikasi Makhluk Hidup',
    nilai: 85,
    tanggal: '2026-09-20',
    komentarGuru: 'Penguasaan materi dikotom dan kunci determinasi sangat baik.',
  },
  {
    id: 'GRD_4',
    nisn: '0091234001',
    mapel: 'Bahasa Inggris',
    jenisPenilaian: 'Tugas',
    namaPenilaian: 'Greeting & Introducing Others',
    nilai: 90,
    tanggal: '2026-09-18',
    komentarGuru: 'Pelafalan (pronunciation) jelas dan lancar.',
  },
  {
    id: 'GRD_5',
    nisn: '0091234001',
    mapel: 'Pendidikan Agama Islam (PAI)',
    jenisPenilaian: 'Praktikum',
    namaPenilaian: 'Hafalan Surat Pendek Juz 30',
    nilai: 94,
    tanggal: '2026-09-25',
    komentarGuru: 'Makharijul huruf dan tajwid sangat baik.',
  },
  {
    id: 'GRD_6',
    nisn: '0091234001',
    mapel: 'Matematika',
    jenisPenilaian: 'Tugas',
    namaPenilaian: 'Kuis Cepat Aljabar Sederhana',
    nilai: 86,
    tanggal: '2026-08-28',
    komentarGuru: 'Penyelesaian soal runtut.',
  },
  // Nilai untuk Muhamad Rizky Ananda (0081234021)
  {
    id: 'GRD_7',
    nisn: '0081234021',
    mapel: 'Matematika',
    jenisPenilaian: 'Ulangan Harian',
    namaPenilaian: 'Pola Bilangan & Barisan Aritmetika',
    nilai: 89,
    tanggal: '2026-09-15',
    komentarGuru: 'Sangat cekatan dalam menemukan rumus suku ke-n.',
  },
  {
    id: 'GRD_8',
    nisn: '0081234021',
    mapel: 'Bahasa Indonesia',
    jenisPenilaian: 'Tugas',
    namaPenilaian: 'Teks Berita Aktual',
    nilai: 91,
    tanggal: '2026-09-22',
    komentarGuru: 'Unsur 5W+1H tersusun dengan rapi.',
  },
];

export const INITIAL_ANNOUNCEMENTS: SchoolAnnouncementItem[] = [
  {
    id: 'ANN_1',
    judul: 'Pelaksanaan Ujian Tengah Semester (UTS) Ganjil TA 2026/2027',
    konten: 'Diberitahukan kepada seluruh orang tua/wali siswa bahwa UTS Ganjil akan diselenggarakan pada tanggal 5 - 10 Oktober 2026. Mohon para orang tua membimbing putra-putrinya dalam belajar di rumah.',
    tanggal: '2026-09-28',
    isPenting: true,
    kategori: 'Akademik',
  },
  {
    id: 'ANN_2',
    judul: 'Pemberitahuan Kegiatan Edukasi Luar Sekolah (Study Tour)',
    konten: 'Kegiatan edukasi luar sekolah dan kunjungan museum edukasi dijadwalkan pada hari Senin, 12 Oktober 2026. Surat edaran rincian perlengkapan akan dibagikan oleh masing-masing wali kelas.',
    tanggal: '2026-09-26',
    isPenting: false,
    kategori: 'Kegiatan',
  },
  {
    id: 'ANN_3',
    judul: 'Libur Nasional Maulid Nabi Muhammad SAW 1448 H',
    konten: 'Sesuai keputusan bersama SKB 3 Menteri, kegiatan belajar mengajar diliburkan pada hari Kamis, 15 Oktober 2026 dan siswa kembali masuk sekolah seperti biasa pada hari Jumat.',
    tanggal: '2026-09-24',
    isPenting: true,
    kategori: 'Libur',
  },
  {
    id: 'ANN_4',
    judul: 'Pertemuan Rutin Komite Sekolah & Orang Tua Siswa',
    konten: 'Undangan silaturahmi dan evaluasi perkembangan belajar triwulan pertama bersama Bapak Kepala Sekolah dan dewan guru pada Sabtu pekan depan pukul 08:30 WIB.',
    tanggal: '2026-09-20',
    isPenting: false,
    kategori: 'Umum',
  },
];

export const INITIAL_TEACHER_NOTES: TeacherNoteItem[] = [
  {
    id: 'NOTE_1',
    nisn: '0091234001',
    guruNama: 'Hj. Siti Maryam, S.Pd.',
    peranGuru: 'Wali Kelas',
    mapel: 'Wali Kelas 7A',
    catatan: 'Achmad menunjukkan perkembangan yang sangat baik dalam disiplin kelas dan aktif dalam diskusi kelompok. Pertahankan semangat belajarnya!',
    tanggal: '2026-09-30',
    kategori: 'Perkembangan',
  },
  {
    id: 'NOTE_2',
    nisn: '0091234001',
    guruNama: 'Asep Saepudin, S.Pd.',
    peranGuru: 'Guru Mapel',
    mapel: 'Matematika',
    catatan: 'Pemahaman konsep persamaan linear sudah sangat matang. Perlu sedikit latihan ketelitian pada pengerjaan soal pecahan campuran.',
    tanggal: '2026-09-28',
    kategori: 'Perkembangan',
  },
  {
    id: 'NOTE_3',
    nisn: '0091234001',
    guruNama: 'Dra. Endah Sulistyowati',
    peranGuru: 'Guru BK',
    catatan: 'Ananda memiliki jiwa sosial yang tinggi, mudah bergaul, dan selalu sopan santun kepada guru maupun teman sejawat.',
    tanggal: '2026-09-22',
    kategori: 'Apresiasi',
  },
  // Catatan untuk Rizky (0081234021)
  {
    id: 'NOTE_4',
    nisn: '0081234021',
    guruNama: 'Asep Saepudin, S.Pd.',
    peranGuru: 'Wali Kelas',
    mapel: 'Wali Kelas 8A',
    catatan: 'Rizky sangat aktif membantu teman sekelas saat sesi belajar tutor sebaya. Prestasi akademiknya konsisten di peringkat atas.',
    tanggal: '2026-09-29',
    kategori: 'Apresiasi',
  },
];

export const INITIAL_ACADEMIC_EVENTS: AcademicCalendarEvent[] = [
  { id: 'EV_1', tanggal: '2026-10-02', judul: 'Deadline Tugas Persamaan Linear', tipe: 'DEADLINE', keterangan: 'Batas akhir pengumpulan tugas Matematika' },
  { id: 'EV_2', tanggal: '2026-10-05', judul: 'Ujian Tengah Semester (UTS) Hari Ke-1', tipe: 'UJIAN', keterangan: 'Mata pelajaran PAI dan Bahasa Indonesia' },
  { id: 'EV_3', tanggal: '2026-10-06', judul: 'Ujian Tengah Semester (UTS) Hari Ke-2', tipe: 'UJIAN', keterangan: 'Mata pelajaran Matematika dan Bahasa Inggris' },
  { id: 'EV_4', tanggal: '2026-10-07', judul: 'Ujian Tengah Semester (UTS) Hari Ke-3', tipe: 'UJIAN', keterangan: 'Mata pelajaran IPA dan IPS' },
  { id: 'EV_5', tanggal: '2026-10-12', judul: 'Study Tour & Pembelajaran Luar Kelas', tipe: 'KEGIATAN', keterangan: 'Kunjungan Museum & Pusat Edukasi Biologi' },
  { id: 'EV_6', tanggal: '2026-10-15', judul: 'Libur Nasional Maulid Nabi', tipe: 'LIBUR', keterangan: 'Kegiatan belajar mengajar ditiadakan' },
  { id: 'EV_7', tanggal: '2026-10-24', judul: 'Rapat Evaluasi Triwulan Komite', tipe: 'PENTING', keterangan: 'Pertemuan orang tua murid dan pembagian laporan sisipan' },
];

export const INITIAL_ACTIVITY_LOGS: StudentActivityLogItem[] = [
  { id: 'ACT_1', nisn: '0091234001', tanggal: '2026-09-30', waktu: '06:55', kategori: 'MASUK', keterangan: 'Achmad Fauzi Maulana tiba di sekolah dan scan gerbang masuk tepat waktu' },
  { id: 'ACT_2', nisn: '0091234001', tanggal: '2026-09-30', waktu: '07:30', kategori: 'KBM', keterangan: 'Mengikuti sesi pembelajaran Matematika (Aljabar) bersama Bpk. Asep Saepudin, S.Pd.' },
  { id: 'ACT_3', nisn: '0091234001', tanggal: '2026-09-30', waktu: '09:20', kategori: 'KBM', keterangan: 'Mengikuti pembelajaran Bahasa Indonesia (Analisis Unsur Cerpen)' },
  { id: 'ACT_4', nisn: '0091234001', tanggal: '2026-09-30', waktu: '11:15', kategori: 'TUGAS', keterangan: 'Mengumpulkan draf tugas laporan praktikum IPA kepada Ibu Hj. Siti Maryam, S.Pd.' },
  { id: 'ACT_5', nisn: '0091234001', tanggal: '2026-09-30', waktu: '13:30', kategori: 'NILAI', keterangan: 'Nilai Tugas Menulis Cerpen diterbitkan oleh guru: 92 (Sangat Baik)' },
  { id: 'ACT_6', nisn: '0091234001', tanggal: '2026-09-30', waktu: '14:45', kategori: 'PULANG', keterangan: 'Memindai kartu kepulangan sekolah di gerbang utama' },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LEAVE_001',
    nisn: '0091234004', // Citra Amelia Zahra (7A)
    nama: 'Citra Amelia Zahra',
    kelas: '7A',
    jenis: 'Sakit',
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date().toISOString().split('T')[0],
    alasan: 'Demam tinggi dan flu batuk, disarankan istirahat di rumah sesuai anjuran dokter.',
    lampiranUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    statusPengajuan: 'Menunggu',
    tanggalPengajuan: `${new Date().toISOString().split('T')[0]} 06:45`,
    kontakOrtu: '081298765431',
  },
  {
    id: 'LEAVE_002',
    nisn: '0081234024', // Rani Oktaviani (8A)
    nama: 'Rani Oktaviani',
    kelas: '8A',
    jenis: 'Izin',
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: new Date().toISOString().split('T')[0],
    alasan: 'Menghadiri acara khitanan dan silaturahmi keluarga besar di luar kota.',
    lampiranUrl: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=600&auto=format&fit=crop&q=80',
    statusPengajuan: 'Disetujui',
    tanggalPengajuan: `${new Date().toISOString().split('T')[0]} 06:15`,
    disetujuiOleh: 'Hj. Siti Maryam, S.Pd. (Guru Piket)',
    catatanPiket: 'Surat permohonan lengkap dan telah dikonfirmasi via WhatsApp.',
    kontakOrtu: '081298765432',
  },
];

export const INITIAL_SCHOOL_EVENTS: SchoolEventItem[] = [
  {
    id: 'EVT_01',
    judul: 'Upacara Peringatan Hari Kesaktian Pancasila & Pembagian Kartu Pelajar',
    tanggalMulai: '2026-10-01',
    kategori: 'Peringatan Hari Besar',
    waktu: '07:00 - 08:30 WIB',
    lokasi: 'Lapangan Upacara SMP PGRI 1 Cikadu',
    keterangan: 'Seluruh siswa dan dewan guru mengenakan seragam dinas lengkap PGRI/Pramuka.',
    penanggungJawab: 'Pembina OSIS & Tim Kesiswaan'
  },
  {
    id: 'EVT_02',
    judul: 'Penilaian Tengah Semester (PTS) Ganjil Tahun Ajaran 2026/2027',
    tanggalMulai: '2026-10-05',
    tanggalSelesai: '2026-10-10',
    kategori: 'Ujian',
    waktu: '07:30 - 12:00 WIB',
    lokasi: 'Ruang Kelas 7A - 9B',
    keterangan: 'Jadwal ujian berbasis lembar jawaban dan pemantauan presensi ketat via scan QR.',
    penanggungJawab: 'Ketua Panitia Ujian'
  },
  {
    id: 'EVT_03',
    judul: 'Kegiatan Pembelajaran Luar Kelas (Field Trip Biologi & Budaya Lokal)',
    tanggalMulai: '2026-10-12',
    kategori: 'Kegiatan OSIS',
    waktu: '08:00 - 14:00 WIB',
    lokasi: 'Kawasan Konservasi & Kebun Edukasi Cikadu',
    keterangan: 'Diikuti siswa kelas 7 dan 8 dengan pendampingan wali kelas.',
    penanggungJawab: 'Hj. Siti Maryam, S.Pd.'
  },
  {
    id: 'EVT_04',
    judul: 'Rapat Pleno Komite Sekolah & Konsultasi Perkembangan Belajar Siswa',
    tanggalMulai: '2026-10-24',
    kategori: 'Rapat',
    waktu: '08:30 - 11:30 WIB',
    lokasi: 'Aula Pertemuan SMP PGRI 1 Cikadu',
    keterangan: 'Pertemuan orang tua/wali murid dengan Kepala Sekolah dan Wali Kelas.',
    penanggungJawab: 'Kepala Sekolah & Komite'
  }
];

export const DEFAULT_WA_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'tpl_hadir',
    nama: 'Presensi Hadir Tepat Waktu',
    kategori: 'hadir',
    template: `*SISTEM PRESENSI SMP PGRI 1 CIKADU*

Yth. Bapak/Ibu Orang Tua/Wali dari ananda *{NAMA_SISWA}* (Kelas {KELAS}).

Kami menginformasikan bahwa ananda telah hadir di sekolah dan melakukan pemindaian presensi:
📅 Tanggal: {TANGGAL}
⏰ Waktu: {WAKTU} WIB
📍 Sesi: {SESI}
✅ Status: HADIR TEPAT WAKTU

Terima kasih atas bimbingan dan kedisiplinan Bapak/Ibu.

_Salam hormat,_
*SMP PGRI 1 Cikadu*`
  },
  {
    id: 'tpl_terlambat',
    nama: 'Pemberitahuan Siswa Terlambat',
    kategori: 'terlambat',
    template: `*PEMBERITAHUAN KETERLAMBATAN SISWA*
*SMP PGRI 1 CIKADU*

Yth. Bapak/Ibu Orang Tua/Wali dari ananda *{NAMA_SISWA}* (Kelas {KELAS}).

Dengan ini kami memberitahukan bahwa ananda tiba di sekolah dengan keterangan:
📅 Tanggal: {TANGGAL}
⏰ Waktu Datang: {WAKTU} WIB
⚠️ Keterangan: TERLAMBAT ({CATATAN})

Mohon bantuannya untuk memantau waktu istirahat dan keberangkatan ananda agar dapat tiba di sekolah sebelum pukul {BATAS_WAKTU} WIB.

_Wali Kelas & Guru Piket_
*SMP PGRI 1 Cikadu*`
  },
  {
    id: 'tpl_alpa',
    nama: 'Peringatan Ketidakhadiran (Alpa)',
    kategori: 'alpa',
    template: `*KONFIRMASI KETIDAKHADIRAN SISWA*
*SMP PGRI 1 CIKADU*

Yth. Bapak/Ibu Orang Tua/Wali dari ananda *{NAMA_SISWA}* (Kelas {KELAS}).

Hingga saat ini ({WAKTU} WIB), ananda tercatat *BELUM HADIR* di sekolah tanpa surat keterangan/pemberitahuan resmi.

Mohon Bapak/Ibu dapat segera mengonfirmasi status keberadaan dan kondisi kesehatan ananda dengan membalas pesan ini atau mengirimkan permohonan izin melalui aplikasi Pantau Anak.

Terima kasih atas kerja samanya.
_Guru Piket & Kesiswaan SMP PGRI 1 Cikadu_`
  },
  {
    id: 'tpl_izin_sakit',
    nama: 'Konfirmasi Izin / Sakit Disetujui',
    kategori: 'izin_sakit',
    template: `*KONFIRMASI PENGAJUAN IZIN / SAKIT*
*SMP PGRI 1 CIKADU*

Yth. Bapak/Ibu Orang Tua/Wali dari ananda *{NAMA_SISWA}* (Kelas {KELAS}).

Permohonan *{STATUS}* ananda untuk tanggal *{TANGGAL}* telah *DISETUJUI* oleh pihak sekolah.
📝 Alasan: {ALASAN}
👨‍🏫 Diverifikasi oleh: {PETUGAS}

Semoga ananda lekas sembuh dan dapat beraktivitas kembali belajar seperti biasa.

*SMP PGRI 1 Cikadu*`
  },
  {
    id: 'tpl_rapor',
    nama: 'Laporan Capaian Belajar / Rapor Sisipan',
    kategori: 'rapor',
    template: `*INFORMASI CAPAIAN BELAJAR SISWA*
*SMP PGRI 1 CIKADU*

Yth. Bapak/Ibu Orang Tua/Wali dari ananda *{NAMA_SISWA}* (Kelas {KELAS}).

Rekapitulasi nilai dan capaian pembelajaran ananda untuk semester ini telah diperbarui di Sistem Pantau Anak SMP PGRI 1 Cikadu.

Bapak/Ibu dapat memantau atau mengunduh Rapor Sisipan resmi secara langsung melalui portal Pantau Anak.

_Wali Kelas {KELAS} - SMP PGRI 1 Cikadu_`
  }
];

export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppLink(phone: string, text: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}


