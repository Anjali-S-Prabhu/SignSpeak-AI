import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Cpu, PauseCircle } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'

interface GesturePanelProps {
  gesture: string
  confidence: number
  predictionTime: number
  modelLoaded: boolean
}

/**
 * Displays the currently detected gesture with confidence bar,
 * prediction latency, and active local AI engine badge.
 */
export default function GesturePanel({ gesture, confidence, predictionTime, modelLoaded }: GesturePanelProps) {
  const { state } = useAppContext()
  const pct = Math.round(confidence * 100)

  return (
    <div className="glass" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#818cf8" />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
            Recognized Sign
          </h3>
        </div>

        {/* AI Engine badge */}
        <span
          className="badge badge-blue"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem' }}
        >
          <Cpu size={12} />
          {state.inferenceEngine === 'yolo' ? 'YOLOv5 ONNX Web' : 'MediaPipe Skeletal AI'}
        </span>
      </div>

      {/* Paused state notice */}
      {state.isPaused && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          background: 'rgba(234,179,8,0.12)',
          border: '1px solid rgba(234,179,8,0.3)',
          borderRadius: '8px',
          marginBottom: '14px',
        }}>
          <PauseCircle size={15} color="#eab308" />
          <span style={{ fontSize: '0.8rem', color: '#fde047', fontWeight: 500 }}>
            Inference Paused — click Resume to continue
          </span>
        </div>
      )}

      {/* Sign display */}
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '108px', marginBottom: '14px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: '12px',
          position: 'relative',
          padding: '12px',
        }}
      >
        <AnimatePresence mode="wait">
          {gesture ? (
            <motion.div
              key={gesture}
              initial={{ scale: 0.7, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              style={{ textAlign: 'center' }}
            >
              <p
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '2.6rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {gesture}
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}
            >
              {state.isCameraActive ? 'Position hand in camera frame…' : 'Start camera to begin detection'}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Word acceptance & cooldown status pill */}
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {state.isCooldownActive ? (
            <span
              className="badge badge-yellow"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
              }}
            >
              ⏳ Next word in {state.cooldownRemaining}s
            </span>
          ) : (
            <span
              className="badge badge-green"
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 9px',
              }}
            >
              ● Ready for next word
            </span>
          )}

          {state.acceptedGesture && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                background: 'rgba(255,255,255,0.05)',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              Accepted: <strong style={{ color: '#38bdf8' }}>{state.acceptedGesture}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Stability Confirmation Meter */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 500 }}>
            Sign Stability (3 Frames)
          </span>
          <span style={{ fontSize: '0.73rem', color: state.stabilityCount >= 3 ? '#4ade80' : '#818cf8', fontWeight: 600 }}>
            {state.stabilityCount}/3 frames
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: state.stabilityCount >= 3 ? '#4ade80' : 'linear-gradient(90deg, #6366f1, #38bdf8)',
              borderRadius: '4px',
            }}
            animate={{ width: `${(state.stabilityCount / 3) * 100}%` }}
            transition={{ duration: 0.15 }}
          />
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 500 }}>Model Confidence</span>
          <span style={{ fontSize: '0.73rem', color: pct > 80 ? '#4ade80' : pct > 50 ? '#fbbf24' : '#f87171', fontWeight: 700 }}>
            {pct}%
          </span>
        </div>
        <div className="confidence-bar">
          <motion.div
            className="confidence-bar-fill"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Latency & Hardware Mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.73rem', color: '#64748b' }}>Inference Latency</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#818cf8' }}>
          {predictionTime > 0 ? `${predictionTime} ms` : 'Standby'}
        </span>
      </div>
    </div>
  )
}
