"""
SignSpeak AI — Dataset Prediction Diagnostic
============================================
Tests the trained model against actual Kaggle dataset images using the EXACT
same pipeline used during training (extract_landmarks.py logic).

Usage:
    cd D:\\SignSpeak AI\\backend
    .venv\\Scripts\\python.exe test_dataset_prediction.py
"""

import sys
import pickle
import numpy as np
import cv2
import mediapipe as mp
from pathlib import Path

BACKEND_DIR  = Path(__file__).parent.resolve()
WORKSPACE_DIR = BACKEND_DIR.parent.resolve()

KAGGLE_SRC = WORKSPACE_DIR / "kaggle_dataset" / "asl_alphabet_train" / "asl_alphabet_train"
if not KAGGLE_SRC.exists():
    KAGGLE_SRC = WORKSPACE_DIR / "kaggle_dataset" / "asl_alphabet_train"

MODEL_PATH   = BACKEND_DIR / "trained_models" / "gesture_model.keras"
ENCODER_PATH = BACKEND_DIR / "trained_models" / "label_encoder.pkl"

TEST_CLASSES = ["A","B","C","D","M","N","R","U","V","S","T","W","del","nothing","space"]
IMAGES_PER_CLASS = 5
FOLDER_LABEL_MAP = {"del": "delete"}


from app.ai.preprocessor import preprocess_landmarks


def run_tests():
    print("=" * 65)
    print("  SignSpeak AI — Dataset Prediction Diagnostic")
    print("=" * 65)

    import tensorflow as tf
    model = tf.keras.models.load_model(str(MODEL_PATH))
    print(f"Model loaded. Input: {model.input_shape}  Output: {model.output_shape}")

    with open(ENCODER_PATH, "rb") as f:
        encoder = pickle.load(f)
    classes = list(encoder.classes_)
    print(f"Label encoder: {len(classes)} classes")
    print(f"  Full mapping: {dict(enumerate(classes))}")
    print()

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5)

    print(f"{'FOLDER':<10} {'FILE':<28} {'EXPECTED':<10} {'PREDICTED':<10} {'CONF':>6}  OK?")
    print("-" * 72)

    total = 0
    correct = 0
    no_hand = 0
    summary = {}

    for folder_name in TEST_CLASSES:
        folder_path = KAGGLE_SRC / folder_name
        if not folder_path.exists():
            print(f"  SKIP {folder_name} — not found at {folder_path}")
            continue

        expected = FOLDER_LABEL_MAP.get(folder_name.lower(), folder_name)
        images = sorted(set(
            list(folder_path.glob("*.jpg")) +
            list(folder_path.glob("*.JPG")) +
            list(folder_path.glob("*.png"))
        ))[:IMAGES_PER_CLASS]

        cls_ok = 0
        for img_path in images:
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            res = hands.process(rgb)
            if not res.multi_hand_landmarks:
                no_hand += 1
                print(f"  {folder_name:<10} {img_path.name:<28} (no hand detected)")
                continue

            lms = res.multi_hand_landmarks[0].landmark
            raw_coords = [c for lm in lms for c in (lm.x, lm.y, lm.z)]
            x_feat = preprocess_landmarks(raw_coords)
            preds = model.predict(x_feat, verbose=0)
            idx = int(np.argmax(preds[0]))
            conf = float(preds[0][idx])
            pred = str(encoder.inverse_transform([idx])[0])

            ok = "OK" if pred == expected else "WRONG"
            print(f"  {folder_name:<10} {img_path.name:<28} {expected:<10} {pred:<10} {conf:>5.1%}  {ok}")
            total += 1
            cls_ok += int(pred == expected)
            correct += int(pred == expected)

        summary[folder_name] = (cls_ok, len(images))

    hands.close()

    print()
    print("=" * 65)
    print("SUMMARY")
    print("=" * 65)
    for cls, (c, t) in summary.items():
        pct = c / t * 100 if t > 0 else 0
        bar = ("#" * c + "." * max(0, t - c)).ljust(IMAGES_PER_CLASS)
        print(f"  {cls:<10} {bar}  {c}/{t} ({pct:.0f}%)")

    overall = correct / total * 100 if total > 0 else 0
    print()
    print(f"  Overall: {correct}/{total} ({overall:.1f}%)")
    print(f"  No-hand detections skipped: {no_hand}")
    print()
    if overall >= 85:
        print("  VERDICT: MODEL IS CORRECT on Kaggle images.")
        print("  -> Problem is WEBCAM PREPROCESSING (aspect-ratio / handedness).")
    elif overall >= 50:
        print("  VERDICT: MODEL has moderate accuracy. Mixed pipeline issues.")
    else:
        print("  VERDICT: MODEL FAILS on its own dataset images. Retraining needed.")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()
