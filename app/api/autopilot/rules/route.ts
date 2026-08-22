/**
 * GET  /api/autopilot/rules — get the global autopilot rule.
 * PATCH /api/autopilot/rules — update the global autopilot rule.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_RULE_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const admin = createAdmin()
  const { data, error } = await admin.from('autopilot_rules').select('*').eq('id', DEFAULT_RULE_ID).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data })
}

export async function PATCH(req: NextRequest) {
  const admin = createAdmin()
  const updates = await req.json() as Record<string, unknown>

  // Whitelist mutable fields — never allow id or created_at to be overwritten
  const allowed = [
    'enabled', 'mode', 'min_score', 'min_commission_rate', 'max_risk_score',
    'allowed_channels', 'allowed_categories', 'allowed_rights_status',
    'max_posts_per_day', 'require_human_approval',
  ]
  const safe: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) safe[key] = updates[key]
  }
  safe.updated_at = new Date().toISOString()

  const { data, error } = await admin.from('autopilot_rules').update(safe).eq('id', DEFAULT_RULE_ID).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rules: data })
}
