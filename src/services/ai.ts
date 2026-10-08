export interface AiAnalysisResult {
  ringkasanEksekutif: string;
  skorKedisiplinan: number;
  predikatKedisiplinan: string;
  rekomendasiSekolah: string[];
  analisisPerKelas?: { kelas: string; tingkatKehadiran: string; catatan: string }[];
  rekomendasiSiswa?: {
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

export const analyzeAttendanceWithAi = async (data: {
  schoolName: string;
  date: string;
  totalStudents: number;
  stats: { hadir: number; terlambat: number; izin: number; sakit: number; alpa: number };
  classSummaries: Record<string, { hadir: number; total: number }>;
  atRiskStudents: { nisn: string; name: string; className: string; status: string; notes?: string }[];
}): Promise<AiAnalysisResult> => {
  try {
    const res = await fetch('/api/ai/analyze-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const result = await res.json();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Gagal memproses hasil');
  } catch (err: unknown) {
    console.warn('Fallback to local intelligence calculation due to:', err);
    // Graceful offline fallback
    const { stats, totalStudents } = data;
    const hadirPct = Math.round(((stats.hadir + stats.terlambat) / Math.max(1, totalStudents)) * 100);
    return {
      ringkasanEksekutif: `Tingkat kehadiran siswa hari ini mencapai ${hadirPct}%. Tingkat kedisiplinan secara umum terpantau ${hadirPct >= 90 ? 'sangat tertib' : 'perlu penguatan'}, dengan ${stats.terlambat} siswa tercatat terlambat dan ${stats.alpa} siswa alpa.`,
      skorKedisiplinan: Math.min(100, Math.max(50, hadirPct - (stats.terlambat * 2))),
      predikatKedisiplinan: hadirPct >= 92 ? 'Sangat Baik' : hadirPct >= 80 ? 'Baik' : 'Perlu Perhatian',
      rekomendasiSekolah: [
        'Petugas piket melakukan pembinaan simpatik pada siswa yang datang lewat pukul 07.00 WIB.',
        'Wali kelas segera mengirimkan konfirmasi via WhatsApp kepada orang tua siswa yang tidak hadir tanpa keterangan (alpa).',
        'Berikan apresiasi pada kelas dengan kehadiran 100% saat apel pagi berikutnya.'
      ],
      rekomendasiSiswa: data.atRiskStudents.map(s => ({
        nisn: s.nisn,
        nama: s.name,
        kelas: s.className,
        statusMasalah: s.status,
        urgensi: s.status === 'alpa' ? 'Tinggi' : 'Sedang',
        akarMasalahDugaan: s.notes || 'Kendala transportasi atau penyesuaian jam bangun pagi',
        langkahPenanganan: 'Pendekatan wali kelas dan dialog suportif dengan orang tua',
        draftPesanWhatsAppOrtu: `Yth. Bapak/Ibu Wali dari ${s.name} (${s.className}), menginformasikan bahwa ananda hari ini tercatat ${s.status}. Mohon konfirmasi kesehatan dan keberadaan ananda demi keselamatan bersama. Terima kasih - SMP PGRI 1 Cikadu`
      }))
    };
  }
};

export const generateWhatsAppDraft = async (params: {
  studentName: string;
  className: string;
  status: string;
  detail?: string;
  parentName?: string;
  schoolName?: string;
}): Promise<string> => {
  try {
    const res = await fetch('/api/ai/generate-wa-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (data.success && data.message) {
      return data.message;
    }
  } catch (err) {
    console.warn('Using local WA template generator', err);
  }

  return `*PEMBERITAHUAN PRESENSI SMP PGRI 1 CIKADU*\n\n` +
    `Yth. Bapak/Ibu Orang Tua/Wali dari ananda *${params.studentName}* (Kelas ${params.className}),\n\n` +
    `Kami menginformasikan bahwa pada hari ini ananda tercatat *${params.status.toUpperCase()}* ${params.detail ? `(${params.detail})` : ''}.\n\n` +
    `Mohon kerjasama Bapak/Ibu untuk terus memotivasi ananda hadir tepat waktu dan aktif dalam kegiatan belajar di sekolah.\n\n` +
    `Hormat kami,\n` +
    `_Wali Kelas & Guru Piket SMP PGRI 1 Cikadu_`;
};
