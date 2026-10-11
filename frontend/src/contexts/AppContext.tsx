import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react'

// =====================================================
// TYPES
// =====================================================

export interface GestureRecord {
  id: string
  gesture: string
  confidence: number
  timestamp: string
  sentence?: string
  engine?: string
}

export type InferenceEngine = 'yolo' | 'mediapipe'

export interface AppState {
  /** Currently detected gesture label */
  currentGesture: string
  /** Confidence score 0-1 */
  confidence: number
  /** Time taken for last prediction (ms) */
  predictionTime: number
  /** Accumulated text sentence */
  sentence: string
  /** Prediction history */
  history: GestureRecord[]
  /** Camera active state */
  isCameraActive: boolean
  /** Mute voice output */
  isMuted: boolean
  /** Speaking state */
  isSpeaking: boolean
  /** Current FPS */
  fps: number
  /** Error message */
  error: string | null
  /** Model loaded state */
  modelLoaded: boolean
  /** Total predictions count */
  totalPredictions: number
  /** Active inference engine: 'yolo' (ONNX Web) or 'mediapipe' (Skeletal Landmarks) */
  inferenceEngine: InferenceEngine
  /** Confidence threshold gate (0.1 - 0.95) */
  confidenceThreshold: number
  /** Detection paused state */
  isPaused: boolean
  /** Show visual bounding boxes & skeletons */
  showBoxes: boolean
  /** Word recognition cooldown in seconds (3 - 5s, default: 4s) */
  wordCooldownSeconds: number
  /** Cooldown remaining in seconds for UI countdown display */
  cooldownRemaining: number
  /** Is word recognition cooldown currently active */
  isCooldownActive: boolean
  /** Most recently confirmed and accepted gesture */
  acceptedGesture: string
  /** Stability frame counter (0..5) before gesture acceptance */
  stabilityCount: number
  /** Automatically speak accepted words */
  autoSpeak: boolean
}

type Action =
  | { type: 'SET_GESTURE'; gesture: string; confidence: number; predictionTime: number }
  | { type: 'APPEND_SENTENCE'; text: string }
  | { type: 'SET_SENTENCE'; text: string }
  | { type: 'DELETE_LAST_CHAR' }
  | { type: 'CLEAR_SENTENCE' }
  | { type: 'ADD_HISTORY'; record: GestureRecord }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_CAMERA_ACTIVE'; active: boolean }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_SPEAKING'; speaking: boolean }
  | { type: 'SET_FPS'; fps: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_MODEL_LOADED'; loaded: boolean }
  | { type: 'SET_INFERENCE_ENGINE'; engine: InferenceEngine }
  | { type: 'SET_CONFIDENCE_THRESHOLD'; threshold: number }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'SET_SHOW_BOXES'; show: boolean }
  | { type: 'SET_COOLDOWN_SECONDS'; seconds: number }
  | { type: 'SET_COOLDOWN_STATUS'; remaining: number; active: boolean }
  | { type: 'SET_ACCEPTED_GESTURE'; gesture: string }
  | { type: 'SET_STABILITY_COUNT'; count: number }
  | { type: 'SET_AUTO_SPEAK'; autoSpeak: boolean }

// =====================================================
// INITIAL STATE & LOCALSTORAGE RECOVERY
// =====================================================

const STORAGE_KEY_HISTORY = 'signspeak_history'

function loadSavedHistory(): GestureRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const initialState: AppState = {
  currentGesture: '',
  confidence: 0,
  predictionTime: 0,
  sentence: '',
  history: loadSavedHistory(),
  isCameraActive: false,
  isMuted: false,
  isSpeaking: false,
  fps: 0,
  error: null,
  modelLoaded: false,
  totalPredictions: 0,
  inferenceEngine: 'yolo',
  confidenceThreshold: 0.50,
  isPaused: false,
  showBoxes: true,
  wordCooldownSeconds: 4,
  cooldownRemaining: 0,
  isCooldownActive: false,
  acceptedGesture: '',
  stabilityCount: 0,
  autoSpeak: true,
}

// =====================================================
// REDUCER
// =====================================================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_GESTURE':
      return {
        ...state,
        currentGesture: action.gesture,
        confidence: action.confidence,
        predictionTime: action.predictionTime,
        totalPredictions: state.totalPredictions + 1,
      }
    case 'APPEND_SENTENCE':
      return { ...state, sentence: state.sentence + action.text }
    case 'SET_SENTENCE':
      return { ...state, sentence: action.text }
    case 'DELETE_LAST_CHAR':
      return { ...state, sentence: state.sentence.slice(0, -1) }
    case 'CLEAR_SENTENCE':
      return { ...state, sentence: '' }
    case 'ADD_HISTORY': {
      const nextHistory = [action.record, ...state.history].slice(0, 100)
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory))
      } catch (err) {
        console.warn('Failed to persist history to localStorage:', err)
      }
      return { ...state, history: nextHistory }
    }
    case 'CLEAR_HISTORY': {
      try {
        localStorage.removeItem(STORAGE_KEY_HISTORY)
      } catch (err) {
        console.warn('Failed to clear history from localStorage:', err)
      }
      return { ...state, history: [] }
    }
    case 'SET_CAMERA_ACTIVE':
      return { ...state, isCameraActive: action.active }
    case 'SET_MUTED':
      return { ...state, isMuted: action.muted }
    case 'SET_SPEAKING':
      return { ...state, isSpeaking: action.speaking }
    case 'SET_FPS':
      return { ...state, fps: action.fps }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'SET_MODEL_LOADED':
      return { ...state, modelLoaded: action.loaded }
    case 'SET_INFERENCE_ENGINE':
      return { ...state, inferenceEngine: action.engine }
    case 'SET_CONFIDENCE_THRESHOLD':
      return { ...state, confidenceThreshold: action.threshold }
    case 'SET_PAUSED':
      return { ...state, isPaused: action.paused }
    case 'SET_SHOW_BOXES':
      return { ...state, showBoxes: action.show }
    case 'SET_COOLDOWN_SECONDS':
      return { ...state, wordCooldownSeconds: Math.max(3, Math.min(5, action.seconds)) }
    case 'SET_COOLDOWN_STATUS':
      return { ...state, cooldownRemaining: action.remaining, isCooldownActive: action.active }
    case 'SET_ACCEPTED_GESTURE':
      return { ...state, acceptedGesture: action.gesture }
    case 'SET_STABILITY_COUNT':
      return { ...state, stabilityCount: action.count }
    case 'SET_AUTO_SPEAK':
      return { ...state, autoSpeak: action.autoSpeak }
    default:
      return state
  }
}

// =====================================================
// CONTEXT
// =====================================================

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  setGesture: (gesture: string, confidence: number, predictionTime: number) => void
  appendToSentence: (text: string) => void
  addSpace: () => void
  deleteLastChar: () => void
  clearSentence: () => void
  addHistory: (record: Omit<GestureRecord, 'id'>) => void
  clearHistory: () => void
  setError: (error: string | null) => void
  setInferenceEngine: (engine: InferenceEngine) => void
  setConfidenceThreshold: (threshold: number) => void
  setCooldownSeconds: (seconds: number) => void
  setSentence: (text: string) => void
  setAutoSpeak: (autoSpeak: boolean) => void
  togglePause: () => void
  toggleShowBoxes: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

// =====================================================
// PROVIDER
// =====================================================

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const setGesture = useCallback((gesture: string, confidence: number, predictionTime: number) => {
    dispatch({ type: 'SET_GESTURE', gesture, confidence, predictionTime })
  }, [])

  const appendToSentence = useCallback((text: string) => {
    dispatch({ type: 'APPEND_SENTENCE', text })
  }, [])

  const setSentence = useCallback((text: string) => {
    dispatch({ type: 'SET_SENTENCE', text })
  }, [])

  const addSpace = useCallback(() => {
    dispatch({ type: 'APPEND_SENTENCE', text: ' ' })
  }, [])

  const deleteLastChar = useCallback(() => {
    dispatch({ type: 'DELETE_LAST_CHAR' })
  }, [])

  const clearSentence = useCallback(() => {
    dispatch({ type: 'CLEAR_SENTENCE' })
  }, [])

  const addHistory = useCallback((record: Omit<GestureRecord, 'id'>) => {
    const fullRecord: GestureRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    dispatch({ type: 'ADD_HISTORY', record: fullRecord })
  }, [])

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error })
  }, [])

  const setInferenceEngine = useCallback((engine: InferenceEngine) => {
    dispatch({ type: 'SET_INFERENCE_ENGINE', engine })
  }, [])

  const setConfidenceThreshold = useCallback((threshold: number) => {
    dispatch({ type: 'SET_CONFIDENCE_THRESHOLD', threshold })
  }, [])

  const setCooldownSeconds = useCallback((seconds: number) => {
    dispatch({ type: 'SET_COOLDOWN_SECONDS', seconds })
  }, [])

  const setAutoSpeak = useCallback((autoSpeak: boolean) => {
    dispatch({ type: 'SET_AUTO_SPEAK', autoSpeak })
  }, [])

  const togglePause = useCallback(() => {
    dispatch({ type: 'SET_PAUSED', paused: !state.isPaused })
  }, [state.isPaused])

  const toggleShowBoxes = useCallback(() => {
    dispatch({ type: 'SET_SHOW_BOXES', show: !state.showBoxes })
  }, [state.showBoxes])

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setGesture,
        appendToSentence,
        setSentence,
        addSpace,
        deleteLastChar,
        clearSentence,
        addHistory,
        clearHistory,
        setError,
        setInferenceEngine,
        setConfidenceThreshold,
        setCooldownSeconds,
        setAutoSpeak,
        togglePause,
        toggleShowBoxes,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// =====================================================
// HOOK
// =====================================================

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
