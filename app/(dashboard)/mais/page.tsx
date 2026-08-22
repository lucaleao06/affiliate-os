'use client'

import Link from 'next/link'

const links = [
  { href: '/products', icon: '🔍', label: 'Produtos', desc: 'Buscar e avaliar produtos' },
  { href: '/revenue', icon: '💰', label: 'Receita', desc: 'Comissões e analytics' },
  { href: '/notifications', icon: '🔔', label: 'Notificações', desc: 'Eventos do sistema' },
  { href: '/sales/import', icon: '📊', label: 'Importar Vendas', desc: 'CSV do Shopee Affiliate' },
  { href: '/autopilot', icon: '🤖', label: 'Autopilot', desc: 'Regras e automação' },
]

export default function MaisPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-lg font-bold mb-4">Mais</h1>
      <div className="space-y-2">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition active:scale-95">
            <span className="text-2xl">{l.icon}</span>
            <div>
              <p className="text-sm font-medium">{l.label}</p>
              <p className="text-xs text-gray-500">{l.desc}</p>
            </div>
            <span className="ml-auto text-gray-600">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
