/**
 * The maths of an eye screening, kept pure (no native modules) so it is fast
 * to test and identical on every platform:
 *
 *   photo (RGBA) → letterbox to the model's square input → [ONNX model] →
 *   sclera mask from the segmentation output → yellow index → decision.
 *
 * Speed notes (each scan must stay well under a couple of seconds on a
 * mid-range Android phone):
 *   - The photo is resized natively *before* it reaches this file, so the
 *     letterbox step usually just pads a ~640 px image.
 *   - Mask prototypes are combined only inside each detection's box (in
 *     prototype space), not over the whole 160×160 plane.
 *   - Everything works on typed arrays; nothing allocates per pixel.
 */

export interface Rgba {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface Letterboxed {
  /** RGB, side × side, used again to read sclera colours. */
  canvas: Uint8Array;
  /** CHW float tensor data in 0..1, ready for the model. */
  chw: Float32Array;
  side: number;
  padLeft: number;
  padTop: number;
  width: number;
  height: number;
}

export interface SegmentationSpec {
  maxDetections: number;
  valuesPerDetection: number;
  maskCoefficients: number;
  prototypeSize: number;
  scleraClass: number;
  minConfidence: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Resize (bilinear) into a grey-padded square, the way YOLO models expect. */
export function letterbox(img: Rgba, side: number): Letterboxed {
  const scale = Math.min(side / img.width, side / img.height);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const padLeft = Math.floor((side - width) / 2);
  const padTop = Math.floor((side - height) / 2);
  const canvas = new Uint8Array(side * side * 3).fill(114);

  for (let y = 0; y < height; y++) {
    const sy = clamp(((y + 0.5) * img.height) / height - 0.5, 0, img.height - 1);
    const y0 = sy | 0;
    const y1 = Math.min(y0 + 1, img.height - 1);
    const fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = clamp(((x + 0.5) * img.width) / width - 0.5, 0, img.width - 1);
      const x0 = sx | 0;
      const x1 = Math.min(x0 + 1, img.width - 1);
      const fx = sx - x0;
      const a = (y0 * img.width + x0) * 4;
      const b = (y0 * img.width + x1) * 4;
      const c = (y1 * img.width + x0) * 4;
      const d = (y1 * img.width + x1) * 4;
      const out = ((y + padTop) * side + x + padLeft) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const top = img.data[a + ch] * (1 - fx) + img.data[b + ch] * fx;
        const bottom = img.data[c + ch] * (1 - fx) + img.data[d + ch] * fx;
        canvas[out + ch] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }

  const plane = side * side;
  const chw = new Float32Array(3 * plane);
  for (let p = 0; p < plane; p++) {
    chw[p] = canvas[p * 3] / 255;
    chw[plane + p] = canvas[p * 3 + 1] / 255;
    chw[2 * plane + p] = canvas[p * 3 + 2] / 255;
  }
  return { canvas, chw, side, padLeft, padTop, width, height };
}

/**
 * Union of all confident sclera masks from a YOLOv8-seg output with NMS
 * embedded: detections are [x1, y1, x2, y2, score, class, ...coefficients].
 * Returns the mask and its pixel count, or null when no sclera was found.
 */
export function scleraMask(detections: Float32Array, prototypes: Float32Array, side: number, spec: SegmentationSpec) {
  const P = spec.prototypeSize;
  const plane = P * P;
  const ratio = P / side;
  const mask = new Uint8Array(side * side);
  const proto = new Float32Array(plane);
  let pixels = 0;
  let found = false;

  for (let i = 0; i < spec.maxDetections; i++) {
    const o = i * spec.valuesPerDetection;
    if (o + spec.valuesPerDetection > detections.length) break;
    if (detections[o + 4] < spec.minConfidence || Math.round(detections[o + 5]) !== spec.scleraClass) continue;
    const x1 = detections[o];
    const y1 = detections[o + 1];
    const x2 = detections[o + 2];
    const y2 = detections[o + 3];
    if (!(Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2)) || x2 <= x1 || y2 <= y1) continue;

    const bx0 = clamp(Math.floor(x1), 0, side);
    const bx1 = clamp(Math.ceil(x2), 0, side);
    const by0 = clamp(Math.floor(y1), 0, side);
    const by1 = clamp(Math.ceil(y2), 0, side);
    if (bx0 >= bx1 || by0 >= by1) continue;
    found = true;

    // Prototype pixels the box needs (+1 for bilinear neighbours).
    const px0 = clamp(Math.floor(bx0 * ratio) - 1, 0, P - 1);
    const px1 = clamp(Math.ceil(bx1 * ratio) + 1, 0, P - 1);
    const py0 = clamp(Math.floor(by0 * ratio) - 1, 0, P - 1);
    const py1 = clamp(Math.ceil(by1 * ratio) + 1, 0, P - 1);
    const coeff = o + 6;
    for (let py = py0; py <= py1; py++) {
      for (let px = px0; px <= px1; px++) {
        const p = py * P + px;
        let v = 0;
        for (let k = 0; k < spec.maskCoefficients; k++) v += detections[coeff + k] * prototypes[k * plane + p];
        proto[p] = 1 / (1 + Math.exp(-v));
      }
    }

    for (let y = by0; y < by1; y++) {
      const sy = clamp((y + 0.5) * ratio - 0.5, 0, P - 1);
      const r0 = sy | 0;
      const r1 = Math.min(r0 + 1, P - 1);
      const fy = sy - r0;
      for (let x = bx0; x < bx1; x++) {
        const sx = clamp((x + 0.5) * ratio - 0.5, 0, P - 1);
        const c0 = sx | 0;
        const c1 = Math.min(c0 + 1, P - 1);
        const fx = sx - c0;
        const top = proto[r0 * P + c0] * (1 - fx) + proto[r0 * P + c1] * fx;
        const bottom = proto[r1 * P + c0] * (1 - fx) + proto[r1 * P + c1] * fx;
        const idx = y * side + x;
        if (top * (1 - fy) + bottom * fy > 0.5 && !mask[idx]) {
          mask[idx] = 1;
          pixels++;
        }
      }
    }
  }
  return found ? { mask, pixels } : null;
}

/** Otsu's threshold over a 256-bin histogram. */
export function otsu(hist: Uint32Array, total: number, sum: number) {
  let wB = 0;
  let sumB = 0;
  let best = -1;
  let threshold = 0;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Share of bright sclera pixels that are yellow (OpenCV-style hue 10–40,
 * saturation ≥ 20). Shadows and lashes are dropped first with Otsu on the
 * sclera's brightness. Returns null if nothing usable is left.
 */
export function yellowIndex(img: Letterboxed, mask: Uint8Array) {
  const { canvas, side } = img;
  const grey = new Uint8Array(side * side);
  const hist = new Uint32Array(256);
  let total = 0;
  let sum = 0;
  for (let y = img.padTop; y < img.padTop + img.height; y++) {
    for (let x = img.padLeft; x < img.padLeft + img.width; x++) {
      const p = y * side + x;
      if (!mask[p]) continue;
      const q = p * 3;
      const g = Math.round(0.299 * canvas[q] + 0.587 * canvas[q + 1] + 0.114 * canvas[q + 2]);
      grey[p] = g;
      hist[g]++;
      total++;
      sum += g;
    }
  }
  if (!total) return null;
  const threshold = otsu(hist, total, sum);

  let bright = 0;
  let yellow = 0;
  for (let y = img.padTop; y < img.padTop + img.height; y++) {
    for (let x = img.padLeft; x < img.padLeft + img.width; x++) {
      const p = y * side + x;
      if (!mask[p] || grey[p] <= threshold) continue;
      bright++;
      const q = p * 3;
      const r = canvas[q];
      const g = canvas[q + 1];
      const b = canvas[q + 2];
      const max = Math.max(r, g, b);
      const delta = max - Math.min(r, g, b);
      if (!delta || max < 20) continue;
      let hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
      if (hue < 0) hue += 360;
      const h = Math.round(hue / 2);
      const s = Math.round((delta * 255) / max);
      if (h >= 10 && h <= 40 && s >= 20) yellow++;
    }
  }
  return bright ? yellow / bright : null;
}

export type ScreeningState = 'no-yellowing' | 'possible-jaundice' | 'unclear-image';

/** Turn the index into one of the three display states. */
export function decide(index: number | null, scleraPixels: number, calibration: { yellowIndexThreshold: number; minScleraPixels: number }): ScreeningState {
  if (index === null || !Number.isFinite(index) || scleraPixels < calibration.minScleraPixels) return 'unclear-image';
  return index >= calibration.yellowIndexThreshold ? 'possible-jaundice' : 'no-yellowing';
}
