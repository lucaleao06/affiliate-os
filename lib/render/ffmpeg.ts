import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import type { StoryboardOutput, StoryboardScene } from '@/lib/ai'

// Check project-local bin/ first (bundled static build), then system paths
const PROJECT_BIN = path.join(process.cwd(), 'bin')

const FFMPEG_PATHS = [
  path.join(PROJECT_BIN, 'ffmpeg'),
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
  'ffmpeg',
]

const FFPROBE_PATHS = [
  path.join(PROJECT_BIN, 'ffprobe'),
  '/opt/homebrew/bin/ffprobe',
  '/usr/local/bin/ffprobe',
  '/usr/bin/ffprobe',
  'ffprobe',
]

function findBinary(names: string[]): string {
  for (const bin of names) {
    try {
      if (path.isAbsolute(bin)) {
        if (fs.existsSync(bin)) return bin
      } else {
        execSync(`which ${bin}`, { stdio: 'ignore' })
        return bin
      }
    } catch { /* not found */ }
  }
  throw new Error(
    'ffmpeg not found.\n' +
    '  Option 1: Run ~/Desktop/get_ffmpeg.command (downloads static build)\n' +
    '  Option 2: brew install ffmpeg'
  )
}

export function getFontPath(bold = true): string {
  const name = bold ? 'DejaVuSans-Bold.ttf' : 'DejaVuSans.ttf'
  const bundled = path.join(process.cwd(), 'public', 'fonts', name)
  if (fs.existsSync(bundled)) return bundled
  // Linux fallback
  const linux = `/usr/share/fonts/truetype/dejavu/${name}`
  if (fs.existsSync(linux)) return linux
  throw new Error(`Font not found: ${name}. Expected at ${bundled}`)
}

export function getRendersDir(): string {
  const dir = path.join(process.cwd(), 'storage', 'renders')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Shell-escape a single argument (single-quote wrapping) */
function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`
}

/** Escape text for FFmpeg drawtext filter */
function esc(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "’") // replace apostrophe with typographic quote (safer)
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/%/g, '\\%')
    .replace(/\n/g, ' ')
    .slice(0, 80) // hard cap — prevents overflow
}

/** Split text into at most 2 display lines at word boundary */
function splitLines(text: string, maxPerLine = 30): [string, string] {
  const clean = esc(text)
  if (clean.length <= maxPerLine) return [clean, '']
  const mid = clean.lastIndexOf(' ', maxPerLine)
  const split = mid > 0 ? mid : maxPerLine
  return [clean.slice(0, split), clean.slice(split + 1, split + 1 + maxPerLine)]
}

function parseDuration(d: string): number {
  const n = parseFloat(d.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 6 : n
}

function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    proto.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    }).on('error', reject)
  })
}

export interface RenderOptions {
  storyboard: StoryboardOutput
  outputFilename: string
  productImageUrl?: string
  hook: string
}

export interface RenderResult {
  outputPath: string
  filename: string
  durationSec: number
  width: number
  height: number
  codec: string
  fileSizeBytes: number
}

export async function renderVideo(opts: RenderOptions): Promise<RenderResult> {
  const ffmpeg = findBinary(FFMPEG_PATHS)
  // ffprobe NOT used — ffprobe-static doesn't ship arm64 macOS binaries.
  // Video spec is fixed (1080×1920, h264) so we return known values instead of probing.
  const fontBold = getFontPath(true)
  const fontReg = getFontPath(false)
  const rendersDir = getRendersDir()
  const outputPath = path.join(rendersDir, opts.outputFilename)

  // Try to download product image
  let imagePath: string | null = null
  if (opts.productImageUrl) {
    const imgDest = path.join(rendersDir, `img_${Date.now()}.jpg`)
    try {
      await downloadImage(opts.productImageUrl, imgDest)
      imagePath = imgDest
    } catch { imagePath = null }
  }

  const scenes = opts.storyboard.scenes
  const totalDuration = scenes.reduce((sum, s) => sum + parseDuration(s.duration), 0)

  // Build time ranges
  let cursor = 0
  const ranges: Array<{ start: number; end: number; scene: StoryboardScene }> = []
  for (const scene of scenes) {
    const dur = parseDuration(scene.duration)
    ranges.push({ start: cursor, end: cursor + dur, scene })
    cursor += dur
  }

  const W = 1080
  const H = 1920

  // Build filter chain
  const filters: string[] = []

  // Scene background boxes (orange for first + last, dark otherwise via base)
  // Base is dark — add orange overlays for hook scene and CTA scene
  const hookRange = ranges[0]
  const ctaRange = ranges[ranges.length - 1]
  filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0xFF6B35@1:t=fill:enable='between(t\\,${hookRange.start}\\,${hookRange.end})'`)
  if (ctaRange !== hookRange) {
    filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=0xFF6B35@1:t=fill:enable='between(t\\,${ctaRange.start}\\,${ctaRange.end})'`)
  }

  // Orange accent bar at bottom (always visible)
  filters.push(`drawbox=x=0:y=${H - 12}:w=${W}:h=12:color=0xFF6B35@1:t=fill`)

  // Brand text top-right (always)
  filters.push(`drawtext=fontfile='${fontReg}':text='affiliate os':fontsize=28:fontcolor=white@0.5:x=${W - 200}:y=60`)

  // Hook text (scene 1 — big, white)
  const [h1, h2] = splitLines(opts.hook || hookRange.scene.text_overlay, 24)
  filters.push(`drawtext=fontfile='${fontBold}':text='${h1}':fontsize=76:fontcolor=white:x=(w-tw)/2:y=280:enable='between(t\\,${hookRange.start}\\,${hookRange.end})'`)
  if (h2) {
    filters.push(`drawtext=fontfile='${fontBold}':text='${h2}':fontsize=76:fontcolor=white:x=(w-tw)/2:y=380:enable='between(t\\,${hookRange.start}\\,${hookRange.end})'`)
  }

  // Middle scenes (2 to N-1)
  for (let i = 1; i < ranges.length - 1; i++) {
    const { start, end, scene } = ranges[i]
    const overlay = scene.text_overlay || scene.voiceover
    const [l1, l2] = splitLines(overlay, 32)
    const yBase = H / 2 - 60
    filters.push(`drawtext=fontfile='${fontBold}':text='${l1}':fontsize=54:fontcolor=white:x=(w-tw)/2:y=${yBase}:box=1:boxcolor=black@0.55:boxborderw=18:enable='between(t\\,${start}\\,${end})'`)
    if (l2) {
      filters.push(`drawtext=fontfile='${fontReg}':text='${l2}':fontsize=50:fontcolor=white@0.9:x=(w-tw)/2:y=${yBase + 80}:box=1:boxcolor=black@0.45:boxborderw=14:enable='between(t\\,${start}\\,${end})'`)
    }
    // Scene visual hint (small, bottom area)
    const visual = esc(scene.visual).slice(0, 50)
    filters.push(`drawtext=fontfile='${fontReg}':text='${visual}':fontsize=30:fontcolor=white@0.45:x=60:y=${H - 200}:enable='between(t\\,${start}\\,${end})'`)
  }

  // CTA scene (last — big yellow on orange)
  const ctaText = esc(ctaRange.scene.text_overlay || 'LINK NA BIO')
  filters.push(`drawtext=fontfile='${fontBold}':text='${ctaText}':fontsize=90:fontcolor=white:x=(w-tw)/2:y=${H / 2 - 80}:enable='between(t\\,${ctaRange.start}\\,${ctaRange.end})'`)
  filters.push(`drawtext=fontfile='${fontReg}':text='shopee.com.br':fontsize=44:fontcolor=white@0.8:x=(w-tw)/2:y=${H / 2 + 60}:enable='between(t\\,${ctaRange.start}\\,${ctaRange.end})'`)

  // Scene counter dots (bottom center)
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i]
    const dotX = W / 2 - (ranges.length * 24) / 2 + i * 24
    filters.push(`drawbox=x=${dotX}:y=${H - 80}:w=12:h=12:color=white@0.9:t=fill:enable='between(t\\,${start}\\,${end})'`)
  }

  const vfString = filters.join(',\n')

  // Build input: image (zoompan) or solid color background
  const ffmpegArgs: string[] = ['-y']

  if (imagePath) {
    ffmpegArgs.push('-loop', '1', '-i', imagePath)
    // Scale/crop image + darken for text legibility, then text overlays
    const imgFilter = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},eq=brightness=-0.25:saturation=0.5`
    ffmpegArgs.push(
      '-vf', `${imgFilter},${vfString}`,
      '-t', String(totalDuration),
    )
  } else {
    ffmpegArgs.push(
      '-f', 'lavfi',
      '-i', `color=c=0x0d0d1a:size=${W}x${H}:rate=30`,
      '-vf', vfString,
      '-t', String(totalDuration),
    )
  }

  ffmpegArgs.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  )

  // Run ffmpeg via execSync (shell-mediated) — avoids macOS EBADARCH on direct spawn
  // when binary is downloaded from npm on Apple Silicon
  try {
    const args = ffmpegArgs.map(a => shellEscape(String(a))).join(' ')
    execSync(`${shellEscape(ffmpeg)} ${args}`, { stdio: 'pipe', timeout: 300_000 })
  } catch (err: unknown) {
    const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string }
    const tail = (e.stderr ?? e.stdout ?? Buffer.alloc(0)).toString().split('\n').slice(-4).join('\n')
    throw new Error(`ffmpeg failed: ${tail || String(err)}`)
  }

  // Cleanup temp image
  if (imagePath) { try { fs.unlinkSync(imagePath) } catch { /* ignore */ } }

  // Validate MP4 — try real ffprobe first (arm64 if available), fallback to ftyp box check.
  const stat = fs.statSync(outputPath)
  if (stat.size < 8) throw new Error('ffmpeg produced an empty output file')

  let probedDuration: number | null = null
  let probedWidth: number | null = null
  let probedHeight: number | null = null
  let probedCodec: string | null = null
  let ffprobeUsed = false

  // Try real ffprobe from bin/ (arm64 from evermeet.cx if setup was run after the fix)
  const ffprobeCandidate = findBinary(FFPROBE_PATHS)
  try {
    const probeOut = execSync(
      `${shellEscape(ffprobeCandidate)} -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of json ${shellEscape(outputPath)}`,
      { stdio: 'pipe', timeout: 10_000, encoding: 'utf8' }
    )
    const probeJson = JSON.parse(probeOut) as { streams?: { codec_name?: string; width?: number; height?: number; duration?: string }[] }
    const stream = probeJson.streams?.[0]
    if (stream) {
      probedCodec = stream.codec_name ?? null
      probedWidth = stream.width ?? null
      probedHeight = stream.height ?? null
      probedDuration = stream.duration ? parseFloat(stream.duration) : null
      ffprobeUsed = true
    }
  } catch {
    // ffprobe not available or failed — use ftyp fallback
    const header = Buffer.alloc(8)
    const fd = fs.openSync(outputPath, 'r')
    try { fs.readSync(fd, header, 0, 8, 0) } finally { fs.closeSync(fd) }
    const boxType = header.slice(4, 8).toString('ascii')
    if (boxType !== 'ftyp') throw new Error(`Output is not a valid MP4 container (got box type: "${boxType}")`)
    // Spec is enforced by ffmpegArgs above — safe to use fixed values
    probedWidth = W; probedHeight = H; probedCodec = 'h264'
  }

  if (!ffprobeUsed) {
    // ftyp path: log as debt so we know which renders didn't get real probing
    console.info('[renderVideo] ffprobe unavailable — using ftyp validation + fixed spec (debt: arm64 ffprobe)')
  }

  return {
    outputPath,
    filename: opts.outputFilename,
    durationSec: probedDuration ?? totalDuration,
    width: probedWidth ?? W,
    height: probedHeight ?? H,
    codec: probedCodec ?? 'h264',
    fileSizeBytes: stat.size,
  }
}
