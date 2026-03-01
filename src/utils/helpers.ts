import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(decimalHours: number): string {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

export function calculateHours(timeIn: string, timeOut: string, breakMinutes: number): number {
  if (!timeIn || !timeOut) return 0;

  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);

  let diffMs = (outH * 60 + outM) - (inH * 60 + inM);
  
  // Handle midnight crossing
  if (diffMs < 0) {
    diffMs += 24 * 60;
  }

  const netMinutes = diffMs - breakMinutes;
  return Math.max(0, netMinutes / 60);
}

export function getDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
