import { useRef, useState, useCallback, useEffect } from 'react'
import { useAppContext } from '@/contexts/AppContext'

export interface WebcamState {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  isLoading: boolean
  error: string | null
  devices: MediaDeviceInfo[]
  activeDeviceId: string
  startCamera: (deviceId?: string) => Promise<void>
  stopCamera: () => void
  switchCamera: (deviceId: string) => Promise<void>
  enumerateDevices: () => Promise<void>
}

/**
 * Manages webcam access, device enumeration, and camera switching.
 */
export function useWebcam(): WebcamState {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string>('')
  const { dispatch } = useAppContext()

  const enumerateDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput')
      setDevices(videoDevices)
    } catch (err) {
      console.warn('[useWebcam] Could not enumerate devices:', err)
    }
  }, [])

  const startCamera = useCallback(async (deviceId?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Stop any existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop())

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream
      setStream(mediaStream)
      dispatch({ type: 'SET_CAMERA_ACTIVE', active: true })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }

      const videoTrack = mediaStream.getVideoTracks()[0]
      setActiveDeviceId(videoTrack?.getSettings().deviceId ?? '')
      await enumerateDevices()
    } catch (err: unknown) {
      let msg = 'Failed to access camera.'
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') msg = 'Camera permission denied. Please allow camera access.'
        else if (err.name === 'NotFoundError') msg = 'No camera found on this device.'
        else if (err.name === 'NotReadableError') msg = 'Camera is in use by another application.'
      }
      setError(msg)
      dispatch({ type: 'SET_ERROR', error: msg })
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, enumerateDevices])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    dispatch({ type: 'SET_CAMERA_ACTIVE', active: false })
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [dispatch])

  const switchCamera = useCallback(async (deviceId: string) => {
    await startCamera(deviceId)
  }, [startCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { videoRef, stream, isLoading, error, devices, activeDeviceId, startCamera, stopCamera, switchCamera, enumerateDevices }
}
