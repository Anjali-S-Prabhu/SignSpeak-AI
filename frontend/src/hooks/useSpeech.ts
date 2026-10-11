import { useCallback, useRef, useEffect } from 'react'
import { useAppContext } from '@/contexts/AppContext'

/**
 * Speech output hook.
 * Uses browser Web Speech API (SpeechSynthesis) optimized for immediate, low-latency playback.
 */
export function useSpeech() {
  const { state, dispatch } = useAppContext()
  const lastSpokenRef = useRef<string>('')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Pre-load voices on load so Speak button doesn't wait for voice resolution
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        // Prefer local English voice for fast zero-network-latency synthesis
        const englishVoice = voices.find((v) => v.lang.startsWith('en') && v.localService) ||
                             voices.find((v) => v.lang.startsWith('en')) ||
                             voices[0]
        cachedVoiceRef.current = englishVoice
      }
    }

    loadVoices()
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const speak = useCallback((text?: string) => {
    const target = text ?? state.sentence
    if (!target.trim() || state.isMuted) return

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser.')
      return
    }

    const synth = window.speechSynthesis

    // Resume if synthesis engine was paused by Chrome
    if (synth.paused) {
      synth.resume()
    }

    // Cancel any stale queued speech immediately
    synth.cancel()

    // Convert to lowercase so TTS reads it naturally as a word
    const textToSpeak = target.toLowerCase()
    lastSpokenRef.current = textToSpeak
    dispatch({ type: 'SET_SPEAKING', speaking: true })

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    if (cachedVoiceRef.current) {
      utterance.voice = cachedVoiceRef.current
    } else {
      const voices = synth.getVoices()
      const englishVoice = voices.find((v) => v.lang.startsWith('en') && v.localService) || voices[0]
      if (englishVoice) utterance.voice = englishVoice
    }

    utterance.onend = () => dispatch({ type: 'SET_SPEAKING', speaking: false })
    utterance.onerror = () => dispatch({ type: 'SET_SPEAKING', speaking: false })
    utteranceRef.current = utterance

    // Fire immediately
    synth.speak(utterance)
  }, [state.sentence, state.isMuted, dispatch])

  /**
   * Speaks a single accepted word automatically.
   * Filters out empty/nothing words and respects mute & autoSpeak settings.
   */
  const speakWord = useCallback((word: string) => {
    const trimmed = word.trim()
    if (!trimmed || trimmed.toLowerCase() === 'nothing') return
    if (state.isMuted || !state.autoSpeak) return

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }

    const synth = window.speechSynthesis
    if (synth.paused) {
      synth.resume()
    }
    synth.cancel()

    const textToSpeak = trimmed.toLowerCase()
    lastSpokenRef.current = textToSpeak
    dispatch({ type: 'SET_SPEAKING', speaking: true })

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.rate = 1.05
    utterance.pitch = 1.0

    if (cachedVoiceRef.current) {
      utterance.voice = cachedVoiceRef.current
    } else {
      const voices = synth.getVoices()
      const englishVoice = voices.find((v) => v.lang.startsWith('en') && v.localService) || voices[0]
      if (englishVoice) utterance.voice = englishVoice
    }

    utterance.onend = () => dispatch({ type: 'SET_SPEAKING', speaking: false })
    utterance.onerror = () => dispatch({ type: 'SET_SPEAKING', speaking: false })
    utteranceRef.current = utterance

    synth.speak(utterance)
  }, [state.isMuted, state.autoSpeak, dispatch])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    dispatch({ type: 'SET_SPEAKING', speaking: false })
  }, [dispatch])

  const toggleMute = useCallback(() => {
    dispatch({ type: 'SET_MUTED', muted: !state.isMuted })
    if (!state.isMuted) stop()
  }, [state.isMuted, dispatch, stop])

  return {
    speak,
    speakWord,
    stop,
    toggleMute,
    isMuted: state.isMuted,
    isSpeaking: state.isSpeaking,
    autoSpeak: state.autoSpeak,
  }
}
