import type { AIProvider, ScoreInput, ScoreOutput, CreativeOutput, StoryboardOutput } from '../types'

const SCORE_PROMPT = (input: ScoreInput) => `Você é um especialista em marketing de afiliados Shopee. Analise este produto e retorne um JSON válido.

PRODUTO:
- Título: ${input.title}
- Descrição: ${input.description ?? 'N/A'}
- Preço: R$ ${input.price ?? 'N/A'}
- Preço original: R$ ${input.originalPrice ?? 'N/A'}
- Comissão: ${input.commissionRate ?? 0}% + extra ${input.extraCommission ?? 0}%
- Avaliação: ${input.rating ?? 'N/A'}/5 (${input.reviewCount ?? 0} avaliações)
- Vendas: ${input.soldCount ?? 0}
- Categoria: ${input.category ?? 'N/A'}

Retorne SOMENTE este JSON (sem markdown, sem explicações):
{
  "overallScore": <0-100>,
  "recommendation": <"TESTE IMEDIATAMENTE"|"VALE TESTAR"|"BAIXA PRIORIDADE"|"EVITAR">,
  "components": {
    "commission": <0-100>,
    "demand": <0-100>,
    "visual": <0-100>,
    "impulse": <0-100>,
    "competition": <0-100>,
    "trust": <0-100>,
    "risk": <0-100>
  },
  "reasoning": "<2-3 frases explicando o score>"
}`

const CREATIVE_PROMPT = (product: ScoreInput, score: ScoreOutput) => `Você é um criativo especialista em conteúdo para afiliados Shopee no Brasil. Gere material de marketing para este produto.

PRODUTO: ${product.title}
SCORE: ${score.overallScore}/100 — ${score.recommendation}
REASONING: ${score.reasoning}
PREÇO: R$ ${product.price}${product.originalPrice ? ` (era R$ ${product.originalPrice})` : ''}
COMISSÃO: ${product.commissionRate}%

Retorne SOMENTE este JSON (sem markdown):
{
  "hooks": ["<hook1>","<hook2>","<hook3>","<hook4>","<hook5>"],
  "angles": ["<angulo1>","<angulo2>","<angulo3>"],
  "scripts": ["<script_curto_1>","<script_curto_2>","<script_curto_3>"],
  "ctas": ["<cta1>","<cta2>","<cta3>"],
  "captions": ["<caption1>","<caption2>","<caption3>"]
}`

/** Strip markdown code fences and extract the first JSON object/array. */
function extractJSON(raw: string): string {
  // Remove ```json ... ``` or ``` ... ```
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  // Find first { or [
  const start = stripped.search(/[{[]/)
  if (start === -1) return stripped
  // Find matching closing bracket
  const open = stripped[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === open) depth++
    else if (stripped[i] === close) { depth--; if (depth === 0) return stripped.slice(start, i + 1) }
  }
  return stripped.slice(start)
}

export class ClaudeProvider implements AIProvider {
  name = 'claude'
  private model = 'claude-haiku-4-5-20251001'

  private async callClaude(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    return data.content[0]?.text ?? ''
  }

  async scoreProduct(input: ScoreInput): Promise<ScoreOutput> {
    const text = await this.callClaude(SCORE_PROMPT(input))
    const parsed = JSON.parse(extractJSON(text)) as Omit<ScoreOutput, 'provider' | 'model'>
    return { ...parsed, provider: 'claude', model: this.model }
  }

  async generateCreatives(product: ScoreInput, score: ScoreOutput): Promise<CreativeOutput> {
    const text = await this.callClaude(CREATIVE_PROMPT(product, score))
    const parsed = JSON.parse(extractJSON(text)) as Omit<CreativeOutput, 'provider' | 'model'>
    return { ...parsed, provider: 'claude', model: this.model }
  }

  async generateStoryboard(product: ScoreInput, hook: string, script: string): Promise<StoryboardOutput> {
    const prompt = `Você é diretor criativo de vídeos para afiliados Shopee Brasil. Crie um roteiro de storyboard para vídeo curto (30s) no formato 9:16.

PRODUTO: ${product.title}
PREÇO: R$ ${product.price}${product.originalPrice ? ` (era R$ ${product.originalPrice})` : ''}
COMISSÃO: ${product.commissionRate}%
HOOK: ${hook}
SCRIPT: ${script}

Retorne SOMENTE este JSON (sem markdown):
{
  "title": "<título do vídeo>",
  "totalDuration": "30s",
  "format": "9:16 Reels/TikTok",
  "scenes": [
    {"scene":1,"duration":"<Xs>","visual":"<descrição visual>","voiceover":"<fala>","text_overlay":"<texto na tela>"},
    {"scene":2,"duration":"<Xs>","visual":"<descrição visual>","voiceover":"<fala>","text_overlay":"<texto na tela>"},
    {"scene":3,"duration":"<Xs>","visual":"<descrição visual>","voiceover":"<fala>","text_overlay":"<texto na tela>"},
    {"scene":4,"duration":"<Xs>","visual":"<descrição visual>","voiceover":"<fala>","text_overlay":"<texto na tela>"},
    {"scene":5,"duration":"<Xs>","visual":"<descrição visual>","voiceover":"<fala>","text_overlay":"<texto na tela>"}
  ],
  "musicSuggestion": "<sugestão de música/som>",
  "editingNotes": "<notas de edição>"
}`
    const text = await this.callClaude(prompt)
    const parsed = JSON.parse(extractJSON(text)) as Omit<StoryboardOutput, 'provider' | 'model'>
    return { ...parsed, provider: 'claude', model: this.model }
  }
}
