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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-1">Importar Relatório</h1>
        <p className="text-sm text-gray-500 mb-6">CSV/XLSX do Shopee Affiliate Portal</p>

        {step === 'upload' && (
          <div>
            <div
              className={`rounded-2xl border-2 border-dashed transition-colors p-10 text-center cursor-pointer ${
                dragging ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-500'
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📄</div>
              <p className="text-gray-300 font-medium">Arraste o CSV do Shopee aqui</p>
              <p className="text-gray-600 text-xs mt-1">ou clique para selecionar</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            <div className="mt-4 bg-gray-900 rounded-xl p-4 border border-gray-800 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400">Como exportar do Shopee Affiliate:</p>
              <p>1. Acesse affiliate.shopee.com.br</p>
              <p>2. Menu Relatórios → Relatório de Comissões</p>
              <p>3. Selecione o período e clique em Exportar CSV</p>
            </div>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">{filename}</p>
                <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-300">✕ Cancelar</button>
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
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Colunas detectadas</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.columns.map(c => (
                  <span key={c} className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300">{c}</span>
                ))}
              </div>
            </div>

            {/* Sample rows */}
            {preview.sample.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Prévia (5 linhas)</p>
                <div className="space-y-2">
                  {preview.sample.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-600 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-gray-300">{row.product_name ?? '—'}</p>
                        <p className="text-gray-600">{row.order_id} · {row.occurred_at?.slice(0, 10)} · {row.status}</p>
                      </div>
                      <span className="flex-shrink-0 font-semibold text-emerald-400">
                        {fmt(row.commission_value ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3 rounded-xl border border-gray-700 text-sm font-semibold text-gray-300 hover:border-gray-500 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold transition"
              >
                {importing ? 'Importando...' : `Importar ${preview.totalRows} linhas`}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-6 text-center border ${
              result.status === 'completed' ? 'border-emerald-800 bg-emerald-900/20' : 'border-red-800 bg-red-900/20'
            }`}>
              <div className="text-4xl mb-3">{result.status === 'completed' ? '✅' : '⚠️'}</div>
              <p className="font-bold text-lg">
                {result.status === 'completed' ? 'Importação concluída' : 'Importação com erros'}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                  <p className="text-xs text-gray-500">importados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                  <p className="text-xs text-gray-500">ignorados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{result.errors}</p>
                  <p className="text-xs text-gray-500">erros</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-xl border border-gray-700 text-sm font-semibold text-gray-300 hover:border-gray-500 transition">
                Nova importação
              </button>
              <a href="/revenue" className="flex-1 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold transition text-center block">
                Ver receita →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
