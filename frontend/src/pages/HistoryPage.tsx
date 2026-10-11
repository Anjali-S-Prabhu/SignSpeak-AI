import { motion } from 'framer-motion'
import { Trash2, Download, Clock, TrendingUp } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import HistoryCard from '@/components/HistoryCard'

/**
 * History page — shows all stored gesture predictions with stats and export.
 */
export default function HistoryPage() {
  const { state, clearHistory } = useAppContext()
  const { history } = state

  // Aggregate stats
  const avgConf = history.length > 0
    ? Math.round((history.reduce((s, r) => s + r.confidence, 0) / history.length) * 100)
    : 0

  const gestureCount = history.reduce<Record<string, number>>((acc, r) => {
    acc[r.gesture] = (acc[r.gesture] ?? 0) + 1
    return acc
  }, {})
  const topGestures = Object.entries(gestureCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Export as JSON
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signspeak-history-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '14px' }}
      >
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>
            Prediction History
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {history.length} prediction{history.length !== 1 ? 's' : ''} recorded this session
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {history.length > 0 && (
            <>
              <motion.button
                id="history-export-btn"
                whileTap={{ scale: 0.95 }}
                className="btn-secondary"
                onClick={handleExport}
              >
                <Download size={15} />
                Export
              </motion.button>
              <motion.button
                id="history-clear-btn"
                whileTap={{ scale: 0.95 }}
                onClick={clearHistory}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  padding: '10px 18px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '10px', color: '#f87171',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                }}
              >
                <Trash2 size={15} />
                Clear All
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats row */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '32px' }}
        >
          {[
            { icon: Clock, label: 'Total Predictions', value: history.length, color: '#818cf8' },
            { icon: TrendingUp, label: 'Avg Confidence', value: `${avgConf}%`, color: '#4ade80' },
            { icon: TrendingUp, label: 'Top Gesture', value: topGestures[0]?.[0] ?? '—', color: '#a78bfa' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon size={12} color={color} />
                <span className="stat-label">{label}</span>
              </div>
              <span className="stat-value" style={{ color }}>{value}</span>
            </div>
          ))}
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: history.length > 0 ? '1fr 300px' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* History list */}
        <div>
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass"
              style={{ padding: '64px 24px', textAlign: 'center' }}
            >
              <Clock size={48} color="#334155" style={{ margin: '0 auto 16px' }} strokeWidth={1} />
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                No history yet
              </p>
              <p style={{ fontSize: '0.875rem', color: '#334155' }}>
                Start detecting gestures in the dashboard to see them here.
              </p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((record, i) => (
                <HistoryCard key={record.id} record={record} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Top gestures sidebar */}
        {topGestures.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass"
            style={{ padding: '20px', position: 'sticky', top: '80px' }}
          >
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: '16px' }}>
              Top Gestures
            </h3>
            {topGestures.map(([gesture, count], i) => {
              const pct = Math.round((count / history.length) * 100)
              return (
                <div key={gesture} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{gesture}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{count}× ({pct}%)</span>
                  </div>
                  <div className="confidence-bar">
                    <motion.div
                      className="confidence-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.6 }}
                    />
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
