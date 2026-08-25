'use client'

import { useState, useEffect, useCallback } from 'react'

interface Creative {
  id: string
  hook: string | null
  script: string | null
  caption: string | null
  cta: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  campaigns: {
    id: string
    name: string
    products: {
      id: string
      title: string
      image_url: string | null
      price: number | null
      commission_rate: number
    } | null
  } | null
}

type FilterTab = 'pending' | 'approved' | 'rejected' | 'all'

const TAB_CFG: { key: FilterTab; label: string; color: string }[] = [
  { key: 'pending', label: 'Pendentes', color: '#eab308' },
  { key: 'approved', label: 'Aprovados', color: '#22c55e' },
  { key: 'rejected', label: 'Rejeitados', color: '#ef4444' },
  { key: 'all', label: 'Todos', color: 'rgba(255,255,255,0.4)' },
]

/** Detecta criativos gerados pelo provider mock antigo (prefixo [MOCK]) */
function isLegacyMock(c: Creative): boolean {
  return !!(c.hook?.includes('[MOCK]') || c.script?.includes('[MOCK]'))
}

function Pill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string }> = {
    pending: { label: 'Pendente', bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
    approved: { label: 'Aprovado', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    rejected: { label: 'Rejeitado', bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  }
  const c = cfg[status] ?? cfg.pending
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  )
}

export default function QueuePage() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('pending')
  const [hideLegacy, setHideLegacy] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchQueue = useCallback((): Promise<Creative[]> =>
    fetch('/api/queue')
      .then(r => r.json() as Promise<{ creatives: Creative[] }>)
      .then(d => d.creatives ?? [])
  , [])

  useEffect(() => {
    fetchQueue()
      .then(items => { setCreatives(items); setLoading(false) })
      .catch(() => { setError('Erro ao carregar fila'); setLoading(false) })
  }, [fetchQueue])

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setUpdating(id)
    setError(null)
    try {
      const res = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error((await res.json() as { error: string }).error)
      await fetchQueue()
    } catch (err) { setError(String(err)) }
    finally { setUpdating(null) }
  }

  const regenerate = async (id: string) => {
    setRegenerating(id)
    setError(null)
    try {
      const res = await fetch('/api/queue/regenerate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creativeId: id }),
      })
      if (!res.ok) throw new Error((await res.json() as { error: string }).error)
      await fetchQueue()
    } catch (err) { setError(String(err)) }
    finally { setRegenerating(null) }
  }

  const approveAll = async () => {
    const pending = (hideLegacy ? creatives.filter(c => !isLegacyMock(c)) : creatives)
      .filter(c => c.status === 'pending')
    if (pending.length === 0) return
    setBulkApproving(true)
    setError(null)
    try {
      await Promise.all(pending.map(c =>
        fetch('/api/queue', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: c.id, status: 'approved' }),
        })
      ))
      const fresh = await fetchQueue()
      setCreatives(fresh)
    } catch (err) { setError(String(err)) }
    finally { setBulkApproving(false) }
  }

  const legacyCount = creatives.filter(isLegacyMock).length
  const visible = hideLegacy ? creatives.filter(c => !isLegacyMock(c)) : creatives
  const counts = {
    pending: visible.filter(c => c.status === 'pending').length,
    approved: visible.filter(c => c.status === 'approved').length,
    rejected: visible.filter(c => c.status === 'rejected').length,
    all: visible.length,
  }
  const filtered = tab === 'all' ? visible : visible.filter(c => c.status === tab)

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Fila de Aprovação</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Decida o destino de cada criativo
          </p>
        </div>
        {legacyCount > 0 && (
          <button
            onClick={() => setHideLegacy(v => !v)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-all mt-1"
            style={hideLegacy ? {
              background: 'rgba(234,179,8,0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(234,179,8,0.3)',
            } : {
              background: 'var(--surface)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid var(--border)',
            }}>
            {hideLegacy ? `${legacyCount} legados ocultos` : 'Mostrar histórico'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {TAB_CFG.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-shrink-0 text-sm px-4 py-2 rounded-xl font-medium transition-all active:scale-95"
              style={active ? {
                background: 'rgba(255,107,53,0.15)',
                color: 'var(--brand)',
                border: '1px solid rgba(255,107,53,0.3)',
              } : {
                background: 'var(--surface)',
                color: 'rgba(255,255,255,0.45)',
                border: '1px solid var(--border)',
              }}>
              {t.label} <span className="ml-1 opacity-70">{counts[t.key]}</span>
            </button>
          )
        })}
      </div>

      {/* Bulk approve — only when multiple pending items */}
      {!loading && tab === 'pending' && counts.pending > 1 && (
        <button
          onClick={() => { void approveAll() }}
          disabled={bulkApproving}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
          {bulkApproving ? 'Aprovando todos...' : `Aprovar todos (${counts.pending})`}
        </button>
      )}

      {/* Honest AI notice for real pending creatives */}
      {!loading && tab === 'pending' && counts.pending > 0 && (
        <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.4)' }}>
          Rascunhos gerados com dados reais do produto (preço, nota, vendas, comissão). Revise cada item antes de aprovar — não use sem ler.
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold text-white">
            {tab === 'pending' ? 'Não há decisões pendentes' : 'Nenhum item neste estado'}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tab === 'pending' ? 'Adicione produtos em Produtos → Gerar Criativos.' : ''}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => {
          const product = c.campaigns?.products
          const isUpdating = updating === c.id
          const isExpanded = expanded === c.id
          const legacy = isLegacyMock(c)

          return (
            <div key={c.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Card header — always visible, tap to expand */}
              <button onClick={() => setExpanded(isExpanded ? null : c.id)}
                className="w-full text-left px-4 py-4 flex items-start gap-3 active:bg-white/5 transition-colors">
                {product?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'var(--surface-2)' }}><span className="w-5 h-5 rounded-md border" style={{ borderColor: 'rgba(255,255,255,0.35)' }} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{product?.title ?? '—'}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {legacy && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.25)' }}>
                          legado
                        </span>
                      )}
                      <Pill status={c.status} />
                    </div>
                  </div>
                  {product?.commission_rate && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {product.commission_rate}% comissão
                      {product.price ? ` · R$ ${product.price}` : ''}
                    </p>
                  )}
                  <p className="text-sm mt-1.5 text-white/80 line-clamp-2">
                    {c.hook ?? c.script?.slice(0, 80) ?? '—'}
                  </p>
                </div>
                <span className="text-white/30 flex-shrink-0 mt-1">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Expandable content */}
              {isExpanded && (
                <div className="px-4 pb-2 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="pt-3 space-y-3">
                    {c.hook && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--brand)' }}>ABERTURA</p>
                        <p className="text-sm text-white leading-relaxed">{c.hook}</p>
                      </div>
                    )}
                    {c.script && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#60a5fa' }}>ROTEIRO</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.script}</p>
                      </div>
                    )}
                    {c.caption && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#a78bfa' }}>LEGENDA</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.caption}</p>
                      </div>
                    )}
                    {c.cta && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: '#4ade80' }}>CHAMADA</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.cta}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons — always visible for pending */}
              {c.status === 'pending' && (
                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-2.5">
                  <button onClick={() => { void updateStatus(c.id, 'approved') }}
                    disabled={isUpdating}
                    className="py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                    {isUpdating ? 'Salvando…' : 'Aprovar'}
                  </button>
                  <button onClick={() => { void updateStatus(c.id, 'rejected') }}
                    disabled={isUpdating}
                    className="py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                    {isUpdating ? 'Salvando…' : 'Rejeitar'}
                  </button>
                </div>
              )}

              {c.status === 'approved' && (
                <div className="px-4 pb-4 pt-2">
                  <a href={`/video-factory?creativeId=${c.id}`}
                    className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={{ background: 'var(--brand)', color: '#fff' }}>
                    Gerar vídeo →
                  </a>
                </div>
              )}

              {c.status === 'rejected' && (
                <div className="px-4 pb-4 pt-2 flex gap-2.5">
                  <button onClick={() => { void regenerate(c.id) }}
                    disabled={regenerating === c.id}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.3)' }}>
                    {regenerating === c.id ? 'Gerando…' : 'Gerar nova versão'}
                  </button>
                  <button onClick={() => { void updateStatus(c.id, 'approved') }}
                    disabled={isUpdating}
                    className="py-3 px-4 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}>
                    Restaurar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
