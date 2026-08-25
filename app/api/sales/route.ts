/**
 * GET /api/sales — List individual sale transactions with filters.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = createAdmin()
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? ''
  const period = url.searchParams.get('period') ?? '30d'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

  let q = admin
    .from('sales')
    .select('id, order_id, platform, gross_value, commission_value, commission_rate, status, occurred_at, payout_date, import_batch_id, raw_data', { count: 'exact' })
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) q = q.eq('status', status)
  if (period !== 'all') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const since = new Date(Date.now() - days * 86400_000).toISOString()
    q = q.gte('occurred_at', since)
  }

  const { data, error, count } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sales = (data ?? []).map(r => ({
    id: r.id,
    order_id: r.order_id,
    platform: r.platform,
    gross_value: r.gross_value,
    commission_value: r.commission_value,
    commission_rate: r.commission_rate,
    status: r.status,
    occurred_at: r.occurred_at,
    payout_date: r.payout_date,
    product_name: (r.raw_data as Record<string, string> | null)?.product_name ?? null,
  }))

  return NextResponse.json({ sales, total: count ?? 0 })
}
