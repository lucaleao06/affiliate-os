/**
 * Shopee Affiliate CSV Importer
 *
 * Shopee Affiliate Portal (affiliate.shopee.com.br) allows export of:
 *   - Order/commission reports as CSV/XLSX
 * There is no public API for affiliate commission data.
 *
 * This module parses the Shopee affiliate CSV export and imports into `sales` table.
 * Known column variants (PT-BR Shopee portal):
 *   Data do pedido / Order Date
 *   ID do pedido / Order ID
 *   Nome do produto / Product Name
 *   Preço do produto / Product Price
 *   Quantidade / Quantity
 *   Receita / Revenue / Gross Value
 *   Taxa de comissão / Commission Rate
 *   Comissão / Commission
 *   Status do pedido / Order Status
 *   Data de pagamento / Payout Date
 */

export interface ShopeeCSVRow {
  order_id?: string
  occurred_at?: string
  product_name?: string
  gross_value?: number
  commission_rate?: number
  commission_value?: number
  status?: string
  payout_date?: string
  raw: Record<string, string>
}

export interface ImportPreview {
  rows: ShopeeCSVRow[]
  totalRows: number
  totalCommission: number
  columns: string[]
  warnings: string[]
}

/** Column name normalization map — handles PT-BR and EN variants */
const COLUMN_MAP: Record<string, keyof ShopeeCSVRow> = {
  // Order ID
  'id do pedido': 'order_id', 'order id': 'order_id', 'id pedido': 'order_id', 'order_id': 'order_id',
  // Date
  'data do pedido': 'occurred_at', 'order date': 'occurred_at', 'data': 'occurred_at',
  // Gross value
  'receita': 'gross_value', 'revenue': 'gross_value', 'preço do produto': 'gross_value',
  'gross value': 'gross_value', 'valor': 'gross_value',
  // Commission rate
  'taxa de comissão': 'commission_rate', 'commission rate': 'commission_rate', 'taxa': 'commission_rate',
  // Commission
  'comissão': 'commission_value', 'commission': 'commission_value', 'valor de comissão': 'commission_value',
  // Status
  'status do pedido': 'status', 'order status': 'status', 'status': 'status',
  // Payout date
  'data de pagamento': 'payout_date', 'payout date': 'payout_date',
  // Product name
  'nome do produto': 'product_name', 'product name': 'product_name', 'produto': 'product_name',
}

function normalizeKey(col: string): keyof ShopeeCSVRow | null {
  const lower = col.toLowerCase().trim()
  return COLUMN_MAP[lower] ?? null
}

function parseNumber(val: string): number {
  // Handle "R$ 1.234,56" (Brazilian: dot=thousands, comma=decimal) → 1234.56
  // Handle "1234.56" (English) → 1234.56
  // Remove currency symbols and whitespace
  const stripped = val.replace(/[R$\s%]/g, '').trim()
  if (!stripped) return 0

  // If both dot and comma are present:
  // "1.234,56" → dot before comma → dot is thousands, comma is decimal
  const dotIdx = stripped.lastIndexOf('.')
  const commaIdx = stripped.lastIndexOf(',')

  if (dotIdx !== -1 && commaIdx !== -1) {
    if (dotIdx < commaIdx) {
      // Brazilian: remove dots (thousands), replace comma with dot
      return parseFloat(stripped.replace(/\./g, '').replace(',', '.')) || 0
    } else {
      // English with thousands comma: remove commas, keep dot
      return parseFloat(stripped.replace(/,/g, '')) || 0
    }
  }

  // Only comma (no dot): could be decimal comma → treat as decimal
  if (commaIdx !== -1 && dotIdx === -1) {
    return parseFloat(stripped.replace(',', '.')) || 0
  }

  // Only dot or neither: standard parseFloat
  return parseFloat(stripped) || 0
}

/** Parse CSV text into ShopeeCSVRow[]. Handles both comma and semicolon delimiters. */
export function parseShopeeCSV(csvText: string): ImportPreview {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const warnings: string[] = []

  if (lines.length < 2) {
    return { rows: [], totalRows: 0, totalCommission: 0, columns: [], warnings: ['CSV vazio ou sem linhas de dados'] }
  }

  // Detect delimiter
  const headerLine = lines[0]
  const delimiter = headerLine.includes(';') ? ';' : ','
  const columns = headerLine.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim())

  // Build mapping from column index → ShopeeCSVRow key
  const colMapping: Map<number, keyof ShopeeCSVRow> = new Map()
  columns.forEach((col, i) => {
    const mapped = normalizeKey(col)
    if (mapped) colMapping.set(i, mapped)
  })

  if (colMapping.size === 0) {
    warnings.push('Nenhuma coluna reconhecida. Verifique o formato do CSV do Shopee Affiliate.')
  }

  const rows: ShopeeCSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cells = line.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim())
    const raw: Record<string, string> = {}
    columns.forEach((col, j) => { raw[col] = cells[j] ?? '' })

    const row: ShopeeCSVRow = { raw }
    colMapping.forEach((key, colIdx) => {
      const val = cells[colIdx] ?? ''
      if (key === 'gross_value' || key === 'commission_value') {
        (row as unknown as Record<string, unknown>)[key] = parseNumber(val)
      } else if (key === 'commission_rate') {
        let rate = parseNumber(val)
        if (rate > 1) rate = rate / 100  // 8% → 0.08
        row.commission_rate = rate
      } else {
        (row as unknown as Record<string, unknown>)[key] = val || undefined
      }
    })

    rows.push(row)
  }

  const totalCommission = rows.reduce((sum, r) => sum + (r.commission_value ?? 0), 0)

  return { rows, totalRows: rows.length, totalCommission, columns, warnings }
}

/** Map ShopeeCSVRow status strings to our internal status values */
export function mapShopeeStatus(raw: string | undefined): string {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('pago') || s.includes('paid')) return 'paid'
  if (s.includes('aprovado') || s.includes('approved') || s.includes('confirmed')) return 'approved'
  if (s.includes('cancelado') || s.includes('cancelled') || s.includes('canceled')) return 'cancelled'
  if (s.includes('inválido') || s.includes('invalid')) return 'invalid'
  return 'pending'
}
