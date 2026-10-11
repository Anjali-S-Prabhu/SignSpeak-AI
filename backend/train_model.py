"""
SignSpeak AI - Gesture Model Training Pipeline
==============================================
Trains a TensorFlow/Keras neural network classifier on hand landmarks
extracted from MediaPipe and saved in CSV files.

Outputs saved to backend/trained_models/:
  - gesture_model.keras
  - label_encoder.pkl
  - training_history.json
  - accuracy_plot.png
  - loss_plot.png
  - confusion_matrix.png
  - classification_report.txt
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, BatchNormalization, Dropout, Activation, Input
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

# Paths
BACKEND_DIR = Path(__file__).parent.resolve()
DATASET_DIR = BACKEND_DIR / "dataset"
OUTPUT_DIR = BACKEND_DIR / "trained_models"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_dataset(dataset_dir: Path):
    """
    Recursively scans dataset_dir for CSV files, loads them, and combines them
    into a single pandas DataFrame.
    """
    print(f"\nScanning dataset directory: {dataset_dir}")
    csv_files = list(dataset_dir.rglob("*.csv"))
    
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {dataset_dir}")
        
    dfs = []
    print(f"Found {len(csv_files)} CSV files. Loading data...")
    
    for csv_file in sorted(csv_files):
        try:
            df = pd.read_csv(csv_file)
            if df.empty:
                print(f"  [WARN] Skipped empty file: {csv_file.name}")
                continue
            
            # Ensure label column exists
            if "label" not in df.columns:
                print(f"  [WARN] Skipped {csv_file.name}: missing 'label' column")
                continue
                
            dfs.append(df)
            print(f"  [LOADED] {csv_file.parent.name}/{csv_file.name} ({len(df)} samples)")
        except Exception as e:
            print(f"  [ERROR] Error loading {csv_file}: {e}")
            
    if not dfs:
        raise ValueError("No valid data could be loaded.")
        
    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"\nDataset loaded successfully!")
    print(f"Total samples: {len(combined_df)}")
    print(f"Unique classes in raw data: {combined_df['label'].nunique()}")
    return combined_df


from app.ai.preprocessor import extract_landmark_features


def augment_confusable_landmarks(X_raw: np.ndarray, y_raw: np.ndarray, confusable_classes: list) -> tuple:
    """
    Applies targeted 3D rotation, scaling, jittering, and feature dropout augmentation
    for worst confusable letter pairs (B/P/L, M/N/S/T, U/V/R).
    """
    augmented_X = []
    augmented_y = []

    for cls in np.unique(y_raw):
        mask = (y_raw == cls)
        cls_X_raw = X_raw[mask]
        cls_y = y_raw[mask]

        augmented_X.append(cls_X_raw)
        augmented_y.append(cls_y)

        # Apply augmentation for confusable classes
        if cls in confusable_classes:
            N = len(cls_X_raw)
            # Create synthetic variations with 3D rotation & scaling
            X_3d = cls_X_raw.reshape(N, 21, 3).copy()

            # Small random rotations (-20 to +20 degrees)
            rad_x = np.random.uniform(-0.35, 0.35, size=N)
            rad_y = np.random.uniform(-0.35, 0.35, size=N)
            rad_z = np.random.uniform(-0.35, 0.35, size=N)
            scale = np.random.uniform(0.88, 1.12, size=(N, 1, 1))
            jitter = np.random.normal(0, 0.005, size=X_3d.shape)

            for i in range(N):
                cx, sx = np.cos(rad_x[i]), np.sin(rad_x[i])
                cy, sy = np.cos(rad_y[i]), np.sin(rad_y[i])
                cz, sz = np.cos(rad_z[i]), np.sin(rad_z[i])

                Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]])
                Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
                Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])

                R = Rz @ Ry @ Rx
                X_3d[i] = (X_3d[i] @ R.T) * scale[i] + jitter[i]

            augmented_X.append(X_3d.reshape(N, 63))
            augmented_y.append(cls_y)

    combined_X_raw = np.vstack(augmented_X)
    combined_y_raw = np.concatenate(augmented_y)
    return combined_X_raw, combined_y_raw


def main():
    print("==================================================")
    print("          SignSpeak AI - Training Pipeline        ")
    print("==================================================")

    try:
        df = load_dataset(DATASET_DIR)
    except Exception as e:
        print(f"\n[Error] Dataset loading failed: {e}")
        return

    # Oversample underrepresented classes
    min_samples_required = 10
    class_counts = df["label"].value_counts()
    underrepresented_classes = class_counts[class_counts < min_samples_required].index

    if not underrepresented_classes.empty:
        print(f"\n[Warning] The following classes have fewer than {min_samples_required} samples:")
        for cls in underrepresented_classes:
            print(f"  - '{cls}': {class_counts[cls]} samples")
        print(f"Oversampling minority classes to at least {min_samples_required} samples...")

        oversampled_dfs = []
        for cls in df["label"].unique():
            cls_df = df[df["label"] == cls]
            if len(cls_df) < min_samples_required:
                extra_needed = min_samples_required - len(cls_df)
                repeated_df = cls_df.sample(n=extra_needed, replace=True, random_state=42)
                cls_df = pd.concat([cls_df, repeated_df], ignore_index=True)
            oversampled_dfs.append(cls_df)
        df = pd.concat(oversampled_dfs, ignore_index=True)

    feature_cols = [col for col in df.columns if col != "label"]
    X_raw = df[feature_cols].values.astype(np.float32)
    y_raw = df["label"].values

    # Augment confusable classes (B, P, L, M, N, S, T, U, V, R)
    CONFUSABLE_PAIRS = ["B", "P", "L", "M", "N", "S", "T", "U", "V", "R"]
    print(f"\nAugmenting confusable classes {CONFUSABLE_PAIRS} with 3D rotation & jittering...")
    X_raw_aug, y_raw_aug = augment_confusable_landmarks(X_raw, y_raw, CONFUSABLE_PAIRS)
    print(f"Augmented dataset size: {X_raw_aug.shape[0]} samples")

    # 2. Extract 105 Canonical Geometric Features
    print("\nExtracting 105 canonical geometric features (rotation & scale normalized)...")
    X = extract_landmark_features(X_raw_aug)
    print(f"Feature matrix shape: {X.shape} (105 features per landmark frame)")

    # 3. Encode Labels
    print("\nEncoding labels...")
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw_aug)

    encoder_path = OUTPUT_DIR / "label_encoder.pkl"
    with open(encoder_path, "wb") as f:
        pickle.dump(label_encoder, f)
    print(f"Saved Label Encoder to: {encoder_path}")
    print(f"Classes: {list(label_encoder.classes_)}")

    num_classes = len(label_encoder.classes_)

    # 4. Split Data (80% Train, 10% Val, 10% Test)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print("\nData Split Summary:")
    print(f"  Training Set   : {X_train.shape[0]} samples")
    print(f"  Validation Set : {X_val.shape[0]} samples")
    print(f"  Test Set       : {X_test.shape[0]} samples")

    # 5. Build Keras Dense Model (input: 105 features)
    print("\nBuilding Keras Model (105 inputs)...")
    model = Sequential([
        Input(shape=(105,)),

        Dense(512, name="dense_0"),
        BatchNormalization(name="bn_0"),
        Activation("swish", name="swish_0"),
        Dropout(0.3, name="dropout_0"),

        Dense(256, name="dense_1"),
        BatchNormalization(name="bn_1"),
        Activation("swish", name="swish_1"),
        Dropout(0.25, name="dropout_1"),

        Dense(128, name="dense_2"),
        BatchNormalization(name="bn_2"),
        Activation("swish", name="swish_2"),
        Dropout(0.2, name="dropout_2"),

        Dense(64, name="dense_3"),
        BatchNormalization(name="bn_3"),
        Activation("swish", name="swish_3"),
        Dropout(0.1, name="dropout_3"),

        Dense(num_classes, activation="softmax", name="output_layer")
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    
    model.summary()
    
    # 6. Define Callbacks
    model_path = OUTPUT_DIR / "gesture_model.keras"
    
    callbacks = [
        EarlyStopping(
            monitor="val_loss",
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=5,
            min_lr=1e-5,
            verbose=1
        ),
        ModelCheckpoint(
            filepath=str(model_path),
            monitor="val_loss",
            save_best_only=True,
            verbose=1
        )
    ]
    
    # 7. Train Model
    epochs = 120
    batch_size = 32
    
    print(f"\nTraining model for up to {epochs} epochs with batch size {batch_size}...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=callbacks,
        verbose=1
    )
    
    # 8. Save History
    history_dict = {k: [float(val) for val in v] for k, v in history.history.items()}
    history_path = OUTPUT_DIR / "training_history.json"
    with open(history_path, "w") as f:
        json.dump(history_dict, f, indent=4)
    print(f"\nSaved training history to: {history_path}")
    
    # 9. Evaluate Model
    print("\nEvaluating model performance...")
    
    train_loss, train_acc = model.evaluate(X_train, y_train, verbose=0)
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    
    print("\n" + "=" * 40)
    print(f"Final Training Accuracy   : {train_acc * 100:.2f}%")
    print(f"Final Validation Accuracy : {val_acc * 100:.2f}%")
    print(f"Final Test Accuracy       : {test_acc * 100:.2f}%")
    print("=" * 40)
    
    # 10. Generate Predictions & classification metrics
    y_pred_probs = model.predict(X_test, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)
    
    # Classification Report
    report = classification_report(
        y_test, y_pred, target_names=label_encoder.classes_
    )
    print("\nClassification Report:\n")
    print(report)
    
    report_path = OUTPUT_DIR / "classification_report.txt"
    with open(report_path, "w") as f:
        f.write(report)
    print(f"Saved classification report to: {report_path}")
    
    # 11. Plot Curves
    print("\nGenerating evaluation charts...")
    
    # Style styling
    sns.set_theme(style="whitegrid")
    
    # Accuracy Plot
    plt.figure(figsize=(8, 5))
    plt.plot(history.history["accuracy"], label="Training Accuracy", color="#2a9d8f", linewidth=2)
    plt.plot(history.history["val_accuracy"], label="Validation Accuracy", color="#e76f51", linewidth=2)
    plt.title("SignSpeak AI - Model Accuracy", fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Accuracy", fontsize=12)
    plt.legend(frameon=True, facecolor="white", edgecolor="none")
    plt.tight_layout()
    acc_plot_path = OUTPUT_DIR / "accuracy_plot.png"
    plt.savefig(acc_plot_path, dpi=150)
    plt.close()
    print(f"Saved accuracy plot to: {acc_plot_path}")
    
    # Loss Plot
    plt.figure(figsize=(8, 5))
    plt.plot(history.history["loss"], label="Training Loss", color="#264653", linewidth=2)
    plt.plot(history.history["val_loss"], label="Validation Loss", color="#e76f51", linewidth=2)
    plt.title("SignSpeak AI - Model Loss", fontsize=14, fontweight="bold", pad=15)
    plt.xlabel("Epoch", fontsize=12)
    plt.ylabel("Loss", fontsize=12)
    plt.legend(frameon=True, facecolor="white", edgecolor="none")
    plt.tight_layout()
    loss_plot_path = OUTPUT_DIR / "loss_plot.png"
    plt.savefig(loss_plot_path, dpi=150)
    plt.close()
    print(f"Saved loss plot to: {loss_plot_path}")
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(12, 10))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=label_encoder.classes_,
        yticklabels=label_encoder.classes_,
        cbar=True,
        square=True
    )
    plt.title("SignSpeak AI - Confusion Matrix", fontsize=16, fontweight="bold", pad=20)
    plt.xlabel("Predicted Label", fontsize=12, labelpad=10)
    plt.ylabel("True Label", fontsize=12, labelpad=10)
    plt.xticks(rotation=45, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    cm_plot_path = OUTPUT_DIR / "confusion_matrix.png"
    plt.savefig(cm_plot_path, dpi=150)
    plt.close()
    print(f"Saved confusion matrix to: {cm_plot_path}")
    
    print("\nTraining Pipeline completed successfully! All assets saved.")


if __name__ == "__main__":
    main()
