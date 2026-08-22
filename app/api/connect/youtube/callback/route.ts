/**
 * GET /api/connect/youtube/callback
 * Google OAuth callback — exchanges code for tokens, discovers channel, stores encrypted.
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENCRYPTION_KEY, NEXT_PUBLIC_BASE_URL
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto/token-encrypt'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const connectUrl = `${baseUrl}/connect`

  if (errorParam) return NextResponse.redirect(`${connectUrl}?error=${encodeURIComponent(errorParam)}`)
  if (!code || !state) return NextResponse.redirect(`${connectUrl}?error=missing_code`)

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.redirect(`${connectUrl}?error=missing_env_google`)

  const admin = createAdmin()

  // Verify CSRF
  const { data: stateRow } = await admin
    .from('platform_connections')
    .select('access_token_enc')
    .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
    .eq('platform', 'youtube_oauth_state')
    .maybeSingle()

  if (!stateRow || stateRow.access_token_enc !== state) {
    return NextResponse.redirect(`${connectUrl}?error=invalid_state`)
  }

  const redirectUri = `${baseUrl}/api/connect/youtube/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json() as {
      access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string
    }
    if (!tokenData.access_token) throw new Error(tokenData.error ?? 'Token exchange failed')

    const { access_token, refresh_token, expires_in, scope } = tokenData
    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString()

    // Discover YouTube channel
    const chRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${access_token}` } }
    )
    const chData = await chRes.json() as {
      items?: Array<{ id: string; snippet: { title: string; customUrl?: string } }>
    }
    const ch = chData.items?.[0]

    // Store encrypted (never log access_token/refresh_token)
    await admin.from('platform_connections').upsert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      platform: 'youtube',
      access_token_enc: encrypt(access_token),
      refresh_token_enc: refresh_token ? encrypt(refresh_token) : null,
      token_expires_at: expiresAt,
      platform_user_id: ch?.id ?? null,
      platform_username: ch?.snippet.title ?? null,
      scopes: (scope ?? '').split(' ').filter(Boolean),
      raw_meta: { custom_url: ch?.snippet.customUrl ?? null },
    }, { onConflict: 'workspace_id,platform' })

    // Clean up state
    await admin.from('platform_connections').delete()
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .eq('platform', 'youtube_oauth_state')

    return NextResponse.redirect(`${connectUrl}?success=youtube&channel=${encodeURIComponent(ch?.snippet.title ?? '')}`)
  } catch (err) {
    console.error('[youtube/callback]', String(err).replace(clientSecret, '***'))
    return NextResponse.redirect(`${connectUrl}?error=callback_failed`)
  }
}
