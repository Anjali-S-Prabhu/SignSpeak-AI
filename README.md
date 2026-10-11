# SignSpeak AI 🤟 — Free Local In-Browser Sign Language Recognition

> **Real-Time Hand Gesture & Sign Language Translation Web Application** powered by **100% Client-Side AI (ONNX Runtime Web & MediaPipe)**, HTML5 Web APIs, and React/Vite.

**100% Free • Zero Roboflow API Keys • Zero Cloud Fees • 100% On-Device Camera Privacy**

---

## ⚡ What Changed (Migration Summary)

Previous architecture relied on cloud-hosted Roboflow inference endpoints (`POST https://detect.roboflow.com/...`), which required exposing API keys, incurred per-prediction cloud limits, and transmitted live webcam frames over the internet.

### Upgraded Free Static Architecture:
1. **100% Client-Side Inference**: Neural network inference runs directly inside the visitor's web browser using **ONNX Runtime Web** (WebAssembly / WebGL).
2. **Zero Cloud API Keys**: No Roboflow API key required in source code or production deployments.
3. **Privacy Preserved**: Camera video frames never leave the visitor's device.
4. **Vercel Static Hosting Ready**: No permanently running Python server needed in production. Deploys for free on Vercel or any static host.
5. **Real Trained Weights**: Converted PyTorch weights (`best.pt`) to optimized ONNX models (`sign_yolov5_quant.onnx`, 7.5 MB) packaged with the static assets.

---

## 🎯 Model Architecture & Evaluation Findings

| Parameter | Roboflow Model (Cloud NAS) | Converted Local YOLOv5 (Browser ONNX) |
|---|---|---|
| **Model ID** | `hand-gestures-dvfa7-k9wqt-1-rfdetr-nas-pecoret-t1--f68626` | `sign_yolov5_quant.onnx` / `sign_yolov5.onnx` |
| **Architecture** | RF-DETR NAS | Custom YOLOv5s (146 layers, 7.2M params) |
| **Download Status** | **Restricted by Roboflow** (Cloud API only) | **Full Offline Model Assets (7.5 MB)** |
| **Inference Runtime** | Remote Cloud GPU Server | In-Browser WebAssembly / WebGL |
| **Prediction Cost** | Cloud billing per API call | **$0.00 (100% Free Forever)** |
| **Supported Signs** | Cloud Action Gestures | `Hello`, `IloveYou`, `No`, `Please`, `Thanks`, `Yes` + ASL Alphabet |

---

## 🛠️ Project Structure

```text
Handgesture-main/
├── frontend/                          # Primary Production Web Application
│   ├── src/
│   │   ├── components/                # React UI Components (Webcam, Gestures, Text, Voice)
│   │   ├── services/
│   │   │   ├── yoloInference.ts       # ONNX Runtime Web YOLOv5 client-side inference engine
│   │   │   └── landmarkInference.ts   # MediaPipe landmark gesture classifier
│   │   ├── hooks/                     # Custom React hooks (Webcam, Gestures, Speech)
│   │   └── contexts/AppContext.tsx    # State management with LocalStorage persistence
│   ├── public/models/                 # Bundled static ONNX neural network weights (7.5 MB)
│   ├── vercel.json                    # Vercel static hosting and SPA routing config
│   └── vite.config.ts                 # Optimized Vite configuration
├── models/                            # Model checkpoints and conversion utilities
│   ├── best.pt                        # Original PyTorch trained weights
│   ├── export_onnx.py                 # Conversion pipeline to ONNX
│   ├── sign_yolov5_single.onnx        # Full precision ONNX model (29.1 MB)
│   └── sign_yolov5_quant.onnx         # INT8 quantized fast browser model (7.5 MB)
└── backend/                           # Historical Python training pipeline & utilities
```

---

## 🚀 Quickstart Guide

### 1. Run Development Server
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5174`** in your browser.

### 2. Build for Production
```bash
cd frontend
npm run build
npm run preview
```

### 3. Deploy to Vercel (Free Static Tier)
1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository.
4. Set **Root Directory** to `Handgesture-main/frontend` (or `frontend`).
5. Click **Deploy**. Vercel will automatically run `npm run build` and publish your site!

---

## 🔒 Security & Privacy Audit

1. **Exposed Credentials Scrubbed**: The exposed Roboflow API key previously in `config/api_credentials.env` and `app.js` has been removed.
2. **Key Revocation Recommendation**: If you previously used the API key `rf_MbTALoBJDTUuvIv75z6Sh1fTrsL2`, please revoke it on your [Roboflow Account Settings](https://app.roboflow.com) page.
3. **No Network Telemetry**: Prediction requests and webcam frames execute entirely within the visitor's local browser sandbox.