/**
 * GET /api/connect/meta/callback
 * Handles Meta OAuth callback — exchanges code for long-lived token,
 * discovers IG Business account, stores encrypted in platform_connections.
 *
 * Required env: META_APP_ID, META_APP_SECRET, ENCRYPTION_KEY, NEXT_PUBLIC_BASE_URL
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto/token-encrypt'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const connectUrl = `${baseUrl}/connect`

  if (errorParam) {
    return NextResponse.redirect(`${connectUrl}?error=${encodeURIComponent(searchParams.get('error_description') ?? errorParam)}`)
  }
  if (!code || !state) return NextResponse.redirect(`${connectUrl}?error=missing_code`)

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return NextResponse.redirect(`${connectUrl}?error=missing_env_meta`)

  const admin = createAdmin()

  // Verify CSRF state
  const { data: stateRow } = await admin
    .from('platform_connections')
    .select('access_token_enc')
    .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
    .eq('platform', 'instagram_oauth_state')
    .single()

  if (!stateRow || stateRow.access_token_enc !== state) {
    return NextResponse.redirect(`${connectUrl}?error=invalid_state`)
  }

  const redirectUri = `${baseUrl}/api/connect/meta/callback`

  try {
    // Step 1: Short-lived user access token
    const tokenRes = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
      client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code,
    }))
    const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } }
    if (!tokenData.access_token) throw new Error(tokenData.error?.message ?? 'Token exchange failed')

    // Step 2: Exchange for long-lived token (~60 days)
    const longRes = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId, client_secret: appSecret,
      fb_exchange_token: tokenData.access_token,
    }))
    const longData = await longRes.json() as {
      access_token?: string; expires_in?: number; error?: { message: string }
    }
    if (!longData.access_token) throw new Error(longData.error?.message ?? 'Long-lived token exchange failed')

    const longToken = longData.access_token
    const expiresAt = new Date(Date.now() + (longData.expires_in ?? 5183944) * 1000).toISOString()

    // Step 3: Get Facebook Pages
    const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${longToken}`)
    const pagesData = await pagesRes.json() as {
      data?: Array<{ id: string; name: string; access_token: string }>
    }
    const pages = pagesData.data ?? []

    // Step 4: Discover linked IG Business account
    let igUserId: string | null = null
    let igUsername: string | null = null
    let pageName: string | null = null

    for (const page of pages) {
      const igRes = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${longToken}`)
      const igData = await igRes.json() as { instagram_business_account?: { id: string } }
      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id
        pageName = page.name
        // Get username
        const profileRes = await fetch(`${GRAPH}/${igUserId}?fields=username&access_token=${longToken}`)
        const profileData = await profileRes.json() as { username?: string }
        igUsername = profileData.username ?? null
        break
      }
    }

    if (!igUserId) {
      return NextResponse.redirect(
        `${connectUrl}?error=no_ig_business&pages=${pages.length}`
      )
    }

    // Step 5: Encrypt and store
    await admin.from('platform_connections').upsert({
      workspace_id: '00000000-0000-0000-0000-000000000001',
      platform: 'instagram',
      access_token_enc: encrypt(longToken),
      token_expires_at: expiresAt,
      platform_user_id: igUserId,
      platform_username: igUsername,
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
      raw_meta: { page_name: pageName, pages_found: pages.length },
    }, { onConflict: 'workspace_id,platform' })

    // Clean up state row
    await admin.from('platform_connections').delete()
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .eq('platform', 'instagram_oauth_state')

    return NextResponse.redirect(`${connectUrl}?success=instagram&ig=${encodeURIComponent(igUsername ?? '')}`)
  } catch (err) {
    // Never log appSecret
    console.error('[meta/callback] error:', String(err).replace(appSecret, '***'))
    return NextResponse.redirect(`${connectUrl}?error=callback_failed`)
  }
}
