import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { renderVideo } from '@/lib/render/ffmpeg'
import { saveCaptions } from '@/lib/render/captions'
import { buildContentPackage, saveContentPackage } from '@/lib/render/content-package'
import type { StoryboardOutput } from '@/lib/ai'

export const dynamic = 'force-dynamic'
// Render can take time — allow up to 5 min
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  let runId: string | null = null
  const admin = createAdmin()

  try {
    const body = await req.json() as { creativeId: string }
    if (!body.creativeId) return NextResponse.json({ error: 'creativeId required' }, { status: 400 })

    // Get creative + campaign + product
    const { data: creative } = await admin
      .from('creatives')
      .select('*, campaigns(*, products(*))')
      .eq('id', body.creativeId)
      .single()

    if (!creative) return NextResponse.json({ error: 'creative not found' }, { status: 404 })

    // Get latest storyboard from automation_runs
    const { data: runs } = await admin
      .from('automation_runs')
      .select('*')
      .eq('type', 'video_storyboard')
      .order('created_at', { ascending: false })
      .limit(20)

    const run = runs?.find(r => (r.input as { creativeId?: string })?.creativeId === body.creativeId)
    if (!run) return NextResponse.json({ error: 'generate storyboard first' }, { status: 400 })

    const storyboard = run.output as StoryboardOutput
    const product = (creative.campaigns as { products: Record<string, unknown> | null } | null)?.products as Record<string, unknown> | null

    // Create render job record
    const { data: renderRun } = await admin.from('automation_runs').insert({
      type: 'video_render',
      status: 'rendering',
      input: {
        creativeId: body.creativeId,
        storyboardRunId: run.id,
        engine: 'ffmpeg',
      },
      output: {},
    }).select().single()
    runId = renderRun?.id ?? null

    const filename = `render_${body.creativeId.slice(0, 8)}_${Date.now()}.mp4`

    const result = await renderVideo({
      storyboard,
      outputFilename: filename,
      productImageUrl: product?.image_url as string | undefined,
      hook: creative.hook as string ?? '',
    })

    const durationMs = Date.now() - startedAt
    const downloadUrl = `/api/video-factory/output/${result.filename}`

    // Generate captions alongside the MP4
    let srtPath: string | null = null
    let captionsJsonPath: string | null = null
    try {
      const caps = saveCaptions(storyboard, result.outputPath)
      srtPath = caps.srtPath
      captionsJsonPath = caps.jsonPath
    } catch (capErr) {
      console.warn('[video-factory/render] captions generation failed (non-fatal):', capErr)
    }

    // Build content package manifest
    const pkg = buildContentPackage({
      runId: runId ?? `render_${Date.now()}`,
      creativeId: body.creativeId,
      productId: (product?.id as string | undefined) ?? '',
      videoPath: result.outputPath,
      videoFilename: result.filename,
      downloadUrl,
      srtPath,
      captionsJsonPath,
      caption: (creative.caption as string | null) ?? '',
      cta: (creative.cta as string | null) ?? '',
      affiliateUrl: (product?.affiliate_url as string | null) ?? null,
      channel: 'instagram',
      durationSec: result.durationSec,
      fileSizeBytes: result.fileSizeBytes,
      width: result.width,
      height: result.height,
      codec: result.codec,
    })
    try { saveContentPackage(pkg) } catch { /* non-fatal */ }

    // Update render job to completed
    await admin.from('automation_runs').update({
      status: 'completed',
      duration_ms: durationMs,
      output: {
        filename: result.filename,
        outputPath: result.outputPath,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
        codec: result.codec,
        fileSizeBytes: result.fileSizeBytes,
        downloadUrl,
        srtPath,
        packageReady: pkg.checklist.ready,
      },
    }).eq('id', runId!)

    return NextResponse.json({
      status: 'completed',
      runId,
      filename: result.filename,
      downloadUrl,
      durationSec: result.durationSec,
      width: result.width,
      height: result.height,
      codec: result.codec,
      fileSizeBytes: result.fileSizeBytes,
      renderMs: durationMs,
      captions: { srtPath, captionsJsonPath },
      package: { checklist: pkg.checklist },
    })
  } catch (err) {
    if (runId) {
      await admin.from('automation_runs').update({
        status: 'failed',
        duration_ms: Date.now() - startedAt,
        error: String(err),
      }).eq('id', runId)
    }
    console.error('[video-factory/render]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
