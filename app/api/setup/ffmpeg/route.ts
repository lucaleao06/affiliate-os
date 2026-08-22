/**
 * POST /api/setup/ffmpeg
 * Downloads arm64 FFmpeg binaries from BtbN GitHub releases to bin/
 * Runs on the Mac Next.js server process — no browser interaction needed.
 * Security: only callable locally (localhost). Remove after setup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
  const binDir = path.join(process.cwd(), 'bin')
  const ffmpegBin = path.join(binDir, 'ffmpeg')
  const ffprobeBin = path.join(binDir, 'ffprobe')
  const ffExists = fs.existsSync(ffmpegBin)
  const fpExists = fs.existsSync(ffprobeBin)
  let version = ''
  let working = false
  let fileArch = ''
  let codesignResult = ''
  if (ffExists) {
    try {
      fileArch = execSync(`file "${ffmpegBin}" 2>&1`, { encoding: 'utf8' }).trim()
    } catch { /* ignore */ }
    // Remove quarantine + codesign (ad-hoc) — fixes Gatekeeper blocks on binaries from internet
    try {
      execSync(`xattr -d com.apple.quarantine "${ffmpegBin}" 2>/dev/null || true`, { stdio: 'pipe' })
      if (fpExists) execSync(`xattr -d com.apple.quarantine "${ffprobeBin}" 2>/dev/null || true`, { stdio: 'pipe' })
      execSync(`codesign -s - -f "${ffmpegBin}" 2>&1 || true`, { encoding: 'utf8', stdio: 'pipe' })
      if (fpExists) execSync(`codesign -s - -f "${ffprobeBin}" 2>&1 || true`, { encoding: 'utf8', stdio: 'pipe' })
      codesignResult = 'xattr-cleared+signed'
    } catch (e) { codesignResult = `skip:${String(e).slice(0,80)}` }
    try {
      execSync(`"${ffmpegBin}" -version`, { stdio: 'pipe', timeout: 5_000 })
      version = execSync(`"${ffmpegBin}" -version 2>&1 | head -1`, { encoding: 'utf8' }).trim()
      working = true
    } catch (e) { version = String(e).slice(0, 200) }
  }
  const nodeArch = process.arch
  const nodePlatform = process.platform
  return NextResponse.json({ ffmpegExists: ffExists, ffprobeExists: fpExists, working, version, fileArch, codesignResult, nodeArch, nodePlatform })
}

export async function POST(req: NextRequest) {
  // Local-only safety check
  const host = req.headers.get('host') ?? ''
  if (!host.startsWith('localhost') && !host.startsWith('127.')) {
    return NextResponse.json({ error: 'local only' }, { status: 403 })
  }

  try {
    const binDir = path.join(process.cwd(), 'bin')
    fs.mkdirSync(binDir, { recursive: true })

    const arch = execSync('uname -m', { encoding: 'utf8' }).trim()

    // Check if already installed and working
    const ffmpegBin = path.join(binDir, 'ffmpeg')
    const ffprobeBin = path.join(binDir, 'ffprobe')
    // Only ffmpeg is required — ffprobe-static has no arm64 macOS binary and we no longer call ffprobe in renderVideo
    const ffmpegOk = fs.existsSync(ffmpegBin) && (() => { try { execSync(`"${ffmpegBin}" -version`, { stdio: 'pipe', timeout: 10_000 }); return true } catch { return false } })()

    if (ffmpegOk) {
      const v = execSync(`"${ffmpegBin}" -version 2>&1 | head -1`, { encoding: 'utf8' }).trim()
      return NextResponse.json({ ok: true, alreadyInstalled: true, arch, version: v })
    }

    // Delete bad binary before re-download
    if (!ffmpegOk && fs.existsSync(ffmpegBin)) { try { fs.unlinkSync(ffmpegBin) } catch { /* ignore */ } }

    // Install ffmpeg-static + ffprobe-static via npm to a temp dir
    // These packages include pre-built macOS arm64 binaries
    const ts = Date.now()
    const tmpDir = path.join(os.tmpdir(), `ffstatic_${ts}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    // Write a minimal package.json so npm install works in isolation
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'ffsetup', version: '1.0.0', private: true }))

    execSync(`npm install ffmpeg-static ffprobe-static --prefix "${tmpDir}" --no-save 2>&1`, {
      timeout: 180_000,
      stdio: 'pipe',
      encoding: 'utf8',
    })

    // ffmpeg-static exports a path to the binary
    const ffmpegNpm = path.join(tmpDir, 'node_modules', 'ffmpeg-static', 'ffmpeg')
    // ffprobe-static stores binary at node_modules/ffprobe-static/bin/darwin/arm64/ffprobe or similar
    const ffprobeNpm1 = path.join(tmpDir, 'node_modules', 'ffprobe-static', 'bin', 'darwin', 'arm64', 'ffprobe')
    const ffprobeNpm2 = execSync(`find "${tmpDir}/node_modules/ffprobe-static" -name "ffprobe" -type f 2>/dev/null | head -1`, { encoding: 'utf8' }).trim()

    if (!fs.existsSync(ffmpegNpm)) throw new Error(`ffmpeg-static binary not found at ${ffmpegNpm}`)
    execSync(`cp "${ffmpegNpm}" "${binDir}/ffmpeg" && chmod +x "${binDir}/ffmpeg"`)

    const fp = fs.existsSync(ffprobeNpm1) ? ffprobeNpm1 : ffprobeNpm2
    if (fp) execSync(`cp "${fp}" "${binDir}/ffprobe" && chmod +x "${binDir}/ffprobe"`)

    // Cleanup
    try { execSync(`rm -rf "${tmpDir}"`) } catch { /* best-effort */ }

    const version = execSync(`"${ffmpegBin}" -version 2>&1 | head -1`, { encoding: 'utf8' }).trim()
    return NextResponse.json({ ok: true, arch, version })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
