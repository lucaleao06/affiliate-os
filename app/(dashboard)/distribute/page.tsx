'use client'

import { useEffect, useState, useCallback } from 'react'

interface PublicationPackage {
  id: string
  video_filename: string
  download_url: string
  caption: string
  cta: string
  affiliate_url: string | null
  channel: string
  rights_status: string
  duration_sec: number
  width: number
  height: number
  status: string
  status_reason: string | null
  checklist: {
    ready: boolean
    failReasons: string[]
    hasVideo: boolean
    hasCaption: boolean
    hasCTA: boolean
    hasAffiliateUrl: boolean
    videoIsVertical: boolean
    videoMinDuration: boolean
    videoMaxDuration: boolean
    rightsCleared: boolean
  }
  published_url: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-gray-400',
  pending_rights: 'text-yellow-400',
  ready: 'text-green-400',
  publishing: 'text-blue-400',
  published: 'text-emerald-400',
  failed: 'text-red-400',
  manual_required: 'text-orange-400',
  scheduled: 'text-purple-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  pending_rights: 'Aguardando direitos',
  ready: 'Pronto',
  publishing: 'Publicando...',
  published: 'Publicado',
  failed: 'Falhou',
  manual_required: 'Publicação manual',
  scheduled: 'Agendado',
}

const CHANNEL_LABELS: Record<string, string> = {
  manual: '📋 Manual',
  instagram: '📸 Instagram',
  tiktok: '🎵 TikTok',
  youtube_shorts: '▶️ YouTube Shorts',
  shopee_video: '🛍️ Shopee',
}

function ChecklistBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

export default function DistributePage() {
  const [packages, setPackages] = useState<PublicationPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PublicationPackage | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback((): Promise<PublicationPackage[]> => {
    const url = filter === 'all' ? '/api/publish' : `/api/publish?status=${filter}`
    return fetch(url)
      .then(r => r.json() as Promise<{ packages: PublicationPackage[] }>)
      .then(j => j.packages ?? [])
  }, [filter])

  useEffect(() => {
    load()
      .then(pkgs => { setPackages(pkgs); setLoading(false) })
      .catch(() => setLoading(false))
  }, [load])

  async function handlePublish(pkg: PublicationPackage) {
    setPublishing(true)
    setPublishResult(null)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', packageId: pkg.id }),
      })
      const json = await res.json()
      if (json.result?.success) {
        if (json.result.requiresManualAction) {
          setPublishResult(`📱 Publicação manual necessária:\n${json.result.manualInstructions}`)
        } else {
          setPublishResult(`✅ Publicado: ${json.result.publishedUrl}`)
        }
      } else {
        setPublishResult(`❌ ${json.result?.error ?? json.error ?? 'Erro desconhecido'}`)
      }
      await load()
    } finally {
      setPublishing(false)
    }
  }

  function copyCaption(pkg: PublicationPackage) {
    const text = [pkg.caption, pkg.cta, pkg.affiliate_url].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Distribuição</h1>
          <button onClick={load} className="text-xs text-gray-400 hover:text-white transition">↻ Atualizar</button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {['all', 'ready', 'draft', 'pending_rights', 'published', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => { setLoading(true); setFilter(s) }}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                filter === s
                  ? 'bg-white text-gray-900 border-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">Carregando...</div>
        ) : packages.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-gray-400 text-sm">Nenhum pacote encontrado.</p>
            <p className="text-gray-600 text-xs mt-1">Renderize um vídeo e crie um pacote de publicação.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map(pkg => (
              <div
                key={pkg.id}
                className={`rounded-xl border transition cursor-pointer ${
                  selected?.id === pkg.id ? 'border-blue-500 bg-gray-900' : 'border-gray-800 bg-gray-900/60 hover:border-gray-600'
                }`}
                onClick={() => setSelected(selected?.id === pkg.id ? null : pkg)}
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Vertical video thumb placeholder */}
                    <div className="flex-shrink-0 w-10 h-16 rounded-lg bg-gray-800 flex items-center justify-center text-lg">
                      🎬
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pkg.video_filename}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {CHANNEL_LABELS[pkg.channel] ?? pkg.channel} · {Math.round(pkg.duration_sec)}s · {pkg.width}×{pkg.height}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-medium ${STATUS_COLORS[pkg.status] ?? 'text-gray-400'}`}>
                          ● {STATUS_LABELS[pkg.status] ?? pkg.status}
                        </span>
                        {pkg.rights_status === 'unknown' && (
                          <span className="text-xs text-yellow-500 bg-yellow-900/30 px-2 py-0.5 rounded-full">⚠ direitos desconhecidos</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Caption preview */}
                  {pkg.caption && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{pkg.caption}</p>
                  )}
                </div>

                {/* Expanded detail */}
                {selected?.id === pkg.id && (
                  <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-4">
                    {/* Checklist */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Checklist</p>
                      <div className="flex flex-wrap gap-1.5">
                        <ChecklistBadge ok={pkg.checklist.hasVideo} label="Vídeo" />
                        <ChecklistBadge ok={pkg.checklist.hasCaption} label="Legenda" />
                        <ChecklistBadge ok={pkg.checklist.hasCTA} label="CTA" />
                        <ChecklistBadge ok={pkg.checklist.hasAffiliateUrl} label="Link afiliado" />
                        <ChecklistBadge ok={pkg.checklist.videoIsVertical} label="Vertical" />
                        <ChecklistBadge ok={pkg.checklist.videoMinDuration} label="≥5s" />
                        <ChecklistBadge ok={pkg.checklist.videoMaxDuration} label="≤90s" />
                        <ChecklistBadge ok={pkg.checklist.rightsCleared} label="Direitos OK" />
                      </div>
                      {pkg.checklist.failReasons.length > 0 && (
                        <p className="text-xs text-red-400 mt-2">{pkg.checklist.failReasons.join(' · ')}</p>
                      )}
                    </div>

                    {/* Caption */}
                    {pkg.caption && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Legenda</p>
                        <p className="text-xs text-gray-300 whitespace-pre-line">{pkg.caption}</p>
                      </div>
                    )}
                    {pkg.cta && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">CTA</p>
                        <p className="text-xs text-gray-300">{pkg.cta}</p>
                      </div>
                    )}
                    {pkg.affiliate_url && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Link afiliado</p>
                        <p className="text-xs text-blue-400 break-all">{pkg.affiliate_url}</p>
                      </div>
                    )}

                    {/* Publish result */}
                    {publishResult && (
                      <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 whitespace-pre-line">
                        {publishResult}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePublish(pkg)}
                        disabled={publishing || (!pkg.checklist.ready && pkg.rights_status !== 'unknown')}
                        className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-sm font-semibold transition"
                      >
                        {publishing ? 'Publicando...' : 'PUBLICAR'}
                      </button>
                      <button
                        onClick={() => copyCaption(pkg)}
                        className="py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition"
                      >
                        COPIAR LEGENDA
                      </button>
                      {pkg.download_url && (
                        <a
                          href={pkg.download_url}
                          download={pkg.video_filename}
                          className="py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition text-center"
                        >
                          DOWNLOAD
                        </a>
                      )}
                      {pkg.published_url && (
                        <a
                          href={pkg.published_url}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold transition text-center"
                        >
                          VER POST
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
