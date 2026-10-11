import { useRef, useCallback, useEffect, useState } from 'react'

export interface LandmarkPoint {
  x: number
  y: number
  z: number
}

export interface HandResult {
  landmarks: LandmarkPoint[][]
  worldLandmarks: LandmarkPoint[][]
  handedness: Array<{ label: string; score: number }>
}

export interface MediaPipeState {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isReady: boolean
  lastResult: HandResult | null
  getFlatLandmarks: () => number[] | null
  getLandmarkPoints: () => LandmarkPoint[] | null
}

// MediaPipe connection pairs for hand skeleton
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],             // Palm
]

/**
 * MediaPipe Hands integration hook.
 * Loads the WASM/JS model via CDN and runs inference on each video frame.
 * Draws landmarks, connections, and bounding box on an overlay canvas.
 */
export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onResult?: (result: HandResult) => void,
): MediaPipeState {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handsRef = useRef<unknown>(null)
  const animFrameRef = useRef<number>(0)
  const [isReady, setIsReady] = useState(false)
  const [lastResult, setLastResult] = useState<HandResult | null>(null)
  const isRunning = useRef(false)

  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: LandmarkPoint[], w: number, h: number) => {
    // Draw connections
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)'
    ctx.lineWidth = 2
    for (const [a, b] of HAND_CONNECTIONS) {
      const lA = landmarks[a]
      const lB = landmarks[b]
      ctx.beginPath()
      ctx.moveTo(lA.x * w, lA.y * h)
      ctx.lineTo(lB.x * w, lB.y * h)
      ctx.stroke()
    }

    // Draw landmark dots
    landmarks.forEach((lm, i) => {
      const x = lm.x * w
      const y = lm.y * h
      // Fingertips are 4, 8, 12, 16, 20
      const isTip = [4, 8, 12, 16, 20].includes(i)
      ctx.beginPath()
      ctx.arc(x, y, isTip ? 6 : 4, 0, Math.PI * 2)
      ctx.fillStyle = isTip ? 'rgba(139, 92, 246, 0.9)' : 'rgba(99, 102, 241, 0.7)'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }, [])

  const drawBoundingBox = useCallback((ctx: CanvasRenderingContext2D, landmarks: LandmarkPoint[], w: number, h: number) => {
    const xs = landmarks.map((l) => l.x * w)
    const ys = landmarks.map((l) => l.y * h)
    const minX = Math.min(...xs) - 20
    const minY = Math.min(...ys) - 20
    const maxX = Math.max(...xs) + 20
    const maxY = Math.max(...ys) + 20

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
    ctx.setLineDash([])
  }, [])

  // Initialize MediaPipe Hands via dynamic script load
  useEffect(() => {
    let cancelled = false

    const loadMediaPipe = async () => {
      if (typeof window === 'undefined') return

      // Load MediaPipe via CDN if not already loaded
      if (!(window as unknown as Record<string, unknown>)['Hands']) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
          script.crossOrigin = 'anonymous'
          script.onload = () => resolve()
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      if (cancelled) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HandsClass = (window as any).Hands
      if (!HandsClass) return

      const hands = new HandsClass({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hands.onResults((results: any) => {
        if (results.multiHandLandmarks?.length > 0) {
          const handResult: HandResult = {
            landmarks: results.multiHandLandmarks,
            worldLandmarks: results.multiHandWorldLandmarks ?? [],
            handedness: results.multiHandedness?.map((h: { label: string; score: number }) => ({
              label: h.label,
              score: h.score,
            })) ?? [],
          }
          setLastResult(handResult)
          onResult?.(handResult)
        } else {
          setLastResult(null)
        }
      })

      await hands.initialize()
      handsRef.current = hands
      if (!cancelled) setIsReady(true)
    }

    loadMediaPipe().catch((e) => console.error('[MediaPipe] Load error:', e))

    return () => {
      cancelled = true
      isRunning.current = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [videoRef, drawLandmarks, drawBoundingBox, onResult])

  // Detection loop
  useEffect(() => {
    if (!isReady) return

    isRunning.current = true

    const loop = async () => {
      if (!isRunning.current) return
      const video = videoRef.current
      const hands = handsRef.current as { send: (opts: { image: HTMLVideoElement }) => Promise<void> } | null
      if (video && hands && video.readyState >= 2) {
        const canvas = canvasRef.current
        if (canvas) {
          canvas.width = video.videoWidth || 640
          canvas.height = video.videoHeight || 480
        }
        await hands.send({ image: video })
      }
      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      isRunning.current = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [isReady, videoRef])

  /** Returns a flat array of 63 values (21 landmarks × x, y, z).
   *  Matches EXACTLY the extract_landmarks.py training pipeline and backend preprocessor.py:
   *  - Uses mirrored x (1 - lm.x) so landmark spatial orientation matches the mirrored webcam display feed and Kaggle reference gestures.
   */
  const getFlatLandmarks = useCallback((): number[] | null => {
    if (!lastResult || lastResult.landmarks.length === 0) return null

    return lastResult.landmarks[0].flatMap((lm) => [1 - lm.x, lm.y, lm.z])
  }, [lastResult])

  const getLandmarkPoints = useCallback((): LandmarkPoint[] | null => {
    if (!lastResult || lastResult.landmarks.length === 0) return null
    return lastResult.landmarks[0]
  }, [lastResult])

  return { canvasRef, isReady, lastResult, getFlatLandmarks, getLandmarkPoints }
}

