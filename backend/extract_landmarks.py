"""
SignSpeak AI — Hand Landmark Extraction Module
=============================================
Converts the Kaggle ASL image dataset into MediaPipe hand landmark CSV files.
These files will later be used to train the gesture recognition model.

Usage:
    python extract_landmarks.py

Dependencies:
    pip install opencv-python mediapipe tqdm
"""

import csv
import sys
from pathlib import Path
import cv2
import mediapipe as mp
from tqdm import tqdm

# ─────────────────────────────────────────────────────────────────
# CONFIG & PATHS
# ─────────────────────────────────────────────────────────────────

# Base paths resolved using pathlib
BACKEND_DIR = Path(__file__).parent.resolve()
WORKSPACE_DIR = BACKEND_DIR.parent.resolve()
KAGGLE_DIR = WORKSPACE_DIR / "kaggle_dataset" / "asl_alphabet_train"

# Handle potential nested directory structure (e.g. asl_alphabet_train/asl_alphabet_train/)
if (KAGGLE_DIR / "asl_alphabet_train").is_dir():
    DATASET_SRC_DIR = KAGGLE_DIR / "asl_alphabet_train"
else:
    DATASET_SRC_DIR = KAGGLE_DIR

DATASET_OUT_DIR = BACKEND_DIR / "dataset"

# Folder mappings (e.g., source folder 'del' maps to output folder and label 'delete')
FOLDER_MAPPINGS = {
    "del": "delete"
}

# CSV column names: 21 landmarks × (x, y, z) = 63 features + label
LANDMARK_COLUMNS = [
    f"lm{i}_{axis}"
    for i in range(21)
    for axis in ("x", "y", "z")
]
CSV_HEADER = LANDMARK_COLUMNS + ["label"]

# ─────────────────────────────────────────────────────────────────
# MEDIAPIPE HANDS DETECTOR FACTORY
# ─────────────────────────────────────────────────────────────────

def create_hands_detector():
    """
    Creates and returns a MediaPipe Hands detector with specified configurations.
    """
    mp_hands = mp.solutions.hands
    return mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5
    )

# ─────────────────────────────────────────────────────────────────
# NORMALIZATION FUNCTION
# ─────────────────────────────────────────────────────────────────

def normalize_landmarks(landmarks):
    """
    Normalizes hand landmarks to make the model robust to scale and translation.
    
    Args:
        landmarks: List of 21 landmark objects, each having x, y, z coordinates.
        
    Returns:
        A flat list of 63 normalized coordinates (x, y, z for each landmark).
    """
    # 1. Translation: Shift coordinates relative to the wrist (landmark 0)
    base_x = landmarks[0].x
    base_y = landmarks[0].y
    base_z = landmarks[0].z
    
    relative_coords = []
    for lm in landmarks:
        relative_coords.append(lm.x - base_x)
        relative_coords.append(lm.y - base_y)
        relative_coords.append(lm.z - base_z)
        
    # 2. Scaling: Divide all coordinates by the maximum absolute coordinate value
    max_val = max(abs(val) for val in relative_coords)
    
    if max_val > 0:
        normalized_coords = [val / max_val for val in relative_coords]
    else:
        normalized_coords = relative_coords
        
    return normalized_coords

# ─────────────────────────────────────────────────────────────────
# PROCESS IMAGES
# ─────────────────────────────────────────────────────────────────

def get_gesture_label(folder_name: str) -> str:
    """
    Resolves the output gesture label based on folder name mappings.
    """
    return FOLDER_MAPPINGS.get(folder_name.lower(), folder_name)

def main():
    print("\n" + "=" * 50)
    print("  SignSpeak AI — Hand Landmark Extractor")
    print("=" * 50)
    print(f"  Source dataset:  {DATASET_SRC_DIR.resolve()}")
    print(f"  Output dataset:  {DATASET_OUT_DIR.resolve()}\n")

    if not DATASET_SRC_DIR.exists():
        print(f"  ❌ Error: Source directory does not exist: {DATASET_SRC_DIR.resolve()}")
        sys.exit(1)

    # 1. Detect all gesture directories
    gesture_folders = sorted([d for d in DATASET_SRC_DIR.iterdir() if d.is_dir()])
    if not gesture_folders:
        print("  ❌ Error: No gesture folders found in source directory.")
        sys.exit(1)

    # 2. Collect all images and assign their target CSV paths and labels
    all_tasks = []
    for folder in gesture_folders:
        label = get_gesture_label(folder.name)
        csv_dir = DATASET_OUT_DIR / label
        csv_path = csv_dir / f"{label}.csv"
        
        # Gather all images inside folder (supporting multiple extensions case-insensitively and deduplicating)
        images_set = set()
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.JPG", "*.JPEG", "*.PNG"):
            images_set.update(folder.glob(ext))
            
        for img_path in sorted(images_set):
            all_tasks.append({
                "img_path": img_path,
                "label": label,
                "csv_path": csv_path
            })

    total_images = len(all_tasks)
    print(f"  Gesture classes detected ({len(gesture_folders)}): {[get_gesture_label(f.name) for f in gesture_folders]}")
    print(f"  Total images found to process: {total_images}\n")

    if total_images == 0:
        print("  ⚠ No images found to process. Exiting.")
        sys.exit(0)

    # Track metrics
    successful_detections = 0
    skipped_images = 0
    csv_files_created = set()

    # Ensure output directory root exists
    DATASET_OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Group tasks by output CSV path to write incrementally class-by-class
    tasks_by_csv = {}
    for task in all_tasks:
        csv_path = task["csv_path"]
        if csv_path not in tasks_by_csv:
            tasks_by_csv[csv_path] = []
        tasks_by_csv[csv_path].append(task)

    # Initialize progress bar
    progress_bar = tqdm(total=total_images, desc="Processing images", unit="img")

    # Use MediaPipe Hands detector
    with create_hands_detector() as hands:
        for csv_path, tasks in tasks_by_csv.items():
            # Create subfolder if it does not exist
            csv_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Initialize CSV file and write header
            write_header = not csv_path.exists()
            
            # Open CSV in append mode
            with open(csv_path, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if write_header:
                    writer.writerow(CSV_HEADER)
                    csv_files_created.add(csv_path)
                else:
                    # If file already exists, it is also counted as created/updated
                    csv_files_created.add(csv_path)
                
                # Process each image in this class
                for task in tasks:
                    img_path = task["img_path"]
                    label = task["label"]
                    
                    try:
                        # Load image using OpenCV
                        image = cv2.imread(str(img_path))
                        if image is None:
                            # Log error and skip
                            print(f"\n  ⚠ Warning: Failed to load corrupted image: {img_path}")
                            skipped_images += 1
                            progress_bar.update(1)
                            continue
                            
                        # Convert to RGB (MediaPipe requirement)
                        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                        
                        # Process hand landmarks
                        results = hands.process(image_rgb)
                        
                        if results.multi_hand_landmarks:
                            # Extract first detected hand
                            landmarks = results.multi_hand_landmarks[0].landmark
                            
                            # Normalize landmarks
                            normalized_coords = normalize_landmarks(landmarks)
                            
                            # Append to CSV: 63 features + label
                            writer.writerow(normalized_coords + [label])
                            successful_detections += 1
                        else:
                            skipped_images += 1
                            
                    except Exception as e:
                        # Graceful error handling for other unexpected exceptions (e.g. OS read error, format error)
                        print(f"\n  ⚠ Warning: Error processing image {img_path}: {e}")
                        skipped_images += 1
                        
                    progress_bar.update(1)

    progress_bar.close()

    # 14. Print a summary after completion
    print("\n======================================")
    print("Landmark Extraction Complete")
    print("======================================")
    print(f"Total gesture classes:   {len(gesture_folders)}")
    print(f"Total images:            {total_images}")
    print(f"Successful detections:   {successful_detections}")
    print(f"Skipped images:          {skipped_images}")
    print(f"CSV files created:       {len(csv_files_created)}")
    print(f"Dataset location:        {DATASET_OUT_DIR.resolve()}")
    print("======================================\n")

if __name__ == "__main__":
    main()
