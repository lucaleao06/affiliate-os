'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Bottom nav: max 5 items (mobile)
const bottomNav = [
  { href: '/dashboard', label: 'Início', icon: '⌂' },
  { href: '/queue', label: 'Fila', icon: '□' },
  { href: '/video-factory', label: 'Vídeos', icon: '▷' },
  { href: '/distribute', label: 'Distribuir', icon: '↗' },
  { href: '/mais', label: 'Mais', icon: '⋯' },
]

// Sidebar: full nav (desktop)
const sidebarNav = [
  { href: '/hoje', label: 'Hoje', icon: '□', group: 'core' },
  { href: '/dashboard', label: 'Dashboard', icon: '⌂', group: 'core' },
  { href: '/radar', label: 'Radar', icon: '◎', group: 'core' },
  { href: '/launch', label: 'Lançar Campanha', icon: '＋', group: 'core' },
  { href: '/products', label: 'Produtos', icon: '⌕', group: 'core' },
  { href: '/products/add-own', label: 'Produto Próprio', icon: '◇', group: 'core' },
  { href: '/queue', label: 'Fila', icon: '□', group: 'core' },
  { href: '/video-factory', label: 'Vídeos', icon: '▷', group: 'core' },
  { href: '/distribute', label: 'Distribuição', icon: '↗', group: 'publish' },
  { href: '/connect', label: 'Conexões', icon: '⟡', group: 'publish' },
  { href: '/revenue', label: 'Receita', icon: 'R$', group: 'analytics' },
  { href: '/sales', label: 'Vendas', icon: '$', group: 'analytics' },
  { href: '/growth', label: 'Crescimento', icon: '↗', group: 'analytics' },
  { href: '/notifications', label: 'Notificações', icon: '•', group: 'analytics' },
  { href: '/sales/import', label: 'Importar Vendas', icon: '↓', group: 'analytics' },
  { href: '/autopilot', label: 'Piloto Automático', icon: '◌', group: 'automation' },
]

const groups = [
  { key: 'core', label: 'Principal' },
  { key: 'publish', label: 'Publicação' },
  { key: 'analytics', label: 'Análise' },
  { key: 'automation', label: 'Automação' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)

  // Auth guard
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
      } else {
        setAuthChecked(true)
      }
    })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  useEffect(() => {
    // When user is on /notifications, they're reading them — badge shows 0
    if (pathname === '/notifications') { queueMicrotask(() => setUnreadCount(0)); return }
    fetch('/api/notifications?unread=1')
      .then(r => r.json())
      .then(d => setUnreadCount((d.notifications ?? []).length))
      .catch(() => {})
  }, [pathname]) // Re-fetch on navigation

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/mais') return false
    return pathname.startsWith(href)
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Carregando...</div>
      </div>
    )
  }

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
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {groups.map(group => {
            const items = sidebarNav.filter(n => n.group === group.key)
            return (
              <div key={group.key}>
                <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const active = isActive(item.href)
                    return (
                      <Link key={item.href} href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                          active ? 'font-semibold' : 'hover:bg-white/5'
                        }`}
                        style={active ? {
                          background: 'rgba(255,107,53,0.12)',
                          color: 'var(--brand)',
                        } : { color: 'rgba(255,255,255,0.5)' }}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.href === '/notifications' && unreadCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--brand)', color: '#fff', minWidth: 18, textAlign: 'center' }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={handleLogout}
            className="w-full text-left text-[11px] px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            ⎋ Sair
          </button>
          <div className="text-[10px] px-3 mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>v0.3 · FFmpeg arm64</div>
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
        <Link href="/notifications" className="text-xs px-2 py-1 rounded-full font-bold"
          style={{ background: unreadCount > 0 ? 'var(--brand)' : 'rgba(255,107,53,0.15)', color: '#fff', minWidth: 28, textAlign: 'center' }}>
          {unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : '•'}
        </Link>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-56 overflow-auto"
        style={{ paddingBottom: 'var(--bottom-clearance)' }}>
        {children}
      </main>

      {/* ── Mobile bottom nav (5 items max) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'var(--sab)',
        }}>
        {bottomNav.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all relative"
              style={{ color: active ? 'var(--brand)' : 'rgba(255,255,255,0.35)' }}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{item.label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ background: 'var(--brand)' }} />
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
