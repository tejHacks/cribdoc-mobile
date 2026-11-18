/**
 * On-device eye screening.
 *
 * CribDoc never shows a simulated or placeholder result. If anything needed for
 * a real result is missing, `screenImage` throws `ModelUnavailableError` with a
 * reason the UI can explain:
 *   - 'no-runtime'    Expo Go or web: ONNX Runtime isn't in this build
 *   - 'no-model'      the .onnx file hasn't been bundled yet
 *   - 'uncalibrated'  the model card has no decision threshold yet
 *
 * The model contract (input/outputs/calibration) lives in
 * assets/ml/cribdoc-eye.json; see ml/README.md.
 */
import { NativeModules, Platform } from 'react-native';

import card from '../../assets/ml/cribdoc-eye.json';
import { decide, letterbox, scleraMask, yellowIndex, type ScreeningState } from './pipeline';

export type { ScreeningState } from './pipeline';

export interface ScreeningResult {
  state: ScreeningState;
  /** Share of bright sclera pixels that look yellow (0–1), when measurable. */
  yellowIndex: number | null;
  modelVersion: string;
  ranAt: number;
  /** Time spent preparing the photo and running the model, in ms. */
  timings: { prepare: number; infer: number; total: number };
}

export type UnavailableReason = 'no-runtime' | 'no-model' | 'uncalibrated';

export class ModelUnavailableError extends Error {
  reason: UnavailableReason;
  constructor(reason: UnavailableReason) {
    super(
      reason === 'no-runtime'
        ? 'This build does not include ONNX Runtime (Expo Go and web cannot run the model).'
        : reason === 'no-model'
          ? 'The screening model is not installed in this build yet.'
          : 'The screening model has not been calibrated yet.',
    );
    this.name = 'ModelUnavailableError';
    this.reason = reason;
  }
}

export const MODEL = {
  name: card.name,
  version: card.version,
  status: card.status as 'untrained' | 'evaluation' | 'validated',
  calibrated: typeof card.calibration.yellowIndexThreshold === 'number',
};

const MODEL_FILE = `${card.name}.onnx`;

type Ort = typeof import('onnxruntime-react-native');
type Session = import('onnxruntime-react-native').InferenceSession;
let ort: Ort | null | undefined;
let session: Promise<Session> | undefined;

/** ONNX Runtime, or null when this build doesn't contain it. */
function runtime(): Ort | null {
  if (ort !== undefined) return ort;
  if (Platform.OS === 'web' || !NativeModules.Onnxruntime) return (ort = null);
  try {
    // Loaded lazily: importing it in Expo Go or on web would crash at startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ort = require('onnxruntime-react-native') as Ort;
  } catch {
    ort = null;
  }
  return ort;
}

/** Why a scan can't run right now, or null if it can. */
export function unavailableReason(): UnavailableReason | null {
  if (!runtime()) return 'no-runtime';
  if (!MODEL.calibrated) return 'uncalibrated';
  return null;
}

/**
 * Load the model once. The bundled file is copied to app storage only the
 * first time (or after an app update changes its size), not on every launch.
 */
function loadSession(): Promise<Session> {
  const rt = runtime();
  if (!rt) return Promise.reject(new ModelUnavailableError('no-runtime'));
  if (!session) {
    session = (async () => {
      const { File, Paths } = await import('expo-file-system');
      const bundled = new File(Paths.bundle, MODEL_FILE);
      if (!bundled.exists) throw new ModelUnavailableError('no-model');
      const local = new File(Paths.document, MODEL_FILE);
      if (!local.exists || local.size !== bundled.size) await bundled.copy(local, { overwrite: true });
      return rt.InferenceSession.create(local.uri, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
        intraOpNumThreads: 2,
      });
    })().catch((e: unknown) => {
      session = undefined;
      throw e;
    });
  }
  return session;
}

/** Start loading the model in the background so the first scan is fast. */
export function warmUp() {
  if (unavailableReason()) return;
  loadSession().catch(() => {});
}

/** Shrink the photo natively, then decode the small JPEG in JS. */
async function readPhoto(uri: string) {
  const [{ ImageManipulator, SaveFormat }, { File }, jpeg] = await Promise.all([
    import('expo-image-manipulator'),
    import('expo-file-system'),
    import('jpeg-js'),
  ]);
  const ref = await ImageManipulator.manipulate(uri).resize({ width: card.input.size }).renderAsync();
  const small = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
  const decoded = jpeg.decode(await new File(small.uri).bytes(), { useTArray: true, formatAsRGBA: true });
  return { data: decoded.data as Uint8Array, width: decoded.width, height: decoded.height };
}

export async function screenImage(uri: string): Promise<ScreeningResult> {
  const reason = unavailableReason();
  if (reason) throw new ModelUnavailableError(reason);
  const rt = runtime()!;
  const t0 = Date.now();

  const [s, photo] = await Promise.all([loadSession(), readPhoto(uri)]);
  const input = letterbox(photo, card.input.size);
  const t1 = Date.now();

  const out = await s.run({ [card.input.name]: new rt.Tensor('float32', input.chw, [1, 3, input.side, input.side]) });
  const detections = out[card.outputs.detections]?.data;
  const prototypes = out[card.outputs.prototypes]?.data;
  if (!(detections instanceof Float32Array) || !(prototypes instanceof Float32Array)) {
    throw new Error('The model returned outputs in an unexpected format.');
  }
  const found = scleraMask(detections, prototypes, input.side, card.segmentation);
  const index = found ? yellowIndex(input, found.mask) : null;
  const t2 = Date.now();

  return {
    state: decide(index, found?.pixels ?? 0, {
      yellowIndexThreshold: Number(card.calibration.yellowIndexThreshold),
      minScleraPixels: card.calibration.minScleraPixels,
    }),
    yellowIndex: index,
    modelVersion: `${card.name}@${card.version}`,
    ranAt: t2,
    timings: { prepare: t1 - t0, infer: t2 - t1, total: t2 - t0 },
  };
}

export const stateCopy: Record<ScreeningState, { title: string; body: string; tone: 'ok' | 'warn' | 'neutral' }> = {
  'no-yellowing': {
    title: 'No yellowing detected',
    body: 'This is not a diagnosis. Keep watching for the danger signs, and see a health worker if you are worried.',
    tone: 'ok',
  },
  'possible-jaundice': {
    title: 'Possible jaundice',
    body: 'Please have the baby checked by a qualified health worker today. You can create a referral from this result.',
    tone: 'warn',
  },
  'unclear-image': {
    title: 'Photo not clear enough',
    body: 'Retake the photo in bright, even daylight without flash, with the white of the eye clearly visible.',
    tone: 'neutral',
  },
};
