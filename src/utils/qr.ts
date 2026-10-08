import QRCode from 'qrcode';

export const generateStudentQrDataUrl = async (nisn: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(nisn, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
};
