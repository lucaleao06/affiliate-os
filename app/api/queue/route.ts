import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdmin()
    const { data, error } = await admin
      .from('creatives')
      .select(`
        *,
        campaigns (
          id, name,
          products (id, title, image_url, price, commission_rate, product_type, margin_pct)
        )
      `)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ creatives: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; status: 'approved' | 'rejected' }
    if (!body.id || !['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'id and status (approved|rejected) required' }, { status: 400 })
    }

    const admin = createAdmin()
    const { data, error } = await admin
      .from('creatives')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ creative: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
