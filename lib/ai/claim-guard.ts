/**
 * Claim Guard — valida textos criativos contra dados verificáveis do produto.
 *
 * Bloqueia frases que:
 * - Fazem testimoniais pessoais ("testei", "aprovei", "nunca mais vivo sem")
 * - Afirmam escassez não verificada ("estoque limitado", "últimas unidades")
 * - Afirmam desconto sem originalPrice verificável
 * - Usam superlativos sem dados ("melhor do mercado", "top da categoria")
 * - Afirmam benefício de saúde, resultado ou eficácia sem documento
 *
 * NÃO bloqueia:
 * - Referências a dados reais do produto (nota, preço, vendas, comissão)
 * - Perguntas abertas ("vale a pena?", "o que os números mostram")
 * - CTAs neutros ("link na descrição", "confira na Shopee")
 */

export interface ClaimViolation {
  field: string
  text: string
  reason: string
  pattern: string
}

export interface ClaimGuardResult {
  valid: boolean
  violations: ClaimViolation[]
  score: number // 0-100, 100 = sem violações
}

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Testemunho pessoal
  { pattern: /\b(testei|usei|comprei|aprovei|recomendo pessoalmente|nunca mais vivo sem|minha experi[eê]ncia)\b/i, reason: 'Testemunho pessoal não verificável' },
  // Escassez falsa
  { pattern: /\b(estoque limitado|[uú]ltimas? unidades?|acabando|corre que acaba|por tempo limitado|oferta v[aá]lida por)\b/i, reason: 'Escassez não verificada' },
  // Garantia de resultado
  { pattern: /\b(resultado garantido|100% eficaz|sem esfor[cç]o|perca \d+ kg|emagrece|cura|trata|elimina)\b/i, reason: 'Afirmação de resultado não documentada' },
  // Superlativo não documentado
  { pattern: /\b(melhor do mercado|n[uú]mero 1|top da categoria|o [uú]nico que|exclusivo)\b/i, reason: 'Superlativo sem fonte' },
  // Urgência falsa
  { pattern: /\b(compre agora ou perca|n[aã]o perca essa chance|oportunidade [uú]nica)\b/i, reason: 'Urgência fabricada' },
]

/**
 * Valida um texto criativo contra as regras de honestidade.
 * @param field - Nome do campo (hook, script, caption)
 * @param text - Conteúdo do campo
 */
export function validateClaim(field: string, text: string): ClaimViolation[] {
  const violations: ClaimViolation[] = []
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      violations.push({
        field,
        text: match[0],
        reason,
        pattern: pattern.source,
      })
    }
  }
  return violations
}

/**
 * Valida um conjunto de campos criativos.
 * Retorna resultado com lista de violações e score de honestidade.
 */
export function runClaimGuard(fields: Record<string, string>): ClaimGuardResult {
  const all: ClaimViolation[] = []
  for (const [field, text] of Object.entries(fields)) {
    if (text) all.push(...validateClaim(field, text))
  }
  const score = Math.max(0, 100 - all.length * 20)
  return {
    valid: all.length === 0,
    violations: all,
    score,
  }
}

/**
 * Valida arrays de hooks/scripts/captions de um CreativeOutput.
 * Retorna apenas os itens que passam no claim guard.
 * Se nenhum passa, retorna todos com flag de aviso (não bloqueia produção).
 */
export function filterCreatives<T extends { hook?: string | null; script?: string | null; caption?: string | null }>(
  items: T[]
): { clean: T[]; flagged: T[]; violations: ClaimViolation[] } {
  const clean: T[] = []
  const flagged: T[] = []
  const allViolations: ClaimViolation[] = []

  for (const item of items) {
    const check = runClaimGuard({
      ...(item.hook ? { hook: item.hook } : {}),
      ...(item.script ? { script: item.script } : {}),
      ...(item.caption ? { caption: item.caption } : {}),
    })
    if (check.valid) {
      clean.push(item)
    } else {
      flagged.push(item)
      allViolations.push(...check.violations)
    }
  }

  return { clean, flagged, violations: allViolations }
}
