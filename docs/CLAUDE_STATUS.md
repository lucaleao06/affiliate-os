# CLAUDE_STATUS
_Atualizado: 2026-08-23 — MODO CONTÍNUO #17 (Audit completo + 4 bugs críticos corrigidos)_

### ✅ MODO CONTÍNUO #17 — Claude provider: extração JSON robusta (2026-08-23)

| Item | Entrega |
|---|---|
| `lib/ai/providers/claude.ts` | `extractJSON()` remove code fences e extrai o primeiro `{}` ou `[]` válido antes do `JSON.parse` — evita crash em produção se Claude adicionar markdown |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #16 — product_scores sempre retorna score mais recente (2026-08-23)

| Item | Entrega |
|---|---|
| `app/api/products/route.ts` | `.order('created_at', { ascending: false, referencedTable: 'product_scores' })` — `[0]` agora é sempre o score mais novo |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #15 — Bug crítico Radar: tabela e coluna erradas (2026-08-23)

| Item | Entrega |
|---|---|
| `app/api/radar/route.ts` | `score_runs` → `product_scores`; `rationale` → `reasoning` no SELECT + map. Radar agora carrega scores reais. |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #14 — Sort produtos por score desc (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/products/page.tsx` | `visibleProducts` agora ordenado por `overall_score` desc; produtos sem score ficam ao final (score=-1) |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #13 — Bulk scoring com progress bar (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/products/page.tsx` | `handleBulkScore()` com loop sequencial + progress bar; botão aparece quando 2+ produtos sem score |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #12 — Mobile nav completo (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/mais/page.tsx` | Adicionados `/queue`, `/video-factory`, `/distribute` que faltavam; reordenado pipeline order (Hoje→Radar→Launch→Fila→Vídeos→Distribuição→Produtos→…) |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #11 — Radar recomenda no Launch (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/launch/page.tsx` | Fetch paralelo de `/api/radar` na montagem; `radarTopIds` filtra tier `now`/`test`; seção "Radar recomenda" no step produto com cards orange, um toque → direto ao score |

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #10 — Design audit final: zero violações Tailwind (2026-08-23)

| Arquivo | Fix |
|---|---|
| `connect/page.tsx` | Badge `MANUAL ✓` → `MANUAL` (emoji removed) |
| `dashboard/page.tsx` | `bg-green-500/yellow/red` → `style={{ background: '#...' }}` no criativo breakdown |
| `products/page.tsx` | `bg-red-900/30 text-red-300` e `bg-green-900/30 text-green-300` → CSS vars inline |
| `queue/page.tsx` | `text-blue-400/purple-400/green-400` nos labels ROTEIRO/LEGENDA/CHAMADA → `style` |
| `revenue/page.tsx` | `text-emerald-400/blue-400/purple-400` → `style` em top products/channels/creatives |

**Grep final: zero ocorrências de `bg-gray-`, `text-gray-`, `linear-gradient`, `bg-green-`, `bg-red-`, `text-emerald-`, `text-purple-` ✅**

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO #9 — RadarWidget no Dashboard (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/dashboard/page.tsx` | `RadarWidget` component: busca `/api/radar`, filtra tier `now`/`test`, mostra top 3 com imagem/sigla, badge de tier, comissão e score. Skeleton durante load, invisível se vazio. Inserido entre stat grid e PipelineWidget. |

**TSC: 0 erros ✅**

---

## Estado atual

- Branch: `main`
- Commit MODO CONTÍNUO: **pendente** — rodar `~/Desktop/affiliate-os-modo-continuo-commit.command`
  - Cobre 42 arquivos: sprint anterior (37) + queue + video-factory + autopilot + api/dashboard + dashboard/page
  - **CRÍTICO: `CRON_SECRET` precisa ser adicionado ao Vercel env vars para proteger o cron**
- Servidor: verificar (`npm run dev` na pasta)

### ✅ MODO CONTÍNUO #8 — Radar + Bulk Approve + Channel Guide (2026-08-23)

| Item | Entrega |
|---|---|
| `app/api/radar/route.ts` | NOVO — ranqueia produtos por `(score × commission) / (1 + creatives)`. Tiers: now / test / explore / skip / pending_score |
| `app/(dashboard)/radar/page.tsx` | NOVO — página Radar com filtros, summary cards, score bar, detail expandível, CTA → /launch |
| `app/(dashboard)/layout.tsx` | Radar adicionado ao sidebar (grupo Core, ícone ◎) |
| `app/(dashboard)/mais/page.tsx` | Radar adicionado no menu mobile |
| `app/(dashboard)/queue/page.tsx` | "Aprovar todos (N)" button quando pending > 1; `approveAll()` com Promise.all |
| `app/(dashboard)/distribute/page.tsx` | `CHANNEL_GUIDE` com steps reais + horários + dica por canal (TikTok/IG/YT/Shopee/Manual); botão "Copiar legenda + CTA + link" (col-span-2) |

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO #7 — hoje nextStep routing fix (2026-08-23)

| Item | Entrega |
|---|---|
| `app/api/hoje/route.ts` | `approvedCreatives` query adicionada ao Promise.all; campo exposto no JSON |
| `app/(dashboard)/hoje/page.tsx` | `HojeData.approvedCreatives: number`; novo branch em `nextStep()`: quando `approvedCreatives > 0 && generated.count === 0` → `{ label: 'Gerar vídeo', href: '/video-factory', urgent: true }` |

**Bug corrigido:** aprovação de criativo na fila redirecionava para `/launch` (sem criativo) em vez de `/video-factory`. Agora `nextStep` detecta aprovados-sem-render e direciona corretamente.

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO #6 — Dashboard com receita do dia (2026-08-23)

| Item | Entrega |
|---|---|
| `app/api/dashboard/route.ts` | `commissionToday` + `salesCountToday` da tabela `sales` |
| `app/(dashboard)/dashboard/page.tsx` | Grid 4→6 cards: "Comissão hoje" e "Vendas hoje" no topo, com destaque laranja quando > 0 |

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO #5 — Autopilot "Testar agora" (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/autopilot/page.tsx` | Botão "Testar agora" → `POST /api/autopilot/run`, exibe decisões ADVANCE/BLOCK/QUEUE inline |

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO #4 — PIPELINE SHORTCUT: Queue → Video Factory (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/queue/page.tsx` | "Gerar vídeo →" passa `?creativeId=${c.id}` para /video-factory |
| `app/(dashboard)/video-factory/page.tsx` | Recebe `?creativeId=`, ordena criativo no topo, borda laranja de destaque |

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO #3 — UX POLISH (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/layout.tsx` | Badge de notificações some ao entrar em /notifications (sem aguardar clique) |
| `app/(dashboard)/sales/import/page.tsx` | Seção "Importações anteriores" — histórico de batches ao entrar na página |
| `app/(dashboard)/autopilot/page.tsx` | Card informativo do cron: schedule + instrução CRON_SECRET |

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO #2 — /SALES + CRON + BUGFIXES (2026-08-23)

| Item | Entrega |
|---|---|
| `app/(dashboard)/sales/page.tsx` | CRIADO — lista transações, filtros período/status, paginação |
| `app/api/sales/route.ts` | CRIADO — GET com filtros Supabase v2 corretos |
| `app/api/cron/autopilot/route.ts` | CRIADO — cron handler, auth CRON_SECRET |
| `vercel.json` | CRIADO — schedule `0 * * * *` (horário) |
| `app/(dashboard)/layout.tsx` | /sales adicionado na sidebar |
| `app/(dashboard)/mais/page.tsx` | /sales adicionado no mobile nav |
| `app/(dashboard)/revenue/page.tsx` | Link "ver transações →" adicionado no footer |
| `app/(dashboard)/sales/import/page.tsx` | CTA pós-importação → /sales |
| `app/(dashboard)/hoje/page.tsx` | Card vendas clickável → /sales ou /sales/import |
| `app/api/hoje/route.ts` | **BUG CRÍTICO**: `order_date` → `occurred_at` (vendas sempre 0) |

**TSC: 0 erros ✅**

### ✅ MODO CONTÍNUO — API AUDIT + BUGFIXES (2026-08-23)

**Auditoria completa: todas as 25 APIs verificadas — 3 novos bugs Supabase v2 encontrados e corrigidos:**

| API | Bug | Fix |
|---|---|---|
| `api/publish/route.ts` | `GET ?status=X` nunca filtrava — pills de /distribute mostravam TODOS | `let query; query = query.eq(...)` |
| `api/notifications/route.ts` | `GET ?unread=1` nunca filtrava | idem |
| `distribute/page.tsx` | `copied` boolean global — todos os cards flashavam "Copiado!" ao copiar um | `copiedId: string\|null` por pacote |

**APIs confirmadas limpas (inline chain, sem reassignment):**
`api/hoje`, `api/dashboard`, `api/revenue` (já fixado), `api/queue`, `api/score`, `api/creative`, `api/products`, `api/growth/insights`, `api/autopilot/rules`, `api/queue/regenerate`, `api/video-factory`, `api/video-factory/render`, `api/video-factory/output/[filename]`, todos os connect/* routes

**TSC: 0 erros ✅**

---

### ✅ MODO CONTÍNUO — DESIGN REFACTOR GLOBAL (2026-08-23)

**Varredura e limpeza completa de `app/(dashboard)/` e `components/`:**

| Regra | Status |
|---|---|
| Zero `bg-gray-*` | ✅ confirmado (grep vazio) |
| Zero `text-gray-*` | ✅ confirmado (grep vazio) |
| Zero `linear-gradient` | ✅ confirmado (grep vazio) |
| Zero emoji em labels/títulos/botões | ✅ confirmado |
| CSS vars em todos os cards | ✅ |
| TSC | 0 erros ✅ |

**Páginas limpas neste sprint (adicionadas às anteriores):**
- `connect`: IG/YT/TK/SH badges, sem emoji em toasts/warnings
- `launch`: spinner CSS, todos os botões e seções sem emoji
- `revenue`: gray classes → CSS vars; empty state emoji → badge CSV; fix corrupt replace_all
- `mais`: ícones emoji → siglas 2 letras em pill laranja
- `products`: textarea/label gray → CSS vars; success msg sem emoji
- `products/add-own`: removido `placeholder-gray-600` (2 instâncias)
- `layout`: footer sem checkmark emoji

**Bugfixes neste sprint:**
- `dashboard/page.tsx`: `useEffect` tinha fetch duplicado inline; refatorado para reusar `loadDashboard()`
- `dashboard/page.tsx`: `r.json()` tipado como `Promise<Stats>` (sem cast any)
- `api/dashboard/route.ts`: `avgScore` agora filtra `overall_score = null` antes do reduce → sem NaN no dashboard
- `api/revenue/route.ts` (BUG CRÍTICO): `baseQuery()` usava `const q; q.gte()` — Supabase v2 descartava o filtro. Período sempre mostrava ALL TIME. Fix: `let q = ...; q = q.gte(...)`.
- `app/(dashboard)/products/page.tsx`: type filter (Todos/Afiliado/Próprio) implementado — status atualizado de ❌ para ✅
- `app/layout.tsx`: última violação `bg-gray-950` removida → `style={{ background: 'var(--bg)' }}`

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
| Filtro por tipo na /products | ✅ implementado — tabs Todos/Afiliado/Próprio, aparece apenas quando ownedCount > 0 |
| Revenue com margem real | ⚠ revenue usa commission_rate (100%) — margem real não exibida ainda (requer migration 005) |

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
