/**
 * GET /api/radar
 * Ranks all products by opportunity score:
 *   opportunity = (ai_score * commission_rate) / (1 + creative_count)
 * Returns top opportunities for the affiliate to act on.
 */
import { NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdmin()

  // 1. All products
  const { data: products } = await admin
    .from('products')
    .select('id, title, price, commission_rate, image_url, marketplace, affiliate_url, available_quantity, rating')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!products || products.length === 0) {
    return NextResponse.json({ opportunities: [], message: 'Nenhum produto cadastrado ainda.' })
  }

  const productIds = products.map(p => p.id)

  // 2. Latest AI score per product
  const { data: scores } = await admin
    .from('product_scores')
    .select('product_id, overall_score, reasoning')
    .in('product_id', productIds)
    .order('created_at', { ascending: false })

  // 3. Creative count per product (via campaigns)
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, product_id')
    .in('product_id', productIds)

  const campaignIds = (campaigns ?? []).map(c => c.id)

  const { data: creatives } = campaignIds.length > 0
    ? await admin
        .from('creatives')
        .select('id, campaign_id, status')
        .in('campaign_id', campaignIds)
    : { data: [] }

  // Build lookup maps
  const scoreMap = new Map<string, { score: number; rationale: string | null }>()
  for (const s of scores ?? []) {
    if (!scoreMap.has(s.product_id)) {
      scoreMap.set(s.product_id, { score: s.overall_score ?? 0, rationale: s.reasoning ?? null })
    }
  }

  const campaignByProduct = new Map<string, string>()
  for (const c of campaigns ?? []) {
    if (!campaignByProduct.has(c.product_id)) campaignByProduct.set(c.product_id, c.id)
  }

  const creativeCountByCampaign = new Map<string, number>()
  const approvedCountByCampaign = new Map<string, number>()
  for (const c of creatives ?? []) {
    creativeCountByCampaign.set(c.campaign_id, (creativeCountByCampaign.get(c.campaign_id) ?? 0) + 1)
    if (c.status === 'approved') {
      approvedCountByCampaign.set(c.campaign_id, (approvedCountByCampaign.get(c.campaign_id) ?? 0) + 1)
    }
  }

  // Score each product
  const opportunities = products.map(p => {
    const aiScore = scoreMap.get(p.id)?.score ?? 0
    const rationale = scoreMap.get(p.id)?.rationale ?? null
    const campaignId = campaignByProduct.get(p.id)
    const creativeCount = campaignId ? (creativeCountByCampaign.get(campaignId) ?? 0) : 0
    const approvedCount = campaignId ? (approvedCountByCampaign.get(campaignId) ?? 0) : 0
    const commission = p.commission_rate ?? 0
    const price = p.price ?? 0

    // Opportunity score: high AI score × high commission, discounted by existing creative saturation
    const opportunityScore = (aiScore * commission) / (1 + creativeCount * 0.5)

    // Assign tier
    let tier: 'now' | 'test' | 'explore' | 'skip' | 'pending_score'
    let tierLabel: string
    let tierColor: string
    let tierBg: string

    if (aiScore === 0) {
      tier = 'pending_score'; tierLabel = 'Sem score'; tierColor = 'rgba(255,255,255,0.4)'; tierBg = 'rgba(255,255,255,0.05)'
    } else if (aiScore >= 70 && commission >= 12) {
      tier = 'now'; tierLabel = 'Promover agora'; tierColor = '#4ade80'; tierBg = 'rgba(74,222,128,0.10)'
    } else if (aiScore >= 60 && commission >= 8) {
      tier = 'test'; tierLabel = 'Vale testar'; tierColor = '#fbbf24'; tierBg = 'rgba(251,191,36,0.10)'
    } else if (aiScore >= 50) {
      tier = 'explore'; tierLabel = 'Explorar'; tierColor = '#60a5fa'; tierBg = 'rgba(96,165,250,0.08)'
    } else {
      tier = 'skip'; tierLabel = 'Baixo potencial'; tierColor = '#f87171'; tierBg = 'rgba(248,113,113,0.08)'
    }

    // Commission per sale estimate
    const commissionValue = price * (commission / 100)

    return {
      id: p.id,
      title: p.title,
      price,
      commissionRate: commission,
      commissionValue: Number(commissionValue.toFixed(2)),
      imageUrl: p.image_url ?? null,
      affiliateUrl: p.affiliate_url ?? null,
      rating: p.rating ?? null,
      availableQuantity: p.available_quantity ?? null,
      aiScore,
      rationale,
      creativeCount,
      approvedCount,
      opportunityScore: Number(opportunityScore.toFixed(1)),
      tier,
      tierLabel,
      tierColor,
      tierBg,
      hasScore: aiScore > 0,
      hasCampaign: !!campaignId,
    }
  })

  // Sort: now > test > explore > skip > pending_score, then by opportunityScore desc
  const tierOrder = { now: 0, test: 1, explore: 2, skip: 3, pending_score: 4 }
  opportunities.sort((a, b) => {
    const td = tierOrder[a.tier] - tierOrder[b.tier]
    return td !== 0 ? td : b.opportunityScore - a.opportunityScore
  })

  const summary = {
    total: opportunities.length,
    now: opportunities.filter(o => o.tier === 'now').length,
    test: opportunities.filter(o => o.tier === 'test').length,
    pendingScore: opportunities.filter(o => o.tier === 'pending_score').length,
  }

  return NextResponse.json({ opportunities, summary })
}
