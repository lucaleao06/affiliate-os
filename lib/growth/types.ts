/**
 * Growth Analyst — types.
 * Insights are structured objects, not text blobs.
 */

export type InsightType =
  | 'winner'
  | 'loser'
  | 'rising'
  | 'falling'
  | 'scale_now'
  | 'pause_now'
  | 'top_channel'
  | 'top_creative'
  | 'top_product'
  | 'low_conversion'
  | 'no_data'

export type InsightEntity = 'product' | 'creative' | 'channel' | 'campaign'

export type RecommendedAction =
  | 'scale_creatives'
  | 'pause_creatives'
  | 'test_new_hooks'
  | 'increase_budget'
  | 'reduce_budget'
  | 'investigate'
  | 'double_down'
  | 'no_action'

export interface GrowthInsight {
  type: InsightType
  entity: InsightEntity
  entityId: string
  entityLabel: string
  confidence: number          // 0–1
  reason: string
  recommendedAction: RecommendedAction
  metrics: {
    commissionTotal?: number
    ordersTotal?: number
    commissionPerOrder?: number
    commissionTrend?: number    // % change vs prior period (positive = growth)
    conversionRate?: number
    period?: string
  }
  detectedAt: string
}

export interface WinnerThresholds {
  minOrders: number           // minimum orders to qualify
  minCommission: number       // minimum total commission
  minConversionRate?: number
  topPercentile: number       // top N% by commission = winner
  fallingThreshold: number    // trend below this % = falling
  risingThreshold: number     // trend above this % = rising
}

export const DEFAULT_THRESHOLDS: WinnerThresholds = {
  minOrders: 3,
  minCommission: 10,
  topPercentile: 0.2,         // top 20%
  fallingThreshold: -0.25,    // -25% vs prior
  risingThreshold: 0.30,      // +30% vs prior
}

export interface GrowthReport {
  generatedAt: string
  period: string
  insights: GrowthInsight[]
  summary: {
    totalCommission: number
    totalOrders: number
    winnersCount: number
    losersCount: number
    risingCount: number
  }
}
