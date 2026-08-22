'use client'

import { useState, useRef } from 'react'

interface ImportPreview {
  columns: string[]
  totalRows: number
  totalCommission: number
  sample: Array<{
    order_id?: string
    occurred_at?: string
    product_name?: string
    commission_value?: number
    status?: string
    raw: Record<string, string>
  }>
  warnings: string[]
}

interface ImportResult {
  batchId: string
  filename: string
  totalRows: number
  imported: number
  skipped: number
  errors: number
  status: string
  warnings: string[]
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function SalesImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [filename, setFilename] = useState<string | null>(null)
  const [csvText, setCsvText] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')

  async function handleFile(file: File) {
    setError(null)
    setPreview(null)
    setResult(null)
    setFilename(file.name)
    const text = await file.text()
    setCsvText(text)
    // Get preview
    const res = await fetch('/api/sales/import?preview=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText: text, filename: file.name }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Erro ao processar CSV'); return }
    setPreview(json.preview)
    setStep('preview')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function confirmImport() {
    if (!csvText || !filename) return
    setImporting(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', new Blob([csvText], { type: 'text/csv' }), filename)
      const res = await fetch('/api/sales/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao importar'); return }
      setResult(json as ImportResult)
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep('upload')
    setPreview(null)
    setResult(null)
    setCsvText(null)
    setFilename(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1">Importar Relatório</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>CSV do Shopee Affiliate Portal</p>

        {step === 'upload' && (
          <div>
            <div
              className="rounded-2xl border-2 border-dashed transition-colors p-10 text-center cursor-pointer"
              style={{
                borderColor: dragging ? 'rgba(255,107,53,0.6)' : 'rgba(255,255,255,0.12)',
                background: dragging ? 'rgba(255,107,53,0.06)' : 'transparent',
              }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📄</div>
              <p className="font-medium text-white">Arraste o CSV do Shopee aqui</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>ou clique para selecionar · somente .csv ou .tsv</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            <div className="mt-4 rounded-xl p-4 text-xs space-y-1 leading-relaxed" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'rgba(255,255,255,0.52)' }}>
              <p className="font-medium" style={{ color: 'rgba(255,255,255,0.76)' }}>Como exportar do Shopee Affiliate:</p>
              <p>1. Acesse affiliate.shopee.com.br</p>
              <p>2. Menu Relatórios → Relatório de Comissões</p>
              <p>3. Selecione o período e clique em Exportar CSV</p>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">{filename}</p>
                <button onClick={reset} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>✕ Cancelar</button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{preview.totalRows}</p>
                  <p className="text-xs text-gray-500">linhas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{fmt(preview.totalCommission)}</p>
                  <p className="text-xs text-gray-500">comissão total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{preview.columns.length}</p>
                  <p className="text-xs text-gray-500">colunas</p>
                </div>
              </div>
            </div>

            {preview.warnings.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-3">
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-400">⚠ {w}</p>
                ))}
              </div>
            )}

            {/* Column mapping */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-2 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Colunas detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.columns.map(c => (
                  <span key={c} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>{c}</span>
                ))}
              </div>
            </div>

            {/* Sample rows */}
            {preview.sample.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-3 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Prévia (5 linhas)</p>
                <div className="space-y-2">
                  {preview.sample.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs pb-2 last:pb-0" style={{ borderBottom: i < preview.sample.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span className="w-4" style={{ color: 'rgba(255,255,255,0.2)' }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{row.product_name ?? '—'}</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)' }}>{row.order_id} · {row.occurred_at?.slice(0, 10)} · {row.status}</p>
                      </div>
                      <span className="flex-shrink-0 font-semibold text-emerald-400">
                        {fmt(row.commission_value ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                style={{ border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                style={{ background: 'var(--brand)', color: '#fff' }}
              >
                {importing ? 'Importando...' : `Importar ${preview.totalRows} linhas`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="rounded-2xl p-6 text-center"
              style={result.status === 'completed'
                ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }
                : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="text-4xl mb-3">{result.status === 'completed' ? '✅' : '⚠️'}</div>
              <p className="font-bold text-lg text-white">
                {result.status === 'completed' ? 'Importação concluída' : 'Importação com erros'}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>importados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{result.skipped}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>ignorados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: '#f87171' }}>{result.errors}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>erros</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                style={{ border: '1px solid var(--border)', color: 'rgba(255,255,255,0.6)', background: 'transparent' }}>
                Nova importação
              </button>
              <a href="/revenue" className="flex-1 py-3 rounded-xl text-sm font-semibold transition text-center block text-white"
                style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                Ver receita →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
