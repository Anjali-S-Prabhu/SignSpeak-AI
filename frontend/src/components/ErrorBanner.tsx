import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

interface ErrorBannerProps {
  message: string | null
  onDismiss?: () => void
}

/**
 * Dismissible error banner with Framer Motion animation.
 */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -12, scaleY: 0.8 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -12, scaleY: 0.8 }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            marginBottom: '16px',
          }}
        >
          <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '0.875rem', color: '#fca5a5' }}>{message}</span>
          {onDismiss && (
            <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '2px' }}>
              <X size={15} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
