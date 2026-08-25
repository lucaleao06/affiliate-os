/**
 * GET /api/cron/autopilot — Vercel Cron: runs autopilot evaluation every hour.
 * Vercel sends Authorization: Bearer <CRON_SECRET> on each call.
 * Add CRON_SECRET to .env.local and Vercel env vars.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { evaluateForAutopilot } from '@/lib/autopilot/evaluator'
import type { AutopilotRules, AutopilotCandidate } from '@/lib/autopilot/evaluator'

export const dynamic = 'force-dynamic'

const DEFAULT_RULE_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdmin()
  const started = Date.now()

  // 1. Fetch autopilot rules
  const { data: rulesRow } = await admin
    .from('autopilot_rules')
    .select('*')
    .eq('id', DEFAULT_RULE_ID)
    .single()

  if (!rulesRow) {
    return NextResponse.json({ ok: false, message: 'Autopilot rules not found' })
  }
  const rules = rulesRow as AutopilotRules

  if (!rules.enabled || rules.mode === 'PAUSED') {
    return NextResponse.json({ ok: true, mode: rules.mode, evaluated: 0, message: 'Autopilot pausado' })
  }

  // 2. Fetch ready packages
  const { data: packages } = await admin
    .from('publication_packages')
    .select('*')
    .eq('status', 'ready')
    .limit(20)

  if (!packages || packages.length === 0) {
    return NextResponse.json({ ok: true, evaluated: 0, message: 'Nenhum candidato pronto' })
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
      await admin.from('publication_packages').update({ status: 'publishing' }).eq('id', pkg.id)
      await admin.from('notifications').insert({
        event: 'autopilot_published',
        title: 'Autopilot: publicando automaticamente',
        body: `${String(pkg.video_filename ?? pkg.id)} → ${String(pkg.channel ?? 'canal')}`,
        data: { packageId: pkg.id, gatesPassed: result.gatesPassed, mode: result.mode, cron: true },
      })
    } else if (result.decision === 'queue_for_approval') {
      await admin.from('publication_packages')
        .update({ status: 'ready', status_reason: 'Aguardando aprovação (SUPERVISIONADO)' })
        .eq('id', pkg.id)
      await admin.from('notifications').insert({
        event: 'approval_required',
        title: 'Aprovação necessária',
        body: result.reason,
        data: { packageId: pkg.id, gatesPassed: result.gatesPassed, mode: result.mode, cron: true },
      })
    } else if (result.decision === 'block') {
      await admin.from('notifications').insert({
        event: 'autopilot_blocked',
        title: 'Autopilot: candidato bloqueado',
        body: result.reason,
        data: { packageId: pkg.id, gatesFailed: result.gatesFailed, mode: result.mode, cron: true },
      })
    }
  }

  const elapsed = Date.now() - started

  return NextResponse.json({
    ok: true,
    mode: rules.mode,
    evaluated: packages.length,
    decisions,
    elapsedMs: elapsed,
    timestamp: new Date().toISOString(),
  })
}
