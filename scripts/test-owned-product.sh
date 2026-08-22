#!/usr/bin/env bash
# test-owned-product.sh — testa criação de produto próprio e regressão Shopee
# Não toca dados reais de publicação. Produto criado com prefixo [TESTE].
# Uso: bash scripts/test-owned-product.sh [BASE_URL]
# Padrão: http://localhost:3000

set -euo pipefail

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

pass() { echo "✅ $1"; PASS=$((PASS+1)); }
fail() { echo "❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "⚠  $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo " Affiliate OS — Teste de Produto Próprio"
echo " Base: $BASE"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Criar produto próprio válido ─────────────────────────────────────────
echo "[ 1/6 ] POST /api/products — produto próprio válido"
RESP=$(curl -sf -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"[TESTE] E-book Renda Afiliados",
    "price": 97,
    "checkout_url":"https://pay.hotmart.com/test123",
    "affiliateUrl":"https://pay.hotmart.com/test123",
    "product_type":"owned",
    "cost": 9.7,
    "margin_pct": 90,
    "marketplace":"owned",
    "commissionRate": 100,
    "category":"E-book",
    "seller":"hotmart"
  }' 2>&1) || { fail "Requisição falhou — servidor está rodando em $BASE?"; FAIL=$((FAIL+1)); }

if echo "$RESP" | grep -q '"product"'; then
  PRODUCT_ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "Produto criado (id: ${PRODUCT_ID:0:8}…)"
elif echo "$RESP" | grep -q '"migration_required"'; then
  warn "Migration 005 não aplicada — rode supabase/005_owned_products.sql no Supabase SQL Editor"
  warn "Continuando testes que não dependem da migration…"
  PRODUCT_ID=""
elif echo "$RESP" | grep -q '"error"'; then
  ERR=$(echo "$RESP" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  fail "Erro inesperado: $ERR"
  PRODUCT_ID=""
else
  fail "Resposta inesperada: $RESP"
  PRODUCT_ID=""
fi

# ── 2. Validação: título obrigatório ─────────────────────────────────────────
echo ""
echo "[ 2/6 ] POST /api/products — sem título (deve dar 400)"
RESP2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"product_type":"owned","price":97,"checkout_url":"https://example.com"}')
[ "$RESP2" = "400" ] && pass "400 retornado sem título" || fail "Esperava 400, recebeu $RESP2"

# ── 3. Validação: checkout_url obrigatório para owned ────────────────────────
echo ""
echo "[ 3/6 ] POST /api/products — owned sem checkout_url (deve dar 400)"
RESP3=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{"title":"[TESTE] Sem URL","product_type":"owned","price":97}')
[ "$RESP3" = "400" ] && pass "400 retornado sem checkout_url" || fail "Esperava 400, recebeu $RESP3"

# ── 4. Regressão: criar produto Shopee (sem campos owned) ────────────────────
echo ""
echo "[ 4/6 ] POST /api/products — produto Shopee (regressão)"
RESP4=$(curl -sf -X POST "$BASE/api/products" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"[TESTE] Produto Shopee Regressão",
    "affiliateUrl":"https://shopee.com.br/product/123",
    "commissionRate": 8,
    "price": 49.90
  }' 2>&1) || RESP4="{}"

if echo "$RESP4" | grep -q '"product"'; then
  SHOPEE_ID=$(echo "$RESP4" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  pass "Produto Shopee criado (id: ${SHOPEE_ID:0:8}…)"
else
  fail "Falhou criar produto Shopee: $RESP4"
  SHOPEE_ID=""
fi

# ── 5. Score no produto próprio ──────────────────────────────────────────────
echo ""
echo "[ 5/6 ] POST /api/score — score no produto próprio"
if [ -n "$PRODUCT_ID" ]; then
  RESP5=$(curl -sf -X POST "$BASE/api/score" \
    -H "Content-Type: application/json" \
    -d "{\"productId\":\"$PRODUCT_ID\"}" 2>&1) || RESP5="{}"
  if echo "$RESP5" | grep -q '"overallScore"'; then
    SCORE=$(echo "$RESP5" | grep -o '"overallScore":[0-9]*' | cut -d: -f2)
    pass "Score calculado: $SCORE"
  else
    warn "Score falhou (sem AI key?) — verifique ANTHROPIC_API_KEY ou GEMINI_API_KEY"
  fi
else
  warn "Pulando score — produto não foi criado (migration pendente?)"
fi

# ── 6. GET /api/products — lista inclui produto com marketplace=owned ────────
echo ""
echo "[ 6/6 ] GET /api/products — listagem"
RESP6=$(curl -sf "$BASE/api/products" 2>&1) || RESP6="{}"
if echo "$RESP6" | grep -q '"products"'; then
  COUNT=$(echo "$RESP6" | grep -o '"id"' | wc -l | tr -d ' ')
  OWNED=$(echo "$RESP6" | grep -o '"marketplace":"owned"' | wc -l | tr -d ' ')
  pass "Listagem OK — $COUNT produtos ($OWNED próprios)"
else
  fail "GET /api/products falhou"
fi

# ── Resumo ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo " Resultado: $PASS pass / $FAIL fail"
echo "═══════════════════════════════════════════════"
[ "$FAIL" -eq 0 ] && echo " 🎯 Tudo OK" || echo " ⚠  Verifique os itens marcados com ❌"
echo ""
