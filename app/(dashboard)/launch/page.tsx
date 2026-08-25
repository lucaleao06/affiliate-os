'use client'

/**
 * /launch — "LANÇAR CAMPANHA" guided wizard.
 * Single-page, no multi-screen navigation.
 * Steps: 1. Produto → 2. Score → 3. Criativos → 4. Storyboard → 5. Render → 6. Distribuir
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Step = 'product' | 'score' | 'creative' | 'storyboard' | 'render' | 'distribute'

interface Product { id: string; title: string; price: number; commission_rate: number; affiliate_url: string }
interface ExistingProduct { id: string; title: string; price: number | null; commission_rate: number | null; marketplace: string | null }
interface Score { overallScore: number; recommendation: string; reasoning: string }
interface Creative { id: string; hook: string; caption: string; cta: string; angle: string }
interface Storyboard { scenes: Array<{ visual: string; text_overlay: string; voiceover: string; duration: string }> }
interface RenderResult { filename: string; downloadUrl: string; durationSec: number; fileSizeBytes: number }

const STEPS: Step[] = ['product', 'score', 'creative', 'storyboard', 'render', 'distribute']
function LaunchPageInner() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('product')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState(false)

  // Existing products for quick-select
  const [existingProducts, setExistingProducts] = useState<ExistingProduct[]>([])
  const [showExisting, setShowExisting] = useState(false)
  const [radarTopIds, setRadarTopIds] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then((d: { products?: ExistingProduct[] }) => {
        const list = (d.products ?? []).filter(p =>
          !p.title.startsWith('[TESTE]') && !p.title.startsWith('[TEST]') && p.title !== 'Produto Shopee'
        )
        setExistingProducts(list)
      })
      .catch(() => null)
    // Load radar top IDs in parallel
    fetch('/api/radar')
      .then(r => r.json() as Promise<{ opportunities: Array<{ id: string; tier: string }> }>)
      .then(d => {
        const ids = (d.opportunities ?? [])
          .filter(o => o.tier === 'now' || o.tier === 'test')
          .slice(0, 3)
          .map(o => o.id)
        setRadarTopIds(ids)
      })
      .catch(() => null)
  }, [])

  // Data across steps
  const [productForm, setProductForm] = useState({
    name: '', price: '', commission_rate: '8', affiliate_url: '', category: 'electronics', description: '',
  })
  const [product, setProduct] = useState<Product | null>(null)
  const [score, setScore] = useState<Score | null>(null)
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null)
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null)
  const [channel, setChannel] = useState<string>('instagram')
  const [autoSelected, setAutoSelected] = useState(false)

  // Auto-select product when ?productId= is in URL (from /products "Lançar" button).
  // The updates are queued after the effect to keep React's render cycle stable.
  useEffect(() => {
    if (autoSelected || existingProducts.length === 0) return
    const pid = searchParams.get('productId')
    const match = pid ? existingProducts.find(p => p.id === pid) : null
    if (!match) return
    queueMicrotask(() => {
      setProduct(match as unknown as Product)
      setStep('score')
      setAutoSelected(true)
    })
  }, [existingProducts, searchParams, autoSelected])

  const stepIdx = STEPS.indexOf(step)
  const progressPct = ((stepIdx + 1) / STEPS.length) * 100

  async function api(path: string, body: unknown) {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json() as Record<string, unknown>
    if (!res.ok) throw new Error((data.error as string) ?? `${res.status}`)
    return data
  }

  async function handleCreateProduct() {
    if (!productForm.name || !productForm.affiliate_url) {
      setError('Nome e URL de afiliado são obrigatórios'); return
    }
    setBusy(true); setError(null)
    try {
      const data = await api('/api/products', {
        title: productForm.name,
        price: parseFloat(productForm.price) || 0,
        commissionRate: parseFloat(productForm.commission_rate) || 0,
        affiliateUrl: productForm.affiliate_url,
        category: productForm.category,
        description: productForm.description,
      })
      setProduct(data.product as Product)
      setStep('score')
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  async function handleScore() {
    if (!product) return
    setBusy(true); setError(null)
    try {
      const data = await api('/api/score', {
        productId: product.id,
      })
      setScore(data.score as Score)
      setStep('creative')
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  async function handleGenerateCreatives() {
    if (!product) return
    setBusy(true); setError(null)
    try {
      const data = await api('/api/creative', { productId: product.id })
      const list = (data.creatives as Creative[]) ?? []
      setCreatives(list)
      if (list.length > 0) setSelectedCreative(list[0])
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  async function handleApproveCreative() {
    if (!selectedCreative) return
    setBusy(true); setError(null)
    try {
      await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: selectedCreative.id, status: 'approved' }),
      })
      setStep('storyboard')
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  async function handleStoryboard() {
    if (!selectedCreative) return
    setBusy(true); setError(null)
    try {
      const data = await api('/api/video-factory', { creativeId: selectedCreative.id })
      setStoryboard(data.storyboard as Storyboard)
      setStep('render')
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  async function handleRender() {
    if (!selectedCreative) return
    setBusy(true); setError(null)
    try {
      const data = await api('/api/video-factory/render', { creativeId: selectedCreative.id })
      setRenderResult({
        filename: data.filename as string,
        downloadUrl: data.downloadUrl as string,
        durationSec: data.durationSec as number,
        fileSizeBytes: data.fileSizeBytes as number,
      })
      setStep('distribute')
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  async function handlePublish() {
    if (!selectedCreative || !renderResult) return
    setBusy(true); setError(null)
    try {
      // Create publication package
      const pkgData = await api('/api/publish', {
        action: 'create',
        creativeId: selectedCreative.id,
        channel,
        downloadUrl: `${window.location.origin}${renderResult.downloadUrl}`,
        videoPath: renderResult.downloadUrl,
        videoFilename: renderResult.filename,
        durationSec: renderResult.durationSec,
        fileSizeBytes: renderResult.fileSizeBytes,
        width: 1080, height: 1920, codec: 'h264',
        rightsStatus: 'generated',
      })
      const pkgId = (pkgData.package as { id: string })?.id

      // Trigger publish
      await api('/api/publish', { action: 'publish', packageId: pkgId, channel })
      setError(null)
      setPublishSuccess(true)
    } catch (e) { setError(String(e)) }
    setBusy(false)
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header + progress */}
      <div className="pt-2">
        <h1 className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>
          Lançar Campanha
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Produto real → vídeo pronto para publicar, em {STEPS.length} etapas
        </p>
      </div>

      {/* Step breadcrumb */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 min-w-0">
            <div className={`flex items-center justify-center text-[10px] font-bold rounded-full w-5 h-5 shrink-0 transition-all ${
              i < stepIdx ? 'text-white' : i === stepIdx ? 'text-white' : 'opacity-30'
            }`}
              style={{
                background: i < stepIdx ? '#22c55e' : i === stepIdx ? 'var(--brand)' : 'rgba(255,255,255,0.12)',
              }}>
              {i < stepIdx ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 min-w-[8px] rounded-full"
                style={{ background: i < stepIdx ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--brand)' }} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* ── STEP: PRODUCT ── */}
      {step === 'product' && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Produto</h2>

          {/* Radar top picks */}
          {radarTopIds.length > 0 && (() => {
            const picks = existingProducts.filter(p => radarTopIds.includes(p.id))
            if (picks.length === 0) return null
            return (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--brand)' }}>
                  Radar recomenda
                </p>
                {picks.map(p => (
                  <button key={p.id}
                    onClick={() => { setProduct(p as unknown as Product); setStep('score') }}
                    className="w-full text-left px-3 py-3 rounded-xl flex items-center justify-between transition-all active:scale-[0.98]"
                    style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.22)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{p.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {p.commission_rate ? `${p.commission_rate}% comissão` : '—'}
                        {p.price ? ` · R$ ${Number(p.price).toFixed(2)}` : ''}
                      </p>
                    </div>
                    <span className="text-xs ml-3 font-bold flex-shrink-0" style={{ color: 'var(--brand)' }}>Lançar →</span>
                  </button>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>ou escolha outro</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>
              </div>
            )
          })()}

          {/* Quick-select from existing products */}
          {existingProducts.length > 0 && (
            <div>
              <button
                onClick={() => setShowExisting(v => !v)}
                className="w-full text-left text-xs py-2 px-3 rounded-lg flex items-center justify-between transition-all"
                style={{ background: 'rgba(255,107,53,0.08)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.2)' }}>
                <span>Usar produto existente ({existingProducts.length})</span>
                <span>{showExisting ? '▲' : '▼'}</span>
              </button>
              {showExisting && (
                <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {existingProducts.slice(0, 8).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProduct(p as unknown as Product)
                        setShowExisting(false)
                        setStep('score')
                      }}
                      className="w-full text-left px-4 py-3 flex items-center justify-between transition-all active:scale-95"
                      style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {p.price ? `R$ ${Number(p.price).toFixed(2)}` : '—'}
                          {p.commission_rate ? ` · ${p.commission_rate}% comissão` : ''}
                          {p.marketplace === 'owned' ? ' · PRÓPRIO' : ''}
                        </p>
                      </div>
                      <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--brand)' }}>Usar →</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>ou adicione novo</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Nome do produto *</label>
              <input
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Ex: Fone Bluetooth Pro Max"
                value={productForm.name}
                onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Preço (R$)</label>
                <input
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="89.90"
                  type="number"
                  value={productForm.price}
                  onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Comissão (%)</label>
                <input
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="8"
                  type="number"
                  value={productForm.commission_rate}
                  onChange={e => setProductForm(p => ({ ...p, commission_rate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>URL de afiliado (Shopee/Amazon) *</label>
              <input
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="https://s.shopee.com.br/..."
                value={productForm.affiliate_url}
                onChange={e => setProductForm(p => ({ ...p, affiliate_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Descrição (opcional)</label>
              <textarea
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Descreva o produto..."
                rows={2}
                value={productForm.description}
                onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <button
            onClick={handleCreateProduct}
            disabled={busy}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
            style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Salvando...' : 'Salvar produto →'}
          </button>
        </div>
      )}

      {/* ── STEP: SCORE ── */}
      {step === 'score' && product && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Score do produto</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {product.title} — R$ {product.price} · {Number(product.commission_rate).toFixed(1)}% comissão
          </p>

          {!score ? (
            <button
              onClick={handleScore}
              disabled={busy}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Analisando com IA...' : 'Analisar agora →'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-black"
                  style={{ color: score.overallScore >= 70 ? '#22c55e' : score.overallScore >= 50 ? '#eab308' : '#ef4444' }}>
                  {score.overallScore}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>/100</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{score.recommendation}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{score.reasoning}</p>
              <button
                onClick={() => setStep('creative')}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: score.overallScore >= 50 ? 'var(--brand)' : 'rgba(255,255,255,0.1)', color: '#fff' }}>
                {score.overallScore >= 50 ? 'Gerar criativos →' : 'Continuar mesmo assim →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: CREATIVE ── */}
      {step === 'creative' && product && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Criativo</h2>

          {creatives.length === 0 ? (
            <button
              onClick={handleGenerateCreatives}
              disabled={busy}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Gerando com IA...' : 'Gerar 3 criativos →'}
            </button>
          ) : (
            <div className="space-y-3">
              {creatives.map(c => (
                <div key={c.id}
                  onClick={() => setSelectedCreative(c)}
                  className="rounded-xl p-4 cursor-pointer transition-all active:scale-95"
                  style={{
                    border: selectedCreative?.id === c.id
                      ? '2px solid var(--brand)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: selectedCreative?.id === c.id ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)',
                  }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,107,53,0.7)' }}>
                    {c.angle || 'Variação'}
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{c.hook}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.caption?.slice(0, 60)}…</p>
                </div>
              ))}
              <button
                onClick={handleApproveCreative}
                disabled={busy || !selectedCreative}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'var(--brand)', color: '#fff', opacity: (busy || !selectedCreative) ? 0.7 : 1 }}>
                {busy ? 'Aprovando...' : `Aprovar selecionado →`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: STORYBOARD ── */}
      {step === 'storyboard' && selectedCreative && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Storyboard</h2>

          {!storyboard ? (
            <button
              onClick={handleStoryboard}
              disabled={busy}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Gerando storyboard...' : 'Gerar storyboard →'}
            </button>
          ) : (
            <div className="space-y-3">
              {storyboard.scenes.map((sc, i) => (
                <div key={i} className="rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--brand)', color: '#fff' }}>
                      C{i + 1}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{sc.visual}</span>
                    <span className="text-[10px] ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>{sc.duration}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{sc.text_overlay?.slice(0, 80)}</p>
                </div>
              ))}
              <button
                onClick={() => setStep('render')}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                Renderizar vídeo →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: RENDER ── */}
      {step === 'render' && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Renderizar MP4</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            1080×1920 · H.264 · FFmpeg arm64
          </p>

          {!renderResult ? (
            <button
              onClick={handleRender}
              disabled={busy}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                  Renderizando (30-60s)…
                </span>
              ) : 'Renderizar →'}
            </button>
          ) : (
            <div className="space-y-3">
              <video
                src={renderResult.downloadUrl}
                className="w-full rounded-xl"
                style={{ maxHeight: '320px', aspectRatio: '9/16', objectFit: 'cover' }}
                controls muted playsInline
              />
              <div className="flex gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>{renderResult.durationSec.toFixed(1)}s</span>
                <span>·</span>
                <span>{(renderResult.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                <span>·</span>
                <span>9:16</span>
              </div>
              <a href={renderResult.downloadUrl} download={renderResult.filename}
                className="block text-center py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                Baixar MP4
              </a>
              <button
                onClick={() => setStep('distribute')}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'var(--brand)', color: '#fff' }}>
                Distribuir →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: DISTRIBUTE ── */}
      {step === 'distribute' && renderResult && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Distribuir</h2>

          {/* Channel picker */}
          <div className="space-y-2">
            {[
              { key: 'instagram', label: 'Instagram Reels', tag: 'IG' },
              { key: 'youtube_shorts', label: 'YouTube Shorts', tag: 'YT' },
              { key: 'manual', label: 'Manual / Shopee', tag: 'SH' },
            ].map(ch => (
              <div key={ch.key}
                onClick={() => setChannel(ch.key)}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-95"
                style={{
                  border: channel === ch.key ? '2px solid var(--brand)' : '1px solid rgba(255,255,255,0.1)',
                  background: channel === ch.key ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.03)',
                }}>
                <span className="text-[10px] font-bold w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{ch.tag}</span>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{ch.label}</span>
                {channel === ch.key && <span className="ml-auto" style={{ color: 'var(--brand)' }}>✓</span>}
              </div>
            ))}
          </div>

          {/* Caption preview */}
          {selectedCreative && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Legenda prévia</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {selectedCreative.caption?.slice(0, 120)}…
              </p>
            </div>
          )}

          {publishSuccess ? (
            <div className="rounded-xl p-4 text-center space-y-3"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="font-bold text-sm" style={{ color: '#22c55e' }}>Publicação enviada</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Acompanhe o status em Distribuição.</p>
              <a href="/distribute"
                className="block py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                Ver em Distribuição →
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePublish}
                disabled={busy}
                className="py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'var(--brand)', color: '#fff', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Publicando...' : 'Publicar'}
              </button>
              <a href="/distribute"
                className="flex items-center justify-center py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                Ver Distribuição
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LaunchPage() {
  return (
    <Suspense>
      <LaunchPageInner />
    </Suspense>
  )
}
