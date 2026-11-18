import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Field, Label, Pill, Row, Screen, Small } from '@/components/ui';
import { newReferral, suggestedUrgency, type Urgency } from '@/data/model';
import { uid, useBabies, useMe, useReferrals, useScreenings } from '@/data/store';
import { stateCopy } from '@/ml/screening';

export default function NewReferral() {
  const { babyId, screeningId } = useLocalSearchParams<{ babyId: string; screeningId?: string }>();
  const { me, settings } = useMe();
  const [babies] = useBabies();
  const [screenings] = useScreenings();
  const [referrals, setReferrals] = useReferrals();
  const baby = babies.find((b) => b.id === babyId);
  const screening = screenings.find((s) => s.id === screeningId);
  const recentFacilities = [...new Set(referrals.map((r) => r.facility))].slice(0, 4);

  const [facility, setFacility] = useState(recentFacilities[0] ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [urgency, setUrgency] = useState<Urgency>(suggestedUrgency(screening?.state));
  const [reason, setReason] = useState(
    screening ? `CribDoc screening: ${stateCopy[screening.state].title.toLowerCase()}. Please assess for neonatal jaundice.` : 'Please assess for neonatal jaundice.',
  );

  const save = () => {
    const r = newReferral({ babyId, screeningId, facility: facility.trim(), contactPhone: contactPhone.trim(), reason: reason.trim(), urgency }, me?.name ?? 'Unknown', uid());
    setReferrals((l) => [r, ...l]);
    router.replace(`/referral/${r.id}`);
  };

  return (
    <Screen>
      <Body muted>
        Referring <Body style={{ fontWeight: '700' }}>{baby?.name ?? 'baby'}</Body>
        {settings.facility ? ` from ${settings.facility}` : ''}.
      </Body>
      <Field label="Facility" value={facility} onChangeText={setFacility} placeholder="e.g. Adeoyo Maternity Hospital" />
      {recentFacilities.length ? (
        <Row style={{ flexWrap: 'wrap' }}>
          {recentFacilities.map((f) => (
            <Pill key={f} active={f === facility} onPress={() => setFacility(f)}>
              {f}
            </Pill>
          ))}
        </Row>
      ) : null}
      <Field label="Facility phone (optional)" value={contactPhone} onChangeText={setContactPhone} placeholder="So you can call ahead" keyboardType="phone-pad" />
      <View style={{ gap: 6 }}>
        <Label>Urgency</Label>
        <Row>
          <Pill active={urgency === 'urgent'} onPress={() => setUrgency('urgent')}>Urgent: today</Pill>
          <Pill active={urgency === 'routine'} onPress={() => setUrgency('routine')}>Routine</Pill>
        </Row>
        {screening?.state === 'possible-jaundice' ? <Small>Marked urgent because the screening showed possible jaundice.</Small> : null}
      </View>
      <Field label="Reason" value={reason} onChangeText={setReason} multiline />
      <Button big title="Create referral" icon="paper-plane" disabled={!facility.trim() || !reason.trim() || !baby} onPress={save} />
    </Screen>
  );
}
