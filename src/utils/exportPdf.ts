import { jsPDF } from 'jspdf';
import { SchoolConfig, AttendanceRecord, Student, TeachingJournal, TeacherUser, KalenderHeb } from '../types';
import { SCHOOL_LOGO_PNG_DATA_URL } from '../assets/schoolLogo';
import { generateQrDataUrl } from './qr';

/**
 * Standard Kop Surat Resmi SMP PGRI 1 Cikadu
 * Sesuai format kedinasan resmi yayasan & sekolah
 */
function drawOfficialKop(
  doc: jsPDF,
  schoolConfig: SchoolConfig,
  isLandscape = false
): number {
  const pageWidth = isLandscape ? 297 : 210;
  const centerX = pageWidth / 2;
  const leftX = 12;
  const rightX = pageWidth - 12;

  // Logo Sekolah di sebelah kiri
  const logoData = schoolConfig.logoUrl || SCHOOL_LOGO_PNG_DATA_URL;
  if (logoData) {
    try {
      const logoX = isLandscape ? 16 : 14;
      const logoY = 8;
      const logoSize = 22;
      doc.addImage(logoData, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      console.warn('Gagal memuat logo sekolah di PDF:', e);
    }
  }

  // Teks Kop Surat Tengah
  doc.setTextColor(0, 0, 0);

  // Baris 1: Yayasan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    'PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN',
    centerX,
    12.5,
    { align: 'center' }
  );

  // Baris 2: Cabang Yayasan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(
    'PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR',
    centerX,
    17,
    { align: 'center' }
  );

  // Baris 3: Nama Satuan Pendidikan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU', centerX, 23, { align: 'center' });

  // Baris 4: Alamat Lengkap
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    schoolConfig.alamat || 'Kp. Koleberes Blok D RT. 04 RW. 09 Desa Cikadu Kec. Cikadu Kab. Cianjur',
    centerX,
    27.5,
    { align: 'center' }
  );

  // Baris 5: Kontak & Identitas Resmi
  const npsn = schoolConfig.npsn || '69919136';
  const kontak = schoolConfig.kontak || '0852 1258 7750';
  const email = schoolConfig.email || 'smp.pgri1ckd@gmail.com';
  const kontakStr = kontak.includes('Telp') ? kontak : `Telp: ${kontak}`;
  doc.text(
    `${kontakStr} | e-mail: ${email} | NPSN: ${npsn}`,
    centerX,
    31.5,
    { align: 'center' }
  );

  // Garis Pemisah Kop Resmi (Double Line: Garis Tebal 0.8mm + Garis Tipis 0.25mm)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(leftX, 34.2, rightX, 34.2);
  doc.setLineWidth(0.25);
  doc.line(leftX, 35.2, rightX, 35.2);

  return 41;
}

/**
 * Standard Lembar Pengesahan / Tanda Tangan
 * Kiri: Kepala Sekolah (Mengetahui)
 * Kanan: Guru Piket / Petugas / Guru Mapel dengan Titimangsa (Cianjur, Tanggal)
 */
function drawSignatures(
  doc: jsPDF,
  startY: number,
  schoolConfig: SchoolConfig,
  rightTitle = 'Guru Piket,',
  rightName = schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
  rightNip = schoolConfig.nipPetugasPiket || '-',
  isLandscape = false,
  customDateStr?: string
): void {
  const pageWidth = isLandscape ? 297 : 210;
  const leftX = isLandscape ? 35 : 25;
  const rightX = isLandscape ? 215 : 142;

  // Tanggal Titimangsa
  let dateStr = customDateStr;
  if (!dateStr) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  }
  const kota = schoolConfig.kota || 'Cianjur';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  // Kolom Kiri: Kepala Sekolah
  doc.text('Mengetahui,', leftX, startY);
  doc.text('Kepala Sekolah,', leftX, startY + 4.5);

  const kepsekName = (schoolConfig.namaKepsek || 'CUNCUN MUHLISOH, S.Pd.').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.text(kepsekName, leftX, startY + 23);

  doc.setFont('helvetica', 'normal');
  const kepsekNip = schoolConfig.nipKepsek && schoolConfig.nipKepsek !== '-' ? schoolConfig.nipKepsek : '-';
  doc.text(`NUPTK: ${kepsekNip}`, leftX, startY + 27.5);

  // Kolom Kanan: Guru Piket / Guru Pengampu
  doc.text(`${kota}, ${dateStr}`, rightX, startY);
  doc.text(rightTitle, rightX, startY + 4.5);

  const rName = (rightName || 'AI SITI ROSITA').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.text(rName, rightX, startY + 23);

  doc.setFont('helvetica', 'normal');
  const rNip = rightNip && rightNip !== '-' ? rightNip : '-';
  doc.text(`NUPTK: ${rNip}`, rightX, startY + 27.5);
}

/**
 * 1. LAPORAN REKAPITULASI KEHADIRAN SISWA (PDF PORTRAIT)
 * Persis seperti contoh resmi: No | NISN | Nama Siswa | L/P | Kelas | Pagi | Siang | Total | % Hadir
 */
export function generateApelRecapPdf(
  students: Student[],
  records: AttendanceRecord[],
  sessionFilter: string, // 'Semua' | 'Pagi' | 'Siang'
  bulanNama: string,
  tahun: number,
  totalHeb: number,
  schoolConfig: SchoolConfig,
  kelasFilter = 'Semua',
  dateRange?: { startDate: string; endDate: string }
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const filteredStudents = (kelasFilter === 'Semua'
    ? students
    : students.filter((s) => s.kelas === kelasFilter)
  ).sort((a, b) => a.nama.localeCompare(b.nama));

  const monthIdxMap: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
  };
  const mm = bulanNama ? (monthIdxMap[bulanNama.toLowerCase()] || '01') : '01';
  const monthPrefix = `${tahun}-${mm}`;

  // Tentukan rentang tanggal
  const startDate = dateRange?.startDate || `${tahun}-${mm}-01`;
  const endDate = dateRange?.endDate || `${tahun}-${mm}-${new Date(tahun, parseInt(mm, 10), 0).getDate()}`;

  // Filter records: Apel harian (pagi & siang)
  const apelRecords = records.filter((r) => {
    const isApel = r.kategori === 'APEL' || (!r.kategori && !r.id.startsWith('PRESENSI_KBM_') && !r.mapel);
    if (!isApel) return false;
    if (r.tanggal < startDate || r.tanggal > endDate) return false;
    if (sessionFilter !== 'Semua' && r.sesi !== sessionFilter) return false;
    return true;
  });

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL UTAMA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN REKAPITULASI KEHADIRAN SISWA', 105, y, { align: 'center' });

  // SUBTITEL METADATA
  const kelasLabel = kelasFilter === 'Semua' ? 'SEMUA KELAS' : (kelasFilter.startsWith('KELAS') ? kelasFilter : `KELAS ${kelasFilter}`);
  const targetSesi = totalHeb * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Periode: ${startDate} s/d ${endDate}  |  Kelas: ${kelasLabel}  |  Hari Efektif: ${totalHeb} Hari (${targetSesi} Sesi)`,
    105,
    y + 4.8,
    { align: 'center' }
  );

  y += 10;

  // DEFINISI KOLOM TABEL (Total lebar: 186mm, Margin kiri 12mm, Kanan 198mm)
  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'NISN', width: 22, align: 'center' as const },
    { title: 'Nama Siswa', width: 56, align: 'left' as const },
    { title: 'L/P', width: 8, align: 'center' as const },
    { title: 'Kelas', width: 22, align: 'center' as const },
    { title: 'Pagi', width: 18, align: 'center' as const },
    { title: 'Siang', width: 18, align: 'center' as const },
    { title: 'Total', width: 18, align: 'center' as const },
    { title: '% Hadir', width: 16, align: 'center' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;
  const rowHeight = 5.8;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 2;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (filteredStudents.length === 0) {
    const totalW = cols.reduce((acc, c) => acc + c.width, 0);
    doc.rect(startX, y, totalW, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Tidak ada data siswa pada kelas yang dipilih.', startX + totalW / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    filteredStudents.forEach((s, idx) => {
      if (y + rowHeight > 255) {
        doc.addPage();
        y = 20;
        drawTableHeader(y);
        y += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      const sRecords = apelRecords.filter((r) => r.nisn === s.nisn);
      const pagiCount = sRecords.filter((r) => r.sesi === 'Pagi' && (r.status === 'Hadir' || r.status === 'Terlambat')).length;
      const siangCount = sRecords.filter((r) => r.sesi === 'Siang' && r.status === 'Hadir').length;
      const totalSesi = pagiCount + siangCount;
      const persentase = targetSesi > 0 ? Math.min(100, Math.round((totalSesi / targetSesi) * 100)) : 0;

      const kelasVal = s.kelas.startsWith('KELAS') ? s.kelas : `KELAS ${s.kelas}`;
      const rowValues = [
        String(idx + 1),
        s.nisn,
        s.nama.toUpperCase(),
        s.jk || 'L',
        kelasVal,
        `${pagiCount} Hadir`,
        `${siangCount} Hadir`,
        `${totalSesi} Sesi`,
        `${persentase}%`,
      ];

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      let colX = startX;
      cols.forEach((c, cIdx) => {
        doc.rect(colX, y, c.width, rowHeight);
        doc.setTextColor(0, 0, 0);

        let val = rowValues[cIdx];
        if (c.align === 'left' && val.length > 30) {
          val = val.substring(0, 28) + '..';
        }

        const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
        doc.text(val, textX, y + 4.1, { align: c.align });
        colX += c.width;
      });

      y += rowHeight;
    });
  }

  // LEMBAR PENGESAHAN / TANDA TANGAN
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  drawSignatures(
    doc,
    y,
    schoolConfig,
    'Guru Piket,',
    schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
    schoolConfig.nipPetugasPiket || '-',
    false,
    endDate
  );

  doc.save(`Laporan_Rekapitulasi_Kehadiran_${kelasLabel.replace(/\s+/g, '_')}_${startDate}.pdf`);
}

/**
 * 2. LAPORAN DAFTAR HADIR HARIAN SISWA (PDF PORTRAIT)
 */
export function generateDailyAttendancePdf(
  records: AttendanceRecord[],
  tanggal: string,
  schoolConfig: SchoolConfig,
  kelasFilter = 'Semua'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const filtered = (kelasFilter === 'Semua' 
    ? records 
    : records.filter((r) => r.kelas === kelasFilter)
  ).sort((a, b) => a.nama.localeCompare(b.nama));

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN DAFTAR HADIR HARIAN SISWA', 105, y, { align: 'center' });

  const kelasLabel = kelasFilter === 'Semua' ? 'SEMUA KELAS' : (kelasFilter.startsWith('KELAS') ? kelasFilter : `KELAS ${kelasFilter}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Tanggal: ${tanggal}  |  Kelas: ${kelasLabel}  |  Total Terdata: ${filtered.length} Siswa`,
    105,
    y + 4.8,
    { align: 'center' }
  );

  y += 10;

  // TABEL BERKISI RESMI
  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'Waktu', width: 14, align: 'center' as const },
    { title: 'NISN', width: 22, align: 'center' as const },
    { title: 'Nama Siswa', width: 52, align: 'left' as const },
    { title: 'L/P', width: 8, align: 'center' as const },
    { title: 'Kelas', width: 22, align: 'center' as const },
    { title: 'Sesi', width: 16, align: 'center' as const },
    { title: 'Status', width: 22, align: 'center' as const },
    { title: 'Keterangan', width: 22, align: 'left' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;
  const rowHeight = 5.8;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (filtered.length === 0) {
    const totalW = cols.reduce((acc, c) => acc + c.width, 0);
    doc.rect(startX, y, totalW, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Belum ada rekaman presensi pada tanggal dan kelas yang dipilih.', startX + totalW / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    filtered.forEach((r, idx) => {
      if (y + rowHeight > 255) {
        doc.addPage();
        y = 20;
        drawTableHeader(y);
        y += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      const kelasVal = r.kelas.startsWith('KELAS') ? r.kelas : `KELAS ${r.kelas}`;
      const note = r.catatan ? (r.catatan.length > 14 ? r.catatan.substring(0, 12) + '..' : r.catatan) : '-';

      const rowValues = [
        String(idx + 1),
        r.waktu ? r.waktu.substring(0, 5) : '-',
        r.nisn,
        r.nama.toUpperCase(),
        'L',
        kelasVal,
        r.sesi,
        r.status,
        note,
      ];

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      let colX = startX;
      cols.forEach((c, cIdx) => {
        doc.rect(colX, y, c.width, rowHeight);
        doc.setTextColor(0, 0, 0);

        let val = rowValues[cIdx];
        if (c.align === 'left' && val.length > 28) {
          val = val.substring(0, 26) + '..';
        }

        const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
        doc.text(val, textX, y + 4.1, { align: c.align });
        colX += c.width;
      });

      y += rowHeight;
    });
  }

  // LEMBAR PENGESAHAN
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  drawSignatures(
    doc,
    y,
    schoolConfig,
    'Guru Piket,',
    schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
    schoolConfig.nipPetugasPiket || '-',
    false,
    tanggal
  );

  doc.save(`Laporan_Presensi_Harian_${tanggal}_${kelasLabel.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 3. REKAPITULASI PRESENSI PEMBELAJARAN (KBM GURU) (PDF PORTRAIT)
 */
export function generateLearningRecapPdf(
  students: Student[],
  records: AttendanceRecord[],
  journals: TeachingJournal[],
  mapelFilter: string,
  guruName: string,
  kelasFilter: string,
  bulanNama: string,
  tahun: number,
  schoolConfig: SchoolConfig,
  teacherInfo?: { nama: string; nip?: string; mapel?: string }
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const filteredStudents = (kelasFilter === 'Semua'
    ? students
    : students.filter((s) => s.kelas === kelasFilter)
  ).sort((a, b) => a.nama.localeCompare(b.nama));

  const monthIdxMap: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
  };
  const mm = bulanNama ? (monthIdxMap[bulanNama.toLowerCase()] || '01') : '01';
  const monthPrefix = `${tahun}-${mm}`;

  const filteredJournals = journals.filter((j) => {
    if (monthPrefix && !j.tanggal.startsWith(monthPrefix)) return false;
    if (mapelFilter !== 'Semua' && j.mapel.toLowerCase() !== mapelFilter.toLowerCase()) return false;
    if (guruName !== 'Semua' && j.guruNama.toLowerCase() !== guruName.toLowerCase() && j.guruId !== guruName) return false;
    if (kelasFilter !== 'Semua' && j.kelas !== kelasFilter) return false;
    return true;
  });

  const classRecords = records.filter((r) => {
    const isKbm = r.kategori === 'KELAS' || r.kategori === 'PEMBELAJARAN' || r.id.startsWith('PRESENSI_KBM_') || !!r.mapel;
    if (!isKbm) return false;
    if (monthPrefix && !r.tanggal.startsWith(monthPrefix)) return false;
    if (mapelFilter !== 'Semua' && r.mapel?.toLowerCase() !== mapelFilter.toLowerCase()) return false;
    if (kelasFilter !== 'Semua' && r.kelas !== kelasFilter) return false;
    return true;
  });

  const totalPertemuan = filteredJournals.length;

  // Auto-resolve Teacher & Mapel
  const uniqueGurus = Array.from(new Set(filteredJournals.map(j => j.guruNama).filter(Boolean)));
  const uniqueMapels = Array.from(new Set(filteredJournals.map(j => j.mapel).filter(Boolean)));

  const resolvedGuru = guruName !== 'Semua'
    ? guruName
    : (teacherInfo?.nama || (uniqueGurus.length === 1 ? uniqueGurus[0] : 'Guru Pengampu'));

  const resolvedMapel = mapelFilter !== 'Semua'
    ? mapelFilter
    : (teacherInfo?.mapel || (uniqueMapels.length === 1 ? uniqueMapels[0] : 'Semua Mapel'));

  const resolvedNip = teacherInfo?.nip && teacherInfo.nip !== '-'
    ? teacherInfo.nip
    : '-';

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN REKAPITULASI PRESENSI PEMBELAJARAN (KBM)', 105, y, { align: 'center' });

  const kelasLabel = kelasFilter === 'Semua' ? 'SEMUA KELAS' : (kelasFilter.startsWith('KELAS') ? kelasFilter : `KELAS ${kelasFilter}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Mapel: ${resolvedMapel}  |  Guru: ${resolvedGuru}  |  Kelas: ${kelasLabel}  |  Total TM: ${totalPertemuan} Pertemuan`,
    105,
    y + 4.8,
    { align: 'center' }
  );

  y += 10;

  // TABEL BERKISI
  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'NISN', width: 22, align: 'center' as const },
    { title: 'Nama Siswa', width: 56, align: 'left' as const },
    { title: 'L/P', width: 8, align: 'center' as const },
    { title: 'Kelas', width: 20, align: 'center' as const },
    { title: 'H', width: 12, align: 'center' as const },
    { title: 'T', width: 12, align: 'center' as const },
    { title: 'S', width: 10, align: 'center' as const },
    { title: 'I', width: 10, align: 'center' as const },
    { title: 'A', width: 10, align: 'center' as const },
    { title: 'Total', width: 18, align: 'center' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;
  const rowHeight = 5.8;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (filteredStudents.length === 0) {
    const totalW = cols.reduce((acc, c) => acc + c.width, 0);
    doc.rect(startX, y, totalW, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Tidak ada data siswa pada kelas yang dipilih.', startX + totalW / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    filteredStudents.forEach((s, idx) => {
      if (y + rowHeight > 255) {
        doc.addPage();
        y = 20;
        drawTableHeader(y);
        y += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      const sRecords = classRecords.filter((r) => r.nisn === s.nisn);
      const hadir = sRecords.filter((r) => r.status === 'Hadir').length;
      const terlambat = sRecords.filter((r) => r.status === 'Terlambat').length;
      const sakit = sRecords.filter((r) => r.status === 'Sakit').length;
      const izin = sRecords.filter((r) => r.status === 'Izin').length;
      const alpa = sRecords.filter((r) => r.status === 'Alpa').length;
      const totalHadir = hadir + terlambat;

      const kelasVal = s.kelas.startsWith('KELAS') ? s.kelas : `KELAS ${s.kelas}`;
      const rowValues = [
        String(idx + 1),
        s.nisn,
        s.nama.toUpperCase(),
        s.jk || 'L',
        kelasVal,
        String(hadir),
        String(terlambat),
        String(sakit),
        String(izin),
        String(alpa),
        `${totalHadir} TM`,
      ];

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      let colX = startX;
      cols.forEach((c, cIdx) => {
        doc.rect(colX, y, c.width, rowHeight);
        doc.setTextColor(0, 0, 0);

        let val = rowValues[cIdx];
        if (c.align === 'left' && val.length > 28) {
          val = val.substring(0, 26) + '..';
        }

        const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
        doc.text(val, textX, y + 4.1, { align: c.align });
        colX += c.width;
      });

      y += rowHeight;
    });
  }

  // LEMBAR PENGESAHAN: Kiri Kepala Sekolah, Kanan Guru Mata Pelajaran
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  const signerTitle = resolvedMapel && resolvedMapel !== 'Semua Mapel'
    ? `Guru Mata Pelajaran ${resolvedMapel},`
    : 'Guru Mata Pelajaran,';

  drawSignatures(
    doc,
    y,
    schoolConfig,
    signerTitle,
    resolvedGuru,
    resolvedNip,
    false
  );

  const cleanMapel = (resolvedMapel || 'KBM').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Rekap_KBM_${cleanMapel}_${kelasLabel.replace(/\s+/g, '_')}_${bulanNama}_${tahun}.pdf`);
}

/**
 * Wrapper Legacy Monthly Recap
 */
export function generateMonthlyRecapPdf(
  students: Student[],
  records: AttendanceRecord[],
  bulanNama: string,
  tahun: number,
  totalHeb: number,
  schoolConfig: SchoolConfig,
  kelasFilter = 'Semua'
): void {
  generateApelRecapPdf(
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

/**
 * 4. BUKU AGENDA & JURNAL MENGAJAR GURU (PDF LANDSCAPE)
 * Format tabel rapi dan tidak tumpang tindih
 */
export function generateTeachingJournalsPdf(
  journals: TeachingJournal[],
  schoolConfig: SchoolConfig,
  filterGuru = 'Semua',
  filterKelas = 'Semua',
  filterMapel = 'Semua',
  bulanNama = '',
  tahun = new Date().getFullYear(),
  teacherInfo?: { nama: string; nip?: string; mapel?: string }
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const monthIdxMap: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
  };
  const mm = bulanNama ? (monthIdxMap[bulanNama.toLowerCase()] || '') : '';
  const monthPrefix = mm ? `${tahun}-${mm}` : (tahun ? `${tahun}` : '');

  const filtered = journals.filter((j) => {
    if (monthPrefix && !j.tanggal.startsWith(monthPrefix)) return false;
    const matchGuru = filterGuru === 'Semua' || j.guruNama.toLowerCase() === filterGuru.toLowerCase() || j.guruId === filterGuru;
    const matchKelas = filterKelas === 'Semua' || j.kelas === filterKelas;
    const matchMapel = filterMapel === 'Semua' || j.mapel.toLowerCase() === filterMapel.toLowerCase();
    return matchGuru && matchKelas && matchMapel;
  });

  // Auto-resolve Teacher & Mapel
  const uniqueGurus = Array.from(new Set(filtered.map((j) => j.guruNama).filter(Boolean)));
  const uniqueMapels = Array.from(new Set(filtered.map((j) => j.mapel).filter(Boolean)));

  const resolvedGuru = filterGuru !== 'Semua'
    ? filterGuru
    : (teacherInfo?.nama || (uniqueGurus.length === 1 ? uniqueGurus[0] : 'Semua Guru'));

  const resolvedMapel = filterMapel !== 'Semua'
    ? filterMapel
    : (teacherInfo?.mapel || (uniqueMapels.length === 1 ? uniqueMapels[0] : 'Semua Mapel'));

  const resolvedNip = teacherInfo?.nip && teacherInfo.nip !== '-'
    ? teacherInfo.nip
    : '-';

  let y = drawOfficialKop(doc, schoolConfig, true);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('BUKU AGENDA & JURNAL KEGIATAN BELAJAR MENGAJAR (KBM) GURU', 148.5, y, { align: 'center' });

  const periodeStr = bulanNama ? `${bulanNama.toUpperCase()} ${tahun}` : `TAHUN ${tahun}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const kelasLabel = filterKelas !== 'Semua' ? (filterKelas.startsWith('KELAS') ? filterKelas : `KELAS ${filterKelas}`) : 'Semua Kelas';
  doc.text(
    `Periode: ${periodeStr}  |  Guru: ${resolvedGuru}  |  Mapel: ${resolvedMapel}  |  Kelas: ${kelasLabel}  |  Total: ${filtered.length} Catatan Pertemuan`,
    148.5,
    y + 4.8,
    { align: 'center' }
  );

  y += 10;

  // TABEL LANDSCAPE (Total lebar 273mm, Margin kiri 12mm)
  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'Tanggal & Jam', width: 38, align: 'left' as const },
    { title: 'Guru & Mapel', width: 46, align: 'left' as const },
    { title: 'Kelas / TM', width: 24, align: 'center' as const },
    { title: 'Materi Pokok / Pembahasan', width: 85, align: 'left' as const },
    { title: 'Kehadiran Siswa', width: 42, align: 'center' as const },
    { title: 'Refleksi Guru', width: 30, align: 'left' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 2;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  if (filtered.length === 0) {
    const totalW = cols.reduce((acc, c) => acc + c.width, 0);
    doc.rect(startX, y, totalW, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Belum ada catatan jurnal mengajar pada kriteria ini.', startX + totalW / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    filtered.forEach((j, idx) => {
      // Calculate dynamic line wrap and row height
      const materiLines = doc.splitTextToSize(j.materiPokok || '-', 81);
      const refleksiLines = doc.splitTextToSize(j.catatanRefleksi || '-', 26);
      const maxTextLines = Math.max(2, materiLines.length, refleksiLines.length);
      const rowHeight = Math.max(9.5, maxTextLines * 3.8 + 2.5);

      if (y + rowHeight > 180) {
        doc.addPage();
        y = 20;
        drawTableHeader(y);
        y += headerHeight;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      let colX = startX;

      // Col 1: No
      doc.rect(colX, y, cols[0].width, rowHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(String(idx + 1), colX + cols[0].width / 2, y + 5.5, { align: 'center' });
      colX += cols[0].width;

      // Col 2: Tanggal & Jam (38mm)
      doc.rect(colX, y, cols[1].width, rowHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(j.tanggal, colX + 2, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const rawJam = j.jamPelajaran || '-';
      const jamShort = rawJam.length > 25 ? rawJam.substring(0, 23) + '..' : rawJam;
      doc.text(`Jam: ${jamShort}`, colX + 2, y + 7.8);
      doc.setTextColor(0, 0, 0);
      colX += cols[1].width;

      // Col 3: Guru & Mapel (46mm)
      doc.rect(colX, y, cols[2].width, rowHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const gNama = (j.guruNama || '-').toUpperCase();
      const gNamaShort = gNama.length > 26 ? gNama.substring(0, 24) + '..' : gNama;
      doc.text(gNamaShort, colX + 2, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const mapelShort = (j.mapel || '-').length > 28 ? j.mapel.substring(0, 26) + '..' : j.mapel;
      doc.text(mapelShort, colX + 2, y + 7.8);
      doc.setTextColor(0, 0, 0);
      colX += cols[2].width;

      // Col 4: Kelas / TM (24mm)
      doc.rect(colX, y, cols[3].width, rowHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const cleanKelas = j.kelas.replace(/KELAS\s*/i, '');
      doc.text(`Kls ${cleanKelas}`, colX + cols[3].width / 2, y + 4.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TM Ke-${j.pertemuanKe}`, colX + cols[3].width / 2, y + 7.8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      colX += cols[3].width;

      // Col 5: Materi Pokok / Pembahasan (85mm)
      doc.rect(colX, y, cols[4].width, rowHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      materiLines.forEach((mLine: string, lineIdx: number) => {
        doc.text(mLine, colX + 2, y + 4 + lineIdx * 3.8);
      });
      colX += cols[4].width;

      // Col 6: Kehadiran Siswa (42mm)
      doc.rect(colX, y, cols[5].width, rowHeight);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(`H:${j.hadir}  T:${j.terlambat}`, colX + cols[5].width / 2, y + 4.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(`S:${j.sakit}  I:${j.izin}  A:${j.alpa}`, colX + cols[5].width / 2, y + 7.8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      colX += cols[5].width;

      // Col 7: Refleksi Guru (30mm)
      doc.rect(colX, y, cols[6].width, rowHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      refleksiLines.forEach((rLine: string, lineIdx: number) => {
        doc.text(rLine, colX + 2, y + 4 + lineIdx * 3.8);
      });
      colX += cols[6].width;

      y += rowHeight;
    });
  }

  // LEMBAR PENGESAHAN LANDSCAPE
  if (y + 36 > 190) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  const signerGuru = resolvedGuru !== 'Semua Guru' ? resolvedGuru : 'Guru Mata Pelajaran';
  const signerTitle = resolvedMapel && resolvedMapel !== 'Semua Mapel'
    ? `Guru Mata Pelajaran ${resolvedMapel},`
    : 'Guru Mata Pelajaran,';

  drawSignatures(
    doc,
    y,
    schoolConfig,
    signerTitle,
    signerGuru,
    resolvedNip,
    true
  );

  const cleanMapel = (resolvedMapel || 'KBM').replace(/[^\w]/g, '_');
  const cleanKelas = (filterKelas || 'Semua').replace(/[^\w]/g, '_');
  doc.save(`Buku_Agenda_Jurnal_${cleanMapel}_${cleanKelas}_${tahun}.pdf`);
}

/**
 * 5. DAFTAR NOMINATIF DATA POKOK SISWA (PDF PORTRAIT)
 */
export function generateStudentListPdf(
  students: Student[],
  schoolConfig: SchoolConfig,
  filterKelas = 'Semua'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const filtered = (filterKelas === 'Semua'
    ? students
    : students.filter((s) => s.kelas === filterKelas)
  ).sort((a, b) => a.nama.localeCompare(b.nama));

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('DAFTAR NOMINATIF DATA POKOK SISWA', 105, y, { align: 'center' });

  const kelasLabel = filterKelas === 'Semua' ? 'SEMUA KELAS' : (filterKelas.startsWith('KELAS') ? filterKelas : `KELAS ${filterKelas}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Rombel / Kelas: ${kelasLabel}  |  Total Siswa Terdata: ${filtered.length} Orang`, 105, y + 4.8, { align: 'center' });

  y += 10;

  // TABEL BERKISI
  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'NISN', width: 24, align: 'center' as const },
    { title: 'Nama Lengkap Siswa', width: 68, align: 'left' as const },
    { title: 'L/P', width: 10, align: 'center' as const },
    { title: 'Kelas', width: 26, align: 'center' as const },
    { title: 'Kontak No. HP / WA Wali', width: 50, align: 'center' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;
  const rowHeight = 5.8;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (filtered.length === 0) {
    const totalW = cols.reduce((acc, c) => acc + c.width, 0);
    doc.rect(startX, y, totalW, 10);
    doc.setTextColor(100, 116, 139);
    doc.text('Tidak ada siswa terdaftar pada kelas yang dipilih.', startX + totalW / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    filtered.forEach((s, idx) => {
      if (y + rowHeight > 255) {
        doc.addPage();
        y = 20;
        drawTableHeader(y);
        y += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
      }

      const kelasVal = s.kelas.startsWith('KELAS') ? s.kelas : `KELAS ${s.kelas}`;
      const rowValues = [
        String(idx + 1),
        s.nisn,
        s.nama.toUpperCase(),
        s.jk || 'L',
        kelasVal,
        s.nomorTeleponOrtu || '-',
      ];

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      let colX = startX;
      cols.forEach((c, cIdx) => {
        doc.rect(colX, y, c.width, rowHeight);
        doc.setTextColor(0, 0, 0);

        let val = rowValues[cIdx];
        if (c.align === 'left' && val.length > 34) {
          val = val.substring(0, 32) + '..';
        }

        const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
        doc.text(val, textX, y + 4.1, { align: c.align });
        colX += c.width;
      });

      y += rowHeight;
    });
  }

  // LEMBAR PENGESAHAN
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  drawSignatures(
    doc,
    y,
    schoolConfig,
    'Pengelola Kesiswaan & IT,',
    schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
    schoolConfig.nipPetugasPiket || '-',
    false
  );

  doc.save(`Daftar_Siswa_${kelasLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 6. LAPORAN KENDALI PANTAU SISWA UNTUK ORANG TUA (PDF PORTRAIT)
 */
export function generateStudentReportCardPdf(
  student: Student,
  records: AttendanceRecord[],
  schoolConfig: SchoolConfig
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const studentRecords = records.filter((r) => r.nisn === student.nisn);
  const hadir = studentRecords.filter((r) => r.status === 'Hadir').length;
  const terlambat = studentRecords.filter((r) => r.status === 'Terlambat').length;
  const sakit = studentRecords.filter((r) => r.status === 'Sakit').length;
  const izin = studentRecords.filter((r) => r.status === 'Izin').length;
  const alpa = studentRecords.filter((r) => r.status === 'Alpa').length;
  const totalMasuk = hadir + terlambat;
  const totalPertemuan = studentRecords.length;
  const persentase = totalPertemuan > 0 ? Math.round((totalMasuk / totalPertemuan) * 100) : 100;

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LEMBAR KENDALI PRESTASI & KEHADIRAN SISWA', 105, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Laporan Digital Monitoring Orang Tua / Wali - Tahun Ajaran 2026/2027', 105, y + 4.8, { align: 'center' });

  y += 10;

  // IDENTITAS SISWA BOX
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(12, y, 186, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('IDENTITAS SISWA', 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Nama Lengkap   : ${student.nama.toUpperCase()}`, 16, y + 12);
  doc.text(`NISN / Induk    : ${student.nisn}`, 16, y + 17);
  doc.text(`Rombel / Kelas : KELAS ${student.kelas}`, 16, y + 22);

  doc.text(`Jenis Kelamin  : ${student.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}`, 110, y + 12);
  doc.text(`No. WA Ortu    : ${student.nomorTeleponOrtu || '-'}`, 110, y + 17);
  doc.text(`Status Siswa   : Aktif Belajar`, 110, y + 22);

  y += 31;

  // RINGKASAN KEHADIRAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RINGKASAN STATISTIK KEHADIRAN', 12, y);
  y += 4;

  const colW = 31;
  const badges = [
    { label: 'HADIR', val: hadir },
    { label: 'TERLAMBAT', val: terlambat },
    { label: 'SAKIT', val: sakit },
    { label: 'IZIN', val: izin },
    { label: 'ALPA', val: alpa },
    { label: '% KEHADIRAN', val: `${persentase}%` },
  ];

  badges.forEach((b, i) => {
    const bx = 12 + i * colW;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(bx, y, colW, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(b.label, bx + colW / 2, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(String(b.val), bx + colW / 2, y + 11, { align: 'center' });
  });

  y += 20;

  // RIWAYAT PRESENSI TERBARU
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RIWAYAT PRESENSI TERAKHIR', 12, y);
  y += 4;

  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'Tanggal', width: 28, align: 'center' as const },
    { title: 'Waktu', width: 22, align: 'center' as const },
    { title: 'Sesi', width: 24, align: 'center' as const },
    { title: 'Status', width: 34, align: 'center' as const },
    { title: 'Catatan / Keterangan', width: 70, align: 'left' as const },
  ];
  const startX = 12;
  const headerH = 7;
  const rowH = 5.8;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  let colX = startX;
  cols.forEach((c) => {
    doc.rect(colX, y, c.width, headerH);
    const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
    doc.text(c.title, textX, y + 4.8, { align: c.align });
    colX += c.width;
  });
  y += headerH;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const recent = studentRecords.slice(0, 12);
  if (recent.length === 0) {
    const totalW = cols.reduce((acc, c) => acc + c.width, 0);
    doc.rect(startX, y, totalW, 10);
    doc.text('Belum ada riwayat kehadiran tercatat.', startX + totalW / 2, y + 6.5, { align: 'center' });
    y += 10;
  } else {
    recent.forEach((r, idx) => {
      const note = r.catatan ? (r.catatan.length > 36 ? r.catatan.substring(0, 34) + '..' : r.catatan) : '-';
      const rowVals = [
        String(idx + 1),
        r.tanggal,
        r.waktu ? r.waktu.substring(0, 5) : '-',
        `Sesi ${r.sesi}`,
        r.status,
        note,
      ];

      colX = startX;
      cols.forEach((c, cIdx) => {
        doc.rect(colX, y, c.width, rowH);
        const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
        doc.text(rowVals[cIdx], textX, y + 4.1, { align: c.align });
        colX += c.width;
      });
      y += rowH;
    });
  }

  // LEMBAR PENGESAHAN: Orang Tua (Kiri) & Wali Kelas / Petugas (Kanan)
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const kota = schoolConfig.kota || 'Cianjur';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Mengetahui,', 25, y);
  doc.text('Orang Tua / Wali Siswa,', 25, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text('( .................................................. )', 25, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.text(`${kota}, ${dateStr}`, 142, y);
  doc.text('Wali Kelas / Petugas,', 142, y + 4.5);
  doc.setFont('helvetica', 'bold');
  const petugasName = (schoolConfig.namaPetugasPiket || 'AI SITI ROSITA').toUpperCase();
  doc.text(petugasName, 142, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${schoolConfig.nipPetugasPiket || '-'}`, 142, y + 27.5);

  doc.save(`Lembar_Pantau_${student.nisn}_${student.nama.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 7. DAFTAR TENAGA PENDIDIK & DISTRIBUSI BEBAN MENGAJAR (PDF)
 */
export function generateTeacherListPdf(
  teachers: TeacherUser[],
  schoolConfig: SchoolConfig
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('DAFTAR TENAGA PENDIDIK & DISTRIBUSI BEBAN MENGAJAR', 105, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Tahun Ajaran 2026/2027  |  Total Guru / Staf: ${teachers.length} Orang`, 105, y + 4.8, { align: 'center' });

  y += 10;

  // TABEL BERKISI
  const cols = [
    { title: 'No', width: 8, align: 'center' as const },
    { title: 'Nama Lengkap & NIP', width: 62, align: 'left' as const },
    { title: 'Mata Pelajaran', width: 60, align: 'left' as const },
    { title: 'Beban Jam', width: 18, align: 'center' as const },
    { title: 'Wali Kelas', width: 18, align: 'center' as const },
    { title: 'Peran', width: 20, align: 'center' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;
  const rowHeight = 6.2;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  teachers.forEach((t, idx) => {
    if (y + rowHeight > 255) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += headerHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    const mapelList = t.penugasanMapel?.map((p) => `${p.mapel} (${p.kelas.join(',')})`).join(', ') || t.mapel || '-';
    const sumJam = t.penugasanMapel?.reduce((acc, p) => acc + (p.bebanJam || 0), 0) || t.totalJamMengajar || 0;
    const roleLabel = t.role === 'admin' ? 'Admin' : t.role === 'piket' ? 'Piket' : 'Guru';

    const rowValues = [
      String(idx + 1),
      `${t.nama.toUpperCase()} ${t.nip ? `(NIP. ${t.nip})` : ''}`,
      mapelList,
      `${sumJam} Jam`,
      t.waliKelas ? `Kls ${t.waliKelas}` : '-',
      roleLabel,
    ];

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    let colX = startX;
    cols.forEach((c, cIdx) => {
      doc.rect(colX, y, c.width, rowHeight);
      doc.setTextColor(0, 0, 0);

      let val = rowValues[cIdx];
      if (c.align === 'left' && val.length > 34) {
        val = val.substring(0, 32) + '..';
      }

      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(val, textX, y + 4.3, { align: c.align });
      colX += c.width;
    });

    y += rowHeight;
  });

  // LEMBAR PENGESAHAN
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  drawSignatures(
    doc,
    y,
    schoolConfig,
    'Kepala Tata Usaha,',
    schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
    schoolConfig.nipPetugasPiket || '-',
    false
  );

  doc.save(`Data_Guru_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * 8. KALENDER HARI EFEKTIF BELAJAR (HEB) (PDF)
 */
export function generateHebCalendarPdf(
  kalenderHeb: KalenderHeb,
  tahun: number,
  bulanIndex: number,
  schoolConfig: SchoolConfig
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const bulanNama = monthNames[bulanIndex];
  const daysInMonth = new Date(tahun, bulanIndex + 1, 0).getDate();

  let y = drawOfficialKop(doc, schoolConfig, false);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('KALENDER PENDIDIKAN & HARI EFEKTIF BELAJAR (HEB)', 105, y, { align: 'center' });

  const kalMap = kalenderHeb.kalenderData || {};
  let totalHeb = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${tahun}-${String(bulanIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (kalMap[k] !== false) totalHeb++;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Bulan: ${bulanNama.toUpperCase()} ${tahun}  |  Target HEB: ${totalHeb} Hari  |  Sistem: ${schoolConfig.sistemHariSekolah === '5_HARI' ? '5 Hari' : '6 Hari'} Sekolah`,
    105,
    y + 4.8,
    { align: 'center' }
  );

  y += 10;

  // TABEL BERKISI
  const cols = [
    { title: 'Tanggal', width: 34, align: 'center' as const },
    { title: 'Hari', width: 28, align: 'center' as const },
    { title: 'Status Hari Sekolah', width: 54, align: 'center' as const },
    { title: 'Keterangan Agenda', width: 70, align: 'left' as const },
  ];
  const startX = 12;
  const headerHeight = 7.5;
  const rowHeight = 5.8;

  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let colX = startX;
    cols.forEach((c) => {
      doc.rect(colX, curY, c.width, headerHeight);
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(c.title, textX, curY + 5, { align: c.align });
      colX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const dayLabels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  for (let d = 1; d <= daysInMonth; d++) {
    if (y + rowHeight > 255) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += headerHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    const dateObj = new Date(tahun, bulanIndex, d);
    const dayOfWeek = dateObj.getDay();
    const dateKey = `${tahun}-${String(bulanIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isEffective = kalMap[dateKey] !== false;

    const rowValues = [
      `${d} ${bulanNama} ${tahun}`,
      dayLabels[dayOfWeek],
      isEffective ? 'Hari Efektif Belajar (HEB)' : 'Libur / Non-Efektif',
      isEffective ? 'KBM & Presensi Aktif' : (dayOfWeek === 0 ? 'Libur Akhir Pekan (Minggu)' : 'Libur / Agenda Khusus'),
    ];

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);

    let colX = startX;
    cols.forEach((c, cIdx) => {
      doc.rect(colX, y, c.width, rowHeight);
      doc.setTextColor(0, 0, 0);

      const val = rowValues[cIdx];
      const textX = c.align === 'center' ? colX + c.width / 2 : colX + 1.5;
      doc.text(val, textX, y + 4.1, { align: c.align });
      colX += c.width;
    });

    y += rowHeight;
  }

  // LEMBAR PENGESAHAN
  if (y + 36 > 280) {
    doc.addPage();
    y = 25;
  } else {
    y += 12;
  }

  drawSignatures(
    doc,
    y,
    schoolConfig,
    'Koordinator Kurikulum & HEB,',
    schoolConfig.namaPetugasPiket || 'AI SITI ROSITA',
    schoolConfig.nipPetugasPiket || '-',
    false
  );

  doc.save(`Kalender_HEB_${bulanNama}_${tahun}_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 9. CETAK BERKAS PDF KARTU TANDA SISWA (F4 / A4 SIAP GUNTING)
 */
export async function generateStudentIdCardsPdf(
  students: Student[],
  schoolConfig: SchoolConfig,
  format: 'A4' | 'F4' = 'F4'
): Promise<void> {
  const isF4 = format === 'F4';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isF4 ? [210, 330] : 'a4',
  });

  const cardW = 86;
  const cardH = 54;
  const startX = 14;
  const startY = 16;
  const gapX = 10;
  const gapY = 8;
  const cardsPerRow = 2;
  const cardsPerCol = isF4 ? 5 : 4;
  const cardsPerPage = cardsPerRow * cardsPerCol;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const indexInPage = i % cardsPerPage;

    if (i > 0 && indexInPage === 0) {
      doc.addPage();
    }

    const col = indexInPage % cardsPerRow;
    const row = Math.floor(indexInPage / cardsPerRow);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // Garis Batas Potong Luar
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(x, y, cardW, cardH, 'S');

    // Header Kartu
    doc.setFillColor(30, 58, 138);
    doc.rect(x, y, cardW, 13, 'F');

    const logoData = schoolConfig.logoUrl || SCHOOL_LOGO_PNG_DATA_URL;
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', x + 2, y + 1.5, 10, 10);
      } catch {
        // ignore
      }
    }

    doc.setTextColor(253, 224, 71);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('KARTU TANDA SISWA', x + 14, y + 4.5);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.text(schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU', x + 14, y + 7.5);

    doc.setTextColor(224, 231, 255);
    doc.setFontSize(5);
    doc.text(`NPSN: ${schoolConfig.npsn || '69919136'} • TA 2026/2027`, x + 14, y + 10.5);

    // Detail Siswa
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const displayName = s.nama.length > 22 ? s.nama.substring(0, 20) + '..' : s.nama;
    doc.text(displayName.toUpperCase(), x + 4, y + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`NISN  : ${s.nisn}`, x + 4, y + 26);
    doc.text(`Kelas : KELAS ${s.kelas} (${s.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'})`, x + 4, y + 31);
    doc.text(`Status: SISWA AKTIF`, x + 4, y + 36);

    doc.setFontSize(4.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${schoolConfig.kota || 'Cianjur'}, Kab. Cianjur - Jawa Barat`, x + 4, y + 49);

    // QR Code
    try {
      const qrDataUrl = await generateQrDataUrl(s.nisn);
      if (qrDataUrl) {
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 55, y + 17, 27, 27, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(x + 55, y + 17, 27, 27, 'S');
        doc.addImage(qrDataUrl, 'PNG', x + 56, y + 18, 25, 25);
      }
    } catch {
      // skip
    }
  }

  doc.save(`Kartu_Siswa_${format}_${schoolConfig.namaSekolah.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Interface parameter untuk Cetak & Unduh Rapor Digital Siswa PDF
 */
export interface ExportReportCardParams {
  student: Student;
  subjects: Array<{
    no: number;
    mapel: string;
    tugas: number | string;
    uh: number | string;
    uts: number | string;
    uas: number | string;
    nilaiAkhir: number;
    predikat: string;
    deskripsi: string;
  }>;
  overallAvg: number;
  overallPredikat: string;
  attendance: {
    hadir: number;
    terlambat: number;
    sakit: number;
    izin: number;
    alpa: number;
    total: number;
    persentase: number;
  };
  schoolConfig: SchoolConfig;
  waliKelasNama: string;
  waliKelasNip: string;
  signatureLayout?: '3-column' | '2-tier';
  catatanWaliKelas?: string;
  semester?: string;
  tahunPelajaran?: string;
}

/**
 * Unduh Rapor Digital Siswa Resmi (Format PDF A4 Resmi Kedinasan)
 * Menggunakan Kop Surat Resmi, Garis Ganda, Tabel Nilai Auto-Rekap,
 * Rekap Presensi, Catatan Wali Kelas, dan TTD Kepala Sekolah di Tengah.
 */
export function exportStudentReportCardPdf({
  student,
  subjects,
  overallAvg,
  overallPredikat,
  attendance,
  schoolConfig,
  waliKelasNama,
  waliKelasNip,
  signatureLayout = '2-tier',
  catatanWaliKelas,
  semester = 'Semester Ganjil',
  tahunPelajaran = '2026/2027',
}: ExportReportCardParams): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const leftX = 14;
  const rightX = pageWidth - 14; // 196mm
  const contentWidth = rightX - leftX; // 182mm

  // 1. Kop Surat Resmi Kedinasan
  let y = drawOfficialKop(doc, schoolConfig, false);

  // 2. Judul Rapor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN HASIL BELAJAR SISWA (RAPOR SISIPAN DIGITAL)', 105, y, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${semester.toUpperCase()} • TAHUN PELAJARAN ${tahunPelajaran}`, 105, y + 4.5, { align: 'center' });

  y += 8.5;

  // 3. Kotak Biodata Siswa
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, y, contentWidth, 18, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  // Kolom Kiri
  const leftColX = leftX + 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Peserta Didik', leftColX, y + 5);
  doc.text('Nomor Induk / NISN', leftColX, y + 10);
  doc.text('Jenis Kelamin', leftColX, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.text(`: ${student.nama.toUpperCase()}`, leftColX + 33, y + 5);
  doc.text(`: ${student.nisn}`, leftColX + 33, y + 10);
  doc.text(`: ${student.jk === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}`, leftColX + 33, y + 15);

  // Kolom Kanan
  const rightColX = leftX + 100;
  doc.setFont('helvetica', 'bold');
  doc.text('Kelas / Rombel', rightColX, y + 5);
  doc.text('Wali Kelas', rightColX, y + 10);
  doc.text('Rata-Rata Capaian', rightColX, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.text(`: Kelas ${student.kelas}`, rightColX + 30, y + 5);
  doc.text(`: ${waliKelasNama}`, rightColX + 30, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(`: ${overallAvg} / 100 (${overallPredikat})`, rightColX + 30, y + 15);

  y += 22;

  // 4. Tabel A: Capaian Nilai Pembelajaran & Keterampilan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('A. Capaian Nilai Pembelajaran & Keterampilan (Auto-Rekap Database)', leftX, y + 1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('KKM Satuan: 75', rightX, y + 1, { align: 'right' });

  y += 4;

  // Kolom Tabel: total 182mm (Margin kiri 14mm, Margin kanan 14mm)
  const cols = [
    { title: 'No', width: 7, align: 'center' as const },
    { title: 'Mata Pelajaran', width: 49, align: 'left' as const },
    { title: 'Tugas', width: 11, align: 'center' as const },
    { title: 'UH', width: 11, align: 'center' as const },
    { title: 'PTS', width: 11, align: 'center' as const },
    { title: 'PAS', width: 11, align: 'center' as const },
    { title: 'Nilai Akhir', width: 15, align: 'center' as const },
    { title: 'Predikat', width: 12, align: 'center' as const },
    { title: 'Deskripsi Capaian Pembelajaran', width: 55, align: 'left' as const },
  ];

  const headerHeight = 6;
  const drawTableHeader = (curY: number) => {
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.setFillColor(241, 245, 249);

    let curX = leftX;
    cols.forEach((c) => {
      doc.rect(curX, curY, c.width, headerHeight, 'FD');
      const textX = c.align === 'center' ? curX + c.width / 2 : curX + 2;
      doc.text(c.title, textX, curY + 4.2, { align: c.align });
      curX += c.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  // Baris Nilai Mata Pelajaran
  subjects.forEach((row) => {
    const descLines = doc.splitTextToSize(row.deskripsi, 52);
    const mapelLines = doc.splitTextToSize(row.mapel, 46);
    const lineCount = Math.max(descLines.length, mapelLines.length);
    const rowH = Math.max(5.0, lineCount * 3.1 + 2);

    if (y + rowH > 275) {
      doc.addPage();
      y = 18;
      drawTableHeader(y);
      y += headerHeight;
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);

    let curX = leftX;
    cols.forEach((c) => {
      if (c.title === 'Nilai Akhir') {
        doc.setFillColor(248, 250, 252);
        doc.rect(curX, y, c.width, rowH, 'FD');
      } else {
        doc.rect(curX, y, c.width, rowH);
      }
      curX += c.width;
    });

    // Isi Teks
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);

    // No
    doc.setFont('helvetica', 'normal');
    doc.text(String(row.no), leftX + cols[0].width / 2, y + 3.6, { align: 'center' });

    // Mapel
    doc.setFont('helvetica', 'bold');
    doc.text(mapelLines, leftX + cols[0].width + 2, y + 3.6);

    // Nilai Komponen
    let xOffset = leftX + cols[0].width + cols[1].width;
    doc.setFont('helvetica', 'normal');
    doc.text(String(row.tugas), xOffset + cols[2].width / 2, y + 3.6, { align: 'center' });
    xOffset += cols[2].width;
    doc.text(String(row.uh), xOffset + cols[3].width / 2, y + 3.6, { align: 'center' });
    xOffset += cols[3].width;
    doc.text(String(row.uts), xOffset + cols[4].width / 2, y + 3.6, { align: 'center' });
    xOffset += cols[4].width;
    doc.text(String(row.uas), xOffset + cols[5].width / 2, y + 3.6, { align: 'center' });
    xOffset += cols[5].width;

    // Nilai Akhir
    doc.setFont('helvetica', 'bold');
    doc.text(String(row.nilaiAkhir), xOffset + cols[6].width / 2, y + 3.6, { align: 'center' });
    xOffset += cols[6].width;

    // Predikat
    doc.text(row.predikat, xOffset + cols[7].width / 2, y + 3.6, { align: 'center' });
    xOffset += cols[7].width;

    // Deskripsi
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(descLines, xOffset + 2, y + 3.3);

    y += rowH;
  });

  // Table Footer: Rata-Rata Nilai Akhir Siswa
  const footerH = 5.8;
  if (y + footerH > 275) {
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  const leftWidth = cols[0].width + cols[1].width + cols[2].width + cols[3].width + cols[4].width + cols[5].width;
  doc.rect(leftX, y, leftWidth, footerH, 'FD');
  doc.rect(leftX + leftWidth, y, cols[6].width, footerH, 'FD');
  doc.rect(leftX + leftWidth + cols[6].width, y, cols[7].width, footerH, 'FD');
  doc.rect(leftX + leftWidth + cols[6].width + cols[7].width, y, cols[8].width, footerH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RATA-RATA NILAI AKHIR SISWA', leftX + leftWidth - 3, y + 4.1, { align: 'right' });
  doc.text(String(overallAvg), leftX + leftWidth + cols[6].width / 2, y + 4.1, { align: 'center' });
  doc.setTextColor(30, 58, 138);
  doc.text(overallAvg >= 90 ? 'A' : overallAvg >= 80 ? 'B' : 'C', leftX + leftWidth + cols[6].width + cols[7].width / 2, y + 4.1, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Ketuntasan: Terlampaui (${overallPredikat})`, leftX + leftWidth + cols[6].width + cols[7].width + 2, y + 4.1);

  y += footerH + 1.5;

  // Catatan Auto-Rekap
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('*Nilai Akhir dan Predikat dikompilasi secara otomatis (Auto-Rekap) dari data penilaian harian tugas, UH, PTS, dan PAS di database sekolah.', leftX, y + 2);

  y += 5.5;

  // 5. Tabel B: Rekapitulasi Presensi & Disiplin Belajar
  if (y + 18 > 275) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('B. Rekapitulasi Presensi & Disiplin Belajar', leftX, y + 1);

  y += 3.5;

  const presensiItems = [
    { label: 'Hadir', value: `${attendance.hadir} Hari` },
    { label: 'Terlambat', value: `${attendance.terlambat} Hari` },
    { label: 'Sakit (S)', value: `${attendance.sakit} Hari` },
    { label: 'Izin (I)', value: `${attendance.izin} Hari` },
    { label: 'Tanpa Ket. (A)', value: `${attendance.alpa} Hari` },
    { label: 'Persentase', value: `${attendance.persentase}%` },
  ];

  const boxW = contentWidth / 6;
  const boxH = 9.5;
  let curBoxX = leftX;

  presensiItems.forEach((p, idx) => {
    const isHighlight = idx === 5;
    doc.setFillColor(isHighlight ? 238 : 248, isHighlight ? 242 : 250, isHighlight ? 255 : 252);
    doc.setDrawColor(isHighlight ? 129 : 203, isHighlight ? 140 : 213, isHighlight ? 248 : 225);
    doc.setLineWidth(isHighlight ? 0.35 : 0.2);
    doc.roundedRect(curBoxX, y, boxW - 1.5, boxH, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(isHighlight ? 49 : 100, isHighlight ? 46 : 116, isHighlight ? 129 : 139);
    doc.text(p.label.toUpperCase(), curBoxX + (boxW - 1.5) / 2, y + 3.6, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(isHighlight ? 30 : 15, isHighlight ? 58 : 23, isHighlight ? 138 : 42);
    doc.text(p.value, curBoxX + (boxW - 1.5) / 2, y + 7.6, { align: 'center' });

    curBoxX += boxW;
  });

  y += boxH + 3.5;

  // 6. Catatan Wali Kelas
  if (y + 15 > 275) {
    doc.addPage();
    y = 18;
  }

  const defaultNote = `Ananda ${student.nama} memiliki tingkat kehadiran yang sangat baik (${attendance.persentase}%) dan capaian belajar memuaskan. Pertahankan kedisiplinan belajar, tingkatkan keaktifan dalam diskusi kelompok, serta terus asah minat bakat pada kegiatan ekstrakurikuler sekolah.`;
  const noteText = catatanWaliKelas || defaultNote;
  const noteLines = doc.splitTextToSize(`"${noteText}"`, contentWidth - 8);
  const noteBoxH = Math.max(10, noteLines.length * 3.1 + 5);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(leftX, y, contentWidth, noteBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Catatan & Saran Wali Kelas:', leftX + 4, y + 3.6);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(noteLines, leftX + 4, y + 7.2);

  y += noteBoxH + 4.5;

  // 7. Lembar Pengesahan / Tanda Tangan (Kepala Sekolah di Bagian Tengah Bawah Dokumen)
  if (y + 36 > 280) {
    doc.addPage();
    y = 20;
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const kota = schoolConfig.kota || 'Cianjur';
  const kepsekNama = (schoolConfig.namaKepsek || 'CUNCUN MUHLISOH, S.Pd.').toUpperCase();
  const kepsekNip = schoolConfig.nipKepsek && schoolConfig.nipKepsek !== '-' ? schoolConfig.nipKepsek : '-';
  const waliNama = (waliKelasNama || 'AI SITI ROSITA').toUpperCase();
  const waliNip = waliKelasNip && waliKelasNip !== '-' ? waliKelasNip : '-';

  if (signatureLayout === '3-column') {
    // 3 KOLOM SEJAJAR: KEPALA SEKOLAH DI TENGAH
    const col1X = leftX + contentWidth / 6;       // ~44mm
    const col2X = leftX + contentWidth / 2;       // 105mm (TENGAH)
    const col3X = leftX + (contentWidth * 5) / 6; // ~166mm

    // Kolom 1 (Kiri): Orang Tua / Wali Siswa
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Mengetahui,', col1X, y, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Orang Tua / Wali Siswa', col1X, y + 4.5, { align: 'center' });

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(col1X - 22, y + 23, col1X + 22, y + 23);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('( .................................................. )', col1X, y + 26.5, { align: 'center' });

    // Kolom 2 (Tengah): Kepala Sekolah
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(col2X - 28, y - 2, 56, 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Mengetahui & Mengesahkan,', col2X, y + 2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Kepala ${schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}`, col2X, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('[ Cap / Stempel Sekolah ]', col2X, y + 14, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kepsekNama, col2X, y + 22, { align: 'center' });
    const kWidth = doc.getTextWidth(kepsekNama);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(col2X - kWidth / 2, y + 22.8, col2X + kWidth / 2, y + 22.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`NUPTK. ${kepsekNip}`, col2X, y + 26.5, { align: 'center' });

    // Kolom 3 (Kanan): Wali Kelas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${kota}, ${formattedDate}`, col3X, y, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Wali Kelas ${student.kelas}`, col3X, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(waliNama, col3X, y + 22, { align: 'center' });
    const wWidth = doc.getTextWidth(waliNama);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(col3X - wWidth / 2, y + 22.8, col3X + wWidth / 2, y + 22.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`NUPTK. ${waliNip}`, col3X, y + 26.5, { align: 'center' });
  } else {
    // 2 TINGKAT: Orang Tua di Kiri & Wali Kelas di Kanan (Atas), Kepala Sekolah Rapi di TENGAH BAWAH DOKUMEN
    const leftTTDX = leftX + 35;
    const rightTTDX = rightX - 35;
    const centerTTDX = 105; // Titik tengah A4

    // Tingkat 1: Orang Tua (Kiri) & Wali Kelas (Kanan)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Mengetahui,', leftTTDX, y, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Orang Tua / Wali Siswa', leftTTDX, y + 4.5, { align: 'center' });

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(leftTTDX - 22, y + 21, leftTTDX + 22, y + 21);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('( .................................................. )', leftTTDX, y + 24.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${kota}, ${formattedDate}`, rightTTDX, y, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Wali Kelas ${student.kelas}`, rightTTDX, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(waliNama, rightTTDX, y + 20, { align: 'center' });
    const wWidth = doc.getTextWidth(waliNama);
    doc.line(rightTTDX - wWidth / 2, y + 20.8, rightTTDX + wWidth / 2, y + 20.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`NUPTK. ${waliNip}`, rightTTDX, y + 24.5, { align: 'center' });

    y += 27;

    // Tingkat 2: Kepala Sekolah di TENGAH BAWAH DOKUMEN
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(centerTTDX - 34, y - 2, 68, 30, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Mengetahui & Mengesahkan,', centerTTDX, y + 2, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Kepala ${schoolConfig.namaSekolah || 'SMP PGRI 1 CIKADU'}`, centerTTDX, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('[ Cap / Stempel Sekolah ]', centerTTDX, y + 13, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(kepsekNama, centerTTDX, y + 20, { align: 'center' });
    const kWidth = doc.getTextWidth(kepsekNama);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(centerTTDX - kWidth / 2, y + 20.8, centerTTDX + kWidth / 2, y + 20.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`NUPTK. ${kepsekNip}`, centerTTDX, y + 24.5, { align: 'center' });
  }

  // Unduh Berkas PDF Langsung
  const cleanName = (student.nama || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanKelas = (student.kelas || '').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Rapor_Digital_${cleanName}_${student.nisn}_Kelas_${cleanKelas}.pdf`);
}
