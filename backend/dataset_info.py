"""
SignSpeak AI — Dataset Inspector
=================================
Prints a summary of all collected CSV data inside backend/dataset/.

Usage:
    python dataset_info.py
"""

import csv
from pathlib import Path

DATASET_DIR = Path(__file__).parent / "dataset"


def main():
    print("\n" + "╔" + "═" * 52 + "╗")
    print("║       SignSpeak AI — Dataset Summary           ║")
    print("╚" + "═" * 52 + "╝\n")

    if not DATASET_DIR.exists():
        print("  ⚠  dataset/ folder not found. Run dataset_collector.py first.\n")
        return

    gesture_dirs = sorted([d for d in DATASET_DIR.iterdir() if d.is_dir()])

    if not gesture_dirs:
        print("  ⚠  No gesture folders found in dataset/\n")
        return

    total_samples = 0
    print(f"  {'Gesture':<16} {'CSV File':<28} {'Samples':>8}")
    print("  " + "─" * 56)

    for gdir in gesture_dirs:
        csv_files = list(gdir.glob("*.csv"))
        for csv_file in csv_files:
            count = 0
            try:
                with open(csv_file, "r") as f:
                    count = max(0, sum(1 for _ in f) - 1)  # minus header
            except Exception as e:
                count = -1
            total_samples += max(0, count)
            print(f"  {gdir.name:<16} {csv_file.name:<28} {count:>8}")

    print("  " + "─" * 56)
    print(f"  {'TOTAL':<16} {len(gesture_dirs)} gestures{total_samples:>25} samples\n")


if __name__ == "__main__":
    main()
