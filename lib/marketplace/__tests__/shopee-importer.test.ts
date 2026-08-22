/**
 * QA fixtures for Shopee CSV importer.
 * Run: npx tsx lib/marketplace/__tests__/shopee-importer.test.ts
 */
import { parseShopeeCSV, mapShopeeStatus } from '../shopee-importer'

let passed = 0
let failed = 0

function ok(label: string, condition: boolean, detail?: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++ }
  else { console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`); failed++ }
}

console.log('\n── Shopee CSV Importer QA ──\n')

// ── Fixture 1: PT-BR padrão com semicolon ────────────────────────────────────
console.log('1. PT-BR padrão (semicolons)')
const csv1 = `Data do pedido;ID do pedido;Nome do produto;Receita;Taxa de comissão;Comissão;Status do pedido
2024-01-15;12345678901;Fone Bluetooth XX Pro;"R$ 199,90";8%;R$ 15,99;Aprovado
2024-01-16;12345678902;Carregador USB-C 65W;"R$ 49,90";10%;R$ 4,99;Pago`

const r1 = parseShopeeCSV(csv1)
ok('totalRows = 2', r1.totalRows === 2)
ok('colunas detectadas', r1.columns.length >= 6)
ok('order_id row 0', r1.rows[0].order_id === '12345678901')
ok('product_name row 0', r1.rows[0].product_name?.includes('Fone') === true)
ok('commission_value row 0 ≈ 15.99', Math.abs((r1.rows[0].commission_value ?? 0) - 15.99) < 0.01, `got ${r1.rows[0].commission_value}`)
ok('status row 1 = approved', r1.rows[1].status === 'Pago')
ok('totalCommission ≈ 20.98', Math.abs(r1.totalCommission - 20.98) < 0.01, `got ${r1.totalCommission}`)
ok('sem warnings', r1.warnings.length === 0)

// ── Fixture 2: valor sem R$ (decimal ponto inglês) ────────────────────────────
console.log('\n2. Valores com ponto inglês (1234.56)')
const csv2 = `Order ID,Order Date,Product Name,Revenue,Commission Rate,Commission,Order Status
98765432101,2024-02-01,Mouse Gamer RGB,89.90,0.08,7.19,Confirmed
98765432102,2024-02-02,Teclado Mecânico,349.90,0.12,41.99,Paid`

const r2 = parseShopeeCSV(csv2)
ok('delimiter vírgula detectado', r2.columns[0] === 'Order ID')
ok('totalRows = 2', r2.totalRows === 2)
ok('commission_value row 0 ≈ 7.19', Math.abs((r2.rows[0].commission_value ?? 0) - 7.19) < 0.01)
ok('commission_rate row 0 = 0.08', Math.abs((r2.rows[0].commission_rate ?? 0) - 0.08) < 0.001)

// ── Fixture 3: comissão vazia ─────────────────────────────────────────────────
console.log('\n3. Comissão vazia')
const csv3 = `ID do pedido;Comissão;Status do pedido
111;  ;Pendente
222;;Cancelado`

const r3 = parseShopeeCSV(csv3)
ok('commission_value 0 quando vazio', (r3.rows[0].commission_value ?? 0) === 0)
ok('commission_value 0 quando vazio (2)', (r3.rows[1].commission_value ?? 0) === 0)

// ── Fixture 4: linha duplicada (mesmo order_id) ───────────────────────────────
console.log('\n4. Linha duplicada')
const csv4 = `ID do pedido;Comissão
DUP001;10.00
DUP001;10.00
DUP002;5.00`

const r4 = parseShopeeCSV(csv4)
ok('3 rows parseadas (dedup é no DB)', r4.totalRows === 3)
ok('order_id DUP001 aparecem 2x', r4.rows.filter(r => r.order_id === 'DUP001').length === 2)

// ── Fixture 5: venda cancelada ────────────────────────────────────────────────
console.log('\n5. Status cancelado')
ok('cancelled PT', mapShopeeStatus('Cancelado') === 'cancelled')
ok('cancelled EN', mapShopeeStatus('Cancelled') === 'cancelled')
ok('cancelled EN 2', mapShopeeStatus('canceled') === 'cancelled')
ok('invalid PT', mapShopeeStatus('Inválido') === 'invalid')
ok('paid PT', mapShopeeStatus('Pago') === 'paid')
ok('approved EN', mapShopeeStatus('Approved') === 'approved')
ok('confirmed EN', mapShopeeStatus('confirmed') === 'approved')
ok('unknown → pending', mapShopeeStatus('Em análise') === 'pending')
ok('empty → pending', mapShopeeStatus(undefined) === 'pending')

// ── Fixture 6: produto não encontrado (sem nome) ──────────────────────────────
console.log('\n6. Produto sem nome')
const csv6 = `ID do pedido;Comissão
999;5.00`

const r6 = parseShopeeCSV(csv6)
ok('product_name undefined quando não há coluna', r6.rows[0].product_name === undefined)
ok('order_id presente', r6.rows[0].order_id === '999')

// ── Fixture 7: cabeçalho inesperado / coluna extra ───────────────────────────
console.log('\n7. Cabeçalho inesperado + coluna extra')
const csv7 = `ID do pedido;Comissão;Coluna Desconhecida;Outra Coluna
AAA001;12.50;valor_ignorado;outro_ignorado`

const r7 = parseShopeeCSV(csv7)
ok('order_id parseado mesmo com colunas extras', r7.rows[0].order_id === 'AAA001')
ok('commission parseada', (r7.rows[0].commission_value ?? 0) === 12.5)
ok('colunas extras no raw', 'Coluna Desconhecida' in r7.rows[0].raw)

// ── Fixture 8: cabeçalho totalmente desconhecido ─────────────────────────────
console.log('\n8. Cabeçalho totalmente desconhecido')
const csv8 = `Col_A;Col_B;Col_C
val1;val2;val3`

const r8 = parseShopeeCSV(csv8)
ok('warning sobre colunas não reconhecidas', r8.warnings.length > 0)

// ── Fixture 9: CSV vazio ──────────────────────────────────────────────────────
console.log('\n9. CSV vazio')
const r9 = parseShopeeCSV('')
ok('totalRows = 0', r9.totalRows === 0)
ok('warning de CSV vazio', r9.warnings.length > 0)

// ── Fixture 10: R$ com milhar (R$ 1.234,56) ──────────────────────────────────
console.log('\n10. R$ com separador de milhar')
const csv10 = `ID do pedido;Receita;Comissão
BIG001;"R$ 1.234,56";"R$ 98,76"`

const r10 = parseShopeeCSV(csv10)
ok('gross_value ≈ 1234.56', Math.abs((r10.rows[0].gross_value ?? 0) - 1234.56) < 0.01, `got ${r10.rows[0].gross_value}`)
ok('commission_value ≈ 98.76', Math.abs((r10.rows[0].commission_value ?? 0) - 98.76) < 0.01, `got ${r10.rows[0].commission_value}`)

// ── Result ────────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────`)
console.log(`✅ ${passed} passou  ❌ ${failed} falhou`)
if (failed > 0) process.exitCode = 1
else console.log('QA PASSED — importer robusto')
