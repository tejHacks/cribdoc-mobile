# CribDoc eye model

The app runs **one ONNX file** on the phone and makes its decision with **one JSON file**:

| File | What it is |
|---|---|
| `assets/ml/cribdoc-eye.onnx` | YOLOv8 **segmentation** model that outlines the sclera (white of the eye) |
| `assets/ml/cribdoc-eye.json` | Model card: input/output names, segmentation settings and the calibrated decision threshold |

Until both are in place the app shows **no result at all**, never a placeholder.

## The contract

The `.onnx` must match `cribdoc-eye.json`:

- **Input** `images`: `float32 [1, 3, 640, 640]`, RGB, 0–1, letterboxed with grey (114) padding.
- **Output 0** `output0`: `[1, 300, 38]` detections with NMS already applied: `x1, y1, x2, y2, score, class, 32 mask coefficients` (pixels in the 640 input).
- **Output 1** `output1`: `[1, 32, 160, 160]` mask prototypes.
- **Classes**: `scleraClass` (default `1`) is the sclera. Other classes (e.g. iris) are ignored.

Ultralytics' `export(format="onnx", nms=True)` for a `yolov8n-seg` / `yolo11n-seg` model at `imgsz=640` produces exactly this.

## From dataset to app

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r ml/requirements.txt

# 1. Train the segmentation model (dataset in YOLO-seg format, see data.yaml)
yolo segment train model=yolo11n-seg.pt data=path/to/data.yaml imgsz=640 epochs=100

# 2. Export to ONNX with NMS embedded, and copy into the app
python ml/export_onnx.py runs/segment/train/weights/best.pt

# 3. Calibrate the yellow-index threshold on labelled photos
#    (a CSV with columns: path,label where label is 1 = jaundice, 0 = no jaundice)
python ml/calibrate.py labels.csv

# 4. Check the ONNX file matches the contract
python ml/check_onnx.py
```

`calibrate.py` runs the same sclera → yellow-index steps as the app (`src/ml/pipeline.ts`), picks the threshold that keeps **sensitivity ≥ 95%** (missing a jaundiced baby is worse than an extra referral), and writes it into `cribdoc-eye.json` with the version and status `evaluation`.

Then rebuild the native app (`npx expo run:android` or an EAS build). Expo Go can't run ONNX Runtime.

## Before anyone relies on it

A calibrated threshold is an engineering number, not clinical validation. Before real use: test on a held-out set from different phones and lighting, review with neonatal clinicians, and get ethics approval and consent for any data from real babies.
