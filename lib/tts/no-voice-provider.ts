/**
 * NoVoiceProvider — always-available fallback.
 * Returns audioPath: null so the render pipeline produces a silent video.
 * This is the correct default when no TTS API key is configured.
 */
import type { TTSProvider, TTSInput, TTSOutput } from './types'

export class NoVoiceProvider implements TTSProvider {
  readonly name = 'no-voice'

  async synthesize(_input: TTSInput): Promise<TTSOutput> {
    return { audioPath: null, durationSec: null, provider: this.name }
  }
}
