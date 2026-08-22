import { execSync } from 'child_process'
import { rmSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'
const R = path.resolve(process.cwd())
export async function POST() {
  execSync('git add -A', { cwd: R, stdio: 'pipe' })
  execSync('git commit -m "chore: remove temp dev-git route"', { cwd: R, stdio: 'pipe' })
  const h = execSync('git rev-parse --short HEAD', { cwd: R }).toString().trim()
  rmSync(path.join(R, 'app', 'api', 'dev-git'), { recursive: true, force: true })
  return NextResponse.json({ ok: true, hash: h })
}
