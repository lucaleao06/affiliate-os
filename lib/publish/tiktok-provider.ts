/**
 * TikTokPublicationProvider — Content Posting API.
 *
 * Requirements (BLOCKER — needs human action):
 *   - TikTok Developer App with Content Posting API product added
 *   - Scopes: video.upload + video.publish
 *   - App audit passed (otherwise posts are private-only)
 *   - OAuth 2.0 per-user token (TIKTOK_ACCESS_TOKEN)
 *   - Max 25 videos/account/day, MP4 up to 1GB, max 90s for Shorts eligibility
 *
 * Sources: https://developers.tiktok.com/doc/content-posting-api-get-started
 */
import type { PublicationProvider, PublicationChannel, PublicationPackage, PublishInput, PublishResult } from './types'

export class TikTokPublicationProvider implements PublicationProvider {
  readonly channel: PublicationChannel = 'tiktok'
  readonly name = 'tiktok'

  isReady(): boolean {
    return !!process.env.TIKTOK_ACCESS_TOKEN
  }

  validate(pkg: PublicationPackage): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!pkg.checklist.hasVideo) errors.push('Sem vídeo')
    if (!pkg.checklist.videoMinDuration) errors.push('Mínimo 5 segundos')
    if (!pkg.checklist.rightsCleared) errors.push('Direitos não declarados')
    return { valid: errors.length === 0, errors }
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    if (!this.isReady()) {
      return {
        success: false,
        requiresManualAction: true,
        error: 'TIKTOK_ACCESS_TOKEN não configurado',
        manualInstructions: 'OAuth TikTok necessário. Ver docs/PUBLISHING_RESEARCH.md → seção TikTok.',
      }
    }

    // TikTok Content Posting API: POST video via URL
    const token = process.env.TIKTOK_ACCESS_TOKEN!
    const { pkg } = input

    try {
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: pkg.caption.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: pkg.downloadUrl,
          },
        }),
      })
      const data = await res.json() as { data?: { publish_id?: string }; error?: { code?: string; message?: string } }
      if (!res.ok) throw new Error(data.error?.message ?? `TikTok API error: ${res.status}`)
      return { success: true, platformPostId: data.data?.publish_id }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  async getStatus(platformPostId: string) {
    const token = process.env.TIKTOK_ACCESS_TOKEN
    if (!token) return { status: 'unknown' }
    try {
      const res = await fetch(`https://open.tiktokapis.com/v2/post/publish/status/fetch/?publish_id=${platformPostId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json() as { data?: { status?: string } }
      return { status: data.data?.status ?? 'unknown' }
    } catch { return { status: 'error' } }
  }
}
