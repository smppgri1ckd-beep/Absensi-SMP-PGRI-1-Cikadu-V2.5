import QRCode from 'qrcode';
import JSZip from 'jszip';
import { Student } from '../types';

export async function generateQrDataUrl(text: string, size = 300): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR Code', err);
    return '';
  }
}

export async function downloadQrZipForStudents(
  students: Student[], 
  zipName: string, 
  schoolName: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`QR_Siswa_${zipName}`);

  for (const s of students) {
    const dataUrl = await generateQrDataUrl(s.nisn, 400);
    // remove "data:image/png;base64,"
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = `${s.kelas}_${s.nisn}_${s.nama.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    folder?.file(filename, base64Data, { base64: true });
  }

  // Add a text readme
  folder?.file(
    'BACA_SAYA.txt',
    `BERKAS QR CODE SISWA\n${schoolName}\nTotal Siswa: ${students.length}\nTanggal Generate: ${new Date().toLocaleDateString('id-ID')}\nFormat Penamaan: KELAS_NISN_NAMA.png`
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `QR_CODE_${zipName.toUpperCase()}_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
