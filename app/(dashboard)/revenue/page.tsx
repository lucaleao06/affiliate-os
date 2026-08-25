'use client'

import { useEffect, useState } from 'react'

interface RevenueSummary {
  commissionToday: number
  commission7d: number
  commissionPeriod: number
  grossPeriod: number
  ordersPeriod: number
}

interface TopItem {
  id?: string
  name?: string
  channel?: string
  creativeId?: string
  commission: number
  orders: number
}

interface RevenueData {
  period: string
  summary: RevenueSummary
  topProducts: (TopItem & { name: string })[]
  topChannels: (TopItem & { channel: string })[]
  topCreatives: (TopItem & { creativeId: string })[]
  statusBreakdown: Record<string, number>
  isEmpty: boolean
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{sub}</p>}
    </div>
  )
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetch(`/api/revenue?period=${period}`)
      .then(r => r.json())
      .then((d: RevenueData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Receita</h1>
          <div className="flex gap-1.5">
            {['today', '7d', '30d', 'all'].map(p => (
              <button
                key={p}
                onClick={() => { setLoading(true); setPeriod(p) }}
                className="text-xs px-3 py-1.5 rounded-full border transition"
                style={period === p
                  ? { background: 'rgba(255,255,255,0.9)', color: '#0d0d1a', borderColor: 'rgba(255,255,255,0.9)' }
                  : { borderColor: 'var(--border)', color: 'rgba(255,255,255,0.4)' }}
              >
                {p === 'today' ? 'Hoje' : p === 'all' ? 'Tudo' : p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />)}
            </div>
            {[0,1].map(i => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />)}
          </div>
        ) : !data || data.isEmpty ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>CSV</div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Nenhuma venda importada ainda.</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Importe um relatório CSV do Shopee Affiliate para ver sua receita.</p>
            <a
              href="/sales/import"
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-xs font-bold transition-opacity hover:opacity-90"
              style={{ background: 'rgba(255,107,53,0.14)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.24)' }}
            >
              Importar relatório →
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Comissão hoje" value={fmt(data.summary.commissionToday)} />
              <StatCard label="Comissão 7 dias" value={fmt(data.summary.commission7d)} />
              <StatCard
                label={`Comissão (${period === 'all' ? 'total' : period})`}
                value={fmt(data.summary.commissionPeriod)}
                sub={`${data.summary.ordersPeriod} pedidos`}
              />
              <StatCard
                label="Receita bruta"
                value={fmt(data.summary.grossPeriod)}
                sub="no período"
              />
            </div>

            {/* Status breakdown */}
            {Object.keys(data.statusBreakdown).length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-3 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Status dos pedidos</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.statusBreakdown).map(([st, count]) => (
                    <span key={st} className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.6)' }}>
                      {st}: <span className="font-semibold text-white">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top products */}
            {data.topProducts.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-3 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Produtos top</p>
                <div className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <div key={p.id ?? i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs w-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                        <p className="text-sm truncate">{p.name ?? p.id ?? '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold" style={{ color: '#34d399' }}>{fmt(p.commission)}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top channels */}
            {data.topChannels.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-3 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Canal top</p>
                <div className="space-y-2">
                  {data.topChannels.map((c, i) => (
                    <div key={c.channel ?? i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                        <p className="text-sm">{c.channel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: '#60a5fa' }}>{fmt(c.commission)}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top creatives */}
            {data.topCreatives.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-3 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Criativo top</p>
                <div className="space-y-2">
                  {data.topCreatives.map((c, i) => (
                    <div key={c.creativeId ?? i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs w-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                        <p className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.creativeId}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold" style={{ color: '#a78bfa' }}>{fmt(c.commission)}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs pb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Dados importados do Shopee Affiliate CSV ·{' '}
              <a href="/sales" style={{ color: 'rgba(255,255,255,0.4)' }}>ver transações</a>
              {' · '}
              <a href="/sales/import" style={{ color: 'rgba(255,255,255,0.4)' }}>importar relatório</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
