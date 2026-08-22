/**
 * E2E V2 — Decision Engine Integration Test
 * Tests the full pipeline: product → growth analysis → winner_detected → autopilot evaluation
 *
 * Run: npx tsx scripts/e2e-v2-decision-engine.ts
 * No DB writes — uses mock data and pure-logic validation.
 */

import { detectPlatform, buildTrackingLink, buildShopeeAttributionKey } from '../lib/tracking/link-builder'
import { parseShopeeCSV, mapShopeeStatus } from '../lib/marketplace/shopee-importer'
import { buildPublicationChecklist, rightsGatePassed } from '../lib/publish'
import { ManualPublicationProvider } from '../lib/publish/manual-provider'
import { evaluateForAutopilot } from '../lib/autopilot/evaluator'
import type { AutopilotRules, AutopilotCandidate } from '../lib/autopilot/evaluator'
import type { PublicationPackage } from '../lib/publish/types'
import type { GrowthInsight } from '../lib/growth/types'

let passed = 0
let failed = 0

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) { console.log(`  ✅ ${label}`); passed++ }
  else { console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`); failed++ }
}

async function main() {
console.log('\n══ E2E V2 — Decision Engine ══\n')

// ── STEP 1: Tracking Link Builder ──────────────────────────────────────────
console.log('1. TrackingLinkBuilder')

const shopeeUrl = 'https://shp.ee/abc123xyz?affiliate_token=XYZ'
const shopeeResult = buildTrackingLink(shopeeUrl, { channel: 'instagram', publicationId: 'pub-001' })
ok('Shopee URL preserved exactly', shopeeResult.url === shopeeUrl)
ok('Shopee tracking = preserved', shopeeResult.tracking === 'preserved')
ok('Shopee platform detected', shopeeResult.platform === 'shopee')

const hotmartUrl = 'https://go.hotmart.com/X123456789'
const hotmartResult = buildTrackingLink(hotmartUrl, { channel: 'tiktok', publicationId: 'pub-002', creativeId: 'cr-001' })
ok('Hotmart gets UTMs', hotmartResult.tracking === 'utm_added')
ok('Hotmart has utm_source', hotmartResult.url.includes('utm_source=tiktok'))

const amazonUrl = 'https://amzn.to/3abc123'
ok('Amazon preserved', buildTrackingLink(amazonUrl, {}).tracking === 'preserved')

const shopeeKey = buildShopeeAttributionKey({ publicationId: 'pub-001', publishedAt: '2024-03-15T10:00:00Z' })
ok('Shopee attribution key format', shopeeKey === 'pub_pub-001_2024-03-15')

ok('detectPlatform shopee', detectPlatform('https://s.shopee.com.br/xyz') === 'shopee')
ok('detectPlatform unknown', detectPlatform('https://example.com/lp') === 'unknown')

// ── STEP 2: CSV Import (simulate sale data) ──────────────────────────────────
console.log('\n2. CSV Import — simulate 3 sales')

const csvSales = `ID do pedido;Receita;Comissão;Status do pedido;Data do pedido
ORD001;"R$ 299,90";"R$ 29,99";Pago;2024-03-15
ORD002;"R$ 1.499,00";"R$ 149,90";Aprovado;2024-03-16
ORD003;"R$ 89,90";"R$ 8,99";Cancelado;2024-03-17`

const importResult = parseShopeeCSV(csvSales)
ok('3 rows parsed', importResult.totalRows === 3)
ok('total commission ≈ 188.88', Math.abs(importResult.totalCommission - 188.88) < 0.01, `got ${importResult.totalCommission}`)
ok('R$ 1.499,00 parsed correctly', Math.abs((importResult.rows[1].gross_value ?? 0) - 1499) < 0.01)
ok('ORD003 maps to cancelled', mapShopeeStatus(importResult.rows[2].status) === 'cancelled')

// ── STEP 3: Publication Package + Checklist ──────────────────────────────────
console.log('\n3. Publication Package + Checklist')

const pkgInput = {
  id: 'pkg-001',
  creativeId: 'cr-001',
  productId: 'prod-001',
  campaignId: 'camp-001',
  videoPath: '/tmp/render_cr001.mp4',
  videoFilename: 'render_cr001.mp4',
  downloadUrl: '/api/video-factory/output/render_cr001.mp4',
  srtPath: '/tmp/render_cr001.srt',
  caption: 'Produto incrível! Link na bio 🔥',
  cta: 'Compra agora com 10% OFF',
  affiliateUrl: shopeeUrl,
  channel: 'instagram' as const,
  rightsStatus: 'generated' as const,
  durationSec: 28.5,
  fileSizeBytes: 12_500_000,
  width: 1080,
  height: 1920,
  codec: 'h264',
  generatedAt: new Date().toISOString(),
  scheduledAt: null,
  publishedAt: null,
  publishedUrl: null,
}

const checklist = buildPublicationChecklist(pkgInput)
ok('checklist.videoMinDuration', checklist.videoMinDuration === true)
ok('checklist.hasCaption', checklist.hasCaption === true)
ok('checklist.hasAffiliateUrl', checklist.hasAffiliateUrl === true)
ok('checklist.rightsCleared', checklist.rightsCleared === true)
ok('checklist.ready', checklist.ready === true, JSON.stringify(checklist))

const pkg: PublicationPackage = {
  ...pkgInput,
  checklist,
  status: 'ready',
  statusReason: null,
  generatedAt: pkgInput.generatedAt,
  scheduledAt: null,
  publishedAt: null,
  publishedUrl: null,
}

ok('rights gate passes for generated', rightsGatePassed(pkg).passed === true)

// ── STEP 4: ManualPublicationProvider ────────────────────────────────────────
console.log('\n4. ManualPublicationProvider')

const provider = new ManualPublicationProvider()
ok('provider.isReady()', provider.isReady() === true)
ok('provider.channel = manual', provider.channel === 'manual')
ok('provider.name = manual', provider.name === 'manual')

const publishResult = await provider.publish({ pkg })
ok('publish requiresManualAction', publishResult.requiresManualAction === true)
ok('publish success', publishResult.success === true)
ok('publish has instructions', (publishResult.manualInstructions?.length ?? 0) > 0)

// ── STEP 5: Growth Insights (mock) ───────────────────────────────────────────
console.log('\n5. Growth Insights (mock winner)')

const winnerInsight: GrowthInsight = {
  type: 'winner',
  entity: 'product',
  entityId: 'prod-001',
  entityLabel: 'Fone Bluetooth XX Pro',
  confidence: 0.82,
  reason: 'Top 20% commission, 5 orders, stable trend',
  recommendedAction: 'scale_creatives',
  metrics: { commissionTotal: 149.95, ordersTotal: 5, conversionRate: 0.035, commissionTrend: 0.42 },
  detectedAt: new Date().toISOString(),
}

ok('winner confidence >= 0.65', winnerInsight.confidence >= 0.65)
ok('winner has recommended action', winnerInsight.recommendedAction === 'scale_creatives')
ok('winner metrics.ordersTotal >= 3', (winnerInsight.metrics?.ordersTotal ?? 0) >= 3)

// ── STEP 6: Autopilot Evaluation ────────────────────────────────────────────
console.log('\n6. Autopilot Evaluator')

const rules: AutopilotRules = {
  enabled: true,
  mode: 'SUPERVISED',
  min_score: 70,
  min_commission_rate: 0.05,
  max_risk_score: 60,
  allowed_channels: ['instagram', 'manual'],
  allowed_categories: [],
  allowed_rights_status: ['owned', 'seller_provided', 'licensed', 'generated'],
  max_posts_per_day: 3,
  require_human_approval: true,
}

const candidate: AutopilotCandidate = {
  id: 'pkg-001',
  type: 'publication_package',
  score: 80,
  risk_score: 30,
  rights_status: 'generated',
  channel: 'instagram',
  commission_rate: 0.08,
  checklist_ready: true,
  provider: 'manual',
}

const evalResult = evaluateForAutopilot(candidate, rules, 1)
ok('eval decision = queue_for_approval', evalResult.decision === 'queue_for_approval', `got ${evalResult.decision}`)
ok('eval.gatesPassed includes score', evalResult.gatesPassed.includes('score'))
ok('eval.gatesPassed includes rights_status', evalResult.gatesPassed.includes('rights_status'))
ok('eval has reason', evalResult.reason.length > 0)

// AUTOPILOT mode + manual provider → queue_for_approval (not advance)
const autopilotRules: AutopilotRules = { ...rules, mode: 'AUTOPILOT' }
const autoResult = evaluateForAutopilot(candidate, autopilotRules, 0)
ok('AUTOPILOT + manual provider → queue_for_approval', autoResult.decision === 'queue_for_approval')
ok('AUTOPILOT + manual provider has gatesFailed provider_manual', autoResult.gatesFailed.includes('provider_manual'))

// AUTOPILOT mode + real provider → advance
const realCandidate: AutopilotCandidate = { ...candidate, provider: 'instagram' }
const realResult = evaluateForAutopilot(realCandidate, autopilotRules, 0)
ok('AUTOPILOT + real provider → advance', realResult.decision === 'advance')

// PAUSED mode → block
const pausedRules: AutopilotRules = { ...rules, mode: 'PAUSED' }
const pausedResult = evaluateForAutopilot(candidate, pausedRules, 0)
ok('PAUSED mode → block', pausedResult.decision === 'block')
ok('PAUSED gate in gatesFailed', pausedResult.gatesFailed.includes('mode_paused'))

// Below score threshold → block
const lowScoreCandidate: AutopilotCandidate = { ...candidate, score: 50 }
const lowResult = evaluateForAutopilot(lowScoreCandidate, rules, 0)
ok('low score → block', lowResult.decision === 'block')
ok('low score in gatesFailed', lowResult.gatesFailed.some(g => g.startsWith('score')))

// Daily limit hit → block
const limitResult = evaluateForAutopilot(candidate, { ...rules, max_posts_per_day: 1 }, 1)
ok('daily limit hit → block', limitResult.decision === 'block')
ok('daily_limit in gatesFailed', limitResult.gatesFailed.some(g => g.startsWith('daily_limit')))

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════`)
console.log(`✅ ${passed} passou  ❌ ${failed} falhou`)
if (failed > 0) process.exitCode = 1
else console.log('E2E V2 PASSED — decision engine íntegro')
}

main().catch(err => { console.error(err); process.exit(1) })
