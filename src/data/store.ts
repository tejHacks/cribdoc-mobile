/**
 * Persisted app state (on-device, offline). Each collection is its own key so
 * screens only re-render for what they use.
 */
import { useCallback, useMemo } from 'react';

import { uid, useStoredState } from '@/lib/storage';
import type { Baby, Member, Referral, Reminder, Screening, Settings } from './model';

export const useSettings = () => useStoredState<Settings>('settings', { onboarded: false, facility: '', activeMemberId: null });
export const useTeam = () => useStoredState<Member[]>('team', []);
export const useBabies = () => useStoredState<Baby[]>('babies', []);
export const useScreenings = () => useStoredState<Screening[]>('screenings', []);
export const useReferrals = () => useStoredState<Referral[]>('referrals', []);
export const useReminders = () => useStoredState<Reminder[]>('reminders', []);

/** The person using the app right now (shared clinic phones can switch users). */
export function useMe() {
  const [settings, setSettings, ready] = useSettings();
  const [team, , teamReady] = useTeam();
  const me = useMemo(() => team.find((m) => m.id === settings.activeMemberId) ?? team[0], [team, settings.activeMemberId]);
  const switchTo = useCallback((id: string) => setSettings((s) => ({ ...s, activeMemberId: id })), [setSettings]);
  return { me, team, settings, setSettings, switchTo, ready: ready && teamReady };
}

export function useBaby(id: string | undefined) {
  const [babies, setBabies] = useBabies();
  const baby = babies.find((b) => b.id === id);
  const update = useCallback((patch: Partial<Baby>) => setBabies((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b))), [id, setBabies]);
  return { baby, update };
}

export { uid };
