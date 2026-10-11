import { Activity, Target, Zap, Hand } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'

/**
 * Statistics panel showing FPS, total predictions, average confidence, and top gesture.
 */
export default function StatsPanel() {
  const { state } = useAppContext()
  const { fps, totalPredictions, confidence, history } = state

  // Compute average confidence from history
  const avgConf = history.length > 0
    ? Math.round((history.reduce((s, r) => s + r.confidence, 0) / history.length) * 100)
    : 0

  // Top gesture from history
  const gestureCount = history.reduce<Record<string, number>>((acc, r) => {
    acc[r.gesture] = (acc[r.gesture] ?? 0) + 1
    return acc
  }, {})
  const topGesture = Object.entries(gestureCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const stats = [
    { icon: Zap, label: 'FPS', value: fps, color: '#818cf8' },
    { icon: Activity, label: 'Predictions', value: totalPredictions, color: '#22d3ee' },
    { icon: Target, label: 'Avg Conf', value: `${avgConf}%`, color: '#4ade80' },
    { icon: Hand, label: 'Top Gesture', value: topGesture, color: '#a78bfa' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Icon size={12} color={color} />
            <span className="stat-label">{label}</span>
          </div>
          <span className="stat-value" style={{ color }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
