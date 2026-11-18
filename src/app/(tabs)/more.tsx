import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { Avatar, Badge, Icon, ListItem, Screen, SectionTitle, Small } from '@/components/ui';
import { can, roleLabel, upcomingReminders } from '@/data/model';
import { useMe, useReminders } from '@/data/store';
import { MODEL } from '@/ml/screening';
import { usePalette } from '@/theme';

export default function More() {
  const c = usePalette();
  const { me, team, settings } = useMe();
  const [reminders] = useReminders();
  const upcoming = upcomingReminders(reminders).length;

  const signOutAll = () => {
    const go = async () => {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.clear();
      if (Platform.OS === 'web') window.location.reload();
      else Alert.alert('Data erased', 'Close and reopen CribDoc to start again.');
    };
    if (Platform.OS === 'web') void go();
    else Alert.alert('Erase all data on this phone?', 'Babies, screenings, referrals and reminders will be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => void go() },
    ]);
  };

  return (
    <Screen>
      <ListItem
        title={me?.name ?? 'You'}
        subtitle={`${me ? roleLabel[me.role] : ''}${settings.facility ? ` · ${settings.facility}` : ''}${team.length > 1 ? ` · ${team.length} people on this phone` : ''}`}
        leading={<Avatar name={me?.name ?? '?'} />}
        onPress={() => router.push('/team')}
      />

      <SectionTitle>Care</SectionTitle>
      <ListItem title="Follow-up reminders" subtitle="Rechecks and feeding checks" leading={<Icon name="alarm-outline" size={24} color={c.primary} />} trailing={upcoming ? <Badge tone="info">{upcoming}</Badge> : null} onPress={() => router.push('/reminders')} />
      <ListItem title="Jaundice & danger signs" subtitle="What to watch for and when to go now" leading={<Icon name="warning-outline" size={24} color={c.danger} />} onPress={() => router.push('/learn')} />

      <SectionTitle>Device</SectionTitle>
      <ListItem title="Team & roles" subtitle={can(me?.role, 'manage-team') ? 'Add people and set what they can do' : 'Switch user on a shared phone'} leading={<Icon name="people-circle-outline" size={24} color={c.primary} />} onPress={() => router.push('/team')} />
      <ListItem title="Screening model" subtitle={MODEL.calibrated ? `${MODEL.name} v${MODEL.version}` : 'Not installed yet'} leading={<Icon name="hardware-chip-outline" size={24} color={c.primary} />} onPress={() => router.push('/model')} />
      {can(me?.role, 'delete-records') ? (
        <ListItem title="Erase all data" subtitle="Remove everything from this phone" leading={<Icon name="trash-outline" size={24} color={c.danger} />} onPress={signOutAll} />
      ) : null}

      <Small style={{ marginTop: 8 }}>
        CribDoc is a screening aid, not a medical device, and does not diagnose jaundice. A reassuring result must never delay care. Everything is stored only on this phone.
      </Small>
    </Screen>
  );
}
