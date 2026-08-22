import type { AIProvider, ScoreInput, ScoreOutput, CreativeOutput, StoryboardOutput } from './types'

export class MockProvider implements AIProvider {
  name = 'mock'

  async scoreProduct(input: ScoreInput): Promise<ScoreOutput> {
    const commission = Math.min(100, (input.commissionRate ?? 0) * 10 + (input.extraCommission ?? 0) * 5)
    const demand = Math.min(100, Math.log10((input.soldCount ?? 1) + 1) * 25)
    const trust = Math.min(100, ((input.rating ?? 0) / 5) * 60 + Math.log10((input.reviewCount ?? 1) + 1) * 10)
    const visual = input.imageUrl ? 60 : 30
    const impulse = input.originalPrice && input.price ? Math.min(100, ((input.originalPrice - input.price) / input.originalPrice) * 100) : 40
    const competition = 50
    const risk = 20

    const overall = Math.round((commission * 0.25 + demand * 0.2 + trust * 0.2 + visual * 0.1 + impulse * 0.15 + competition * 0.05 + (100 - risk) * 0.05))

    return {
      overallScore: overall,
      recommendation: overall >= 75 ? 'TESTE IMEDIATAMENTE' : overall >= 55 ? 'VALE TESTAR' : overall >= 35 ? 'BAIXA PRIORIDADE' : 'EVITAR',
      components: {
        commission: Math.round(commission),
        demand: Math.round(demand),
        visual: Math.round(visual),
        impulse: Math.round(impulse),
        competition: Math.round(competition),
        trust: Math.round(trust),
        risk: Math.round(risk),
      },
      reasoning: `[MOCK] Score determinístico baseado em: comissão ${input.commissionRate ?? 0}% + extra ${input.extraCommission ?? 0}%, vendas ${input.soldCount ?? 0}, rating ${input.rating ?? 0}/5, ${input.reviewCount ?? 0} avaliações.`,
      provider: 'mock',
      model: 'deterministic-v1',
    }
  }

  async generateCreatives(product: ScoreInput, score: ScoreOutput): Promise<CreativeOutput> {
    const title = product.title
    return {
      hooks: [
        `[MOCK] Eu não sabia que ${title} existia até testar...`,
        `[MOCK] Por que todo mundo está comprando ${title}?`,
        `[MOCK] Testei ${title} por 7 dias e aconteceu isso...`,
        `[MOCK] O problema que ${title} resolve que ninguém fala`,
        `[MOCK] ${title}: vale ou não vale? Resposta honesta`,
      ],
      angles: [
        `[MOCK] Antes/depois: como ${title} mudou minha rotina`,
        `[MOCK] Problema/solução: o que ${title} resolve na prática`,
        `[MOCK] Surpresa: o que não esperava de ${title}`,
      ],
      scripts: [
        `[MOCK] Hook: Testei esse produto por 30 dias. Resultado? [pausa] Nunca mais vivo sem ele. Mostro aqui o que aconteceu. // Desenvolvimento: ${title}. ${product.description ?? ''}. // CTA: Link na bio, compra por ${product.price ? `R$ ${product.price}` : 'preço especial'}.`,
        `[MOCK] Hook: Problema que eu tinha todo dia... [pausa] esse produto resolveu em 3 dias. // Desenvolvimento: mostra uso de ${title}. // CTA: Aproveita o desconto hoje.`,
        `[MOCK] Hook: ${score.overallScore}/100 — esse produto score altíssimo. Vou te mostrar por quê. // Desenvolvimento: comissão ${product.commissionRate}%, ${product.soldCount} vendidos, nota ${product.rating}/5. // CTA: link na descrição.`,
      ],
      ctas: [
        `[MOCK] Link na bio — estoque limitado`,
        `[MOCK] Compra agora com desconto`,
        `[MOCK] Clica no link e vê o preço de hoje`,
      ],
      captions: [
        `[MOCK] ${title} está no meu top 3 de compras desse mês. ${product.commissionRate ? `Comissão: ${product.commissionRate}%` : ''} #shopee #afiliados #indicação`,
        `[MOCK] Testei, aprovei, indico. ${title}. Link na bio 👆`,
        `[MOCK] Desconto de ${product.originalPrice && product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : '??'}% nesse produto incrível. Corre!`,
      ],
      provider: 'mock',
      model: 'mock-creative-v1',
    }
  }

  async generateStoryboard(product: ScoreInput, hook: string, script: string): Promise<StoryboardOutput> {
    const price = product.price ? `R$ ${product.price}` : 'preço especial'
    const discount = product.originalPrice && product.price
      ? `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF`
      : ''
    return {
      title: `[MOCK] ${product.title} — Vídeo Afiliado`,
      totalDuration: '30s',
      format: '9:16 Reels/TikTok',
      scenes: [
        {
          scene: 1,
          duration: '3s',
          visual: `[MOCK] Close no produto ${product.title} em destaque, fundo limpo`,
          voiceover: hook,
          text_overlay: hook.slice(0, 40),
        },
        {
          scene: 2,
          duration: '8s',
          visual: `[MOCK] Mãos usando/demonstrando o produto, ângulo 45°`,
          voiceover: `[MOCK] ${script.split('//')[1]?.trim() ?? 'Esse produto chegou pra resolver um problema real...'}`,
          text_overlay: discount ? `🔥 ${discount}` : '✅ Aprovado',
        },
        {
          scene: 3,
          duration: '7s',
          visual: `[MOCK] Antes e depois, ou close nos detalhes do produto`,
          voiceover: `[MOCK] ${product.description?.slice(0, 100) ?? 'Qualidade incrível, chegou rápido e valeu cada centavo.'}`,
          text_overlay: `⭐ ${product.rating ?? 4.8}/5 — ${product.reviewCount ?? 0}+ avaliações`,
        },
        {
          scene: 4,
          duration: '7s',
          visual: `[MOCK] Tela do app Shopee mostrando o produto, animação de "add ao carrinho"`,
          voiceover: `[MOCK] Por apenas ${price}, você garante o seu hoje. Estoque limitado!`,
          text_overlay: `${price} ${discount ? `— Antes ${product.originalPrice ? 'R$ ' + product.originalPrice : ''}` : ''}`,
        },
        {
          scene: 5,
          duration: '5s',
          visual: `[MOCK] Produto no destaque + logo Shopee + seta apontando para bio`,
          voiceover: `[MOCK] Link na bio ou na descrição. Compra agora!`,
          text_overlay: '👆 LINK NA BIO',
        },
      ],
      musicSuggestion: '[MOCK] Trending upbeat — TikTok Sound: buscar "viral product reveal 2024"',
      editingNotes: '[MOCK] Cortes rápidos entre cenas 1-3. Zoom in na cena 4. Fade out na 5. Legenda em todas as falas.',
      provider: 'mock',
      model: 'mock-storyboard-v1',
    }
  }
}
