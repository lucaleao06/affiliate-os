import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import type { ScoreInput, ScoreOutput } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { productId: string; scoreId?: string }
    if (!body.productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const admin = createAdmin()

    // Fetch product
    const { data: product, error: productErr } = await admin
      .from('products')
      .select('*')
      .eq('id', body.productId)
      .single()

    if (productErr || !product) {
      return NextResponse.json({ error: 'product not found' }, { status: 404 })
    }

    // Fetch latest score
    const scoreQuery = admin
      .from('product_scores')
      .select('*')
      .eq('product_id', body.productId)
      .order('created_at', { ascending: false })
      .limit(1)

    const { data: scores } = await scoreQuery
    const latestScore = scores?.[0]

    if (!latestScore) {
      return NextResponse.json({ error: 'product must be scored first' }, { status: 400 })
    }

    const scoreInput: ScoreInput = {
      title: product.title as string,
      description: product.description as string | undefined,
      price: product.price as number | undefined,
      originalPrice: product.original_price as number | undefined,
      commissionRate: product.commission_rate as number | undefined,
      extraCommission: product.extra_commission as number | undefined,
      rating: product.rating as number | undefined,
      reviewCount: product.review_count as number | undefined,
      soldCount: product.sold_count as number | undefined,
      category: product.category as string | undefined,
      imageUrl: product.image_url as string | undefined,
    }

    const scoreOutput: ScoreOutput = {
      overallScore: latestScore.overall_score as number,
      recommendation: latestScore.recommendation as ScoreOutput['recommendation'],
      components: {
        commission: latestScore.commission_score as number,
        demand: latestScore.demand_score as number,
        visual: latestScore.visual_score as number,
        impulse: latestScore.impulse_score as number,
        competition: latestScore.competition_score as number,
        trust: latestScore.trust_score as number,
        risk: latestScore.risk_score as number,
      },
      reasoning: latestScore.reasoning as string,
      provider: latestScore.provider as string,
      model: latestScore.model as string,
    }

    // Generate creatives
    const provider = getAIProvider()
    const creatives = await provider.generateCreatives(scoreInput, scoreOutput)

    // Create campaign
    const { data: campaign, error: campaignErr } = await admin
      .from('campaigns')
      .insert({
        workspace_id: DEFAULT_WORKSPACE,
        product_id: body.productId,
        name: `Campanha ${new Date().toLocaleDateString('pt-BR')} — ${(product.title as string).slice(0, 40)}`,
      })
      .select()
      .single()

    if (campaignErr) return NextResponse.json({ error: campaignErr.message }, { status: 500 })

    // Save creative angles
    const { data: angles, error: anglesErr } = await admin
      .from('creative_angles')
      .insert({
        campaign_id: campaign.id,
        hooks: creatives.hooks,
        angles: creatives.angles,
        scripts: creatives.scripts,
        ctas: creatives.ctas,
        captions: creatives.captions,
        provider: creatives.provider,
        model: creatives.model,
      })
      .select()
      .single()

    if (anglesErr) return NextResponse.json({ error: anglesErr.message }, { status: 500 })

    // Create one pending creative per hook (first 3)
    const creativesToInsert = creatives.hooks.slice(0, 3).map((hook, i) => ({
      campaign_id: campaign.id,
      angle_id: angles.id,
      hook,
      script: creatives.scripts[i] ?? null,
      caption: creatives.captions[i] ?? null,
      cta: creatives.ctas[i] ?? null,
      status: 'pending' as const,
    }))

    const { data: savedCreatives, error: creativesErr } = await admin
      .from('creatives')
      .insert(creativesToInsert)
      .select()

    if (creativesErr) return NextResponse.json({ error: creativesErr.message }, { status: 500 })

    return NextResponse.json({ campaign, angles, creatives: savedCreatives, raw: creatives })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
