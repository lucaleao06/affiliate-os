/**
 * Content Package — assembles all artifacts for a single creative into one
 * structured object that's ready for publication or manual review.
 *
 * Package contents:
 *   video.mp4      — rendered vertical video (1080×1920)
 *   .srt           — synchronized captions
 *   caption        — social media caption text (Instagram / TikTok)
 *   cta            — call-to-action text
 *   affiliate_url  — deep link with affiliate tag
 *   product_id     — Supabase product FK
 *   channel        — target platform ('instagram' | 'tiktok' | 'youtube_shorts')
 *   checklist      — publication readiness checklist
 */
import fs from 'fs'
import path from 'path'

export type PublicationChannel = 'instagram' | 'tiktok' | 'youtube_shorts'

export interface ContentPackage {
  runId: string
  creativeId: string
  productId: string
  createdAt: string

  // Artifacts
  videoPath: string
  videoFilename: string
  downloadUrl: string
  srtPath: string | null
  captionsJsonPath: string | null

  // Copy
  caption: string
  cta: string
  affiliateUrl: string | null

  // Meta
  channel: PublicationChannel
  durationSec: number
  fileSizeBytes: number
  width: number
  height: number
  codec: string

  // Readiness
  checklist: PublicationChecklist
}

export interface PublicationChecklist {
  hasVideo: boolean
  hasCaptions: boolean
  hasCaption: boolean
  hasCTA: boolean
  hasAffiliateUrl: boolean
  videoIsVertical: boolean   // width < height
  videoMinDuration: boolean  // >= 5s
  videoMaxDuration: boolean  // <= 60s (TikTok/Reels limit)
  ready: boolean             // all required checks pass
}

export interface BuildPackageOptions {
  runId: string
  creativeId: string
  productId: string
  videoPath: string
  videoFilename: string
  downloadUrl: string
  srtPath?: string | null
  captionsJsonPath?: string | null
  caption: string
  cta: string
  affiliateUrl?: string | null
  channel: PublicationChannel
  durationSec: number
  fileSizeBytes: number
  width: number
  height: number
  codec: string
}

function buildChecklist(opts: BuildPackageOptions): PublicationChecklist {
  const hasVideo = fs.existsSync(opts.videoPath)
  const hasCaptions = !!(opts.srtPath && fs.existsSync(opts.srtPath))
  const hasCaption = opts.caption.trim().length > 0
  const hasCTA = opts.cta.trim().length > 0
  const hasAffiliateUrl = !!(opts.affiliateUrl && opts.affiliateUrl.trim().length > 0)
  const videoIsVertical = opts.width < opts.height
  const videoMinDuration = opts.durationSec >= 5
  const videoMaxDuration = opts.durationSec <= 60

  // Required: video exists, caption, CTA, vertical, duration in range
  const ready = hasVideo && hasCaption && hasCTA && videoIsVertical && videoMinDuration && videoMaxDuration

  return {
    hasVideo, hasCaptions, hasCaption, hasCTA, hasAffiliateUrl,
    videoIsVertical, videoMinDuration, videoMaxDuration, ready,
  }
}

export function buildContentPackage(opts: BuildPackageOptions): ContentPackage {
  const checklist = buildChecklist(opts)

  return {
    runId: opts.runId,
    creativeId: opts.creativeId,
    productId: opts.productId,
    createdAt: new Date().toISOString(),
    videoPath: opts.videoPath,
    videoFilename: opts.videoFilename,
    downloadUrl: opts.downloadUrl,
    srtPath: opts.srtPath ?? null,
    captionsJsonPath: opts.captionsJsonPath ?? null,
    caption: opts.caption,
    cta: opts.cta,
    affiliateUrl: opts.affiliateUrl ?? null,
    channel: opts.channel,
    durationSec: opts.durationSec,
    fileSizeBytes: opts.fileSizeBytes,
    width: opts.width,
    height: opts.height,
    codec: opts.codec,
    checklist,
  }
}

/** Save content package manifest as JSON next to the video */
export function saveContentPackage(pkg: ContentPackage): string {
  const dir = path.dirname(pkg.videoPath)
  const manifestPath = path.join(dir, `${pkg.runId}.package.json`)
  fs.writeFileSync(manifestPath, JSON.stringify(pkg, null, 2), 'utf8')
  return manifestPath
}
