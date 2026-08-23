# CLAUDE_STATUS
_Atualizado: 2026-08-22 — Sprint 11 (UX COMERCIAL: filtros MOCK, honestidade IA, SUPERVISED mode, distribute corrigido)_

## Estado atual

- Branch: `main`
- Sprint 8 commit: **pendente** — rodar `~/Desktop/affiliate-os-sprint8-commit.command`
- Sprint 9 commit: **pendente** — rodar `~/Desktop/affiliate-os-sprint9-commit.command`
- Sprint 10 commit: **pendente** — rodar `~/Desktop/affiliate-os-sprint10-commit.command`
- Sprint 11 commit: **pendente** — rodar `~/Desktop/affiliate-os-sprint11-commit.command`
- Servidor: rodando (porta 3000)

### ✅ SPRINT 11 — UX COMERCIAL (2026-08-22)

**Correções e melhorias:**
- `app/api/hoje/route.ts`: fix bug NULL Supabase — `realPending` JS-filtrado; `awaitingApproval` conta só criativos reais não-MOCK
- `app/(dashboard)/hoje/page.tsx`: sales card honesto (sem R$ 0,00 verde); sem emojis nos labels; "Iniciar Pipeline"
- `app/(dashboard)/queue/page.tsx`: aviso de honestidade IA acima da fila de pendentes
- `app/(dashboard)/video-factory/page.tsx`: label "Rascunho baseado em dados" quando `provider=local`
- `app/(dashboard)/distribute/page.tsx`: banner SUPERVISIONADO; lógica PUBLICAR corrigida (antes habilitava com rights=unknown); guia manual para pending_rights

**Validação:**
| Check | Resultado |
|---|---|
| TypeScript | 0 erros ✅ |
| `awaitingApproval` wired to `realPending` | ✅ |
| Lint | pendente verificação no Mac |


### ✅ SPRINT 10 — PIPELINE REAL FECHADO (2026-08-22)

**Correções:**
- `app/api/video-factory/render/route.ts`: após render, auto-insere em `publication_packages` → `/distribute` (usa `/api/publish`) agora mostra pacote imediatamente
- `app/api/video-factory/route.ts`: GET agora retorna `storyboards` + `renders` de `automation_runs` → UI sobrevive navegação
- `app/(dashboard)/video-factory/page.tsx`: pré-popula estado do GET; botão "Ver na Distribuição →" pós-render

**Validação pipeline completo (creative `c6170a5e-2c3e-41c1-9299-b178d13bc9aa` — Calça Jeans Gaven, pending):**

| Etapa | Resultado |
|---|---|
| Storyboard POST | `status:200`, `provider:'local'`, 5 cenas, `hasMock:false` ✅ |
| Render POST | `1080×1920`, `h264`, `30s`, `0.57MB`, `7.7s`, `packageReady:true` ✅ |
| Captions SRT | gerado ✅ |
| `/api/publish` | 1 pacote, `status:'pending_rights'` (rights_status='unknown', esperado) ✅ |
| Lint | 0 erros (1 warning pré-existente em extension/popup.js) ✅ |
| TypeScript | 0 erros ✅ |

### ✅ PRIMEIRO LOOP REAL COMPLETO (2026-08-22)

Produto: "Calça Jeans Gaven Wide Leg Feminina Pantalona" — R$50,16, nota 4.8, 2100 avail., 13% comissão

| Etapa | Resultado |
|---|---|
| Score (`/api/score`) | 74/100 "VALE TESTAR", provider='local' ✅ |
| Criativo (`/api/creative`) | 3 criativos com hooks factuais ✅ |
| Aprovação na Fila | creative `2123a722` aprovado ✅ |
| Storyboard (`/api/video-factory`) | 5 cenas, provider='local' ✅ |
| Render (`/api/video-factory/render`) | `render_2123a722_1787436194016.mp4`, 1080×1920, 30s, 0.57MB ✅ |
| Content Package | `packageReady: true` → publication_ready ✅ |

Ver vídeo: `http://localhost:3001/api/video-factory/output/render_2123a722_1787436194016.mp4`

## O que a Sprint 7 entregou

| Arquivo | O que mudou |
|---|---|
| `app/api/products/route.ts` | POST persiste `product_type`, `cost`, `checkout_url`, `margin_pct`. PATCH novo. Graceful 409 se migration 005 ausente. Validações `validMoney` + `validUrl`. Regressão Shopee zero. |
| `app/(dashboard)/products/add-own/page.tsx` | Redesign UX: touch ≥44px, margem em tempo real, foco laranja, tela migration, sucesso → /launch |
| `app/(dashboard)/products/page.tsx` | Interface + badge PRÓPRIO laranja quando `marketplace === 'owned'` |
| `scripts/test-owned-product.sh` | 6 testes: owned válido, validações, regressão Shopee, score, listagem |

## Pipeline owned products — status por etapa

| Etapa | Status |
|---|---|
| Adicionar produto próprio (`/products/add-own`) | ✅ funcional (requer migration 005) |
| Score (`/api/score`) | ✅ funciona sem alteração — lê campos existentes |
| Criativo (`/api/creative`) | ✅ funciona — usa title/description/price |
| Storyboard + Render | ✅ funciona — usa creative, não acessa product_type |
| Publication Package | ✅ funciona — usa affiliate_url (= checkout_url para owned) |
| Badge PRÓPRIO na lista | ✅ visível quando marketplace = 'owned' |
| Filtro por tipo na /products | ❌ não implementado (próxima sprint) |
| Revenue com margem real | ⚠ revenue usa commission_rate (100%) — margem real não exibida ainda |

## Ações humanas pendentes (ordem de prioridade)

1. **Executar migration 005** no Supabase SQL Editor:
   - Abrir painel → SQL Editor
   - Colar e rodar `supabase/005_owned_products.sql`
   - Validar: `SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='product_type';`

2. **Commit Sprint 5** → `~/Desktop/affiliate-os-sprint5-commit.command`
3. **Commit Sprint 6** → `~/Desktop/affiliate-os-sprint6-commit.command`
4. **Commit Sprint 7** → `~/Desktop/affiliate-os-sprint7-commit.command`

5. **Testar owned product** com servidor rodando:
   ```
   bash scripts/test-owned-product.sh
   ```

6. **OAuth Meta/YouTube** — depois de configurar `.env.local` com as chaves

7. **Instalar extensão Chrome** — após configurar `EXTENSION_LOCAL_TOKEN` em `.env.local`

8. **Primeiro CSV Shopee real** — exportar do affiliate.shopee.com.br e importar em `/sales/import`

## Auditoria desta sessão (2026-08-22 — continuação pós-compactação)

| Item | Status |
|---|---|
| Servidor local (`npm run dev`) | ❌ NÃO está rodando |
| Extensão Chrome | ⚠ Não verificado — chrome:// inacessível via extensão |
| Migration 005 no Supabase | ⚠ Não verificado — Supabase é SPA, DOM vazio via extensão |
| `docs/AI_HANDOFF.md` | ✅ Atualizado com Sprint 5/6/7 |
| `docs/DECISIONS.md` | ✅ Atualizado — owned products discriminator + checkout_url |

### Extensão Chrome — instruções de carregamento

A extensão está em `~/Desktop/affiliate-os/extension/`. Para carregar:
1. Abrir `chrome://extensions`
2. Ativar "Modo desenvolvedor" (toggle canto superior direito)
3. Clicar "Carregar sem compactação"
4. Selecionar a pasta `~/Desktop/affiliate-os/extension/`
5. Configurar `EXTENSION_LOCAL_TOKEN` em `.env.local` com o token gerado pela extensão

### Migration 005 no Supabase — instruções exatas

1. Abrir https://supabase.com/dashboard/project/tlbmgahbtwwoojaobygx/sql/new
2. Colar o conteúdo de `supabase/005_owned_products.sql`
3. **CHAMAR LUCA antes de clicar Run** (constraint da sessão)
4. Após aprovação: executar e validar com:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='products' 
   AND column_name IN ('product_type','cost','checkout_url','margin_pct');
   ```

## Próxima ação de maior impacto

→ (1) `npm run dev`, (2) migration 005, (3) `bash scripts/test-owned-product.sh`, (4) commits 5/6/7.
  Depois: `/products/add-own` com e-book real → `/launch` → score → criativo → vídeo → distribuição.
  Esse é o primeiro loop comercial 100% próprio.
