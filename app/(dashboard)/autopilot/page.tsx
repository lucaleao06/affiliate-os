'use client'

import { useState } from 'react'

type AutopilotMode = 'PAUSED' | 'SUPERVISED' | 'AUTOPILOT'

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
}

const MODES: ModeConfig[] = [
  {
    mode: 'PAUSED',
    icon: '⏸️',
    label: 'Pausado',
    description: 'A IA gera sugestões, mas nada acontece sem você aprovar manualmente.',
    color: 'rgba(255,255,255,0.6)',
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.1)',
    features: [
      'Score de produtos disponível',
      'Geração de criativos manual',
      'Storyboard sob demanda',
      'Render MP4 manual',
    ],
  },
  {
    mode: 'SUPERVISED',
    icon: '👁️',
    label: 'Supervisionado',
    description: 'A IA gera criativos e storyboards automaticamente. Você aprova antes de renderizar.',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.25)',
    features: [
      'Score automático ao adicionar produto',
      'Geração de criativos automática (3 variantes)',
      'Storyboard gerado em background',
      'Fila de aprovação consolidada',
      'Render MP4 só após aprovação',
    ],
  },
  {
    mode: 'AUTOPILOT',
    icon: '🤖',
    label: 'Autopilot',
    description: 'Pipeline 100% automático. Produto entra, MP4 sai. Você só monitora.',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.25)',
    features: [
      'Score automático ao adicionar produto',
      'Criativos gerados e auto-aprovados (score ≥ 75)',
      'Storyboard e render automáticos',
      'Fila de revisão de baixa pontuação',
      'Relatório diário de produção',
    ],
    warning: 'Criativos com score < 75 ainda vão para fila de revisão.',
  },
]

const PIPELINE_STEPS = [
  { id: 1, label: 'Produto adicionado', icon: '📦', auto: { PAUSED: false, SUPERVISED: false, AUTOPILOT: false } },
  { id: 2, label: 'Score IA', icon: '⭐', auto: { PAUSED: false, SUPERVISED: true, AUTOPILOT: true } },
  { id: 3, label: 'Criativo gerado', icon: '✍️', auto: { PAUSED: false, SUPERVISED: true, AUTOPILOT: true } },
  { id: 4, label: 'Aprovação', icon: '✅', auto: { PAUSED: false, SUPERVISED: false, AUTOPILOT: true } },
  { id: 5, label: 'Storyboard', icon: '📋', auto: { PAUSED: false, SUPERVISED: true, AUTOPILOT: true } },
  { id: 6, label: 'Render MP4', icon: '🎬', auto: { PAUSED: false, SUPERVISED: false, AUTOPILOT: true } },
]

export default function AutopilotPage() {
  // Default: PAUSED (no infra for real automation yet — this is UI/structure)
  const [mode, setMode] = useState<AutopilotMode>('PAUSED')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Persist to localStorage for now (no backend endpoint yet)
    localStorage.setItem('affiliate_os_autopilot_mode', mode)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const current = MODES.find(m => m.mode === mode) ?? MODES[0]

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Autopilot</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Configure o nível de automação da IA no seu pipeline
        </p>
      </div>

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
                {/* Radio */}
                <div className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: active ? m.color : 'rgba(255,255,255,0.2)' }}>
                  {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{m.icon}</span>
                    <span className="font-bold text-base" style={{ color: active ? m.color : 'rgba(255,255,255,0.7)' }}>
                      {m.label}
                    </span>
                    {m.mode === 'AUTOPILOT' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                        EM BREVE
                      </span>
                    )}
                    {m.mode === 'SUPERVISED' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                        EM BREVE
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

      {/* Pipeline visualization */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold text-white mb-4">Pipeline no modo <span style={{ color: current.color }}>{current.label}</span></p>
        <div className="flex items-start gap-0">
          {PIPELINE_STEPS.map((step, i) => {
            const isAuto = step.auto[mode]
            return (
              <div key={step.id} className="flex-1 flex flex-col items-center gap-1.5 relative">
                {/* connector line */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 -translate-y-0.5"
                    style={{ background: isAuto ? current.color : 'rgba(255,255,255,0.08)', opacity: 0.5 }} />
                )}
                {/* circle */}
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

      {/* Save button */}
      <button onClick={handleSave} disabled={saving || saved}
        className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-70"
        style={{ background: saved ? 'rgba(34,197,94,0.2)' : 'var(--brand)', color: saved ? '#4ade80' : 'white',
          border: saved ? '2px solid rgba(34,197,94,0.4)' : 'none' }}>
        {saving ? '⏳ Salvando...' : saved ? '✅ Configuração salva!' : 'Salvar configuração'}
      </button>

      <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Autopilot e Supervisionado requerem infra adicional — em desenvolvimento
      </p>
    </div>
  )
}
