/**
 * Timezone and Date calculations for GioCasa (Asia/Kolkata - IST UTC+5:30)
 */

export const TIMEZONE = 'Asia/Kolkata';

export function getNowInKolkata(): {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  totalMinutes: number;
} {
  const now = new Date();
  
  // Format to Asia/Kolkata locale string.
  // IMPORTANT: Use hourCycle:'h23' (NOT hour12:false) to guarantee midnight
  // formats as '00' and not '24'. When hour12:false is used with the 'en-CA'
  // locale on Node.js (V8), the h24 cycle is chosen, which returns '24' for
  // 00:xx — causing totalMinutes = 1486 and all slots appearing as "passed".
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23', // h23 = 0–23, never returns 24
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  // Defensive: normalize hour 24 → 0 in case the runtime still returns h24
  const rawHour = parseInt(partMap.hour || '0', 10);
  const hour = rawHour % 24;
  const minute = parseInt(partMap.minute || '0', 10);
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  
  // Determine day of week in Asia/Kolkata
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
  });
  const weekday = dayFormatter.format(now);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };
  const dayOfWeek = weekdayMap[weekday] ?? now.getDay();

  return {
    dateStr,
    timeStr,
    dayOfWeek,
    totalMinutes: hour * 60 + minute,
  };
}

/**
 * Converts 'HH:mm' string to total minutes from midnight (e.g. '14:30' -> 870)
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Converts total minutes from midnight to 'HH:mm' string
 */
export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats 24h '14:30' into 12h readable '2:30 PM'
 */
export function formatTo12Hour(timeStr: string): string {
  const mins = timeToMinutes(timeStr);
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * GioCasa Operating Hours:
 * Daily: 11:00 AM – 11:00 PM (11:00 to 23:00)
 */
export function getOperatingHours(_dateStr: string): {
  openMinutes: number;
  closeMinutes: number;
  openTime: string;
  closeTime: string;
  isOpenDay: boolean;
} {
  const openMinutes = 11 * 60; // 11:00 AM (660)
  const closeMinutes = 23 * 60; // 11:00 PM (1380)

  return {
    openMinutes,
    closeMinutes,
    openTime: '11:00',
    closeTime: '23:00',
    isOpenDay: true,
  };
}

/**
 * Checks whether two time intervals overlap.
 * Interval [startA, endA) and [startB, endB) overlap if and only if:
 * startA < endB && endA > startB
 */
export function doIntervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Generates an alphanumeric uppercase booking ID like 'GC-A9F43B'
 */
export function generateBookingId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GC-${code}`;
}
