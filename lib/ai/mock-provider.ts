/**
 * LocalProvider — geração de criativos baseada em dados reais do produto.
 *
 * Usado quando nenhuma chave de IA está configurada (ANTHROPIC_API_KEY / GEMINI_API_KEY).
 * Todo o conteúdo é derivado exclusivamente de dados verificáveis do produto:
 * título, preço, nota, avaliações, vendas, comissão, categoria.
 *
 * NUNCA contém:
 * - Depoimentos pessoais ("testei", "aprovei", "nunca mais vivo sem")
 * - Escassez não verificada ("estoque limitado")
 * - Descontos não verificados ("X% OFF") sem originalPrice real
 * - Afirmações de benefício não documentadas
 *
 * Para geração por IA real, configure ANTHROPIC_API_KEY ou GEMINI_API_KEY no .env.local.
 */
import type { AIProvider, ScoreInput, ScoreOutput, CreativeOutput, StoryboardOutput } from './types'

export class MockProvider implements AIProvider {
  name = 'local'

  async scoreProduct(input: ScoreInput): Promise<ScoreOutput> {
    const commission = Math.min(100, (input.commissionRate ?? 0) * 10 + (input.extraCommission ?? 0) * 5)
    const demand = Math.min(100, Math.log10((input.soldCount ?? 1) + 1) * 25)
    const trust = Math.min(100, ((input.rating ?? 0) / 5) * 60 + Math.log10((input.reviewCount ?? 1) + 1) * 10)
    const visual = input.imageUrl ? 60 : 30
    const impulse = input.originalPrice && input.price
      ? Math.min(100, ((input.originalPrice - input.price) / input.originalPrice) * 100)
      : 40
    const competition = 50
    const risk = 20

    const overall = Math.round(
      commission * 0.25 + demand * 0.2 + trust * 0.2 +
      visual * 0.1 + impulse * 0.15 + competition * 0.05 + (100 - risk) * 0.05
    )

    const parts: string[] = []
    if (input.commissionRate) parts.push(`comissão ${input.commissionRate}%`)
    if (input.extraCommission) parts.push(`extra ${input.extraCommission}%`)
    if (input.soldCount) parts.push(`${input.soldCount} vendidos`)
    if (input.rating) parts.push(`nota ${input.rating}/5`)
    if (input.reviewCount) parts.push(`${input.reviewCount} avaliações`)

    // Estimativa de comissão por venda (hipótese, não receita garantida)
    const totalRate = (input.commissionRate ?? 0) + (input.extraCommission ?? 0)
    const estimatedCommissionPerSale = input.price && totalRate > 0
      ? Math.round(input.price * (totalRate / 100) * 100) / 100
      : undefined

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
      reasoning: `Score calculado localmente com base em dados reais: ${parts.join(', ') || 'dados insuficientes'}. Configure ANTHROPIC_API_KEY para análise por IA.`,
      provider: 'local',
      model: 'data-driven-v1',
      estimatedCommissionPerSale,
      dataPoints: parts,
    }
  }

  async generateCreatives(product: ScoreInput, score: ScoreOutput): Promise<CreativeOutput> {
    const title = product.title
    const priceStr = product.price ? `R$ ${product.price.toFixed(2).replace('.', ',')}` : ''
    const ratingStr = product.rating ? `nota ${product.rating}/5` : ''
    const soldStr = product.soldCount ? `${product.soldCount.toLocaleString('pt-BR')}+ pedidos` : ''
    const reviewStr = product.reviewCount ? `${product.reviewCount.toLocaleString('pt-BR')} avaliações` : ''
    const commStr = product.commissionRate ? `${product.commissionRate}% de comissão` : ''
    const catStr = product.category ?? ''

    // Discount só aparece se originalPrice verificável e maior que price
    const hasDiscount = !!(product.originalPrice && product.price && product.originalPrice > product.price)
    const discountPct = hasDiscount
      ? Math.round(((product.originalPrice! - product.price!) / product.originalPrice!) * 100)
      : null

    // Hooks — baseados em fatos verificáveis, sem primeira pessoa
    const hooks = [
      ratingStr && soldStr
        ? `${title}: ${ratingStr} com ${soldStr}. Vale a pena?`
        : `${title}: o que dizem os compradores?`,
      commStr
        ? `${commStr} nesse produto${catStr ? ` de ${catStr}` : ''} — confira os dados antes de indicar`
        : `${title} — dados reais para sua decisão`,
      priceStr && ratingStr
        ? `${priceStr} com ${ratingStr}${reviewStr ? ` e ${reviewStr}` : ''} — análise completa`
        : `Análise de dados: ${title}`,
      score.overallScore >= 55
        ? `Score ${score.overallScore}/100 — ${score.recommendation}: ${title}`
        : `${title}: score ${score.overallScore}/100 — veja os detalhes`,
      soldStr
        ? `${soldStr}${ratingStr ? ` e ${ratingStr}` : ''}: por que ${title} está se destacando`
        : `${title} — o que os números mostram`,
    ]

    // Ângulos — instruções de abordagem, não depoimentos
    const angles = [
      `Análise de dados: apresentar nota, avaliações e volume de vendas como evidência de demanda`,
      `Benefício + preço: mostrar ${priceStr || 'preço'} e destacar ${commStr || 'comissão'} para o afiliado`,
      hasDiscount && discountPct
        ? `Comparação de preço: destacar desconto real de ${discountPct}% em relação ao preço original`
        : `Custo-benefício: posicionar ${title} como opção acessível${catStr ? ` na categoria ${catStr}` : ''}`,
    ]

    // Scripts — narração factual, sem testemunho pessoal
    const baseInfo = [
      priceStr,
      ratingStr,
      reviewStr,
      soldStr,
    ].filter(Boolean).join(', ')

    const scripts = [
      // Script 1: dados + CTA direto
      [
        `Hook: ${hooks[0]}`,
        `Desenvolvimento: ${title}${catStr ? `, categoria ${catStr}` : ''}. ${baseInfo ? `Dados verificados: ${baseInfo}.` : ''} ${product.description ? product.description.slice(0, 120) + '.' : ''}`,
        `CTA: Link na descrição — veja o preço atual na Shopee.`,
      ].filter(s => !s.endsWith(': ')).join(' // '),

      // Script 2: comissão + confiança
      [
        `Hook: ${hooks[1]}`,
        `Desenvolvimento: ${commStr ? `Produto com ${commStr}.` : ''} ${ratingStr ? `Avaliação dos compradores: ${ratingStr}${reviewStr ? ` (${reviewStr})` : ''}.` : ''} ${soldStr ? `Volume: ${soldStr}.` : ''}`,
        `CTA: Confira o link na bio.`,
      ].filter(s => !s.endsWith(': ')).join(' // '),

      // Script 3: score + contexto
      [
        `Hook: ${hooks[3]}`,
        `Desenvolvimento: Score ${score.overallScore}/100 calculado com base em comissão, demanda e confiança do produto. ${baseInfo || title}.`,
        `CTA: Link na descrição.`,
      ].join(' // '),
    ]

    // CTAs — sem escassez falsa
    const ctas = [
      `Link na descrição — veja o preço atual na Shopee`,
      `Confira na Shopee`,
      `Link na bio`,
    ]

    // Captions — factuais
    const captions = [
      [
        title,
        baseInfo,
        commStr,
        '#shopee #afiliados #indicação',
      ].filter(Boolean).join(' · '),

      [
        ratingStr && soldStr ? `${ratingStr} com ${soldStr}.` : title,
        priceStr ? `Preço atual: ${priceStr}.` : '',
        'Link na bio 👆',
        '#afiliados #shopee',
      ].filter(Boolean).join(' '),

      hasDiscount && discountPct
        ? `${title} com ${discountPct}% de desconto em relação ao preço original. ${priceStr}. Link na descrição. #shopee`
        : `${title}${priceStr ? ` — ${priceStr}` : ''}. Dados e link na descrição. #shopee #afiliados`,
    ]

    // Evidence: fatos verificáveis usados para gerar este criativo
    const evidence: string[] = []
    if (priceStr) evidence.push(`preço: ${priceStr}`)
    if (product.rating) evidence.push(`nota: ${product.rating}/5`)
    if (product.reviewCount) evidence.push(`avaliações: ${product.reviewCount.toLocaleString('pt-BR')}`)
    if (product.soldCount) evidence.push(`vendidos: ${product.soldCount.toLocaleString('pt-BR')}`)
    if (commStr) evidence.push(commStr)
    if (hasDiscount && discountPct) evidence.push(`desconto real: ${discountPct}% (preço original verificado)`)

    return {
      hooks,
      angles,
      scripts,
      ctas,
      captions,
      provider: 'local',
      model: 'data-driven-v1',
      evidence,
    }
  }

  async generateStoryboard(product: ScoreInput, hook: string, script: string): Promise<StoryboardOutput> {
    const priceStr = product.price ? `R$ ${product.price.toFixed(2).replace('.', ',')}` : 'ver preço'
    const ratingLine = product.rating
      ? `⭐ ${product.rating}/5${product.reviewCount ? ` · ${product.reviewCount.toLocaleString('pt-BR')} avaliações` : ''}`
      : ''
    const soldLine = product.soldCount ? `${product.soldCount.toLocaleString('pt-BR')}+ pedidos` : ''

    // Discount overlay apenas se verificável
    const hasDiscount = !!(product.originalPrice && product.price && product.originalPrice > product.price)
    const discountPct = hasDiscount
      ? Math.round(((product.originalPrice! - product.price!) / product.originalPrice!) * 100)
      : null
    const discountOverlay = hasDiscount && discountPct ? `${discountPct}% OFF` : null

    // Narração do script: pega parte do desenvolvimento se houver
    const devPart = script.split('//')[1]?.replace(/^Desenvolvimento:\s*/i, '').trim() ?? ''

    return {
      title: `${product.title} — Vídeo Afiliado`,
      totalDuration: '30s',
      format: '9:16 Reels/TikTok',
      scenes: [
        {
          scene: 1,
          duration: '3s',
          visual: `Imagem pública do produto em destaque (use a foto do produto na Shopee como referência). Fundo neutro ou gradiente discreto. Texto do hook em destaque.`,
          voiceover: hook.replace(/^.*?:\s*/, ''), // remove prefix como "Hook:"
          text_overlay: hook.replace(/^.*?:\s*/, '').slice(0, 45),
        },
        {
          scene: 2,
          duration: '8s',
          visual: `Detalhes do produto: close na embalagem, tecido ou características visíveis. Se não tiver material próprio, use a galeria de fotos públicas da página do produto.`,
          voiceover: devPart.slice(0, 200) || `${product.title}. ${ratingLine}. ${soldLine}.`,
          text_overlay: discountOverlay ?? (ratingLine || soldLine || ''),
        },
        {
          scene: 3,
          duration: '7s',
          visual: `Captura de tela da página do produto na Shopee (informação pública). Destaque para nota e número de avaliações.`,
          voiceover: [ratingLine, soldLine].filter(Boolean).join('. ') || product.description?.slice(0, 120) || product.title,
          text_overlay: ratingLine || soldLine,
        },
        {
          scene: 4,
          duration: '7s',
          visual: `Destaque para o preço atual na página da Shopee. Mostre a tela do produto com o valor visível.`,
          voiceover: `Preço atual: ${priceStr}. Veja o link na descrição para conferir o valor de hoje.`,
          text_overlay: priceStr,
        },
        {
          scene: 5,
          duration: '5s',
          visual: `Logo Shopee + imagem do produto + seta ou indicação visual para o link na bio/descrição.`,
          voiceover: `Link na descrição para conferir na Shopee.`,
          text_overlay: 'LINK NA DESCRIÇÃO',
        },
      ],
      musicSuggestion: 'Música de fundo instrumental — sem letra (evita copyright). Sugestão: buscar "background music no copyright upbeat" no YouTube Audio Library.',
      editingNotes: 'Cortes rápidos entre cenas 1–3 (ritmo dinâmico). Zoom suave na cena 4 no preço. Fade out na cena 5. Adicionar legenda automática em todas as falas. Usar imagens públicas do produto como referência — obter material próprio para publicação definitiva. Rascunho gerado localmente: configure ANTHROPIC_API_KEY para roteiro por IA.',
      provider: 'local',
      model: 'data-driven-v1',
    }
  }
}
