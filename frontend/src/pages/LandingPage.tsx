import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Hand, Type, Volume2, ArrowRight } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.1, ease: 'easeOut' as const } }),
}

const HIGHLIGHTS = [
  { icon: Hand,    label: 'Show a sign',       desc: 'Use your webcam — no extra hardware needed.' },
  { icon: Type,    label: 'See the text',       desc: 'Letters and words appear in real time.' },
  { icon: Volume2, label: 'Hear the result',    desc: 'Click Speak and your browser reads it aloud.' },
]

export default function LandingPage() {
  return (
    <div style={{ position: 'relative' }}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '64px 24px 48px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Soft background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '700px',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial="hidden"
          animate="visible"
          style={{ maxWidth: '760px', margin: '0 auto', position: 'relative', zIndex: 1 }}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} custom={0} style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            <span className="badge badge-blue" style={{ padding: '7px 18px', fontSize: '0.8rem' }}>
              <Zap size={12} />
              ASL Alphabet · Real-Time · No Upload
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp} custom={1} className="section-title"
            style={{ marginBottom: '22px', fontSize: 'clamp(2.6rem, 6.5vw, 5rem)', lineHeight: 1.15 }}
          >
            Sign Language{' '}
            <span className="gradient-text">Recognition</span>
            <br />in Real Time
          </motion.h1>

          {/* One-line description */}
          <motion.p variants={fadeUp} custom={2} className="section-subtitle"
            style={{ margin: '0 auto 42px', maxWidth: '520px', fontSize: '1.05rem' }}
          >
            Show a hand sign to your camera. SignSpeak AI converts it to text and speaks it aloud — instantly.
          </motion.p>

          {/* Primary CTA */}
          <motion.div variants={fadeUp} custom={3} style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn-primary" id="hero-launch-btn"
              style={{ padding: '14px 36px', fontSize: '1rem' }}
            >
              <Zap size={17} />
              Launch App
            </Link>
            <Link to="/history" className="btn-secondary" id="hero-history-btn"
              style={{ padding: '14px 28px', fontSize: '1rem' }}
            >
              View History
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW TO USE (3 compact cards) ─────────────── */}
      <section style={{ padding: '0 24px 60px', maxWidth: '900px', margin: '0 auto' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}
        >
          {HIGHLIGHTS.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              variants={fadeUp}
              custom={i * 0.4}
              className="glass feature-card"
              style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color="#818cf8" />
              </div>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>
                {label}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.65 }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

    </div>
  )
}
