/**
 * GET /api/hoje
 * Aggregates today's activity for the "Hoje" dashboard view.
 * Returns: generated, awaiting_approval, published, sales, commission, winners, errors
 */
import { NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdmin()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [
    { data: renders },
    { data: allRenders },
    { data: pendingCreatives },
    { data: publishedPkgs },
    { data: allPublishedPkgs },
    { data: todaySales },
    { data: recentNotifs },
    { data: autopilotRules },
  ] = await Promise.all([
    // Videos rendered today
    admin.from('automation_runs')
      .select('id, status, created_at, output')
      .eq('type', 'video_render')
      .gte('created_at', todayIso)
      .order('created_at', { ascending: false }),

    // Total renders lifetime (for consistent "vídeos gerados" count)
    admin.from('automation_runs')
      .select('id, status')
      .eq('type', 'video_render')
      .eq('status', 'completed'),

    // Creatives awaiting approval (all pending; filter [MOCK] in JS to handle NULL hooks)
    admin.from('creatives')
      .select('id, hook, script, status, campaigns(products(title))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(30),

    // Packages published today
    admin.from('publication_packages')
      .select('id, channel, status, published_at, published_url')
      .eq('status', 'published')
      .gte('published_at', todayIso)
      .order('published_at', { ascending: false }),

    // Total published lifetime
    admin.from('publication_packages')
      .select('id')
      .eq('status', 'published'),

    // Sales today
    admin.from('sales')
      .select('id, commission_value, gross_value, status')
      .gte('order_date', todayIso)
      .neq('status', 'cancelled'),

    // Recent notifications (last 24h)
    admin.from('notifications')
      .select('id, event, title, body, created_at, read')
      .gte('created_at', new Date(Date.now() - 86400_000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20),

    // Autopilot mode
    admin.from('autopilot_rules')
      .select('mode, enabled')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle(),
  ])

  // Aggregate sales
  const todayCommission = (todaySales ?? []).reduce((sum, s) => sum + (s.commission_value ?? 0), 0)
  const todayRevenue = (todaySales ?? []).reduce((sum, s) => sum + (s.gross_value ?? 0), 0)

  // Segment notifications
  const errors = (recentNotifs ?? []).filter(n =>
    n.event === 'render_failed' || n.event === 'publish_failed'
  )
  const winners = (recentNotifs ?? []).filter(n => n.event === 'winner_detected')
  const unreadCount = (recentNotifs ?? []).filter(n => !n.read).length

  const rendersOk = (renders ?? []).filter(r => r.status === 'completed')
  const rendersFailed = (renders ?? []).filter(r => r.status === 'failed')
  const totalRendersOk = (allRenders ?? []).length

  // Filter [MOCK] legacy creatives in JS (Supabase .not() excludes NULL hooks too)
  interface PendingCreative { id: string; hook: string | null; script: string | null; status: string; campaigns: { products: { title: string } | null } | null }
  const realPending = ((pendingCreatives as unknown as PendingCreative[]) ?? []).filter(c =>
    !c.hook?.includes('[MOCK]') && !c.script?.includes('[MOCK]')
  )

  return NextResponse.json({
    date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
    autopilotMode: autopilotRules?.mode ?? 'PAUSED',
    autopilotEnabled: autopilotRules?.enabled ?? false,
    generated: {
      count: totalRendersOk,       // lifetime total — fonte de verdade
      countToday: rendersOk.length, // apenas hoje
      failed: rendersFailed.length,
      items: rendersOk.slice(0, 5).map(r => ({
        id: r.id,
        filename: (r.output as Record<string, unknown>)?.filename,
        durationSec: (r.output as Record<string, unknown>)?.durationSec,
        downloadUrl: (r.output as Record<string, unknown>)?.downloadUrl,
      })),
    },
    awaitingApproval: {
      count: realPending.length,
      items: realPending.slice(0, 3).map(c => ({
        id: c.id,
        hook: c.hook,
        product: ((c.campaigns as unknown as { products: { title: string } | null } | null)?.products?.title) ?? null,
      })),
    },
    published: {
      count: (allPublishedPkgs ?? []).length, // lifetime total
      countToday: (publishedPkgs ?? []).length, // apenas hoje
      items: (publishedPkgs ?? []).map(p => ({
        id: p.id, channel: p.channel, url: p.published_url,
      })),
    },
    sales: {
      count: (todaySales ?? []).length,
      commission: todayCommission,
      revenue: todayRevenue,
    },
    winners: {
      count: winners.length,
      items: winners.slice(0, 3).map(w => ({ title: w.title, body: w.body, at: w.created_at })),
    },
    errors: {
      count: errors.length,
      items: errors.slice(0, 3).map(e => ({ title: e.title, body: e.body, at: e.created_at })),
    },
    unreadNotifications: unreadCount,
  })
}
