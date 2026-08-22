import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const admin = createAdmin()
  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unread') === '1'

  const query = admin.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
  if (unreadOnly) query.eq('read', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data ?? [] })
}

export async function POST(req: NextRequest) {
  const admin = createAdmin()
  const body = await req.json() as { event: string; title: string; body?: string; data?: Record<string, unknown> }
  const { data, error } = await admin.from('notifications').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notification: data })
}

export async function PATCH(req: NextRequest) {
  const admin = createAdmin()
  const { id, readAll } = await req.json() as { id?: string; readAll?: boolean }
  if (readAll) {
    await admin.from('notifications').update({ read: true }).eq('read', false)
    return NextResponse.json({ ok: true })
  }
  if (id) {
    await admin.from('notifications').update({ read: true }).eq('id', id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'id or readAll required' }, { status: 400 })
}
