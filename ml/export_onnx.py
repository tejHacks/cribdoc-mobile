"""Export a trained YOLO segmentation model to the ONNX format CribDoc expects.

Usage: python ml/export_onnx.py runs/segment/train/weights/best.pt
"""
import shutil
import sys
from pathlib import Path

from ultralytics import YOLO

APP_MODEL = Path(__file__).resolve().parent.parent / "assets" / "ml" / "cribdoc-eye.onnx"


def main(weights: str) -> None:
    model = YOLO(weights)
    print("classes:", model.names)
    out = model.export(format="onnx", imgsz=640, nms=True, opset=17, simplify=True, dynamic=False)
    shutil.copyfile(out, APP_MODEL)
    print(f"copied {out} -> {APP_MODEL} ({APP_MODEL.stat().st_size / 1e6:.1f} MB)")
    print("Next: python ml/calibrate.py labels.csv")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
