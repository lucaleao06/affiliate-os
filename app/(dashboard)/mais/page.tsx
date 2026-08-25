'use client'

import Link from 'next/link'

const links = [
  { href: '/hoje', icon: 'HJ', label: 'Hoje', desc: 'Visão diária: gerados, aprovações, vendas' },
  { href: '/radar', icon: 'RD', label: 'Radar', desc: 'Produtos ranqueados por oportunidade' },
  { href: '/launch', icon: 'LC', label: 'Lançar Campanha', desc: 'Produto → vídeo → publicação' },
  { href: '/queue', icon: 'QU', label: 'Fila de Aprovação', desc: 'Revisar e aprovar criativos gerados' },
  { href: '/video-factory', icon: 'VF', label: 'Fábrica de Vídeo', desc: 'Storyboard e render MP4' },
  { href: '/distribute', icon: 'DT', label: 'Distribuição', desc: 'Pacotes prontos para publicar' },
  { href: '/products', icon: 'PR', label: 'Produtos', desc: 'Buscar e avaliar produtos' },
  { href: '/products/add-own', icon: 'PP', label: 'Produto Próprio', desc: 'E-book, curso, template seu' },
  { href: '/revenue', icon: 'R$', label: 'Receita', desc: 'Comissões e analytics' },
  { href: '/sales', icon: 'VD', label: 'Vendas', desc: 'Transações individuais importadas' },
  { href: '/sales/import', icon: 'CV', label: 'Importar Vendas', desc: 'CSV do Shopee Affiliate' },
  { href: '/growth', icon: 'GW', label: 'Growth', desc: 'Winners, acelerando, caindo' },
  { href: '/connect', icon: 'CN', label: 'Conexões', desc: 'Instagram, YouTube, TikTok' },
  { href: '/notifications', icon: 'NT', label: 'Notificações', desc: 'Eventos do sistema' },
  { href: '/autopilot', icon: 'AP', label: 'Autopilot', desc: 'Regras e automação' },
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
            <span className="text-[10px] font-bold w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,107,53,0.12)', color: 'var(--brand)' }}>{l.icon}</span>
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
