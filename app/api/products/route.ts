import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const admin = createAdmin()
    const { data, error } = await admin
      .from('products')
      .select(`
        *,
        product_scores (
          overall_score, recommendation, commission_score, demand_score,
          visual_score, impulse_score, competition_score, trust_score,
          risk_score, reasoning, provider, model, created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title: string
      description?: string
      price?: number
      originalPrice?: number
      imageUrl?: string
      url?: string
      affiliateUrl?: string
      category?: string
      seller?: string
      rating?: number
      reviewCount?: number
      soldCount?: number
      commissionRate?: number
      extraCommission?: number
    }

    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const admin = createAdmin()
    const { data, error } = await admin
      .from('products')
      .insert({
        workspace_id: DEFAULT_WORKSPACE,
        title: body.title,
        description: body.description,
        price: body.price,
        original_price: body.originalPrice,
        image_url: body.imageUrl,
        url: body.url,
        affiliate_url: body.affiliateUrl,
        category: body.category,
        seller: body.seller,
        rating: body.rating,
        review_count: body.reviewCount ?? 0,
        sold_count: body.soldCount ?? 0,
        commission_rate: body.commissionRate ?? 0,
        extra_commission: body.extraCommission ?? 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
