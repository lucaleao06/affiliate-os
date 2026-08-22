import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import type { ScoreInput, ScoreOutput } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { creativeId: string }
    if (!body.creativeId) return NextResponse.json({ error: 'creativeId required' }, { status: 400 })

    const admin = createAdmin()

    // Get creative → campaign → product
    const { data: creative, error: cErr } = await admin
      .from('creatives')
      .select('*, campaigns(*, products(*))')
      .eq('id', body.creativeId)
      .single()

    if (cErr || !creative) return NextResponse.json({ error: 'creative not found' }, { status: 404 })

    const campaign = creative.campaigns as { id: string; products: Record<string, unknown> | null } | null
    const product = campaign?.products as Record<string, unknown> | null
    if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })

    // Get latest score
    const { data: scores } = await admin
      .from('product_scores')
      .select('*')
      .eq('product_id', product.id as string)
      .order('created_at', { ascending: false })
      .limit(1)

    const latestScore = scores?.[0]
    if (!latestScore) return NextResponse.json({ error: 'score product first' }, { status: 400 })

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

    const provider = getAIProvider()
    const newCreatives = await provider.generateCreatives(scoreInput, scoreOutput)

    // Pick a different hook from the set
    const hooks = newCreatives.hooks
    const currentHook = creative.hook as string
    const newHook = hooks.find(h => h !== currentHook) ?? hooks[Math.floor(Math.random() * hooks.length)]
    const idx = hooks.indexOf(newHook)

    const { data: updated } = await admin
      .from('creatives')
      .update({
        hook: newHook,
        script: newCreatives.scripts[idx] ?? newCreatives.scripts[0],
        caption: newCreatives.captions[idx] ?? newCreatives.captions[0],
        cta: newCreatives.ctas[idx] ?? newCreatives.ctas[0],
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.creativeId)
      .select()
      .single()

    return NextResponse.json({ creative: updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
