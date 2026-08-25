/**
 * POST /api/publish — create or trigger publication for a package.
 * GET  /api/publish — list publication packages.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { buildPublicationChecklist, publish, rightsGatePassed } from '@/lib/publish'
import type { PublicationPackage, PublicationChannel, RightsStatus } from '@/lib/publish'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = createAdmin()
  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  let query = admin.from('publication_packages')
    .select('*, creatives(hook, caption, cta), products(title, image_url)')
    .order('created_at', { ascending: false })
    .limit(30)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ packages: data ?? [] })
}

export async function POST(req: NextRequest) {
  const admin = createAdmin()
  const body = await req.json() as {
    action: 'create' | 'publish' | 'schedule'
    creativeId?: string
    renderRunId?: string
    channel?: PublicationChannel
    rightsStatus?: RightsStatus
    affiliateUrl?: string
    scheduledAt?: string
    packageId?: string  // for action=publish
  }

  if (body.action === 'create') {
    // Build package from render run output
    const { data: creative } = await admin.from('creatives')
      .select('*, campaigns(*, products(*))')
      .eq('id', body.creativeId ?? '')
      .single()

    if (!creative) return NextResponse.json({ error: 'creative not found' }, { status: 404 })

    // Get latest render for this creative
    const { data: runs } = await admin.from('automation_runs')
      .select('*').eq('type', 'video_render').eq('status', 'completed')
      .order('created_at', { ascending: false }).limit(10)

    const renderRun = runs?.find(r => (r.input as Record<string, string>)?.creativeId === body.creativeId)
    if (!renderRun) return NextResponse.json({ error: 'no render found — render first' }, { status: 400 })

    const output = renderRun.output as Record<string, unknown>
    const product = (creative.campaigns as { products: Record<string, unknown> | null } | null)?.products as Record<string, unknown> | null

    const pkgData = {
      creative_id: body.creativeId,
      product_id: product?.id as string | undefined,
      campaign_id: (creative.campaigns as { id: string } | null)?.id,
      video_path: output.outputPath as string,
      video_filename: output.filename as string,
      download_url: output.downloadUrl as string,
      srt_path: (output.srtPath as string | null) ?? null,
      caption: (creative.caption as string | null) ?? '',
      cta: (creative.cta as string | null) ?? '',
      affiliate_url: (body.affiliateUrl ?? (product?.affiliate_url as string | null)) ?? null,
      channel: body.channel ?? 'manual',
      rights_status: body.rightsStatus ?? 'unknown',
      duration_sec: output.durationSec as number ?? 0,
      file_size_bytes: output.fileSizeBytes as number ?? 0,
      width: output.width as number ?? 1080,
      height: output.height as number ?? 1920,
      codec: output.codec as string ?? 'h264',
    }

    // Build checklist
    const checklist = buildPublicationChecklist({
      id: '',
      creativeId: body.creativeId ?? '',
      productId: pkgData.product_id ?? '',
      campaignId: pkgData.campaign_id ?? '',
      videoPath: pkgData.video_path,
      videoFilename: pkgData.video_filename,
      downloadUrl: pkgData.download_url,
      srtPath: pkgData.srt_path,
      caption: pkgData.caption,
      cta: pkgData.cta,
      affiliateUrl: pkgData.affiliate_url,
      channel: pkgData.channel as PublicationChannel,
      rightsStatus: pkgData.rights_status as RightsStatus,
      durationSec: pkgData.duration_sec,
      fileSizeBytes: pkgData.file_size_bytes,
      width: pkgData.width,
      height: pkgData.height,
      codec: pkgData.codec,
      generatedAt: new Date().toISOString(),
      scheduledAt: null, publishedAt: null, publishedUrl: null,
    })

    const status = checklist.ready ? 'ready' : pkgData.rights_status === 'unknown' ? 'pending_rights' : 'draft'

    const { data: pkg, error } = await admin.from('publication_packages').insert({
      ...pkgData,
      checklist,
      status,
      status_reason: checklist.failReasons.join('; ') || null,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify
    await admin.from('notifications').insert({
      event: checklist.ready ? 'publication_ready' : 'approval_required',
      title: checklist.ready ? '📦 Pacote pronto para publicar' : '⚠️ Pacote precisa de ajustes',
      body: checklist.failReasons.join(', ') || `Canal: ${body.channel ?? 'manual'}`,
      data: { packageId: pkg.id },
    })

    return NextResponse.json({ package: pkg })
  }

  if (body.action === 'publish') {
    const { data: pkg } = await admin.from('publication_packages').select('*').eq('id', body.packageId ?? '').single()
    if (!pkg) return NextResponse.json({ error: 'package not found' }, { status: 404 })

    const rights = rightsGatePassed(pkg as unknown as PublicationPackage)
    if (!rights.passed) {
      return NextResponse.json({ error: rights.reason }, { status: 422 })
    }

    await admin.from('publication_packages').update({ status: 'publishing' }).eq('id', pkg.id)

    const result = await publish(pkg as unknown as PublicationPackage)

    if (result.success) {
      await admin.from('publication_packages').update({
        status: result.requiresManualAction ? 'manual_required' : 'published',
        platform_post_id: result.platformPostId ?? null,
        published_url: result.publishedUrl ?? null,
        published_at: result.requiresManualAction ? null : new Date().toISOString(),
      }).eq('id', pkg.id)

      await admin.from('notifications').insert({
        event: result.requiresManualAction ? 'publication_ready' : 'publication_failed',
        title: result.requiresManualAction ? '📱 Publicação manual necessária' : '✅ Publicado com sucesso',
        body: result.manualInstructions ?? result.publishedUrl ?? '',
        data: { packageId: pkg.id },
      })
    } else {
      await admin.from('publication_packages').update({ status: 'failed', status_reason: result.error }).eq('id', pkg.id)
      await admin.from('notifications').insert({
        event: 'publication_failed',
        title: '❌ Falha na publicação',
        body: result.error,
        data: { packageId: pkg.id },
      })
    }

    return NextResponse.json({ result })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
