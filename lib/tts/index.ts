/**
 * TTS provider factory — same pattern as lib/ai/index.ts.
 * Priority: ElevenLabs (ELEVENLABS_API_KEY) → NoVoice fallback.
 * Add more providers here (OpenAI TTS, etc.) as needed.
 */
import type { TTSProvider } from './types'
import { NoVoiceProvider } from './no-voice-provider'

let _provider: TTSProvider | null = null

export function getTTSProvider(): TTSProvider {
  if (_provider) return _provider

  if (process.env.ELEVENLABS_API_KEY) {
    // Lazy import to avoid loading the module if not needed
    const { ElevenLabsProvider } = require('./elevenlabs-provider') as typeof import('./elevenlabs-provider')
    _provider = new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY)
    return _provider
  }

  _provider = new NoVoiceProvider()
  return _provider
}

export type { TTSProvider, TTSInput, TTSOutput } from './types'
