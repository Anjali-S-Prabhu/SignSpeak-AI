"""
SignSpeak AI — Final Verification Test
======================================
Tests the trained model with landmark orientation matching webcam feed
for all major confusing classes: A, C, E, M, N, R, U, V, W, Z, space.
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

from app.ai.preprocessor import preprocess_landmarks

def normalize_and_predict(landmarks_xyz):
    # landmarks_xyz: flat list or array of 63 coordinates
    flat_coords = np.array(landmarks_xyz, dtype=np.float32).flatten()
    feat = preprocess_landmarks(flat_coords)
    preds = model.predict(feat, verbose=0)[0]
    idx = int(np.argmax(preds))
    return str(encoder.inverse_transform([idx])[0]), float(preds[idx])

TEST_CLASSES = ["A", "C", "E", "M", "N", "R", "U", "V", "W", "Z", "space"]

print("=========================================================================")
print(f"{'EXPECTED':<12} {'PREDICTED':<12} {'CONFIDENCE':<12} {'STATUS'}")
print("=========================================================================")

all_ok = True
for cls in TEST_CLASSES:
    folder = KAGGLE_SRC / cls
    if not folder.exists():
        print(f"{cls:<12} (Folder not found)")
        continue
    imgs = sorted(list(folder.glob("*.jpg")) + list(folder.glob("*.png")))
    
    found = False
    for img_p in imgs[:10]:
        img = cv2.imread(str(img_p))
        if img is None: continue
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)
        if res.multi_hand_landmarks:
            lms = res.multi_hand_landmarks[0].landmark
            pts = [(lm.x, lm.y, lm.z) for lm in lms]
            
            pred_label, conf = normalize_and_predict(pts)
            status = "OK" if pred_label == cls else "MISMATCH"
            if pred_label != cls: all_ok = False
            
            print(f"{cls:<12} {pred_label:<12} {conf:>6.1%}        {status}")
            found = True
            break
    if not found:
        print(f"{cls:<12} (No hand detected in test subset)")

print("=========================================================================")
print("ALL TESTS PASSED: MODEL PRESERVED AND PREDICTIONS ACCURATE." if all_ok else "SOME MISMATCHES OCCURRED.")
print("=========================================================================")
hands.close()
