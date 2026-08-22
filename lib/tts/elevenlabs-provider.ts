/**
 * ElevenLabs TTS provider.
 * Activated when ELEVENLABS_API_KEY is set.
 *
 * DEBT: Not yet tested end-to-end — requires valid API key and credit balance.
 * Documented in docs/CLAUDE_ADDITIONS.md.
 */
import fs from 'fs'
import path from 'path'
import https from 'https'
import type { TTSProvider, TTSInput, TTSOutput } from './types'

const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB' // Adam (ElevenLabs preset)

export class ElevenLabsProvider implements TTSProvider {
  readonly name = 'elevenlabs'
  private readonly apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async synthesize(input: TTSInput): Promise<TTSOutput> {
    const voiceId = input.voice ?? DEFAULT_VOICE_ID
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`

    const body = JSON.stringify({
      text: input.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed: input.speed ?? 1.0,
      },
    })

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'content-type': 'application/json',
            accept: 'audio/mpeg',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`ElevenLabs TTS failed: HTTP ${res.statusCode}`))
            return
          }
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => resolve(Buffer.concat(chunks)))
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })

    // Save to storage/tts/
    const dir = path.join(process.cwd(), 'storage', 'tts')
    fs.mkdirSync(dir, { recursive: true })
    const filename = `tts_${Date.now()}.mp3`
    const audioPath = path.join(dir, filename)
    fs.writeFileSync(audioPath, audioBuffer)

    return { audioPath, durationSec: null, provider: this.name }
  }
}
