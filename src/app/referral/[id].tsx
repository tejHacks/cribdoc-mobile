import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, Text, View } from 'react-native';

import { Badge, Body, Button, Card, Empty, Field, H1, Icon, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { advanceReferral, ageLabel, can, nextStatuses, statusLabel, type ReferralStatus } from '@/data/model';
import { useBabies, useMe, useReferrals, useScreenings } from '@/data/store';
import { stateCopy } from '@/ml/screening';
import { space, usePalette } from '@/theme';

const actionLabel: Record<ReferralStatus, string> = { sent: 'Mark sent', seen: 'Seen at facility', completed: 'Care completed', cancelled: 'Cancel referral' };

export default function ReferralDetail() {
  const c = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, settings } = useMe();
  const [referrals, setReferrals] = useReferrals();
  const [babies] = useBabies();
  const [screenings] = useScreenings();
  const [note, setNote] = useState('');
  const r = referrals.find((x) => x.id === id);
  if (!r) return <Screen><Empty icon="help-circle-outline" title="Referral not found" body="It may have been deleted." /></Screen>;
  const baby = babies.find((b) => b.id === r.babyId);
  const screening = screenings.find((s) => s.id === r.screeningId);

  const move = (to: ReferralStatus) => {
    setReferrals((l) => l.map((x) => (x.id === r.id ? advanceReferral(x, to, me?.name ?? 'Unknown', note.trim() || undefined) : x)));
    setNote('');
  };

  const share = () =>
    Share.share({
      message: [
        `${r.urgency === 'urgent' ? 'URGENT ' : ''}Referral for ${baby?.name ?? 'a newborn'} (${baby ? ageLabel(baby.dob) : ''})`,
        `To: ${r.facility}`,
        r.reason,
        screening ? `Screening: ${stateCopy[screening.state].title} on ${new Date(screening.ranAt).toLocaleDateString('en-GB')}` : '',
        baby?.caregiverPhone ? `Caregiver: ${baby.caregiverName ?? ''} ${baby.caregiverPhone}` : '',
        `From: ${r.history[0].by}${settings.facility ? `, ${settings.facility}` : ''}`,
        'Sent with CribDoc (screening aid, not a diagnosis).',
      ]
        .filter(Boolean)
        .join('\n'),
    });

  const next = nextStatuses[r.status];
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge tone={r.urgency === 'urgent' ? 'danger' : 'info'} icon={r.urgency === 'urgent' ? 'alert-circle' : 'time-outline'}>
          {r.urgency === 'urgent' ? 'Urgent' : 'Routine'}
        </Badge>
        <Badge tone={r.status === 'completed' ? 'ok' : r.status === 'cancelled' ? 'neutral' : 'warn'}>{statusLabel[r.status]}</Badge>
      </Row>
      <H1 style={{ fontSize: 26 }}>{baby?.name ?? 'Baby'} → {r.facility}</H1>
      <Body muted>{r.reason}</Body>

      <Row>
        <Button title="Share" icon="share-outline" variant="secondary" style={{ flex: 1 }} onPress={share} />
        {r.contactPhone ? <Button title="Call facility" icon="call-outline" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${r.contactPhone}`)} /> : null}
      </Row>
      {baby ? <Button title={`Open ${baby.name}'s record`} variant="ghost" onPress={() => router.push(`/baby/${baby.id}`)} /> : null}

      <SectionTitle>Timeline</SectionTitle>
      <Card style={{ gap: space.md }}>
        {r.history.map((h, i) => (
          <Row key={`${h.status}-${h.at}`} style={{ alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 22 }}>
              <Icon name={h.status === 'cancelled' ? 'close-circle' : 'checkmark-circle'} size={20} color={h.status === 'cancelled' ? c.subtle : c.primary} />
              {i < r.history.length - 1 ? <View style={{ width: 2, height: 24, backgroundColor: c.border, marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '700' }}>{statusLabel[h.status]}</Text>
              <Small>
                {new Date(h.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {h.by}
              </Small>
              {h.note ? <Body>{h.note}</Body> : null}
            </View>
          </Row>
        ))}
      </Card>

      {next.length && can(me?.role, 'update-referral') ? (
        <>
          <SectionTitle>Update</SectionTitle>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Seen by Dr Ade, phototherapy started" multiline />
          {next.map((s) => (
            <Button key={s} title={actionLabel[s]} variant={s === 'cancelled' ? 'ghost' : 'primary'} icon={s === 'cancelled' ? 'close' : 'checkmark'} onPress={() => move(s)} />
          ))}
        </>
      ) : next.length ? (
        <Small>A health worker or admin updates this referral when the baby is seen.</Small>
      ) : null}
    </Screen>
  );
}
