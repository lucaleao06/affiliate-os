import { NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdmin()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [products, scores, creatives, campaigns, salesToday] = await Promise.all([
      admin.from('products').select('id', { count: 'exact', head: true }),
      admin.from('product_scores').select('overall_score'),
      admin.from('creatives').select('status'),
      admin.from('campaigns').select('id', { count: 'exact', head: true }),
      admin.from('sales').select('commission_value').gte('occurred_at', todayStart.toISOString()),
    ])

    const validScores = (scores.data ?? []).filter(s => s.overall_score != null)
    const avgScore = validScores.length > 0
      ? Math.round(validScores.reduce((a, s) => a + Number(s.overall_score), 0) / validScores.length)
      : 0

    const creativeCounts = (creatives.data ?? []).reduce((acc, c) => {
      const s = c.status as string
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    const commissionToday = (salesToday.data ?? []).reduce((sum, r) => sum + Number(r.commission_value ?? 0), 0)
    const salesCountToday = (salesToday.data ?? []).length

    return NextResponse.json({
      products: products.count ?? 0,
      campaigns: campaigns.count ?? 0,
      avgScore,
      commissionToday: Number(commissionToday.toFixed(2)),
      salesCountToday,
      creatives: {
        pending: creativeCounts.pending ?? 0,
        approved: creativeCounts.approved ?? 0,
        rejected: creativeCounts.rejected ?? 0,
        total: (creatives.data ?? []).length,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
