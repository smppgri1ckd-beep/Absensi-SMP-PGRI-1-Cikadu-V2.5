import * as XLSX from 'xlsx';
import { AttendanceRecord, Student } from '../types';

export const exportAttendanceToExcel = (records: AttendanceRecord[], title: string = 'Rekap_Presensi_SMP_PGRI_1_Cikadu') => {
  const data = records.map((r, idx) => ({
    'No': idx + 1,
    'Tanggal': r.date,
    'Jam': r.time,
    'NISN': r.nisn,
    'Nama Siswa': r.studentName,
    'Kelas': r.className,
    'Status': r.status.toUpperCase(),
    'Metode': r.method.toUpperCase(),
    'Keterangan': r.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Presensi');
  XLSX.writeFile(workbook, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportStudentsToExcel = (students: Student[]) => {
  const data = students.map((s, idx) => ({
    'No': idx + 1,
    'NISN': s.nisn,
    'Nama Lengkap': s.name,
    'Kelas': s.className,
    'Jenis Kelamin': s.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
    'Nama Orang Tua': s.parentName,
    'No WhatsApp Ortu': s.parentPhone,
    'Alamat': s.address || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
  XLSX.writeFile(workbook, `Data_Siswa_SMP_PGRI_1_Cikadu_${new Date().toISOString().split('T')[0]}.xlsx`);
};
