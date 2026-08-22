/**
 * ManualPublicationProvider — always available.
 * Does not auto-publish. Returns instructions for the user to publish manually.
 */
import type { PublicationProvider, PublicationChannel, PublicationPackage, PublishInput, PublishResult } from './types'

export class ManualPublicationProvider implements PublicationProvider {
  readonly channel: PublicationChannel = 'manual'
  readonly name = 'manual'

  isReady() { return true }

  validate(pkg: PublicationPackage) {
    const errors: string[] = []
    if (!pkg.checklist.hasVideo) errors.push('Sem vídeo')
    if (!pkg.checklist.hasCaption) errors.push('Sem caption')
    return { valid: errors.length === 0, errors }
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const { pkg } = input
    const instructions = [
      `1. Baixe o vídeo: ${pkg.downloadUrl}`,
      `2. Abra o app ${pkg.channel === 'instagram' ? 'Instagram' : pkg.channel === 'tiktok' ? 'TikTok' : 'YouTube'}`,
      `3. Crie um novo Reel/Short com o vídeo baixado`,
      pkg.caption ? `4. Cole a caption:\n${pkg.caption}` : '',
      pkg.affiliateUrl ? `5. Adicione o link de afiliado na bio ou sticker: ${pkg.affiliateUrl}` : '',
    ].filter(Boolean).join('\n')

    return {
      success: true,
      requiresManualAction: true,
      manualInstructions: instructions,
    }
  }

  async getStatus() {
    return { status: 'manual_required' }
  }
}
