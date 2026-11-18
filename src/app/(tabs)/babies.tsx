import { router } from 'expo-router';
import { useState } from 'react';

import { Avatar, Badge, Button, Empty, Field, ListItem, Screen } from '@/components/ui';
import { ageLabel, can, isOpen, latestScreening } from '@/data/model';
import { useBabies, useMe, useReferrals, useScreenings } from '@/data/store';
import { stateCopy } from '@/ml/screening';

export default function Babies() {
  const { me } = useMe();
  const [babies] = useBabies();
  const [screenings] = useScreenings();
  const [referrals] = useReferrals();
  const [q, setQ] = useState('');
  const [now] = useState(() => Date.now());

  const list = babies
    .filter((b) => `${b.name} ${b.caregiverName ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (latestScreening(screenings, b.id)?.ranAt ?? b.createdAt) - (latestScreening(screenings, a.id)?.ranAt ?? a.createdAt));

  if (babies.length === 0) {
    return (
      <Screen>
        <Empty
          icon="people-outline"
          title="No babies yet"
          body="Add a baby to start screening and keep their records together."
          action={can(me?.role, 'add-baby') ? <Button title="Add a baby" icon="add" onPress={() => router.push('/baby/new')} /> : null}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {babies.length > 4 ? <Field label="Search" value={q} onChangeText={setQ} placeholder="Baby or caregiver name" /> : null}
      {list.map((b) => {
        const last = latestScreening(screenings, b.id);
        const openRef = referrals.some((r) => r.babyId === b.id && isOpen(r));
        return (
          <ListItem
            key={b.id}
            title={b.name}
            subtitle={`${ageLabel(b.dob, now)}${b.caregiverName ? ` · ${b.caregiverName}` : ''}${last ? ` · last check ${new Date(last.ranAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ' · not screened yet'}`}
            leading={<Avatar name={b.name} />}
            trailing={
              openRef ? (
                <Badge tone="danger" icon="paper-plane">Referred</Badge>
              ) : last ? (
                <Badge tone={stateCopy[last.state].tone}>{last.state === 'no-yellowing' ? 'Clear' : last.state === 'possible-jaundice' ? 'Possible' : 'Unclear'}</Badge>
              ) : null
            }
            onPress={() => router.push(`/baby/${b.id}`)}
          />
        );
      })}
      {can(me?.role, 'add-baby') ? <Button title="Add a baby" icon="add" variant="secondary" onPress={() => router.push('/baby/new')} /> : null}
    </Screen>
  );
}
