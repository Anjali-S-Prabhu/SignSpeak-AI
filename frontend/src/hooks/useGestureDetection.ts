import { useRef, useCallback, useEffect } from 'react'
import { useAppContext } from '@/contexts/AppContext'
import {
  initYoloModel,
  runYoloInference,
  drawDetections,
} from '@/services/yoloInference'
import { classifyLandmarks } from '@/services/landmarkInference'
import type { LandmarkPoint } from '@/hooks/useMediaPipe'

const DETECTION_INTERVAL_MS = 66 // ~15 FPS target for smooth real-time on-device inference
const REQUIRED_STABLE_FRAMES = 5 // Consecutive inference frames required to accept a sign (~330ms)

// MediaPipe hand skeleton connections (palm + fingers)
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
]

/**
 * Draws a polished, futuristic neon hand skeleton overlay with animated pulsating fingertip keypoints.
 * Accurately aligned with the mirrored webcam canvas.
 */
function drawAnimatedHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[],
  w: number,
  h: number,
  isMirrored = true,
) {
  const pts = landmarks.map((l) => ({
    x: (isMirrored ? 1 - l.x : l.x) * w,
    y: l.y * h,
  }))

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 1. Neon glowing bone lines - Outer Cyan Glow
  ctx.shadowColor = '#06b6d4'
  ctx.shadowBlur = 12
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.75)'
  ctx.lineWidth = 3
  ctx.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    if (pts[a] && pts[b]) {
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
    }
  }
  ctx.stroke()

  // 2. Inner crisp neon beam
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.95)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    if (pts[a] && pts[b]) {
      ctx.moveTo(pts[a].x, pts[a].y)
      ctx.lineTo(pts[b].x, pts[b].y)
    }
  }
  ctx.stroke()

  // 3. Keypoints & animated pulsing fingertip halos
  const fingertipIndices = [4, 8, 12, 16, 20]
  const pulsePhase = (Date.now() % 1600) / 1600
  const pulseRadius = 5 + Math.sin(pulsePhase * Math.PI * 2) * 2.5
  const pulseAlpha = 0.35 + Math.cos(pulsePhase * Math.PI * 2) * 0.25

  pts.forEach((pt, i) => {
    if (fingertipIndices.includes(i)) {
      // Outer animated pulsating halo
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pulseRadius + 3.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(168, 85, 247, ${pulseAlpha})`
      ctx.fill()

      // Mid bright neon ring
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, pulseRadius, 0, Math.PI * 2)
      ctx.strokeStyle = '#c084fc'
      ctx.lineWidth = 2
      ctx.stroke()

      // Center bright core dot
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    } else {
      // Joint keypoint node
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, i === 0 ? 4.5 : 2.8, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? '#38bdf8' : '#818cf8'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  })

  ctx.restore()
}

export function useGestureDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  getLandmarks: () => LandmarkPoint[] | null,
  isActive: boolean,
  speakWord?: (word: string) => void,
) {
  const { state, setGesture, dispatch, appendToSentence, addSpace, deleteLastChar, addHistory } = useAppContext()
  const isProcessingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // FPS tracking
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(Date.now())

  // Cooldown timestamp: timestamp (ms) until when new words are blocked from acceptance
  const cooldownUntilRef = useRef<number>(0)

  // Stability tracking
  const stableCandidateRef = useRef<string>('')
  const stableFrameCountRef = useRef<number>(0)
  const consecutiveNoDetectionsRef = useRef<number>(0)

  const stateRef = useRef(state)
  stateRef.current = state

  const speakWordRef = useRef(speakWord)
  speakWordRef.current = speakWord

  const getLandmarksRef = useRef(getLandmarks)
  getLandmarksRef.current = getLandmarks

  // Model initialization on mount
  useEffect(() => {
    let mounted = true
    initYoloModel().then((loaded) => {
      if (mounted) {
        dispatch({ type: 'SET_MODEL_LOADED', loaded })
      }
    })
    return () => {
      mounted = false
    }
  }, [dispatch])

  const detect = useCallback(async () => {
    const currentState = stateRef.current
    if (isProcessingRef.current || currentState.isPaused) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    isProcessingRef.current = true

    // FPS calculation
    frameCountRef.current++
    const now = Date.now()
    const elapsed = now - lastFpsTimeRef.current
    if (elapsed >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / elapsed)
      dispatch({ type: 'SET_FPS', fps })
      frameCountRef.current = 0
      lastFpsTimeRef.current = now
    }

    // Update cooldown status for UI countdown
    if (now < cooldownUntilRef.current) {
      const remainingSec = Math.ceil((cooldownUntilRef.current - now) / 1000)
      dispatch({ type: 'SET_COOLDOWN_STATUS', remaining: remainingSec, active: true })
    } else if (currentState.isCooldownActive) {
      dispatch({ type: 'SET_COOLDOWN_STATUS', remaining: 0, active: false })
    }

    try {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }

      if (currentState.inferenceEngine === 'yolo') {
        // --- MODE 1: Client-Side YOLO 34-Class Object Detection (ONNX Web) ---
        const result = await runYoloInference(video, currentState.confidenceThreshold)

        // Draw visual overlays on canvas
        if (ctx && currentState.showBoxes) {
          // 1. Draw animated neon MediaPipe hand landmarks if hand is in frame
          const landmarks = getLandmarksRef.current ? getLandmarksRef.current() : null
          if (landmarks && landmarks.length >= 21) {
            drawAnimatedHandSkeleton(ctx, landmarks, canvas.width, canvas.height, true)
          }

          // 2. Draw trained YOLO detection bounding boxes & class tags
          if (result.detections.length > 0) {
            drawDetections(ctx, result.detections, canvas.width, canvas.height, true)
          }
        }

        const topDet = result.topDetection
        if (topDet && topDet.confidence >= currentState.confidenceThreshold) {
          consecutiveNoDetectionsRef.current = 0
          const rawLabel = topDet.label

          // Keep live prediction and confidence display updating continuously
          setGesture(rawLabel, topDet.confidence, result.inferenceTimeMs)

          // Stability filtering
          if (rawLabel.toLowerCase() === 'nothing') {
            // Resting hand / 'nothing' gesture — reset stability
            stableCandidateRef.current = ''
            stableFrameCountRef.current = 0
            dispatch({ type: 'SET_STABILITY_COUNT', count: 0 })
          } else if (rawLabel === stableCandidateRef.current) {
            stableFrameCountRef.current++
            dispatch({
              type: 'SET_STABILITY_COUNT',
              count: Math.min(REQUIRED_STABLE_FRAMES, stableFrameCountRef.current),
            })
          } else {
            // Prediction changed! Reset stability counter
            stableCandidateRef.current = rawLabel
            stableFrameCountRef.current = 1
            dispatch({ type: 'SET_STABILITY_COUNT', count: 1 })
          }

          // If stable threshold is met, check if cooldown allows acceptance
          if (stableFrameCountRef.current >= REQUIRED_STABLE_FRAMES) {
            if (now >= cooldownUntilRef.current) {
              // Word is officially accepted!
              const acceptedWord = stableCandidateRef.current
              const cooldownMs = (currentState.wordCooldownSeconds || 4) * 1000
              cooldownUntilRef.current = now + cooldownMs

              // Set cooldown state immediately
              dispatch({
                type: 'SET_COOLDOWN_STATUS',
                remaining: currentState.wordCooldownSeconds || 4,
                active: true,
              })
              dispatch({ type: 'SET_ACCEPTED_GESTURE', gesture: acceptedWord })

              // Append word to sentence
              const normalized = acceptedWord.trim().toLowerCase()
              if (normalized === 'space') {
                addSpace()
              } else if (normalized === 'delete') {
                deleteLastChar()
              } else {
                appendToSentence(acceptedWord + ' ')
              }

              // Speak newly accepted word exactly once
              if (speakWordRef.current) {
                speakWordRef.current(acceptedWord)
              }

              // Record in history
              addHistory({
                gesture: acceptedWord,
                confidence: topDet.confidence,
                timestamp: new Date().toISOString(),
                sentence: currentState.sentence + acceptedWord + ' ',
                engine: 'YOLOv5 ONNX Web',
              })

              // Reset stability counter after word has been accepted
              stableFrameCountRef.current = 0
              dispatch({ type: 'SET_STABILITY_COUNT', count: 0 })
            }
          }
        } else {
          // Confidence dropped below threshold or no detection in frame
          stableCandidateRef.current = ''
          stableFrameCountRef.current = 0
          dispatch({ type: 'SET_STABILITY_COUNT', count: 0 })

          consecutiveNoDetectionsRef.current++
          if (consecutiveNoDetectionsRef.current >= 2) {
            if (currentState.currentGesture !== '') {
              setGesture('', 0, result.inferenceTimeMs)
            }
          }
        }
      } else {
        // --- MODE 2: Client-Side MediaPipe Landmark Classification ---
        const landmarks = getLandmarksRef.current ? getLandmarksRef.current() : null
        if (ctx && currentState.showBoxes && landmarks && landmarks.length >= 21) {
          drawAnimatedHandSkeleton(ctx, landmarks, canvas.width, canvas.height, true)
        }

        if (landmarks && landmarks.length >= 21) {
          const t0 = performance.now()
          const { gesture, confidence } = classifyLandmarks(landmarks)
          const predTime = Math.round(performance.now() - t0)

          if (gesture && confidence >= currentState.confidenceThreshold) {
            consecutiveNoDetectionsRef.current = 0
            setGesture(gesture, confidence, predTime)

            if (gesture === stableCandidateRef.current) {
              stableFrameCountRef.current++
              dispatch({
                type: 'SET_STABILITY_COUNT',
                count: Math.min(REQUIRED_STABLE_FRAMES, stableFrameCountRef.current),
              })
            } else {
              stableCandidateRef.current = gesture
              stableFrameCountRef.current = 1
              dispatch({ type: 'SET_STABILITY_COUNT', count: 1 })
            }

            if (stableFrameCountRef.current >= REQUIRED_STABLE_FRAMES) {
              if (now >= cooldownUntilRef.current) {
                const cooldownMs = (currentState.wordCooldownSeconds || 4) * 1000
                cooldownUntilRef.current = now + cooldownMs

                dispatch({
                  type: 'SET_COOLDOWN_STATUS',
                  remaining: currentState.wordCooldownSeconds || 4,
                  active: true,
                })
                dispatch({ type: 'SET_ACCEPTED_GESTURE', gesture })

                if (gesture === 'Space') {
                  addSpace()
                } else if (gesture === 'Delete') {
                  deleteLastChar()
                } else {
                  appendToSentence(gesture + ' ')
                }

                if (speakWordRef.current) {
                  speakWordRef.current(gesture)
                }

                stableFrameCountRef.current = 0
                dispatch({ type: 'SET_STABILITY_COUNT', count: 0 })
              }
            }
          } else {
            stableCandidateRef.current = ''
            stableFrameCountRef.current = 0
            dispatch({ type: 'SET_STABILITY_COUNT', count: 0 })
            consecutiveNoDetectionsRef.current++
            if (consecutiveNoDetectionsRef.current >= 2 && currentState.currentGesture !== '') {
              setGesture('', 0, predTime)
            }
          }
        } else {
          stableCandidateRef.current = ''
          stableFrameCountRef.current = 0
          dispatch({ type: 'SET_STABILITY_COUNT', count: 0 })
          consecutiveNoDetectionsRef.current++
          if (consecutiveNoDetectionsRef.current >= 2 && currentState.currentGesture !== '') {
            setGesture('', 0, 0)
          }
        }
      }
    } catch (err) {
      console.error('[Gesture Detection Loop Error]', err)
    } finally {
      isProcessingRef.current = false
    }
  }, [
    videoRef,
    canvasRef,
    setGesture,
    dispatch,
    appendToSentence,
    addSpace,
    deleteLastChar,
    addHistory,
  ])

  useEffect(() => {
    let active = isActive

    const scheduleNext = () => {
      if (!active) return
      detect().finally(() => {
        if (active) {
          timerRef.current = setTimeout(scheduleNext, DETECTION_INTERVAL_MS)
        }
      })
    }

    if (isActive) {
      scheduleNext()
    } else {
      if (timerRef.current) clearTimeout(timerRef.current)
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      stableCandidateRef.current = ''
      stableFrameCountRef.current = 0
      consecutiveNoDetectionsRef.current = 0
    }

    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isActive, detect, canvasRef])
}
