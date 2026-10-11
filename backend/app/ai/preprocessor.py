"""
Image / Landmark Preprocessor for the gesture model.
Converts raw 63 MediaPipe landmark coordinates into a canonical, rotation-invariant,
scale-invariant, and handedness-agnostic 105-feature geometric vector matching train_model.py.
"""
import numpy as np
from typing import List, Union


def canonicalize_single_hand(pts_21_3: np.ndarray) -> np.ndarray:
    """
    Transforms a single (21, 3) hand landmark array into a canonical reference frame:
    1. Translation: Wrist (0) to origin.
    2. Handedness Mirroring: Normalize Left hands to Right hand representation.
    3. 2D Rotation Alignment: Rotate Wrist->Middle MCP vector to point vertically UP.
    4. Scale Normalization: Scale by Wrist->Middle MCP 3D distance.
    """
    pts = pts_21_3.copy()

    # 1. Translation: Center wrist at (0, 0, 0)
    pts -= pts[0]

    # 2. Handedness Canonicalization:
    # Index MCP (5) vs Pinky MCP (17)
    # Right hand: Index MCP is to the right (+X) of Pinky MCP (-X) when palm faces front.
    if pts[5, 0] < pts[17, 0]:
        pts[:, 0] = -pts[:, 0]

    # 3. 2D Rotation Alignment:
    # Vector from Wrist (0) to Middle MCP (9)
    v_mid = pts[9, :2]
    dist_mid = np.linalg.norm(v_mid)
    if dist_mid > 1e-6:
        angle = np.arctan2(v_mid[1], v_mid[0])
        rot_angle = -np.pi / 2.0 - angle
        c, s = np.cos(rot_angle), np.sin(rot_angle)
        R_2d = np.array([[c, -s], [s, c]])
        pts[:, :2] = pts[:, :2] @ R_2d.T

    # 4. Scale Normalization:
    scale = np.linalg.norm(pts[9])
    if scale > 1e-6:
        pts /= scale
    else:
        max_v = np.max(np.abs(pts))
        if max_v > 0:
            pts /= max_v

    return pts


def extract_landmark_features(X_raw: np.ndarray) -> np.ndarray:
    """
    Extract 105 geometric features from 63 raw landmarks (21 × x, y, z):
    - 63 canonical 3D coordinates (rotation & scale normalized, handedness aligned)
    - 5 finger curl ratios (tip-to-wrist / mcp-to-wrist)
    - 10 pairwise fingertip distances
    - 5 finger joint flexion angles
    - 4 thumb-tip to finger MCP distances
    - 4 thumb-tip to finger PIP distances (for fist sign separation: A, E, M, N, S, T)
    - 4 finger extension cross-order vectors (for R crossed vs U/V separation)
    - 5 adjacent finger spacing angles
    - 5 tip-to-wrist 3D distances
    """
    if X_raw.ndim == 1:
        X = X_raw.reshape(1, 21, 3)
        is_single = True
    else:
        N = X_raw.shape[0]
        X = X_raw.reshape(N, 21, 3)
        is_single = False

    N = X.shape[0]
    X_norm = np.zeros_like(X)
    for i in range(N):
        X_norm[i] = canonicalize_single_hand(X[i])

    coords_flat = X_norm.reshape(N, 63)

    tips = [4, 8, 12, 16, 20]
    mcps = [2, 5, 9, 13, 17]
    pips = [3, 6, 10, 14, 18]

    # 1. Finger Curl Ratios (5)
    curls = []
    for tip, mcp in zip(tips, mcps):
        d_tip = np.linalg.norm(X_norm[:, tip, :], axis=1)
        d_mcp = np.linalg.norm(X_norm[:, mcp, :], axis=1)
        d_mcp = np.where(d_mcp > 0, d_mcp, 1.0)
        curls.append(d_tip / d_mcp)
    curls = np.column_stack(curls)

    # 2. Pairwise Fingertip Distances (10)
    pair_dists = []
    for i in range(len(tips)):
        for j in range(i + 1, len(tips)):
            d = np.linalg.norm(X_norm[:, tips[i], :] - X_norm[:, tips[j], :], axis=1)
            pair_dists.append(d)
    pair_dists = np.column_stack(pair_dists)

    # 3. Finger Joint Angles (5)
    angles = []
    for mcp, pip, tip in zip(mcps, pips, tips):
        v1 = X_norm[:, pip, :] - X_norm[:, mcp, :]
        v2 = X_norm[:, tip, :] - X_norm[:, pip, :]
        norm_v1 = np.linalg.norm(v1, axis=1, keepdims=True)
        norm_v2 = np.linalg.norm(v2, axis=1, keepdims=True)
        norm_v1 = np.where(norm_v1 > 0, norm_v1, 1.0)
        norm_v2 = np.where(norm_v2 > 0, norm_v2, 1.0)
        unit_v1 = v1 / norm_v1
        unit_v2 = v2 / norm_v2
        dot = np.sum(unit_v1 * unit_v2, axis=1)
        dot = np.clip(dot, -1.0, 1.0)
        angle = np.arccos(dot)
        angles.append(angle)
    angles = np.column_stack(angles)

    # 4. Thumb Tip to MCP Distances (4)
    thumb_mcps = []
    thumb_tip = X_norm[:, 4, :]
    for mcp in [5, 9, 13, 17]:
        d = np.linalg.norm(thumb_tip - X_norm[:, mcp, :], axis=1)
        thumb_mcps.append(d)
    thumb_mcps = np.column_stack(thumb_mcps)

    # 5. Thumb Tip to PIP Distances (4)
    thumb_pips = []
    for pip in [6, 10, 14, 18]:
        d = np.linalg.norm(thumb_tip - X_norm[:, pip, :], axis=1)
        thumb_pips.append(d)
    thumb_pips = np.column_stack(thumb_pips)

    # 6. Finger Extension Cross-Order X Distances (4)
    cross_dists = []
    for i in range(4):
        d_x = X_norm[:, tips[i], 0] - X_norm[:, tips[i + 1], 0]
        cross_dists.append(d_x)
    cross_dists = np.column_stack(cross_dists)

    # 7. Adjacent Finger Spacing Angles (5)
    spacing_angles = []
    all_tips = [4, 8, 12, 16, 20]
    for i in range(len(all_tips)):
        next_i = (i + 1) % len(all_tips)
        v1 = X_norm[:, all_tips[i], :]
        v2 = X_norm[:, all_tips[next_i], :]
        norm_v1 = np.linalg.norm(v1, axis=1, keepdims=True)
        norm_v2 = np.linalg.norm(v2, axis=1, keepdims=True)
        norm_v1 = np.where(norm_v1 > 0, norm_v1, 1.0)
        norm_v2 = np.where(norm_v2 > 0, norm_v2, 1.0)
        dot = np.sum((v1 / norm_v1) * (v2 / norm_v2), axis=1)
        dot = np.clip(dot, -1.0, 1.0)
        spacing_angles.append(np.arccos(dot))
    spacing_angles = np.column_stack(spacing_angles)

    # 8. Tip to Wrist 3D Distances (5)
    tip_wrist_dists = []
    for tip in tips:
        d = np.linalg.norm(X_norm[:, tip, :], axis=1)
        tip_wrist_dists.append(d)
    tip_wrist_dists = np.column_stack(tip_wrist_dists)

    features = np.hstack([
        coords_flat,
        curls,
        pair_dists,
        angles,
        thumb_mcps,
        thumb_pips,
        cross_dists,
        spacing_angles,
        tip_wrist_dists
    ])

    if is_single:
        return features[0]
    return features


def preprocess_landmarks(landmarks: Union[List[float], np.ndarray]) -> np.ndarray:
    """
    Normalize 63-value landmark array into an (1, 105) feature tensor ready for model.predict().
    """
    arr = np.array(landmarks, dtype=np.float32)
    feats = extract_landmark_features(arr)
    return feats.reshape(1, 105)


def preprocess_frame(frame_bgr: np.ndarray, target_size: tuple = (224, 224)) -> np.ndarray:
    """Preprocess raw BGR frame for CNN input."""
    import cv2
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(frame_rgb, target_size, interpolation=cv2.INTER_AREA)
    normalized = resized.astype(np.float32) / 255.0
    return np.expand_dims(normalized, axis=0)


