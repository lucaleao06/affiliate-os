import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import type { ScoreInput } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdmin()
  const { data } = await admin
    .from('creatives')
    .select('id, hook, script, status, campaigns(name, products(id, title, price, commission_rate, image_url))')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
  return NextResponse.json({ creatives: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { creativeId: string }
    if (!body.creativeId) return NextResponse.json({ error: 'creativeId required' }, { status: 400 })

    const admin = createAdmin()
    const { data: creative } = await admin
      .from('creatives')
      .select('*, campaigns(*, products(*))')
      .eq('id', body.creativeId)
      .single()

    if (!creative) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const product = (creative.campaigns as { products: Record<string, unknown> | null } | null)?.products as Record<string, unknown> | null
    if (!product) return NextResponse.json({ error: 'product not found' }, { status: 404 })

    const scoreInput: ScoreInput = {
      title: product.title as string,
      price: product.price as number | undefined,
      originalPrice: product.original_price as number | undefined,
      commissionRate: product.commission_rate as number | undefined,
      description: product.description as string | undefined,
    }

    const provider = getAIProvider()
    const storyboard = await provider.generateStoryboard(
      scoreInput,
      creative.hook as string ?? '',
      creative.script as string ?? '',
    )

    // Persist in automation_runs
    const { data: run } = await admin.from('automation_runs').insert({
      type: 'video_storyboard',
      status: 'completed',
      input: { creativeId: body.creativeId, productTitle: product.title },
      output: storyboard,
    }).select().single()

    return NextResponse.json({ storyboard, runId: run?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
