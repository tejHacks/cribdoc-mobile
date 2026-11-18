import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Avatar, Badge, Body, Button, Card, Empty, H1, H2, Icon, ListItem, Row, Screen, Small, toneColors, type IconName } from '@/components/ui';
import { ageLabel } from '@/data/model';
import { uid, useBabies, useMe, useScreenings } from '@/data/store';
import { keepPhoto } from '@/lib/photos';
import { ModelUnavailableError, screenImage, stateCopy, type ScreeningResult, type UnavailableReason } from '@/ml/screening';
import { radius, space, usePalette } from '@/theme';

type Phase = 'pick-baby' | 'guide' | 'preview' | 'running' | 'done' | 'unavailable' | 'error';

const tips: { icon: IconName; text: string }[] = [
  { icon: 'sunny-outline', text: 'Bright, even daylight near a window. No flash.' },
  { icon: 'eye-outline', text: 'Gently show the white of the eye. Fill most of the photo with the eye.' },
  { icon: 'hand-left-outline', text: 'Hold steady, about 15–20 cm away, and tap to focus.' },
  { icon: 'medkit-outline', text: "If the baby seems unwell, don't wait for the app. Get care now." },
];

const unavailableCopy: Record<UnavailableReason, { title: string; body: string }> = {
  'no-runtime': { title: 'Scanning needs the CribDoc app build', body: 'Expo Go and the web preview cannot run the on-device model. Install the CribDoc development or preview build to screen.' },
  'no-model': { title: 'The screening model is not installed', body: 'This build does not include the eye model yet. Nothing was analysed and no result was saved.' },
  uncalibrated: { title: 'The screening model is not ready yet', body: 'The eye model is still being trained and calibrated. CribDoc never shows a made-up result, so nothing was saved.' },
};

export default function Scan() {
  const c = usePalette();
  const params = useLocalSearchParams<{ babyId?: string }>();
  const { me } = useMe();
  const [babies] = useBabies();
  const [, setScreenings] = useScreenings();
  const [babyId, setBabyId] = useState(params.babyId);
  const [phase, setPhase] = useState<Phase>(params.babyId ? 'guide' : 'pick-baby');
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<(ScreeningResult & { id: string }) | null>(null);
  const [reason, setReason] = useState<UnavailableReason>('uncalibrated');
  const [now] = useState(() => Date.now());
  const baby = babies.find((b) => b.id === babyId);

  const pick = async (source: 'camera' | 'library') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 3] };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) {
      setUri(res.assets[0].uri);
      setPhase('preview');
    }
  };

  const run = async () => {
    if (!uri || !baby) return;
    setPhase('running');
    try {
      const r = await screenImage(uri);
      const id = uid();
      const imageUri = await keepPhoto(uri, id).catch(() => uri);
      setScreenings((list) => [{ ...r, id, babyId: baby.id, imageUri, by: me?.name ?? 'Unknown' }, ...list]);
      setResult({ ...r, id });
      setPhase('done');
    } catch (e) {
      if (e instanceof ModelUnavailableError) {
        setReason(e.reason);
        setPhase('unavailable');
      } else setPhase('error');
    }
  };

  const restart = () => {
    setUri(null);
    setResult(null);
    setPhase('guide');
  };

  if (phase === 'pick-baby') {
    return (
      <Screen>
        <H2>Who are you screening?</H2>
        {babies.length === 0 ? (
          <Empty icon="person-add-outline" title="Add the baby first" body="Each screening is saved to a baby's record." action={<Button title="Add a baby" icon="add" onPress={() => router.replace('/baby/new')} />} />
        ) : (
          babies.map((b) => (
            <ListItem
              key={b.id}
              title={b.name}
              subtitle={ageLabel(b.dob, now)}
              leading={<Avatar name={b.name} />}
              onPress={() => {
                setBabyId(b.id);
                setPhase('guide');
              }}
            />
          ))
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      {baby ? (
        <Row>
          <Avatar name={baby.name} size={36} />
          <Small>
            Screening <Text style={{ fontWeight: '700', color: c.text }}>{baby.name}</Text> · {ageLabel(baby.dob, now)}
          </Small>
        </Row>
      ) : null}

      {phase === 'guide' ? (
        <>
          <H1 style={{ fontSize: 26 }}>Get a good eye photo</H1>
          <Card style={{ gap: space.md }}>
            {tips.map((t) => (
              <Row key={t.text} style={{ alignItems: 'flex-start', gap: space.md }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={t.icon} size={20} color={c.primary} />
                </View>
                <Body style={{ flex: 1 }}>{t.text}</Body>
              </Row>
            ))}
          </Card>
          <Button big title="Take a photo" icon="camera" onPress={() => pick('camera')} />
          <Button title="Choose from gallery" icon="images-outline" variant="secondary" onPress={() => pick('library')} />
        </>
      ) : null}

      {uri && phase !== 'guide' ? (
        <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: c.chip }} contentFit="cover" accessibilityLabel="Selected eye photo" />
      ) : null}

      {phase === 'preview' ? (
        <>
          <Small>Is the white of the eye clear, bright and in focus? If not, retake it. A clearer photo gives a more useful result.</Small>
          <Row>
            <Button title="Retake" icon="refresh" variant="secondary" style={{ flex: 1 }} onPress={restart} />
            <Button title="Analyse" icon="sparkles" style={{ flex: 1 }} onPress={run} />
          </Row>
        </>
      ) : null}

      {phase === 'running' ? (
        <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <ActivityIndicator color={c.primary} size="large" />
          <H2>Analysing on this phone…</H2>
          <Small>No internet needed. The photo never leaves the device.</Small>
        </Card>
      ) : null}

      {phase === 'done' && result ? <Result result={result} babyId={baby?.id} onAgain={restart} /> : null}

      {phase === 'unavailable' ? (
        <>
          <Card>
            <Badge tone="neutral" icon="hardware-chip-outline">No result</Badge>
            <H2>{unavailableCopy[reason].title}</H2>
            <Body muted>{unavailableCopy[reason].body}</Body>
            <Body muted>If you are worried about the baby, check the danger signs and see a health worker. You can refer the baby without a screening.</Body>
          </Card>
          <Button title="See danger signs" icon="warning-outline" variant="secondary" onPress={() => router.push('/learn')} />
          {baby ? <Button title="Refer this baby" icon="paper-plane-outline" variant="secondary" onPress={() => router.replace({ pathname: '/referral/new', params: { babyId: baby.id } })} /> : null}
          <Button title="About the model" variant="ghost" onPress={() => router.push('/model')} />
        </>
      ) : null}

      {phase === 'error' ? (
        <>
          <Card>
            <H2>The photo couldn&apos;t be analysed</H2>
            <Body muted>Please try again with a clearer, well-lit photo of the eye.</Body>
          </Card>
          <Button title="Try again" icon="refresh" onPress={restart} />
        </>
      ) : null}
    </Screen>
  );
}

function Result({ result, babyId, onAgain }: { result: ScreeningResult & { id: string }; babyId?: string; onAgain: () => void }) {
  const c = usePalette();
  const copy = stateCopy[result.state];
  const t = toneColors(c, copy.tone);
  const icon: IconName = result.state === 'no-yellowing' ? 'checkmark-circle' : result.state === 'possible-jaundice' ? 'alert-circle' : 'help-circle';
  return (
    <>
      <Card style={{ backgroundColor: t.bg, borderColor: t.bg }}>
        <Row>
          <Icon name={icon} size={30} color={t.fg} />
          <Text style={{ color: t.fg, fontSize: 22, fontWeight: '800', flex: 1 }}>{copy.title}</Text>
        </Row>
        <Body>{copy.body}</Body>
        <Small>
          Analysed in {(result.timings.total / 1000).toFixed(1)} s on this phone · {result.modelVersion} · evaluation only
        </Small>
      </Card>
      {result.state === 'possible-jaundice' && babyId ? (
        <Button big title="Refer to a facility" icon="paper-plane" onPress={() => router.replace({ pathname: '/referral/new', params: { babyId, screeningId: result.id } })} />
      ) : null}
      {result.state === 'unclear-image' ? <Button big title="Retake the photo" icon="camera" onPress={onAgain} /> : null}
      <Row>
        <Button title="Screen again" variant="secondary" style={{ flex: 1 }} onPress={onAgain} />
        <Button title="Done" variant="secondary" style={{ flex: 1 }} onPress={() => (babyId ? router.replace(`/baby/${babyId}`) : router.back())} />
      </Row>
    </>
  );
}
