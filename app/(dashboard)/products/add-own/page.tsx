'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface OwnedProductForm {
  title: string
  description: string
  price: string
  cost: string
  checkout_url: string
  category: string
  imageUrl: string
  platform: string
}

const PLATFORMS = [
  { value: 'hotmart', label: 'Hotmart' },
  { value: 'kiwify', label: 'Kiwify' },
  { value: 'eduzz', label: 'Eduzz' },
  { value: 'monetizze', label: 'Monetizze' },
  { value: 'gumroad', label: 'Gumroad' },
  { value: 'manual', label: 'Outro' },
]

const CATEGORIES = [
  'E-book', 'Curso', 'Mentoria', 'Template', 'Preset',
  'Planilha', 'Pack de artes', 'Audiobook', 'Outros',
]

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold mb-2 uppercase tracking-wider"
      style={{ color: 'rgba(255,255,255,0.45)' }}>
      {children}
      {optional && (
        <span className="normal-case font-normal tracking-normal"
          style={{ color: 'rgba(255,255,255,0.2)' }}>opcional</span>
      )}
    </label>
  )
}

const inputStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: '#fff',
}
const inputFocusColor = 'rgba(255,107,53,0.5)'

function TextInput({
  value, onChange, placeholder, type = 'text', prefix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  prefix?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative flex items-center rounded-xl overflow-hidden transition"
      style={{ ...inputStyle, border: `1px solid ${focused ? inputFocusColor : 'var(--border)'}` }}>
      {prefix && (
        <span className="pl-3 pr-1 text-sm select-none" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 px-3 py-3 text-sm bg-transparent outline-none min-h-[44px] placeholder-gray-600"
      />
    </div>
  )
}

function Select({ value, onChange, children }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={inputStyle}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-3 text-sm bg-transparent outline-none min-h-[44px]"
        style={{ color: value ? '#fff' : 'rgba(255,255,255,0.3)' }}
      >
        {children}
      </select>
    </div>
  )
}

function calcMargin(price: string, cost: string): { pct: string; value: string; color: string } {
  const p = parseFloat(price)
  const c = parseFloat(cost) || 0
  if (!p || p <= 0) return { pct: '—', value: '—', color: 'rgba(255,255,255,0.3)' }
  if (c <= 0) return { pct: '100%', value: `R$ ${p.toFixed(2).replace('.', ',')}`, color: '#4ade80' }
  const m = ((p - c) / p) * 100
  const net = p - c
  const color = m >= 70 ? '#4ade80' : m >= 40 ? '#fbbf24' : '#f87171'
  return {
    pct: `${m.toFixed(0)}%`,
    value: `R$ ${net.toFixed(2).replace('.', ',')}`,
    color,
  }
}

export default function AddOwnProductPage() {
  const router = useRouter()
  const [form, setForm] = useState<OwnedProductForm>({
    title: '', description: '', price: '', cost: '',
    checkout_url: '', category: '', imageUrl: '', platform: 'hotmart',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [done, setDone] = useState(false)

  function set(key: keyof OwnedProductForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const margin = calcMargin(form.price, form.cost)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Informe o título do produto'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setError('Informe um preço válido'); return }
    if (!form.checkout_url.trim()) { setError('Informe a URL de compra'); return }
    if (!form.checkout_url.startsWith('http')) {
      setError('A URL de compra deve começar com http:// ou https://'); return
    }

    setSaving(true)
    setError(null)
    setMigrationRequired(false)

    const price = parseFloat(form.price)
    const cost = form.cost ? parseFloat(form.cost) : 0
    const marginPct = price > 0 ? ((price - cost) / price) * 100 : 100

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          price,
          originalPrice: price,
          imageUrl: form.imageUrl.trim() || undefined,
          url: form.checkout_url.trim(),
          affiliateUrl: form.checkout_url.trim(),
          checkout_url: form.checkout_url.trim(),
          category: form.category || 'E-book',
          seller: form.platform,
          reviewCount: 0,
          soldCount: 0,
          commissionRate: 100,
          extraCommission: 0,
          product_type: 'owned',
          cost: cost > 0 ? cost : null,
          margin_pct: marginPct,
          marketplace: 'owned',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.migration_required) {
          setMigrationRequired(true)
          setError(null)
        } else {
          setError(json.error ?? 'Erro ao salvar o produto')
        }
        return
      }
      setDone(true)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // ── Migration not applied ──────────────────────────────────────────────
  if (migrationRequired) {
    return (
      <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
          <div className="text-4xl text-center">⚙️</div>
          <h2 className="text-xl font-bold text-center">Atualização necessária</h2>
          <div className="rounded-xl p-5 text-sm space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              Para usar produtos próprios, execute a migration 005 no Supabase:
            </p>
            <ol className="space-y-2 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <li>1. Abra o <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Supabase Dashboard</strong> → SQL Editor</li>
              <li>2. Cole o conteúdo de <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>supabase/005_owned_products.sql</code></li>
              <li>3. Clique em <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Run</strong> e volte aqui</li>
            </ol>
          </div>
          <button
            onClick={() => setMigrationRequired(false)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold transition active:scale-95"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)' }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--bg)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)' }}>
          ✅
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Produto adicionado</h2>
        <p className="text-sm mb-8 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Disponível para score, criativos e distribuição — mesmo pipeline dos afiliados.
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push('/launch')}
            className="flex-1 py-3.5 rounded-xl text-sm font-bold transition active:scale-95"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            Lançar campanha →
          </button>
          <button
            onClick={() => {
              setDone(false)
              setForm({ title: '', description: '', price: '', cost: '', checkout_url: '', category: '', imageUrl: '', platform: 'hotmart' })
            }}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition active:scale-95"
            style={{ border: '1px solid var(--border)', color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
          >
            + Outro
          </button>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6 pb-10">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => router.back()}
            className="text-sm mb-4 flex items-center gap-1 min-h-[44px]"
            style={{ color: 'rgba(255,255,255,0.3)' }}>
            ← Voltar
          </button>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
            Produto Próprio
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            E-book, curso, template ou qualquer produto digital seu
          </p>
        </div>

        {/* Pipeline info */}
        <div className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.13)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ color: 'var(--brand)' }}>📦 Pipeline idêntico ao afiliado:</span>{' '}
            score → criativo → vídeo → distribuição → receita. Margem real calculada aqui.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <FieldLabel>Nome do produto</FieldLabel>
            <TextInput
              value={form.title}
              onChange={v => set('title', v)}
              placeholder="Ex: E-book Renda com Afiliados"
            />
          </div>

          {/* Category + Platform */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel optional>Categoria</FieldLabel>
              <Select value={form.category} onChange={v => set('category', v)}>
                <option value="">Tipo de produto</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel>Plataforma</FieldLabel>
              <Select value={form.platform} onChange={v => set('platform', v)}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
          </div>

          {/* Price + Cost */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Preço de venda</FieldLabel>
                <TextInput
                  value={form.price}
                  onChange={v => set('price', v)}
                  placeholder="97,00"
                  type="number"
                  prefix="R$"
                />
              </div>
              <div>
                <FieldLabel optional>Custo / taxa</FieldLabel>
                <TextInput
                  value={form.cost}
                  onChange={v => set('cost', v)}
                  placeholder="0,00"
                  type="number"
                  prefix="R$"
                />
              </div>
            </div>

            {/* Margin preview */}
            {form.price && (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Sua margem</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: margin.color }}>
                    {margin.pct}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Receita líquida</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: margin.color }}>
                    {margin.value}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Checkout URL */}
          <div>
            <FieldLabel>Link de compra</FieldLabel>
            <TextInput
              value={form.checkout_url}
              onChange={v => set('checkout_url', v)}
              placeholder="https://pay.hotmart.com/..."
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Este link vai no CTA dos seus vídeos e criativos
            </p>
          </div>

          {/* Description */}
          <div>
            <FieldLabel optional>Descrição</FieldLabel>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="O que o cliente recebe ao comprar..."
              rows={3}
              className="w-full px-3 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', minHeight: 80 }}
              onFocus={e => (e.currentTarget.style.borderColor = inputFocusColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Image URL */}
          <div>
            <FieldLabel optional>Imagem / capa</FieldLabel>
            <TextInput
              value={form.imageUrl}
              onChange={v => set('imageUrl', v)}
              placeholder="https://..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-sm transition active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--brand)', color: '#fff', minHeight: 52 }}
          >
            {saving ? 'Salvando...' : 'Adicionar produto →'}
          </button>

        </form>

        {/* Próximos passos */}
        <div className="mt-8 rounded-xl p-4 text-xs space-y-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="font-semibold text-[11px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>
            O que acontece depois
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)' }}>
            1. Produto aparece em <strong style={{ color: 'rgba(255,255,255,0.65)' }}>/products</strong> com badge <strong style={{ color: 'var(--brand)' }}>PRÓPRIO</strong>
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)' }}>
            2. <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Lançar campanha</strong> → selecione o produto → score + criativo + vídeo
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)' }}>
            3. Receita em <strong style={{ color: 'rgba(255,255,255,0.65)' }}>/revenue</strong> com sua margem real
          </p>
        </div>

      </div>
    </div>
  )
}
