"""
SignSpeak AI — Dataset Collection Module
=========================================
Captures MediaPipe hand landmarks from a live webcam and saves them
to CSV files inside backend/dataset/<gesture_name>/.

Controls:
    C  →  Capture one sample
    Q  →  Quit / switch to next gesture

Usage:
    python dataset_collector.py

Dependencies:
    pip install opencv-python mediapipe
"""

import cv2
import csv
import os
import time
from pathlib import Path
from typing import Optional

import mediapipe as mp

# ─────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────

DATASET_DIR = Path(__file__).parent / "dataset"
FONT = cv2.FONT_HERSHEY_SIMPLEX
COLOR_GREEN  = (0, 255, 128)
COLOR_BLUE   = (130, 100, 255)
COLOR_WHITE  = (255, 255, 255)
COLOR_RED    = (60,  60, 240)
COLOR_YELLOW = (0,  220, 255)
COLOR_BG     = (15,  10,  30)   # dark overlay

# CSV column names: 21 landmarks × (x, y, z) = 63 features + label
LANDMARK_COLUMNS = [
    f"lm{i}_{axis}"
    for i in range(21)
    for axis in ("x", "y", "z")
]
CSV_HEADER = LANDMARK_COLUMNS + ["label"]


# ─────────────────────────────────────────────────────────────────
# MEDIAPIPE SETUP
# ─────────────────────────────────────────────────────────────────

mp_hands    = mp.solutions.hands
mp_drawing  = mp.solutions.drawing_utils
mp_styles   = mp.solutions.drawing_styles


def create_hands_detector():
    return mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        model_complexity=1,
        min_detection_confidence=0.70,
        min_tracking_confidence=0.60,
    )


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def get_gesture_name() -> str:
    """Prompt user in terminal for gesture label until a valid name is given."""
    print("\n" + "═" * 50)
    print("  SignSpeak AI — Dataset Collector")
    print("═" * 50)
    while True:
        name = input("\n  Enter gesture name (e.g. A, B, HELLO, THANKS): ").strip().upper()
        if name:
            return name
        print("  ⚠  Gesture name cannot be empty. Try again.")


def get_csv_path(gesture: str) -> Path:
    """Return the CSV file path for a gesture, creating the folder if needed."""
    gesture_dir = DATASET_DIR / gesture
    gesture_dir.mkdir(parents=True, exist_ok=True)
    return gesture_dir / f"{gesture}.csv"


def init_csv(csv_path: Path):
    """Write header row if the CSV is new."""
    if not csv_path.exists():
        with open(csv_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADER)


def count_existing_samples(csv_path: Path) -> int:
    """Count data rows already in the CSV (excluding header)."""
    if not csv_path.exists():
        return 0
    with open(csv_path, "r") as f:
        return max(0, sum(1 for _ in f) - 1)


def append_sample(csv_path: Path, landmarks, label: str):
    """Append one landmark row to the CSV."""
    row = [coord for lm in landmarks for coord in (lm.x, lm.y, lm.z)]
    row.append(label)
    with open(csv_path, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(row)


def extract_bounding_box(landmarks, w: int, h: int):
    """Return (x_min, y_min, x_max, y_max) pixel coords of hand bbox."""
    xs = [lm.x * w for lm in landmarks]
    ys = [lm.y * h for lm in landmarks]
    pad = 20
    return (
        max(0, int(min(xs)) - pad),
        max(0, int(min(ys)) - pad),
        min(w, int(max(xs)) + pad),
        min(h, int(max(ys)) + pad),
    )


# ─────────────────────────────────────────────────────────────────
# DRAWING
# ─────────────────────────────────────────────────────────────────

def draw_landmarks(frame, hand_landmarks, w: int, h: int):
    """Draw skeleton, landmark dots, and bounding box on frame."""
    # Skeleton connections
    mp_drawing.draw_landmarks(
        frame,
        hand_landmarks,
        mp_hands.HAND_CONNECTIONS,
        mp_drawing.DrawingSpec(color=(130, 100, 255), thickness=2, circle_radius=4),
        mp_drawing.DrawingSpec(color=(99,  102, 241), thickness=2),
    )

    # Fingertip highlights (landmarks 4, 8, 12, 16, 20)
    for tip_idx in [4, 8, 12, 16, 20]:
        lm = hand_landmarks.landmark[tip_idx]
        cx, cy = int(lm.x * w), int(lm.y * h)
        cv2.circle(frame, (cx, cy), 8, COLOR_GREEN, -1)
        cv2.circle(frame, (cx, cy), 9, COLOR_WHITE, 1)


def draw_bounding_box(frame, landmarks, w: int, h: int, gesture: str):
    """Draw dashed bounding box around the detected hand."""
    x1, y1, x2, y2 = extract_bounding_box(landmarks, w, h)

    # Dashed rectangle simulation via corners
    corner_len = 18
    thickness  = 2
    color = COLOR_BLUE

    # Top-left
    cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, thickness)
    cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, thickness)
    # Top-right
    cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, thickness)
    cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, thickness)
    # Bottom-left
    cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, thickness)
    cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, thickness)
    # Bottom-right
    cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, thickness)
    cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, thickness)


def draw_hud(
    frame,
    gesture: str,
    sample_count: int,
    hand_detected: bool,
    flash: bool,
    w: int,
    h: int,
):
    """Render the on-screen HUD overlay."""

    # ── Semi-transparent top bar ──────────────────────────────────
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 70), (10, 5, 20), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    # Title
    cv2.putText(frame, "SignSpeak AI", (14, 26), FONT, 0.75, COLOR_BLUE, 2)
    cv2.putText(frame, "Dataset Collector", (14, 50), FONT, 0.5, (160, 140, 220), 1)

    # ── Gesture label (top-right) ─────────────────────────────────
    label_txt  = f"Gesture: {gesture}"
    (lw, lh), _ = cv2.getTextSize(label_txt, FONT, 0.7, 2)
    cv2.putText(frame, label_txt, (w - lw - 14, 34), FONT, 0.7, COLOR_YELLOW, 2)

    # ── Sample counter bar (bottom) ───────────────────────────────
    bar_h = 64
    bar_overlay = frame.copy()
    cv2.rectangle(bar_overlay, (0, h - bar_h), (w, h), (10, 5, 20), -1)
    cv2.addWeighted(bar_overlay, 0.65, frame, 0.35, 0, frame)

    # Sample count
    count_txt = f"Samples: {sample_count}"
    cv2.putText(frame, count_txt, (14, h - bar_h + 26), FONT, 0.7, COLOR_GREEN, 2)

    # Hand detection status
    status_txt  = "Hand Detected" if hand_detected else "No Hand"
    status_col  = COLOR_GREEN if hand_detected else COLOR_RED
    (sw, _), _  = cv2.getTextSize(status_txt, FONT, 0.6, 1)
    cv2.putText(frame, status_txt, (w // 2 - sw // 2, h - bar_h + 26), FONT, 0.6, status_col, 2)

    # Hotkey hints
    cv2.putText(frame, "[C] Capture  [Q] Quit/Next Gesture", (14, h - 14), FONT, 0.45, (130, 120, 180), 1)

    # ── Flash feedback when capturing ────────────────────────────
    if flash:
        flash_overlay = frame.copy()
        cv2.rectangle(flash_overlay, (0, 0), (w, h), COLOR_GREEN, -1)
        cv2.addWeighted(flash_overlay, 0.15, frame, 0.85, 0, frame)
        cv2.putText(frame, "CAPTURED!", w // 2 - 90, h // 2, FONT, 1.2, COLOR_GREEN, 3)


def draw_no_hand_msg(frame, w: int, h: int):
    """Show a centered message when no hand is visible."""
    msg = "Show your hand to the camera"
    (mw, _), _ = cv2.getTextSize(msg, FONT, 0.65, 1)
    cv2.putText(
        frame, msg,
        (w // 2 - mw // 2, h // 2),
        FONT, 0.65, (80, 80, 140), 1,
    )


# ─────────────────────────────────────────────────────────────────
# MAIN COLLECTOR LOOP
# ─────────────────────────────────────────────────────────────────

def run_collector(gesture: str, csv_path: Path):
    """
    Open webcam, detect hand, draw landmarks, and capture samples.

    Args:
        gesture:   The gesture label being recorded.
        csv_path:  Path to the CSV file for this gesture.
    """
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("  ❌  Could not open webcam. Check camera connections.")
        return False  # False = exit program

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_FPS, 30)

    sample_count = count_existing_samples(csv_path)
    print(f"\n  ▶  Recording gesture: [{gesture}]")
    print(f"  ℹ  Existing samples: {sample_count}")
    print(f"  ℹ  Saving to: {csv_path}")
    print("  Press [C] in the webcam window to capture, [Q] to quit/next gesture.\n")

    flash_until: float = 0.0   # timestamp when flash ends

    with create_hands_detector() as hands:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("  ⚠  Failed to read frame from camera.")
                break

            # Mirror for natural interaction
            frame = cv2.flip(frame, 1)
            h, w  = frame.shape[:2]

            # ── MediaPipe processing ──────────────────────────────
            rgb_frame           = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb_frame.flags.writeable = False
            results             = hands.process(rgb_frame)
            rgb_frame.flags.writeable = True

            hand_detected = (
                results.multi_hand_landmarks is not None
                and len(results.multi_hand_landmarks) > 0
            )
            current_landmarks: Optional[object] = None

            if hand_detected:
                current_landmarks = results.multi_hand_landmarks[0]
                draw_landmarks(frame, current_landmarks, w, h)
                draw_bounding_box(frame, current_landmarks.landmark, w, h, gesture)
            else:
                draw_no_hand_msg(frame, w, h)

            # ── Flash effect ──────────────────────────────────────
            now   = time.time()
            flash = now < flash_until

            # ── HUD overlay ───────────────────────────────────────
            draw_hud(frame, gesture, sample_count, hand_detected, flash, w, h)

            # ── Show frame ────────────────────────────────────────
            cv2.imshow("SignSpeak AI — Dataset Collector", frame)

            # ── Key handling ──────────────────────────────────────
            key = cv2.waitKey(1) & 0xFF

            if key == ord("c") or key == ord("C"):
                if hand_detected and current_landmarks is not None:
                    append_sample(csv_path, current_landmarks.landmark, gesture)
                    sample_count += 1
                    flash_until   = time.time() + 0.25   # 250ms flash
                    print(f"  ✅  Sample {sample_count:04d} captured for [{gesture}]")
                else:
                    print("  ⚠  No hand detected — move your hand into the frame first.")

            elif key == ord("q") or key == ord("Q"):
                print(f"\n  Stopped recording [{gesture}] — {sample_count} samples saved.")
                cap.release()
                cv2.destroyAllWindows()
                return True  # True = ask for next gesture

    cap.release()
    cv2.destroyAllWindows()
    return False  # Camera read failed → exit


# ─────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────

def main():
    print("\n" + "╔" + "═" * 48 + "╗")
    print("║      SignSpeak AI — Dataset Collector         ║")
    print("╚" + "═" * 48 + "╝")
    print(f"\n  📂  Saving dataset to: {DATASET_DIR.resolve()}\n")

    DATASET_DIR.mkdir(parents=True, exist_ok=True)

    while True:
        gesture  = get_gesture_name()
        csv_path = get_csv_path(gesture)
        init_csv(csv_path)

        continue_recording = run_collector(gesture, csv_path)

        if not continue_recording:
            print("\n  👋  Exiting dataset collector. Goodbye!\n")
            break

        again = input(
            "\n  Record another gesture? [Y/N]: "
        ).strip().upper()
        if again != "Y":
            print("\n  👋  All done! Check backend/dataset/ for your CSV files.\n")
            break


if __name__ == "__main__":
    main()
