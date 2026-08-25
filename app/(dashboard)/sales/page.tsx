'use client'

import { useState, useEffect, useCallback } from 'react'

interface Sale {
  id: string
  order_id: string | null
  platform: string
  gross_value: number
  commission_value: number
  commission_rate: number | null
  status: string
  occurred_at: string | null
  payout_date: string | null
  product_name: string | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  completed:  { label: 'Pago',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  pending:    { label: 'Pendente',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  cancelled:  { label: 'Cancelado', color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  invalid:    { label: 'Inválido',  color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
}

const PERIODS = [
  { label: '7d',  value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'Tudo', value: 'all' },
]

const STATUSES = [
  { label: 'Todos',     value: '' },
  { label: 'Pago',      value: 'completed' },
  { label: 'Pendente',  value: 'pending' },
  { label: 'Cancelado', value: 'cancelled' },
]

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)
  const LIMIT = 50

  const load = useCallback(async (p: string, s: string, off: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period: p, limit: String(LIMIT), offset: String(off) })
      if (s) params.set('status', s)
      const res = await fetch(`/api/sales?${params}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro'); return }
      if (off === 0) {
        setSales(json.sales)
      } else {
        setSales(prev => [...prev, ...json.sales])
      }
      setTotal(json.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void load(period, status, 0) })
  }, [period, status, load])

  function changePeriod(p: string) { setOffset(0); setPeriod(p) }
  function changeStatus(s: string) { setOffset(0); setStatus(s) }
  function loadMore() {
    const next = offset + LIMIT
    setOffset(next)
    load(period, status, next)
  }

  const totalCommission = sales.reduce((s, r) => s + (r.commission_value ?? 0), 0)

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Vendas</h1>
          <a
            href="/sales/import"
            className="text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: 'var(--brand)', color: '#fff', minHeight: 36, display: 'flex', alignItems: 'center' }}
          >
            Importar CSV
          </a>
        </div>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {total > 0 ? `${total} transações` : 'Nenhuma transação ainda'}
        </p>

        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => changePeriod(p.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
              style={{
                background: period === p.value ? 'var(--brand)' : 'var(--surface)',
                color: period === p.value ? '#fff' : 'rgba(255,255,255,0.5)',
                border: period === p.value ? 'none' : '1px solid var(--border)',
                minHeight: 32,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-5 flex-wrap">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => changeStatus(s.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition"
              style={{
                background: status === s.value ? 'rgba(255,107,53,0.15)' : 'var(--surface)',
                color: status === s.value ? 'var(--brand)' : 'rgba(255,255,255,0.5)',
                border: status === s.value ? '1px solid rgba(255,107,53,0.35)' : '1px solid var(--border)',
                minHeight: 32,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Summary bar */}
        {sales.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {sales.length} exibidas de {total}
            </span>
            <span className="text-sm font-bold" style={{ color: '#4ade80' }}>
              {fmt(totalCommission)} comissão
            </span>
          </div>
        )}

        {/* Skeleton */}
        {loading && sales.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl h-16 animate-pulse" style={{ background: 'var(--surface)' }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sales.length === 0 && (
          <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full mx-auto mb-3" style={{ background: 'rgba(255,107,53,0.12)' }} />
            <p className="font-semibold text-white mb-1">Nenhuma venda encontrada</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Importe seu CSV do Shopee para ver as transações aqui.
            </p>
            <a
              href="/sales/import"
              className="inline-block text-xs font-semibold px-4 py-2 rounded-lg"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              Importar CSV
            </a>
          </div>
        )}

        {/* List */}
        {sales.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {sales.map((sale, i) => {
              const cfg = STATUS_CFG[sale.status] ?? STATUS_CFG['pending']
              return (
                <div
                  key={sale.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: 'var(--surface)',
                    borderBottom: i < sales.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Date */}
                  <div className="text-center flex-shrink-0" style={{ minWidth: 44 }}>
                    <p className="text-xs font-medium text-white">{fmtDate(sale.occurred_at)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{sale.platform}</p>
                  </div>

                  {/* Product + order */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {sale.product_name ?? sale.order_id ?? '—'}
                    </p>
                    {sale.product_name && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {sale.order_id}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>

                  {/* Commission */}
                  <div className="text-right flex-shrink-0" style={{ minWidth: 72 }}>
                    <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
                      {fmt(sale.commission_value)}
                    </p>
                    {sale.gross_value > 0 && sale.gross_value !== sale.commission_value && (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                        {fmt(sale.gross_value)} bruto
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load more */}
        {!loading && sales.length < total && (
          <button
            onClick={loadMore}
            className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition"
            style={{ border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}
          >
            Carregar mais ({total - sales.length} restantes)
          </button>
        )}

        {loading && sales.length > 0 && (
          <div className="mt-4 text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Carregando...</div>
        )}
      </div>
    </div>
  )
}
