/**
 * TTS Provider abstraction — mirrors lib/ai/types.ts pattern.
 * NoVoiceProvider is the always-available fallback (silent / no audio).
 * Real providers: ElevenLabs, OpenAI TTS, etc.
 */

export interface TTSInput {
  /** Text to synthesize */
  text: string
  /** Voice hint (provider interprets this) */
  voice?: string
  /** Speed multiplier 0.5–2.0 (providers may ignore) */
  speed?: number
}

export interface TTSOutput {
  /** Absolute path to the generated audio file (mp3/wav), or null if no audio */
  audioPath: string | null
  /** Duration in seconds, or null if not known */
  durationSec: number | null
  provider: string
}

export interface TTSProvider {
  name: string
  /** Returns null audioPath when provider is NoVoice */
  synthesize(input: TTSInput): Promise<TTSOutput>
}
