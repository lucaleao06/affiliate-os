'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  products: number
  campaigns: number
  avgScore: number
  creatives: { pending: number; approved: number; rejected: number; total: number }
}

function StatCard({ icon, label, value, href, accent }: {
  icon: string; label: string; value: string | number; href: string; accent?: boolean
}) {
  return (
    <Link href={href}>
      <div className="rounded-2xl p-4 active:scale-95 transition-transform cursor-pointer"
        style={{
          background: accent ? 'linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,107,53,0.06))' : 'var(--surface)',
          border: `1px solid ${accent ? 'rgba(255,107,53,0.35)' : 'var(--border)'}`,
        }}>
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
      </div>
    </Link>
  )
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then((d: Stats) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const s = stats
  const approvalRate = s && s.creatives.total > 0
    ? Math.round((s.creatives.approved / s.creatives.total) * 100)
    : null

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">

      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--brand)' }}>Operação Shopee</p>
          <h1 className="text-3xl font-semibold text-white leading-tight">
            {s ? (
              s.creatives.approved > 0
                ? 'Produção em andamento'
                : 'Escolha o próximo produto'
            ) : '...'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.48)' }}>
            {s
              ? `${s.creatives.approved} criativo${s.creatives.approved !== 1 ? 's' : ''} aprovado${s.creatives.approved !== 1 ? 's' : ''} · score médio ${s.avgScore}/100`
              : 'Carregando...'}
          </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,107,53,0.12)', color: 'var(--brand)' }}>Supervisionado</span>
        </div>
      </div>

      {/* Winners — action items */}
      {s && s.creatives.pending > 0 && (
        <Link href="/queue">
          <div className="rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <span className="text-xl" style={{ color: '#eab308' }}>●</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white">
                {s.creatives.pending} criativo{s.creatives.pending > 1 ? 's' : ''} esperando sua decisão
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Aprove para liberar para produção de vídeo
              </p>
            </div>
            <span className="text-lg">→</span>
          </div>
        </Link>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          <>
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse h-24" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-6 w-10 rounded mb-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="h-3 w-16 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard icon="□" label="Produtos" value={s?.products ?? '—'} href="/products" />
            <StatCard icon="＋" label="Campanhas" value={s?.campaigns ?? '—'} href="/products" />
            <StatCard icon="↗" label="Score médio" value={s ? `${s.avgScore}/100` : '—'} href="/products" accent={!!(s && s.avgScore >= 70)} />
            <StatCard icon="●" label="Taxa aprovação" value={approvalRate !== null ? `${approvalRate}%` : '—'} href="/queue" accent={!!(approvalRate && approvalRate >= 60)} />
          </>
        )}
      </div>

      {/* Criativo breakdown */}
      {s && s.creatives.total > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Criativos</p>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.creatives.total} total</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden flex gap-0.5" style={{ background: 'var(--surface-2)' }}>
            {s.creatives.approved > 0 && (
              <div className="h-full rounded-full transition-all" style={{ width: `${(s.creatives.approved / s.creatives.total) * 100}%`, background: '#22c55e' }} />
            )}
            {s.creatives.pending > 0 && (
              <div className="h-full rounded-full transition-all" style={{ width: `${(s.creatives.pending / s.creatives.total) * 100}%`, background: '#eab308' }} />
            )}
            {s.creatives.rejected > 0 && (
              <div className="h-full rounded-full transition-all" style={{ width: `${(s.creatives.rejected / s.creatives.total) * 100}%`, background: '#ef4444' }} />
            )}
          </div>
          <div className="flex gap-4 mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Aprovados <strong className="text-white">{s.creatives.approved}</strong></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />Pendentes <strong className="text-white">{s.creatives.pending}</strong></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Rejeitados <strong className="text-white">{s.creatives.rejected}</strong></span>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/products"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
          style={{ background: 'var(--brand)' }}>
          + Produto
        </Link>
        <Link href="/video-factory"
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.8)' }}>
          🎬 Vídeo
        </Link>
      </div>

      {/* Growth + Autopilot promo */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/growth">
          <div className="rounded-2xl p-4 active:scale-95 transition-transform h-full"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <span className="text-2xl">📈</span>
            <p className="text-sm font-semibold text-white mt-2">Growth</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Winners e insights</p>
          </div>
        </Link>
        <Link href="/autopilot">
          <div className="rounded-2xl p-4 active:scale-95 transition-transform h-full"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <span className="text-2xl">🤖</span>
            <p className="text-sm font-semibold text-white mt-2">Autopilot</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Automação da IA</p>
          </div>
        </Link>
      </div>

      {/* Legacy autopilot promo — replaced above, keeping structure */}
      <Link href="/autopilot" className="hidden">
        <div className="rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
          <span className="text-3xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-white">Autopilot</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Configure o nível de automação da IA
            </p>
          </div>
          <span className="ml-auto text-xs px-2 py-1 rounded-full font-medium"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
            PAUSED
          </span>
        </div>
      </Link>

    </div>
  )
}
