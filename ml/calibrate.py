"""Pick the yellow-index threshold from labelled photos and write it into the model card.

Usage: python ml/calibrate.py labels.csv [--sensitivity 0.95] [--version 1.0.0]
labels.csv columns: path,label  (label 1 = jaundice, 0 = no jaundice)
"""
import argparse
import csv
import json
from pathlib import Path

from eye_index import CARD, ROOT, EyeModel


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("labels")
    ap.add_argument("--sensitivity", type=float, default=0.95)
    ap.add_argument("--version", default="1.0.0")
    args = ap.parse_args()

    model = EyeModel()
    min_px = CARD["calibration"]["minScleraPixels"]
    scored, unclear = [], 0
    with open(args.labels) as f:
        for row in csv.DictReader(f):
            idx, px = model.index(row["path"])
            if idx is None or px < min_px:
                unclear += 1
                continue
            scored.append((idx, int(row["label"])))
    pos = sorted(i for i, y in scored if y == 1)
    neg = [i for i, y in scored if y == 0]
    if not pos or not neg:
        raise SystemExit("Need both jaundice and no-jaundice photos with a visible sclera.")

    # Highest threshold that still catches the target share of jaundiced babies.
    k = int((1 - args.sensitivity) * len(pos))
    threshold = pos[k]
    sens = sum(i >= threshold for i in pos) / len(pos)
    spec = sum(i < threshold for i in neg) / len(neg)
    print(f"{len(scored)} usable photos ({unclear} unclear): threshold {threshold:.4f}, sensitivity {sens:.1%}, specificity {spec:.1%}")

    card_path = ROOT / "assets" / "ml" / "cribdoc-eye.json"
    card = json.loads(card_path.read_text())
    card["version"] = args.version
    card["status"] = "evaluation"
    card["calibration"]["yellowIndexThreshold"] = round(threshold, 6)
    card["calibration"]["metrics"] = {"photos": len(scored), "unclear": unclear, "sensitivity": round(sens, 4), "specificity": round(spec, 4)}
    card_path.write_text(json.dumps(card, indent=2) + "\n")
    print(f"wrote {card_path}")


if __name__ == "__main__":
    main()
