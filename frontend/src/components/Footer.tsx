import { Link } from 'react-router-dom'
import { Hand, Code2, MessageCircle, ExternalLink, Heart } from 'lucide-react'

const FOOTER_LINKS = [
  { label: 'Launch App', href: '/dashboard' },
  { label: 'History', href: '/history' },
]

const TECH_LINKS = [
  { label: 'MediaPipe', href: 'https://mediapipe.dev' },
  { label: 'TensorFlow', href: 'https://tensorflow.org' },
  { label: 'FastAPI', href: 'https://fastapi.tiangolo.com' },
  { label: 'React', href: 'https://react.dev' },
]

/**
 * Premium dark footer with gradient border top.
 */
export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(5,8,22,0.8)',
        backdropFilter: 'blur(20px)',
        padding: '48px 24px 32px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Gradient line top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #6366f1, #8b5cf6, transparent)',
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Hand size={20} color="white" />
              </div>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
                SignSpeak AI
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: '220px' }}>
              Real-time sign language detection powered by deep learning and MediaPipe.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Navigation
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {FOOTER_LINKS.map(({ label, href }) => (
                <Link key={href} to={href} style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Powered By
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TECH_LINKS.map(({ label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#818cf8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}>
                  {label} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ color: '#475569', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Made with <Heart size={12} color="#8b5cf6" fill="#8b5cf6" /> for accessibility — SignSpeak AI © {new Date().getFullYear()}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[{ icon: Code2, label: 'GitHub' }, { icon: MessageCircle, label: 'Twitter' }].map(({ icon: Icon, label }) => (
              <button key={label} className="btn-icon" aria-label={label} style={{ width: '34px', height: '34px' }}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
