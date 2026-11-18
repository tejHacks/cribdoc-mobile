"""Python twin of src/ml/pipeline.ts: photo -> sclera mask -> yellow index.

Keep the two in step: calibrate.py uses this, the app uses the TypeScript.
"""
import json
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parent.parent
CARD = json.loads((ROOT / "assets" / "ml" / "cribdoc-eye.json").read_text())
SEG = CARD["segmentation"]


def letterbox(rgb: np.ndarray, side: int):
    h, w = rgb.shape[:2]
    scale = min(side / w, side / h)
    nw, nh = round(w * scale), round(h * scale)
    left, top = (side - nw) // 2, (side - nh) // 2
    canvas = np.full((side, side, 3), 114, np.uint8)
    canvas[top : top + nh, left : left + nw] = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_LINEAR)
    return canvas, (left, top, nw, nh)


def sclera_mask(det: np.ndarray, protos: np.ndarray, side: int):
    p = SEG["prototypeSize"]
    mask = np.zeros((side, side), np.uint8)
    found = False
    for row in det[: SEG["maxDetections"]]:
        x1, y1, x2, y2, score, cls = row[:6]
        if score < SEG["minConfidence"] or round(cls) != SEG["scleraClass"] or x2 <= x1 or y2 <= y1:
            continue
        found = True
        m = 1 / (1 + np.exp(-(row[6 : 6 + SEG["maskCoefficients"]] @ protos.reshape(SEG["maskCoefficients"], -1))))
        m = cv2.resize(m.reshape(p, p), (side, side), interpolation=cv2.INTER_LINEAR) > 0.5
        box = np.zeros_like(mask, bool)
        box[max(0, int(np.floor(y1))) : int(np.ceil(y2)), max(0, int(np.floor(x1))) : int(np.ceil(x2))] = True
        mask |= (m & box).astype(np.uint8)
    return mask if found else None


def yellow_index(canvas: np.ndarray, mask: np.ndarray):
    grey = cv2.cvtColor(canvas, cv2.COLOR_RGB2GRAY)
    vals = grey[mask > 0]
    if vals.size == 0:
        return None
    t, _ = cv2.threshold(vals.reshape(-1, 1), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    bright = (mask > 0) & (grey > t)
    if not bright.any():
        return None
    hsv = cv2.cvtColor(canvas, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    yellow = bright & (h >= 10) & (h <= 40) & (s >= 20) & (v >= 20)
    return float(yellow.sum() / bright.sum())


class EyeModel:
    def __init__(self, path=ROOT / "assets" / "ml" / "cribdoc-eye.onnx"):
        self.session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])

    def index(self, image_path: str):
        bgr = cv2.imread(image_path)
        if bgr is None:
            return None, 0
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        side = CARD["input"]["size"]
        canvas, _ = letterbox(rgb, side)
        x = (canvas.astype(np.float32) / 255).transpose(2, 0, 1)[None]
        det, protos = self.session.run([CARD["outputs"]["detections"], CARD["outputs"]["prototypes"]], {CARD["input"]["name"]: x})
        mask = sclera_mask(det[0], protos[0], side)
        if mask is None:
            return None, 0
        return yellow_index(canvas, mask), int(mask.sum())
