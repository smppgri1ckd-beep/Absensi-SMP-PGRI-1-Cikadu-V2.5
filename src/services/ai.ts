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

    try {
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

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (networkError) {
      console.warn('AI endpoint call caught error, activating instant synthesis fallback:', networkError);
    }

    // Client-side instant synthesis fallback if server call or external service is unreachable
    const totalCount = Math.max(students.length, 1);
    const attendancePercentage = Math.round(((hadir + terlambat) / totalCount) * 100);
    const score = Math.min(100, Math.max(10, Math.round(((hadir + terlambat * 0.7) / totalCount) * 100)));
    let predikat = 'Baik';
    if (score >= 90) predikat = 'Sangat Baik';
    else if (score >= 75) predikat = 'Baik';
    else if (score >= 60) predikat = 'Cukup';
    else predikat = 'Perlu Perhatian Khusus';

    return {
      ringkasanEksekutif: `Tingkat kehadiran siswa ${schoolName} pada ${date} tercatat ${attendancePercentage}% dengan ${hadir} siswa hadir tepat waktu, ${terlambat} terlambat, dan ${izin + sakit} berhalangan dengan keterangan (izin/sakit). ${alpa > 0 ? `Terdapat ${alpa} siswa tanpa keterangan yang perlu dikonfirmasikan ke wali murid.` : 'Seluruh ketidakhadiran siswa tercatat dengan keterangan jelas.'}`,
      skorKedisiplinan: score,
      predikatKedisiplinan: predikat,
      rekomendasiSekolah: [
        `Optimalisasi pendampingan dan penjagaan di gerbang sekolah sebelum jam apel pagi dimulai untuk menekan angka ${terlambat} siswa terlambat.`,
        `Wali kelas dan guru piket segera melakukan konfirmasi kepada orang tua siswa yang belum memberikan surat izin atau kabar ketidakhadiran.`,
        `Berikan motivasi dan apresiasi bagi kelas-kelas dengan rekor ketepatan waktu apel pagi tertinggi.`
      ],
      analisisPerKelas: classSummaries.map((c) => ({
        kelas: c.kelas,
        tingkatKehadiran: c.persen,
        catatan: parseInt(c.persen) >= 90 
          ? `Kelas ${c.kelas} menunjukkan kedisiplinan luar biasa dengan kehadiran ${c.persen}.` 
          : `Perlu peningkatan tindak lanjut absensi untuk kelas ${c.kelas} (${c.persen}).`
      })),
      rekomendasiSiswa: atRiskStudents.map((s) => ({
        nisn: s.nisn,
        nama: s.nama,
        kelas: s.kelas,
        statusMasalah: s.masalah,
        urgensi: s.statusHariIni === 'Alpa' ? 'Tinggi' : 'Sedang',
        akarMasalahDugaan: s.statusHariIni === 'Terlambat' 
          ? 'Potensi kendala jarak transportasi atau pola bangun pagi.' 
          : 'Belum ada surat izin atau pemberitahuan dari orang tua.',
        langkahPenanganan: s.statusHariIni === 'Terlambat'
          ? 'Konseling suportif dan pemantauan waktu kedatangan apel berikutnya.'
          : 'Kirim konfirmasi via WhatsApp kepada orang tua siswa untuk mencatat alasan ketidakhadiran.',
        draftPesanWhatsAppOrtu: `Assalamu’alaikum Wr. Wb. / Selamat Pagi Bapak/Ibu Wali dari ${s.nama} (${s.kelas}), kami dari ${schoolName} menginformasikan catatan presensi ananda hari ini (${s.masalah}). Mohon konfirmasi atau koordinasi dengan wali kelas. Terima kasih.`
      }))
    };
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
    try {
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

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.message) {
          return json.message;
        }
      }
    } catch (e) {
      console.warn('AI WA generator fallback active:', e);
    }

    return `Assalamu’alaikum Wr. Wb. / Selamat Pagi Bapak/Ibu Wali dari *${studentName}* (${className}).\n\nKami dari pihak sekolah *${schoolName}* menginformasikan bahwa putra/putri Bapak/Ibu pada hari ini tercatat *${status}* (${detail || 'kehadiran apel'}).\n\nMohon konfirmasi atau koordinasi dengan Wali Kelas/Guru Piket apabila ada informasi yang perlu disampaikan. Terima kasih atas kerja samanya.\n\nSalam hormat,\n*Tim Ketertiban & Wali Kelas ${schoolName}*`;
  }
}
