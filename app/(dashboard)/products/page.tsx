'use client'

import { useState, useEffect, useCallback } from 'react'

interface ProductScore {
  overall_score: number
  recommendation: string
  commission_score: number
  demand_score: number
  visual_score: number
  impulse_score: number
  trust_score: number
  reasoning: string
  provider: string
  created_at: string
}

interface Product {
  id: string
  title: string
  price: number | null
  original_price: number | null
  image_url: string | null
  affiliate_url: string | null
  commission_rate: number
  extra_commission: number
  rating: number | null
  review_count: number
  sold_count: number
  category: string | null
  url: string | null
  marketplace: string | null
  created_at: string
  product_scores: ProductScore[]
}

interface ProductForm {
  title: string
  affiliateUrl: string
  commissionRate: string
  price: string
  // advanced
  originalPrice: string
  extraCommission: string
  imageUrl: string
  url: string
  category: string
  rating: string
  reviewCount: string
  soldCount: string
  description: string
}

const EMPTY_FORM: ProductForm = {
  title: '', affiliateUrl: '', commissionRate: '', price: '',
  originalPrice: '', extraCommission: '', imageUrl: '', url: '',
  category: '', rating: '', reviewCount: '', soldCount: '', description: '',
}

const REC_CFG: Record<string, { bg: string; color: string; border: string }> = {
  'TESTE IMEDIATAMENTE': { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  'VALE TESTAR':         { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'BAIXA PRIORIDADE':    { bg: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  'EVITAR':              { bg: 'rgba(248,113,113,0.10)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  const barColor = value >= 70 ? '#4ade80' : value >= 45 ? '#fbbf24' : '#f87171'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
        <span>{label}</span>
        <span style={{ color: barColor, fontWeight: 600 }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: barColor }} />
      </div>
    </div>
  )
}

function Input({
  label, hint, type = 'text', placeholder, value, onChange, required,
}: {
  label: string; hint?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: 'var(--brand)' }}>*</span>}
      </label>
      {hint && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{hint}</p>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      />
    </div>
  )
}

type TypeFilter = 'all' | 'affiliate' | 'owned'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [hideTest, setHideTest] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoring, setScoringId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /** Produtos com títulos de teste — ocultos da view comercial por padrão */
  const TEST_PATTERN = /^\[(TESTE|TEST)\]/i
  const isTestProduct = (p: Product) => TEST_PATTERN.test(p.title) || p.title === 'Produto Shopee'
  const withoutTests = hideTest ? products.filter(p => !isTestProduct(p)) : products
  const unsortedVisible = typeFilter === 'all'
    ? withoutTests
    : typeFilter === 'owned'
      ? withoutTests.filter(p => p.marketplace === 'owned')
      : withoutTests.filter(p => p.marketplace !== 'owned')

  // Sort: scored products by score desc, unscored at end
  const visibleProducts = [...unsortedVisible].sort((a, b) => {
    const sa = a.product_scores?.[0]?.overall_score ?? -1
    const sb = b.product_scores?.[0]?.overall_score ?? -1
    return sb - sa
  })
  const testCount = products.filter(isTestProduct).length
  const ownedCount = withoutTests.filter(p => p.marketplace === 'owned').length
  const affiliateCount = withoutTests.filter(p => p.marketplace !== 'owned').length

  const fetchProducts = useCallback((): Promise<Product[]> =>
    fetch('/api/products')
      .then(r => r.json() as Promise<{ products: Product[] }>)
      .then(d => d.products ?? [])
  , [])

  useEffect(() => {
    fetchProducts()
      .then(items => { setProducts(items); setLoading(false) })
      .catch(() => { setError('Erro ao carregar produtos'); setLoading(false) })
  }, [fetchProducts])

  const set = (key: keyof ProductForm) => (v: string) =>
    setForm(prev => ({ ...prev, [key]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          affiliateUrl: form.affiliateUrl || undefined,
          commissionRate: form.commissionRate ? parseFloat(form.commissionRate) : undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
          extraCommission: form.extraCommission ? parseFloat(form.extraCommission) : undefined,
          imageUrl: form.imageUrl || undefined,
          url: form.url || undefined,
          category: form.category || undefined,
          rating: form.rating ? parseFloat(form.rating) : undefined,
          reviewCount: form.reviewCount ? parseInt(form.reviewCount) : undefined,
          soldCount: form.soldCount ? parseInt(form.soldCount) : undefined,
          description: form.description || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error: string }
        throw new Error(err.error)
      }
      setForm(EMPTY_FORM)
      setShowAdvanced(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      await fetchProducts()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const [bulkScoring, setBulkScoring] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const handleScore = async (productId: string) => {
    setScoringId(productId)
    setError(null)
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) {
        const err = await res.json() as { error: string }
        throw new Error(err.error)
      }
      await fetchProducts()
    } catch (err) {
      setError(String(err))
    } finally {
      setScoringId(null)
    }
  }

  const handleBulkScore = async () => {
    const unscored = visibleProducts.filter(p => !p.product_scores?.length)
    if (unscored.length === 0) return
    setBulkScoring(true)
    setBulkProgress({ done: 0, total: unscored.length })
    setError(null)
    let done = 0
    for (const p of unscored) {
      try {
        await fetch('/api/score', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: p.id }),
        })
      } catch { /* continue */ }
      done++
      setBulkProgress({ done, total: unscored.length })
    }
    const fresh = await fetchProducts().catch(() => [] as Product[])
    setProducts(fresh)
    setBulkScoring(false)
    setBulkProgress(null)
  }

  const handleGenerateCreatives = async (productId: string) => {
    setGeneratingId(productId)
    setError(null)
    try {
      const res = await fetch('/api/creative', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (!res.ok) {
        const err = await res.json() as { error: string }
        throw new Error(err.error)
      }
      await fetchProducts()
    } catch (err) {
      setError(String(err))
    } finally {
      setGeneratingId(null)
    }
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Produtos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Analise produtos Shopee e gere criativos</p>
        </div>

        {error && (
          <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
            Produto adicionado! Clique em &quot;Analisar&quot; para gerar o score.
          </div>
        )}

        {/* Import Form */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold mb-4">Adicionar produto</h2>
          <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">

            {/* Essentials */}
            <Input
              label="Nome do produto"
              hint="Cole o título da página do Shopee"
              placeholder="Ex: Tênis Casual Masculino Premium"
              value={form.title}
              onChange={set('title')}
              required
            />
            <Input
              label="Link de afiliado"
              hint="Seu link gerado no Portal Shopee Affiliate (s.shopee.com.br/...)"
              placeholder="https://s.shopee.com.br/..."
              value={form.affiliateUrl}
              onChange={set('affiliateUrl')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Comissão (%)"
                hint="Taxa base"
                type="number"
                placeholder="8"
                value={form.commissionRate}
                onChange={set('commissionRate')}
              />
              <Input
                label="Preço (R$)"
                type="number"
                placeholder="49,90"
                value={form.price}
                onChange={set('price')}
              />
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-2 text-xs transition-colors py-1"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
              {showAdvanced ? 'Ocultar dados adicionais' : 'Dados adicionais (opcional)'}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Preço original (R$)"
                    hint="Antes do desconto"
                    type="number"
                    placeholder="79,90"
                    value={form.originalPrice}
                    onChange={set('originalPrice')}
                  />
                  <Input
                    label="Comissão extra (%)"
                    type="number"
                    placeholder="2"
                    value={form.extraCommission}
                    onChange={set('extraCommission')}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="Rating"
                    type="number"
                    placeholder="4.5"
                    value={form.rating}
                    onChange={set('rating')}
                  />
                  <Input
                    label="Avaliações"
                    type="number"
                    placeholder="1200"
                    value={form.reviewCount}
                    onChange={set('reviewCount')}
                  />
                  <Input
                    label="Vendidos"
                    type="number"
                    placeholder="5000"
                    value={form.soldCount}
                    onChange={set('soldCount')}
                  />
                </div>
                <Input
                  label="Categoria"
                  placeholder="Ex: Saúde e Beleza"
                  value={form.category}
                  onChange={set('category')}
                />
                <Input
                  label="URL da imagem"
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={set('imageUrl')}
                />
                <Input
                  label="URL do produto (Shopee)"
                  placeholder="https://shopee.com.br/..."
                  value={form.url}
                  onChange={set('url')}
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description')(e.target.value)}
                    placeholder="Informações adicionais sobre o produto..."
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] text-sm"
              style={{ background: 'var(--brand)' }}
            >
              {submitting ? 'Adicionando...' : '+ Adicionar produto'}
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Ou use a extensão Chrome — adiciona direto da página do Shopee
            </p>
          </form>
        </div>

        {/* Product List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Produtos ({visibleProducts.length})
            </h2>
            {testCount > 0 && (
              <button
                onClick={() => setHideTest(v => !v)}
                className="text-xs px-3 py-1 rounded-lg font-medium transition-all flex-shrink-0"
                style={hideTest ? {
                  background: 'rgba(234,179,8,0.12)',
                  color: '#fbbf24',
                  border: '1px solid rgba(234,179,8,0.25)',
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                {hideTest ? `${testCount} teste${testCount > 1 ? 's' : ''} oculto${testCount > 1 ? 's' : ''}` : 'Ocultar testes'}
              </button>
            )}
          </div>

          {/* Type filter — only show when there are owned products */}
          {ownedCount > 0 && (
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
              {([
                { key: 'all', label: 'Todos', count: withoutTests.length },
                { key: 'affiliate', label: 'Afiliado', count: affiliateCount },
                { key: 'owned', label: 'Próprio', count: ownedCount },
              ] as { key: TypeFilter; label: string; count: number }[]).map(t => (
                <button key={t.key} onClick={() => setTypeFilter(t.key)}
                  className="flex-shrink-0 text-xs px-3 py-2 rounded-xl font-medium transition-all active:scale-95"
                  style={typeFilter === t.key ? {
                    background: 'rgba(255,107,53,0.15)',
                    color: 'var(--brand)',
                    border: '1px solid rgba(255,107,53,0.3)',
                  } : {
                    background: 'var(--surface)',
                    color: 'rgba(255,255,255,0.45)',
                    border: '1px solid var(--border)',
                  }}>
                  {t.label} <span className="ml-1 opacity-60">{t.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Bulk score button */}
          {!loading && (() => {
            const unscoredCount = visibleProducts.filter(p => !p.product_scores?.length).length
            if (unscoredCount < 2) return null
            return (
              <div>
                {bulkProgress && (
                  <div className="mb-2">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, background: 'var(--brand)' }} />
                    </div>
                    <p className="text-xs mt-1 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Analisando {bulkProgress.done}/{bulkProgress.total}...
                    </p>
                  </div>
                )}
                <button
                  onClick={() => { void handleBulkScore() }}
                  disabled={bulkScoring}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.3)' }}>
                  {bulkScoring ? `Analisando...` : `Analisar todos sem score (${unscoredCount})`}
                </button>
              </div>
            )
          })()}

          {loading && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="h-4 rounded w-2/3 mb-2" style={{ background: 'var(--surface-2)' }} />
                  <div className="h-3 rounded w-1/3" style={{ background: 'var(--surface-2)' }} />
                </div>
              ))}
            </div>
          )}

          {!loading && visibleProducts.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {products.length > 0 && hideTest ? 'Apenas testes cadastrados' : 'Nenhum produto ainda'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {products.length > 0 && hideTest
                  ? 'Clique em "ocultos" acima para vê-los'
                  : 'Adicione acima ou instale a extensão Chrome'}
              </p>
            </div>
          )}

          {visibleProducts.map((product) => {
            const score = product.product_scores?.[0]
            const isScoring = scoring === product.id
            const isGenerating = generatingId === product.id
            const isExpanded = expanded === product.id

            return (
              <div key={product.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="p-4 flex gap-3">
                  {product.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white text-sm leading-snug line-clamp-2">{product.title}</h3>
                        {product.marketplace === 'owned' && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: 'rgba(255,107,53,0.18)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.3)' }}>
                            PRÓPRIO
                          </span>
                        )}
                      </div>
                      {score && (() => {
                        const rc = REC_CFG[score.recommendation]
                        return (
                          <div className="flex-shrink-0 text-xs px-2 py-1 rounded-lg font-bold"
                            style={rc
                              ? { background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }
                              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}>
                            {score.overall_score}
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {product.price && <span>R$ {Number(product.price).toFixed(2)}</span>}
                      {product.commission_rate > 0 && (
                        <span>
                          {Number(product.commission_rate)}%{product.extra_commission > 0 && `+${Number(product.extra_commission)}%`} comissão
                        </span>
                      )}
                      {product.rating && <span>{product.rating} nota</span>}
                      {product.sold_count > 0 && <span>{product.sold_count.toLocaleString('pt-BR')} vendidos</span>}
                    </div>
                    {score && (() => {
                      const rc = REC_CFG[score.recommendation]
                      return (
                        <div className="mt-2 text-xs px-2 py-0.5 rounded-md inline-block"
                          style={rc
                            ? { background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }
                            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                          {score.recommendation}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2 flex-wrap">
                  <button
                    onClick={() => { void handleScore(product.id) }}
                    disabled={isScoring}
                    className="flex-1 min-w-0 text-sm disabled:opacity-50 text-white px-3 py-2.5 rounded-xl transition-colors font-medium"
                    style={{ background: '#3b82f6' }}
                  >
                    {isScoring ? 'Analisando...' : score ? 'Re-analisar' : 'Analisar'}
                  </button>
                  {score && (
                    <>
                      <button
                        onClick={() => { void handleGenerateCreatives(product.id) }}
                        disabled={isGenerating}
                        className="flex-1 min-w-0 text-sm disabled:opacity-50 text-white px-3 py-2.5 rounded-xl transition-colors font-medium"
                        style={{ background: '#9333ea' }}
                      >
                        {isGenerating ? 'Gerando...' : 'Criativos'}
                      </button>
                      {score.overall_score >= 50 && (
                        <a
                          href={`/launch?productId=${product.id}`}
                          className="flex-shrink-0 text-sm px-3 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                          style={{ background: 'var(--brand)', color: '#fff' }}
                          title="Lançar no wizard"
                        >
                          Lançar
                        </a>
                      )}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : product.id)}
                        className="text-sm px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
                        style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.5)' }}
                        aria-label="Ver score detalhado"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </>
                  )}
                  {product.affiliate_url && (
                    <a
                      href={product.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-sm px-3 py-2.5 rounded-xl transition-colors"
                      style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.5)' }}
                      aria-label="Abrir link de afiliado"
                    >
                      ↗
                    </a>
                  )}
                </div>

                {/* Score Details */}
                {isExpanded && score && (
                  <div className="px-4 pb-4 border-t pt-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <ScoreBar value={score.commission_score} label="Comissão" />
                      <ScoreBar value={score.demand_score} label="Demanda" />
                      <ScoreBar value={score.visual_score} label="Visual" />
                      <ScoreBar value={score.impulse_score} label="Impulso" />
                      <ScoreBar value={score.trust_score} label="Confiança" />
                    </div>
                    {score.reasoning && (
                      <p className="text-xs rounded-xl p-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)' }}>
                        {score.reasoning}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
