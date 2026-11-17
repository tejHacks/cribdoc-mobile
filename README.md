# CribDoc

> Offline-first neonatal jaundice screening.

## What's built

- Baby profile (name, date of birth) stored on-device
- Guided **eye-photo flow** (camera or gallery via `expo-image-picker`) with lighting tips
- Screening records list, danger-signs education screen

## The model (not bundled yet)

`src/ml/screening.ts` is the integration point. It **never returns a simulated result** — until the ONNX model
is added it throws `ModelUnavailableError` and the UI says so. To integrate:
`npx expo install onnxruntime-react-native`, bundle the model in `assets/ml/`, build a development client
(Expo Go has no ONNX Runtime), then letterbox → infer → post-process.

CribDoc is not a medical device. Results must be evaluation-only until clinically validated.

## Run it

```bash
npm install          # already done once after scaffolding
npx expo start       # then press i (iOS), a (Android) or w (web)
npm run typecheck
npx expo lint
```

Built on **Expo SDK 58** (React Native 0.88, React 19.3), Expo Router, TypeScript.
Everything is stored on-device with AsyncStorage (`src/lib/storage.ts`); there is no backend yet.

## Structure

- `src/app/` — screens (Expo Router; every file is a route)
- `src/brand.ts` — app name, brand colours, screen titles
- `src/theme.ts` — light/dark design tokens
- `src/components/ui.tsx` — shared UI primitives
