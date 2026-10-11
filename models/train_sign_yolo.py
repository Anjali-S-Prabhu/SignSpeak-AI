"""
SignSpeak AI - Reproducible YOLO Sign Language Training Pipeline
================================================================
Trains a custom YOLO object detection model on the Roboflow dataset (34 classes),
evaluates on validation & test sets, and exports to browser-compatible ONNX.
"""

import os
import sys
import argparse
import yaml
import torch

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_YAML = os.path.join(BASE_DIR, "dataset", "data_clean.yaml")
OUTPUT_RUNS_DIR = os.path.join(BASE_DIR, "runs", "train")


def verify_environment():
    print("=" * 60)
    print("SignSpeak AI - Training Environment Verification")
    print("=" * 60)
    print(f"Python: {sys.version.split()[0]}")
    print(f"PyTorch: {torch.__version__}")
    cuda_available = torch.cuda.is_available()
    print(f"CUDA Available: {cuda_available}")
    if cuda_available:
        print(f"CUDA Version: {torch.version.cuda}")
        print(f"GPU Device: {torch.cuda.get_device_name(0)}")
        print(f"GPU VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")
    else:
        print("Running on CPU mode.")
        print(f"CPU Logical Threads: {os.cpu_count()}")

    if not os.path.exists(DATA_YAML):
        raise FileNotFoundError(f"Dataset config not found at: {DATA_YAML}")

    with open(DATA_YAML, "r", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    nc = data_cfg.get("nc", len(data_cfg.get("names", [])))
    names = data_cfg.get("names", [])
    print(f"Dataset Classes: {nc} classes")
    print(f"Class Names: {names}")
    return cuda_available, nc, names


def run_training(epochs=30, batch_size=8, imgsz=416, device="0", model_type="yolov5nu.pt", run_name="sign_gestures_34cls"):
    print("\n" + "=" * 60)
    print(f"Initiating Training: {model_type} | Epochs: {epochs} | Batch: {batch_size} | ImgSz: {imgsz} | Device: {device} | Run: {run_name}")
    print("=" * 60)

    from ultralytics import YOLO

    model = YOLO(model_type)
    
    # Train model
    results = model.train(
        data=DATA_YAML,
        epochs=epochs,
        batch=batch_size,
        imgsz=imgsz,
        device=device,
        project=OUTPUT_RUNS_DIR,
        name=run_name,
        exist_ok=True,
        plots=True,
        save=True,
        verbose=True,
        workers=2,
    )
    
    print("\n--- Training Completed Successfully ---")
    best_weights = os.path.join(OUTPUT_RUNS_DIR, run_name, "weights", "best.pt")
    print(f"Best Weights Saved to: {best_weights}")

    # Evaluate on Validation set
    print("\n--- Evaluating on Validation Set ---")
    val_metrics = model.val(data=DATA_YAML, split="val")
    print(f"Validation mAP@50: {val_metrics.box.map50:.4f}")
    print(f"Validation mAP@50-95: {val_metrics.box.map:.4f}")

    # Evaluate on Test set
    print("\n--- Evaluating on Held-Out Test Set ---")
    test_metrics = model.val(data=DATA_YAML, split="test")
    print(f"Test mAP@50: {test_metrics.box.map50:.4f}")
    print(f"Test mAP@50-95: {test_metrics.box.map:.4f}")

    # Export to ONNX for browser inference
    print("\n--- Exporting to Browser-Compatible ONNX ---")
    onnx_path = model.export(
        format="onnx",
        imgsz=imgsz,
        opset=12,
        simplify=True,
    )
    print(f"ONNX Model Exported: {onnx_path}")
    return best_weights, onnx_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sign Language YOLO Training Pipeline")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=416, help="Image size (e.g. 416 or 640)")
    parser.add_argument("--model", type=str, default="yolov5nu.pt", help="Base model (yolov5nu.pt, yolov5su.pt, yolov8n.pt)")
    parser.add_argument("--device", type=str, default="auto", help="Device (cpu, 0, auto)")
    parser.add_argument("--name", type=str, default="sign_gestures_34cls", help="Run name directory")
    parser.add_argument("--execute", action="store_true", help="Execute the training pipeline")

    args = parser.parse_args()
    cuda_available, nc, names = verify_environment()

    target_device = "0" if (args.device == "auto" and cuda_available) else ("cpu" if args.device == "auto" else args.device)

    print(f"\nTarget execution device: {target_device}")

    if args.execute:
        run_training(
            epochs=args.epochs,
            batch_size=args.batch,
            imgsz=args.imgsz,
            device=target_device,
            model_type=args.model,
            run_name=args.name,
        )
    else:
        print("To launch training, run this script with --execute.")
