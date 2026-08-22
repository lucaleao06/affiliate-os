import type { AIProvider } from './types'
import { MockProvider } from './mock-provider'
import { ClaudeProvider } from './providers/claude'
import { GeminiProvider } from './providers/gemini'

let _provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (_provider) return _provider

  if (process.env.ANTHROPIC_API_KEY) {
    _provider = new ClaudeProvider()
    return _provider
  }

  if (process.env.GEMINI_API_KEY) {
    _provider = new GeminiProvider()
    return _provider
  }

  _provider = new MockProvider()
  return _provider
}

export type { AIProvider, ScoreInput, ScoreOutput, CreativeOutput, StoryboardOutput, StoryboardScene } from './types'
