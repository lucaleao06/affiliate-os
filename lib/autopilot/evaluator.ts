/**
 * Autopilot Evaluator — evaluates whether a creative/package can advance automatically.
 * Gates: score, rights, risk, channel, commission_rate, daily limit, checklist.ready.
 *
 * PAUSED    → nothing advances
 * SUPERVISED → system prepares + generates approval_required notification
 * AUTOPILOT  → advances automatically only when provider is real (not manual)
 */

export type AutopilotMode = 'PAUSED' | 'SUPERVISED' | 'AUTOPILOT'

export interface AutopilotRules {
  enabled: boolean
  mode: AutopilotMode
  min_score: number
  min_commission_rate: number
  max_risk_score: number
  allowed_channels: string[]
  allowed_categories: string[]
  allowed_rights_status: string[]
  max_posts_per_day: number
  require_human_approval: boolean
}

export interface AutopilotCandidate {
  id: string
  type: 'creative' | 'publication_package'
  score?: number
  risk_score?: number
  rights_status?: string
  channel?: string
  category?: string
  commission_rate?: number
  checklist_ready?: boolean
  provider?: string   // 'manual' | 'instagram' | 'tiktok' | etc.
}

export interface EvaluationResult {
  candidateId: string
  allowed: boolean
  mode: AutopilotMode
  decision: 'advance' | 'queue_for_approval' | 'block' | 'skip'
  gatesPassed: string[]
  gatesFailed: string[]
  reason: string
  timestamp: string
}

export function evaluateForAutopilot(
  candidate: AutopilotCandidate,
  rules: AutopilotRules,
  postsToday: number
): EvaluationResult {
  const now = new Date().toISOString()
  const gatesPassed: string[] = []
  const gatesFailed: string[] = []

  // Mode gate
  if (!rules.enabled || rules.mode === 'PAUSED') {
    return {
      candidateId: candidate.id,
      allowed: false,
      mode: rules.mode,
      decision: 'block',
      gatesPassed: [],
      gatesFailed: ['mode_paused'],
      reason: 'Autopilot pausado',
      timestamp: now,
    }
  }

  // Score gate
  if (candidate.score !== undefined) {
    if (candidate.score >= rules.min_score) gatesPassed.push('score')
    else gatesFailed.push(`score (${candidate.score} < ${rules.min_score})`)
  } else {
    gatesPassed.push('score_skipped')
  }

  // Risk gate
  if (candidate.risk_score !== undefined) {
    if (candidate.risk_score <= rules.max_risk_score) gatesPassed.push('risk_score')
    else gatesFailed.push(`risk_score (${candidate.risk_score} > ${rules.max_risk_score})`)
  } else {
    gatesPassed.push('risk_skipped')
  }

  // Rights gate
  if (candidate.rights_status) {
    if (rules.allowed_rights_status.includes(candidate.rights_status)) gatesPassed.push('rights_status')
    else gatesFailed.push(`rights_status (${candidate.rights_status} not in [${rules.allowed_rights_status.join(',')}])`)
  }

  // Channel gate
  if (candidate.channel) {
    if (rules.allowed_channels.length === 0 || rules.allowed_channels.includes(candidate.channel)) {
      gatesPassed.push('channel')
    } else {
      gatesFailed.push(`channel (${candidate.channel} not allowed)`)
    }
  }

  // Commission rate gate
  if (candidate.commission_rate !== undefined) {
    if (candidate.commission_rate >= rules.min_commission_rate) gatesPassed.push('commission_rate')
    else gatesFailed.push(`commission_rate (${candidate.commission_rate} < ${rules.min_commission_rate})`)
  } else {
    gatesPassed.push('commission_rate_skipped')
  }

  // Checklist gate
  if (candidate.checklist_ready === true) gatesPassed.push('checklist')
  else if (candidate.checklist_ready === false) gatesFailed.push('checklist_not_ready')
  else gatesPassed.push('checklist_skipped')

  // Daily limit gate
  if (postsToday < rules.max_posts_per_day) gatesPassed.push('daily_limit')
  else gatesFailed.push(`daily_limit (${postsToday} >= ${rules.max_posts_per_day})`)

  // Provider gate: AUTOPILOT mode must not use manual provider
  const providerIsReal = !candidate.provider || candidate.provider !== 'manual'

  const allGatesPassed = gatesFailed.length === 0

  if (!allGatesPassed) {
    return {
      candidateId: candidate.id,
      allowed: false,
      mode: rules.mode,
      decision: 'block',
      gatesPassed,
      gatesFailed,
      reason: `Gates falharam: ${gatesFailed.join('; ')}`,
      timestamp: now,
    }
  }

  // SUPERVISED: all gates pass → queue for human approval
  if (rules.mode === 'SUPERVISED') {
    return {
      candidateId: candidate.id,
      allowed: false,
      mode: 'SUPERVISED',
      decision: 'queue_for_approval',
      gatesPassed,
      gatesFailed: [],
      reason: 'Modo SUPERVISIONADO: todos os gates passaram, aguardando aprovação humana',
      timestamp: now,
    }
  }

  // AUTOPILOT: all gates pass + real provider → advance
  if (rules.mode === 'AUTOPILOT') {
    if (!providerIsReal) {
      return {
        candidateId: candidate.id,
        allowed: false,
        mode: 'AUTOPILOT',
        decision: 'queue_for_approval',
        gatesPassed,
        gatesFailed: ['provider_manual'],
        reason: 'Modo AUTOPILOT: provider é manual — não publica automaticamente. Requer ação humana.',
        timestamp: now,
      }
    }
    return {
      candidateId: candidate.id,
      allowed: true,
      mode: 'AUTOPILOT',
      decision: 'advance',
      gatesPassed,
      gatesFailed: [],
      reason: 'Todos os gates passaram, avançando automaticamente',
      timestamp: now,
    }
  }

  return {
    candidateId: candidate.id,
    allowed: false,
    mode: rules.mode,
    decision: 'block',
    gatesPassed,
    gatesFailed: ['unknown_mode'],
    reason: 'Modo desconhecido',
    timestamp: now,
  }
}
