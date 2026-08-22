/**
 * MetaPublicationProvider — Instagram Reels via Meta Graph API.
 *
 * API flow (3 steps):
 *   1. POST /{ig-user-id}/media  (media_type=REELS, video_url=<public_url>)
 *   2. Poll /{container-id}?fields=status_code until FINISHED
 *   3. POST /{ig-user-id}/media_publish  (creation_id={container-id})
 *
 * Video upload uses rupload.facebook.com, not graph.facebook.com.
 *
 * Requirements (BLOCKER — needs human action):
 *   - Instagram Business/Creator account linked to a Facebook Page
 *   - Meta Developer App with instagram_basic, instagram_content_publish permissions
 *   - App Review approval for instagram_content_publish (for non-test users)
 *   - META_APP_ID, META_APP_SECRET, META_ACCESS_TOKEN env vars
 *   - IG_USER_ID env var (Instagram Business account ID)
 *
 * Sources: https://developers.facebook.com/docs/instagram-platform/content-publishing/
 */
import type { PublicationProvider, PublicationChannel, PublicationPackage, PublishInput, PublishResult } from './types'

export class MetaPublicationProvider implements PublicationProvider {
  readonly channel: PublicationChannel = 'instagram'
  readonly name = 'meta-instagram'

  isReady(): boolean {
    return !!(
      process.env.META_ACCESS_TOKEN &&
      process.env.META_IG_USER_ID
    )
  }

  validate(pkg: PublicationPackage): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!pkg.checklist.hasVideo) errors.push('Sem vídeo')
    if (!pkg.checklist.videoIsVertical) errors.push('Vídeo deve ser 9:16')
    if (!pkg.checklist.videoMinDuration) errors.push('Mínimo 5 segundos')
    if (!pkg.checklist.videoMaxDuration) errors.push('Máximo 90 segundos para Reels')
    if (!pkg.checklist.rightsCleared) errors.push('Direitos de mídia não declarados')
    if (!pkg.downloadUrl.startsWith('https://')) errors.push('downloadUrl deve ser uma URL pública HTTPS (Meta exige)')
    return { valid: errors.length === 0, errors }
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    if (!this.isReady()) {
      return {
        success: false,
        requiresManualAction: true,
        error: 'META_ACCESS_TOKEN ou META_IG_USER_ID não configurados',
        manualInstructions: 'Configure META_ACCESS_TOKEN e META_IG_USER_ID nas env vars. Ver docs/PUBLISHING_RESEARCH.md.',
      }
    }

    const token = process.env.META_ACCESS_TOKEN!
    const igUserId = process.env.META_IG_USER_ID!
    const { pkg } = input

    try {
      // Step 1: Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: pkg.downloadUrl,
          caption: `${pkg.caption}\n\n${pkg.cta}${pkg.affiliateUrl ? `\n${pkg.affiliateUrl}` : ''}`,
          share_to_feed: true,
          access_token: token,
        }),
      })
      const containerData = await containerRes.json() as { id?: string; error?: { message: string } }
      if (!containerRes.ok || !containerData.id) {
        throw new Error(containerData.error?.message ?? 'Failed to create media container')
      }
      const containerId = containerData.id

      // Step 2: Poll until FINISHED (max 10 attempts, 15s apart)
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(r => setTimeout(r, 15_000))
        const statusRes = await fetch(
          `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${token}`
        )
        const statusData = await statusRes.json() as { status_code?: string }
        if (statusData.status_code === 'FINISHED') break
        if (statusData.status_code === 'ERROR') throw new Error('Meta media processing failed')
        // PUBLISHED or IN_PROGRESS — continue polling
      }

      // Step 3: Publish
      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId, access_token: token }),
      })
      const publishData = await publishRes.json() as { id?: string; error?: { message: string } }
      if (!publishRes.ok || !publishData.id) {
        throw new Error(publishData.error?.message ?? 'Failed to publish media')
      }

      return {
        success: true,
        platformPostId: publishData.id,
        publishedUrl: `https://www.instagram.com/p/${publishData.id}/`,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  async getStatus(platformPostId: string) {
    const token = process.env.META_ACCESS_TOKEN
    if (!token) return { status: 'unknown' }
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${platformPostId}?fields=permalink&access_token=${token}`)
      const data = await res.json() as { permalink?: string }
      return { status: 'published', url: data.permalink }
    } catch { return { status: 'error' } }
  }
}
