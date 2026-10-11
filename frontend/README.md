# SignSpeak AI — Free Local In-Browser Sign Language Recognition

> **100% Client-Side AI Web Application**: Runs real-time deep learning inference directly inside your browser using **ONNX Runtime Web**, **MediaPipe**, HTML5 Web APIs, and React/Vite. **No Roboflow API keys, no backend server, no cloud fees, and 100% camera privacy.**

---

## 🌟 Key Features

- 🔒 **100% On-Device Privacy**: Camera frames are processed strictly in browser memory. No video or images ever leave your device.
- ⚡ **Zero Cloud Costs**: Powered by static client-side models (`sign_yolov5_quant.onnx` — 7.5 MB). No per-prediction charges or subscriptions.
- 🎯 **Dual AI Inference Engines**:
  - **YOLOv5 Neural Object Detection**: Direct RGB vision network predicting sign bounding boxes, confidence percentages, and class labels (`Hello`, `IloveYou`, `No`, `Please`, `Thanks`, `Yes`).
  - **MediaPipe Landmark AI**: 21-joint skeletal pose tracking with geometric gesture classification for ASL signs.
- 🎛️ **Full Detection Controls**:
  - Live webcam preview with mirroring support.
  - Real-time bounding box overlay with confidence badges.
  - Confidence threshold slider (20% – 90%).
  - Pause and resume AI recognition on demand.
  - Duplicate suppression & temporal smoothing to prevent word flickering.
- 🗣️ **Accessible Speech & Sentence Builder**:
  - Auto-accumulates recognized signs into readable sentences.
  - Native browser Text-to-Speech (Web Speech API `SpeechSynthesis`) with Speak and Stop Speech controls.
  - Copy Text to clipboard with visual confirmation.
  - Space, Backspace, and Clear Text controls.
- 📊 **Persistent History**: Session predictions are saved locally in browser `localStorage` with JSON export support.

---

## 🏗️ Technical Architecture

```text
Visitor's Browser (Chrome, Edge, Firefox, Brave, Safari)
├── HTML5 MediaDevices API ────> Webcam Video Stream (Local Only)
├── HTML5 Canvas Buffer ───────> 640x640 RGB Preprocessing & Normalization
├── ONNX Runtime Web (WASM) ───> YOLOv5 Quantized Neural Network (7.5 MB)
├── Client-Side Post-Processing > Non-Maximum Suppression (NMS) & Threshold Filter
├── State Engine (React Context)> Debounce Filter & Sentence Accumulator
└── Web Speech API ────────────> Native Voice Synthesis (Offline Audio)
```

---

## 🚀 Running Locally

### 1. Prerequisites
- Node.js 18+ (tested with Node 20 / 22)
- npm 9+

### 2. Install & Start Development Server
```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5174`** in your browser. Grant camera permission when prompted.

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🌐 Deploying to Vercel (100% Free Static Hosting)

The application is fully pre-configured for Vercel static deployment via `frontend/vercel.json`.

### Option A: Via GitHub (Recommended)
1. Push your repository to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set the **Root Directory** to `Handgesture-main/frontend` (or `frontend`).
5. Vercel will automatically detect **Vite**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Click **Deploy**. Your site will be live on `https://your-project.vercel.app` in under 1 minute!

### Option B: Via Vercel CLI
```bash
cd frontend
npx vercel
```

---

## 🏷️ Supported Signs & Classes

### YOLOv5 Neural Vision Model:
- `Hello` — Open palm greeting
- `IloveYou` — ASL "I Love You" sign (Thumb, Index, Pinky extended)
- `No` — Head/finger refusal sign
- `Please` — Flat hand circular chest gesture
- `Thanks` — Hand to chin outward gesture / thumbs up
- `Yes` — Fist agreement gesture

### MediaPipe Skeletal Engine:
- ASL Alphabet shapes (A, B, D, I, L, V, Y, OK/F) and conversational gestures.

---

## 🔒 Security & Privacy Notice

- **Zero Cloud API Keys**: This application requires NO API keys to operate.
- **Revocation Notice**: Any historical Roboflow API keys found in older configurations have been scrubbed.
- **Offline Capable**: Once the static web assets (HTML, JS, and ONNX weights) are downloaded by your browser, recognition operates completely offline.
