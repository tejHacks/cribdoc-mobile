import { decide, letterbox, otsu, scleraMask, yellowIndex, type SegmentationSpec } from '@/ml/pipeline';

const spec: SegmentationSpec = { maxDetections: 4, valuesPerDetection: 38, maskCoefficients: 32, prototypeSize: 16, scleraClass: 1, minConfidence: 0.6 };
const SIDE = 64;

/** A solid-colour RGBA image. */
const solid = (w: number, h: number, rgb: [number, number, number]) => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4);
  return { data, width: w, height: h };
};

/** One detection row plus prototypes whose first channel is strongly "on" everywhere. */
function model(box: [number, number, number, number], score = 0.9, cls = 1) {
  const det = new Float32Array(spec.maxDetections * spec.valuesPerDetection);
  det.set([...box, score, cls, 1], 0); // coefficient 0 = 1
  const P = spec.prototypeSize;
  const protos = new Float32Array(spec.maskCoefficients * P * P);
  protos.fill(6, 0, P * P); // sigmoid(6) ≈ 1 inside the box
  return { det, protos };
}

describe('letterbox', () => {
  it('fits a wide photo into a grey-padded square without stretching', () => {
    const lb = letterbox(solid(128, 64, [255, 0, 0]), SIDE);
    expect([lb.width, lb.height, lb.padLeft, lb.padTop]).toEqual([64, 32, 0, 16]);
    expect(Array.from(lb.canvas.slice(0, 3))).toEqual([114, 114, 114]); // padding row
    const mid = (32 * SIDE + 32) * 3;
    expect(Array.from(lb.canvas.slice(mid, mid + 3))).toEqual([255, 0, 0]);
  });

  it('produces a CHW tensor scaled to 0–1', () => {
    const lb = letterbox(solid(64, 64, [255, 128, 0]), SIDE);
    const plane = SIDE * SIDE;
    expect(lb.chw).toHaveLength(3 * plane);
    expect(lb.chw[0]).toBeCloseTo(1);
    expect(lb.chw[plane]).toBeCloseTo(128 / 255);
    expect(lb.chw[2 * plane]).toBe(0);
  });
});

describe('sclera mask', () => {
  it('fills exactly the detected box', () => {
    const { det, protos } = model([16, 16, 32, 32]);
    const m = scleraMask(det, protos, SIDE, spec)!;
    expect(m.pixels).toBe(16 * 16);
    expect(m.mask[20 * SIDE + 20]).toBe(1);
    expect(m.mask[40 * SIDE + 40]).toBe(0);
  });

  it('ignores low-confidence detections and other classes (e.g. the iris)', () => {
    expect(scleraMask(model([16, 16, 32, 32], 0.3).det, model([0, 0, 1, 1]).protos, SIDE, spec)).toBeNull();
    expect(scleraMask(model([16, 16, 32, 32], 0.9, 0).det, model([0, 0, 1, 1]).protos, SIDE, spec)).toBeNull();
  });

  it('rejects broken boxes', () => {
    const { det, protos } = model([30, 30, 10, 10]);
    expect(scleraMask(det, protos, SIDE, spec)).toBeNull();
  });
});

describe('yellow index', () => {
  const full = new Uint8Array(SIDE * SIDE).fill(1);

  it('is ~1 for a yellow sclera and 0 for a white one', () => {
    expect(yellowIndex(letterbox(solid(64, 64, [235, 200, 90]), SIDE), full)).toBeCloseTo(1);
    expect(yellowIndex(letterbox(solid(64, 64, [245, 245, 245]), SIDE), full)).toBe(0);
  });

  it('returns null when the mask is empty', () => {
    expect(yellowIndex(letterbox(solid(8, 8, [255, 255, 255]), SIDE), new Uint8Array(SIDE * SIDE))).toBeNull();
  });

  it('Otsu splits a two-level histogram between the levels', () => {
    const h = new Uint32Array(256);
    h[40] = 100;
    h[200] = 100;
    const t = otsu(h, 200, 40 * 100 + 200 * 100);
    expect(t).toBeGreaterThanOrEqual(40);
    expect(t).toBeLessThan(200);
  });
});

describe('decision', () => {
  const cal = { yellowIndexThreshold: 0.16, minScleraPixels: 400 };
  it('maps the index to the three states', () => {
    expect(decide(0.4, 2000, cal)).toBe('possible-jaundice');
    expect(decide(0.05, 2000, cal)).toBe('no-yellowing');
  });
  it('never guesses from too little sclera or no index', () => {
    expect(decide(0.4, 100, cal)).toBe('unclear-image');
    expect(decide(null, 2000, cal)).toBe('unclear-image');
    expect(decide(Number.NaN, 2000, cal)).toBe('unclear-image');
  });
});
