import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001'

// Validates a price/cost value: must be a finite non-negative number
function validMoney(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= 0
}

// Validates a URL without leaking it in error messages
function validUrl(v: unknown): boolean {
  if (typeof v !== 'string' || v.trim() === '') return false
  try {
    const u = new URL(v.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch { return false }
}

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
      .order('created_at', { ascending: false, referencedTable: 'product_scores' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      // Required
      title: string
      // Shopee affiliate fields
      description?: string
      price?: number
      originalPrice?: number
      imageUrl?: string
      url?: string
      affiliateUrl?: string
      category?: string
      seller?: string
      rating?: number | null
      reviewCount?: number
      soldCount?: number
      commissionRate?: number
      extraCommission?: number
      // Owned product fields (migration 005)
      product_type?: 'affiliate' | 'owned'
      cost?: number | null
      checkout_url?: string
      margin_pct?: number | null
      marketplace?: string
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const isOwned = body.product_type === 'owned'

    // Owned product validations
    if (isOwned) {
      if (!body.price || !validMoney(body.price) || body.price <= 0) {
        return NextResponse.json({ error: 'price must be a positive number for owned products' }, { status: 400 })
      }
      if (!body.checkout_url || !validUrl(body.checkout_url)) {
        return NextResponse.json({ error: 'checkout_url must be a valid URL for owned products' }, { status: 400 })
      }
      if (body.cost !== undefined && body.cost !== null && !validMoney(body.cost)) {
        return NextResponse.json({ error: 'cost must be a non-negative number' }, { status: 400 })
      }
    }

    const admin = createAdmin()

    // Base row — always compatible with existing Shopee products
    const baseRow = {
      workspace_id: DEFAULT_WORKSPACE,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      price: body.price ?? null,
      original_price: body.originalPrice ?? body.price ?? null,
      image_url: body.imageUrl?.trim() ?? null,
      url: body.url?.trim() ?? null,
      affiliate_url: body.affiliateUrl?.trim() ?? body.checkout_url?.trim() ?? null,
      category: body.category?.trim() ?? null,
      seller: body.seller?.trim() ?? null,
      rating: body.rating ?? null,
      review_count: body.reviewCount ?? 0,
      sold_count: body.soldCount ?? 0,
      commission_rate: body.commissionRate ?? (isOwned ? 100 : 0),
      extra_commission: body.extraCommission ?? 0,
      // marketplace col exists in the initial schema. Keep affiliate products
      // compatible with Shopee while correctly classifying owned offers.
      marketplace: body.marketplace ?? (isOwned ? 'owned' : 'shopee'),
    }

    // Attempt insert with migration-005 columns first; fall back gracefully if columns absent
    const ownedExtras = isOwned ? {
      product_type: 'owned',
      cost: body.cost ?? null,
      checkout_url: body.checkout_url?.trim() ?? null,
      margin_pct: body.margin_pct ?? null,
    } : {}

    const { data, error } = await admin
      .from('products')
      .insert({ ...baseRow, ...ownedExtras })
      .select()
      .single()

    if (error) {
      // Detect missing columns (migration 005 not applied) and give a clear message
      const msg = error.message ?? ''
      if (
        isOwned &&
        (msg.includes('product_type') || msg.includes('checkout_url') || msg.includes('margin_pct'))
      ) {
        return NextResponse.json({
          error: 'Migration 005 not applied. Run supabase/005_owned_products.sql in the Supabase SQL Editor before adding owned products.',
          migration_required: true,
        }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      id: string
      title?: string
      description?: string
      price?: number
      cost?: number | null
      checkout_url?: string
      margin_pct?: number | null
      affiliate_url?: string
      commission_rate?: number
      category?: string
      image_url?: string
      original_price?: number
      rating?: number | null
      review_count?: number
      sold_count?: number
    }

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (body.price !== undefined && !validMoney(body.price)) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }
    if (body.original_price !== undefined && !validMoney(body.original_price)) {
      return NextResponse.json({ error: 'original_price must be a non-negative number' }, { status: 400 })
    }
    if (body.rating !== undefined && body.rating !== null && (!validMoney(body.rating) || body.rating > 5)) {
      return NextResponse.json({ error: 'rating must be between 0 and 5' }, { status: 400 })
    }
    if (body.review_count !== undefined && (!Number.isInteger(body.review_count) || body.review_count < 0)) {
      return NextResponse.json({ error: 'review_count must be a non-negative integer' }, { status: 400 })
    }
    if (body.sold_count !== undefined && (!Number.isInteger(body.sold_count) || body.sold_count < 0)) {
      return NextResponse.json({ error: 'sold_count must be a non-negative integer' }, { status: 400 })
    }
    if (body.cost !== undefined && body.cost !== null && !validMoney(body.cost)) {
      return NextResponse.json({ error: 'cost must be a non-negative number' }, { status: 400 })
    }
    if (body.checkout_url !== undefined && !validUrl(body.checkout_url)) {
      return NextResponse.json({ error: 'checkout_url must be a valid URL' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title.trim()
    if (body.description !== undefined) updates.description = body.description.trim()
    if (body.price !== undefined) updates.price = body.price
    if (body.original_price !== undefined) updates.original_price = body.original_price
    if (body.cost !== undefined) updates.cost = body.cost
    if (body.checkout_url !== undefined) updates.checkout_url = body.checkout_url.trim()
    if (body.margin_pct !== undefined) updates.margin_pct = body.margin_pct
    if (body.affiliate_url !== undefined) updates.affiliate_url = body.affiliate_url.trim()
    if (body.commission_rate !== undefined) updates.commission_rate = body.commission_rate
    if (body.category !== undefined) updates.category = body.category.trim()
    if (body.image_url !== undefined) updates.image_url = body.image_url.trim()
    if (body.rating !== undefined) updates.rating = body.rating
    if (body.review_count !== undefined) updates.review_count = body.review_count
    if (body.sold_count !== undefined) updates.sold_count = body.sold_count

    const admin = createAdmin()
    const { data, error } = await admin
      .from('products')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
