import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Body, Button, Card, H2, Label, Row, Screen } from '@/components/ui';
import { useBaby, useRecords } from '@/data/store';
import { uid } from '@/lib/storage';
import { ModelUnavailableError, screenImage, stateCopy, type ScreeningResult } from '@/ml/screening';
import { usePalette } from '@/theme';

type Phase = 'guide' | 'preview' | 'running' | 'done' | 'unavailable' | 'error';

/** Guided capture → preview → on-device screening. */
export default function ScreenFlow() {
  const c = usePalette();
  const [baby] = useBaby();
  const [, setRecords] = useRecords();
  const [phase, setPhase] = useState<Phase>('guide');
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<ScreeningResult | null>(null);

  const pick = async (source: 'camera' | 'library') => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
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
    if (!uri) return;
    setPhase('running');
    try {
      const r = await screenImage(uri);
      setResult(r);
      setRecords((list) => [{ ...r, id: uid(), babyName: baby.name, imageUri: uri }, ...list]);
      setPhase('done');
    } catch (e) {
      setPhase(e instanceof ModelUnavailableError ? 'unavailable' : 'error');
    }
  };

  return (
    <Screen>
      {phase === 'guide' ? (
        <>
          <H2>Before you take the photo</H2>
          <Card>
            <Body>☀️ Use bright, even daylight — no flash.</Body>
            <Body>👁️ Make sure the white of the eye is clearly visible.</Body>
            <Body>📱 Hold the phone steady, about 15–20 cm away.</Body>
            <Body>🚑 If the baby seems unwell, don&apos;t wait for the app — get help now.</Body>
          </Card>
          <Button big title="Take a photo" onPress={() => pick('camera')} />
          <Button title="Choose from gallery" variant="secondary" onPress={() => pick('library')} />
        </>
      ) : null}

      {uri && phase !== 'guide' ? (
        <Image source={{ uri }} style={{ width: '100%', aspectRatio: 1, borderRadius: 24 }} contentFit="cover" accessibilityLabel="Selected eye photo" />
      ) : null}

      {phase === 'preview' ? (
        <Row>
          <Button title="Retake" variant="secondary" style={{ flex: 1 }} onPress={() => setPhase('guide')} />
          <Button title="Start screening" style={{ flex: 1 }} onPress={run} />
        </Row>
      ) : null}

      {phase === 'running' ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <ActivityIndicator color={c.primary} size="large" />
          <Body muted>Analysing on your phone…</Body>
        </View>
      ) : null}

      {phase === 'done' && result ? (
        <Card>
          <Label>Evaluation-only result</Label>
          <H2>{stateCopy[result.state].title}</H2>
          <Body muted>{stateCopy[result.state].body}</Body>
        </Card>
      ) : null}

      {phase === 'unavailable' ? (
        <Card>
          <Label>Model not bundled yet</Label>
          <Body>This build doesn&apos;t include the on-device screening model, so no result is shown. CribDoc never shows simulated results.</Body>
        </Card>
      ) : null}

      {phase === 'error' ? (
        <Card>
          <Label>Something went wrong</Label>
          <Body>The image couldn&apos;t be analysed. Please try again with a clearer photo.</Body>
        </Card>
      ) : null}

      {phase === 'done' || phase === 'unavailable' || phase === 'error' ? (
        <Button title="Screen again" variant="secondary" onPress={() => { setUri(null); setResult(null); setPhase('guide'); }} />
      ) : null}
    </Screen>
  );
}
