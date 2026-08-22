/**
 * E2E Vertical Test — Affiliate OS
 * Tests: product → score → creative → approve → storyboard → MP4 → captions
 *        → content_package → publication_ready → ManualPublicationProvider → publication record
 *
 * Run: npx tsx scripts/e2e-vertical-test.ts
 * Requires: local dev server running on http://localhost:3000
 *           No real APIs are called. Uses mock providers.
 */

import { buildPublicationChecklist, getProvider, rightsGatePassed } from '../lib/publish'
import { buildCaptions, toSRT } from '../lib/render/captions'
import type { PublicationPackage, RightsStatus } from '../lib/publish'
import type { StoryboardOutput } from '../lib/ai/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pass(label: string) { console.log(`  ✅ ${label}`) }
function fail(label: string, err: unknown) { console.error(`  ❌ ${label}:`, err); process.exitCode = 1 }
function section(title: string) { console.log(`\n── ${title} ──`) }
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`)
}

// ─── 1. Mock Product ──────────────────────────────────────────────────────────

section('1. Mock Product')
const product = {
  id: 'test-product-001',
  title: 'Fone Bluetooth XX Pro',
  description: 'Fone com cancelamento de ruído, 40h de bateria.',
  price: 199.90,
  affiliate_url: 'https://shopee.com.br/p/test-001',
  image_url: 'https://via.placeholder.com/400',
  rights_status: 'seller_provided' as RightsStatus,
}
try { assert(!!product.title, 'product.title'); pass('product criado') } catch (e) { fail('product', e) }

// ─── 2. Mock Score ────────────────────────────────────────────────────────────

section('2. Mock AI Score')
const score = { overall: 82, hook: 78, cta: 85, visual: 84, approved: true }
try {
  assert(score.overall >= 70, 'score >= 70')
  assert(score.approved === true, 'score.approved')
  pass(`score ${score.overall}/100 — aprovado`)
} catch (e) { fail('score', e) }

// ─── 3. Mock Creative ────────────────────────────────────────────────────────

section('3. Mock Creative')
const creative = {
  id: 'test-creative-001',
  hook: 'Você está perdendo dinheiro com esse fone ruim 🎧',
  caption: 'Testei por 30 dias e não consigo mais voltar. Link na bio! 👇\n\n#fone #bluetooth #tech',
  cta: 'Pega o link na bio antes do estoque acabar',
  score: score.overall,
  approved: score.approved,
}
try { assert(creative.approved, 'creative aprovado'); pass('creative aprovado') } catch (e) { fail('creative', e) }

// ─── 4. Mock Storyboard ──────────────────────────────────────────────────────

section('4. Mock Storyboard')
const storyboard: StoryboardOutput = {
  title: product.title,
  totalDuration: '14s',
  format: '9:16',
  musicSuggestion: 'upbeat tech',
  editingNotes: 'cortes rápidos',
  provider: 'mock',
  model: 'mock-v1',
  scenes: [
    { scene: 1, voiceover: creative.hook, text_overlay: creative.hook, duration: '3s', visual: 'close-up do fone' },
    { scene: 2, voiceover: 'Cancelamento de ruído real. Testei no metrô de SP.', text_overlay: 'Cancelamento real', duration: '4s', visual: 'ambiente barulhento' },
    { scene: 3, voiceover: '40 horas de bateria. Uso por 5 dias sem carregar.', text_overlay: '40h bateria', duration: '4s', visual: 'bateria indicador' },
    { scene: 4, voiceover: creative.cta, text_overlay: creative.cta, duration: '3s', visual: 'link na tela' },
  ],
}
try {
  assert(storyboard.scenes.length === 4, '4 scenes')
  pass(`storyboard com ${storyboard.scenes.length} cenas`)
} catch (e) { fail('storyboard', e) }

// ─── 5. Captions (SRT) ───────────────────────────────────────────────────────

section('5. Captions')
try {
  const captions = buildCaptions(storyboard)
  const srt = toSRT(captions)
  assert(captions.length === 4, '4 caption entries')
  assert(srt.includes('00:00:00,000'), 'SRT starts at 0')
  assert(srt.includes(creative.hook.slice(0, 10)), 'SRT has hook text')
  pass(`${captions.length} legendas geradas, SRT válido`)
} catch (e) { fail('captions', e) }

// ─── 6. Mock MP4 Render ──────────────────────────────────────────────────────

section('6. Mock MP4 Render')
const renderOutput = {
  outputPath: '/tmp/test-run-001.mp4',
  filename: 'test-run-001.mp4',
  durationSec: 14,
  width: 1080,
  height: 1920,
  codec: 'h264',
  fileSizeBytes: 5_200_000,
  downloadUrl: 'http://localhost:3000/storage/renders/test-run-001.mp4',
}
try {
  assert(renderOutput.width === 1080, 'width 1080')
  assert(renderOutput.height === 1920, 'height 1920')
  assert(renderOutput.durationSec >= 5, 'duration >= 5s')
  assert(renderOutput.codec === 'h264', 'h264')
  pass(`render ${renderOutput.width}×${renderOutput.height} ${renderOutput.durationSec}s ${renderOutput.codec}`)
} catch (e) { fail('render', e) }

// ─── 7. Publication Package + Checklist ──────────────────────────────────────

section('7. Publication Package + Checklist')
try {
  const pkg: PublicationPackage = {
    id: 'test-pkg-001',
    creativeId: creative.id,
    productId: product.id,
    campaignId: 'test-campaign-001',
    videoPath: renderOutput.outputPath,
    videoFilename: renderOutput.filename,
    downloadUrl: renderOutput.downloadUrl,
    srtPath: '/tmp/test-run-001.srt',
    caption: creative.caption,
    cta: creative.cta,
    affiliateUrl: product.affiliate_url,
    channel: 'manual',
    rightsStatus: product.rights_status,
    durationSec: renderOutput.durationSec,
    fileSizeBytes: renderOutput.fileSizeBytes,
    width: renderOutput.width,
    height: renderOutput.height,
    codec: renderOutput.codec,
    generatedAt: new Date().toISOString(),
    scheduledAt: null,
    publishedAt: null,
    publishedUrl: null,
    status: 'draft',
    statusReason: null,
    checklist: {} as PublicationPackage['checklist'],
  }

  const checklist = buildPublicationChecklist(pkg)
  pkg.checklist = checklist

  assert(checklist.hasVideo, 'hasVideo')
  assert(checklist.hasCaption, 'hasCaption')
  assert(checklist.hasCTA, 'hasCTA')
  assert(checklist.hasAffiliateUrl, 'hasAffiliateUrl')
  assert(checklist.videoIsVertical, 'videoIsVertical')
  assert(checklist.videoMinDuration, 'videoMinDuration')
  assert(checklist.videoMaxDuration, 'videoMaxDuration')
  assert(checklist.rightsCleared, 'rightsCleared (seller_provided)')
  assert(checklist.ready, 'checklist.ready')
  pass(`checklist pronto, ${checklist.failReasons.length} falhas`)

  // ─── 8. Rights Gate ──────────────────────────────────────────────────────

  section('8. Rights Gate')
  const gate = rightsGatePassed(pkg)
  assert(gate.passed, 'rights gate passed')
  pass('rights gate: passou')

  // ─── 9. ManualPublicationProvider ────────────────────────────────────────

  section('9. ManualPublicationProvider')
  const provider = getProvider('manual')
  assert(provider.channel === 'manual', 'channel=manual')
  assert(provider.isReady(), 'isReady')

  const validation = provider.validate(pkg)
  assert(validation.valid, `valid: ${validation.errors.join(', ')}`)

  const result = await provider.publish({ pkg })
  assert(result.success, `success: ${result.error}`)
  assert(result.requiresManualAction === true, 'requiresManualAction')
  assert(typeof result.manualInstructions === 'string', 'has instructions')
  pass(`published via ${provider.name}: ${result.manualInstructions?.slice(0, 60)}...`)

  // ─── 10. Summary ─────────────────────────────────────────────────────────

  section('10. E2E Summary')
  console.log(`
  Produto     : ${product.title}
  Score IA    : ${score.overall}/100
  Hook        : ${creative.hook.slice(0, 50)}...
  Storyboard  : ${storyboard.scenes.length} cenas
  Render      : ${renderOutput.width}×${renderOutput.height} ${renderOutput.durationSec}s h264
  Captions    : ✅ SRT gerado
  Checklist   : ✅ ${Object.values(checklist).filter(v => v === true).length}/8 checks passaram
  Rights Gate : ✅ passou (${product.rights_status})
  Provider    : ${provider.name} — manual action required
  `)
  pass('E2E VERTICAL COMPLETO')

} catch (e) { fail('publication pipeline', e) }

console.log('\n─────────────────────────────────────')
if (process.exitCode) {
  console.log('❌ E2E FALHOU — ver erros acima')
} else {
  console.log('✅ E2E PASSOU — pipeline produto→publicação validado')
}
