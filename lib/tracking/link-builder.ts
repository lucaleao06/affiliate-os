/**
 * TrackingLinkBuilder — knows when to add UTM params vs preserve URL exactly.
 *
 * Key rule: NEVER modify Shopee affiliate URLs — they contain signature/tracking
 * tokens that break if query params are added. Attribution for Shopee is done
 * separately via import_batch/publication correlation, not URL params.
 *
 * Safe to add UTMs: owned domains, generic shortlinks, custom landing pages.
 */

export type AffiliatePlatform = 'shopee' | 'amazon' | 'hotmart' | 'kiwify' | 'eduzz' | 'monetizze' | 'unknown'

export interface TrackingParams {
  publicationId?: string
  creativeId?: string
  campaignId?: string
  channel?: string
  source?: string
  medium?: string
}

export interface TrackingLinkResult {
  url: string                     // final URL to use
  tracking: 'utm_added' | 'preserved' | 'not_applicable'
  platform: AffiliatePlatform
  reason: string
  utmParams?: Record<string, string>
}

/** Detect the affiliate platform from a URL */
export function detectPlatform(url: string): AffiliatePlatform {
  const lower = url.toLowerCase()
  if (lower.includes('shopee.com') || lower.includes('shp.ee') || lower.includes('s.shopee')) return 'shopee'
  if (lower.includes('amazon.com') || lower.includes('amzn.to')) return 'amazon'
  if (lower.includes('hotmart.com') || lower.includes('go.hotmart')) return 'hotmart'
  if (lower.includes('kiwify.com') || lower.includes('go.kiwify')) return 'kiwify'
  if (lower.includes('eduzz.com') || lower.includes('go.eduzz')) return 'eduzz'
  if (lower.includes('monetizze.com') || lower.includes('go.monetizze')) return 'monetizze'
  return 'unknown'
}

/**
 * Platforms where adding ANY query parameter may break affiliate tracking.
 * Conservative — when in doubt, preserve.
 */
const PRESERVE_EXACT: AffiliatePlatform[] = ['shopee', 'amazon']

/**
 * Build a tracking URL (or preserve it if the platform doesn't allow modification).
 */
export function buildTrackingLink(affiliateUrl: string, params: TrackingParams): TrackingLinkResult {
  const platform = detectPlatform(affiliateUrl)

  if (PRESERVE_EXACT.includes(platform)) {
    return {
      url: affiliateUrl,
      tracking: 'preserved',
      platform,
      reason: `${platform} affiliate URLs must not be modified — tracking tokens are embedded in the URL structure. Attribution is handled via import correlation.`,
    }
  }

  // For other platforms: try to add UTM params
  try {
    const u = new URL(affiliateUrl)
    const utmParams: Record<string, string> = {}

    if (params.source ?? params.channel) {
      utmParams.utm_source = params.source ?? params.channel ?? 'affiliate'
      u.searchParams.set('utm_source', utmParams.utm_source)
    }
    if (params.medium) {
      utmParams.utm_medium = params.medium
      u.searchParams.set('utm_medium', utmParams.utm_medium)
    }
    if (params.campaignId) {
      utmParams.utm_campaign = params.campaignId
      u.searchParams.set('utm_campaign', utmParams.utm_campaign)
    }
    if (params.creativeId) {
      utmParams.utm_content = params.creativeId
      u.searchParams.set('utm_content', utmParams.utm_content)
    }
    if (params.publicationId) {
      utmParams.utm_term = params.publicationId
      u.searchParams.set('utm_term', utmParams.utm_term)
    }

    return {
      url: u.toString(),
      tracking: 'utm_added',
      platform,
      reason: `UTM params added for ${platform}`,
      utmParams,
    }
  } catch {
    return {
      url: affiliateUrl,
      tracking: 'preserved',
      platform,
      reason: 'URL inválida — preservando original',
    }
  }
}

/**
 * Attribution strategy when URL cannot be modified (Shopee).
 * Returns a correlation key to match imports to publications.
 */
export function buildShopeeAttributionKey(params: {
  publicationId: string
  creativeId?: string
  publishedAt: string
}): string {
  // Use publication timestamp + IDs to correlate with CSV import date windows
  const date = new Date(params.publishedAt).toISOString().slice(0, 10)
  return `pub_${params.publicationId}_${date}`
}
