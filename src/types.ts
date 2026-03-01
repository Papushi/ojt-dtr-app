export interface DTREntry {
  id: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm
  timeOut: string; // HH:mm
  breakMinutes: number;
  isOvertime: boolean;
  overtimeReason?: string;
  remarks: string;
  type: 'regular' | 'holiday' | 'absent';
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
}

export interface DraftEntry extends Partial<DTREntry> {
  lastSaved: number;
}
