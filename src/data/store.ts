import { useStoredState } from '@/lib/storage';
import type { ScreeningResult } from '@/ml/screening';

export interface Baby {
  name: string;
  dob: string; // YYYY-MM-DD
}

export interface ScreeningRecord extends ScreeningResult {
  id: string;
  babyName: string;
  imageUri: string;
}

export const useBaby = () => useStoredState<Baby>('baby', { name: '', dob: '' });
export const useRecords = () => useStoredState<ScreeningRecord[]>('records', []);

/** Age in days from an ISO date, or null if invalid. */
export function ageInDays(dob: string, now = Date.now()) {
  const t = Date.parse(dob);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}
