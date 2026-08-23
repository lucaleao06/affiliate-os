'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HojeData {
  date: string
  autopilotMode: string
  autopilotEnabled: boolean
  generated: { count: number; countToday: number; failed: number; items: Array<{ id: string; filename?: string; durationSec?: number; downloadUrl?: string }> }
  awaitingApproval: { count: number; items: Array<{ id: string; hook: string; product?: string }> }
  published: { count: number; countToday: number; items: Array<{ id: string; channel: string; url?: string }> }
  sales: { count: number; commission: number; revenue: number }
  winners: { count: number; items: Array<{ title: string; body: string; at: string }> }
  errors: { count: number; items: Array<{ title: string; body: string; at: string }> }
  unreadNotifications: number
}

const MODE_BADGE: Record<string, { label: string; color: string }> = {
  PAUSED:     { label: 'Pausado',       color: 'rgba(255,255,255,0.25)' },
  SUPERVISED: { label: 'Supervisionado', color: 'var(--brand)' },
  AUTOPILOT:  { label: 'Autopilot',     color: '#22c55e' },
}

/** Decide qual é a próxima ação real com base no estado atual */
function nextStep(d: HojeData): { label: string; sub: string; href: string; urgent: boolean } {
  if (d.awaitingApproval.count > 0) {
    return {
      label: `Revisar ${d.awaitingApproval.count} criativo${d.awaitingApproval.count !== 1 ? 's' : ''} pendente${d.awaitingApproval.count !== 1 ? 's' : ''}`,
      sub: 'Aprovar para liberar o pipeline de vídeo',
      href: '/queue',
      urgent: true,
    }
  }
  if (d.generated.count === 0) {
    return {
      label: 'Iniciar pipeline',
      sub: 'Adicionar produto → gerar criativo',
      href: '/launch',
      urgent: false,
    }
  }
  if (d.published.count === 0 && d.generated.count > 0) {
    return {
      label: 'Ver pacotes prontos',
      sub: 'Baixar MP4 e publicar manualmente',
      href: '/distribute',
      urgent: false,
    }
  }
  return {
    label: 'Ver distribuição',
    sub: 'Acompanhar publicações',
    href: '/distribute',
    urgent: false,
  }
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
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <div className="h-8 w-40 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
        <div className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
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

  const step = nextStep(data)
  const mode = MODE_BADGE[data.autopilotMode] ?? MODE_BADGE.PAUSED
  const activeProduct = data.awaitingApproval.items[0]?.product ?? null
  const commission = data.sales.commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3 pb-8">

      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Hoje</h1>
          <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(255,255,255,0.35)' }}>{data.date}</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: 'rgba(255,255,255,0.06)', color: mode.color, border: `1px solid ${mode.color}40` }}>
          {mode.label}
        </span>
      </div>

      {/* Next action — card principal */}
      <Link href={step.href}
        className="block rounded-2xl p-4 transition-all active:scale-[0.98]"
        style={{
          background: step.urgent ? 'rgba(255,107,53,0.1)' : 'var(--surface)',
          border: step.urgent ? '1px solid rgba(255,107,53,0.35)' : '1px solid var(--border)',
        }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: step.urgent ? 'var(--brand)' : 'rgba(255,255,255,0.3)' }}>
          Próxima ação
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-white text-sm leading-snug">{step.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{step.sub}</p>
            {activeProduct && (
              <p className="text-xs mt-1.5 truncate" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 220 }}>
                {activeProduct.length > 40 ? activeProduct.slice(0, 40) + '…' : activeProduct}
              </p>
            )}
          </div>
          <span className="text-lg flex-shrink-0" style={{ color: step.urgent ? 'var(--brand)' : 'rgba(255,255,255,0.3)' }}>→</span>
        </div>
      </Link>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/video-factory"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.9)' }}>{data.generated.count}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Vídeos gerados</p>
          {data.generated.countToday > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--brand)' }}>{data.generated.countToday} hoje</p>
          )}
          {data.generated.failed > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>{data.generated.failed} com erro</p>
          )}
        </Link>

        <Link href="/queue"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black"
            style={{ color: data.awaitingApproval.count > 0 ? '#eab308' : 'rgba(255,255,255,0.9)' }}>
            {data.awaitingApproval.count}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Aguardando aprovação</p>
        </Link>

        <Link href="/distribute"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.9)' }}>{data.published.count}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Publicados</p>
          {data.published.countToday > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--brand)' }}>{data.published.countToday} hoje</p>
          )}
        </Link>

        <Link href="/notifications"
          className="rounded-2xl p-4 transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-black"
            style={{ color: data.unreadNotifications > 0 ? 'var(--brand)' : 'rgba(255,255,255,0.9)' }}>
            {data.unreadNotifications}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Notificações</p>
        </Link>
      </div>

      {/* Vendas */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5"
          style={{ color: 'rgba(255,255,255,0.25)' }}>Vendas hoje</p>
        {data.sales.count === 0 ? (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Sem vendas registradas — importe o CSV da Shopee para ver comissões.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.9)' }}>{data.sales.count}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>pedidos</p>
            </div>
            <div className="w-px h-8" style={{ background: 'var(--border)' }} />
            <div>
              <p className="text-lg font-black" style={{ color: '#22c55e' }}>{commission}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>comissão</p>
            </div>
          </div>
        )}
      </div>

      {/* Winners */}
      {data.winners.count > 0 && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#eab308' }}>
            Winners detectados
          </p>
          {data.winners.items.map((w, i) => (
            <div key={i}>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{w.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{w.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Erros */}
      {data.errors.count > 0 && (
        <div className="rounded-2xl p-4 space-y-1.5"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#ef4444' }}>
            {data.errors.count} erro{data.errors.count !== 1 ? 's' : ''} recentes
          </p>
          {data.errors.items.map((e, i) => (
            <p key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {e.title}: {e.body.slice(0, 80)}
            </p>
          ))}
        </div>
      )}

    </div>
  )
}
