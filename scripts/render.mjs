#!/usr/bin/env node
/**
 * Affiliate OS — Sandbox Render Script
 * Run in sandbox (has ffmpeg) to render a creative to MP4.
 *
 * Usage:
 *   node scripts/render.mjs <creative_id>
 *   node scripts/render.mjs --list   (list approved creatives with storyboards)
 *
 * Reads .env.local for Supabase credentials.
 * Writes output to storage/renders/
 * Updates automation_runs in Supabase.
 */
import { spawn } from 'child_process'
import { existsSync, mkdirSync, statSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load .env.local
function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
  if (!existsSync(envPath)) throw new Error('.env.local not found')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

async function supabase(method, path_, body) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path_}`
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Supabase ${method} ${path_}: ${res.status} ${await res.text()}`)
  return res.json()
}

function escapeText(t) {
  return String(t || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\u2019')
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[').replace(/\]/g, '\\]')
    .replace(/,/g, '\\,').replace(/%/g, '\\%')
    .replace(/\n/g, ' ')
    .slice(0, 80)
}

function parseDur(d) { const n = parseFloat(String(d).replace(/\D/g, '')) || 6; return n }

function findFFmpeg() {
  for (const p of ['/usr/bin/ffmpeg','/opt/homebrew/bin/ffmpeg','/usr/local/bin/ffmpeg']) {
    if (existsSync(p)) return p
  }
  throw new Error('ffmpeg not found. Install: brew install ffmpeg')
}

async function renderCreative(creativeId) {
  loadEnv()

  // Get creative
  const creatives = await supabase('GET', `creatives?id=eq.${creativeId}&select=*,campaigns(*,products(*))`)
  const creative = creatives[0]
  if (!creative) throw new Error('creative not found: ' + creativeId)

  // Get latest storyboard
  const runs = await supabase('GET', `automation_runs?type=eq.video_storyboard&order=created_at.desc&limit=20`)
  const sbRun = runs.find(r => r.input?.creativeId === creativeId)
  if (!sbRun) throw new Error('No storyboard found for creative. Run storyboard generation first via the UI.')

  const sb = sbRun.output
  const product = creative.campaigns?.products
  console.log(`\n🎬 Rendering: ${product?.title ?? creative.hook?.slice(0, 40)}`)
  console.log(`   Storyboard: ${sb.title} (${sb.scenes.length} scenes)`)

  const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
  const fontR = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  // fallback: bundled
  const bundled = path.join(ROOT, 'public/fonts/DejaVuSans-Bold.ttf')
  const FONT = existsSync(font) ? font : bundled
  const FONTR = existsSync(fontR) ? fontR.replace('Bold.ttf','ttf') : bundled.replace('Bold','')

  const W = 1080, H = 1920
  const scenes = sb.scenes
  let cursor = 0
  const ranges = scenes.map(s => { const d = parseDur(s.duration); const r = {start: cursor, end: cursor+d, scene: s}; cursor+=d; return r })
  const totalDuration = cursor

  const filters = []
  const hookR = ranges[0], ctaR = ranges[ranges.length - 1]

  filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0xFF6B35@1:t=fill:enable='between(t\\,${hookR.start}\\,${hookR.end})'`)
  if (ctaR !== hookR) filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0xFF6B35@1:t=fill:enable='between(t\\,${ctaR.start}\\,${ctaR.end})'`)
  filters.push(`drawbox=x=0:y=${H-12}:w=${W}:h=12:color=0xFF6B35@1:t=fill`)
  filters.push(`drawtext=fontfile='${FONTR}':text='affiliate os':fontsize=28:fontcolor=white@0.5:x=${W-200}:y=60`)

  // Hook
  const hookText = escapeText(creative.hook || hookR.scene.text_overlay)
  const words = hookText.split(' '), lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 22) { if (cur) lines.push(cur); cur = w }
    else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  const hookLines = lines.slice(0, 3)
  hookLines.forEach((l, i) => {
    filters.push(`drawtext=fontfile='${FONT}':text='${l}':fontsize=76:fontcolor=white:x=(w-tw)/2:y=${280 + i*100}:enable='between(t\\,${hookR.start}\\,${hookR.end})'`)
  })

  // Middle scenes
  for (let i = 1; i < ranges.length - 1; i++) {
    const {start, end, scene} = ranges[i]
    const t1 = escapeText(scene.text_overlay || scene.voiceover).slice(0, 35)
    filters.push(`drawtext=fontfile='${FONT}':text='${t1}':fontsize=56:fontcolor=white:x=(w-tw)/2:y=${H/2-60}:box=1:boxcolor=black@0.55:boxborderw=20:enable='between(t\\,${start}\\,${end})'`)
    const vis = escapeText(scene.visual).slice(0, 50)
    filters.push(`drawtext=fontfile='${FONTR}':text='${vis}':fontsize=28:fontcolor=white@0.4:x=60:y=${H-200}:enable='between(t\\,${start}\\,${end})'`)
  }

  // CTA
  const ctaText = escapeText(ctaR.scene.text_overlay || 'LINK NA BIO')
  filters.push(`drawtext=fontfile='${FONT}':text='${ctaText}':fontsize=90:fontcolor=white:x=(w-tw)/2:y=${H/2-80}:enable='between(t\\,${ctaR.start}\\,${ctaR.end})'`)
  filters.push(`drawtext=fontfile='${FONTR}':text='shopee.com.br':fontsize=44:fontcolor=white@0.85:x=(w-tw)/2:y=${H/2+60}:enable='between(t\\,${ctaR.start}\\,${ctaR.end})'`)

  // Scene dots
  ranges.forEach(({start, end}, i) => {
    const dotX = W/2 - ranges.length*12 + i*24
    filters.push(`drawbox=x=${dotX}:y=${H-80}:w=12:h=12:color=white@0.9:t=fill:enable='between(t\\,${start}\\,${end})'`)
  })

  const rendersDir = path.join(ROOT, 'storage', 'renders')
  mkdirSync(rendersDir, {recursive: true})
  const filename = `render_${creativeId.slice(0,8)}_${Date.now()}.mp4`
  const outputPath = path.join(rendersDir, filename)

  const ffmpegPath = findFFmpeg()
  const args = [
    '-y',
    '-f', 'lavfi', '-i', `color=c=0x0d0d1a:size=${W}x${H}:rate=30`,
    '-vf', filters.join(',\n'),
    '-t', String(totalDuration),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    outputPath,
  ]

  const startedAt = Date.now()
  console.log(`   Running FFmpeg (${totalDuration}s video)...`)

  await new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args)
    proc.stderr.on('data', () => {}) // suppress
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)))
  })

  const renderMs = Date.now() - startedAt
  const stat = statSync(outputPath)
  console.log(`   ✅ Done in ${(renderMs/1000).toFixed(1)}s — ${(stat.size/1024/1024).toFixed(1)}MB`)
  console.log(`   📁 ${outputPath}`)
  console.log(`   🌐 http://localhost:3000/api/video-factory/output/${filename}`)

  // Update DB
  try {
    await supabase('POST', 'automation_runs', {
      type: 'video_render',
      status: 'completed',
      duration_ms: renderMs,
      input: { creativeId, storyboardRunId: sbRun.id, engine: 'ffmpeg-sandbox' },
      output: {
        filename, outputPath,
        durationSec: totalDuration,
        width: W, height: H,
        codec: 'h264',
        fileSizeBytes: stat.size,
        downloadUrl: `/api/video-factory/output/${filename}`,
      },
    })
    console.log('   📊 Registered in automation_runs')
  } catch (e) { console.warn('   ⚠️  DB update failed:', e.message) }

  return { filename, outputPath }
}

async function listCreatives() {
  loadEnv()
  const creatives = await supabase('GET', 'creatives?status=eq.approved&select=id,hook,campaigns(products(title))')
  const runs = await supabase('GET', 'automation_runs?type=eq.video_storyboard&order=created_at.desc&limit=50')
  const sbIds = new Set(runs.map(r => r.input?.creativeId))

  console.log('\n📋 Approved creatives:\n')
  for (const c of creatives) {
    const hasSB = sbIds.has(c.id) ? '✅ storyboard' : '⬜ no storyboard'
    const title = c.campaigns?.products?.title?.slice(0, 40) || '—'
    const hook = (c.hook || '').slice(0, 50)
    console.log(`  ${hasSB}  ${c.id.slice(0,8)}  ${title}`)
    console.log(`           ${hook}`)
  }
  console.log('\nRun: node scripts/render.mjs <creative_id_prefix_or_full>')
}

// Main
const arg = process.argv[2]
if (!arg || arg === '--list') {
  listCreatives().catch(e => { console.error(e.message); process.exit(1) })
} else {
  renderCreative(arg).catch(e => { console.error('❌', e.message); process.exit(1) })
}
