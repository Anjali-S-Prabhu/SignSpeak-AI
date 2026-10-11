import torch
import sys
import os
import glob

# Add yolov5 to sys.path
yolo_dir = glob.glob('c:/Users/AKSHAY/Downloads/Handgesture-main/Handgesture-main/yolo_tools/**/yolov5', recursive=True)[0]
sys.path.insert(0, yolo_dir)

from models.experimental import attempt_load
from models.yolo import Detect

weights_path = 'c:/Users/AKSHAY/Downloads/Handgesture-main/Handgesture-main/models/best.pt'
onnx_path = 'c:/Users/AKSHAY/Downloads/Handgesture-main/Handgesture-main/models/sign_yolov5.onnx'

print(f"Loading weights from {weights_path}...")
model = attempt_load(weights_path, device='cpu')
model.eval()

for k, m in model.named_modules():
    if isinstance(m, Detect):
        m.inplace = True
        m.dynamic = False
        m.export = True

im = torch.zeros(1, 3, 640, 640)
print("Running dry run...")
y = model(im)
print(f"Dry run success. Output shape: {[x.shape if hasattr(x, 'shape') else len(x) for x in y] if isinstance(y, tuple) else y.shape}")

print(f"Exporting to ONNX at {onnx_path}...")
torch.onnx.export(
    model,
    im,
    onnx_path,
    verbose=False,
    opset_version=12,
    do_constant_folding=True,
    input_names=['images'],
    output_names=['output']
)

print(f"ONNX export completed successfully! File size: {os.path.getsize(onnx_path):,} bytes")
