import jsPDF from 'jspdf';
import { AttendanceRecord } from '../types';

export const exportAttendanceToPdf = (records: AttendanceRecord[], title: string = 'Laporan Presensi Siswa') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header Kop Surat
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SMP PGRI 1 CIKADU', 105, 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Alamat: Jl. Raya Cikadu, Kec. Cikadu, Kab. Cianjur - Jawa Barat', 105, 21, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line(15, 25, 195, 25);

  // Document Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 105, 34, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 105, 39, { align: 'center' });

  // Table items
  let y = 48;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('No', 15, y);
  doc.text('Waktu', 25, y);
  doc.text('NISN', 45, y);
  doc.text('Nama Siswa', 75, y);
  doc.text('Kelas', 135, y);
  doc.text('Status', 155, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 7;

  doc.setFont('helvetica', 'normal');
  records.slice(0, 32).forEach((r, idx) => {
    doc.text(`${idx + 1}`, 15, y);
    doc.text(`${r.time.substring(0, 5)}`, 25, y);
    doc.text(r.nisn, 45, y);
    doc.text(r.studentName.substring(0, 25), 75, y);
    doc.text(r.className, 135, y);
    doc.text(r.status.toUpperCase(), 155, y);
    y += 6;
  });

  // Footer signature
  y = Math.min(y + 15, 260);
  doc.setFont('helvetica', 'normal');
  doc.text('Mengetahui,', 140, y);
  doc.text('Kepala SMP PGRI 1 Cikadu', 140, y + 5);
  doc.text('Drs. H. Maman Suratman, M.Pd.', 140, y + 28);
  doc.text('NIP. 198501152010011005', 140, y + 33);

  doc.save(`Laporan_Presensi_SMP_PGRI_1_${new Date().toISOString().split('T')[0]}.pdf`);
};
