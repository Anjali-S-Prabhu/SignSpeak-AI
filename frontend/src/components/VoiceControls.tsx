import { motion } from 'framer-motion'
import { Volume2, VolumeX, Square, Mic, Radio } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import { useAppContext } from '@/contexts/AppContext'

/**
 * Voice output controls — Auto-Speech Toggle, Speak, Stop, Mute toggle.
 */
export default function VoiceControls() {
  const { speak, stop, toggleMute, isMuted, isSpeaking } = useSpeech()
  const { state, setAutoSpeak } = useAppContext()
  const hasText = state.sentence.trim().length > 0

  return (
    <div className="glass" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Volume2 size={16} color="#818cf8" />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
            Voice Output & Speech Synthesis
          </h3>
        </div>

        {isSpeaking && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="badge badge-green"
          >
            Speaking…
          </motion.span>
        )}
      </div>

      {/* Auto-Speech Toggle Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={15} color={state.autoSpeak ? '#4ade80' : '#64748b'} />
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              Auto-Speak Accepted Signs
            </p>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
              Speaks each newly accepted word once
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAutoSpeak(!state.autoSpeak)}
          style={{
            padding: '5px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '20px',
            border: state.autoSpeak ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.15)',
            background: state.autoSpeak ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.05)',
            color: state.autoSpeak ? '#4ade80' : '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {state.autoSpeak ? 'AUTO ON' : 'AUTO OFF'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Speak full sentence button */}
        <motion.button
          id="voice-speak-btn"
          whileTap={{ scale: 0.95 }}
          className="btn-primary"
          style={{ flex: 1, padding: '11px', fontSize: '0.875rem', justifyContent: 'center' }}
          onClick={() => speak()}
          disabled={!hasText || isMuted}
        >
          <Mic size={16} />
          {isSpeaking ? 'Speaking…' : 'Speak All'}
        </motion.button>

        {/* Stop button */}
        <motion.button
          id="voice-stop-btn"
          whileTap={{ scale: 0.95 }}
          className="btn-secondary"
          style={{ padding: '11px 16px', fontSize: '0.875rem' }}
          onClick={stop}
          disabled={!isSpeaking}
          title="Stop speaking"
        >
          <Square size={16} />
        </motion.button>

        {/* Mute toggle */}
        <motion.button
          id="voice-mute-btn"
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '44px', height: '44px',
            background: isMuted ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
            border: isMuted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', color: isMuted ? '#f87171' : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </motion.button>
      </div>

      {isMuted && (
        <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '10px', textAlign: 'center' }}>
          Voice output is muted — signs continue adding to text
        </p>
      )}
    </div>
  )
}
