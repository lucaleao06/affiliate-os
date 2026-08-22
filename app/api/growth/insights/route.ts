/**
 * GET /api/growth/insights — Growth Analyst + Winner Detection.
 * ?period=7|14|30|90  (days, default 30)
 * ?minOrders=3        (minimum orders to qualify)
 * ?minCommission=10   (minimum commission to qualify)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { runGrowthAnalysis, detectAndNotifyWinners } from '@/lib/growth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = createAdmin()
  const url = new URL(req.url)
  const period = parseInt(url.searchParams.get('period') ?? '30', 10)
  const minOrders = parseInt(url.searchParams.get('minOrders') ?? '3', 10)
  const minCommission = parseFloat(url.searchParams.get('minCommission') ?? '10')
  const notify = url.searchParams.get('notify') !== '0'

  const report = await runGrowthAnalysis(admin, {
    periodDays: period,
    thresholds: { minOrders, minCommission },
  })

  // Auto-detect and notify winners
  let winnerResult: { winners: import('@/lib/growth/types').GrowthInsight[]; notified: number } = { winners: [], notified: 0 }
  if (notify && report.insights.length > 0) {
    winnerResult = await detectAndNotifyWinners(admin, report.insights)
  }

  return NextResponse.json({
    ...report,
    winnersNotified: winnerResult.notified,
  })
}
