/**
 * Utility khusus Waktu Indonesia Barat (WIB / UTC+7 / Asia/Jakarta)
 * Digunakan untuk memastikan seluruh inputan, format jam, dan komputasi presensi 
 * di SMP PGRI 1 Cikadu (Jawa Barat) menggunakan format 24 jam dan zona waktu WIB.
 */

// Zona waktu resmi sekolah: Asia/Jakarta (WIB)
export const SCHOOL_TIMEZONE = 'Asia/Jakarta';
export const TIMEZONE_LABEL = 'WIB (UTC+7)';

/**
 * Mendapatkan Date object saat ini yang disesuaikan dengan zona waktu Asia/Jakarta (WIB)
 */
export function getWIBNow(): Date {
  const now = new Date();
  // Format ke string ISO sesuai timezone Asia/Jakarta
  const wibString = now.toLocaleString('en-US', { timeZone: SCHOOL_TIMEZONE });
  return new Date(wibString);
}

/**
 * Mendapatkan string jam saat ini dalam format 24 Jam ("HH:mm") WIB
 * Contoh: "07:15", "13:30", "19:05"
 */
export function getWIBCurrentTimeString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: SCHOOL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') || '00';
  return `${hour}:${minute}`;
}

/**
 * Mendapatkan string jam lengkap saat ini dalam format 24 Jam ("HH:mm:ss WIB") WIB
 */
export function getWIBCurrentFullTimeString(): string {
  const time24 = getWIBCurrentTimeString();
  const now = new Date();
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${time24}:${seconds} WIB`;
}

/**
 * Mendapatkan tanggal hari ini dalam format "YYYY-MM-DD" WIB
 */
export function getWIBTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: SCHOOL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Mengubah string date ISO / Date object ke format 24 Jam ("HH:mm") WIB
 */
export function formatToWIBTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '-';
    
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: SCHOOL_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const hour = parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') || '00';
    return `${hour}:${minute}`;
  } catch (err) {
    return String(dateInput);
  }
}

/**
 * Mengubah string date ISO / Date object ke format Tanggal & Jam Bahasa Indonesia WIB
 * Contoh: "Selasa, 13 Oktober 2026 14:30 WIB"
 */
export function formatToWIBFullDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';

    const dateFormatted = d.toLocaleDateString('id-ID', {
      timeZone: SCHOOL_TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = formatToWIBTime(d);
    return `${dateFormatted} ${timeFormatted} WIB`;
  } catch (err) {
    return '-';
  }
}

/**
 * Mengkonversi format jam (misal "07:30" atau "7.30") ke format baku 24 Jam "HH:mm"
 */
export function normalize24HourFormat(timeStr: string): string {
  if (!timeStr) return '07:00';
  let cleaned = timeStr.trim().replace('.', ':');
  // Tangani jika ada suffix AM/PM
  const isPM = /pm/i.test(cleaned);
  const isAM = /am/i.test(cleaned);
  cleaned = cleaned.replace(/am|pm/gi, '').trim();

  const parts = cleaned.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10) || 0;
    const minute = parseInt(parts[1], 10) || 0;

    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;

    const hStr = hour.toString().padStart(2, '0');
    const mStr = minute.toString().padStart(2, '0');
    return `${hStr}:${mStr}`;
  }
  return timeStr;
}

/**
 * Mengecek apakah jam A lebih lambat dari jam B (format "HH:mm")
 */
export function isTimeAfter(timeA: string, timeB: string): boolean {
  const normA = normalize24HourFormat(timeA);
  const normB = normalize24HourFormat(timeB);
  return normA > normB;
}

/**
 * Helper generator jam pelajaran otomatis (contoh: 40 menit per JP)
 */
export interface GeneratedJPSlot {
  jamKe: number;
  label: string;
  jamMulai: string;
  jamSelesai: string;
  isIstirahat: boolean;
}

export function generateDefaultJPSlots(
  startHour: string = '07:15',
  durationMinutes: number = 40,
  totalJP: number = 10,
  istirahatAfterJP: number[] = [4, 7],
  durasiIstirahat: number = 30
): GeneratedJPSlot[] {
  const slots: GeneratedJPSlot[] = [];
  const normStart = normalize24HourFormat(startHour);
  const [startH, startM] = normStart.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;

  for (let i = 1; i <= totalJP; i++) {
    const jpStartH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const jpStartM = (currentMinutes % 60).toString().padStart(2, '0');
    const jpStartTime = `${jpStartH}:${jpStartM}`;

    currentMinutes += durationMinutes;

    const jpEndH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const jpEndM = (currentMinutes % 60).toString().padStart(2, '0');
    const jpEndTime = `${jpEndH}:${jpEndM}`;

    slots.push({
      jamKe: i,
      label: `Jam Ke-${i}`,
      jamMulai: jpStartTime,
      jamSelesai: jpEndTime,
      isIstirahat: false,
    });

    // Jika ada jadwal istirahat setelah JP tertentu
    if (istirahatAfterJP.includes(i) && i < totalJP) {
      const istStartH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const istStartM = (currentMinutes % 60).toString().padStart(2, '0');
      const istStartTime = `${istStartH}:${istStartM}`;

      currentMinutes += durasiIstirahat;

      const istEndH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const istEndM = (currentMinutes % 60).toString().padStart(2, '0');
      const istEndTime = `${istEndH}:${istEndM}`;

      slots.push({
        jamKe: 0,
        label: `Istirahat (${durasiIstirahat} Menit)`,
        jamMulai: istStartTime,
        jamSelesai: istEndTime,
        isIstirahat: true,
      });
    }
  }

  return slots;
}
