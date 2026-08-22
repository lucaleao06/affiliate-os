/**
 * POST /api/autopilot/run — evaluate candidates against autopilot rules.
 * Finds publication_packages with status 'ready', evaluates each, records decisions, fires notifications.
 * GET  /api/autopilot/run — list recent evaluation records.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { evaluateForAutopilot } from '@/lib/autopilot/evaluator'
import type { AutopilotRules, AutopilotCandidate } from '@/lib/autopilot/evaluator'

export const dynamic = 'force-dynamic'

const DEFAULT_RULE_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const admin = createAdmin()
  // Return recent evaluation logs from notifications (event=autopilot_*)
  const { data } = await admin
    .from('notifications')
    .select('*')
    .in('event', ['autopilot_blocked', 'autopilot_published', 'approval_required'])
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json({ evaluations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const admin = createAdmin()
  const body = await req.json().catch(() => ({})) as { candidateIds?: string[] }

  // 1. Fetch autopilot rules
  const { data: rulesRow } = await admin
    .from('autopilot_rules')
    .select('*')
    .eq('id', DEFAULT_RULE_ID)
    .single()

  if (!rulesRow) {
    return NextResponse.json({ error: 'Autopilot rules not found — run migration 003' }, { status: 500 })
  }
  const rules = rulesRow as AutopilotRules

  if (!rules.enabled || rules.mode === 'PAUSED') {
    return NextResponse.json({ ok: true, mode: rules.mode, evaluated: 0, decisions: [], message: 'Autopilot pausado' })
  }

  // 2. Fetch candidates (ready publication packages)
  let query = admin.from('publication_packages').select('*').eq('status', 'ready').limit(20)
  if (body.candidateIds?.length) {
    query = admin.from('publication_packages').select('*').in('id', body.candidateIds).limit(20)
  }
  const { data: packages } = await query
  if (!packages || packages.length === 0) {
    return NextResponse.json({ ok: true, evaluated: 0, decisions: [], message: 'Nenhum candidato pronto' })
  }

  // 3. Count posts today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: postsToday } = await admin
    .from('publication_packages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', todayStart.toISOString())

  const decisions: Array<{ candidateId: string; decision: string; reason: string }> = []

  for (const pkg of packages) {
    const candidate: AutopilotCandidate = {
      id: pkg.id as string,
      type: 'publication_package',
      rights_status: pkg.rights_status as string,
      channel: pkg.channel as string,
      checklist_ready: (pkg.checklist as { ready?: boolean } | null)?.ready ?? false,
      provider: pkg.channel as string,
    }

    const result = evaluateForAutopilot(candidate, rules, postsToday ?? 0)
    decisions.push({ candidateId: result.candidateId, decision: result.decision, reason: result.reason })

    if (result.decision === 'advance') {
      // Mark as publishing and fire event
      await admin.from('publication_packages').update({ status: 'publishing' }).eq('id', pkg.id)
      await admin.from('notifications').insert({
        event: 'autopilot_published',
        title: '🤖 Autopilot: publicando automaticamente',
        body: `${pkg.video_filename} → ${pkg.channel}`,
        data: {
          packageId: pkg.id,
          gatesPassed: result.gatesPassed,
          mode: result.mode,
        },
      })
      // Note: actual publish() call would go here when real OAuth is connected
      // For now, status remains 'publishing' until provider is configured

    } else if (result.decision === 'queue_for_approval') {
      await admin.from('publication_packages').update({ status: 'ready', status_reason: 'Aguardando aprovação (modo SUPERVISIONADO)' }).eq('id', pkg.id)
      await admin.from('notifications').insert({
        event: 'approval_required',
        title: '⏳ Aprovação necessária',
        body: result.reason,
        data: {
          packageId: pkg.id,
          gatesPassed: result.gatesPassed,
          mode: result.mode,
        },
      })

    } else if (result.decision === 'block') {
      await admin.from('notifications').insert({
        event: 'autopilot_blocked',
        title: '🚫 Autopilot: candidato bloqueado',
        body: result.reason,
        data: {
          packageId: pkg.id,
          gatesFailed: result.gatesFailed,
          mode: result.mode,
        },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    mode: rules.mode,
    evaluated: packages.length,
    decisions,
  })
}
