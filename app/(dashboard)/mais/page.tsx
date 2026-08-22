'use client'

import Link from 'next/link'

const links = [
  { href: '/hoje', icon: '📋', label: 'Hoje', desc: 'Visão diária: gerados, aprovações, vendas' },
  { href: '/launch', icon: '🚀', label: 'Lançar Campanha', desc: 'Produto → vídeo → publicação' },
  { href: '/connect', icon: '🔗', label: 'Conexões', desc: 'Instagram, YouTube, TikTok' },
  { href: '/products', icon: '🔍', label: 'Produtos', desc: 'Buscar e avaliar produtos' },
  { href: '/revenue', icon: '💰', label: 'Receita', desc: 'Comissões e analytics' },
  { href: '/notifications', icon: '🔔', label: 'Notificações', desc: 'Eventos do sistema' },
  { href: '/sales/import', icon: '📊', label: 'Importar Vendas', desc: 'CSV do Shopee Affiliate' },
  { href: '/autopilot', icon: '🤖', label: 'Autopilot', desc: 'Regras e automação' },
]

export default function MaisPage() {
  return (
    <div className="p-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <h1 className="text-lg font-bold mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>Mais</h1>
      <div className="space-y-2">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-3 p-4 rounded-xl transition-all active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-2xl">{l.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{l.label}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{l.desc}</p>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
