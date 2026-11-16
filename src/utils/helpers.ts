import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DTREntry, EntryType } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a YYYY-MM-DD string in local time to prevent UTC timezone day-shift bugs.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date(dateStr);
  return new Date(year, month - 1, day);
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDuration(decimalHours: number): string {
  const safe = Math.max(0, decimalHours);
  const hours = Math.floor(safe);
  const minutes = Math.round((safe - hours) * 60);
  if (minutes === 60) {
    return `${hours + 1}:00`;
  }
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export function formatTimeDisplay(time24: string, format: '12h' | '24h' = '12h'): string {
  if (!time24 || !time24.includes(':')) return '--:--';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;

  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function calculateHours(
  timeIn: string,
  timeOut: string,
  breakMinutes: number,
  type: EntryType = 'regular',
  roundTo15Min = false
): number {
  if (type === 'absent') return 0;
  if (!timeIn || !timeOut) return 0;

  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  if ([inH, inM, outH, outM].some(Number.isNaN)) return 0;

  let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);

  // Handle midnight crossing (e.g. 22:00 to 06:00)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }

  let netMinutes = Math.max(0, diffMinutes - Math.max(0, breakMinutes || 0));
  if (roundTo15Min) {
    netMinutes = Math.round(netMinutes / 15) * 15;
  }

  return Number((netMinutes / 60).toFixed(2));
}

export function isMidnightCrossing(timeIn: string, timeOut: string): boolean {
  if (!timeIn || !timeOut) return false;
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  return outH * 60 + outM < inH * 60 + inM;
}

export function getDayName(dateStr: string, short = false): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: short ? 'short' : 'long' });
}

export function formatDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatReadableDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function normalizeTimeInput(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  // Match 12h format e.g. "7:00 AM" or "05:30 PM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2];
    const period = match12[3];
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  // Match 24h format e.g. "07:00" or "7:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return `${String(parseInt(match24[1], 10)).padStart(2, '0')}:${match24[2]}`;
  }
  return '07:00';
}

export function parseCSVEntries(csvText: string): DTREntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const rows = lines.slice(1);
  const parsed: DTREntry[] = [];

  for (const row of rows) {
    // Handle quoted CSV cells
    const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
    const clean = cols.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    if (clean.length < 4) continue;

    // Expected columns: Date, Day(optional), Time In, Time Out, Break, Hours(optional), Remarks, Type(optional)
    const rawDate = clean[0];
    let isoDate = rawDate;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [dd, mm, yyyy] = rawDate.split('/');
      isoDate = `${yyyy}-${mm}-${dd}`;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      continue;
    }

    const hasDayCol = clean.length >= 6 && /^[A-Za-z]+$/.test(clean[1]);
    const timeIn = normalizeTimeInput(clean[hasDayCol ? 2 : 1] || '07:00');
    const timeOut = normalizeTimeInput(clean[hasDayCol ? 3 : 2] || '17:00');
    const breakVal = parseInt(clean[hasDayCol ? 4 : 3] || '60', 10);
    const breakMinutes = Number.isNaN(breakVal) ? 60 : breakVal;
    const remarks = clean[hasDayCol ? 6 : 5] || clean[hasDayCol ? 5 : 4] || '';
    const rawType = (clean[clean.length - 1] || '').toLowerCase();
    const type: EntryType =
      rawType === 'absent' || rawType === 'holiday' ? rawType : 'regular';

    const totalHours = calculateHours(timeIn, timeOut, breakMinutes, type);
    parsed.push({
      id: crypto.randomUUID(),
      date: isoDate,
      timeIn,
      timeOut,
      breakMinutes,
      isOvertime: totalHours > 9,
      overtimeReason: '',
      remarks: remarks === String(totalHours) ? '' : remarks,
      type,
      totalHours,
    });
  }

  return parsed;
}
