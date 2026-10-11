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

def predict(arr_21_3):
    feat = preprocess_landmarks(arr_21_3.flatten())
    preds = model.predict(feat, verbose=0)[0]
    idx = int(np.argmax(preds))
    return str(encoder.inverse_transform([idx])[0]), float(preds[idx])

classes_to_test = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "space"]

print("==========================================================================")
print(f"{'CLASS':<8} {'ORIGINAL PREDICTION':<22} {'HORIZONTALLY FLIPPED (1-x)':<25}")
print("==========================================================================")

for cls_name in classes_to_test:
    folder = KAGGLE_SRC / cls_name
    if not folder.exists(): continue
    imgs = sorted(list(folder.glob("*.jpg")) + list(folder.glob("*.png")))
    if not imgs: continue
    
    # find first image where hand is detected
    detected = False
    for img_p in imgs[:10]:
        img = cv2.imread(str(img_p))
        if img is None: continue
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)
        if res.multi_hand_landmarks:
            lms = res.multi_hand_landmarks[0].landmark
            pts = np.array([[lm.x, lm.y, lm.z] for lm in lms], dtype=np.float32)
            orig_label, orig_conf = predict(pts)
            
            pts_flip = pts.copy()
            pts_flip[:, 0] = 1.0 - pts_flip[:, 0]
            flip_label, flip_conf = predict(pts_flip)
            
            print(f"{cls_name:<8} {orig_label:<10} ({orig_conf:>5.1%})          {flip_label:<10} ({flip_conf:>5.1%})")
            detected = True
            break

hands.close()
