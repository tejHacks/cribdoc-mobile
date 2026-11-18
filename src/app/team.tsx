import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Body, Button, Card, Field, IconButton, Label, ListItem, Pill, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { can, roleBlurb, roleLabel, type Role } from '@/data/model';
import { uid, useMe, useTeam } from '@/data/store';

export default function Team() {
  const { me, team, switchTo, settings, setSettings } = useMe();
  const [, setTeam] = useTeam();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('health-worker');
  const [facility, setFacility] = useState(settings.facility);
  const admin = can(me?.role, 'manage-team');

  const add = () => {
    setTeam((t) => [...t, { id: uid(), name: name.trim(), role }]);
    setName('');
  };

  return (
    <Screen>
      <Body muted>
        Several people can share one phone, for example in a clinic. Each person&apos;s name goes on the screenings, notes and referrals they make.
      </Body>

      <SectionTitle>People on this phone</SectionTitle>
      {team.map((m) => (
        <ListItem
          key={m.id}
          title={m.name}
          subtitle={roleLabel[m.role]}
          leading={<Avatar name={m.name} />}
          trailing={
            m.id === me?.id ? (
              <Badge tone="info">You</Badge>
            ) : admin ? (
              <IconButton icon="person-remove-outline" label={`Remove ${m.name}`} onPress={() => setTeam((t) => t.filter((x) => x.id !== m.id))} />
            ) : null
          }
          onPress={m.id === me?.id ? undefined : () => switchTo(m.id)}
          accessibilityLabel={m.id === me?.id ? `${m.name}, current user` : `Switch to ${m.name}`}
        />
      ))}
      {team.length > 1 ? <Small>Tap a person to switch to them.</Small> : null}

      {admin ? (
        <>
          <SectionTitle>Add someone</SectionTitle>
          <Card>
            <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. CHEW Musa" />
            <Label>Role</Label>
            <Row style={{ flexWrap: 'wrap' }}>
              {(['parent', 'health-worker', 'admin'] as Role[]).map((r) => (
                <Pill key={r} active={r === role} onPress={() => setRole(r)}>{roleLabel[r]}</Pill>
              ))}
            </Row>
            <Small>{roleBlurb[role]}</Small>
            <Button title="Add to team" icon="person-add-outline" disabled={!name.trim()} onPress={add} />
          </Card>

          <SectionTitle>Facility</SectionTitle>
          <Field label="Clinic or facility name" value={facility} onChangeText={setFacility} placeholder="Shown on referrals and reports" />
          <Button title="Save facility" variant="secondary" disabled={facility.trim() === settings.facility} onPress={() => setSettings((s) => ({ ...s, facility: facility.trim() }))} />
        </>
      ) : (
        <Small>Only an admin can add or remove people.</Small>
      )}

      <SectionTitle>What each role can do</SectionTitle>
      {(['parent', 'health-worker', 'admin'] as Role[]).map((r) => (
        <View key={r} style={{ gap: 2 }}>
          <Body style={{ fontWeight: '700' }}>{roleLabel[r]}</Body>
          <Small>{roleBlurb[r]}</Small>
        </View>
      ))}
    </Screen>
  );
}
