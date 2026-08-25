'use client'

import Link from 'next/link'

type Stage = { label: string; detail: string; href: string; state: 'done' | 'active' | 'next' }

export function PipelineWidget({
  products,
  avgScore,
  pending,
  approved,
}: {
  products: number
  avgScore: number
  pending: number
  approved: number
}) {
  const stages: Stage[] = [
    { label: 'Produto', detail: products ? `${products} no catálogo` : 'Adicione um produto', href: '/products', state: products ? 'done' : 'active' },
    { label: 'Score', detail: avgScore ? `${avgScore}/100 médio` : 'Aguardando análise', href: '/products', state: avgScore ? 'done' : 'next' },
    { label: 'Criativo', detail: pending ? `${pending} para revisar` : approved ? `${approved} aprovado${approved > 1 ? 's' : ''}` : 'Gere variações', href: '/queue', state: pending ? 'active' : approved ? 'done' : 'next' },
    { label: 'Aprovação', detail: approved ? `${approved} liberado${approved > 1 ? 's' : ''}` : 'Sua decisão', href: '/queue', state: approved ? 'done' : 'next' },
    { label: 'Vídeo', detail: approved ? 'Pronto para produção' : 'Depende de aprovação', href: '/video-factory', state: approved ? 'active' : 'next' },
    { label: 'Distribuição', detail: 'Sempre supervisionada', href: '/distribute', state: 'next' },
  ]

  return (
    <section aria-label="Pipeline da operação" className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Pipeline</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Da seleção à publicação, com revisão humana.</p>
        </div>
        <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--brand)' }}>Operação</span>
      </div>
      <div className="flex overflow-x-auto pb-1 -mx-1 px-1 gap-2 snap-x">
        {stages.map((stage, index) => {
          const color = stage.state === 'done' ? '#45B7A0' : stage.state === 'active' ? 'var(--brand)' : 'rgba(255,255,255,0.28)'
          return (
            <div key={stage.label} className="flex items-stretch gap-2 shrink-0 snap-start">
              <Link href={stage.href} className="w-32 min-h-[104px] rounded-xl p-3 transition-transform active:scale-[0.98]" style={{ background: stage.state === 'active' ? 'rgba(255,107,53,0.09)' : 'var(--surface-2)', border: `1px solid ${stage.state === 'active' ? 'rgba(255,107,53,0.36)' : 'var(--border)'}` }}>
                <span className="block w-2 h-2 rounded-full mb-4" style={{ background: color }} />
                <p className="text-sm font-semibold text-white">{stage.label}</p>
                <p className="text-[11px] leading-4 mt-1" style={{ color: 'rgba(255,255,255,0.48)' }}>{stage.detail}</p>
              </Link>
              {index < stages.length - 1 && <div className="w-3 flex items-center" aria-hidden="true"><div className="h-px w-full" style={{ background: 'var(--border)' }} /></div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
