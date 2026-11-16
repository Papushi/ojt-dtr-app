export type EntryType = 'regular' | 'holiday' | 'absent';

export interface DTREntry {
  id: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm
  timeOut: string; // HH:mm
  breakMinutes: number;
  isOvertime: boolean;
  overtimeReason?: string;
  remarks: string;
  type: EntryType;
  totalHours: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
  supervisorName?: string;
  department?: string;
  trainingCategory?: string;
}

export interface AppConfig {
  targetHours: number;
  theme: 'light' | 'dark';
  timeFormat: '12h' | '24h';
  roundTo15Min?: boolean;
  onboardingCompleted?: boolean;
  acceptedTermsAt?: string;
}

export interface DraftEntry extends Partial<DTREntry> {
  draftId: string;
  lastSaved: number;
  label?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
