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
