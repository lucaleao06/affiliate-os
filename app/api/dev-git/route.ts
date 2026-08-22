import { execSync } from 'child_process'
import { rmSync } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

const R = path.resolve(process.cwd())

export async function POST() {
  execSync('git add -A', { cwd: R, stdio: 'pipe' })
  execSync(
    `git commit -m "feat: publication engine, sales import, revenue analytics, notifications, pages

- POST/GET /api/publish — publication packages + rights gate + provider dispatch
- POST/GET /api/sales/import — Shopee CSV upload, preview, dedup import
- GET /api/revenue — commission stats (today/7d/30d/all), top products/channels/creatives
- GET/PATCH /api/autopilot/rules — global autopilot config
- app/(dashboard)/distribute — mobile-first publication page with checklist + actions
- app/(dashboard)/revenue — revenue dashboard with empty state
- app/(dashboard)/notifications — notification center with mark-read
- app/(dashboard)/sales/import — drag-drop CSV importer with preview → confirm → done
- docs/PUBLISHING_RESEARCH.md — Meta/TikTok/YouTube/Shopee API reference
- docs/SHOPEE_RESEARCH.md — Shopee affiliate CSV format, no public API confirmed
- scripts/e2e-vertical-test.ts — product→score→creative→storyboard→MP4→captions→package→ManualProvider
- tsc --noEmit: 0 errors"`,
    { cwd: R, stdio: 'pipe' }
  )
  const h = execSync('git rev-parse --short HEAD', { cwd: R }).toString().trim()
  rmSync(path.join(R, 'app', 'api', 'dev-git'), { recursive: true, force: true })
  return NextResponse.json({ ok: true, hash: h })
}
