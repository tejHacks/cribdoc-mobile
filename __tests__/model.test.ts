import { advanceReferral, ageInDays, ageLabel, can, dueReminders, isoDaysAgo, newReferral, sortReferrals, suggestedUrgency, upcomingReminders, type Referral } from '@/data/model';
import { reportHtml } from '@/lib/report';
import { MODEL, ModelUnavailableError, screenImage, unavailableReason } from '@/ml/screening';

const NOW = new Date(2026, 10, 18, 12).getTime();

describe('roles', () => {
  it('parents screen and refer, but cannot update referrals or manage the team', () => {
    expect(can('parent', 'screen')).toBe(true);
    expect(can('parent', 'refer')).toBe(true);
    expect(can('parent', 'update-referral')).toBe(false);
    expect(can('parent', 'manage-team')).toBe(false);
  });
  it('health workers keep case notes and update referrals; only admins delete and manage the team', () => {
    expect(can('health-worker', 'case-notes')).toBe(true);
    expect(can('health-worker', 'update-referral')).toBe(true);
    expect(can('health-worker', 'delete-records')).toBe(false);
    expect(can('admin', 'delete-records')).toBe(true);
    expect(can('admin', 'manage-team')).toBe(true);
    expect(can(undefined, 'screen')).toBe(false);
  });
});

describe('ages', () => {
  it('counts whole days and rejects bad or future dates', () => {
    expect(ageInDays(isoDaysAgo(4, NOW), NOW)).toBe(4);
    expect(ageInDays('2026-13-40', NOW)).toBeNull();
    expect(ageInDays('2027-01-01', NOW)).toBeNull();
    expect(ageInDays('18/11/2026', NOW)).toBeNull();
  });
  it('reads naturally', () => {
    expect(ageLabel(isoDaysAgo(0, NOW), NOW)).toBe('Born today');
    expect(ageLabel(isoDaysAgo(1, NOW), NOW)).toBe('1 day old');
    expect(ageLabel(isoDaysAgo(35, NOW), NOW)).toBe('5 weeks old');
  });
});

describe('referrals', () => {
  const base = newReferral({ babyId: 'b1', facility: 'Adeoyo', contactPhone: '', reason: 'Possible jaundice', urgency: 'urgent' }, 'Ada', 'r1', NOW);

  it('start as sent with a history entry', () => {
    expect(base.status).toBe('sent');
    expect(base.history).toEqual([{ status: 'sent', at: NOW, by: 'Ada' }]);
  });

  it('move sent → seen → completed and record who did it', () => {
    const seen = advanceReferral(base, 'seen', 'Dr Ade', 'Phototherapy started', NOW + 1);
    const done = advanceReferral(seen, 'completed', 'Dr Ade', undefined, NOW + 2);
    expect(done.status).toBe('completed');
    expect(done.history.map((h) => h.status)).toEqual(['sent', 'seen', 'completed']);
    expect(seen.history[1].note).toBe('Phototherapy started');
  });

  it('ignore invalid jumps', () => {
    expect(advanceReferral(base, 'completed', 'x')).toBe(base);
    const cancelled = advanceReferral(base, 'cancelled', 'x');
    expect(advanceReferral(cancelled, 'seen', 'x')).toBe(cancelled);
  });

  it('sort open urgent ones first', () => {
    const r = (id: string, urgency: Referral['urgency'], status: Referral['status'], createdAt: number): Referral => ({ ...base, id, urgency, status, createdAt });
    const sorted = sortReferrals([r('a', 'routine', 'sent', 1), r('b', 'urgent', 'completed', 2), r('c', 'urgent', 'sent', 3)]);
    expect(sorted.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('suggest urgent for possible jaundice', () => {
    expect(suggestedUrgency('possible-jaundice')).toBe('urgent');
    expect(suggestedUrgency('no-yellowing')).toBe('routine');
    expect(suggestedUrgency(undefined)).toBe('routine');
  });
});

it('splits reminders into due and upcoming', () => {
  const list = [
    { id: '1', babyId: 'b', at: NOW - 10, note: '', done: false },
    { id: '2', babyId: 'b', at: NOW + 10, note: '', done: false },
    { id: '3', babyId: 'b', at: NOW - 10, note: '', done: true },
  ];
  expect(dueReminders(list, NOW).map((r) => r.id)).toEqual(['1']);
  expect(upcomingReminders(list, NOW).map((r) => r.id)).toEqual(['2']);
});

it('the PDF report escapes user text', () => {
  const html = reportHtml({ id: 'b', name: '<script>x</script>', dob: '2026-11-14', notes: [], createdAt: NOW }, [], [], { now: NOW });
  expect(html).not.toContain('<script>x');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('not a diagnosis');
});

describe('screening without a model', () => {
  it('never returns a made-up result', async () => {
    expect(MODEL.calibrated).toBe(false);
    expect(unavailableReason()).toBe('no-runtime');
    await expect(screenImage('file:///photo.jpg')).rejects.toBeInstanceOf(ModelUnavailableError);
  });
});
