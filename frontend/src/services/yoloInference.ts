import * as ort from 'onnxruntime-web'

// Configure ONNX Runtime Web WASM binaries path
// Use matching 1.30.0 CDN distribution
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/'
ort.env.wasm.numThreads = 1

/**
 * 34 Gesture Classes strictly matching dataset/data_clean.yaml
 */
export const YOLO_SIGN_CLASSES = [
  'brother',
  'call',
  'daughter',
  'father',
  'food',
  'good',
  'grand',
  'hello',
  'here',
  'how',
  'iloveyou',
  'love',
  'morning',
  'mother',
  'night',
  'no',
  'nothing',
  'one',
  'peace',
  'ready',
  'run',
  'sister',
  'small',
  'son',
  'sorry',
  'stop',
  'thank you',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'you',
] as const

export type YoloSignClass = typeof YOLO_SIGN_CLASSES[number]

export interface DetectionBox {
  x: number      // normalized 0..1 (top-left x)
  y: number      // normalized 0..1 (top-left y)
  width: number  // normalized 0..1
  height: number // normalized 0..1
  classIndex: number
  label: string
  confidence: number
}

export interface YoloInferenceResult {
  detections: DetectionBox[]
  topDetection: DetectionBox | null
  inferenceTimeMs: number
}

let session: ort.InferenceSession | null = null
let isInitializing = false
let initError: Error | null = null
const MODEL_PATH = '/models/sign_gestures_34cls.onnx'
export const MODEL_INPUT_SIZE = 416

// Offscreen canvas reuse for high-performance frame capture and letterboxing
let offscreenCanvas: HTMLCanvasElement | null = null
let offscreenCtx: CanvasRenderingContext2D | null = null

/**
 * Initializes the ONNX inference session in the browser.
 * Loads strictly the 34-class YOLO ONNX model hosted statically in public/models/.
 * Never falls back to legacy 6-class models.
 */
export async function initYoloModel(): Promise<boolean> {
  if (session) return true
  if (isInitializing) return false

  isInitializing = true
  initError = null

  try {
    console.log(`[YOLO Web] Initializing 34-class gesture model from: ${MODEL_PATH}`)

    // Create session strictly for the 34-class model
    const loadedSession = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })

    const inputName = loadedSession.inputNames[0] || 'images'
    const outputName = loadedSession.outputNames[0] || 'output0'

    console.log(`[YOLO Web] 34-Class Model Loaded Successfully!`)
    console.log(`[YOLO Web] Input: "${inputName}", Output: "${outputName}"`)
    console.log(`[YOLO Web] Class Count: ${YOLO_SIGN_CLASSES.length} classes`)

    session = loadedSession
    isInitializing = false
    return true
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    initError = new Error(`Failed to load 34-class model (${MODEL_PATH}): ${errorObj.message}`)
    console.error('[YOLO Web] Model initialization failed:', initError)
    isInitializing = false
    return false
  }
}

export function isYoloModelLoaded(): boolean {
  return session !== null
}

export function getActiveModelPath(): string {
  return MODEL_PATH
}

export function getYoloInitError(): string | null {
  return initError ? initError.message : null
}

/**
 * Runs client-side YOLO object detection on the HTML5 video or canvas element.
 * Applies letterbox preprocessing to maintain native aspect ratio without distortion.
 * Decodes the [1, 38, 3549] output tensor directly with Non-Maximum Suppression.
 */
export async function runYoloInference(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  confidenceThreshold = 0.35,
  iouThreshold = 0.45,
): Promise<YoloInferenceResult> {
  const tStart = performance.now()

  if (!session) {
    const ready = await initYoloModel()
    if (!ready || !session) {
      return { detections: [], topDetection: null, inferenceTimeMs: 0 }
    }
  }

  // Determine source dimensions
  let srcWidth = 0
  let srcHeight = 0
  if (source instanceof HTMLVideoElement) {
    srcWidth = source.videoWidth
    srcHeight = source.videoHeight
  } else if (source instanceof HTMLImageElement) {
    srcWidth = source.naturalWidth || source.width
    srcHeight = source.naturalHeight || source.height
  } else if (source instanceof HTMLCanvasElement) {
    srcWidth = source.width
    srcHeight = source.height
  }

  if (!srcWidth || !srcHeight) {
    return { detections: [], topDetection: null, inferenceTimeMs: 0 }
  }

  // Set up offscreen buffer matching model input size (416x416)
  if (!offscreenCanvas || offscreenCanvas.width !== MODEL_INPUT_SIZE) {
    offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = MODEL_INPUT_SIZE
    offscreenCanvas.height = MODEL_INPUT_SIZE
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })
  }

  if (!offscreenCtx) {
    return { detections: [], topDetection: null, inferenceTimeMs: 0 }
  }

  // Letterbox scaling: preserve video aspect ratio and pad borders with RGB(114, 114, 114)
  const scale = Math.min(MODEL_INPUT_SIZE / srcWidth, MODEL_INPUT_SIZE / srcHeight)
  const scaledW = Math.round(srcWidth * scale)
  const scaledH = Math.round(srcHeight * scale)
  const padX = (MODEL_INPUT_SIZE - scaledW) / 2
  const padY = (MODEL_INPUT_SIZE - scaledH) / 2

  // Neutral gray background padding (standard YOLO letterbox pad color)
  offscreenCtx.fillStyle = '#727272'
  offscreenCtx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
  offscreenCtx.drawImage(source, padX, padY, scaledW, scaledH)

  const imageData = offscreenCtx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
  const { data } = imageData

  // Convert RGBA -> Normalized Float32 NCHW Tensor [1, 3, 416, 416]
  const totalPixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE
  const float32Array = new Float32Array(3 * totalPixels)
  const rOffset = 0
  const gOffset = totalPixels
  const bOffset = totalPixels * 2

  for (let i = 0; i < totalPixels; i++) {
    const srcIdx = i * 4
    float32Array[rOffset + i] = data[srcIdx] / 255.0
    float32Array[gOffset + i] = data[srcIdx + 1] / 255.0
    float32Array[bOffset + i] = data[srcIdx + 2] / 255.0
  }

  const tensor = new ort.Tensor('float32', float32Array, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])

  // Run model inference with dynamic input tensor name
  const inputName = session.inputNames[0] || 'images'
  const feeds: Record<string, ort.Tensor> = {}
  feeds[inputName] = tensor

  const outputMap = await session.run(feeds)
  const outputName = session.outputNames[0] || 'output0'
  const outputTensor = outputMap[outputName] || Object.values(outputMap)[0]

  if (!outputTensor) {
    return { detections: [], topDetection: null, inferenceTimeMs: Math.round(performance.now() - tStart) }
  }

  const outputData = outputTensor.data as Float32Array
  const dims = outputTensor.dims
  const rawCandidates: DetectionBox[] = []

  // Check output shape layout:
  // Ultralytics layout: [1, 38, 3549] (38 channels: 4 box coords + 34 class scores, 3549 anchors)
  if (dims.length === 3 && dims[1] <= dims[2]) {
    const numChannels = dims[1]
    const numAnchors = dims[2]
    const numClasses = numChannels - 4

    for (let a = 0; a < numAnchors; a++) {
      let maxClassScore = 0
      let bestClassIndex = 0

      for (let c = 0; c < numClasses; c++) {
        const classScore = outputData[(4 + c) * numAnchors + a]
        if (classScore > maxClassScore) {
          maxClassScore = classScore
          bestClassIndex = c
        }
      }

      if (maxClassScore >= confidenceThreshold) {
        const cx = outputData[0 * numAnchors + a]
        const cy = outputData[1 * numAnchors + a]
        const w = outputData[2 * numAnchors + a]
        const h = outputData[3 * numAnchors + a]

        // Un-letterbox coordinates back to normalized 0..1 space relative to source video
        const normX = Math.max(0, Math.min(1, (cx - w / 2 - padX) / scaledW))
        const normY = Math.max(0, Math.min(1, (cy - h / 2 - padY) / scaledH))
        const normW = Math.max(0, Math.min(1, w / scaledW))
        const normH = Math.max(0, Math.min(1, h / scaledH))

        rawCandidates.push({
          x: normX,
          y: normY,
          width: normW,
          height: normH,
          classIndex: bestClassIndex,
          label: YOLO_SIGN_CLASSES[bestClassIndex] || `Class ${bestClassIndex}`,
          confidence: maxClassScore,
        })
      }
    }
  }

  // Non-Maximum Suppression (NMS)
  const nmsDetections = applyNMS(rawCandidates, iouThreshold)
  const topDetection = nmsDetections.length > 0 ? nmsDetections[0] : null
  const inferenceTimeMs = Math.round(performance.now() - tStart)

  return {
    detections: nmsDetections,
    topDetection,
    inferenceTimeMs,
  }
}

/**
 * Standard Non-Maximum Suppression algorithm
 */
function applyNMS(candidates: DetectionBox[], iouThreshold: number): DetectionBox[] {
  if (candidates.length === 0) return []

  // Sort descending by confidence score
  candidates.sort((a, b) => b.confidence - a.confidence)

  const selected: DetectionBox[] = []
  const active = new Array(candidates.length).fill(true)

  for (let i = 0; i < candidates.length; i++) {
    if (!active[i]) continue

    const current = candidates[i]
    selected.push(current)

    for (let j = i + 1; j < candidates.length; j++) {
      if (!active[j]) continue

      // Only suppress overlapping boxes of the same class or high general overlap
      const iou = calculateIoU(current, candidates[j])
      if (iou > iouThreshold) {
        active[j] = false
      }
    }
  }

  return selected
}

function calculateIoU(boxA: DetectionBox, boxB: DetectionBox): number {
  const xA = Math.max(boxA.x, boxB.x)
  const yA = Math.max(boxA.y, boxB.y)
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width)
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height)

  const interW = Math.max(0, xB - xA)
  const interH = Math.max(0, yB - yA)
  const intersectionArea = interW * interH
  if (intersectionArea <= 0) return 0

  const areaA = boxA.width * boxA.height
  const areaB = boxB.width * boxB.height
  const unionArea = areaA + areaB - intersectionArea

  return unionArea > 0 ? intersectionArea / unionArea : 0
}

/**
 * Helper to render bounding boxes, tags, and confidence percentages
 * onto the video canvas overlay.
 * Handles mirroring if the video is mirrored.
 */
export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: DetectionBox[],
  canvasWidth: number,
  canvasHeight: number,
  isMirrored = true,
) {
  for (const det of detections) {
    // When mirrored, flip X coordinate horizontally
    const rx = isMirrored ? (1 - det.x - det.width) * canvasWidth : det.x * canvasWidth
    const ry = det.y * canvasHeight
    const rw = det.width * canvasWidth
    const rh = det.height * canvasHeight

    const color = '#38bdf8' // Cyan highlight
    const scorePct = Math.round(det.confidence * 100)

    // Bounding box rectangle
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)'
    ctx.shadowBlur = 10
    ctx.strokeRect(rx, ry, rw, rh)

    // Label banner
    const tagText = `${det.label} (${scorePct}%)`
    ctx.font = '600 13px Inter, sans-serif'
    const textWidth = ctx.measureText(tagText).width + 16
    const tagHeight = 24

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.fillRect(rx, Math.max(0, ry - tagHeight), textWidth, tagHeight)

    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.strokeRect(rx, Math.max(0, ry - tagHeight), textWidth, tagHeight)

    ctx.fillStyle = '#ffffff'
    ctx.fillText(tagText, rx + 8, Math.max(16, ry - 6))
    ctx.restore()
  }
}
