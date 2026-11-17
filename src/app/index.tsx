import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, Card, Field, H2, Label, Screen } from '@/components/ui';
import { ageInDays, useBaby, useRecords } from '@/data/store';
import { stateCopy } from '@/ml/screening';

export default function Home() {
  const [baby, setBaby, ready] = useBaby();
  const [records] = useRecords();
  const [editing, setEditing] = useState(false);

  if (!ready) return <Screen>{null}</Screen>;

  if (!baby.name || editing) {
    return <BabyForm initial={baby} onSave={(b) => { setBaby(b); setEditing(false); }} />;
  }

  // eslint-disable-next-line react-hooks/purity -- age is display-only
  const days = ageInDays(baby.dob, Date.now());

  return (
    <Screen>
      <Card onPress={() => setEditing(true)}>
        <Label>Baby</Label>
        <H2>{baby.name}</H2>
        <Body muted>{days === null ? 'Add date of birth' : `${days} day${days === 1 ? '' : 's'} old`} · tap to edit</Body>
      </Card>

      <Button big title="Start an eye-photo screening" onPress={() => router.push('/screen')} />
      <Button title="Danger signs & guidance" variant="secondary" onPress={() => router.push('/learn')} />

      <Card>
        <Label>Screening records</Label>
        {records.length === 0 ? (
          <Body muted>No screenings saved yet. Records are stored only on this phone.</Body>
        ) : (
          records.map((r) => (
            <Body key={r.id}>
              {new Date(r.ranAt).toLocaleDateString()} — {stateCopy[r.state].title}
            </Body>
          ))
        )}
      </Card>

      <Body muted style={{ fontSize: 13, lineHeight: 19 }}>
        CribDoc is not a medical device and does not diagnose jaundice. Never let an app result delay care — seek urgent help for any danger signs.
      </Body>
    </Screen>
  );
}

function BabyForm({ initial, onSave }: { initial: { name: string; dob: string }; onSave: (b: { name: string; dob: string }) => void }) {
  const [name, setName] = useState(initial.name);
  const [dob, setDob] = useState(initial.dob);
  const valid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dob) && !Number.isNaN(Date.parse(dob));
  return (
    <Screen>
      <H2>About your baby</H2>
      <Body muted>Saved only on this phone.</Body>
      <Field label="Baby's name" value={name} onChangeText={setName} placeholder="e.g. Tomi" />
      <Field label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} placeholder="2026-11-01" keyboardType="numbers-and-punctuation" />
      <Button title="Save" disabled={!valid} onPress={() => onSave({ name: name.trim(), dob })} />
    </Screen>
  );
}
