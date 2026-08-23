'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { GrowthReport, GrowthInsight, RecommendedAction } from '@/lib/growth/types'

const PERIOD_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  winner:          { icon: 'W',  label: 'Vencedor',        color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  rising:          { icon: '↑',  label: 'Acelerando',      color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
  scale_now:       { icon: '↑↑', label: 'Escalar agora',   color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  top_product:     { icon: 'P',  label: 'Produto top',     color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
  top_creative:    { icon: 'C',  label: 'Criativo top',    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  top_channel:     { icon: 'Ch', label: 'Canal top',       color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  falling:         { icon: '↓',  label: 'Caindo',          color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  loser:           { icon: '!',  label: 'Baixo retorno',   color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  pause_now:       { icon: '||', label: 'Pausar',          color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  low_conversion:  { icon: '↓',  label: 'Conv. baixa',     color: '#fb923c', bg: 'rgba(251,146,60,0.08)' },
  no_data:         { icon: '–',  label: 'Sem dados',       color: 'rgba(255,255,255,0.4)', bg: 'transparent' },
}

const ACTION_CONFIG: Record<RecommendedAction, { label: string; href?: string; color: string }> = {
  scale_creatives:  { label: '+ Variações', href: '/products',  color: '#4ade80' },
  double_down:      { label: 'Ir fundo',    href: '/launch',    color: '#34d399' },
  increase_budget:  { label: 'Escalar',     href: '/launch',    color: '#4ade80' },
  test_new_hooks:   { label: 'Novo hook',   href: '/launch',    color: '#60a5fa' },
  pause_creatives:  { label: 'Pausar',      href: '/queue',     color: '#f87171' },
  reduce_budget:    { label: 'Reduzir',     href: '/queue',     color: '#fb923c' },
  investigate:      { label: 'Ver fila',    href: '/queue',     color: '#fbbf24' },
  no_action:        { label: '—',           color: 'rgba(255,255,255,0.3)' },
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtTrend(v?: number) {
  if (v == null) return null
  const sign = v >= 0 ? '+' : ''
  return `${sign}${Math.round(v * 100)}%`
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-4 w-2/3 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-3 w-full rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
    </div>
  )
}

function InsightCard({ insight }: { insight: GrowthInsight }) {
  const cfg = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.no_data
  const actionCfg = ACTION_CONFIG[insight.recommendedAction]
  const trend = fmtTrend(insight.metrics.commissionTrend)

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: `1px solid var(--border)` }}>
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: cfg.bg }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            {trend && (
              <span className="text-xs font-bold"
                style={{ color: (insight.metrics.commissionTrend ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white truncate">{insight.entityLabel}</p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>{insight.reason}</p>
        </div>
      </div>

      {/* Metrics row */}
      {(insight.metrics.commissionTotal != null || insight.metrics.ordersTotal != null) && (
        <div className="flex gap-4">
          {insight.metrics.commissionTotal != null && (
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Comissão</p>
              <p className="text-sm font-bold" style={{ color: cfg.color }}>{fmt(insight.metrics.commissionTotal)}</p>
            </div>
          )}
          {insight.metrics.ordersTotal != null && (
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Pedidos</p>
              <p className="text-sm font-bold text-white">{insight.metrics.ordersTotal}</p>
            </div>
          )}
          {insight.metrics.commissionPerOrder != null && (
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Por pedido</p>
              <p className="text-sm font-bold text-white">{fmt(insight.metrics.commissionPerOrder)}</p>
            </div>
          )}
        </div>
      )}

      {/* Action CTA */}
      {insight.recommendedAction !== 'no_action' && actionCfg.href && (
        <Link href={actionCfg.href}
          className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all active:scale-95"
          style={{ background: `${cfg.bg}`, border: `1px solid ${cfg.color}22` }}>
          <span className="text-xs font-semibold" style={{ color: cfg.color }}>
            {actionCfg.label} →
          </span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {insight.entity === 'product' ? 'produto' : insight.entity === 'creative' ? 'criativo' : insight.entity}
          </span>
        </Link>
      )}
    </div>
  )
}

export default function GrowthPage() {
  const [report, setReport] = useState<GrowthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/growth/insights?period=${period}`)
      .then(r => r.json())
      .then(d => { setReport(d as GrowthReport); setLoading(false) })
      .catch(() => { setError('Erro ao carregar insights'); setLoading(false) })
  }, [period])

  const hasData = report && report.insights.length > 0 && report.insights[0].type !== 'no_data'
  const noData = !loading && (!report || !hasData)

  // Group insights: positive first, then negative
  const positive = report?.insights.filter(i => ['winner','rising','scale_now','top_product','top_creative','top_channel'].includes(i.type)) ?? []
  const negative = report?.insights.filter(i => ['falling','loser','pause_now','low_conversion'].includes(i.type)) ?? []

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Growth</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            O que está ganhando ou perdendo dinheiro
          </p>
        </div>
        {/* Period pills */}
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value}
              onClick={() => { setLoading(true); setError(null); setPeriod(opt.value) }}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
              style={period === opt.value ? {
                background: 'rgba(255,107,53,0.2)',
                color: 'var(--brand)',
                border: '1px solid rgba(255,107,53,0.4)',
              } : {
                background: 'var(--surface)',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid var(--border)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <>
          {/* Summary skeleton */}
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map(i => (
              <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="h-6 w-6 rounded mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-5 w-8 rounded mb-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div className="h-3 w-12 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[0,1,2].map(i => <SkeletonCard key={i} />)}
          </div>
        </>
      )}

      {/* No data state */}
      {noData && !error && (
        <div className="rounded-2xl p-8 text-center space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-lg font-bold"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>–</div>
          <div>
            <p className="text-base font-bold text-white">Sem dados suficientes</p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Insights aparecem depois de importar vendas do Shopee ou publicar conteúdos com pelo menos {3} pedidos registrados.
            </p>
          </div>
          <div className="space-y-2">
            <Link href="/sales/import"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.3)' }}>
              Importar CSV Shopee
            </Link>
            <Link href="/products"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}>
              Adicionar produtos
            </Link>
          </div>
        </div>
      )}

      {/* Data view */}
      {!loading && hasData && report && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p className="text-xl font-black" style={{ color: '#fbbf24' }}>{report.summary.winnersCount}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Vencedores</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="text-xl font-black" style={{ color: '#4ade80' }}>{report.summary.risingCount}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Acelerando</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <p className="text-xl font-black" style={{ color: '#f87171' }}>{report.summary.losersCount}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Caindo</p>
            </div>
          </div>

          {/* Total commission */}
          {report.summary.totalCommission > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Comissão total no período</p>
              <p className="text-3xl font-black text-white">{fmt(report.summary.totalCommission)}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{report.summary.totalOrders} pedidos · últimos {period}d</p>
            </div>
          )}

          {/* Positive insights */}
          {positive.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                O que está funcionando
              </p>
              {positive.map((ins, i) => <InsightCard key={i} insight={ins} />)}
            </div>
          )}

          {/* Negative insights */}
          {negative.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                O que precisa de atenção
              </p>
              {negative.map((ins, i) => <InsightCard key={i} insight={ins} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
