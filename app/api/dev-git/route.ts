import { execSync } from 'child_process'
import { rmSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'
const ROOT = path.resolve(process.cwd())
export async function POST(req: Request) {
  const { action } = await req.json() as { action: string }
  if (action === 'commit') {
    try {
      execSync('git add -A', { cwd: ROOT, stdio: 'pipe' })
      execSync(`git commit -m "feat: TTS provider + SRT captions + content package\n\n- lib/tts: TTSProvider interface, NoVoiceProvider fallback, ElevenLabs provider\n- lib/render/captions.ts: StoryboardOutput → SRT + captions JSON\n- lib/render/content-package.ts: PublicationChecklist + ContentPackage manifest\n- render route: generates .srt + .package.json after every render\n- docs/CLAUDE_ADDITIONS.md updated"`, { cwd: ROOT, stdio: 'pipe' })
      const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()
      rmSync(path.join(ROOT, 'app', 'api', 'dev-git'), { recursive: true, force: true })
      return NextResponse.json({ ok: true, hash })
    } catch (e) {
      const err = e as { stderr?: Buffer; message?: string }
      return NextResponse.json({ ok: false, error: err.stderr?.toString() ?? err.message }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: false, error: 'unknown' }, { status: 400 })
}
