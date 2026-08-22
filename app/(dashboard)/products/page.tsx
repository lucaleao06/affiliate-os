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
  commission_rate: number
  extra_commission: number
  rating: number | null
  review_count: number
  sold_count: number
  category: string | null
  url: string | null
  created_at: string
  product_scores: ProductScore[]
}

interface ProductForm {
  title: string
  price: string
  originalPrice: string
  imageUrl: string
  url: string
  category: string
  rating: string
  reviewCount: string
  soldCount: string
  commissionRate: string
  extraCommission: string
  description: string
}

const EMPTY_FORM: ProductForm = {
  title: '', price: '', originalPrice: '', imageUrl: '', url: '',
  category: '', rating: '', reviewCount: '', soldCount: '',
  commissionRate: '', extraCommission: '', description: '',
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [scoring, setScoringId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json() as { products: Product[] }
      setProducts(data.products ?? [])
    } catch {
      setError('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchProducts() }, [fetchProducts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
          imageUrl: form.imageUrl || undefined,
          url: form.url || undefined,
          category: form.category || undefined,
          rating: form.rating ? parseFloat(form.rating) : undefined,
          reviewCount: form.reviewCount ? parseInt(form.reviewCount) : undefined,
          soldCount: form.soldCount ? parseInt(form.soldCount) : undefined,
          commissionRate: form.commissionRate ? parseFloat(form.commissionRate) : undefined,
          extraCommission: form.extraCommission ? parseFloat(form.extraCommission) : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error: string }
        throw new Error(err.error)
      }
      setForm(EMPTY_FORM)
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

  const f = (key: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">🔍 Product Hunter</h1>
        <p className="text-gray-400 text-sm mt-1">Adicione produtos Shopee e analise o potencial de afiliado</p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Import Form */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-4">Importar Produto</h2>
        <form onSubmit={(e) => { void handleSubmit(e) }} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Título *</label>
            <input
              required value={form.title} onChange={f('title')}
              placeholder="Nome do produto Shopee"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Preço (R$)</label>
            <input type="number" step="0.01" value={form.price} onChange={f('price')}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Preço original (R$)</label>
            <input type="number" step="0.01" value={form.originalPrice} onChange={f('originalPrice')}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Comissão (%)</label>
            <input type="number" step="0.1" value={form.commissionRate} onChange={f('commissionRate')}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Comissão extra (%)</label>
            <input type="number" step="0.1" value={form.extraCommission} onChange={f('extraCommission')}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Rating (0-5)</label>
            <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={f('rating')}
              placeholder="4.5"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Avaliações</label>
            <input type="number" value={form.reviewCount} onChange={f('reviewCount')}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Vendidos</label>
            <input type="number" value={form.soldCount} onChange={f('soldCount')}
              placeholder="0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Categoria</label>
            <input value={form.category} onChange={f('category')}
              placeholder="Ex: Saúde e Beleza"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">URL da imagem</label>
            <input value={form.imageUrl} onChange={f('imageUrl')}
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">URL do produto</label>
            <input value={form.url} onChange={f('url')}
              placeholder="https://shopee.com.br/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <textarea value={form.description} onChange={f('description')}
              placeholder="Descrição do produto..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit" disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {submitting ? 'Adicionando...' : '+ Adicionar Produto'}
            </button>
          </div>
        </form>
      </div>

      {/* Product List */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">
          Produtos ({products.length})
        </h2>

        {loading && <p className="text-gray-500 text-sm">Carregando...</p>}

        {!loading && products.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
            <p className="text-gray-500 text-sm">Nenhum produto adicionado ainda.</p>
            <p className="text-gray-600 text-xs mt-1">Use o formulário acima para importar seu primeiro produto.</p>
          </div>
        )}

        {products.map((product) => {
          const score = product.product_scores?.[0]
          const isScoring = scoring === product.id
          const isGenerating = generatingId === product.id
          const isExpanded = expanded === product.id

          return (
            <div key={product.id} className="bg-gray-900 rounded-xl border border-gray-800">
              <div className="p-4 flex gap-4">
                {product.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-white text-sm leading-tight">{product.title}</h3>
                    {score && (
                      <div className={`flex-shrink-0 text-xs px-2 py-1 rounded border font-medium ${REC_COLOR[score.recommendation] ?? 'bg-gray-700 text-gray-300'}`}>
                        {score.overall_score}/100
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {product.price && <span>R$ {Number(product.price).toFixed(2)}</span>}
                    {product.commission_rate > 0 && <span>📊 {Number(product.commission_rate)}%+{Number(product.extra_commission)}%</span>}
                    {product.rating && <span>⭐ {product.rating}</span>}
                    {product.sold_count > 0 && <span>📦 {product.sold_count} vendidos</span>}
                  </div>
                  {score && (
                    <div className={`mt-2 text-xs px-2 py-0.5 rounded inline-block border ${REC_COLOR[score.recommendation] ?? ''}`}>
                      {score.recommendation} · {score.provider}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => { void handleScore(product.id) }}
                  disabled={isScoring}
                  className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {isScoring ? '⏳ Analisando...' : '🎯 Analisar Produto'}
                </button>
                {score && (
                  <>
                    <button
                      onClick={() => { void handleGenerateCreatives(product.id) }}
                      disabled={isGenerating}
                      className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isGenerating ? '⏳ Gerando...' : '✨ Gerar Criativos'}
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : product.id)}
                      className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isExpanded ? 'Fechar' : 'Ver Score'}
                    </button>
                  </>
                )}
              </div>

              {/* Score Details */}
              {isExpanded && score && (
                <div className="px-4 pb-4 border-t border-gray-800 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <ScoreBar value={score.commission_score} label="Comissão" />
                    <ScoreBar value={score.demand_score} label="Demanda" />
                    <ScoreBar value={score.visual_score} label="Visual" />
                    <ScoreBar value={score.impulse_score} label="Impulso" />
                    <ScoreBar value={score.trust_score} label="Confiança" />
                  </div>
                  {score.reasoning && (
                    <p className="text-xs text-gray-400 bg-gray-800/50 rounded p-2">{score.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
