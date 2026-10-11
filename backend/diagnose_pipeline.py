"""
Pipeline Deep Diagnostic Script
================================
Inspects Kaggle dataset landmarks and tests transformations (mirroring, normalization, handedness).
"""
import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import warnings
warnings.filterwarnings("ignore")

import pickle
import numpy as np
import cv2
import mediapipe as mp
from pathlib import Path
import tensorflow as tf

BACKEND_DIR = Path(__file__).parent.resolve()
WORKSPACE_DIR = BACKEND_DIR.parent.resolve()
KAGGLE_SRC = WORKSPACE_DIR / "kaggle_dataset" / "asl_alphabet_train" / "asl_alphabet_train"
if not KAGGLE_SRC.exists():
    KAGGLE_SRC = WORKSPACE_DIR / "kaggle_dataset" / "asl_alphabet_train"

MODEL_PATH = BACKEND_DIR / "trained_models" / "gesture_model.keras"
ENCODER_PATH = BACKEND_DIR / "trained_models" / "label_encoder.pkl"

model = tf.keras.models.load_model(str(MODEL_PATH))
with open(ENCODER_PATH, "rb") as f:
    encoder = pickle.load(f)

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5)

def normalize_landmarks_standard(landmarks_xyz):
    arr = np.array(landmarks_xyz, dtype=np.float32).reshape(21, 3)
    arr -= arr[0] # subtract wrist
    max_val = np.max(np.abs(arr))
    if max_val > 0:
        arr /= max_val
    return arr.reshape(1, 63)

def predict_raw(landmarks_xyz):
    feat = normalize_landmarks_standard(landmarks_xyz)
    preds = model.predict(feat, verbose=0)[0]
    idx = np.argmax(preds)
    return encoder.inverse_transform([idx])[0], float(preds[idx]), preds

def test_class_transformations(folder_name):
    folder_path = KAGGLE_SRC / folder_name
    if not folder_path.exists():
        print(f"Folder not found: {folder_path}")
        return
    images = sorted(list(folder_path.glob("*.jpg")) + list(folder_path.glob("*.png")))[:5]
    print(f"\n--- Testing Class: {folder_name} ({len(images)} images) ---")
    
    for img_path in images:
        img = cv2.imread(str(img_path))
        if img is None: continue
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)
        if not res.multi_hand_landmarks:
            print(f"File: {img_path.name:<12} | (no hand detected)")
            continue
        
        lms = res.multi_hand_landmarks[0].landmark
        raw_xyz = [(lm.x, lm.y, lm.z) for lm in lms]
        
        # Handedness check
        handedness = res.multi_handedness[0].classification[0].label if res.multi_handedness else "Unknown"
        
        # Original Prediction
        pred_orig, conf_orig, _ = predict_raw(raw_xyz)
        
        # Mirrored X (1 - x)
        mirrored_xyz = [(1.0 - lm.x, lm.y, lm.z) for lm in lms]
        pred_mirror_x, conf_mirror_x, _ = predict_raw(mirrored_xyz)

        print(f"File: {img_path.name:<12} | Hand: {handedness:<5} | Orig: {pred_orig:<5} ({conf_orig:.1%}) | MirroredX: {pred_mirror_x:<5} ({conf_mirror_x:.1%})")

if __name__ == "__main__":
    for cls in ["M", "N", "C", "E", "A", "P", "L", "space"]:
        test_class_transformations(cls)
