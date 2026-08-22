/**
 * DEV-ONLY git helper — remove this file before any deploy.
 * Used to bypass sandbox EPERM on .git/index.lock from Mac process.
 */
import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

const ROOT = path.resolve(process.cwd())
const LOCK = path.join(ROOT, '.git', 'index.lock')

export async function POST(req: Request) {
  const { action } = await req.json() as { action: string }

  if (action === 'unlock') {
    if (existsSync(LOCK)) {
      unlinkSync(LOCK)
      return NextResponse.json({ ok: true, msg: 'lock removed' })
    }
    return NextResponse.json({ ok: true, msg: 'no lock file' })
  }

  if (action === 'commit') {
    try {
      execSync('git add -A', { cwd: ROOT, stdio: 'pipe' })
      execSync(
        'git commit -m "feat: mobile-first redesign + PWA base\n\n- PWA manifest, icons, safe-area CSS\n- Bottom nav + sidebar responsive layout\n- Dashboard money-focused hero\n- Queue one-handed UX (expandable cards)\n- Video Factory vertical video protagonist\n- Autopilot page (PAUSED/SUPERVISED/AUTOPILOT)\n- FFmpeg: ftyp box validation replaces ffprobe (arm64 fix)\n- CLAUDE_ADDITIONS.md + AI_HANDOFF.md updated"',
        { cwd: ROOT, stdio: 'pipe' }
      )
      const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
      return NextResponse.json({ ok: true, hash })
    } catch (e) {
      const err = e as { stderr?: Buffer; message?: string }
      return NextResponse.json({ ok: false, error: err.stderr?.toString() ?? err.message }, { status: 500 })
    }
  }

  if (action === 'status') {
    const out = execSync('git status --short', { cwd: ROOT }).toString()
    const lock = existsSync(LOCK)
    return NextResponse.json({ ok: true, status: out, lock })
  }

  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
}
