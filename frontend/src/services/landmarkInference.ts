import type { LandmarkPoint } from '@/hooks/useMediaPipe'

export interface LandmarkClassificationResult {
  gesture: string
  confidence: number
}

/**
 * Geometric Landmark Classifier based on MediaPipe 21 Hand 3D Coordinates.
 * Provides accurate offline recognition of ASL alphabet signs and action words.
 */
export function classifyLandmarks(landmarks: LandmarkPoint[]): LandmarkClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: '', confidence: 0 }
  }

  const wrist = landmarks[0]
  const thumbTip = landmarks[4]
  const thumbIp = landmarks[3]
  const thumbMcp = landmarks[2]

  const indexTip = landmarks[8]
  const indexPip = landmarks[6]
  const indexMcp = landmarks[5]

  const middleTip = landmarks[12]
  const middlePip = landmarks[10]
  const middleMcp = landmarks[9]

  const ringTip = landmarks[16]
  const ringPip = landmarks[14]
  const ringMcp = landmarks[13]

  const pinkyTip = landmarks[20]
  const pinkyPip = landmarks[18]
  const pinkyMcp = landmarks[17]

  // Euclidean 3D distance
  const dist = (p1: LandmarkPoint, p2: LandmarkPoint) =>
    Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0))

  const palmScale = dist(wrist, middleMcp) || 1.0

  // Extension ratios relative to palm size
  const isExtended = (tip: LandmarkPoint, pip: LandmarkPoint, mcp: LandmarkPoint) => {
    const tipDist = dist(wrist, tip) / palmScale
    const mcpDist = dist(wrist, mcp) / palmScale
    return tipDist > mcpDist * 1.15 && tip.y < pip.y
  }

  const isFolded = (tip: LandmarkPoint, pip: LandmarkPoint) => tip.y > pip.y

  const indexExt = isExtended(indexTip, indexPip, indexMcp)
  const middleExt = isExtended(middleTip, middlePip, middleMcp)
  const ringExt = isExtended(ringTip, ringPip, ringMcp)
  const pinkyExt = isExtended(pinkyTip, pinkyPip, pinkyMcp)

  const thumbExt = dist(thumbTip, indexMcp) / palmScale > 0.45

  // 1. "I Love You" (Thumb, Index, Pinky extended, Middle and Ring folded)
  if (indexExt && pinkyExt && !middleExt && !ringExt && thumbExt) {
    return { gesture: 'IloveYou', confidence: 0.95 }
  }

  // 2. "Hello" / Open Hand (All 5 fingers extended upwards)
  if (indexExt && middleExt && ringExt && pinkyExt) {
    return { gesture: 'Hello', confidence: 0.94 }
  }

  // 3. "Peace" / "V" (Index and Middle extended, Ring and Pinky folded)
  if (indexExt && middleExt && !ringExt && !pinkyExt) {
    return { gesture: 'V', confidence: 0.93 }
  }

  // 4. "L" Sign (Thumb and Index extended at 90 degree angle, others folded)
  if (indexExt && thumbExt && !middleExt && !ringExt && !pinkyExt) {
    return { gesture: 'L', confidence: 0.93 }
  }

  // 5. "Yes" / Fist (All fingers folded tightly into palm)
  if (isFolded(indexTip, indexPip) && isFolded(middleTip, middlePip) &&
      isFolded(ringTip, ringPip) && isFolded(pinkyTip, pinkyPip)) {
    return { gesture: 'Yes', confidence: 0.92 }
  }

  // 6. "Pointing" / "1" / "D" (Only Index extended)
  if (indexExt && !middleExt && !ringExt && !pinkyExt && !thumbExt) {
    return { gesture: 'D', confidence: 0.91 }
  }

  // 7. "OK" / "F" (Index and thumb tips touching, other 3 extended)
  const thumbIndexDist = dist(thumbTip, indexTip) / palmScale
  if (thumbIndexDist < 0.25 && middleExt && ringExt && pinkyExt) {
    return { gesture: 'OK', confidence: 0.92 }
  }

  // 8. "Pinky Promise" / "I" (Only pinky extended)
  if (!indexExt && !middleExt && !ringExt && pinkyExt) {
    return { gesture: 'I', confidence: 0.91 }
  }

  // 9. "Thumbs Up" (Thumb pointing up, others folded)
  if (thumbExt && thumbTip.y < thumbIp.y && isFolded(indexTip, indexPip) &&
      isFolded(middleTip, middlePip) && isFolded(ringTip, ringPip) && isFolded(pinkyTip, pinkyPip)) {
    return { gesture: 'Thanks', confidence: 0.92 }
  }

  // 10. "B" Sign (4 fingers straight, thumb tucked)
  if (indexExt && middleExt && ringExt && pinkyExt && !thumbExt) {
    return { gesture: 'B', confidence: 0.90 }
  }

  // Fallback
  return { gesture: '', confidence: 0 }
}
