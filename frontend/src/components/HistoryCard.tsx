import { motion } from 'framer-motion'
import { Clock, Hand, TrendingUp } from 'lucide-react'
import type { GestureRecord } from '@/contexts/AppContext'

interface HistoryCardProps {
  record: GestureRecord
  index: number
}

/**
 * Single prediction history entry card with animation.
 */
export default function HistoryCard({ record, index }: HistoryCardProps) {
  const pct = Math.round(record.confidence * 100)
  const timeStr = new Date(record.timestamp).toLocaleTimeString()

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="history-item"
    >
      {/* Gesture badge */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
        border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
        fontSize: '1.2rem', color: '#818cf8',
      }}>
        {record.gesture.slice(0, 2).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>
            {record.gesture}
          </span>
          <span className={`badge ${pct > 80 ? 'badge-green' : pct > 50 ? 'badge-yellow' : 'badge-red'}`}>
            {pct}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#475569' }}>
            <Clock size={11} />
            {timeStr}
          </span>
          {record.sentence && (
            <span style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{record.sentence}"
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
