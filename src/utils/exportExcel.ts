import * as XLSX from 'xlsx';
import { Student, AttendanceRecord, TeachingJournal, SchoolConfig } from '../types';

export function exportDailyAttendanceExcel(
  records: AttendanceRecord[],
  tanggal: string,
  schoolConfig: SchoolConfig,
  kelasFilter = 'Semua'
): void {
  // Only export APEL records for daily gate attendance
  const apelRecords = records.filter((r) => r.kategori === 'APEL' || !r.kategori);
  const filtered = kelasFilter === 'Semua' 
    ? apelRecords 
    : apelRecords.filter((r) => r.kelas === kelasFilter);

  const rows = filtered.map((r, idx) => ({
    'No': idx + 1,
    'Tanggal': r.tanggal,
    'Waktu': r.waktu,
    'NISN': r.nisn,
    'Nama Siswa': r.nama,
    'Kelas': r.kelas,
    'Sesi': r.sesi,
    'Status Kehadiran': r.status,
    'Kategori': 'APEL',
    'Keterangan / Catatan': r.catatan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 10 }, // Waktu
    { wch: 14 }, // NISN
    { wch: 28 }, // Nama
    { wch: 8 },  // Kelas
    { wch: 10 }, // Sesi
    { wch: 16 }, // Status
    { wch: 10 }, // Kategori
    { wch: 30 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Presensi Apel Harian');

  const filename = `Presensi_Apel_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}_${tanggal}_${kelasFilter}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// 1. REKAP LAPORAN ABSENSI APEL (PAGI & SIANG)
export function exportApelRecapExcel(
  students: Student[],
  records: AttendanceRecord[],
  sessionFilter: string, // 'Semua' | 'Pagi' | 'Siang'
  bulanNama: string,
  tahun: number,
  totalHeb: number,
  schoolConfig: SchoolConfig,
  kelasFilter = 'Semua'
): void {
  const filteredStudents = kelasFilter === 'Semua'
    ? students
    : students.filter((s) => s.kelas === kelasFilter);

  // Filter records: strictly APEL
  const apelRecords = records.filter((r) => {
    const isApel = r.kategori === 'APEL' || (!r.kategori && !r.id.startsWith('PRESENSI_KBM_') && !r.mapel);
    if (!isApel) return false;
    if (sessionFilter !== 'Semua' && r.sesi !== sessionFilter) return false;
    return true;
  });

  const rows = filteredStudents.map((s, idx) => {
    const sRecords = apelRecords.filter((r) => r.nisn === s.nisn);
    
    // Breakdown per session
    const pagiRecords = sRecords.filter((r) => r.sesi === 'Pagi');
    const siangRecords = sRecords.filter((r) => r.sesi === 'Siang');

    const pagiHadir = pagiRecords.filter((r) => r.status === 'Hadir').length;
    const pagiTelat = pagiRecords.filter((r) => r.status === 'Terlambat').length;
    const siangHadir = siangRecords.filter((r) => r.status === 'Hadir').length;

    const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
    const izin = sRecords.filter((r) => r.status === 'Izin').length;
    const alpa = sRecords.filter((r) => r.status === 'Alpa').length;

    const totalHadirApel = pagiHadir + pagiTelat + siangHadir;
    const targetKehadiran = sessionFilter === 'Semua' ? totalHeb * 2 : totalHeb;
    const persentase = targetKehadiran > 0 ? Math.min(100, Math.round((totalHadirApel / targetKehadiran) * 100)) : 0;

    return {
      'No': idx + 1,
      'NISN': s.nisn,
      'Nama Siswa': s.nama,
      'L/P': s.jk,
      'Kelas': s.kelas,
      'Pagi Hadir': pagiHadir,
      'Pagi Terlambat': pagiTelat,
      'Siang Hadir': siangHadir,
      'Sakit (S)': sakit,
      'Izin (I)': izin,
      'Alpa (A)': alpa,
      'Total Masuk Apel': totalHadirApel,
      'Target Presensi': targetKehadiran,
      '% Kehadiran Apel': `${persentase}%`,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // NISN
    { wch: 28 }, // Nama
    { wch: 6 },  // L/P
    { wch: 8 },  // Kelas
    { wch: 12 }, // Pagi H
    { wch: 14 }, // Pagi T
    { wch: 12 }, // Siang H
    { wch: 10 }, // S
    { wch: 10 }, // I
    { wch: 10 }, // A
    { wch: 16 }, // Total Masuk Apel
    { wch: 14 }, // Target
    { wch: 18 }, // % Kehadiran
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Apel ${bulanNama}`);

  const filename = `Rekap_Absensi_Apel_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}_${sessionFilter}_${bulanNama}_${tahun}_${kelasFilter}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// 2. REKAP LAPORAN ABSENSI PEMBELAJARAN (KBM GURU)
export function exportLearningRecapExcel(
  students: Student[],
  records: AttendanceRecord[],
  journals: TeachingJournal[],
  mapelFilter: string,
  guruFilter: string,
  kelasFilter: string,
  bulanNama: string,
  tahun: number,
  schoolConfig: SchoolConfig
): void {
  const filteredStudents = kelasFilter === 'Semua'
    ? students
    : students.filter((s) => s.kelas === kelasFilter);

  // Filter journals for KBM
  const filteredJournals = journals.filter((j) => {
    if (mapelFilter !== 'Semua' && j.mapel.toLowerCase() !== mapelFilter.toLowerCase()) return false;
    if (guruFilter !== 'Semua' && j.guruNama !== guruFilter && j.guruId !== guruFilter) return false;
    if (kelasFilter !== 'Semua' && j.kelas !== kelasFilter) return false;
    return true;
  });

  // Filter class records: strictly KELAS / PEMBELAJARAN
  const classRecords = records.filter((r) => {
    const isKbm = r.kategori === 'KELAS' || r.kategori === 'PEMBELAJARAN' || r.id.startsWith('PRESENSI_KBM_') || !!r.mapel;
    if (!isKbm) return false;
    if (mapelFilter !== 'Semua' && r.mapel?.toLowerCase() !== mapelFilter.toLowerCase()) return false;
    if (kelasFilter !== 'Semua' && r.kelas !== kelasFilter) return false;
    return true;
  });

  const totalPertemuanKbm = filteredJournals.length;

  // Sheet 1: Rekap Kehadiran Siswa di KBM
  const studentRows = filteredStudents.map((s, idx) => {
    const sRecords = classRecords.filter((r) => r.nisn === s.nisn);
    const hadir = sRecords.filter((r) => r.status === 'Hadir').length;
    const terlambat = sRecords.filter((r) => r.status === 'Terlambat').length;
    const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
    const izin = sRecords.filter((r) => r.status === 'Izin').length;
    const alpa = sRecords.filter((r) => r.status === 'Alpa').length;

    const totalHadir = hadir + terlambat;
    const persentase = totalPertemuanKbm > 0 
      ? Math.min(100, Math.round((totalHadir / totalPertemuanKbm) * 100))
      : (sRecords.length > 0 ? Math.min(100, Math.round((totalHadir / sRecords.length) * 100)) : 100);

    return {
      'No': idx + 1,
      'NISN': s.nisn,
      'Nama Siswa': s.nama,
      'L/P': s.jk,
      'Kelas': s.kelas,
      'Mata Pelajaran': mapelFilter === 'Semua' ? 'Semua Mapel KBM' : mapelFilter,
      'Total Pertemuan': totalPertemuanKbm || sRecords.length,
      'Hadir (H)': hadir,
      'Terlambat (T)': terlambat,
      'Sakit (S)': sakit,
      'Izin (I)': izin,
      'Alpa (A)': alpa,
      'Total Hadir': totalHadir,
      '% Kehadiran KBM': `${persentase}%`,
      'Status': persentase >= 85 ? 'Tuntas' : (persentase >= 75 ? 'Cukup' : 'Perlu Pembinaan'),
    };
  });

  // Sheet 2: Buku Agenda Pertemuan Jurnal Guru
  const journalRows = filteredJournals.map((j, idx) => ({
    'No': idx + 1,
    'Tanggal': j.tanggal,
    'Pertemuan Ke': j.pertemuanKe,
    'Mata Pelajaran': j.mapel,
    'Kelas': j.kelas,
    'Jam Ke': j.jamPelajaran,
    'Guru Pengajar': j.guruNama,
    'Materi Pokok': j.materiPokok,
    'Kegiatan Pembelajaran': j.kegiatanPembelajaran || '-',
    'Total Siswa': j.totalSiswa,
    'Hadir': j.hadir,
    'Terlambat': j.terlambat,
    'Sakit': j.sakit,
    'Izin': j.izin,
    'Alpa': j.alpa,
    '% Kehadiran': `${j.persentaseKehadiran}%`,
    'Catatan / Refleksi': j.catatanRefleksi || '-',
  }));

  const workbook = XLSX.utils.book_new();

  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  wsStudents['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // NISN
    { wch: 28 }, // Nama
    { wch: 6 },  // L/P
    { wch: 8 },  // Kelas
    { wch: 22 }, // Mapel
    { wch: 16 }, // Total Pertemuan
    { wch: 10 }, // H
    { wch: 12 }, // T
    { wch: 10 }, // S
    { wch: 10 }, // I
    { wch: 10 }, // A
    { wch: 12 }, // Total Hadir
    { wch: 16 }, // %
    { wch: 16 }, // Status
  ];
  XLSX.utils.book_append_sheet(workbook, wsStudents, 'Rekap Kehadiran KBM');

  if (journalRows.length > 0) {
    const wsJournals = XLSX.utils.json_to_sheet(journalRows);
    wsJournals['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 8 },
      { wch: 14 },
      { wch: 24 },
      { wch: 30 },
      { wch: 35 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsJournals, 'Buku Agenda Jurnal Guru');
  }

  const cleanMapel = mapelFilter.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Rekap_KBM_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}_${cleanMapel}_${kelasFilter}_${bulanNama}_${tahun}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportMonthlyRecapExcel(
  students: Student[],
  records: AttendanceRecord[],
  bulanNama: string,
  tahun: number,
  totalHeb: number,
  schoolConfig: SchoolConfig,
  kelasFilter = 'Semua'
): void {
  // Legacy / Direct Call fallback: forwards to exportApelRecapExcel
  exportApelRecapExcel(
    students,
    records,
    'Semua',
    bulanNama,
    tahun,
    totalHeb,
    schoolConfig,
    kelasFilter
  );
}

export function exportTeachingJournalsExcel(
  journals: TeachingJournal[],
  schoolConfig: SchoolConfig
): void {
  const rows = journals.map((j, idx) => ({
    'No': idx + 1,
    'Tanggal': j.tanggal,
    'Guru Pengajar': j.guruNama,
    'NIP': j.guruNip || '-',
    'Mata Pelajaran': j.mapel,
    'Kelas': j.kelas,
    'Pertemuan Ke': j.pertemuanKe,
    'Jam Ke': j.jamPelajaran,
    'Materi Pokok': j.materiPokok,
    'Kegiatan KBM': j.kegiatanPembelajaran || '-',
    'Refleksi / Catatan': j.catatanRefleksi || '-',
    'Total Siswa': j.totalSiswa,
    'Hadir': j.hadir,
    'Terlambat': j.terlambat,
    'Sakit': j.sakit,
    'Izin': j.izin,
    'Alpa': j.alpa,
    '% Kehadiran': `${j.persentaseKehadiran}%`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jurnal Mengajar');

  const filename = `Jurnal_Mengajar_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportClassSchedulesExcel(
  schedules: any[],
  schoolConfig: SchoolConfig,
  filterHari?: string,
  filterKelas?: string
): void {
  const dayOrder: Record<string, number> = {
    'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6
  };

  const sorted = [...schedules].sort((a, b) => {
    const dayDiff = (dayOrder[a.hari] || 99) - (dayOrder[b.hari] || 99);
    if (dayDiff !== 0) return dayDiff;
    if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
    return a.jamMulai.localeCompare(b.jamMulai);
  });

  const rows = sorted.map((s, idx) => ({
    'No': idx + 1,
    'Hari': s.hari,
    'Kelas': s.kelas,
    'Jam Ke': s.jamKe || '-',
    'Jam Mulai': s.jamMulai,
    'Jam Selesai': s.jamSelesai,
    'Mata Pelajaran': s.mapel,
    'Guru Pengajar': s.guruNama,
    'Ruang / Lokasi': s.ruang || '-',
    'Keterangan': s.keterangan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Pelajaran');

  const cleanSchool = schoolConfig.namaSekolah.replace(/\s+/g, '_');
  const filename = `Jadwal_Pelajaran_${cleanSchool}_${filterHari || 'Semua'}_${filterKelas || 'Semua'}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportStudentTemplateExcel(): void {
  const sample = [
    { 'NISN': '0091234501', 'Nama Siswa': 'Ahmad Fauzan', 'Jenis Kelamin (L/P)': 'L', 'Kelas': '7A' },
    { 'NISN': '0091234502', 'Nama Siswa': 'Annisa Zahra', 'Jenis Kelamin (L/P)': 'P', 'Kelas': '7A' },
    { 'NISN': '0091234503', 'Nama Siswa': 'Bagus Prasetyo', 'Jenis Kelamin (L/P)': 'L', 'Kelas': '7B' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sample);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 10 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, 'Template_Import_Siswa_SMP_PGRI_1_CIKADU.xlsx');
}

/**
 * 8. TEMPLATE RESMI IMPORT DATA GURU & 3 PENUGASAN (GURU MAPEL, WALI KELAS, GURU PIKET)
 */
export function exportTeacherTemplateExcel(): void {
  const sample = [
    {
      'No': 1,
      'Nama Lengkap Guru': 'SURYADI',
      'NUPTK': '-',
      'Penugasan Guru Mapel (Ya/Tidak)': 'Ya',
      'Mata Pelajaran Utama': 'Pendidikan Pancasila & PKN',
      'Rombel / Kelas Ajar': '9A, 9B',
      'Beban Jam (JP/Minggu)': 6,
      'Penugasan Wali Kelas (Kelas / -)': '9A',
      'Penugasan Guru Piket (Ya/Tidak)': 'Tidak',
      'Hari Tugas Piket (Opsional)': '-',
      'Nomor WhatsApp': '085212587750',
      'Username Akun': 'suryadi',
      'Password Akun': 'edudigital',
      'Status': 'Aktif'
    },
    {
      'No': 2,
      'Nama Lengkap Guru': 'Hj. Siti Maryam, S.Pd.',
      'NUPTK': '197509182005012006',
      'Penugasan Guru Mapel (Ya/Tidak)': 'Ya',
      'Mata Pelajaran Utama': 'Ilmu Pengetahuan Alam (IPA)',
      'Rombel / Kelas Ajar': '7A, 7B',
      'Beban Jam (JP/Minggu)': 8,
      'Penugasan Wali Kelas (Kelas / -)': '7A',
      'Penugasan Guru Piket (Ya/Tidak)': 'Ya',
      'Hari Tugas Piket (Opsional)': 'Senin',
      'Nomor WhatsApp': '08123456701',
      'Username Akun': 'guru.ipa',
      'Password Akun': 'edudigital',
      'Status': 'Aktif'
    },
    {
      'No': 3,
      'Nama Lengkap Guru': 'Asep Saepudin, S.Pd.',
      'NUPTK': '198103142008011009',
      'Penugasan Guru Mapel (Ya/Tidak)': 'Ya',
      'Mata Pelajaran Utama': 'Matematika',
      'Rombel / Kelas Ajar': '8A, 8B, 9A, 9B',
      'Beban Jam (JP/Minggu)': 24,
      'Penugasan Wali Kelas (Kelas / -)': '8A',
      'Penugasan Guru Piket (Ya/Tidak)': 'Tidak',
      'Hari Tugas Piket (Opsional)': '-',
      'Nomor WhatsApp': '08123456702',
      'Username Akun': 'guru.matematika',
      'Password Akun': 'edudigital',
      'Status': 'Aktif'
    },
    {
      'No': 4,
      'Nama Lengkap Guru': 'Dedi Kurniawan, S.Pd.',
      'NUPTK': '199002152014021003',
      'Penugasan Guru Mapel (Ya/Tidak)': 'Ya',
      'Mata Pelajaran Utama': 'Bahasa Inggris',
      'Rombel / Kelas Ajar': '7A, 7B, 8A, 8B',
      'Beban Jam (JP/Minggu)': 16,
      'Penugasan Wali Kelas (Kelas / -)': '7B',
      'Penugasan Guru Piket (Ya/Tidak)': 'Ya',
      'Hari Tugas Piket (Opsional)': 'Selasa, Kamis',
      'Nomor WhatsApp': '08123456704',
      'Username Akun': 'guru.inggris',
      'Password Akun': 'edudigital',
      'Status': 'Aktif'
    },
    {
      'No': 5,
      'Nama Lengkap Guru': 'Petugas Piket Gerbang Khusus',
      'NUPTK': '-',
      'Penugasan Guru Mapel (Ya/Tidak)': 'Tidak',
      'Mata Pelajaran Utama': '-',
      'Rombel / Kelas Ajar': '-',
      'Beban Jam (JP/Minggu)': 0,
      'Penugasan Wali Kelas (Kelas / -)': '-',
      'Penugasan Guru Piket (Ya/Tidak)': 'Ya',
      'Hari Tugas Piket (Opsional)': 'Senin, Rabu, Jumat',
      'Nomor WhatsApp': '081234567809',
      'Username Akun': 'piket.khusus',
      'Password Akun': 'edudigital',
      'Status': 'Aktif'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sample);
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 32 }, // Nama Lengkap
    { wch: 22 }, // NUPTK
    { wch: 28 }, // Penugasan Guru Mapel
    { wch: 30 }, // Mapel Utama
    { wch: 24 }, // Rombel Kelas
    { wch: 22 }, // Beban Jam (JP)
    { wch: 28 }, // Penugasan Wali Kelas
    { wch: 28 }, // Penugasan Guru Piket
    { wch: 26 }, // Hari Tugas Piket
    { wch: 20 }, // No WA
    { wch: 20 }, // Username
    { wch: 18 }, // Password
    { wch: 14 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Import Guru');
  XLSX.writeFile(workbook, 'Template_Import_Data_Guru_SMP_PGRI_1_CIKADU.xlsx');
}

/**
 * 9. EKSPOR DAFTAR LENGKAP TENAGA PENDIDIK KE EXCEL
 */
export function exportTeacherListExcel(teachers: any[], schoolConfig: SchoolConfig): void {
  const rows = teachers.map((t, idx) => {
    const classes = Array.from(new Set(t.penugasanMapel?.flatMap((p: any) => p.kelas) || [])).join(', ');
    const totalJP = t.penugasanMapel?.reduce((sum: number, p: any) => sum + (p.bebanJam || 0), 0) || t.totalJamMengajar || 0;
    const isMapel = t.isGuruMapel !== false && (Boolean(t.mapel) || (t.penugasanMapel && t.penugasanMapel.length > 0));
    const isWali = Boolean(t.isWaliKelas) && Boolean(t.waliKelas && t.waliKelas !== '-' && t.waliKelas !== '');
    const isPiket = Boolean(t.isGuruPiket) || t.role === 'piket';
    const piketDaysStr = t.piketDays && t.piketDays.length > 0 ? t.piketDays.join(', ') : (isPiket ? 'Aktif' : '-');

    return {
      'No': idx + 1,
      'Nama Lengkap Guru': t.nama,
      'NUPTK': t.nip || '-',
      'Guru Mapel': isMapel ? 'Ya' : 'Tidak',
      'Mata Pelajaran': isMapel ? (t.mapel || (t.penugasanMapel?.[0]?.mapel || '-')) : '-',
      'Rombel / Kelas Ajar': isMapel ? (classes || '-') : '-',
      'Total Beban JP': totalJP,
      'Wali Kelas': isWali ? `Kelas ${t.waliKelas}` : '-',
      'Guru Piket': isPiket ? 'Ya' : 'Tidak',
      'Hari Piket': piketDaysStr,
      'Nomor WhatsApp': t.nomorHp || '-',
      'Hak Akses': t.role === 'admin' ? 'Administrator' : t.role === 'piket' ? 'Petugas Piket' : 'Guru',
      'Username Akun': t.username,
      'Status Kepegawaian': t.status || 'Aktif'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 22 },
    { wch: 14 },
    { wch: 30 },
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');
  const cleanSchool = schoolConfig.namaSekolah.replace(/\s+/g, '_');
  XLSX.writeFile(workbook, `Daftar_Guru_${cleanSchool}.xlsx`);
}
