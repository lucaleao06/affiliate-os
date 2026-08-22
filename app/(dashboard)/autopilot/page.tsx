'use client'

import { useEffect, useState, useCallback } from 'react'

type AutopilotMode = 'PAUSED' | 'SUPERVISED' | 'AUTOPILOT'

interface AutopilotRules {
  id: string
  enabled: boolean
  mode: AutopilotMode
  min_score: number
  min_commission_rate: number
  max_risk_score: number
  allowed_channels: string[]
  allowed_rights_status: string[]
  max_posts_per_day: number
  require_human_approval: boolean
}

interface ModeConfig {
  mode: AutopilotMode
  icon: string
  label: string
  description: string
  color: string
  bg: string
  border: string
  features: string[]
  warning?: string
  live: boolean
}

const MODES: ModeConfig[] = [
  {
    mode: 'PAUSED',
    icon: '⏸️',
    label: 'Pausado',
    description: 'A IA gera sugestões, mas nada acontece sem você aprovar manualmente.',
    color: 'rgba(255,255,255,0.6)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.15)',
    features: [
      'Score de produtos disponível',
      'Geração de criativos manual',
      'Storyboard sob demanda',
      'Render MP4 manual',
    ],
    live: true,
  },
  {
    mode: 'SUPERVISED',
    icon: '👁️',
    label: 'Supervisionado',
    description: 'A IA gera criativos e storyboards automaticamente. Você aprova antes de renderizar.',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.3)',
    features: [
      'Score automático ao adicionar produto',
      'Geração de criativos automática (3 variantes)',
      'Storyboard gerado em background',
      'Fila de aprovação consolidada',
      'Render MP4 só após aprovação humana',
    ],
    warning: 'Requer ANTHROPIC_API_KEY configurada.',
    live: true,
  },
  {
    mode: 'AUTOPILOT',
    icon: '🤖',
    label: 'Autopilot',
    description: 'Pipeline 100% automático. Produto entra, MP4 sai. Você só monitora.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.3)',
    features: [
      'Score automático ao adicionar produto',
      'Criativos gerados e auto-aprovados (score ≥ min)',
      'Storyboard e render automáticos',
      'Fila de revisão para baixa pontuação',
      'Relatório diário de produção',
    ],
    warning: 'Criativos com score abaixo do mínimo ainda vão para revisão humana.',
    live: false,
  },
]

const PIPELINE_STEPS = [
  { label: 'Produto', icon: '📦', auto: { PAUSED: false, SUPERVISED: false, AUTOPILOT: false } },
  { label: 'Score', icon: '⭐', auto: { PAUSED: false, SUPERVISED: true, AUTOPILOT: true } },
  { label: 'Criativo', icon: '✍️', auto: { PAUSED: false, SUPERVISED: true, AUTOPILOT: true } },
  { label: 'Aprovação', icon: '✅', auto: { PAUSED: false, SUPERVISED: false, AUTOPILOT: true } },
  { label: 'Storyboard', icon: '📋', auto: { PAUSED: false, SUPERVISED: true, AUTOPILOT: true } },
  { label: 'Render', icon: '🎬', auto: { PAUSED: false, SUPERVISED: false, AUTOPILOT: true } },
]

const CHANNELS = ['manual', 'instagram', 'tiktok', 'youtube_shorts', 'shopee_video']
const CHANNEL_LABELS: Record<string, string> = {
  manual: 'Manual',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  shopee_video: 'Shopee Vídeo',
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl p-4 animate-pulse h-24" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
      ))}
    </div>
  )
}

export default function AutopilotPage() {
  const [rules, setRules] = useState<AutopilotRules | null>(null)
  const [mode, setMode] = useState<AutopilotMode>('PAUSED')
  const [minScore, setMinScore] = useState(70)
  const [minCommission, setMinCommission] = useState(5)
  const [maxRisk, setMaxRisk] = useState(50)
  const [maxPosts, setMaxPosts] = useState(3)
  const [requireApproval, setRequireApproval] = useState(true)
  const [allowedChannels, setAllowedChannels] = useState<string[]>(['manual'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRules = useCallback((): Promise<AutopilotRules> =>
    fetch('/api/autopilot/rules')
      .then(r => r.json())
      .then(d => d.rules as AutopilotRules)
  , [])

  useEffect(() => {
    loadRules()
      .then(r => {
        setRules(r)
        setMode(r.mode ?? 'PAUSED')
        setMinScore(r.min_score ?? 70)
        setMinCommission(r.min_commission_rate ?? 5)
        setMaxRisk(r.max_risk_score ?? 50)
        setMaxPosts(r.max_posts_per_day ?? 3)
        setRequireApproval(r.require_human_approval ?? true)
        setAllowedChannels(r.allowed_channels ?? ['manual'])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [loadRules])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/autopilot/rules', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode,
          enabled: mode !== 'PAUSED',
          min_score: minScore,
          min_commission_rate: minCommission,
          max_risk_score: maxRisk,
          max_posts_per_day: maxPosts,
          require_human_approval: requireApproval,
          allowed_channels: allowedChannels,
        }),
      })
      if (!res.ok) {
        const e = await res.json() as { error: string }
        throw new Error(e.error)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const toggleChannel = (ch: string) => {
    setAllowedChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  const current = MODES.find(m => m.mode === mode) ?? MODES[0]

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">

      <div>
        <h1 className="text-2xl font-black text-white">Autopilot</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Nível de automação do pipeline de criativos
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading ? <Skeleton /> : (
        <>
          {/* Mode selector */}
          <div className="space-y-2.5">
            {MODES.map(m => {
              const active = mode === m.mode
              return (
                <button key={m.mode} onClick={() => setMode(m.mode)}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.99]"
                  style={{
                    background: active ? m.bg : 'var(--surface)',
                    border: `2px solid ${active ? m.border : 'var(--border)'}`,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: active ? m.color : 'rgba(255,255,255,0.2)' }}>
                      {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xl">{m.icon}</span>
                        <span className="font-bold text-base" style={{ color: active ? m.color : 'rgba(255,255,255,0.7)' }}>
                          {m.label}
                        </span>
                        {!m.live && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                            EM BREVE
                          </span>
                        )}
                        {m.mode === rules?.mode && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                            ATIVO
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {m.description}
                      </p>
                      {active && (
                        <ul className="mt-3 space-y-1.5">
                          {m.features.map(f => (
                            <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                              <span style={{ color: m.color }}>✓</span> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                      {active && m.warning && (
                        <p className="mt-3 text-xs rounded-lg px-3 py-2"
                          style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.2)' }}>
                          ⚠️ {m.warning}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Pipeline diagram */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold text-white mb-4">
              Pipeline em <span style={{ color: current.color }}>{current.label}</span>
            </p>
            <div className="flex items-start">
              {PIPELINE_STEPS.map((step, i) => {
                const isAuto = step.auto[mode]
                return (
                  <div key={step.label} className="flex-1 flex flex-col items-center gap-1.5 relative">
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className="absolute top-4 left-1/2 w-full h-0.5 -translate-y-0.5 z-0"
                        style={{ background: isAuto ? current.border : 'rgba(255,255,255,0.07)' }} />
                    )}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm z-10 transition-all"
                      style={{
                        background: isAuto ? current.bg : 'var(--surface-2)',
                        border: `2px solid ${isAuto ? current.border : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      {step.icon}
                    </div>
                    <p className="text-center text-[9px] leading-tight" style={{ color: isAuto ? current.color : 'rgba(255,255,255,0.3)' }}>
                      {step.label}
                    </p>
                    <p className="text-[9px] font-bold" style={{ color: isAuto ? current.color : 'rgba(255,255,255,0.2)' }}>
                      {isAuto ? 'AUTO' : 'MANUAL'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rules — only show for non-PAUSED */}
          {mode !== 'PAUSED' && (
            <div className="rounded-2xl p-4 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold text-white">Regras do pipeline</p>

              {/* Score mínimo */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Score mínimo para aprovação</label>
                  <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{minScore}/100</span>
                </div>
                <input type="range" min={50} max={95} step={5} value={minScore}
                  onChange={e => setMinScore(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5" />
                <div className="flex justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <span>50 (permissivo)</span><span>95 (exigente)</span>
                </div>
              </div>

              {/* Comissão mínima */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Comissão mínima do produto</label>
                  <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{minCommission}%</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={minCommission}
                  onChange={e => setMinCommission(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5" />
              </div>

              {/* Posts por dia */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Máx. posts por dia</label>
                  <span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{maxPosts}</span>
                </div>
                <input type="range" min={1} max={10} step={1} value={maxPosts}
                  onChange={e => setMaxPosts(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5" />
              </div>

              {/* Aprovação humana */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white">Aprovação humana obrigatória</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Nenhum render acontece sem você confirmar
                  </p>
                </div>
                <button onClick={() => setRequireApproval(p => !p)}
                  className="w-12 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ background: requireApproval ? 'var(--brand)' : 'rgba(255,255,255,0.1)' }}>
                  <div className="w-5 h-5 rounded-full bg-white shadow transition-all mx-auto"
                    style={{ transform: requireApproval ? 'translateX(12px)' : 'translateX(-12px)' }} />
                </button>
              </div>

              {/* Canais permitidos */}
              <div>
                <p className="text-xs font-medium text-white mb-2">Canais permitidos</p>
                <div className="flex flex-wrap gap-2">
                  {CHANNELS.map(ch => {
                    const on = allowedChannels.includes(ch)
                    return (
                      <button key={ch} onClick={() => toggleChannel(ch)}
                        className="text-xs px-3 py-1.5 rounded-full transition-all"
                        style={on ? {
                          background: 'rgba(255,107,53,0.2)',
                          color: 'var(--brand)',
                          border: '1px solid rgba(255,107,53,0.4)',
                        } : {
                          background: 'var(--surface-2)',
                          color: 'rgba(255,255,255,0.4)',
                          border: '1px solid var(--border)',
                        }}>
                        {CHANNEL_LABELS[ch]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={saving || saved}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-70"
            style={{
              background: saved ? 'rgba(34,197,94,0.2)' : 'var(--brand)',
              color: saved ? '#4ade80' : 'white',
              border: saved ? '2px solid rgba(34,197,94,0.4)' : 'none',
            }}>
            {saving ? '⏳ Salvando...' : saved ? '✅ Salvo!' : 'Salvar configuração'}
          </button>

          <p className="text-center text-xs pb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Configurações salvas no banco · SUPERVISED padrão recomendado
          </p>
        </>
      )}
    </div>
  )
}
