/**
 * Publication Engine — factory + registry.
 * Rights gate: blocks publication if rightsStatus === 'unknown'.
 */
import type { PublicationProvider, PublicationChannel, PublicationPackage, PublishResult } from './types'
import { ManualPublicationProvider } from './manual-provider'
import { MetaPublicationProvider } from './meta-provider'
import { TikTokPublicationProvider } from './tiktok-provider'

const PROVIDERS: PublicationProvider[] = [
  new ManualPublicationProvider(),
  new MetaPublicationProvider(),
  new TikTokPublicationProvider(),
  // YouTubePublicationProvider — pending integration (OAuth, quota, Shorts spec)
  // ShopeeVideoProvider — no public affiliate video posting API (use manual)
]

export function getProvider(channel: PublicationChannel): PublicationProvider {
  return PROVIDERS.find(p => p.channel === channel) ?? new ManualPublicationProvider()
}

export function getAllProviders(): PublicationProvider[] {
  return PROVIDERS
}

/**
 * Rights gate — enforced before any publication.
 * AUTOPILOT mode must pass this gate; manual override by human is allowed.
 */
export function rightsGatePassed(pkg: PublicationPackage): { passed: boolean; reason?: string } {
  const safe: string[] = ['owned', 'seller_provided', 'licensed', 'generated']
  if (!safe.includes(pkg.rightsStatus)) {
    return { passed: false, reason: `Direitos de mídia desconhecidos (status: ${pkg.rightsStatus}). Declare a origem antes de publicar.` }
  }
  return { passed: true }
}

/**
 * Publish with rights gate + checklist validation.
 * Returns an error result (never throws) if any gate fails.
 */
export async function publish(pkg: PublicationPackage, options?: Record<string, string>): Promise<PublishResult> {
  // Rights gate
  const rights = rightsGatePassed(pkg)
  if (!rights.passed) {
    return { success: false, error: rights.reason }
  }

  // Checklist gate
  if (!pkg.checklist.ready) {
    return {
      success: false,
      error: `Pacote não está pronto: ${pkg.checklist.failReasons.join('; ')}`,
    }
  }

  const provider = getProvider(pkg.channel)
  const validation = provider.validate(pkg)
  if (!validation.valid) {
    return { success: false, error: `Validação do provider falhou: ${validation.errors.join('; ')}` }
  }

  return provider.publish({ pkg, options })
}

export type { PublicationProvider, PublicationChannel, PublicationPackage, PublishResult, PublicationChecklist, RightsStatus, PublicationStatus } from './types'
export { buildPublicationChecklist } from './checklist'
