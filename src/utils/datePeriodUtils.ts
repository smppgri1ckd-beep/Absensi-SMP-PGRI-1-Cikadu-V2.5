/**
 * Utility functions for Date Period Filtering across all features
 * Supports: Hari Ini / Tanggal Spesifik, Minggu Ini, Bulan Ini, Semester Ini, Tahun Ini, dan Semua
 */

export type TimePeriodFilter = 'hari' | 'minggu' | 'bulan' | 'semester' | 'tahun' | 'semua';

export interface PeriodInfo {
  type: TimePeriodFilter;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description: string;
}

/**
 * Format date to YYYY-MM-DD in local time
 */
export function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current system date in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  return formatDateYMD(new Date());
}

/**
 * Calculate Date range for a given period
 */
export function getPeriodDateRange(
  period: TimePeriodFilter, 
  customDate?: string,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string; label: string; description: string } {
  const ref = new Date(referenceDate);
  const todayStr = formatDateYMD(ref);

  switch (period) {
    case 'hari': {
      const activeDate = customDate || todayStr;
      const d = new Date(activeDate + 'T00:00:00');
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const isToday = activeDate === todayStr;
      const label = isToday ? 'Hari Ini' : `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
      return {
        startDate: activeDate,
        endDate: activeDate,
        label,
        description: `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
      };
    }

    case 'minggu': {
      // Minggu berjalan (Senin s/d Minggu atau 7 hari terakhir)
      const dayOfWeek = ref.getDay(); // 0 is Sunday
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(ref);
      monday.setDate(ref.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const start = formatDateYMD(monday);
      const end = formatDateYMD(sunday);

      return {
        startDate: start,
        endDate: end,
        label: 'Minggu Ini',
        description: `Rentang 1 Pekan (${start} s/d ${end})`
      };
    }

    case 'bulan': {
      const y = ref.getFullYear();
      const m = ref.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);

      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      return {
        startDate: formatDateYMD(firstDay),
        endDate: formatDateYMD(lastDay),
        label: `Bulan Ini (${monthNames[m]})`,
        description: `Bulan ${monthNames[m]} ${y}`
      };
    }

    case 'semester': {
      const y = ref.getFullYear();
      const m = ref.getMonth(); // 0-11
      // Semester Ganjil: Juli s/d Desember (m: 6-11)
      // Semester Genap: Januari s/d Juni (m: 0-5)
      const isGanjil = m >= 6;
      if (isGanjil) {
        const start = `${y}-07-01`;
        const end = `${y}-12-31`;
        return {
          startDate: start,
          endDate: end,
          label: `Semester Ganjil (${y}/${y + 1})`,
          description: `Juli - Desember ${y}`
        };
      } else {
        const start = `${y}-01-01`;
        const end = `${y}-06-30`;
        return {
          startDate: start,
          endDate: end,
          label: `Semester Genap (${y - 1}/${y})`,
          description: `Januari - Juni ${y}`
        };
      }
    }

    case 'tahun': {
      const y = ref.getFullYear();
      return {
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`,
        label: `Tahun ${y}`,
        description: `Tahun Kalender ${y} (1 Jan - 31 Des)`
      };
    }

    case 'semua':
    default: {
      return {
        startDate: '2020-01-01',
        endDate: '2030-12-31',
        label: 'Semua Waktu',
        description: 'Seluruh riwayat data yang tersimpan'
      };
    }
  }
}

/**
 * Check if a date string 'YYYY-MM-DD' falls within the selected period
 */
export function isDateInPeriod(
  dateStr: string,
  period: TimePeriodFilter,
  customDate?: string,
  referenceDate: Date = new Date()
): boolean {
  if (!dateStr) return false;
  // Normalize string if datetime ISO string is given
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10);

  if (period === 'semua') return true;

  const { startDate, endDate } = getPeriodDateRange(period, customDate, referenceDate);
  return cleanDate >= startDate && cleanDate <= endDate;
}

/**
 * Filter an array of items with a date field by period
 */
export function filterItemsByPeriod<T>(
  items: T[],
  getDate: (item: T) => string,
  period: TimePeriodFilter,
  customDate?: string,
  referenceDate: Date = new Date()
): T[] {
  if (period === 'semua') return items;
  return items.filter((item) => {
    const d = getDate(item);
    return isDateInPeriod(d, period, customDate, referenceDate);
  });
}
