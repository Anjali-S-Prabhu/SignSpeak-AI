import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Camera,
  CameraOff,
  BarChart3,
  Pause,
  Play,
  Sliders,
  ShieldCheck,
  Cpu,
  Layers,
  Eye,
  EyeOff,
  Timer,
} from 'lucide-react'
import { useWebcam } from '@/hooks/useWebcam'
import { useMediaPipe } from '@/hooks/useMediaPipe'
import { useGestureDetection } from '@/hooks/useGestureDetection'
import { useSpeech } from '@/hooks/useSpeech'
import { useAppContext } from '@/contexts/AppContext'
import WebcamView from '@/components/WebcamView'
import GesturePanel from '@/components/GesturePanel'
import TextOutput from '@/components/TextOutput'
import VoiceControls from '@/components/VoiceControls'
import StatsPanel from '@/components/StatsPanel'
import HistoryCard from '@/components/HistoryCard'
import ErrorBanner from '@/components/ErrorBanner'

/**
 * Live Detection Dashboard — 100% Client-Side AI Engine.
 * Runs YOLOv5 ONNX object detection and MediaPipe skeletal landmarks
 * entirely in the visitor's browser.
 */
export default function DashboardPage() {
  const {
    state,
    setError,
    setInferenceEngine,
    setConfidenceThreshold,
    setCooldownSeconds,
    togglePause,
    toggleShowBoxes,
  } = useAppContext()

  const [isDetecting, setIsDetecting] = useState(false)
  const webcam = useWebcam()
  const { speakWord } = useSpeech()

  // MediaPipe hand tracker
  const handleMediaPipeResult = useCallback(() => {}, [])
  const mediapipe = useMediaPipe(webcam.videoRef, handleMediaPipeResult)

  // Client-Side Real-time Gesture Detection (YOLO 34-class ONNX + MediaPipe Animated Skeleton)
  useGestureDetection(
    webcam.videoRef,
    mediapipe.canvasRef,
    mediapipe.getLandmarkPoints,
    isDetecting && state.isCameraActive,
    speakWord,
  )

  const handleStartCamera = async () => {
    try {
      await webcam.startCamera()
      setIsDetecting(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not access webcam.')
    }
  }

  const handleStopCamera = () => {
    webcam.stopCamera()
    setIsDetecting(false)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Header & Privacy Assurance Banner */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#f8fafc',
                margin: 0,
              }}
            >
              Sign Language AI Dashboard
            </h1>
            <span
              className="badge badge-green"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
            >
              <ShieldCheck size={13} />
              100% On-Device AI
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
            Zero cloud inference • Zero API fees • Camera frames never leave this browser
          </p>
        </div>

        {/* Primary Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Pause / Resume Button */}
          {state.isCameraActive && (
            <motion.button
              id="dashboard-pause-detection"
              whileTap={{ scale: 0.95 }}
              className="btn-secondary"
              onClick={togglePause}
              style={{
                padding: '10px 16px',
                borderColor: state.isPaused ? '#facc15' : 'rgba(255,255,255,0.12)',
                color: state.isPaused ? '#fde047' : '#e2e8f0',
              }}
              title={state.isPaused ? 'Resume live AI recognition' : 'Pause live AI recognition'}
            >
              {state.isPaused ? <Play size={15} /> : <Pause size={15} />}
              {state.isPaused ? 'Resume Recognition' : 'Pause Recognition'}
            </motion.button>
          )}

          {/* Toggle Bounding Boxes */}
          {state.isCameraActive && (
            <motion.button
              id="dashboard-toggle-boxes"
              whileTap={{ scale: 0.95 }}
              className="btn-secondary"
              onClick={toggleShowBoxes}
              style={{ padding: '10px 14px' }}
              title={state.showBoxes ? 'Hide bounding boxes' : 'Show bounding boxes'}
            >
              {state.showBoxes ? <Eye size={15} /> : <EyeOff size={15} />}
              {state.showBoxes ? 'Boxes ON' : 'Boxes OFF'}
            </motion.button>
          )}

          {/* Camera Toggle */}
          {!state.isCameraActive ? (
            <motion.button
              id="dashboard-start-camera"
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
              onClick={handleStartCamera}
              disabled={webcam.isLoading}
              style={{ padding: '10px 20px' }}
            >
              <Camera size={16} />
              {webcam.isLoading ? 'Starting Camera…' : 'Start Camera'}
            </motion.button>
          ) : (
            <motion.button
              id="dashboard-stop-camera"
              whileTap={{ scale: 0.95 }}
              className="btn-secondary"
              onClick={handleStopCamera}
              style={{
                padding: '10px 20px',
                background: 'rgba(239,68,68,0.12)',
                borderColor: 'rgba(239,68,68,0.3)',
                color: '#f87171',
              }}
            >
              <CameraOff size={16} />
              Stop Camera
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Model & Threshold Controls Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Model Architecture Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={16} color="#818cf8" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
            Inference Model:
          </span>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
            <button
              id="engine-yolo-btn"
              onClick={() => setInferenceEngine('yolo')}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: state.inferenceEngine === 'yolo' ? '#6366f1' : 'transparent',
                color: state.inferenceEngine === 'yolo' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              YOLOv5 Neural Vision (ONNX)
            </button>
            <button
              id="engine-mediapipe-btn"
              onClick={() => setInferenceEngine('mediapipe')}
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: state.inferenceEngine === 'mediapipe' ? '#6366f1' : 'transparent',
                color: state.inferenceEngine === 'mediapipe' ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              MediaPipe Skeletal AI
            </button>
          </div>
        </div>

        {/* Confidence Threshold Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sliders size={15} color="#818cf8" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
            Confidence Threshold:
          </span>
          <input
            id="confidence-threshold-slider"
            type="range"
            min="20"
            max="90"
            step="5"
            value={Math.round(state.confidenceThreshold * 100)}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value) / 100)}
            style={{ width: '130px', accentColor: '#6366f1', cursor: 'pointer' }}
          />
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#38bdf8',
              minWidth: '40px',
            }}
          >
            {Math.round(state.confidenceThreshold * 100)}%
          </span>
        </div>

        {/* Word Acceptance Cooldown (3s - 5s, default 4s) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Timer size={15} color="#818cf8" />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
            Word Cooldown:
          </span>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px' }}>
            {[3, 4, 5].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setCooldownSeconds(sec)}
                style={{
                  padding: '4px 9px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: state.wordCooldownSeconds === sec ? '#6366f1' : 'transparent',
                  color: state.wordCooldownSeconds === sec ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.15s',
                }}
              >
                {sec}s
              </button>
            ))}
          </div>
          {state.isCooldownActive && (
            <span
              className="badge badge-yellow"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ⏳ Next in {state.cooldownRemaining}s
            </span>
          )}
        </div>

        {/* Supported Signs Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="#64748b" />
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {state.inferenceEngine === 'yolo'
              ? '34 Trained Signs: hello, iloveyou, thank you, no, brother, mother, father, son...'
              : 'ASL Alphabet & Hand Shapes'}
          </span>
        </div>
      </motion.div>

      {/* Error banner */}
      <ErrorBanner message={state.error} onDismiss={() => setError(null)} />

      {/* Main Grid: Left Webcam View / Right Intelligence Panels */}
      <div className="dashboard-grid">
        {/* ===== LEFT — Webcam & Live Canvas ===== */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <WebcamView
            webcam={webcam}
            canvasRef={mediapipe.canvasRef}
            fps={state.fps}
            isActive={state.isCameraActive}
            confidence={state.confidence}
          />

          {/* Stats below webcam */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <BarChart3 size={14} color="#818cf8" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Local Session Telemetry
              </span>
            </div>
            <StatsPanel />
          </div>
        </motion.div>

        {/* ===== RIGHT — Sign Output, Sentence Builder & TTS ===== */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Detected Gesture */}
          <GesturePanel
            gesture={state.currentGesture}
            confidence={state.confidence}
            predictionTime={state.predictionTime}
            modelLoaded={state.modelLoaded}
          />

          {/* Sentence Builder with Copy/Clear */}
          <TextOutput />

          {/* Native Web Speech Voice Controls */}
          <VoiceControls />

          {/* Persistent History Panel */}
          <div className="glass" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
                Saved History (LocalStorage)
              </h3>
              <span className="badge badge-blue">{state.history.length}</span>
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}
              className="no-scrollbar"
            >
              {state.history.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', padding: '24px 0', margin: 0 }}>
                  No signs recognized yet. Turn on camera to begin.
                </p>
              ) : (
                state.history.slice(0, 20).map((record, i) => (
                  <HistoryCard key={record.id} record={record} index={i} />
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
