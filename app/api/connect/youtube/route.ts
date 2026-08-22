/**
 * GET /api/connect/youtube
 * Initiates Google OAuth for YouTube Shorts publishing.
 * Requires: GOOGLE_CLIENT_ID, NEXT_PUBLIC_BASE_URL in .env.local
 *
 * Scopes: youtube.upload, youtube.readonly
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdmin } from '@/lib/supabase/server'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  if (!clientId) {
    return NextResponse.json({
      error: 'GOOGLE_CLIENT_ID não configurado.',
      instructions: 'Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.local.',
    }, { status: 503 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const admin = createAdmin()
  await admin.from('platform_connections').upsert({
    workspace_id: '00000000-0000-0000-0000-000000000001',
    platform: 'youtube_oauth_state',
    access_token_enc: state,
    raw_meta: { pending: true, initiated_at: new Date().toISOString() },
  }, { onConflict: 'workspace_id,platform' })

  const redirectUri = `${baseUrl}/api/connect/youtube/callback`
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ].join(' '))
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent') // forces refresh_token
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
