/**
 * Winner Detector — identifies winner entities and fires winner_detected events.
 * Not defined by views alone: uses commission, orders, conversion, consistency, volume.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GrowthInsight } from './types'

export interface WinnerDetectionResult {
  winners: GrowthInsight[]
  notified: number
}

/**
 * Takes insights from the growth analyst, filters winners, and:
 * 1. Inserts `winner_detected` notifications into the DB
 * 2. Returns the winners list
 */
export async function detectAndNotifyWinners(
  supabase: SupabaseClient,
  insights: GrowthInsight[],
  options?: { minConfidence?: number }
): Promise<WinnerDetectionResult> {
  const minConf = options?.minConfidence ?? 0.65

  const winners = insights.filter(
    i => (i.type === 'winner' || i.type === 'scale_now') && i.confidence >= minConf
  )

  if (winners.length === 0) return { winners: [], notified: 0 }

  let notified = 0

  for (const w of winners) {
    // Check if we already notified about this winner recently (avoid spam)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('event', 'winner_detected')
      .contains('data', { entityId: w.entityId })
      .gte('created_at', since)
      .limit(1)

    if (existing && existing.length > 0) continue  // already notified today

    const { error } = await supabase.from('notifications').insert({
      event: 'winner_detected',
      title: `🏆 Winner detectado: ${w.entityLabel}`,
      body: w.reason,
      data: {
        entityId: w.entityId,
        entity: w.entity,
        confidence: w.confidence,
        recommendedAction: w.recommendedAction,
        metrics: w.metrics,
      },
    })

    if (!error) notified++
  }

  return { winners, notified }
}
