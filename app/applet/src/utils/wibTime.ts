/**
 * WIB (Waktu Indonesia Barat - Asia/Jakarta - UTC+7) Time Utility
 * Dedicated timezone and 24-hour format helper for SMP PGRI 1 Cikadu, Jawa Barat
 */

/**
 * Returns current Date in WIB timezone
 */
export function getWIBDate(): Date {
  const now = new Date();
  // Format into Asia/Jakarta ISO representation
  const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  return new Date(wibString);
}

/**
 * Returns current date formatted as YYYY-MM-DD in WIB
 */
export function getWIBDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (year && month && day) {
    return `${year}-${month}-${day}`;
  }
  
  // Fallback
  const d = getWIBDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns current time formatted as 24-Hour HH:mm in WIB (e.g. "07:15", "13:30")
 */
export function getWIBCurrentTimeFormatted(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = (parts.find((p) => p.type === 'hour')?.value || '00').padStart(2, '0');
  const minute = (parts.find((p) => p.type === 'minute')?.value || '00').padStart(2, '0');

  // Sanitize hour "24" to "00" if returned by Intl
  const cleanHour = hour === '24' ? '00' : hour;
  return `${cleanHour}:${minute}`;
}

/**
 * Returns current full time formatted as HH:mm:ss in WIB
 */
export function getWIBFullTimeString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hour = (parts.find((p) => p.type === 'hour')?.value || '00').padStart(2, '0');
  const minute = (parts.find((p) => p.type === 'minute')?.value || '00').padStart(2, '0');
  const second = (parts.find((p) => p.type === 'second')?.value || '00').padStart(2, '0');

  const cleanHour = hour === '24' ? '00' : hour;
  return `${cleanHour}:${minute}:${second}`;
}

/**
 * Formats "07:15" or "13:30" string to display format "07.15 WIB"
 */
export function formatToWIBDisplay(timeStr: string): string {
  if (!timeStr) return '- WIB';
  const clean = timeStr.trim().replace(':', '.');
  return `${clean} WIB`;
}

/**
 * Normalizes user input time string to strict 24-hour HH:mm
 */
export function sanitize24HourTime(input: string): string {
  if (!input) return '07:00';
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})[:.](\d{1,2})/);
  if (match) {
    const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return '07:00';
}

/**
 * Default Master Schedule for Jam Pelajaran (JP 1 - 10 + Istirahat) in WIB
 */
export interface JamPelajaranSlot {
  jamKe: number;
  label: string;
  jamMulai: string;
  jamSelesai: string;
  isIstirahat?: boolean;
}

export const DEFAULT_JAM_PELAJARAN_MASTER: JamPelajaranSlot[] = [
  { jamKe: 1, label: 'Jam Ke-1', jamMulai: '07:15', jamSelesai: '07:55' },
  { jamKe: 2, label: 'Jam Ke-2', jamMulai: '07:55', jamSelesai: '08:35' },
  { jamKe: 3, label: 'Jam Ke-3', jamMulai: '08:35', jamSelesai: '09:15' },
  { jamKe: 4, label: 'Istirahat Pagi', jamMulai: '09:15', jamSelesai: '09:45', isIstirahat: true },
  { jamKe: 5, label: 'Jam Ke-4', jamMulai: '09:45', jamSelesai: '10:25' },
  { jamKe: 6, label: 'Jam Ke-5', jamMulai: '10:25', jamSelesai: '11:05' },
  { jamKe: 7, label: 'Jam Ke-6', jamMulai: '11:05', jamSelesai: '11:45' },
  { jamKe: 8, label: 'Istirahat Siang / ISOMA', jamMulai: '11:45', jamSelesai: '12:30', isIstirahat: true },
  { jamKe: 9, label: 'Jam Ke-7', jamMulai: '12:30', jamSelesai: '13:10' },
  { jamKe: 10, label: 'Jam Ke-8', jamMulai: '13:10', jamSelesai: '13:50' },
  { jamKe: 11, label: 'Jam Ke-9', jamMulai: '13:50', jamSelesai: '14:30' },
  { jamKe: 12, label: 'Jam Ke-10', jamMulai: '14:30', jamSelesai: '15:10' },
];

/**
 * Generator for automatic JP slots based on start time and duration per JP
 */
export function generateDefaultJpSlots(
  startHour: string = '07:15',
  durationMinutes: number = 40,
  break1Start: string = '09:15',
  break1Duration: number = 30,
  break2Start: string = '11:45',
  break2Duration: number = 45
): JamPelajaranSlot[] {
  const result: JamPelajaranSlot[] = [];
  
  function addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(2026, 0, 1, h, m + mins);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  let current = startHour;
  let jpCount = 1;

  for (let slot = 1; slot <= 12; slot++) {
    if (current === break1Start || (slot === 4 && current < '09:45')) {
      const endBreak = addMinutes(current, break1Duration);
      result.push({
        jamKe: slot,
        label: 'Istirahat Pagi',
        jamMulai: current,
        jamSelesai: endBreak,
        isIstirahat: true,
      });
      current = endBreak;
      continue;
    }

    if (current === break2Start || (slot === 8 && current >= '11:30' && current <= '12:00')) {
      const endBreak = addMinutes(current, break2Duration);
      result.push({
        jamKe: slot,
        label: 'Istirahat Siang / ISOMA',
        jamMulai: current,
        jamSelesai: endBreak,
        isIstirahat: true,
      });
      current = endBreak;
      continue;
    }

    const endJp = addMinutes(current, durationMinutes);
    result.push({
      jamKe: slot,
      label: `Jam Ke-${jpCount}`,
      jamMulai: current,
      jamSelesai: endJp,
      isIstirahat: false,
    });
    current = endJp;
    jpCount++;
  }

  return result;
}
