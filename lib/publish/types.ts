/**
 * PublicationProvider abstraction — generic layer for all social channels.
 * Never couple channel-specific logic to the core pipeline.
 */

export type PublicationChannel = 'instagram' | 'tiktok' | 'youtube_shorts' | 'shopee_video' | 'manual'

export type RightsStatus = 'owned' | 'seller_provided' | 'licensed' | 'generated' | 'unknown'

export type PublicationStatus =
  | 'draft'
  | 'pending_rights'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'manual_required'
  | 'scheduled'

export interface PublicationPackage {
  id: string
  creativeId: string
  productId: string
  campaignId: string
  videoPath: string
  videoFilename: string
  downloadUrl: string
  srtPath: string | null
  caption: string
  cta: string
  affiliateUrl: string | null
  channel: PublicationChannel
  rightsStatus: RightsStatus
  durationSec: number
  fileSizeBytes: number
  width: number
  height: number
  codec: string
  checklist: PublicationChecklist
  status: PublicationStatus
  statusReason: string | null
  generatedAt: string
  scheduledAt: string | null
  publishedAt: string | null
  publishedUrl: string | null
}

export interface PublicationChecklist {
  hasVideo: boolean
  hasCaption: boolean
  hasCTA: boolean
  hasAffiliateUrl: boolean
  videoIsVertical: boolean
  videoMinDuration: boolean   // >= 5s
  videoMaxDuration: boolean   // <= 90s (Reels/Shorts/TikTok)
  rightsCleared: boolean      // rightsStatus !== 'unknown'
  ready: boolean              // all required checks pass
  failReasons: string[]
}

export interface PublishInput {
  pkg: PublicationPackage
  /** Provider-specific options (tokens, account IDs, etc.) */
  options?: Record<string, string>
}

export interface PublishResult {
  success: boolean
  publishedUrl?: string
  platformPostId?: string
  error?: string
  requiresManualAction?: boolean
  manualInstructions?: string
}

export interface PublicationProvider {
  readonly channel: PublicationChannel
  readonly name: string
  /** Whether the provider can actually publish (credentials configured, API available) */
  isReady(): boolean
  /** Validate the package for this channel's specific requirements */
  validate(pkg: PublicationPackage): { valid: boolean; errors: string[] }
  /** Publish the package. Returns result — never throws. */
  publish(input: PublishInput): Promise<PublishResult>
  /** Poll / get current status of a previously published post */
  getStatus(platformPostId: string): Promise<{ status: string; url?: string }>
}
