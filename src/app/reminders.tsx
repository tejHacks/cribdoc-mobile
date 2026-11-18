import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Button, Card, Empty, Field, Icon, ListItem, Pill, Row, Screen, SectionTitle, Small, Label } from '@/components/ui';
import { dueReminders, upcomingReminders } from '@/data/model';
import { uid, useBabies, useReminders } from '@/data/store';
import { cancelReminder, scheduleReminder } from '@/lib/notify';
import { usePalette } from '@/theme';

const presets = [
  { label: 'In 4 hours', ms: 4 * 3600_000 },
  { label: 'Tomorrow', ms: 24 * 3600_000 },
  { label: 'In 2 days', ms: 48 * 3600_000 },
  { label: 'In a week', ms: 7 * 24 * 3600_000 },
];

export default function Reminders() {
  const c = usePalette();
  const params = useLocalSearchParams<{ babyId?: string }>();
  const [babies] = useBabies();
  const [reminders, setReminders] = useReminders();
  const [babyId, setBabyId] = useState(params.babyId ?? babies[0]?.id);
  const [offset, setOffset] = useState(presets[1].ms);
  const [note, setNote] = useState('Recheck the eyes and skin in daylight');
  const [now] = useState(() => Date.now());
  const name = (id: string) => babies.find((b) => b.id === id)?.name ?? 'Baby';

  const add = async () => {
    if (!babyId) return;
    const at = Date.now() + offset;
    const notificationId = await scheduleReminder(at, `CribDoc: ${name(babyId)}`, note);
    setReminders((l) => [...l, { id: uid(), babyId, at, note: note.trim(), done: false, notificationId }]);
  };
  const complete = (id: string) => {
    const r = reminders.find((x) => x.id === id);
    cancelReminder(r?.notificationId);
    setReminders((l) => l.map((x) => (x.id === id ? { ...x, done: true } : x)));
  };

  const due = dueReminders(reminders, now);
  const upcoming = upcomingReminders(reminders, now);
  const fmt = (t: number) => new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (babies.length === 0) return <Screen><Empty icon="alarm-outline" title="Add a baby first" body="Reminders belong to a baby's record." /></Screen>;

  return (
    <Screen>
      <Card>
        <Label>New reminder</Label>
        <Row style={{ flexWrap: 'wrap' }}>
          {babies.map((b) => (
            <Pill key={b.id} active={b.id === babyId} onPress={() => setBabyId(b.id)}>{b.name}</Pill>
          ))}
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          {presets.map((p) => (
            <Pill key={p.label} active={p.ms === offset} onPress={() => setOffset(p.ms)}>{p.label}</Pill>
          ))}
        </Row>
        <Field label="What to do" value={note} onChangeText={setNote} />
        <Button title="Add reminder" icon="alarm" disabled={!note.trim() || !babyId} onPress={add} />
        <Small>You&apos;ll get a notification if they&apos;re allowed. Reminders are saved here either way.</Small>
      </Card>

      {due.length ? <SectionTitle>Due now</SectionTitle> : null}
      {due.map((r) => (
        <ListItem key={r.id} title={`${name(r.babyId)}: ${r.note}`} subtitle={`Due ${fmt(r.at)}`} leading={<Icon name="alarm" size={24} color={c.danger} />} trailing={<Button title="Done" variant="secondary" style={{ minHeight: 36, paddingHorizontal: 14 }} onPress={() => complete(r.id)} />} />
      ))}
      <SectionTitle>Upcoming</SectionTitle>
      {upcoming.length === 0 ? <Small>Nothing scheduled.</Small> : null}
      {upcoming.map((r) => (
        <ListItem key={r.id} title={`${name(r.babyId)}: ${r.note}`} subtitle={fmt(r.at)} leading={<Avatar name={name(r.babyId)} size={36} />} trailing={<View><Button title="Done" variant="ghost" style={{ minHeight: 36, paddingHorizontal: 10 }} onPress={() => complete(r.id)} /></View>} />
      ))}
    </Screen>
  );
}
