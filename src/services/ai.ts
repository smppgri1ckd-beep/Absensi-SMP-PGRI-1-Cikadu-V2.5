import { AttendanceRecord, Student } from '../types';

export interface AttendanceAiAnalysisResult {
  ringkasanEksekutif: string;
  skorKedisiplinan: number;
  predikatKedisiplinan: string;
  rekomendasiSekolah: string[];
  analisisPerKelas: {
    kelas: string;
    tingkatKehadiran: string;
    catatan: string;
  }[];
  rekomendasiSiswa: {
    nisn: string;
    nama: string;
    kelas: string;
    statusMasalah: string;
    urgensi: string;
    akarMasalahDugaan: string;
    langkahPenanganan: string;
    draftPesanWhatsAppOrtu: string;
  }[];
}

export class AiService {
  /**
   * Request server-side AI analysis for attendance data
   */
  static async analyzeAttendance(
    schoolName: string,
    date: string,
    students: Student[],
    records: AttendanceRecord[]
  ): Promise<AttendanceAiAnalysisResult> {
    const todayRecords = records.filter((r) => r.tanggal === date);
    const hadir = todayRecords.filter((r) => r.status === 'Hadir').length;
    const terlambat = todayRecords.filter((r) => r.status === 'Terlambat').length;
    const izin = todayRecords.filter((r) => r.status === 'Izin').length;
    const sakit = todayRecords.filter((r) => r.status === 'Sakit').length;
    const alpa = students.length - (hadir + terlambat + izin + sakit);

    // Group by class
    const classes = Array.from(new Set(students.map((s) => s.kelas))).sort();
    const classSummaries = classes.map((cls) => {
      const clsStudents = students.filter((s) => s.kelas === cls);
      const clsRecords = todayRecords.filter((r) => r.kelas === cls);
      const clsHadir = clsRecords.filter((r) => r.status === 'Hadir' || r.status === 'Terlambat').length;
      const pct = clsStudents.length ? Math.round((clsHadir / clsStudents.length) * 100) : 0;
      return {
        kelas: cls,
        totalSiswa: clsStudents.length,
        hadir: clsHadir,
        persen: `${pct}%`,
      };
    });

    // Detect students needing attention (Late or Alpa or high absence history)
    const atRiskMap = new Map<string, { nisn: string; nama: string; kelas: string; masalah: string; statusHariIni: string }>();

    // Today's late
    todayRecords.filter((r) => r.status === 'Terlambat').forEach((r) => {
      atRiskMap.set(r.nisn, {
        nisn: r.nisn,
        nama: r.nama,
        kelas: r.kelas,
        masalah: 'Terlambat pada sesi ' + r.sesi + (r.catatan ? ` (${r.catatan})` : ''),
        statusHariIni: 'Terlambat',
      });
    });

    // Today's absent / alpa
    students.forEach((s) => {
      const hasRec = todayRecords.some((r) => r.nisn === s.nisn);
      if (!hasRec) {
        atRiskMap.set(s.nisn, {
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          masalah: 'Tidak ada catatan presensi (Alpa)',
          statusHariIni: 'Alpa',
        });
      }
    });

    const atRiskStudents = Array.from(atRiskMap.values()).slice(0, 10);

    const response = await fetch('/api/ai/analyze-attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schoolName,
        date,
        totalStudents: students.length,
        stats: {
          hadir,
          terlambat,
          izin,
          sakit,
          alpa: alpa > 0 ? alpa : 0,
        },
        classSummaries,
        atRiskStudents,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || 'Gagal memproses analisis AI');
    }

    return json.data;
  }

  /**
   * Request server-side AI customized WhatsApp message
   */
  static async generateCustomWhatsApp(
    studentName: string,
    className: string,
    status: string,
    detail: string,
    schoolName: string
  ): Promise<string> {
    const response = await fetch('/api/ai/generate-wa-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentName,
        className,
        status,
        detail,
        schoolName,
      }),
    });

    if (!response.ok) {
      throw new Error('Gagal menghubungi AI service');
    }

    const json = await response.json();
    return json.message || '';
  }
}
