import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';

import { Avatar, Badge, Body, Button, Card, Empty, Field, H1, Icon, ListItem, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { ageLabel, can, statusLabel } from '@/data/model';
import { uid, useBaby, useBabies, useMe, useReferrals, useReminders, useScreenings } from '@/data/store';
import { deletePhoto } from '@/lib/photos';
import { shareReport } from '@/lib/report';
import { stateCopy } from '@/ml/screening';
import { space, usePalette } from '@/theme';

export default function BabyCase() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, settings } = useMe();
  const { baby, update } = useBaby(id);
  const [, setBabies] = useBabies();
  const [screenings, setScreenings] = useScreenings();
  const [referrals, setReferrals] = useReferrals();
  const [, setReminders] = useReminders();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  if (!baby) return <Screen><Empty icon="help-circle-outline" title="Baby not found" body="This record may have been deleted." /></Screen>;

  const mine = screenings.filter((s) => s.babyId === baby.id).sort((a, b) => b.ranAt - a.ranAt);
  const refs = referrals.filter((r) => r.babyId === baby.id).sort((a, b) => b.createdAt - a.createdAt);

  const addNote = () => {
    update({ notes: [{ id: uid(), at: Date.now(), by: me?.name ?? 'Unknown', text: note.trim() }, ...baby.notes] });
    setNote('');
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      await shareReport(baby, mine, refs, { facility: settings.facility, preparedBy: me?.name });
    } catch {
      Alert.alert('Could not create the report', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    const go = () => {
      mine.forEach((s) => deletePhoto(s.imageUri));
      setScreenings((l) => l.filter((s) => s.babyId !== baby.id));
      setReferrals((l) => l.filter((r) => r.babyId !== baby.id));
      setReminders((l) => l.filter((r) => r.babyId !== baby.id));
      setBabies((l) => l.filter((b) => b.id !== baby.id));
      router.back();
    };
    if (Platform.OS === 'web') return go();
    Alert.alert(`Delete ${baby.name}?`, 'All screenings, photos, referrals and reminders for this baby will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: baby.name }} />
      <Row style={{ gap: space.md }}>
        <Avatar name={baby.name} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <H1 style={{ fontSize: 26 }}>{baby.name}</H1>
          <Small>
            {ageLabel(baby.dob, now)} · born {baby.dob}
            {baby.birthWeightKg ? ` · ${baby.birthWeightKg} kg` : ''}
          </Small>
          {baby.caregiverName || baby.caregiverPhone ? (
            <Small>
              Caregiver: {baby.caregiverName ?? ''} {baby.caregiverPhone ? `· ${baby.caregiverPhone}` : ''}
            </Small>
          ) : null}
        </View>
      </Row>

      <Row>
        {can(me?.role, 'screen') ? <Button title="Screen" icon="scan" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/scan', params: { babyId: baby.id } })} /> : null}
        {can(me?.role, 'refer') ? <Button title="Refer" icon="paper-plane-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/referral/new', params: { babyId: baby.id, screeningId: mine[0]?.id } })} /> : null}
      </Row>
      <Row>
        <Button title="Reminder" icon="alarm-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/reminders', params: { babyId: baby.id } })} />
        {baby.caregiverPhone ? <Button title="Call" icon="call-outline" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${baby.caregiverPhone}`)} /> : null}
        {can(me?.role, 'export') ? <Button title="PDF" icon="document-text-outline" variant="secondary" style={{ flex: 1 }} loading={busy} onPress={exportPdf} /> : null}
      </Row>

      <SectionTitle>Screenings</SectionTitle>
      {mine.length === 0 ? (
        <Card><Small>No screenings yet. Tap Screen to take the first eye photo.</Small></Card>
      ) : (
        mine.map((s) => {
          const copy = stateCopy[s.state];
          return (
            <Card key={s.id} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <Image source={{ uri: s.imageUri }} style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: c.chip }} contentFit="cover" accessibilityLabel="Eye photo" />
              <View style={{ flex: 1, gap: 4 }}>
                <Badge tone={copy.tone}>{copy.title}</Badge>
                <Small>
                  {new Date(s.ranAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {s.by}
                </Small>
              </View>
            </Card>
          );
        })
      )}

      <SectionTitle>Referrals</SectionTitle>
      {refs.length === 0 ? (
        <Card><Small>No referrals for {baby.name}.</Small></Card>
      ) : (
        refs.map((r) => (
          <ListItem
            key={r.id}
            title={r.facility}
            subtitle={`${statusLabel[r.status]} · ${new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            leading={<Icon name={r.urgency === 'urgent' ? 'alert-circle' : 'paper-plane-outline'} size={24} color={r.urgency === 'urgent' ? c.danger : c.primary} />}
            onPress={() => router.push(`/referral/${r.id}`)}
          />
        ))
      )}

      {can(me?.role, 'case-notes') ? (
        <>
          <SectionTitle>Case notes</SectionTitle>
          <Field label="Add a note" value={note} onChangeText={setNote} placeholder="e.g. Feeding well, mild yellowing of the face only" multiline />
          <Button title="Save note" variant="secondary" icon="create-outline" disabled={!note.trim()} onPress={addNote} />
          {baby.notes.map((n) => (
            <Card key={n.id}>
              <Small>
                {new Date(n.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {n.by}
              </Small>
              <Body>{n.text}</Body>
            </Card>
          ))}
        </>
      ) : null}

      {can(me?.role, 'delete-records') ? <Button title={`Delete ${baby.name}'s records`} variant="ghost" icon="trash-outline" onPress={remove} /> : null}
      <Text style={{ height: 1 }} />
    </Screen>
  );
}
