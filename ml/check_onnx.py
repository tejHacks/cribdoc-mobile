"""Check assets/ml/cribdoc-eye.onnx matches the contract in cribdoc-eye.json."""
import numpy as np

from eye_index import CARD, EyeModel

m = EyeModel()
inp = m.session.get_inputs()[0]
outs = {o.name: o.shape for o in m.session.get_outputs()}
side = CARD["input"]["size"]
seg = CARD["segmentation"]
assert inp.name == CARD["input"]["name"] and list(inp.shape) == [1, 3, side, side], f"input is {inp.name} {inp.shape}"
assert list(outs[CARD["outputs"]["detections"]]) == [1, seg["maxDetections"], seg["valuesPerDetection"]], outs
p = seg["prototypeSize"]
assert list(outs[CARD["outputs"]["prototypes"]]) == [1, seg["maskCoefficients"], p, p], outs
m.session.run(None, {inp.name: np.zeros((1, 3, side, side), np.float32)})
print("OK: model matches the CribDoc contract.")
