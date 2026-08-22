'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HojeData {
  date: string
  autopilotMode: string
  autopilotEnabled: boolean
  generated: { count: number; failed: number; items: Array<{ id: string; filename?: string; durationSec?: number; downloadUrl?: string }> }
  awaitingApproval: { count: number; items: Array<{ id: string; hook: string; product?: string }> }
  published: { count: number; items: Array<{ id: string; channel: string; url?: string }> }
  sales: { count: number; commission: number; revenue: number }
  winners: { count: number; items: Array<{ title: string; body: string; at: string }> }
  errors: { count: number; items: Array<{ title: string; body: string; at: string }> }
  unreadNotifications: number
}

const modeLabel: Record<string, string> = {
  PAUSED: '⏸ Pausado',
  SUPERVISED: '👁 Supervisionado',
  AUTOPILOT: '🤖 Autopilot',
}

export default function HojePage() {
  const [data, setData] = useState<HojeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hoje')
      .then(r => r.json())
      .then(d => { setData(d as HojeData); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Carregando...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-sm" style={{ color: '#ef4444' }}>
        Erro ao carregar dados
      </div>
    )
  }

  const commission = data.sales.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const revenue = data.sales.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>Hoje</h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{data.date}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium mt-1"
          style={{ background: 'rgba(255,107,53,0.12)', color: 'var(--brand)' }}>
          {modeLabel[data.autopilotMode] ?? data.autopilotMode}
        </span>
      </div>

      {/* Sales summary */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,107,53,0.05))', border: '1px solid rgba(255,107,53,0.2)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,107,53,0.7)' }}>
          💰 Vendas hoje
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>{data.sales.count}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>pedidos</p>
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: '#22c55e' }}>{commission}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>comissão</p>
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.6)' }}>{revenue}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>bruto</p>
          </div>
        </div>
      </div>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/video-factory"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>{data.generated.count}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>🎬 vídeos gerados</p>
          {data.generated.failed > 0 && (
            <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{data.generated.failed} com erro</p>
          )}
        </Link>
        <Link href="/queue"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black" style={{ color: data.awaitingApproval.count > 0 ? '#eab308' : 'rgba(255,255,255,0.95)' }}>
            {data.awaitingApproval.count}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>✅ aguardando aprovação</p>
        </Link>
        <Link href="/distribute"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>{data.published.count}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>📡 publicados</p>
        </Link>
        <Link href="/notifications"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black" style={{ color: data.unreadNotifications > 0 ? 'var(--brand)' : 'rgba(255,255,255,0.95)' }}>
            {data.unreadNotifications}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>🔔 notificações novas</p>
        </Link>
      </div>

      {/* Winners */}
      {data.winners.count > 0 && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#eab308' }}>⭐ WINNERS DETECTADOS</p>
          {data.winners.items.map((w, i) => (
            <div key={i}>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{w.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{w.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Awaiting approval preview */}
      {data.awaitingApproval.count > 0 && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Aguardando aprovação
          </p>
          {data.awaitingApproval.items.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#eab308' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.hook}</p>
                {c.product && <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.product}</p>}
              </div>
            </div>
          ))}
          <Link href="/queue"
            className="block text-center text-sm py-2.5 rounded-xl font-semibold transition-all active:scale-95 mt-1"
            style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>
            Revisar na Fila →
          </Link>
        </div>
      )}

      {/* Errors */}
      {data.errors.count > 0 && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>
            ❌ {data.errors.count} erro{data.errors.count !== 1 ? 's' : ''} nas últimas 24h
          </p>
          {data.errors.items.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{e.title}: {e.body.slice(0, 80)}</p>
          ))}
        </div>
      )}

      {/* Action: LANÇAR */}
      <Link href="/launch"
        className="block rounded-2xl p-5 text-center transition-all active:scale-95"
        style={{ background: 'var(--brand)', color: '#fff' }}>
        <p className="text-lg font-black">🚀 LANÇAR CAMPANHA</p>
        <p className="text-sm mt-1 opacity-75">Produto → Score → Vídeo → Publicar</p>
      </Link>
    </div>
  )
}
