/**
 * MetaPublicationProvider — Instagram Reels via Meta Graph API v21.0.
 *
 * Token source (priority):
 *   1. platform_connections table (encrypted, set via /api/connect/meta OAuth)
 *   2. Env fallback: META_ACCESS_TOKEN + META_IG_USER_ID (legacy / testing)
 *
 * API flow (3 steps):
 *   1. POST /{ig-user-id}/media  (media_type=REELS, video_url=<public HTTPS URL>)
 *   2. Poll /{container-id}?fields=status_code until FINISHED
 *   3. POST /{ig-user-id}/media_publish  (creation_id={container-id})
 *
 * BLOQUEIO HUMANO: user must complete OAuth at /connect before first publish.
 * Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing/
 */
import type { PublicationProvider, PublicationChannel, PublicationPackage, PublishInput, PublishResult } from './types'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function getMetaCredentials(): Promise<{ token: string; igUserId: string } | null> {
  try {
    const { createAdmin } = await import('@/lib/supabase/server')
    const { decrypt } = await import('@/lib/crypto/token-encrypt')
    const admin = createAdmin()
    const { data } = await admin
      .from('platform_connections')
      .select('access_token_enc, platform_user_id, token_expires_at')
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .eq('platform', 'instagram')
      .maybeSingle()
    if (!data?.access_token_enc || !data.platform_user_id) return null
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) return null
    return { token: decrypt(data.access_token_enc), igUserId: data.platform_user_id }
  } catch { return null }
}

export class MetaPublicationProvider implements PublicationProvider {
  readonly channel: PublicationChannel = 'instagram'
  readonly name = 'meta-instagram'

  isReady(): boolean {
    // Sync check — uses env fallback only (DB check is async, call isReadyAsync for real check)
    return !!(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID)
  }

  async isReadyAsync(): Promise<boolean> {
    const creds = await getMetaCredentials()
    if (creds) return true
    return this.isReady()
  }

  validate(pkg: PublicationPackage): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!pkg.checklist.hasVideo)        errors.push('Sem vídeo')
    if (!pkg.checklist.videoIsVertical) errors.push('Vídeo deve ser 9:16 vertical')
    if (!pkg.checklist.videoMinDuration) errors.push('Mínimo 5 segundos')
    if (!pkg.checklist.videoMaxDuration) errors.push('Máximo 90 segundos para Reels')
    if (!pkg.checklist.rightsCleared)   errors.push('Direitos de mídia não declarados')
    if (!pkg.downloadUrl.startsWith('https://')) {
      errors.push('downloadUrl deve ser HTTPS público (Meta exige URL acessível)')
    }
    return { valid: errors.length === 0, errors }
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    // Try DB creds first, fall back to env
    const creds = await getMetaCredentials()
    const token = creds?.token ?? process.env.META_ACCESS_TOKEN
    const igUserId = creds?.igUserId ?? process.env.META_IG_USER_ID

    if (!token || !igUserId) {
      return {
        success: false,
        requiresManualAction: true,
        error: 'Instagram não conectado',
        manualInstructions:
          'Acesse /connect e clique em "Conectar Instagram".\n' +
          'Você precisará de: conta Instagram Business ou Creator vinculada a uma Página do Facebook.\n' +
          'Após conectar, o sistema publicará automaticamente.',
      }
    }

    const { pkg } = input

    try {
      // Step 1: Create Reels media container
      const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: pkg.downloadUrl,
          caption: [pkg.caption, pkg.cta, pkg.affiliateUrl].filter(Boolean).join('\n\n'),
          share_to_feed: true,
          access_token: token,
        }),
      })
      const containerData = await containerRes.json() as { id?: string; error?: { message: string } }
      if (!containerData.id) throw new Error(containerData.error?.message ?? 'Failed to create media container')
      const containerId = containerData.id

      // Step 2: Poll status (max 10 × 15s = 150s)
      let finished = false
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 15_000))
        const statusRes = await fetch(`${GRAPH}/${containerId}?fields=status_code&access_token=${token}`)
        const statusData = await statusRes.json() as { status_code?: string }
        if (statusData.status_code === 'FINISHED') { finished = true; break }
        if (statusData.status_code === 'ERROR') throw new Error('Meta media processing failed')
        // IN_PROGRESS — continue polling
      }
      if (!finished) throw new Error('Media processing timeout after 150s')

      // Step 3: Publish
      const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId, access_token: token }),
      })
      const publishData = await publishRes.json() as { id?: string; error?: { message: string } }
      if (!publishData.id) throw new Error(publishData.error?.message ?? 'Failed to publish media')

      return {
        success: true,
        platformPostId: publishData.id,
        publishedUrl: `https://www.instagram.com/reel/${publishData.id}/`,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  async getStatus(platformPostId: string): Promise<{ status: string; url?: string }> {
    const creds = await getMetaCredentials()
    const token = creds?.token ?? process.env.META_ACCESS_TOKEN
    if (!token) return { status: 'unknown' }
    try {
      const res = await fetch(`${GRAPH}/${platformPostId}?fields=permalink&access_token=${token}`)
      const data = await res.json() as { permalink?: string }
      return { status: 'published', url: data.permalink }
    } catch { return { status: 'error' } }
  }
}
