/**
 * GET /api/revenue — Aggregated commission analytics.
 * ?period=today|7d|30d|all
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = createAdmin()
  const url = new URL(req.url)
  const period = url.searchParams.get('period') ?? '30d'

  const now = new Date()
  let since: Date | null = null
  if (period === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (period === '7d') {
    since = new Date(Date.now() - 7 * 86400_000)
  } else if (period === '30d') {
    since = new Date(Date.now() - 30 * 86400_000)
  }

  const sinceISO = since ? since.toISOString() : null

  // Base query builder — must reassign after each chain call (Supabase v2 is immutable)
  function baseQuery() {
    let q = admin.from('sales').select('*').neq('status', 'cancelled').neq('status', 'invalid')
    if (sinceISO) q = q.gte('occurred_at', sinceISO)
    return q
  }

  // Total commission
  const { data: allSales } = await baseQuery()
  const sales = allSales ?? []

  const totalCommission = sales.reduce((s, r) => s + Number(r.commission_value ?? 0), 0)
  const totalGross = sales.reduce((s, r) => s + Number(r.gross_value ?? 0), 0)
  const totalOrders = sales.length

  // Today's commission
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const { data: todaySales } = await admin.from('sales')
    .select('commission_value')
    .neq('status', 'cancelled')
    .neq('status', 'invalid')
    .gte('occurred_at', todayStart)
  const commissionToday = (todaySales ?? []).reduce((s, r) => s + Number(r.commission_value ?? 0), 0)

  // 7d commission
  const d7Start = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { data: d7Sales } = await admin.from('sales')
    .select('commission_value')
    .neq('status', 'cancelled')
    .neq('status', 'invalid')
    .gte('occurred_at', d7Start)
  const commission7d = (d7Sales ?? []).reduce((s, r) => s + Number(r.commission_value ?? 0), 0)

  // Top products by commission
  const productMap: Record<string, { name: string; commission: number; orders: number }> = {}
  for (const s of sales) {
    const pid = (s.product_id as string | null) ?? s.raw_data?.product_name ?? 'unknown'
    const name = (s.raw_data as Record<string, string> | null)?.product_name ?? pid
    if (!productMap[pid]) productMap[pid] = { name: String(name), commission: 0, orders: 0 }
    productMap[pid].commission += Number(s.commission_value ?? 0)
    productMap[pid].orders++
  }
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].commission - a[1].commission)
    .slice(0, 5)
    .map(([id, v]) => ({ id, ...v }))

  // Top channels by commission
  const channelMap: Record<string, { commission: number; orders: number }> = {}
  for (const s of sales) {
    const ch = (s.source_channel as string | null) ?? s.platform ?? 'unknown'
    if (!channelMap[ch]) channelMap[ch] = { commission: 0, orders: 0 }
    channelMap[ch].commission += Number(s.commission_value ?? 0)
    channelMap[ch].orders++
  }
  const topChannels = Object.entries(channelMap)
    .sort((a, b) => b[1].commission - a[1].commission)
    .slice(0, 5)
    .map(([channel, v]) => ({ channel, ...v }))

  // Top creatives by commission
  const creativeMap: Record<string, { commission: number; orders: number }> = {}
  for (const s of sales) {
    if (!s.creative_id) continue
    const cid = s.creative_id as string
    if (!creativeMap[cid]) creativeMap[cid] = { commission: 0, orders: 0 }
    creativeMap[cid].commission += Number(s.commission_value ?? 0)
    creativeMap[cid].orders++
  }
  const topCreatives = Object.entries(creativeMap)
    .sort((a, b) => b[1].commission - a[1].commission)
    .slice(0, 5)
    .map(([creativeId, v]) => ({ creativeId, ...v }))

  // Status breakdown
  const statusBreakdown: Record<string, number> = {}
  for (const s of (allSales ?? [])) {
    const st = s.status as string
    statusBreakdown[st] = (statusBreakdown[st] ?? 0) + 1
  }

  return NextResponse.json({
    period,
    summary: {
      commissionToday: Number(commissionToday.toFixed(2)),
      commission7d: Number(commission7d.toFixed(2)),
      commissionPeriod: Number(totalCommission.toFixed(2)),
      grossPeriod: Number(totalGross.toFixed(2)),
      ordersPeriod: totalOrders,
    },
    topProducts,
    topChannels,
    topCreatives,
    statusBreakdown,
    isEmpty: totalOrders === 0,
  })
}
