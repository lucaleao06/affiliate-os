/**
 * GET /api/connect/meta
 * Initiates Meta OAuth for Instagram Reels publishing.
 * Requires: META_APP_ID + NEXT_PUBLIC_BASE_URL in .env.local
 *
 * Scopes requested:
 *   instagram_basic, instagram_content_publish,
 *   pages_show_list, pages_read_engagement
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdmin } from '@/lib/supabase/server'

const META_VERSION = 'v21.0'

export async function GET() {
  const appId = process.env.META_APP_ID
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  if (!appId) {
    return NextResponse.json({
      error: 'META_APP_ID não configurado.',
      instructions: 'Adicione META_APP_ID e META_APP_SECRET no .env.local. Ver docs/PUBLISHING_RESEARCH.md.',
    }, { status: 503 })
  }

  // CSRF state — stored temporarily in platform_connections
  const state = crypto.randomBytes(16).toString('hex')
  const admin = createAdmin()
  await admin.from('platform_connections').upsert({
    workspace_id: '00000000-0000-0000-0000-000000000001',
    platform: 'instagram_oauth_state',
    access_token_enc: state,
    raw_meta: { pending: true, initiated_at: new Date().toISOString() },
  }, { onConflict: 'workspace_id,platform' })

  const redirectUri = `${baseUrl}/api/connect/meta/callback`
  // instagram_content_publish requer configuração de Use Case no Meta Developer Console.
  // Conectamos com scopes básicos primeiro; publishing requer configuração adicional.
  const scopes = 'instagram_basic,pages_show_list,pages_read_engagement'

  const authUrl = new URL(`https://www.facebook.com/${META_VERSION}/dialog/oauth`)
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
