import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, CameraOff, RefreshCw } from 'lucide-react'
import type { WebcamState } from '@/hooks/useWebcam'
import { useAppContext } from '@/contexts/AppContext'

interface WebcamViewProps {
  webcam: WebcamState
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  fps: number
  isActive: boolean
  confidence: number
}

/**
 * Webcam preview with canvas overlay for MediaPipe landmarks.
 * Shows FPS badge, camera active indicator, and confidence bar.
 */
export default function WebcamView({ webcam, canvasRef, fps, isActive, confidence }: WebcamViewProps) {
  const { state } = useAppContext()
  const localVideoRef = webcam.videoRef as React.RefObject<HTMLVideoElement>

  return (
    <div className="glass" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isActive ? <span className="pulse-dot" /> : (
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#475569', display: 'inline-block' }} />
          )}
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? '#4ade80' : '#64748b' }}>
            {isActive ? 'Camera Active' : 'Camera Off'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Word Cooldown / Ready Badge */}
          {isActive && (
            state.isCooldownActive ? (
              <span className="badge badge-yellow" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                ⏳ Next word in {state.cooldownRemaining}s
              </span>
            ) : (
              <span className="badge badge-green" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                ● Ready
              </span>
            )
          )}

          {/* FPS Badge */}
          <span className="badge badge-blue">
            {fps} FPS
          </span>

          {/* Confidence Badge */}
          <span className={`badge ${confidence > 0.8 ? 'badge-green' : confidence > 0.5 ? 'badge-yellow' : 'badge-red'}`}>
            {Math.round(confidence * 100)}% conf
          </span>

          {/* Switch camera */}
          {webcam.devices.length > 1 && (
            <button
              id="camera-switch-btn"
              className="btn-icon"
              title="Switch camera"
              onClick={() => {
                const nextDevice = webcam.devices.find(d => d.deviceId !== webcam.activeDeviceId)
                if (nextDevice) webcam.switchCamera(nextDevice.deviceId)
              }}
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Video + Canvas */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', minHeight: '320px' }}>
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: isActive ? 'block' : 'none',
          }}
        />

        {/* Canvas overlay for landmarks */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            display: isActive ? 'block' : 'none',
          }}
        />

        {/* Placeholder when camera is off */}
        {!isActive && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '16px', color: '#475569',
          }}>
            <CameraOff size={48} strokeWidth={1} />
            <p style={{ fontSize: '0.9rem' }}>Camera is off</p>
          </div>
        )}

        {/* Loading overlay */}
        {webcam.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(5,8,22,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#818cf8', fontSize: '0.875rem' }}>Starting camera…</p>
            </div>
          </motion.div>
        )}

        {/* Corner decorators */}
        {isActive && (
          <>
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
              <div key={pos} style={{
                position: 'absolute',
                ...(pos.includes('top') ? { top: '12px' } : { bottom: '12px' }),
                ...(pos.includes('left') ? { left: '12px' } : { right: '12px' }),
                width: '20px', height: '20px',
                borderTop: pos.includes('top') ? '2px solid rgba(99,102,241,0.6)' : 'none',
                borderBottom: pos.includes('bottom') ? '2px solid rgba(99,102,241,0.6)' : 'none',
                borderLeft: pos.includes('left') ? '2px solid rgba(99,102,241,0.6)' : 'none',
                borderRight: pos.includes('right') ? '2px solid rgba(99,102,241,0.6)' : 'none',
              }} />
            ))}
          </>
        )}
      </div>

      {/* Error */}
      {webcam.error && (
        <div style={{ padding: '12px 18px', background: 'rgba(239,68,68,0.1)', borderTop: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ color: '#f87171', fontSize: '0.8rem' }}>
            <Camera size={13} style={{ display: 'inline', marginRight: 6 }} />
            {webcam.error}
          </p>
        </div>
      )}
    </div>
  )
}
