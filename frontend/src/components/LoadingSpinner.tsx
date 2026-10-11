/**
 * Centered loading spinner with optional label.
 */
export default function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '48px' }}>
      <div className="spinner" />
      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{label}</p>
    </div>
  )
}
