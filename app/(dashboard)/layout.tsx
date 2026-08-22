'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠', short: 'Home' },
  { href: '/products', label: 'Produtos', icon: '🔍', short: 'Produtos' },
  { href: '/queue', label: 'Fila', icon: '✅', short: 'Fila' },
  { href: '/video-factory', label: 'Vídeos', icon: '🎬', short: 'Vídeos' },
  { href: '/autopilot', label: 'Autopilot', icon: '🤖', short: 'Piloto' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 flex-col fixed inset-y-0 left-0 z-40"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-lg font-black tracking-tight" style={{ color: 'var(--brand)' }}>
            Affiliate OS
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Shopee Performance
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'font-semibold'
                    : 'hover:bg-white/5'
                }`}
                style={active ? {
                  background: 'rgba(255,107,53,0.12)',
                  color: 'var(--brand)',
                } : { color: 'rgba(255,255,255,0.5)' }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-5 py-3 border-t text-[10px]" style={{ borderColor: 'var(--border)', color: 'rgba(255,255,255,0.2)' }}>
          v0.2 · FFmpeg arm64 ✅
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          paddingTop: 'calc(var(--sat) + 12px)',
        }}>
        <span className="text-base font-black" style={{ color: 'var(--brand)' }}>Affiliate OS</span>
        <span className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--brand)' }}>
          ⚡ Live
        </span>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-56 overflow-auto"
        style={{ paddingBottom: 'var(--bottom-clearance)' }}>
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'var(--sab)',
        }}>
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all"
              style={{ color: active ? 'var(--brand)' : 'rgba(255,255,255,0.35)' }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{item.short}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ background: 'var(--brand)', marginBottom: 'var(--sab)' }} />
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
