import React from 'react';
import { 
  X, 
  Printer, 
  Award, 
  FileText, 
  Calendar, 
  User, 
  School,
  Download
} from 'lucide-react';
import { Student, StudentGradeItem, SchoolConfig, AttendanceRecord } from '../types';
import { SchoolLogo } from '../assets/schoolLogo';

interface StudentReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  grades: StudentGradeItem[];
  schoolConfig: SchoolConfig;
  attendanceRecords: AttendanceRecord[];
}

export const StudentReportCardModal: React.FC<StudentReportCardModalProps> = ({
  isOpen,
  onClose,
  student,
  grades,
  schoolConfig,
  attendanceRecords,
}) => {
  if (!isOpen) return null;

  // Filter attendance for this student
  const studentRecords = attendanceRecords.filter((r) => r.nisn === student.nisn);
  const totalPresensi = studentRecords.length;
  const hadirCount = studentRecords.filter((r) => r.status === 'Hadir').length;
  const terlambatCount = studentRecords.filter((r) => r.status === 'Terlambat').length;
  const sakitCount = studentRecords.filter((r) => r.status === 'Sakit').length;
  const izinCount = studentRecords.filter((r) => r.status === 'Izin').length;
  const alpaCount = studentRecords.filter((r) => r.status === 'Alpa').length;

  const efektifHadir = hadirCount + terlambatCount;
  const attendanceRate = totalPresensi > 0 ? Math.round((efektifHadir / totalPresensi) * 100) : 100;

  // Group grades by Subject
  const studentGrades = grades.filter((g) => g.nisn === student.nisn);
  const subjectsMap: Record<string, { tugas: number[]; uh: number[]; uts: number[]; uas: number[] }> = {};

  studentGrades.forEach((g) => {
    if (!subjectsMap[g.mapel]) {
      subjectsMap[g.mapel] = { tugas: [], uh: [], uts: [], uas: [] };
    }
    if (g.jenisPenilaian === 'Tugas' || g.jenisPenilaian === 'Praktikum') {
      subjectsMap[g.mapel].tugas.push(g.nilai);
    } else if (g.jenisPenilaian === 'Ulangan Harian') {
      subjectsMap[g.mapel].uh.push(g.nilai);
    } else if (g.jenisPenilaian === 'UTS') {
      subjectsMap[g.mapel].uts.push(g.nilai);
    } else if (g.jenisPenilaian === 'UAS') {
      subjectsMap[g.mapel].uas.push(g.nilai);
    }
  });

  // Calculate subject rows
  const subjectRows = Object.keys(subjectsMap).map((mapelName, idx) => {
    const item = subjectsMap[mapelName];
    const avgTugas = item.tugas.length ? Math.round(item.tugas.reduce((a, b) => a + b, 0) / item.tugas.length) : '-';
    const avgUh = item.uh.length ? Math.round(item.uh.reduce((a, b) => a + b, 0) / item.uh.length) : '-';
    const avgUts = item.uts.length ? Math.round(item.uts.reduce((a, b) => a + b, 0) / item.uts.length) : '-';
    const avgUas = item.uas.length ? Math.round(item.uas.reduce((a, b) => a + b, 0) / item.uas.length) : '-';

    // Calculate final weighted score
    const numbers = [
      typeof avgTugas === 'number' ? avgTugas : null,
      typeof avgUh === 'number' ? avgUh : null,
      typeof avgUts === 'number' ? avgUts : null,
      typeof avgUas === 'number' ? avgUas : null,
    ].filter((n): n is number => n !== null);

    const nilaiAkhir = numbers.length ? Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length) : 85;

    let predikat = 'B';
    let deskripsi = 'Mencapai kompetensi pembelajaran dengan baik.';
    if (nilaiAkhir >= 90) {
      predikat = 'A';
      deskripsi = 'Sangat baik dalam memahami dan menerapkan kompetensi.';
    } else if (nilaiAkhir >= 80) {
      predikat = 'B';
      deskripsi = 'Baik dalam memahami materi pokok dan aktif berpartisipasi.';
    } else if (nilaiAkhir >= 70) {
      predikat = 'C';
      deskripsi = 'Cukup memahami materi, perlu bimbingan pada latihan lanjutan.';
    } else {
      predikat = 'D';
      deskripsi = 'Perlu bimbingan dan remedial intensif pada materi dasar.';
    }

    return {
      no: idx + 1,
      mapel: mapelName,
      tugas: avgTugas,
      uh: avgUh,
      uts: avgUts,
      uas: avgUas,
      nilaiAkhir,
      predikat,
      deskripsi,
    };
  });

  // Calculate overall average
  const totalScores = subjectRows.map((s) => s.nilaiAkhir);
  const overallAvg = totalScores.length ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-auto animate-in zoom-in-95"
      >
        {/* Modal Top Bar (Non-Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-sm sm:text-base">
              Rapor Capaian Belajar & Perkembangan Siswa
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rapor / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Wrapper */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:m-0 print:overflow-visible font-serif">
          
          {/* Official Letterhead (KOP SEKOLAH) */}
          <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center gap-4">
            <div className="w-20 h-20 shrink-0 flex items-center justify-center">
              <SchoolLogo src={schoolConfig.logoUrl} className="w-18 h-18 object-contain" />
            </div>
            <div className="flex-1 text-center font-sans">
              <h4 className="text-xs uppercase tracking-widest font-bold text-slate-600">
                Pemerintah Daerah Provinsi Jawa Barat • Dinas Pendidikan
              </h4>
              <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                {schoolConfig.namaSekolah}
              </h2>
              <p className="text-xs text-slate-700 font-medium">
                NPSN: {schoolConfig.npsn} • {schoolConfig.alamat}
              </p>
              <p className="text-[11px] text-slate-500">
                Kontak: {schoolConfig.kontak}
              </p>
            </div>
            <div className="w-20 h-20 shrink-0 hidden sm:block"></div>
          </div>

          {/* Title */}
          <div className="text-center mb-6 font-sans">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-wider underline text-slate-900">
              LAPORAN HASIL BELAJAR SISWA (RAPOR SISIPAN)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Semester Ganjil • Tahun Ajaran 2026/2027
            </p>
          </div>

          {/* Student Biodata Information */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-300 bg-slate-50/50 mb-6 text-xs font-sans">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Nama Siswa</span>
                <span className="font-extrabold text-slate-900">: {student.nama}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Nomor Induk / NISN</span>
                <span className="font-mono font-bold text-slate-900">: {student.nisn}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Jenis Kelamin</span>
                <span className="font-semibold text-slate-900">: {student.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Kelas / Rombel</span>
                <span className="font-bold text-slate-900">: Kelas {student.kelas}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Wali Kelas</span>
                <span className="font-semibold text-slate-900">: {schoolConfig.namaPetugasPiket || 'Wali Kelas'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600">Nilai Rata-rata</span>
                <span className="font-mono font-black text-blue-700">: {overallAvg} / 100</span>
              </div>
            </div>
          </div>

          {/* Table: Nilai Mata Pelajaran */}
          <div className="mb-6 font-sans">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">
              A. Capaian Nilai Akademik & Keterampilan
            </h4>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                <tr>
                  <th className="border border-slate-300 py-2 px-2 text-center w-8">No</th>
                  <th className="border border-slate-300 py-2 px-3 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-300 py-2 px-2 text-center w-14">Tugas</th>
                  <th className="border border-slate-300 py-2 px-2 text-center w-14">UH</th>
                  <th className="border border-slate-300 py-2 px-2 text-center w-14">UTS</th>
                  <th className="border border-slate-300 py-2 px-2 text-center w-14">UAS</th>
                  <th className="border border-slate-300 py-2 px-2 text-center w-14">Akhir</th>
                  <th className="border border-slate-300 py-2 px-2 text-center w-12">Predikat</th>
                  <th className="border border-slate-300 py-2 px-3 text-left">Deskripsi Capaian</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-slate-300 py-4 text-center text-slate-400">
                      Belum ada nilai yang diinputkan untuk siswa ini.
                    </td>
                  </tr>
                ) : (
                  subjectRows.map((row) => (
                    <tr key={row.no} className="hover:bg-slate-50/50">
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">{row.no}</td>
                      <td className="border border-slate-300 py-2 px-3 font-bold text-slate-900">{row.mapel}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">{row.tugas}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">{row.uh}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">{row.uts}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono">{row.uas}</td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-mono font-black text-slate-900 bg-slate-50">
                        {row.nilaiAkhir}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-center font-bold text-blue-700">
                        {row.predikat}
                      </td>
                      <td className="border border-slate-300 py-2 px-3 text-[11px] text-slate-700 leading-snug">
                        {row.deskripsi}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Section: Rekapitulasi Kehadiran Siswa */}
          <div className="mb-6 font-sans">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">
              B. Rekapitulasi Presensi & Disiplin Belajar
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Hadir</span>
                <span className="text-base font-black font-mono text-emerald-700">{hadirCount}</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Terlambat</span>
                <span className="text-base font-black font-mono text-amber-700">{terlambatCount}</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Sakit</span>
                <span className="text-base font-black font-mono text-rose-700">{sakitCount}</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Izin</span>
                <span className="text-base font-black font-mono text-blue-700">{izinCount}</span>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Alpa</span>
                <span className="text-base font-black font-mono text-slate-700">{alpaCount}</span>
              </div>
              <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="block text-[10px] uppercase font-bold text-blue-800">Persentase</span>
                <span className="text-base font-black font-mono text-blue-900">{attendanceRate}%</span>
              </div>
            </div>
          </div>

          {/* Section: Catatan & Refleksi Wali Kelas */}
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/50 mb-8 text-xs font-sans">
            <h4 className="font-bold uppercase tracking-wider text-slate-800 mb-1">
              Catatan Wali Kelas:
            </h4>
            <p className="text-slate-700 leading-relaxed italic">
              "Ananda {student.nama} menunjukkan disiplin kehadiran yang sangat memuaskan ({attendanceRate}%). Tingkatkan keaktifan dalam diskusi kelompok serta ketelitian pengerjaan tugas mandiri agar prestasi akademik terus meningkat."
            </p>
          </div>

          {/* Signature Block (Tanda Tangan Resmi) */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs font-sans pt-4 no-break-inside">
            <div className="space-y-16">
              <p className="text-slate-600 font-semibold">Mengetahui,<br />Orang Tua / Wali Siswa</p>
              <div className="border-b border-slate-400 mx-auto w-36"></div>
            </div>

            <div className="space-y-16">
              <p className="text-slate-600 font-semibold">Cikadu, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Wali Kelas {student.kelas}</p>
              <div>
                <p className="font-bold underline text-slate-900">{schoolConfig.namaPetugasPiket || 'Wali Kelas'}</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. {schoolConfig.nipPetugasPiket || '-'}</p>
              </div>
            </div>

            <div className="space-y-16">
              <p className="text-slate-600 font-semibold">Kepala Sekolah<br />{schoolConfig.namaSekolah}</p>
              <div>
                <p className="font-bold underline text-slate-900">{schoolConfig.namaKepsek}</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. {schoolConfig.nipKepsek}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between no-print shrink-0">
          <p className="text-xs text-slate-500">
            *Dokumen ini merupakan Rekapitulasi Rapor Sisipan resmi dari {schoolConfig.namaSekolah}.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
