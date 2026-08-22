import type { AIProvider, ScoreInput, ScoreOutput, CreativeOutput, StoryboardOutput } from '../types'

export class GeminiProvider implements AIProvider {
  name = 'gemini'
  private model = 'gemini-2.0-flash-lite'

  private async callGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${err}`)
    }

    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>
    }
    return data.candidates[0]?.content?.parts[0]?.text ?? ''
  }

  async scoreProduct(input: ScoreInput): Promise<ScoreOutput> {
    const prompt = `Você é especialista em afiliados Shopee Brasil. Analise e retorne JSON puro (sem markdown):
{
  "overallScore": <0-100>,
  "recommendation": <"TESTE IMEDIATAMENTE"|"VALE TESTAR"|"BAIXA PRIORIDADE"|"EVITAR">,
  "components": {"commission":<0-100>,"demand":<0-100>,"visual":<0-100>,"impulse":<0-100>,"competition":<0-100>,"trust":<0-100>,"risk":<0-100>},
  "reasoning": "<2-3 frases>"
}

Produto: ${input.title} | Preço: R$${input.price} | Comissão: ${input.commissionRate}%+${input.extraCommission}% | Vendas: ${input.soldCount} | Rating: ${input.rating}/5 (${input.reviewCount} avaliações)`

    const text = await this.callGemini(prompt)
    const parsed = JSON.parse(text) as Omit<ScoreOutput, 'provider' | 'model'>
    return { ...parsed, provider: 'gemini', model: this.model }
  }

  async generateCreatives(product: ScoreInput, score: ScoreOutput): Promise<CreativeOutput> {
    const prompt = `Crie material de marketing para afiliado Shopee. Retorne JSON puro:
{
  "hooks": ["<5 hooks>"],
  "angles": ["<3 ângulos>"],
  "scripts": ["<3 scripts curtos>"],
  "ctas": ["<3 ctas>"],
  "captions": ["<3 legendas>"]
}

Produto: ${product.title} | Score: ${score.overallScore}/100 ${score.recommendation} | Preço: R$${product.price} | Comissão: ${product.commissionRate}%`

    const text = await this.callGemini(prompt)
    const parsed = JSON.parse(text) as Omit<CreativeOutput, 'provider' | 'model'>
    return { ...parsed, provider: 'gemini', model: this.model }
  }

  async generateStoryboard(product: ScoreInput, hook: string, script: string): Promise<StoryboardOutput> {
    const prompt = `Roteiro storyboard para vídeo afiliado Shopee 30s 9:16. Retorne JSON puro:
{
  "title": "<título>",
  "totalDuration": "30s",
  "format": "9:16 Reels/TikTok",
  "scenes": [
    {"scene":1,"duration":"3s","visual":"<desc>","voiceover":"<fala>","text_overlay":"<texto>"},
    {"scene":2,"duration":"7s","visual":"<desc>","voiceover":"<fala>","text_overlay":"<texto>"},
    {"scene":3,"duration":"7s","visual":"<desc>","voiceover":"<fala>","text_overlay":"<texto>"},
    {"scene":4,"duration":"8s","visual":"<desc>","voiceover":"<fala>","text_overlay":"<texto>"},
    {"scene":5,"duration":"5s","visual":"<desc>","voiceover":"<fala>","text_overlay":"<texto>"}
  ],
  "musicSuggestion": "<música>",
  "editingNotes": "<edição>"
}

Produto: ${product.title} | R$${product.price} | Hook: ${hook} | Script: ${script.slice(0, 200)}`

    const text = await this.callGemini(prompt)
    const parsed = JSON.parse(text) as Omit<StoryboardOutput, 'provider' | 'model'>
    return { ...parsed, provider: 'gemini', model: this.model }
  }
}
