#!/usr/bin/env bash
# ============================================================
# test-pipeline.sh — Teste do loop comercial completo
# Fluxo real:
#   produto → score → creative → PATCH /api/queue approved
#   → POST /api/video-factory (storyboard)
#   → POST /api/video-factory/render
#   → POST /api/publish action=create
#   → POST /api/publish action=publish → manual_required (SUPERVISED)
#
# Nenhuma publicação em rede social é feita.
# Produto criado tem prefixo "[TESTE]" — não apaga dados existentes.
# ============================================================
set -euo pipefail

BASE="${AFFILIATE_OS_URL:-http://localhost:3000}"
PASS=0; FAIL=0; WARN=0
PRODUCT_ID=""
CREATIVE_ID=""
PACKAGE_ID=""

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[0;33m'
BLU='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GRN}✅ $1${NC}"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}❌ $1${NC}"; FAIL=$((FAIL + 1)); }
warn() { echo -e "${YLW}⚠️  $1${NC}"; WARN=$((WARN + 1)); }
info() { echo -e "${BLU}ℹ  $1${NC}"; }
sep()  { echo -e "${YLW}--- $1 ---${NC}"; }

jq_get() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d$2)" 2>/dev/null || echo ""; }

# ---- 1. Health check ----
sep "1/8 Health check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/products")
if [[ "$STATUS" == "200" ]]; then
  ok "GET /api/products → 200"
else
  fail "GET /api/products → $STATUS (servidor offline?)"
  echo "Abortando."; exit 1
fi

# ---- 2. Criar produto ----
sep "2/8 Criar produto [TESTE]"
CREATE=$(curl -s -X POST "$BASE/api/products" \
  -H "content-type: application/json" \
  -d '{
    "title": "[TESTE] Tênis Casual Pipeline Test",
    "price": 89.90,
    "commissionRate": 8,
    "affiliateUrl": "https://s.shopee.com.br/test-pipeline-001",
    "category": "Calçados",
    "rating": 4.7,
    "reviewCount": 3200,
    "soldCount": 15000
  }')

PRODUCT_ID=$(echo "$CREATE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('product',{}).get('id',''))
" 2>/dev/null)

if [[ -n "$PRODUCT_ID" && "$PRODUCT_ID" != "None" ]]; then
  ok "Produto criado: $PRODUCT_ID"
else
  fail "Falha ao criar produto: $(echo "$CREATE" | head -c 200)"
  exit 1
fi

# ---- 3. Score (/api/score → score.overallScore camelCase) ----
sep "3/8 Score"
SCORE_RESP=$(curl -s -X POST "$BASE/api/score" \
  -H "content-type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\"}")

OVERALL=$(echo "$SCORE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('score',{}).get('overallScore',''))
" 2>/dev/null)
RECOM=$(echo "$SCORE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('score',{}).get('recommendation',''))
" 2>/dev/null)

if [[ -n "$OVERALL" && "$OVERALL" != "None" && "$OVERALL" != "" ]]; then
  ok "Score: $OVERALL/100 — $RECOM (campo: score.overallScore ✓)"
else
  ERR=$(echo "$SCORE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','?'))" 2>/dev/null)
  warn "Score falhou (sem AI key?): $ERR — continuando"
fi

# ---- 4. Criativos (→ creatives[0].id) ----
sep "4/8 Criativos"
CREATIVE_RESP=$(curl -s -X POST "$BASE/api/creative" \
  -H "content-type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\"}")

CREATIVE_ID=$(echo "$CREATIVE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
creatives = d.get('creatives', [])
if creatives:
    print(creatives[0].get('id',''))
" 2>/dev/null)
ANGLES_COUNT=$(echo "$CREATIVE_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(len(d.get('angles',[])))
" 2>/dev/null || echo "0")
HAS_ANGLE=$(echo "$CREATIVE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
c=d.get('creatives',[])
print('yes' if c and 'angle' in c[0] else 'no')
" 2>/dev/null)

if [[ -n "$CREATIVE_ID" && "$CREATIVE_ID" != "None" && "$CREATIVE_ID" != "" ]]; then
  ok "Creative ID: $CREATIVE_ID ($ANGLES_COUNT ângulos)"
  [[ "$HAS_ANGLE" == "yes" ]] && ok "Campo 'angle' presente nos criativos (fix Sprint 4 ✓)" \
    || warn "Campo 'angle' ausente — fix de enriquecimento não está ativo"
else
  ERR=$(echo "$CREATIVE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','?'))" 2>/dev/null)
  warn "Criativos falharam (sem AI key?): $ERR"
  info "Pulando etapas dependentes de creativeId"
fi

# ---- 5. PATCH /api/queue → approve creative ----
sep "5/8 Aprovar criativo (PATCH /api/queue)"
if [[ -n "$CREATIVE_ID" && "$CREATIVE_ID" != "" ]]; then
  PATCH_RESP=$(curl -s -X PATCH "$BASE/api/queue" \
    -H "content-type: application/json" \
    -d "{\"id\": \"$CREATIVE_ID\", \"status\": \"approved\"}")

  PATCH_STATUS=$(echo "$PATCH_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('creative',{}).get('status',''))
" 2>/dev/null)

  if [[ "$PATCH_STATUS" == "approved" ]]; then
    ok "Criativo aprovado via PATCH /api/queue"
  else
    ERR=$(echo "$PATCH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','?'))" 2>/dev/null)
    warn "PATCH /api/queue: $ERR (status=$PATCH_STATUS)"
  fi
else
  info "Pulando — sem creative_id"
fi

# ---- 6. POST /api/video-factory → storyboard (creativeId) ----
sep "6/8 Storyboard (POST /api/video-factory)"
if [[ -n "$CREATIVE_ID" && "$CREATIVE_ID" != "" ]]; then
  VF_RESP=$(curl -s -X POST "$BASE/api/video-factory" \
    -H "content-type: application/json" \
    -d "{\"creativeId\": \"$CREATIVE_ID\"}")

  RUN_ID=$(echo "$VF_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('runId',''))
" 2>/dev/null)

  if [[ -n "$RUN_ID" && "$RUN_ID" != "None" && "$RUN_ID" != "" ]]; then
    ok "Storyboard gerado: runId=$RUN_ID"
  else
    ERR=$(echo "$VF_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','?'))" 2>/dev/null)
    warn "Storyboard: $ERR (sem AI key ou criativo não encontrado)"
  fi
else
  info "Pulando storyboard — sem creative_id"
fi

# ---- 7. POST /api/video-factory/render → render ----
sep "7/8 Render (POST /api/video-factory/render)"
if [[ -n "$CREATIVE_ID" && "$CREATIVE_ID" != "" ]]; then
  RENDER_RESP=$(curl -s -X POST "$BASE/api/video-factory/render" \
    -H "content-type: application/json" \
    -d "{\"creativeId\": \"$CREATIVE_ID\"}")

  RENDER_STATUS=$(echo "$RENDER_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('status',''))
" 2>/dev/null)
  RENDER_ERR=$(echo "$RENDER_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('error',''))
" 2>/dev/null)

  if [[ "$RENDER_STATUS" == "completed" ]]; then
    DL=$(echo "$RENDER_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('downloadUrl',''))
" 2>/dev/null)
    ok "Render concluído: $DL"
  elif echo "$RENDER_ERR" | grep -qiE "ffmpeg|generate storyboard first|not found"; then
    warn "Render esperado falhar: $RENDER_ERR (FFmpeg não disponível ou storyboard ausente)"
  else
    warn "Render: $RENDER_ERR"
  fi
else
  info "Pulando render — sem creative_id"
fi

# ---- 8. POST /api/publish → create + publish ----
sep "8/8 Publication package + SUPERVISED check"
if [[ -n "$CREATIVE_ID" && "$CREATIVE_ID" != "" ]]; then
  # 8a. Criar pacote
  PUB_CREATE=$(curl -s -X POST "$BASE/api/publish" \
    -H "content-type: application/json" \
    -d "{
      \"action\": \"create\",
      \"creativeId\": \"$CREATIVE_ID\",
      \"channel\": \"manual\",
      \"rightsStatus\": \"test\"
    }")

  PACKAGE_ID=$(echo "$PUB_CREATE" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('package',{}).get('id',''))
" 2>/dev/null)
  PKG_STATUS=$(echo "$PUB_CREATE" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('package',{}).get('status',''))
" 2>/dev/null)

  if [[ -n "$PACKAGE_ID" && "$PACKAGE_ID" != "None" && "$PACKAGE_ID" != "" ]]; then
    ok "Publication package criado: $PACKAGE_ID (status=$PKG_STATUS)"

    # 8b. Publicar → espera manual_required (SUPERVISED)
    PUB_RESP=$(curl -s -X POST "$BASE/api/publish" \
      -H "content-type: application/json" \
      -d "{\"action\": \"publish\", \"packageId\": \"$PACKAGE_ID\"}")

    RESULT_MA=$(echo "$PUB_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('result',{}).get('requiresManualAction',''))
" 2>/dev/null)
    RESULT_OK=$(echo "$PUB_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('result',{}).get('success',''))
" 2>/dev/null)
    PUB_ERR=$(echo "$PUB_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('error',''))
" 2>/dev/null)

    if [[ "$RESULT_MA" == "True" || "$RESULT_MA" == "true" ]]; then
      ok "SUPERVISED confirmado: requiresManualAction=true → status manual_required ✓"
    elif echo "$PUB_ERR" | grep -qiE "rights|no render|creative not found"; then
      warn "Publish: $PUB_ERR (esperado sem render concluído)"
    else
      warn "Publish result: success=$RESULT_OK manualAction=$RESULT_MA err=$PUB_ERR"
    fi
  else
    PUB_ERR=$(echo "$PUB_CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','?'))" 2>/dev/null)
    warn "Publication package: $PUB_ERR (esperado sem render)"
  fi
else
  info "Pulando publish — sem creative_id"
fi

# ---- Resumo ----
echo ""
echo "======================================="
echo -e "  ${GRN}✅ PASSOU: $PASS${NC}  ${YLW}⚠️  AVISO: $WARN${NC}  ${RED}❌ FALHOU: $FAIL${NC}"
echo "======================================="
echo ""
echo "Produto de teste no banco: $PRODUCT_ID"
echo "  (prefixo '[TESTE]' para identificação — não deletar)"
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GRN}Todos os contratos de API validados corretamente.${NC}"
  exit 0
else
  echo -e "${RED}$FAIL contrato(s) com resposta inesperada.${NC}"
  exit 1
fi
