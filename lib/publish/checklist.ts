import type { PublicationPackage, PublicationChecklist, RightsStatus } from './types'

const SAFE_RIGHTS: RightsStatus[] = ['owned', 'cleared', 'seller_provided', 'licensed', 'generated']

export function buildPublicationChecklist(pkg: Omit<PublicationPackage, 'checklist' | 'status' | 'statusReason'>): PublicationChecklist {
  const failReasons: string[] = []

  const hasVideo = !!pkg.videoPath
  if (!hasVideo) failReasons.push('Sem arquivo de vídeo')

  const hasCaption = pkg.caption.trim().length > 0
  if (!hasCaption) failReasons.push('Caption vazio')

  const hasCTA = pkg.cta.trim().length > 0
  if (!hasCTA) failReasons.push('CTA vazio')

  const hasAffiliateUrl = !!(pkg.affiliateUrl?.trim())

  const videoIsVertical = pkg.width < pkg.height
  if (!videoIsVertical) failReasons.push(`Vídeo não é vertical (${pkg.width}x${pkg.height})`)

  const videoMinDuration = pkg.durationSec >= 5
  if (!videoMinDuration) failReasons.push(`Duração muito curta (${pkg.durationSec}s, mín 5s)`)

  const videoMaxDuration = pkg.durationSec <= 90
  if (!videoMaxDuration) failReasons.push(`Duração muito longa (${pkg.durationSec}s, máx 90s para Reels/Shorts/TikTok)`)

  const rightsCleared = SAFE_RIGHTS.includes(pkg.rightsStatus)
  if (!rightsCleared) failReasons.push(`Direitos de mídia não declarados (status: ${pkg.rightsStatus})`)

  const ready = hasVideo && hasCaption && hasCTA && videoIsVertical && videoMinDuration && videoMaxDuration && rightsCleared

  return { hasVideo, hasCaption, hasCTA, hasAffiliateUrl, videoIsVertical, videoMinDuration, videoMaxDuration, rightsCleared, ready, failReasons }
}
