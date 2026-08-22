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

const REC_COLOR: Record<string, string> = {
  'TESTE IMEDIATAMENTE': 'bg-green-500/20 text-green-400 border-green-500/30',
  'VALE TESTAR': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'BAIXA PRIORIDADE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'EVITAR': 'bg-red-500/20 text-red-400 border-red-500/30',
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full">
        <div
          className={`h-full rounded-full ${value >= 70 ? 'bg-green-500' : value >= 45 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${value}%` }}
        />
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
      <label className="block text-sm font-medium text-gray-300">
        {label}{required && <span className="text-orange-400 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
      />
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoring, setScoringId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">🔍 Product Hunter</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analise produtos Shopee e gere criativos</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl p-3 text-sm">
            ✅ Produto adicionado! Clique em &quot;Analisar&quot; para gerar o score.
          </div>
        )}

        {/* Import Form */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
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
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors py-1"
            >
              <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
              {showAdvanced ? 'Ocultar dados adicionais' : 'Dados adicionais (opcional)'}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1 border-t border-gray-800">
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
                  <label className="block text-sm font-medium text-gray-300">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description')(e.target.value)}
                    placeholder="Informações adicionais sobre o produto..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {submitting ? 'Adicionando...' : '+ Adicionar produto'}
            </button>

            <p className="text-center text-xs text-gray-600">
              Ou use a extensão Chrome — adiciona direto da página do Shopee
            </p>
          </form>
        </div>

        {/* Product List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Produtos ({products.length})
          </h2>

          {loading && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 animate-pulse">
                  <div className="h-4 bg-gray-800 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
              <p className="text-3xl mb-3">🎯</p>
              <p className="text-gray-400 text-sm font-medium">Nenhum produto ainda</p>
              <p className="text-gray-600 text-xs mt-1">
                Adicione acima ou instale a extensão Chrome
              </p>
            </div>
          )}

          {products.map((product) => {
            const score = product.product_scores?.[0]
            const isScoring = scoring === product.id
            const isGenerating = generatingId === product.id
            const isExpanded = expanded === product.id

            return (
              <div key={product.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
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
                      {score && (
                        <div className={`flex-shrink-0 text-xs px-2 py-1 rounded-lg border font-bold ${REC_COLOR[score.recommendation] ?? 'bg-gray-700 text-gray-300'}`}>
                          {score.overall_score}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-400">
                      {product.price && <span>R$ {Number(product.price).toFixed(2)}</span>}
                      {product.commission_rate > 0 && (
                        <span>
                          📊 {Number(product.commission_rate)}%
                          {product.extra_commission > 0 && `+${Number(product.extra_commission)}%`}
                        </span>
                      )}
                      {product.rating && <span>⭐ {product.rating}</span>}
                      {product.sold_count > 0 && <span>{product.sold_count.toLocaleString('pt-BR')} vendidos</span>}
                    </div>
                    {score && (
                      <div className={`mt-2 text-xs px-2 py-0.5 rounded-md inline-block border ${REC_COLOR[score.recommendation] ?? ''}`}>
                        {score.recommendation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2 flex-wrap">
                  <button
                    onClick={() => { void handleScore(product.id) }}
                    disabled={isScoring}
                    className="flex-1 min-w-0 text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white px-3 py-2.5 rounded-xl transition-colors font-medium"
                  >
                    {isScoring ? '⏳ Analisando...' : '🎯 Analisar'}
                  </button>
                  {score && (
                    <>
                      <button
                        onClick={() => { void handleGenerateCreatives(product.id) }}
                        disabled={isGenerating}
                        className="flex-1 min-w-0 text-sm bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white px-3 py-2.5 rounded-xl transition-colors font-medium"
                      >
                        {isGenerating ? '⏳ Gerando...' : '✨ Criativos'}
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : product.id)}
                        className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2.5 rounded-xl transition-colors"
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
                      className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2.5 rounded-xl transition-colors"
                      aria-label="Abrir link de afiliado"
                    >
                      🔗
                    </a>
                  )}
                </div>

                {/* Score Details */}
                {isExpanded && score && (
                  <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <ScoreBar value={score.commission_score} label="Comissão" />
                      <ScoreBar value={score.demand_score} label="Demanda" />
                      <ScoreBar value={score.visual_score} label="Visual" />
                      <ScoreBar value={score.impulse_score} label="Impulso" />
                      <ScoreBar value={score.trust_score} label="Confiança" />
                    </div>
                    {score.reasoning && (
                      <p className="text-xs text-gray-400 bg-gray-800/50 rounded-xl p-3 leading-relaxed">
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
