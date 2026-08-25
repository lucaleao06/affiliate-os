'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Opportunity {
  id: string
  title: string
  price: number
  commissionRate: number
  commissionValue: number
  imageUrl: string | null
  affiliateUrl: string | null
  rating: number | null
  availableQuantity: number | null
  aiScore: number
  rationale: string | null
  creativeCount: number
  approvedCount: number
  opportunityScore: number
  tier: 'now' | 'test' | 'explore' | 'skip' | 'pending_score'
  tierLabel: string
  tierColor: string
  tierBg: string
  hasScore: boolean
  hasCampaign: boolean
}

interface RadarData {
  opportunities: Opportunity[]
  summary: { total: number; now: number; test: number; pendingScore: number }
  message?: string
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(100, (score / max) * 100)
  const color = pct >= 70 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171'
  return (
    <div className="h-1.5 rounded-full overflow-hidden w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

const TIER_ORDER: Opportunity['tier'][] = ['now', 'test', 'explore', 'skip', 'pending_score']

export default function RadarPage() {
  const [data, setData] = useState<RadarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterTier, setFilterTier] = useState<Opportunity['tier'] | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/radar')
      .then(r => r.json() as Promise<RadarData>)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const FILTER_CFG: { key: Opportunity['tier'] | 'all'; label: string; color: string }[] = [
    { key: 'all', label: 'Todos', color: 'rgba(255,255,255,0.5)' },
    { key: 'now', label: 'Promover agora', color: '#4ade80' },
    { key: 'test', label: 'Vale testar', color: '#fbbf24' },
    { key: 'explore', label: 'Explorar', color: '#60a5fa' },
    { key: 'skip', label: 'Baixo potencial', color: '#f87171' },
    { key: 'pending_score', label: 'Sem score', color: 'rgba(255,255,255,0.35)' },
  ]

  const opportunities = data?.opportunities ?? []
  const filtered = filterTier === 'all'
    ? opportunities
    : opportunities.filter(o => o.tier === filterTier)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Radar</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Produtos ranqueados por oportunidade de comissão
        </p>
      </div>

      {/* Summary cards */}
      {data && !loading && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <p className="text-2xl font-black" style={{ color: '#4ade80' }}>{data.summary.now}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Promover agora</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-2xl font-black" style={{ color: '#fbbf24' }}>{data.summary.test}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Vale testar</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-black text-white">{data.summary.total}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Total</p>
          </div>
        </div>
      )}

      {/* How it works banner */}
      <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Score de oportunidade = (score IA × comissão) ÷ (1 + criativos existentes). Produtos com score alto, comissão alta e poucos criativos sobem no radar.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {FILTER_CFG.map(f => (
          <button key={f.key}
            onClick={() => setFilterTier(f.key)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-all active:scale-95"
            style={filterTier === f.key ? {
              background: 'rgba(255,107,53,0.15)',
              color: 'var(--brand)',
              border: '1px solid rgba(255,107,53,0.3)',
            } : {
              background: 'var(--surface)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid var(--border)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex gap-3">
                <div className="w-14 h-14 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 w-1/3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && opportunities.length === 0 && (
        <div className="rounded-2xl p-10 text-center space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>RD</div>
          <div>
            <p className="font-semibold text-white">Radar vazio</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Adicione produtos para ver as oportunidades ranqueadas.
            </p>
          </div>
          <Link href="/products"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: 'var(--brand)', color: '#fff' }}>
            Adicionar produtos
          </Link>
        </div>
      )}

      {/* Opportunity list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((opp, idx) => {
            const isExpanded = expanded === opp.id

            return (
              <div key={opp.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ background: 'var(--surface)', border: `1px solid ${opp.tier === 'now' ? 'rgba(74,222,128,0.2)' : 'var(--border)'}` }}>

                {/* Card — tappable */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : opp.id)}
                  className="w-full text-left p-4 flex items-start gap-3 active:bg-white/5 transition-colors">

                  {/* Rank + image */}
                  <div className="relative flex-shrink-0">
                    {opp.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opp.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.25)' }}>
                        {(opp.title ?? '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: 'var(--bg)', color: 'rgba(255,255,255,0.4)', border: '1px solid var(--border)' }}>
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start gap-2 justify-between">
                      <p className="text-sm font-semibold text-white leading-snug line-clamp-2 flex-1">{opp.title}</p>
                      <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Tier badge */}
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: opp.tierBg, color: opp.tierColor }}>
                      {opp.tierLabel}
                    </span>

                    {/* Key metrics row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      <span style={{ color: opp.commissionRate >= 12 ? '#4ade80' : 'rgba(255,255,255,0.45)' }}>
                        {opp.commissionRate}% comissão
                      </span>
                      <span>{fmt(opp.price)}</span>
                      {opp.rating && <span>{opp.rating.toFixed(1)} estrelas</span>}
                    </div>

                    {/* Score bar */}
                    {opp.hasScore && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <span>Score IA</span>
                          <span className="font-semibold"
                            style={{ color: opp.aiScore >= 70 ? '#4ade80' : opp.aiScore >= 50 ? '#fbbf24' : '#f87171' }}>
                            {opp.aiScore}/100
                          </span>
                        </div>
                        <ScoreBar score={opp.aiScore} />
                      </div>
                    )}
                    {!opp.hasScore && (
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Score IA pendente</p>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>

                    {/* Commission detail */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Por venda', value: fmt(opp.commissionValue), color: opp.commissionValue >= 5 ? '#4ade80' : 'white' },
                        { label: 'Comissão', value: `${opp.commissionRate}%`, color: 'white' },
                        { label: 'Criativos', value: String(opp.creativeCount), color: 'white' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-xl p-2.5 text-center"
                          style={{ background: 'var(--surface-2)' }}>
                          <p className="text-sm font-bold" style={{ color }}>{value}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Rationale */}
                    {opp.rationale && (
                      <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Avaliação IA</p>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{opp.rationale}</p>
                      </div>
                    )}

                    {/* Stock warning */}
                    {opp.availableQuantity !== null && opp.availableQuantity < 50 && (
                      <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <p className="text-xs" style={{ color: '#fbbf24' }}>
                          Estoque baixo: {opp.availableQuantity} unidades disponíveis
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {!opp.hasCampaign ? (
                        <Link href={`/launch?productId=${opp.id}`}
                          className="col-span-2 flex items-center justify-center py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                          style={{ background: opp.tier === 'now' ? 'var(--brand)' : 'rgba(255,107,53,0.15)', color: opp.tier === 'now' ? '#fff' : 'var(--brand)', border: opp.tier !== 'now' ? '1px solid rgba(255,107,53,0.3)' : 'none' }}>
                          Criar campanha →
                        </Link>
                      ) : (
                        <>
                          <Link href={`/launch?productId=${opp.id}`}
                            className="flex items-center justify-center py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                            style={{ background: 'rgba(255,107,53,0.12)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.25)' }}>
                            + Criativo
                          </Link>
                          <Link href="/queue"
                            className="flex items-center justify-center py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                            style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)' }}>
                            Ver fila
                          </Link>
                        </>
                      )}
                      {!opp.hasScore && (
                        <Link href={`/products`}
                          className="col-span-2 flex items-center justify-center py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}>
                          Gerar score IA
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* No results for filter */}
      {!loading && opportunities.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Nenhum produto neste filtro.</p>
        </div>
      )}
    </div>
  )
}
