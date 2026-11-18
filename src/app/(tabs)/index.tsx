import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Badge, Card, H1, Icon, ListItem, Row, Screen, SectionTitle, Small, type Tone } from '@/components/ui';
import { ageLabel, dueReminders, isOpen, roleLabel } from '@/data/model';
import { useBabies, useMe, useReferrals, useReminders, useScreenings } from '@/data/store';
import { MODEL, stateCopy } from '@/ml/screening';
import { radius, space, usePalette } from '@/theme';

const greeting = (h: number) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
const toneFor = { ok: 'ok', warn: 'warn', neutral: 'neutral' } as const satisfies Record<string, Tone>;

export default function Home() {
  const c = usePalette();
  const { me, settings } = useMe();
  const [babies] = useBabies();
  const [screenings] = useScreenings();
  const [referrals] = useReferrals();
  const [reminders] = useReminders();
  const [now] = useState(() => Date.now());

  const babyName = (id: string) => babies.find((b) => b.id === id)?.name ?? 'Baby';
  const openUrgent = referrals.filter((r) => isOpen(r) && r.urgency === 'urgent');
  const due = dueReminders(reminders, now);
  const referred = new Set(referrals.map((r) => r.screeningId));
  const needsReferral = screenings.filter((s) => s.state === 'possible-jaundice' && !referred.has(s.id)).slice(0, 3);
  const recent = [...screenings].sort((a, b) => b.ranAt - a.ranAt).slice(0, 4);
  const attention = openUrgent.length + due.length + needsReferral.length;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Small>{greeting(new Date(now).getHours())}</Small>
          <H1 style={{ fontSize: 26 }}>{me?.name ?? 'Welcome'}</H1>
          <Small>
            {me ? roleLabel[me.role] : ''}
            {settings.facility ? ` · ${settings.facility}` : ''}
          </Small>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Team and roles" onPress={() => router.push('/team')}>
          <Avatar name={me?.name ?? '?'} size={48} />
        </Pressable>
      </Row>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Screen a baby"
        onPress={() => router.push('/scan')}
        style={({ pressed }) => ({ backgroundColor: c.primary, borderRadius: radius.lg, padding: space.lg, gap: space.sm, opacity: pressed ? 0.9 : 1 })}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scan" size={28} color={c.primaryText} />
          </View>
          <Icon name="arrow-forward-circle" size={34} color={c.primaryText} />
        </Row>
        <Text style={{ color: c.primaryText, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Screen a baby</Text>
        <Text style={{ color: c.primaryText, opacity: 0.85, fontSize: 15 }}>Take a photo of the eye in daylight. It stays on this phone.</Text>
      </Pressable>

      <Row style={{ gap: space.sm }}>
        {[
          { n: babies.length, label: 'Babies', to: '/babies' as const },
          { n: screenings.length, label: 'Screenings', to: '/babies' as const },
          { n: referrals.filter(isOpen).length, label: 'Open referrals', to: '/referrals' as const },
        ].map((s) => (
          <Card key={s.label} style={{ flex: 1, gap: 2, padding: space.md }} onPress={() => router.push(s.to)} accessibilityLabel={`${s.n} ${s.label}`}>
            <Text style={{ color: c.text, fontSize: 24, fontWeight: '800' }}>{s.n}</Text>
            <Small numberOfLines={1}>{s.label}</Small>
          </Card>
        ))}
      </Row>

      {attention ? (
        <>
          <SectionTitle>Needs attention</SectionTitle>
          {openUrgent.map((r) => (
            <ListItem
              key={r.id}
              title={`${babyName(r.babyId)}: urgent referral`}
              subtitle={`${r.facility} · ${r.status === 'sent' ? 'not seen yet' : 'seen, awaiting outcome'}`}
              leading={<Icon name="alert-circle" size={26} color={c.danger} />}
              onPress={() => router.push(`/referral/${r.id}`)}
            />
          ))}
          {needsReferral.map((s) => (
            <ListItem
              key={s.id}
              title={`${babyName(s.babyId)}: possible jaundice`}
              subtitle="No referral yet. Tap to refer."
              leading={<Icon name="paper-plane" size={24} color={c.warn} />}
              onPress={() => router.push({ pathname: '/referral/new', params: { babyId: s.babyId, screeningId: s.id } })}
            />
          ))}
          {due.map((r) => (
            <ListItem
              key={r.id}
              title={`${babyName(r.babyId)}: follow-up due`}
              subtitle={r.note}
              leading={<Icon name="alarm" size={24} color={c.primary} />}
              onPress={() => router.push('/reminders')}
            />
          ))}
        </>
      ) : null}

      <SectionTitle>Recent screenings</SectionTitle>
      {recent.length === 0 ? (
        <Card>
          <Small>No screenings yet. Results you save will show here, newest first.</Small>
        </Card>
      ) : (
        recent.map((s) => {
          const baby = babies.find((b) => b.id === s.babyId);
          const copy = stateCopy[s.state];
          return (
            <ListItem
              key={s.id}
              title={baby?.name ?? 'Baby'}
              subtitle={`${new Date(s.ranAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${baby ? ageLabel(baby.dob, s.ranAt) : ''}`}
              leading={<Avatar name={baby?.name ?? '?'} size={40} />}
              trailing={<Badge tone={toneFor[copy.tone]}>{copy.title.split(' ').slice(0, 2).join(' ')}</Badge>}
              onPress={() => router.push(`/baby/${s.babyId}`)}
            />
          );
        })
      )}

      <Row style={{ gap: space.sm }}>
        <Card style={{ flex: 1 }} onPress={() => router.push('/learn')} accessibilityLabel="Danger signs">
          <Icon name="warning-outline" size={22} color={c.danger} />
          <Text style={{ color: c.text, fontWeight: '700' }}>Danger signs</Text>
          <Small>When to go now</Small>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => router.push('/model')} accessibilityLabel="Screening model status">
          <Icon name="hardware-chip-outline" size={22} color={c.primary} />
          <Text style={{ color: c.text, fontWeight: '700' }}>Model</Text>
          <Small>{MODEL.calibrated ? `v${MODEL.version} · on-device` : 'Not installed yet'}</Small>
        </Card>
      </Row>
    </Screen>
  );
}
