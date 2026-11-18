import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { isoDaysAgo } from '@/data/model';
import { resetStoredStateCache } from '@/lib/storage';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///eye.jpg' }] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///eye.jpg' }] })),
}));

const APP = './src/app';
const seed = async (role: 'parent' | 'health-worker' | 'admin', extra: Record<string, unknown> = {}) => {
  await AsyncStorage.multiSet([
    ['settings', JSON.stringify({ onboarded: true, facility: 'Agodi PHC', activeMemberId: 'm1' })],
    ['team', JSON.stringify([{ id: 'm1', name: 'Nurse Ada', role }])],
    ['babies', JSON.stringify([{ id: 'b1', name: 'Tomi', dob: isoDaysAgo(4), notes: [], createdAt: 1 }])],
    ...Object.entries(extra).map(([k, v]) => [k, JSON.stringify(v)] as [string, string]),
  ]);
};

beforeEach(async () => {
  await AsyncStorage.clear();
  resetStoredStateCache();
});

it('onboards a parent and goes straight to adding their baby', async () => {
  await renderRouter(APP, { initialUrl: '/' });
  await fireEvent.press(await screen.findByText('Get started'));
  await fireEvent.press(screen.getByText('Parent / caregiver'));
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.changeText(screen.getByLabelText('Your name'), 'Kemi');
  await fireEvent.press(screen.getByText('Next: add your baby'));

  await fireEvent.changeText(await screen.findByLabelText("Baby's name"), 'Tomi');
  await fireEvent.press(screen.getByText('Yesterday'));
  await fireEvent.press(screen.getByText('Save baby'));
  expect(await screen.findByText('1 day old', { exact: false })).toBeOnTheScreen();
  expect(JSON.parse((await AsyncStorage.getItem('team'))!)[0]).toMatchObject({ name: 'Kemi', role: 'parent' });
});

it('a scan without the model explains why and saves nothing', async () => {
  await seed('parent');
  await renderRouter(APP, { initialUrl: '/scan?babyId=b1' });
  await fireEvent.press(await screen.findByText('Take a photo'));
  await fireEvent.press(await screen.findByText('Analyse'));
  expect(await screen.findByText('Scanning needs the CribDoc app build')).toBeOnTheScreen();
  expect(JSON.parse((await AsyncStorage.getItem('screenings')) ?? '[]')).toHaveLength(0);
});

it('home flags a possible-jaundice result that has no referral', async () => {
  await seed('health-worker', {
    screenings: [{ id: 's1', babyId: 'b1', state: 'possible-jaundice', yellowIndex: 0.4, modelVersion: 'm@1', ranAt: Date.now(), timings: { prepare: 1, infer: 1, total: 2 }, imageUri: 'file:///x.jpg', by: 'Nurse Ada' }],
  });
  await renderRouter(APP, { initialUrl: '/' });
  expect(await screen.findByText('Tomi: possible jaundice')).toBeOnTheScreen();
  expect(screen.getByText('No referral yet. Tap to refer.')).toBeOnTheScreen();
});

it('a health worker refers a baby and tracks it to completion', async () => {
  await seed('health-worker');
  await renderRouter(APP, { initialUrl: '/referral/new?babyId=b1' });
  await fireEvent.changeText(await screen.findByLabelText('Facility'), 'Adeoyo Maternity');
  await fireEvent.press(screen.getByText('Create referral'));

  expect(await screen.findByText('Tomi → Adeoyo Maternity')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Seen at facility'));
  await fireEvent.changeText(screen.getByLabelText('Note (optional)'), 'Phototherapy started');
  await fireEvent.press(screen.getByText('Care completed'));
  const [r] = JSON.parse((await AsyncStorage.getItem('referrals'))!);
  expect(r.status).toBe('completed');
  expect(r.history.map((h: { status: string }) => h.status)).toEqual(['sent', 'seen', 'completed']);
  expect(r.history[2].note).toBe('Phototherapy started');
});

it('parents cannot update a referral', async () => {
  await seed('parent', {
    referrals: [{ id: 'r1', babyId: 'b1', facility: 'Adeoyo', contactPhone: '', reason: 'Check', urgency: 'urgent', status: 'sent', history: [{ status: 'sent', at: 1, by: 'Kemi' }], createdAt: 1 }],
  });
  await renderRouter(APP, { initialUrl: '/referral/r1' });
  expect(await screen.findByText('Tomi → Adeoyo')).toBeOnTheScreen();
  expect(screen.queryByText('Seen at facility')).toBeNull();
  expect(screen.getByText(/A health worker or admin updates/)).toBeOnTheScreen();
});

it('an admin adds a team member and can switch to them', async () => {
  await seed('admin');
  await renderRouter(APP, { initialUrl: '/team' });
  await fireEvent.changeText(await screen.findByLabelText('Name'), 'CHEW Musa');
  await fireEvent.press(screen.getByText('Add to team'));
  await fireEvent.press(await screen.findByLabelText('Switch to CHEW Musa'));
  expect(await screen.findByLabelText('CHEW Musa, current user')).toBeOnTheScreen();
});

it('health workers keep case notes on a baby', async () => {
  await seed('health-worker');
  await renderRouter(APP, { initialUrl: '/baby/b1' });
  await fireEvent.changeText(await screen.findByLabelText('Add a note'), 'Feeding well');
  await fireEvent.press(screen.getByText('Save note'));
  expect(await screen.findByText('Feeding well')).toBeOnTheScreen();
});
