/**
 * On-device screening — integration point for the ONNX model.
 *
 * CribDoc must NEVER show a simulated or placeholder result. Until the real
 * model is bundled, `screenImage` rejects with `ModelUnavailableError` and the
 * UI says so plainly.
 *
 * To integrate:
 *   1. `npx expo install onnxruntime-react-native` and use a development build
 *      (Expo Go does not include ONNX Runtime).
 *   2. Bundle the model under assets/ml/ and load it with InferenceSession.create().
 *   3. Decode → letterbox to the model's input size → run → post-process.
 *   4. Map outputs to the three display states below, which are
 *      evaluation-only labels, not clinically validated thresholds.
 */
export type ScreeningState = 'no-yellowing' | 'possible-jaundice' | 'unclear-image';

export interface ScreeningResult {
  state: ScreeningState;
  modelVersion: string;
  ranAt: number;
}

export class ModelUnavailableError extends Error {
  constructor() {
    super('The screening model is not bundled in this build yet.');
    this.name = 'ModelUnavailableError';
  }
}

export const MODEL_AVAILABLE = false;

export async function screenImage(_imageUri: string): Promise<ScreeningResult> {
  // TODO: replace with ONNX Runtime inference once the model is bundled.
  throw new ModelUnavailableError();
}

export const stateCopy: Record<ScreeningState, { title: string; body: string }> = {
  'no-yellowing': {
    title: 'No yellowing detected',
    body: 'This is not a diagnosis. If you are worried, or the baby seems unwell, see a health worker.',
  },
  'possible-jaundice': {
    title: 'Possible jaundice',
    body: 'Please have the baby assessed by a qualified health worker as soon as possible.',
  },
  'unclear-image': {
    title: 'Image not clear enough',
    body: 'Retake the photo in bright, even light without flash, with the white of the eye visible.',
  },
};
