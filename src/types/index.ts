export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa';

export type UserRole = 'admin' | 'guru' | 'guru_piket' | 'kepala_sekolah' | 'orang_tua' | 'public';

export interface Student {
  id: string;
  nisn: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  parentName: string;
  parentPhone: string;
  address?: string;
  photoUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  className: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: AttendanceStatus;
  notes?: string;
  method: 'qr' | 'manual';
  photo?: string;
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  subject: string;
  phone: string;
  role: UserRole;
  password?: string;
}

export interface TeachingJournal {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  date: string;
  timeSlot: string;
  topic: string;
  presentCount: number;
  absentCount: number;
  notes?: string;
}

export interface StudentGrade {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  semester: 'Ganjil' | 'Genap';
  academicYear: string;
  tugas: number;
  uts: number;
  uas: number;
  finalScore: number;
  predicate: 'A' | 'B' | 'C' | 'D';
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  type: 'izin' | 'sakit';
  startDate: string;
  endDate: string;
  reason: string;
  parentPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  date: string;
  content: string;
  category: 'akademik' | 'kegiatan' | 'libur' | 'penting';
}
