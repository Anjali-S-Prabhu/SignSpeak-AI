import axios from 'axios'

/**
 * Axios client pre-configured for the FastAPI backend.
 * In dev the Vite proxy forwards /api → http://localhost:8000
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ---- Request interceptor ----
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
)

// ---- Response interceptor ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Error]', error?.response?.data || error.message)
    return Promise.reject(error)
  },
)

// =====================================================
// TYPED API CALLS
// =====================================================

export interface HealthResponse {
  status: string
  model_loaded: boolean
  version: string
}

export interface DetectRequest {
  /** Flat array of 21 landmarks × 3 coordinates (x, y, z) = 63 values */
  landmarks: number[]
  /** Base64-encoded JPEG frame (optional, for server-side processing) */
  frame?: string
}

export interface DetectResponse {
  gesture: string
  confidence: number
  prediction_time_ms: number
  model_loaded: boolean
}

export interface SpeakRequest {
  text: string
}

export interface SpeakResponse {
  success: boolean
  message: string
}

export interface HistoryRecord {
  id: string
  gesture: string
  confidence: number
  timestamp: string
  sentence?: string
}

/** GET /health */
export const checkHealth = () => api.get<HealthResponse>('/health')

/** POST /detect — send landmarks, get gesture */
export const detectGesture = (data: DetectRequest) =>
  api.post<DetectResponse>('/detect', data)

/** POST /speak — trigger TTS on backend */
export const speakText = (text: string) =>
  api.post<SpeakResponse>('/speak', { text } satisfies SpeakRequest)

/** GET /history — fetch all stored records */
export const getHistory = () => api.get<HistoryRecord[]>('/history')

/** DELETE /history — clear history */
export const clearHistoryApi = () => api.delete('/history')

export default api
