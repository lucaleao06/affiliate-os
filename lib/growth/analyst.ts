/**
 * Growth Analyst — aggregation + winner detection.
 * Uses SQL aggregations from the sales table. No ML required.
 * Winners are not defined by views — prioritizes commission, conversion, consistency.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GrowthInsight, GrowthReport, WinnerThresholds, InsightEntity } from './types'
import { DEFAULT_THRESHOLDS } from './types'

interface SaleRow {
  product_id: string | null
  creative_id: string | null
  source_channel: string | null
  commission_value: number
  gross_value: number
  status: string
  occurred_at: string | null
  raw_data?: Record<string, string> | null
}

function sinceISO(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

/** Aggregate sales by a dimension (product/creative/channel) */
function aggregate(rows: SaleRow[], dim: keyof SaleRow): Map<string, { commission: number; orders: number; label: string }> {
  const map = new Map<string, { commission: number; orders: number; label: string }>()
  for (const r of rows) {
    if (r.status === 'cancelled' || r.status === 'invalid') continue
    const key = (r[dim] as string | null) ?? 'unknown'
    const label = dim === 'source_channel' ? key : (r.raw_data?.product_name ?? key)
    if (!map.has(key)) map.set(key, { commission: 0, orders: 0, label })
    const e = map.get(key)!
    e.commission += Number(r.commission_value ?? 0)
    e.orders++
  }
  return map
}

/** Detect insights from aggregated sales data */
export async function runGrowthAnalysis(
  supabase: SupabaseClient,
  options?: { periodDays?: number; thresholds?: Partial<WinnerThresholds> }
): Promise<GrowthReport> {
  const period = options?.periodDays ?? 30
  const prior = period
  const t: WinnerThresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds }
  const now = new Date().toISOString()

  // Current period
  const { data: currentRows } = await supabase
    .from('sales')
    .select('product_id, creative_id, source_channel, commission_value, gross_value, status, occurred_at, raw_data')
    .gte('occurred_at', sinceISO(period))

  // Prior period for trend
  const { data: priorRows } = await supabase
    .from('sales')
    .select('product_id, creative_id, source_channel, commission_value, gross_value, status, occurred_at, raw_data')
    .gte('occurred_at', sinceISO(period + prior))
    .lt('occurred_at', sinceISO(period))

  const curr = (currentRows ?? []) as SaleRow[]
  const prev = (priorRows ?? []) as SaleRow[]

  if (curr.length === 0) {
    return {
      generatedAt: now,
      period: `${period}d`,
      insights: [{
        type: 'no_data',
        entity: 'product',
        entityId: '',
        entityLabel: 'Sem dados',
        confidence: 1,
        reason: 'Nenhuma venda importada ainda. Importe um relatório CSV do Shopee Affiliate.',
        recommendedAction: 'no_action',
        metrics: {},
        detectedAt: now,
      }],
      summary: { totalCommission: 0, totalOrders: 0, winnersCount: 0, losersCount: 0, risingCount: 0 },
    }
  }

  const insights: GrowthInsight[] = []

  // ── Analyse by dimension ──────────────────────────────────────────────────

  const dims: { dim: keyof SaleRow; entity: InsightEntity }[] = [
    { dim: 'product_id', entity: 'product' },
    { dim: 'creative_id', entity: 'creative' },
    { dim: 'source_channel', entity: 'channel' },
  ]

  for (const { dim, entity } of dims) {
    const currMap = aggregate(curr, dim)
    const prevMap = aggregate(prev, dim)

    if (currMap.size === 0) continue

    // Sort by commission
    const sorted = [...currMap.entries()].sort((a, b) => b[1].commission - a[1].commission)
    const total = sorted.reduce((s, [, v]) => s + v.commission, 0)
    const topCutoff = t.topPercentile * sorted.length

    sorted.forEach(([id, data], idx) => {
      if (data.orders < t.minOrders || data.commission < t.minCommission) return

      const prevData = prevMap.get(id)
      const trend = prevData && prevData.commission > 0
        ? (data.commission - prevData.commission) / prevData.commission
        : null

      const isTop = idx < Math.max(1, topCutoff)
      const isRising = trend !== null && trend >= t.risingThreshold
      const isFalling = trend !== null && trend <= t.fallingThreshold
      const avgCommission = data.commission / data.orders

      // Winner: top performer + not falling
      if (isTop && !isFalling && data.commission / total >= 0.10) {
        insights.push({
          type: 'winner',
          entity,
          entityId: id,
          entityLabel: data.label,
          confidence: Math.min(0.95, 0.6 + (data.orders / 20)),
          reason: `Top ${entity} por comissão (R$${data.commission.toFixed(2)}) com ${data.orders} pedidos${trend !== null ? `, tendência ${(trend * 100).toFixed(0)}%` : ''}`,
          recommendedAction: 'scale_creatives',
          metrics: { commissionTotal: data.commission, ordersTotal: data.orders, commissionPerOrder: avgCommission, commissionTrend: trend ?? undefined, period: `${period}d` },
          detectedAt: now,
        })
      }

      // Rising: significant growth, even if not top
      else if (isRising && data.orders >= t.minOrders) {
        insights.push({
          type: 'rising',
          entity,
          entityId: id,
          entityLabel: data.label,
          confidence: Math.min(0.85, 0.5 + (data.orders / 30)),
          reason: `${entity} crescendo ${(trend! * 100).toFixed(0)}% vs período anterior — R$${data.commission.toFixed(2)}`,
          recommendedAction: 'double_down',
          metrics: { commissionTotal: data.commission, ordersTotal: data.orders, commissionTrend: trend ?? undefined, period: `${period}d` },
          detectedAt: now,
        })
      }

      // Falling: significant decline
      else if (isFalling && prevData && prevData.commission >= t.minCommission) {
        insights.push({
          type: 'falling',
          entity,
          entityId: id,
          entityLabel: data.label,
          confidence: Math.min(0.85, 0.5 + (data.orders / 20)),
          reason: `${entity} caindo ${(trend! * 100).toFixed(0)}% vs período anterior — era R$${prevData.commission.toFixed(2)}, agora R$${data.commission.toFixed(2)}`,
          recommendedAction: entity === 'creative' ? 'pause_creatives' : 'investigate',
          metrics: { commissionTotal: data.commission, ordersTotal: data.orders, commissionTrend: trend ?? undefined, period: `${period}d` },
          detectedAt: now,
        })
      }
    })

    // Scale now: top by commission with high order count
    const topItem = sorted[0]
    if (topItem && topItem[1].orders >= t.minOrders * 2 && topItem[1].commission >= t.minCommission * 3) {
      const existing = insights.find(i => i.entityId === topItem[0] && i.entity === entity)
      if (!existing) {
        insights.push({
          type: 'scale_now',
          entity,
          entityId: topItem[0],
          entityLabel: topItem[1].label,
          confidence: 0.82,
          reason: `${entity} com performance consistente — ${topItem[1].orders} pedidos, R$${topItem[1].commission.toFixed(2)} comissão`,
          recommendedAction: 'scale_creatives',
          metrics: { commissionTotal: topItem[1].commission, ordersTotal: topItem[1].orders, period: `${period}d` },
          detectedAt: now,
        })
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalCommission = curr.filter(r => r.status !== 'cancelled' && r.status !== 'invalid').reduce((s, r) => s + Number(r.commission_value ?? 0), 0)
  const totalOrders = curr.filter(r => r.status !== 'cancelled' && r.status !== 'invalid').length

  return {
    generatedAt: now,
    period: `${period}d`,
    insights,
    summary: {
      totalCommission,
      totalOrders,
      winnersCount: insights.filter(i => i.type === 'winner').length,
      losersCount: insights.filter(i => i.type === 'falling' || i.type === 'pause_now').length,
      risingCount: insights.filter(i => i.type === 'rising').length,
    },
  }
}
