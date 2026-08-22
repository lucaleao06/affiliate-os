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
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/revenue?period=${period}`)
      .then(r => r.json())
      .then((d: RevenueData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Receita</h1>
          <div className="flex gap-1.5">
            {['today', '7d', '30d', 'all'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  period === p ? 'bg-white text-gray-900 border-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === 'all' ? 'Tudo' : p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">Carregando...</div>
        ) : !data || data.isEmpty ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-400 text-sm">Nenhuma venda importada ainda.</p>
            <p className="text-gray-600 text-xs mt-1">Importe um relatório CSV do Shopee Affiliate para ver sua receita.</p>
            <a href="/sales/import" className="inline-block mt-4 text-xs text-blue-400 hover:underline">
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
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Status dos pedidos</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.statusBreakdown).map(([st, count]) => (
                    <span key={st} className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-300">
                      {st}: <span className="font-semibold text-white">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top products */}
            {data.topProducts.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">🏆 Produtos top</p>
                <div className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <div key={p.id ?? i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                        <p className="text-sm truncate">{p.name ?? p.id ?? '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold text-emerald-400">{fmt(p.commission)}</p>
                        <p className="text-xs text-gray-600">{p.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top channels */}
            {data.topChannels.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">📡 Canal top</p>
                <div className="space-y-2">
                  {data.topChannels.map((c, i) => (
                    <div key={c.channel ?? i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                        <p className="text-sm">{c.channel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-400">{fmt(c.commission)}</p>
                        <p className="text-xs text-gray-600">{c.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top creatives */}
            {data.topCreatives.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">🎬 Criativo top</p>
                <div className="space-y-2">
                  {data.topCreatives.map((c, i) => (
                    <div key={c.creativeId ?? i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                        <p className="text-xs text-gray-400 font-mono truncate">{c.creativeId}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-semibold text-purple-400">{fmt(c.commission)}</p>
                        <p className="text-xs text-gray-600">{c.orders} pedidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-700 pb-4">
              Dados importados do Shopee Affiliate CSV · Última importação via{' '}
              <a href="/sales/import" className="text-blue-700 hover:text-blue-500">importar relatório</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
