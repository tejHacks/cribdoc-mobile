import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Field, Label, Pill, Row, Screen } from '@/components/ui';
import { ageInDays, isoDaysAgo, type Baby } from '@/data/model';
import { uid, useBabies } from '@/data/store';

export default function NewBaby() {
  const [, setBabies] = useBabies();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Baby['sex']>();
  const [weight, setWeight] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [now] = useState(() => Date.now());

  const days = ageInDays(dob, now);
  const kg = weight ? Number(weight.replace(',', '.')) : undefined;
  const valid = name.trim().length > 0 && days !== null && days <= 365 && (kg === undefined || (kg > 0.3 && kg < 7));

  const save = () => {
    const id = uid();
    setBabies((list) => [
      ...list,
      { id, name: name.trim(), dob, sex, birthWeightKg: kg, caregiverName: caregiverName.trim() || undefined, caregiverPhone: caregiverPhone.trim() || undefined, notes: [], createdAt: Date.now() },
    ]);
    router.replace(`/baby/${id}`);
  };

  return (
    <Screen>
      <Body muted>Saved only on this phone.</Body>
      <Field label="Baby's name" value={name} onChangeText={setName} placeholder="e.g. Tomi" autoFocus />

      <View style={{ gap: 6 }}>
        <Label>Date of birth</Label>
        <Row style={{ flexWrap: 'wrap' }}>
          {[0, 1, 2, 3, 5, 7].map((n) => {
            const iso = isoDaysAgo(n, now);
            return (
              <Pill key={n} active={dob === iso} onPress={() => setDob(iso)}>
                {n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`}
              </Pill>
            );
          })}
        </Row>
      </View>
      <Field
        label="Or type it (YYYY-MM-DD)"
        value={dob}
        onChangeText={setDob}
        placeholder={isoDaysAgo(4, now)}
        keyboardType="numbers-and-punctuation"
        hint={dob && days === null ? 'Use YYYY-MM-DD, not in the future.' : days !== null ? `${days} day${days === 1 ? '' : 's'} old` : undefined}
      />

      <View style={{ gap: 6 }}>
        <Label>Sex (optional)</Label>
        <Row>
          <Pill active={sex === 'female'} onPress={() => setSex(sex === 'female' ? undefined : 'female')}>Girl</Pill>
          <Pill active={sex === 'male'} onPress={() => setSex(sex === 'male' ? undefined : 'male')}>Boy</Pill>
        </Row>
      </View>
      <Field label="Birth weight in kg (optional)" value={weight} onChangeText={setWeight} placeholder="e.g. 3.2" keyboardType="decimal-pad" />
      <Field label="Caregiver's name (optional)" value={caregiverName} onChangeText={setCaregiverName} placeholder="e.g. Mrs Bello" />
      <Field label="Caregiver's phone (optional)" value={caregiverPhone} onChangeText={setCaregiverPhone} placeholder="080…" keyboardType="phone-pad" />

      <Button big title="Save baby" icon="checkmark" disabled={!valid} onPress={save} />
    </Screen>
  );
}
