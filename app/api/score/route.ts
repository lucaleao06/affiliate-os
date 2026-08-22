import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import type { ScoreInput } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { productId: string }
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

    // Build score input
    const input: ScoreInput = {
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

    // Run AI score
    const provider = getAIProvider()
    const score = await provider.scoreProduct(input)

    // Save score
    const { data: scoreRow, error: scoreErr } = await admin
      .from('product_scores')
      .insert({
        product_id: body.productId,
        overall_score: score.overallScore,
        commission_score: score.components.commission,
        demand_score: score.components.demand,
        visual_score: score.components.visual,
        impulse_score: score.components.impulse,
        competition_score: score.components.competition,
        trust_score: score.components.trust,
        risk_score: score.components.risk,
        recommendation: score.recommendation,
        reasoning: score.reasoning,
        provider: score.provider,
        model: score.model,
      })
      .select()
      .single()

    if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 })

    return NextResponse.json({ score, scoreRow })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
