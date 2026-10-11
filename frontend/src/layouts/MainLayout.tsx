import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

/**
 * Main layout wrapping all pages.
 * Shows Navbar always; Footer only on non-dashboard pages.
 */
export default function MainLayout() {
  const { pathname } = useLocation()
  const isDashboard = pathname === '/dashboard'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Ambient mesh background */}
      <div className="mesh-bg" aria-hidden="true" />

      <Navbar />

      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>

      {!isDashboard && <Footer />}
    </div>
  )
}
