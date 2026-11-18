/**
 * CribDoc's data model and the pure rules that act on it.
 * Everything here is plain data + functions, so it's easy to test and to move
 * to a synced backend later without touching the screens.
 */
import type { ScreeningResult, ScreeningState } from '@/ml/screening';

export type Role = 'parent' | 'health-worker' | 'admin';

export interface Member {
  id: string;
  name: string;
  role: Role;
}

export interface Settings {
  onboarded: boolean;
  facility: string;
  activeMemberId: string | null;
}

export interface Baby {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  sex?: 'female' | 'male';
  birthWeightKg?: number;
  caregiverName?: string;
  caregiverPhone?: string;
  notes: CaseNote[];
  createdAt: number;
}

export interface CaseNote {
  id: string;
  at: number;
  by: string;
  text: string;
}

export interface Screening extends ScreeningResult {
  id: string;
  babyId: string;
  imageUri: string;
  by: string;
}

export type ReferralStatus = 'sent' | 'seen' | 'completed' | 'cancelled';
export type Urgency = 'urgent' | 'routine';

export interface Referral {
  id: string;
  babyId: string;
  screeningId?: string;
  facility: string;
  contactPhone: string;
  reason: string;
  urgency: Urgency;
  status: ReferralStatus;
  history: { status: ReferralStatus; at: number; by: string; note?: string }[];
  createdAt: number;
}

export interface Reminder {
  id: string;
  babyId: string;
  at: number;
  note: string;
  done: boolean;
  notificationId?: string;
}

/* ---------------------------------------------------------------- roles */

export type Permission =
  | 'screen'
  | 'add-baby'
  | 'refer'
  | 'update-referral'
  | 'case-notes'
  | 'delete-records'
  | 'manage-team'
  | 'export';

const grants: Record<Role, Permission[]> = {
  parent: ['screen', 'add-baby', 'refer', 'export'],
  'health-worker': ['screen', 'add-baby', 'refer', 'update-referral', 'case-notes', 'export'],
  admin: ['screen', 'add-baby', 'refer', 'update-referral', 'case-notes', 'delete-records', 'manage-team', 'export'],
};

export const can = (role: Role | undefined, p: Permission) => (role ? grants[role].includes(p) : false);

export const roleLabel: Record<Role, string> = { parent: 'Parent / caregiver', 'health-worker': 'Health worker', admin: 'Admin' };
export const roleBlurb: Record<Role, string> = {
  parent: 'Screen your baby, keep records and get help quickly.',
  'health-worker': 'Screen many babies, keep case notes and track referrals.',
  admin: 'Everything a health worker can do, plus manage the team on this device.',
};

/* ---------------------------------------------------------------- babies */

const DAY = 86_400_000;

/** Age in whole days from YYYY-MM-DD, or null if the date is invalid or in the future. */
export function ageInDays(dob: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const t = Date.parse(`${dob}T00:00:00`);
  if (Number.isNaN(t) || t > now) return null;
  return Math.floor((now - t) / DAY);
}

export function ageLabel(dob: string, now = Date.now()) {
  const d = ageInDays(dob, now);
  if (d === null) return 'Age unknown';
  if (d === 0) return 'Born today';
  if (d < 28) return `${d} day${d === 1 ? '' : 's'} old`;
  const w = Math.floor(d / 7);
  return `${w} weeks old`;
}

/** YYYY-MM-DD for "n days ago" in local time. */
export function isoDaysAgo(n: number, now = Date.now()) {
  const d = new Date(now - n * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function latestScreening(screenings: Screening[], babyId: string) {
  return screenings.filter((s) => s.babyId === babyId).sort((a, b) => b.ranAt - a.ranAt)[0];
}

/* ---------------------------------------------------------------- referrals */

export const nextStatuses: Record<ReferralStatus, ReferralStatus[]> = {
  sent: ['seen', 'cancelled'],
  seen: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const statusLabel: Record<ReferralStatus, string> = { sent: 'Sent', seen: 'Seen at facility', completed: 'Completed', cancelled: 'Cancelled' };

export function newReferral(
  input: Pick<Referral, 'babyId' | 'screeningId' | 'facility' | 'contactPhone' | 'reason' | 'urgency'>,
  by: string,
  id: string,
  now = Date.now(),
): Referral {
  return { ...input, id, status: 'sent', history: [{ status: 'sent', at: now, by }], createdAt: now };
}

/** Move a referral forward. Invalid transitions are ignored (returns the same object). */
export function advanceReferral(r: Referral, to: ReferralStatus, by: string, note?: string, now = Date.now()): Referral {
  if (!nextStatuses[r.status].includes(to)) return r;
  return { ...r, status: to, history: [...r.history, { status: to, at: now, by, note }] };
}

export const isOpen = (r: Referral) => r.status === 'sent' || r.status === 'seen';

/** Urgent first, then oldest first: what needs attention. */
export function sortReferrals(list: Referral[]) {
  return [...list].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || (a.urgency === b.urgency ? 0 : a.urgency === 'urgent' ? -1 : 1) || a.createdAt - b.createdAt);
}

export const suggestedUrgency = (state: ScreeningState | undefined): Urgency => (state === 'possible-jaundice' ? 'urgent' : 'routine');

/* ---------------------------------------------------------------- reminders */

export const dueReminders = (list: Reminder[], now = Date.now()) => list.filter((r) => !r.done && r.at <= now).sort((a, b) => a.at - b.at);
export const upcomingReminders = (list: Reminder[], now = Date.now()) => list.filter((r) => !r.done && r.at > now).sort((a, b) => a.at - b.at);
