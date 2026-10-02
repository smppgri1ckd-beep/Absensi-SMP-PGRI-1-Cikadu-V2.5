export interface Student {
  nisn: string;
  nama: string;
  jk: 'L' | 'P';
  kelas: string;
  fotoUrl?: string;
  nomorTeleponOrtu?: string;
}

export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';
export type AttendanceSession = 'Pagi' | 'Siang';
export type AttendanceCategory = 'APEL' | 'KELAS' | 'PEMBELAJARAN';

export interface AttendanceRecord {
  id: string; // e.g. PRESENSI_NISN_DATE_SESSION
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm:ss
  nisn: string;
  nama: string;
  kelas: string;
  sesi: AttendanceSession;
  status: AttendanceStatus;
  kategori?: AttendanceCategory;
  mapel?: string;
  pertemuanKe?: number;
  materiPokok?: string;
  catatan?: string;
}

export interface TeachingJournal {
  id: string;
  guruId: string;
  guruNama: string;
  guruNip?: string;
  kelas: string;
  mapel: string;
  tanggal: string; // YYYY-MM-DD
  pertemuanKe: number;
  jamPelajaran: string; // e.g. "1 - 3 (07.30 - 09.30)"
  materiPokok: string;
  kegiatanPembelajaran?: string;
  catatanRefleksi?: string;
  totalSiswa: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  persentaseKehadiran: number;
  studentAttendances?: Record<string, AttendanceStatus>;
  createdAt: string;
}

export interface TeachingAssignment {
  id: string;
  mapel: string;
  kelas: string[]; // e.g. ['7A', '7B']
  bebanJam?: number; // e.g. 4 (jam tatap muka / minggu)
}

export interface TeacherUser {
  id: string;
  nip?: string;
  nama: string;
  username: string;
  password?: string;
  role?: UserRole; // 'guru' | 'piket' | 'admin'
  mapel: string; // nama mapel utama / ringkasan
  penugasanMapel?: TeachingAssignment[]; // hingga 10 penugasan mapel dengan kelas berbeda!
  waliKelas?: string; // misal "7A"
  nomorHp?: string; // no WhatsApp / telepon
  status?: 'Aktif' | 'Non-Aktif' | string;
  totalJamMengajar?: number;
}

export interface AttendanceTimeSettings {
  pagiMulai: string; // e.g. "06:30"
  pagiBatasTepatWaktu: string; // e.g. "07:15"
  pagiBatasAkhir: string; // e.g. "11:30"
  siangMulai: string; // e.g. "12:00"
  siangBatasTepatWaktu: string; // e.g. "13:30"
  siangBatasAkhir: string; // e.g. "15:30"
  toleransiMenit: number; // e.g. 5
  // Sesi khusus hari Jumat (Kepulangan & Sholat Jumat)
  jumatSesiKhusus?: boolean;
  jumatPagiBatasAkhir?: string; // misal "11:00"
  jumatSiangMulai?: string; // misal "13:00"
  jumatSiangBatasTepatWaktu?: string; // misal "13:15"
}

export type IdCardTheme = 'pgri-blue' | 'emerald-green' | 'crimson-red' | 'gold-amber';
export type AppTheme = 'default' | 'emerald' | 'indigo' | 'slate';

export interface SchoolEventItem {
  id: string;
  judul: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai?: string; // YYYY-MM-DD
  kategori: 'Ujian' | 'Peringatan Hari Besar' | 'Kegiatan OSIS' | 'Rapat' | 'Libur' | 'Lainnya';
  keterangan?: string;
  waktu?: string; // e.g. "07:30 - Selesai"
  lokasi?: string; // e.g. "Lapangan Utama / Aula"
  penanggungJawab?: string;
}

export interface WhatsAppTemplate {
  id: string;
  nama: string;
  kategori: 'hadir' | 'terlambat' | 'alpa' | 'izin_sakit' | 'rapor' | 'kegiatan';
  template: string;
}

export interface SchoolConfig {
  namaSekolah: string;
  npsn: string;
  kota: string;
  alamat: string;
  kontak: string;
  namaKepsek: string;
  nipKepsek: string;
  namaPetugasPiket: string;
  nipPetugasPiket?: string;
  logoUrl?: string;
  sistemHariSekolah: '5_HARI' | '6_HARI';
  jadwal: AttendanceTimeSettings;
}

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export interface PetugasPiketItem {
  id: string;
  teacherId?: string;
  nama: string;
  nip?: string;
  nomorHp?: string;
  peran?: string; // misal: 'Koordinator Piket', 'Piket Gerbang & Apel', 'Piket Pemindai QR & Ketertiban'
  jamMulai?: string; // misal '06:30'
  jamSelesai?: string; // misal '14:30'
}

export interface JadwalPiketHarian {
  hari: DayOfWeek;
  petugas: PetugasPiketItem[];
  keteranganKhusus?: string;
}

export interface KalenderHeb {
  // Map date string 'YYYY-MM-DD' => boolean (true: effective school day, false: holiday/libur)
  kalenderData: Record<string, boolean>;
}

export type UserRole = 'admin' | 'piket' | 'guru' | 'ortu';

export interface ParentUser {
  id: string;
  username: string;
  nama: string;
  password?: string;
  nomorTelepon: string;
  childrenNisns: string[]; // NISN siswa yang terhubung dengan akun orang tua ini
  alamat?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  nip?: string;
  mapel?: string;
  penugasanMapel?: TeachingAssignment[];
  waliKelas?: string;
  nomorHp?: string;
  childrenNisns?: string[]; // Khusus akun role 'ortu'
  status?: string;
  loginAt?: string;
  avatarColor?: string;
}

// Model Pantau Anak: Jadwal Pelajaran Kelas
export interface ClassScheduleItem {
  id: string;
  kelas: string;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  mapel: string;
  guruNama: string;
  ruang?: string;
}

// Model Pantau Anak: Tugas Siswa
export interface AssignmentItem {
  id: string;
  kelas: string;
  mapel: string;
  guruNama: string;
  judul: string;
  deskripsi: string;
  deadline: string; // YYYY-MM-DD atau ISO
  tipe: 'Tugas' | 'Ulangan' | 'Praktikum' | 'Proyek';
}

export interface StudentAssignmentSubmission {
  id: string;
  assignmentId: string;
  nisn: string;
  status: 'Belum Dikerjakan' | 'Sudah Dikumpulkan' | 'Terlambat' | 'Sudah Dinilai';
  dikumpulkanPada?: string;
  nilai?: number;
  catatanGuru?: string;
}

// Model Pantau Anak: Nilai / Hasil Belajar Siswa
export interface StudentGradeItem {
  id: string;
  nisn: string;
  mapel: string;
  jenisPenilaian: 'Ulangan Harian' | 'Tugas' | 'UTS' | 'UAS' | 'Praktikum';
  namaPenilaian: string;
  nilai: number;
  tanggal: string; // YYYY-MM-DD
  komentarGuru?: string;
  semester?: 'Ganjil' | 'Genap';
  tahunAjaran?: string;
}

// Model Permohonan Izin / Sakit Mandiri
export type LeaveRequestType = 'Sakit' | 'Izin';
export type LeaveRequestStatus = 'Menunggu' | 'Disetujui' | 'Ditolak';

export interface LeaveRequest {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  jenis: LeaveRequestType;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  alasan: string;
  lampiranUrl?: string; // Foto surat keterangan dokter atau surat orang tua
  statusPengajuan: LeaveRequestStatus;
  tanggalPengajuan: string;
  disetujuiOleh?: string;
  catatanPiket?: string;
  kontakOrtu?: string;
}

// Model Pantau Anak: Pengumuman Sekolah
export interface SchoolAnnouncementItem {
  id: string;
  judul: string;
  konten: string;
  tanggal: string; // YYYY-MM-DD
  isPenting: boolean;
  kategori: 'Akademik' | 'Kegiatan' | 'Libur' | 'Umum';
}

// Model Pantau Anak: Catatan Guru untuk Siswa
export interface TeacherNoteItem {
  id: string;
  nisn: string;
  guruNama: string;
  peranGuru: 'Wali Kelas' | 'Guru Mapel' | 'Guru BK';
  mapel?: string;
  catatan: string;
  tanggal: string; // YYYY-MM-DD
  kategori: 'Perkembangan' | 'Apresiasi' | 'Perhatian';
}

// Model Pantau Anak: Kalender Akademik & Agenda
export interface AcademicCalendarEvent {
  id: string;
  tanggal: string; // YYYY-MM-DD
  judul: string;
  tipe: 'SEKOLAH' | 'UJIAN' | 'KEGIATAN' | 'LIBUR' | 'PENTING' | 'DEADLINE';
  keterangan?: string;
}

// Model Pantau Anak: Timeline Aktivitas Harian
export interface StudentActivityLogItem {
  id: string;
  nisn: string;
  waktu: string; // HH:mm
  tanggal: string; // YYYY-MM-DD
  kategori: 'MASUK' | 'KBM' | 'TUGAS' | 'NILAI' | 'PULANG';
  keterangan: string;
}
