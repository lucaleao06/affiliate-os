export interface ScoreInput {
  title: string
  description?: string
  price?: number
  originalPrice?: number
  commissionRate?: number
  extraCommission?: number
  rating?: number
  reviewCount?: number
  soldCount?: number
  category?: string
  imageUrl?: string
}

export interface ScoreOutput {
  overallScore: number
  recommendation: 'TESTE IMEDIATAMENTE' | 'VALE TESTAR' | 'BAIXA PRIORIDADE' | 'EVITAR'
  components: {
    commission: number
    demand: number
    visual: number
    impulse: number
    competition: number
    trust: number
    risk: number
  }
  reasoning: string
  provider: string
  model: string
}

export interface CreativeOutput {
  hooks: string[]
  angles: string[]
  scripts: string[]
  ctas: string[]
  captions: string[]
  provider: string
  model: string
}

export interface StoryboardScene {
  scene: number
  duration: string
  visual: string
  voiceover: string
  text_overlay: string
}

export interface StoryboardOutput {
  title: string
  totalDuration: string
  format: string
  scenes: StoryboardScene[]
  musicSuggestion: string
  editingNotes: string
  provider: string
  model: string
}

export interface AIProvider {
  name: string
  scoreProduct(input: ScoreInput): Promise<ScoreOutput>
  generateCreatives(product: ScoreInput, score: ScoreOutput): Promise<CreativeOutput>
  generateStoryboard(product: ScoreInput, hook: string, script: string): Promise<StoryboardOutput>
}
