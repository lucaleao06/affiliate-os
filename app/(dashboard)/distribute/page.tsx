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

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  draft:           { label: 'Rascunho',          color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
  pending_rights:  { label: 'Aguardando direitos', color: '#fbbf24',             bg: 'rgba(251,191,36,0.08)' },
  ready:           { label: 'Pronto',             color: '#4ade80',              bg: 'rgba(74,222,128,0.08)' },
  publishing:      { label: 'Publicando...',       color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)' },
  published:       { label: 'Publicado',           color: '#34d399',             bg: 'rgba(52,211,153,0.08)' },
  failed:          { label: 'Falhou',              color: '#f87171',             bg: 'rgba(248,113,113,0.08)' },
  manual_required: { label: 'Publicação manual',   color: 'var(--brand)',        bg: 'rgba(255,107,53,0.08)' },
  scheduled:       { label: 'Agendado',            color: '#a78bfa',             bg: 'rgba(167,139,250,0.08)' },
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'ready', label: 'Prontos' },
  { key: 'draft', label: 'Rascunho' },
  { key: 'pending_rights', label: 'Direitos' },
  { key: 'published', label: 'Publicados' },
  { key: 'failed', label: 'Falhou' },
]

const CHANNEL_LABELS: Record<string, string> = {
  manual: 'Manual',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  shopee_video: 'Shopee',
}

const CHANNEL_GUIDE: Record<string, {
  steps: string[]
  bestTimes: string
  maxDuration: string
  tip: string
}> = {
  tiktok: {
    steps: [
      'Abra o TikTok → toque no "+" no centro',
      'Selecione "Upload" e escolha o MP4 baixado',
      'Cole a legenda completa no campo de descrição',
      'Adicione hashtags: #shopee #afiliado #produto',
      'Publique e acompanhe as primeiras 2h',
    ],
    bestTimes: '19h–22h (seg, qua, sex)',
    maxDuration: 'até 60s — ideal 15–30s',
    tip: 'Primeiros 2 segundos definem tudo. Use o hook exatamente como está.',
  },
  instagram: {
    steps: [
      'Abra o Instagram → toque no "+" → Reel',
      'Importe o MP4 da galeria (após baixar)',
      'Cole a legenda no campo de descrição',
      'Adicione até 30 hashtags + localização',
      'Poste e responda comentários nas primeiras 1h',
    ],
    bestTimes: '18h–21h (ter, qui, sáb)',
    maxDuration: 'até 90s — ideal 15–30s',
    tip: 'Ative a opção "Também compartilhar no Feed" para mais alcance.',
  },
  youtube_shorts: {
    steps: [
      'Abra o YouTube Studio ou app YouTube',
      'Toque no "+" → "Criar um Short" ou "Upload"',
      'Selecione o MP4 e adicione o título (use o hook)',
      'Cole a descrição completa com o link afiliado',
      'Adicione 3–5 tags relevantes do produto',
    ],
    bestTimes: '12h–14h e 20h–22h (todos os dias)',
    maxDuration: 'até 60s',
    tip: 'Use o link afiliado na DESCRIÇÃO, não na bio — Shorts permite links diretos.',
  },
  shopee_video: {
    steps: [
      'Acesse o Shopee Affiliate Creator Center',
      'Vá em "Vídeo" → "Fazer upload"',
      'Selecione o MP4 e vincule o produto afiliado',
      'Cole a legenda no campo de descrição do vídeo',
      'Publique — vídeos Shopee têm boost de comissão',
    ],
    bestTimes: '12h–14h e 19h–21h',
    maxDuration: 'até 60s',
    tip: 'Vincule o produto diretamente no editor — é obrigatório para ganhar comissão.',
  },
  manual: {
    steps: [
      'Baixe o MP4 usando o botão abaixo',
      'Copie a legenda + CTA + link com um toque',
      'Abra o canal desejado (TikTok, Instagram, YouTube)',
      'Faça o upload do vídeo e cole a legenda',
      'Publique — ideal nos horários de pico indicados',
    ],
    bestTimes: 'TikTok: 19–22h · IG: 18–21h · YT: 12–14h ou 20–22h',
    maxDuration: 'Varia por canal (ver acima)',
    tip: 'Poste no mesmo dia em que baixar — vídeos frescos têm melhor distribuição orgânica.',
  },
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={ok
        ? { background: 'rgba(52,211,153,0.12)', color: '#34d399' }
        : { background: 'rgba(248,113,113,0.12)', color: '#f87171' }
      }>
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [markingReadyId, setMarkingReadyId] = useState<string | null>(null)
  const [markError, setMarkError] = useState<string | null>(null)

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
          setPublishResult(`Publicação manual necessária:\n${json.result.manualInstructions as string}`)
        } else {
          setPublishResult(`Publicado: ${json.result.publishedUrl as string}`)
        }
      } else {
        setPublishResult(`Erro: ${json.result?.error ?? json.error ?? 'Erro desconhecido'}`)
      }
      load().then(pkgs => setPackages(pkgs)).catch(() => null)
    } finally {
      setPublishing(false)
    }
  }

  async function handleMarkReady(pkg: PublicationPackage) {
    setMarkingReadyId(pkg.id)
    setMarkError(null)
    try {
      const res = await fetch('/api/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pkg.id, rights_status: 'cleared', status: 'ready' }),
      })
      const json = await res.json() as { package?: PublicationPackage; error?: string }
      if (!res.ok || json.error) {
        setMarkError(json.error ?? 'Erro ao marcar como pronto')
      } else {
        // Update local state without refetching
        setPackages(prev => prev.map(p => p.id === pkg.id
          ? { ...p, rights_status: 'cleared', status: 'ready', checklist: json.package?.checklist ?? p.checklist }
          : p
        ))
        if (selected?.id === pkg.id && json.package) {
          setSelected(json.package)
        }
      }
    } catch {
      setMarkError('Falha na conexão')
    } finally {
      setMarkingReadyId(null)
    }
  }

  function copyCaption(pkg: PublicationPackage) {
    const text = [pkg.caption, pkg.cta, pkg.affiliate_url].filter(Boolean).join('\n\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(pkg.id)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => null)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Distribuição</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Pacotes prontos para publicação
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load().then(pkgs => { setPackages(pkgs); setLoading(false) }).catch(() => setLoading(false)) }}
          className="flex-shrink-0 text-xs px-3 py-2 rounded-xl transition-all active:scale-95 mt-1"
          style={{ background: 'var(--surface)', color: 'rgba(255,255,255,0.4)', border: '1px solid var(--border)' }}>
          Atualizar
        </button>
      </div>

      {/* SUPERVISED banner */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-2.5"
        style={{ background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.2)' }}>
        <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: 'var(--brand)' }}>SUPERVISIONADO</span>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Publicação requer aprovação manual. Baixe o vídeo, copie a legenda e publique no canal desejado.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.key}
            onClick={() => setFilter(opt.key)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-all active:scale-95"
            style={filter === opt.key ? {
              background: 'rgba(255,107,53,0.15)',
              color: 'var(--brand)',
              border: '1px solid rgba(255,107,53,0.3)',
            } : {
              background: 'var(--surface)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid var(--border)',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl p-4 animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex gap-3">
                <div className="w-10 h-16 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-2/3 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 w-1/3 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="h-3 w-1/4 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && packages.length === 0 && (
        <div className="rounded-2xl p-10 text-center space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>MP4</div>
          <div>
            <p className="font-semibold text-white">Nenhum pacote encontrado</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Renderize um vídeo na Video Factory para criar um pacote.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {!loading && packages.length > 0 && (
        <div className="space-y-3">
          {packages.map(pkg => {
            const statusCfg = STATUS_CFG[pkg.status] ?? STATUS_CFG.draft
            const isSelected = selected?.id === pkg.id

            return (
              <div key={pkg.id}
                className="rounded-2xl overflow-hidden transition-all cursor-pointer"
                style={{
                  background: 'var(--surface)',
                  border: isSelected ? '1px solid rgba(255,107,53,0.4)' : '1px solid var(--border)',
                }}
                onClick={() => setSelected(isSelected ? null : pkg)}>

                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Video thumb */}
                    <div className="flex-shrink-0 w-10 h-16 rounded-xl flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                      9:16
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{pkg.video_filename}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {CHANNEL_LABELS[pkg.channel] ?? pkg.channel} · {Math.round(pkg.duration_sec)}s · {pkg.width}×{pkg.height}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                        {pkg.rights_status === 'pending_rights' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                            ⏳ direitos pendentes
                          </span>
                        )}
                        {pkg.rights_status === 'cleared' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                            ✓ direitos ok
                          </span>
                        )}
                        {pkg.rights_status === 'unknown' && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                            confirmar direitos
                          </span>
                        )}
                        {pkg.rights_status === 'owned' && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                            produto próprio
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs flex-shrink-0 mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {isSelected ? '▲' : '▼'}
                    </span>
                  </div>

                  {pkg.caption && (
                    <p className="text-xs mt-2 line-clamp-2 leading-relaxed"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>{pkg.caption}</p>
                  )}
                </div>

                {/* Expanded */}
                {isSelected && (
                  <div className="px-4 pb-4 pt-3 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>

                    {/* Checklist */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                        style={{ color: 'rgba(255,255,255,0.25)' }}>Checklist</p>
                      <div className="flex flex-wrap gap-1.5">
                        <ChecklistRow ok={pkg.checklist.hasVideo} label="Vídeo" />
                        <ChecklistRow ok={pkg.checklist.hasCaption} label="Legenda" />
                        <ChecklistRow ok={pkg.checklist.hasCTA} label="CTA" />
                        <ChecklistRow ok={pkg.checklist.hasAffiliateUrl} label="Link afiliado" />
                        <ChecklistRow ok={pkg.checklist.videoIsVertical} label="Vertical" />
                        <ChecklistRow ok={pkg.checklist.videoMinDuration} label="≥5s" />
                        <ChecklistRow ok={pkg.checklist.videoMaxDuration} label="≤90s" />
                        <ChecklistRow ok={pkg.checklist.rightsCleared} label="Direitos" />
                      </div>
                      {pkg.checklist.failReasons.length > 0 && (
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#f87171' }}>
                          {pkg.checklist.failReasons.join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Caption / CTA / Link */}
                    {pkg.caption && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>Legenda</p>
                        <p className="text-xs leading-relaxed whitespace-pre-line"
                          style={{ color: 'rgba(255,255,255,0.7)' }}>{pkg.caption}</p>
                      </div>
                    )}
                    {pkg.cta && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>CTA</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{pkg.cta}</p>
                      </div>
                    )}
                    {pkg.affiliate_url && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>Link afiliado</p>
                        <p className="text-xs break-all" style={{ color: 'var(--brand)' }}>{pkg.affiliate_url}</p>
                      </div>
                    )}

                    {/* Channel guide — always visible for pending_rights / manual */}
                    {(() => {
                      const guide = CHANNEL_GUIDE[pkg.channel] ?? CHANNEL_GUIDE.manual
                      return (
                        <div className="rounded-xl p-3.5 space-y-3"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-widest"
                              style={{ color: 'rgba(255,255,255,0.35)' }}>
                              Guia {CHANNEL_LABELS[pkg.channel] ?? pkg.channel}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                              Melhor hora: {guide.bestTimes}
                            </span>
                          </div>
                          <ol className="space-y-1.5 list-none">
                            {guide.steps.map((step, i) => (
                              <li key={i} className="flex gap-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                <span className="flex-shrink-0 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold mt-0.5"
                                  style={{ background: 'rgba(255,107,53,0.15)', color: 'var(--brand)' }}>{i + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,107,53,0.08)' }}>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Dica: </span>
                              {guide.tip}
                            </p>
                          </div>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            Duração maxima: {guide.maxDuration}
                          </p>
                        </div>
                      )
                    })()}

                    {publishResult && (
                      <div className="rounded-xl p-3 text-xs whitespace-pre-line leading-relaxed"
                        style={{ background: 'var(--surface-2)', color: 'rgba(255,255,255,0.6)', border: '1px solid var(--border)' }}>
                        {publishResult}
                      </div>
                    )}

                    {markError && selected?.id === pkg.id && (
                      <div className="rounded-xl p-3 text-xs"
                        style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                        {markError}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {pkg.download_url && (
                        <a href={pkg.download_url} download={pkg.video_filename}
                          className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 text-center"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                          Baixar MP4
                        </a>
                      )}
                      <button onClick={() => copyCaption(pkg)}
                        className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                        style={{ background: 'var(--surface-2)', color: copiedId === pkg.id ? '#4ade80' : 'rgba(255,255,255,0.7)', border: '1px solid var(--border)' }}>
                        {copiedId === pkg.id ? 'Copiado!' : 'Copiar legenda'}
                      </button>
                      {/* Copiar tudo — 1 toque */}
                      <button
                        onClick={() => {
                          const parts = [pkg.caption, pkg.cta, pkg.affiliate_url].filter(Boolean)
                          navigator.clipboard.writeText(parts.join('\n\n')).then(() => {
                            setCopiedId(`all-${pkg.id}`)
                            setTimeout(() => setCopiedId(null), 2500)
                          }).catch(() => null)
                        }}
                        className="col-span-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                        style={{
                          background: copiedId === `all-${pkg.id}` ? 'rgba(34,197,94,0.12)' : 'rgba(255,107,53,0.10)',
                          color: copiedId === `all-${pkg.id}` ? '#4ade80' : 'var(--brand)',
                          border: `1px solid ${copiedId === `all-${pkg.id}` ? 'rgba(34,197,94,0.25)' : 'rgba(255,107,53,0.25)'}`,
                        }}>
                        {copiedId === `all-${pkg.id}` ? 'Copiado!' : 'Copiar legenda + CTA + link'}
                      </button>
                      {pkg.rights_status === 'pending_rights' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleMarkReady(pkg) }}
                          disabled={markingReadyId === pkg.id}
                          className="col-span-2 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                          {markingReadyId === pkg.id ? 'Marcando...' : '✓ Marcar como Pronto'}
                        </button>
                      )}
                      {pkg.checklist.ready && pkg.rights_status !== 'unknown' && (
                        <button onClick={() => handlePublish(pkg)} disabled={publishing}
                          className="col-span-2 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                          style={{ background: 'var(--brand)', color: '#fff' }}>
                          {publishing ? 'Publicando...' : 'Publicar via API'}
                        </button>
                      )}
                      {pkg.published_url && (
                        <a href={pkg.published_url} target="_blank" rel="noreferrer"
                          className="col-span-2 py-3 rounded-xl text-sm font-semibold transition-all text-center"
                          style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                          Ver publicação →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
