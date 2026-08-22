import { NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdmin()

    const [products, scores, creatives, campaigns] = await Promise.all([
      admin.from('products').select('id', { count: 'exact', head: true }),
      admin.from('product_scores').select('overall_score'),
      admin.from('creatives').select('status'),
      admin.from('campaigns').select('id', { count: 'exact', head: true }),
    ])

    const avgScore = scores.data && scores.data.length > 0
      ? Math.round(scores.data.reduce((a, s) => a + (s.overall_score as number), 0) / scores.data.length)
      : 0

    const creativeCounts = (creatives.data ?? []).reduce((acc, c) => {
      const s = c.status as string
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      products: products.count ?? 0,
      campaigns: campaigns.count ?? 0,
      avgScore,
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
