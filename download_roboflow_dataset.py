"""
SignSpeakAI - Automatic Roboflow Dataset Downloader Script
Downloads your Roboflow dataset version directly into d:/SignSpeak AI/dataset_source_roboflow
"""

import os

def download_dataset():
    api_key = input("Enter your Roboflow API Key (or press Enter if saved in env): ").strip()
    if not api_key:
        api_key = os.getenv("ROBOFLOW_API_KEY", "")

    if not api_key:
        print("Error: Roboflow API key is required.")
        print("Get your API key at https://roboflow.com -> Account Settings -> API Keys")
        return

    try:
        from roboflow import Roboflow
    except ImportError:
        print("Installing roboflow package...")
        os.system("pip install roboflow")
        from roboflow import Roboflow

    print("Connecting to Roboflow project 'sign-language-c8yo2' (version 2)...")
    rf = Roboflow(api_key=api_key)
    
    # Download dataset into dataset_source_roboflow directory
    target_dir = os.path.abspath("dataset_source_roboflow")
    print(f"Downloading dataset to: {target_dir}")

    try:
        project = rf.workspace().project("sign-language-c8yo2")
        version = project.version(2)
        dataset = version.download(model_format="yolov8", location=target_dir)
        print("\n✅ Dataset successfully downloaded into dataset_source_roboflow!")
        print(f"Location: {dataset.location}")
    except Exception as e:
        print(f"\n❌ Download failed: {e}")
        print("Alternative: Download zip manually from Roboflow Web UI -> Export -> YOLOv8 -> Download Zip")

if __name__ == "__main__":
    download_dataset()
