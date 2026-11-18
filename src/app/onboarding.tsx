import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Field, H1, Icon, Label, Screen, Small, type IconName } from '@/components/ui';
import { roleBlurb, roleLabel, type Role } from '@/data/model';
import { uid, useSettings, useTeam } from '@/data/store';
import { radius, space, usePalette } from '@/theme';

const points: { icon: IconName; title: string; body: string }[] = [
  { icon: 'eye-outline', title: 'Screen from an eye photo', body: 'Checks the white of the eye for yellowing, right on the phone.' },
  { icon: 'cloud-offline-outline', title: 'Works with no internet', body: 'Records, referrals and reminders all stay on this device.' },
  { icon: 'paper-plane-outline', title: 'Refer and follow up', body: 'Send a baby to a facility and track it until care is done.' },
];

const roles: { role: Role; icon: IconName }[] = [
  { role: 'parent', icon: 'heart-outline' },
  { role: 'health-worker', icon: 'medkit-outline' },
  { role: 'admin', icon: 'shield-checkmark-outline' },
];

export default function Onboarding() {
  const c = usePalette();
  const [, setSettings] = useSettings();
  const [, setTeam] = useTeam();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>('parent');
  const [name, setName] = useState('');
  const [facility, setFacility] = useState('');

  const finish = () => {
    const id = uid();
    setTeam([{ id, name: name.trim(), role }]);
    setSettings({ onboarded: true, facility: facility.trim(), activeMemberId: id });
    router.replace(role === 'parent' ? '/baby/new' : '/');
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} style={{ flexGrow: 1, paddingTop: space.lg }}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.primary : c.chip }} />
        ))}
      </View>

      {step === 0 ? (
        <>
          <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginTop: space.lg }}>
            <Icon name="sunny" size={40} color="#FDE68A" />
          </View>
          <H1>Catch newborn jaundice early.</H1>
          <Body muted>CribDoc helps parents and health workers spot yellowing, act on danger signs and make sure every baby who needs care gets it.</Body>
          <View style={{ gap: space.md, marginVertical: space.sm }}>
            {points.map((p) => (
              <View key={p.title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={p.icon} size={20} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{p.title}</Text>
                  <Small>{p.body}</Small>
                </View>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <Small>CribDoc is a screening aid, not a diagnosis. If a baby seems unwell, get care now.</Small>
          <Button big title="Get started" icon="arrow-forward" onPress={() => setStep(1)} />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <H1>Who&apos;s using CribDoc?</H1>
          <Body muted>This decides what you can do. An admin can add more people later for a shared clinic phone.</Body>
          {roles.map(({ role: r, icon }) => {
            const on = r === role;
            return (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setRole(r)}
                style={{ flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.card }}>
                <Icon name={icon} size={26} color={on ? c.primary : c.muted} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 17 }}>{roleLabel[r]}</Text>
                  <Small>{roleBlurb[r]}</Small>
                </View>
                <Icon name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? c.primary : c.subtle} />
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Button big title="Continue" icon="arrow-forward" onPress={() => setStep(2)} />
          <Button variant="ghost" title="Back" onPress={() => setStep(0)} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <H1>About you</H1>
          <Body muted>Shown on referrals and reports so the facility knows who to call back.</Body>
          <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Nurse Adaeze" autoComplete="name" autoFocus />
          {role !== 'parent' ? (
            <Field label="Clinic or facility" value={facility} onChangeText={setFacility} placeholder="e.g. Agodi Primary Health Centre" />
          ) : null}
          <Label>Role: {roleLabel[role]}</Label>
          <View style={{ flex: 1 }} />
          <Button big title={role === 'parent' ? 'Next: add your baby' : 'Start using CribDoc'} icon="checkmark" disabled={!name.trim()} onPress={finish} />
          <Button variant="ghost" title="Back" onPress={() => setStep(1)} />
        </>
      ) : null}
    </Screen>
  );
}
