/**
 * YouTubePublicationProvider — YouTube Shorts via Data API v3 resumable upload.
 *
 * Token source: platform_connections table (set via /api/connect/youtube OAuth)
 * Refresh: automatic via refresh_token when access_token expires.
 *
 * Upload flow:
 *   1. Initiate resumable upload session (POST to googleapis.com/upload/youtube/v3/videos)
 *   2. Upload video bytes to the session URI
 *   3. Set as Short: video < 60s + vertical aspect ratio → YouTube auto-classifies
 *
 * BLOQUEIO HUMANO: user must complete OAuth at /connect before first publish.
 * Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
 */
import type { PublicationProvider, PublicationChannel, PublicationPackage, PublishInput, PublishResult } from './types'

async function getYouTubeToken(): Promise<string | null> {
  try {
    const { createAdmin } = await import('@/lib/supabase/server')
    const { decrypt, encrypt } = await import('@/lib/crypto/token-encrypt')
    const admin = createAdmin()

    const { data } = await admin
      .from('platform_connections')
      .select('access_token_enc, refresh_token_enc, token_expires_at')
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .eq('platform', 'youtube')
      .maybeSingle()

    if (!data?.access_token_enc) return null

    // If not expired, return existing token
    if (!data.token_expires_at || new Date(data.token_expires_at) > new Date(Date.now() + 60_000)) {
      return decrypt(data.access_token_enc)
    }

    // Refresh token
    if (!data.refresh_token_enc) return null
    const refreshToken = decrypt(data.refresh_token_enc)
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) return null

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data2 = await res.json() as { access_token?: string; expires_in?: number }
    if (!data2.access_token) return null

    // Store refreshed token
    await admin.from('platform_connections').update({
      access_token_enc: encrypt(data2.access_token),
      token_expires_at: new Date(Date.now() + (data2.expires_in ?? 3600) * 1000).toISOString(),
    })
      .eq('workspace_id', '00000000-0000-0000-0000-000000000001')
      .eq('platform', 'youtube')

    return data2.access_token
  } catch { return null }
}

export class YouTubePublicationProvider implements PublicationProvider {
  readonly channel: PublicationChannel = 'youtube_shorts'
  readonly name = 'youtube-shorts'

  isReady(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  }

  async isReadyAsync(): Promise<boolean> {
    const token = await getYouTubeToken()
    return token !== null
  }

  validate(pkg: PublicationPackage): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!pkg.checklist.hasVideo)        errors.push('Sem vídeo')
    if (!pkg.checklist.videoIsVertical) errors.push('Vídeo deve ser 9:16 vertical (YouTube Shorts)')
    if (!pkg.checklist.videoMinDuration) errors.push('Mínimo 5 segundos')
    // YouTube Shorts: max 60s (different from Reels/TikTok 90s)
    if (pkg.durationSec > 60)           errors.push('Máximo 60 segundos para YouTube Shorts')
    if (!pkg.checklist.rightsCleared)   errors.push('Direitos de mídia não declarados')
    // YouTube accepts direct upload — no HTTPS requirement like Meta
    return { valid: errors.length === 0, errors }
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const token = await getYouTubeToken()

    if (!token) {
      return {
        success: false,
        requiresManualAction: true,
        error: 'YouTube não conectado',
        manualInstructions:
          'Acesse /connect e clique em "Conectar YouTube".\n' +
          'Você precisará de: conta Google com canal YouTube ativo.\n' +
          'Após conectar, o sistema enviará o vídeo automaticamente.',
      }
    }

    const { pkg } = input

    try {
      // Step 1: Fetch video bytes from local URL
      // For local URLs, we fetch directly; for public HTTPS, fetch externally
      const videoUrl = pkg.downloadUrl.startsWith('http')
        ? pkg.downloadUrl
        : `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}${pkg.downloadUrl}`

      const videoRes = await fetch(videoUrl)
      if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`)
      const videoBuffer = await videoRes.arrayBuffer()
      const videoSize = videoBuffer.byteLength

      // Step 2: Initiate resumable upload
      const title = pkg.caption.slice(0, 100) // YT title max 100
      const description = [pkg.caption, pkg.cta, pkg.affiliateUrl].filter(Boolean).join('\n\n')
      const initRes = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': String(videoSize),
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
              tags: ['shorts', 'affiliate'],
              categoryId: '22', // People & Blogs
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          }),
        }
      )

      if (!initRes.ok) {
        const err = await initRes.text()
        throw new Error(`Resumable upload init failed: ${err}`)
      }

      const uploadUri = initRes.headers.get('Location')
      if (!uploadUri) throw new Error('No upload URI in response')

      // Step 3: Upload video bytes
      const uploadRes = await fetch(uploadUri, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'video/mp4',
          'Content-Length': String(videoSize),
        },
        body: videoBuffer,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        throw new Error(`Video upload failed: ${err}`)
      }

      const uploadData = await uploadRes.json() as { id?: string; error?: { message: string } }
      if (!uploadData.id) throw new Error(uploadData.error?.message ?? 'Upload did not return video ID')

      return {
        success: true,
        platformPostId: uploadData.id,
        publishedUrl: `https://www.youtube.com/shorts/${uploadData.id}`,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  }

  async getStatus(platformPostId: string): Promise<{ status: string; url?: string }> {
    const token = await getYouTubeToken()
    if (!token) return { status: 'unknown' }
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=status&id=${platformPostId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json() as { items?: Array<{ status: { uploadStatus: string } }> }
      const status = data.items?.[0]?.status.uploadStatus ?? 'unknown'
      return {
        status,
        url: status === 'processed' ? `https://www.youtube.com/shorts/${platformPostId}` : undefined,
      }
    } catch { return { status: 'error' } }
  }
}
