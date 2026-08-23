'use client'

import { useState, useEffect } from 'react'
import type { StoryboardOutput } from '@/lib/ai'

interface Creative {
  id: string
  hook: string | null
  script: string | null
  status: string
  campaigns: { name: string; products: { id: string; title: string; price: number | null; image_url: string | null } | null } | null
}

interface RenderResult {
  status: string
  runId: string
  filename: string
  downloadUrl: string
  durationSec: number
  width: number
  height: number
  codec: string
  fileSizeBytes: number
  renderMs: number
  error?: string
}

function formatSize(b: number) {
  return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`
}
function formatMs(ms: number) {
  return ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 60000).toFixed(1)}min`
}

export default function VideoFactoryPage() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [rendering, setRendering] = useState<string | null>(null)
  const [storyboards, setStoryboards] = useState<Record<string, StoryboardOutput>>({})
  const [renders, setRenders] = useState<Record<string, RenderResult>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/video-factory')
      .then(r => r.json())
      .then((d: {
        creatives: Creative[]
        storyboards?: Record<string, StoryboardOutput>
        renders?: Record<string, RenderResult>
      }) => {
        setCreatives(d.creatives ?? [])
        if (d.storyboards) setStoryboards(d.storyboards)
        if (d.renders) setRenders(d.renders)
      })
      .catch(() => setError('Erro ao carregar criativos aprovados'))
      .finally(() => setLoading(false))
  }, [])

  const generateStoryboard = async (id: string) => {
    setGenerating(id)
    setError(null)
    try {
      const res = await fetch('/api/video-factory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creativeId: id }),
      })
      const data = await res.json() as { storyboard: StoryboardOutput; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      setStoryboards(prev => ({ ...prev, [id]: data.storyboard }))
    } catch (err) { setError(String(err)) }
    finally { setGenerating(null) }
  }

  const renderVideo = async (id: string) => {
    setRendering(id)
    setError(null)
    try {
      const res = await fetch('/api/video-factory/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creativeId: id }),
      })
      const data = await res.json() as RenderResult
      if (!res.ok) throw new Error(data.error ?? 'Render falhou')
      setRenders(prev => ({ ...prev, [id]: data }))
    } catch (err) { setError(String(err)) }
    finally { setRendering(null) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Video Factory</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Storyboard → MP4 1080×1920 via FFmpeg
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm font-mono"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />)}
        </div>
      )}

      {!loading && creatives.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-semibold text-white">Nenhum criativo aprovado</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Aprove criativos na Fila primeiro.</p>
        </div>
      )}

      <div className="space-y-4">
        {creatives.map(c => {
          const sb = storyboards[c.id]
          const render = renders[c.id]
          const isGen = generating === c.id
          const isRender = rendering === c.id
          const product = c.campaigns?.products

          return (
            <div key={c.id} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3"
                style={{ borderBottom: '1px solid var(--border)' }}>
                {product?.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: 'var(--surface-2)' }}>📦</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{product?.title ?? '—'}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {c.hook?.slice(0, 55) ?? '—'}
                  </p>
                </div>
              </div>

              {/* Render result — video protagonist */}
              {render && (
                <div className="p-4">
                  {/* Vertical video — full width on mobile */}
                  <div className="mx-auto rounded-2xl overflow-hidden border mb-4"
                    style={{ maxWidth: 240, border: '1px solid var(--border)' }}>
                    <video
                      src={render.downloadUrl}
                      controls
                      playsInline
                      autoPlay
                      muted
                      loop
                      className="w-full"
                      style={{ aspectRatio: '9/16', display: 'block' }}
                    />
                  </div>
                  {/* Meta chips */}
                  <div className="flex flex-wrap gap-2 justify-center mb-3">
                    {[
                      { k: 'Codec', v: render.codec },
                      { k: 'Res', v: `${render.width}×${render.height}` },
                      { k: 'Dur', v: `${render.durationSec}s` },
                      { k: 'Size', v: formatSize(render.fileSizeBytes) },
                      { k: 'Tempo', v: formatMs(render.renderMs) },
                    ].map(({ k, v }) => (
                      <div key={k} className="text-center rounded-xl px-3 py-1.5 text-xs"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k} </span>
                        <span className="font-semibold text-white">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <a href={render.downloadUrl} download={render.filename}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                      ⬇️ Baixar
                    </a>
                    <button onClick={() => { void renderVideo(c.id) }} disabled={isRender}
                      className="py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}>
                      🔄 Re-render
                    </button>
                  </div>
                  {/* Next step prompt */}
                  <a href="/distribute"
                    className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={{ background: 'rgba(255,107,53,0.18)', color: 'var(--brand)', border: '1px solid rgba(255,107,53,0.35)' }}>
                    📦 Ver na Distribuição →
                  </a>
                </div>
              )}

              {/* Rendering progress */}
              {isRender && (
                <div className="px-4 py-5 flex flex-col items-center gap-3">
                  <div className="text-4xl animate-spin">⚙️</div>
                  <div className="text-center">
                    <p className="font-semibold text-white">FFmpeg renderizando...</p>
                    <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>1080×1920 H.264 · pode levar 5–30s</p>
                  </div>
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--brand)', width: '60%' }} />
                  </div>
                </div>
              )}

              {/* Storyboard preview */}
              {sb && !render && !isRender && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{sb.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--brand)' }}>
                      {sb.totalDuration}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.5)' }}>
                      {sb.format}
                    </span>
                    {sb.provider === 'local' && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Rascunho baseado em dados
                      </span>
                    )}
                  </div>
                  {/* Scenes — vertical list on mobile */}
                  <div className="space-y-2">
                    {sb.scenes.map(scene => (
                      <div key={scene.scene} className="rounded-xl p-3 flex gap-3"
                        style={{ background: 'var(--surface-2)' }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                          style={{ background: 'rgba(255,107,53,0.2)', color: 'var(--brand)' }}>
                          {scene.scene}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs font-semibold text-white">{scene.text_overlay}</p>
                          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {scene.voiceover.slice(0, 80)}
                          </p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            ⏱ {scene.duration}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!render && !isRender && (
                <div className="px-4 pb-4">
                  {!sb ? (
                    <button onClick={() => { void generateStoryboard(c.id) }} disabled={isGen}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)' }}>
                      {isGen ? '⏳ Gerando storyboard...' : '📋 Gerar Storyboard'}
                    </button>
                  ) : (
                    <button onClick={() => { void renderVideo(c.id) }} disabled={isRender}
                      className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'var(--brand)', color: 'white' }}>
                      🎥 Renderizar MP4
                    </button>
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
