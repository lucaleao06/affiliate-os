import { NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdmin()
  const { data } = await admin
    .from('platform_connections')
    .select('platform_user_id, platform_username, token_expires_at, scopes, raw_meta, created_at')
    .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
    .eq('platform', 'instagram')
    .maybeSingle()

  if (!data) return NextResponse.json({ connected: false })

  const expired = data.token_expires_at
    ? new Date(data.token_expires_at) < new Date()
    : false

  return NextResponse.json({
    connected: true,
    expired,
    username: data.platform_username,
    userId: data.platform_user_id,
    expiresAt: data.token_expires_at,
    scopes: data.scopes,
    meta: data.raw_meta,
    connectedAt: data.created_at,
  })
}
