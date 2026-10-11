import { useState } from 'react'
import { motion } from 'framer-motion'
import { Type, Space, Delete, Trash2, ChevronRight, Copy, Check } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'

/**
 * Displays the accumulated text sentence with Space, Delete, Clear, Append, and Copy controls.
 */
export default function TextOutput() {
  const { state, setSentence, appendToSentence, addSpace, deleteLastChar, clearSentence } = useAppContext()
  const { sentence, currentGesture } = state
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!sentence) return
    try {
      await navigator.clipboard.writeText(sentence)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Clipboard write failed:', err)
    }
  }

  const wordCount = sentence.trim() ? sentence.trim().split(/\s+/).length : 0

  return (
    <div className="glass" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Type size={16} color="#818cf8" />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
            Recognized Text & Sentences
          </h3>
          {wordCount > 0 && (
            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          )}
        </div>

        {/* Copy button */}
        {sentence && (
          <motion.button
            id="text-copy-btn"
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
              borderColor: copied ? '#4ade80' : 'rgba(255,255,255,0.12)',
              color: copied ? '#4ade80' : '#e2e8f0',
            }}
            title="Copy accumulated text to clipboard"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Text'}
          </motion.button>
        )}
      </div>

      {/* Editable recognized-text area */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        <textarea
          id="recognized-text-input"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          placeholder="Recognized sign words automatically accumulate here. You can also type or edit directly..."
          rows={3}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#f1f5f9',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Append current gesture */}
        <motion.button
          id="text-append-gesture"
          whileTap={{ scale: 0.95 }}
          className="btn-secondary"
          style={{ padding: '9px 14px', fontSize: '0.8rem', flex: 1 }}
          onClick={() => currentGesture && appendToSentence(currentGesture + ' ')}
          disabled={!currentGesture}
          title="Append currently recognized sign to sentence"
        >
          <ChevronRight size={14} />
          Append Sign
        </motion.button>

        {/* Space */}
        <motion.button
          id="text-add-space"
          whileTap={{ scale: 0.95 }}
          className="btn-secondary"
          style={{ padding: '9px 14px', fontSize: '0.8rem', flex: 1 }}
          onClick={addSpace}
          title="Add a space"
        >
          <Space size={14} />
          Space
        </motion.button>

        {/* Delete */}
        <motion.button
          id="text-delete-char"
          whileTap={{ scale: 0.95 }}
          className="btn-secondary"
          style={{ padding: '9px 14px', fontSize: '0.8rem', flex: 1 }}
          onClick={deleteLastChar}
          title="Delete last word or character"
        >
          <Delete size={14} />
          Backspace
        </motion.button>

        {/* Clear */}
        <motion.button
          id="text-clear"
          whileTap={{ scale: 0.95 }}
          onClick={clearSentence}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 14px', fontSize: '0.8rem', flex: 1,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', color: '#f87171',
            cursor: 'pointer', fontWeight: 600,
          }}
          title="Clear all accumulated text"
        >
          <Trash2 size={14} />
          Clear Text
        </motion.button>
      </div>
    </div>
  )
}
