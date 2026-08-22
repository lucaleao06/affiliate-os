/**
 * POST /api/sales/import — Upload Shopee affiliate CSV/XLSX and import to sales table.
 * GET  /api/sales/import — List import batches.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/server'
import { parseShopeeCSV, mapShopeeStatus } from '@/lib/marketplace/shopee-importer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdmin()
  const { data, error } = await admin
    .from('import_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ batches: data ?? [] })
}

export async function POST(req: NextRequest) {
  const admin = createAdmin()
  const url = new URL(req.url)
  const previewOnly = url.searchParams.get('preview') === '1'

  let csvText = ''
  let filename = 'upload.csv'

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    filename = file.name
    // Reject XLSX/XLS — no xlsx library installed; file.text() returns binary garbage
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'xlsx' || ext === 'xls') {
      return NextResponse.json({
        error: 'Formato XLSX não suportado ainda. Exporte o relatório como CSV no Portal Shopee Affiliate e faça upload do arquivo .csv.',
      }, { status: 415 })
    }
    csvText = await file.text()
  } else {
    // JSON with raw csvText (for preview from paste)
    const body = await req.json() as { csvText: string; filename?: string }
    csvText = body.csvText ?? ''
    filename = body.filename ?? 'paste.csv'
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'CSV vazio' }, { status: 400 })
  }

  const preview = parseShopeeCSV(csvText)

  if (previewOnly) {
    return NextResponse.json({
      preview: {
        columns: preview.columns,
        totalRows: preview.totalRows,
        totalCommission: preview.totalCommission,
        sample: preview.rows.slice(0, 5),
        warnings: preview.warnings,
      }
    })
  }

  // Create import batch
  const { data: batch, error: batchErr } = await admin
    .from('import_batches')
    .insert({ source: 'shopee_csv', filename, row_count: preview.totalRows, status: 'processing' })
    .select()
    .single()
  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 })

  let imported = 0
  let skipped = 0
  const errorLog: string[] = []

  for (const row of preview.rows) {
    if (!row.order_id) {
      skipped++
      continue
    }

    const saleData = {
      order_id: row.order_id,
      platform: 'shopee',
      gross_value: row.gross_value ?? 0,
      commission_value: row.commission_value ?? 0,
      commission_rate: row.commission_rate ?? null,
      status: mapShopeeStatus(row.status),
      occurred_at: row.occurred_at ? new Date(row.occurred_at).toISOString() : null,
      payout_date: row.payout_date ?? null,
      import_source: 'csv_upload',
      import_batch_id: batch.id,
      raw_data: row.raw,
    }

    const { error: insertErr } = await admin.from('sales').insert(saleData)
    if (insertErr) {
      if (insertErr.code === '23505') {
        // Unique violation — dedup by order_id + platform
        skipped++
      } else {
        errorLog.push(`Row ${row.order_id}: ${insertErr.message}`)
      }
    } else {
      imported++
    }
  }

  const status = errorLog.length > 0 && imported === 0 ? 'failed' : 'completed'

  await admin.from('import_batches').update({
    imported,
    skipped,
    errors: errorLog.length,
    error_log: errorLog.length > 0 ? errorLog : null,
    status,
    completed_at: new Date().toISOString(),
  }).eq('id', batch.id)

  // Notify
  await admin.from('notifications').insert({
    event: status === 'completed' ? 'import_completed' : 'import_failed',
    title: status === 'completed' ? '📊 Importação concluída' : '❌ Importação com erros',
    body: `${imported} importados, ${skipped} ignorados, ${errorLog.length} erros`,
    data: { batchId: batch.id, filename },
  })

  return NextResponse.json({
    batchId: batch.id,
    filename,
    totalRows: preview.totalRows,
    imported,
    skipped,
    errors: errorLog.length,
    status,
    warnings: preview.warnings,
  })
}
