import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // Security: only allow safe filenames (no path traversal)
  if (!/^render_[a-zA-Z0-9_-]+\.mp4$/.test(filename)) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'storage', 'renders', filename)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const stat = fs.statSync(filePath)
  const fileBuffer = fs.readFileSync(filePath)

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
