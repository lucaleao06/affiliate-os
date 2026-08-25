import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import type { ScoreInput } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdmin()
  const { data: creatives } = await admin
    .from('creatives')
    .select('id, hook, script, status, campaigns(name, products(id, title, price, commission_rate, image_url, product_type, margin_pct))')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })

  // Load persisted storyboards and renders so the UI survives navigation
  const { data: runs } = await admin
    .from('automation_runs')
    .select('type, input, output, created_at')
    .in('type', ['video_storyboard', 'video_render'])
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(100)

  const storyboards: Record<string, unknown> = {}
  const renders: Record<string, unknown> = {}
  for (const run of (runs ?? [])) {
    const cid = (run.input as Record<string, string>)?.creativeId
    if (!cid) continue
    if (run.type === 'video_storyboard' && !storyboards[cid]) {
      storyboards[cid] = run.output
    }
    if (run.type === 'video_render' && !renders[cid]) {
      const o = run.output as Record<string, unknown>
      renders[cid] = {
        status: 'completed',
        runId: '',
        filename: o.filename,
        downloadUrl: o.downloadUrl,
        durationSec: o.durationSec,
        width: o.width,
        height: o.height,
        codec: o.codec,
        fileSizeBytes: o.fileSizeBytes,
        renderMs: 0, // not stored; use 0 for historical runs
      }
    }
  }

  return NextResponse.json({ creatives: creatives ?? [], storyboards, renders })
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
