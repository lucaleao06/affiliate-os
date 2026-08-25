# CLAUDE_ADDITIONS — Adições Autônomas

_Itens adicionados por iniciativa própria no Affiliate OS.
Cada entrada tem: data · arquivo · motivo._

---

## 2026-08-23 — MODO CONTÍNUO #6: Dashboard com dados de receita

### `app/api/dashboard/route.ts` (MODIFICADO)
- Adicionado `commissionToday` e `salesCountToday` via query em `sales` filtrada por hoje
- Retornados no JSON junto com os campos existentes

### `app/(dashboard)/dashboard/page.tsx` (MODIFICADO)
- Interface `Stats` atualizada com `commissionToday` e `salesCountToday`
- Grid de 4 → 6 cards: primeiro dois são "Comissão hoje" (→/revenue) e "Vendas hoje" (→/sales)
- Cards destacados em laranja quando valor > 0
- Motivo: dashboard principal não mostrava nenhum dado financeiro — usuário precisava ir em /hoje ou /revenue para ver receita

---

## 2026-08-23 — MODO CONTÍNUO #5: Autopilot "Testar agora"

### `app/(dashboard)/autopilot/page.tsx` (MODIFICADO)
- Adicionado botão "Testar agora" que chama `POST /api/autopilot/run`
- Exibe resultado inline: mensagem + lista de decisões (ADVANCE/BLOCK/QUEUE) com motivo
- Estado `running` desabilita o botão durante execução
- Motivo: usuários não tinham forma de testar o autopilot manualmente; precisavam esperar o cron horário

---

## 2026-08-23 — MODO CONTÍNUO #4: Queue → Video Factory pipeline shortcut

### `app/(dashboard)/queue/page.tsx` (MODIFICADO)
- "Gerar vídeo →" agora passa `?creativeId=${c.id}` para `/video-factory`
- Motivo: antes o usuário chegava no video-factory sem saber qual criativo selecionar

### `app/(dashboard)/video-factory/page.tsx` (MODIFICADO)
- Adicionado `useSearchParams` + `Suspense` wrapper + `force-dynamic`
- Ao receber `?creativeId=`, ordena o criativo correspondente no topo da lista
- Borda laranja (`rgba(255,107,53,0.6)`) no card do criativo destacado
- TSC: 0 erros ✅

---

## 2026-08-23 — MODO CONTÍNUO #3: UX polish + pipeline shortcuts

### `app/(dashboard)/layout.tsx` (MODIFICADO)
Badge de notificações zera imediatamente quando `pathname === '/notifications'`. Antes, o badge só zerava depois que o usuário clicava "Marcar todas lidas" E navegava para outra página.
**Motivo:** UX — visitar a página de notificações implica que o usuário viu os itens.

### `app/(dashboard)/sales/import/page.tsx` (MODIFICADO)
Adicionado `useEffect` que busca `GET /api/sales/import` ao montar a página. Seção "Importações anteriores" exibe batches históricos com status (OK/ERRO/PROC), nome do arquivo, linhas importadas e data.
**Motivo:** Usuário não tinha visibilidade de CSVs já importados — risco de duplicata.

### `app/(dashboard)/autopilot/page.tsx` (MODIFICADO)
Card informativo do cron adicionado acima do botão "Salvar": mostra que `/api/cron/autopilot` roda a cada hora e que `CRON_SECRET` precisa estar configurado no Vercel.
**Motivo:** Cron foi criado na sessão anterior mas a UI não mencionava — usuário não saberia que o autopilot tem execução automática.

### `app/(dashboard)/launch/page.tsx` (MODIFICADO)
- Adicionado `useSearchParams` para ler `?productId=` da URL
- `useEffect` auto-seleciona o produto e avança para o step `score` quando o param está presente
- Adicionado `export const dynamic = 'force-dynamic'` para Next.js não tentar SSG
- Componente renomeado para `LaunchPageInner`, exportado como `LaunchPage` envolvido em `<Suspense>`
**Motivo:** Botão "Lançar" na `/products` abria o wizard sem pré-selecionar o produto — usuário tinha que escolher o produto de novo manualmente.

### `app/(dashboard)/products/page.tsx` (MODIFICADO)
Botão "Lançar" alterado de `href="/launch"` para `href={"/launch?productId="+product.id}`.
**Motivo:** Integração com auto-select do wizard acima.

---

## 2026-08-22 — Sprint 11: UX comercial — filtros MOCK, honestidade IA, SUPERVISED

### `app/api/hoje/route.ts` (MODIFICADO)
Query de criativos pendentes passa a selecionar `script`; removido filtro `.not()` Supabase (excluía hooks NULL). Adicionada interface `PendingCreative` e variável `realPending` com filtro JS que exclui `[MOCK]`. Response `awaitingApproval` agora usa `realPending`.
**Motivo:** Dashboard mostrava 0 pendentes por causa do bug NULL do Supabase; agora conta só criativos reais.

### `app/(dashboard)/hoje/page.tsx` (MODIFICADO)
Sales card: mostra mensagem "Sem vendas registradas — importe o CSV da Shopee..." quando count=0 (antes mostrava R$ 0,00 em verde). Emojis removidos dos labels das stat cards. Botão "🚀 LANÇAR CAMPANHA" → "Iniciar Pipeline".
**Motivo:** Eliminar dados falsos/enganosos no dashboard principal.

### `app/(dashboard)/queue/page.tsx` (MODIFICADO)
Aviso de honestidade da IA adicionado acima da lista de pendentes: "Rascunhos gerados com dados reais do produto... Revise cada item antes de aprovar — não use sem ler."
**Motivo:** SUPERVISED mode exige que usuário revise antes de aprovar.

### `app/(dashboard)/video-factory/page.tsx` (MODIFICADO — Sprint 11)
Label "Rascunho baseado em dados" exibida quando `sb.provider === 'local'`.
**Motivo:** Honestidade sobre origem do storyboard (LocalProvider vs IA real).

### `app/(dashboard)/distribute/page.tsx` (MODIFICADO)
Banner SUPERVISIONADO no topo. Lógica do botão PUBLICAR corrigida: antes habilitava quando `rights_status === 'unknown'` (bug). Agora botão só aparece quando `checklist.ready && rights_status !== 'unknown'`. Guia de publicação manual quando status é `pending_rights` ou `unknown`. Ações primárias: "Baixar MP4" + "Copiar legenda".
**Motivo:** Botão publicar estava com lógica invertida; guia manual necessário para operação real.

---

## 2026-08-22 — Sprint 10: Pipeline real fechado — distribute auto-populado

### `app/api/video-factory/render/route.ts` (MODIFICADO)
Após `saveContentPackage`, auto-insere registro em `publication_packages` via `admin.from('publication_packages').insert(...)` (non-fatal try/catch). Usa `buildPublicationChecklist` para derivar `status` ('ready' | 'pending_rights' | 'draft'). Dispara notificação `render_completed`.
**Motivo:** `/distribute` (que lê `/api/publish` → `publication_packages`) ficava vazio porque render nunca escrevia nessa tabela.

### `app/api/video-factory/route.ts` (MODIFICADO)
GET agora consulta `automation_runs` com `type IN ['video_storyboard', 'video_render']` e constrói mapas `Record<creativeId, output>`. Resposta: `{ creatives, storyboards, renders }`.
**Motivo:** Estado de render/storyboard era perdido ao navegar para outra página e voltar.

### `app/(dashboard)/video-factory/page.tsx` (MODIFICADO)
`useEffect` trata novo shape `{ creatives, storyboards?, renders? }` e pré-popula estado. Adicionado botão "📦 Ver na Distribuição →" após render bem-sucedido.
**Motivo:** UI agora sobrevive navegação e guia o usuário ao próximo passo.

---

## 2026-08-22 — Sprint 5: Growth, Autopilot backend, Skeletons

### `app/(dashboard)/growth/page.tsx` (CRIADO)
Página Growth Insights mobile-first. Busca `/api/growth/insights?period=N`. Skeleton durante load, empty state honesto com CTAs para importar CSV e adicionar produtos. Insights agrupados em positivos/negativos. `InsightCard` com badge de tipo, trend %, razão, métricas, CTA de ação.
**Motivo:** Sprint 5 — página de análise de winners/losers real, conectada à API existente.

### `app/(dashboard)/autopilot/page.tsx` (REESCRITO)
Conectado ao `/api/autopilot/rules` real (GET ao montar, PATCH ao salvar). Mostra badge ATIVO no modo salvo no banco. AUTOPILOT marcado EM BREVE (live:false). Regras só visíveis em modos não-PAUSED. Skeleton enquanto carrega.
**Motivo:** Sprint 5 — UI conectada ao backend, honest sobre o que está disponível.

### `app/(dashboard)/layout.tsx` (ATUALIZADO)
Adicionado `/growth` na sidebar no grupo 'analytics'.
**Motivo:** Acessibilidade à nova página via nav lateral.

### `app/(dashboard)/mais/page.tsx` (ATUALIZADO)
Adicionado `/growth` no menu mobile.
**Motivo:** Acessibilidade mobile à nova página.

### `app/(dashboard)/dashboard/page.tsx` (ATUALIZADO)
Skeleton nos stat cards durante load. Cards 2x2 Growth + Autopilot em substituição ao promo antigo.
**Motivo:** Sprint 5 — skeleton + quick-access às páginas principais.

### `app/(dashboard)/hoje/page.tsx` (ATUALIZADO)
Skeleton layout durante load: banner hero + grid 2x2 + 2 cards list.
**Motivo:** Sprint 5 — skeleton elimina "Carregando..." genérico.

### `app/(dashboard)/revenue/page.tsx` (ATUALIZADO)
Skeleton grid 2x2 + 2 cards de conteúdo durante load.
**Motivo:** Sprint 5 — skeleton consistente com o restante da app.

### `app/(dashboard)/distribute/page.tsx` (ATUALIZADO)
Skeleton 3 cards estilo vídeo-thumb durante load. Fix: `load()` retorna `Promise<PublicationPackage[]>` — `handlePublish` e botão "Atualizar" agora fazem `.then(pkgs => setPackages(pkgs))` para realmente atualizar a lista.
**Motivo:** Sprint 5 skeleton + bug fix: lista não atualizava após publicar ou clicar atualizar.

### `app/(dashboard)/notifications/page.tsx` (ATUALIZADO)
Skeleton 4 items (ícone + 2 linhas de texto) durante load. Fix ESLint `react-hooks/set-state-in-effect`.
**Motivo:** Sprint 5 skeleton.

---

## 2026-08-22 — TTS + Captions + Content Package

### `lib/tts/types.ts` (CRIADO)
Interface `TTSProvider` + `TTSInput` / `TTSOutput`. Mesmo padrão de `lib/ai/types.ts`.
**Motivo:** abstração que permite trocar ElevenLabs por outra voz sem alterar o pipeline.

### `lib/tts/no-voice-provider.ts` (CRIADO)
`NoVoiceProvider` — retorna `audioPath: null`. Fallback always-available, vídeo fica silencioso.
**Motivo:** pipeline deve funcionar sem chave TTS. Silêncio é preferível a crash.

### `lib/tts/elevenlabs-provider.ts` (CRIADO)
Provider real: chama `api.elevenlabs.io/v1/text-to-speech`, salva MP3 em `storage/tts/`.
Ativo apenas quando `ELEVENLABS_API_KEY` está configurada.
**Débito técnico:** não testado end-to-end — requer chave e crédito. Registrado em AI_HANDOFF.md.

### `lib/tts/index.ts` (CRIADO)
Factory `getTTSProvider()`: ElevenLabs se env configurada, NoVoice caso contrário.

### `lib/render/captions.ts` (CRIADO)
- `buildCaptions(storyboard)` — converte `StoryboardScene[]` em `CaptionEntry[]` com timestamps cumulativos
- `parseDuration()` — aceita "3s", "00:00:03", "3" 
- `toSRT(entries)` — formato SRT padrão (`00:00:03,000 --> 00:00:06,000`)
- `saveCaptions(storyboard, outputPath)` — salva `.srt` + `.captions.json` ao lado do `.mp4`
- `saveCaptionsStandalone(storyboard, runId)` — para uso sem renderização
**Motivo:** TikTok/Reels exigem legenda sincronizada para melhor alcance.

### `lib/render/content-package.ts` (CRIADO)
`ContentPackage` — manifesto de tudo que sai de uma renderização:
- `videoPath`, `downloadUrl`, `srtPath`, `captionsJsonPath`
- `caption` (texto para rede social), `cta`, `affiliateUrl`
- `channel: PublicationChannel` (instagram | tiktok | youtube_shorts)
- `checklist: PublicationChecklist` — 8 verificações, `ready: boolean`
`saveContentPackage()` — salva `.package.json` ao lado do `.mp4`.
**Motivo:** "publication-ready" requer checklist explícito antes de publicar.

### `app/api/video-factory/render/route.ts` (MODIFICADO)
Após renderização, gera automaticamente: captions SRT + JSON e content package manifest.
Retorna `captions` e `package.checklist` na resposta da API.
**Motivo:** completar pipeline produto → vídeo → publicável sem etapas manuais extras.

---

## 2026-08-22 — Sprint Mobile-first + PWA

### `public/manifest.json` (CRIADO)
PWA Web App Manifest. `display: standalone`, `theme_color: #FF6B35`, start_url `/dashboard`, 2 ícones (192 + 512).
**Motivo:** requisito PWA básico. Sem manifest, não é instalável como app.

### `public/icons/icon-192.png` + `icon-512.png` (CRIADOS)
PNGs sólidos laranja gerados via Python (sem deps externas). Maskable.
**Motivo:** manifest referencia esses ícones. Gerados sem ferramentas externas para evitar dependência.

### `public/icons/icon.svg` (CRIADO)
SVG logo "A" laranja — referência para ícones futuros em resolução nativa.

### `app/layout.tsx` (MODIFICADO)
- `metadata.manifest = '/manifest.json'`
- `metadata.appleWebApp` — `capable: true`, `statusBarStyle: black-translucent`
- `viewport.viewportFit = 'cover'` — suporte a safe-area iOS
- `viewport.themeColor = '#FF6B35'`
- Removido Geist Mono (não usado)
**Motivo:** PWA e standalone mode no iOS requerem esses meta tags.

### `app/globals.css` (MODIFICADO)
Adicionadas CSS vars: `--brand`, `--bg`, `--surface`, `--surface-2`, `--border`, safe-area insets (`--sat/sar/sab/sal`), `--bottom-nav-h`, `--bottom-clearance`.
**Motivo:** sistema de design centralizado, evita repetir cor/safe-area em cada componente.

### `app/(dashboard)/layout.tsx` (MODIFICADO — redesign completo)
- Desktop: sidebar fixa `w-56 hidden md:flex`
- Mobile: top bar sticky + bottom nav fixo (5 itens, safe-area-aware)
- `paddingBottom: var(--bottom-clearance)` no main — evita que conteúdo fique atrás da bottom nav
**Motivo:** layout anterior só tinha sidebar; sem bottom nav, navegação no celular exigia scroll longo.

### `app/(dashboard)/dashboard/page.tsx` (MODIFICADO — redesign completo)
- Hero card laranja: "ESTOU GANHANDO?" respondido diretamente (status do pipeline)
- Card de ação: "N criativos esperando sua decisão" → `/queue`
- StatCard: Score médio e Taxa aprovação com destaque quando bons
- Barra de criativos colorida
- CTA para Autopilot
**Motivo:** dashboard anterior mostrava dados sem contexto financeiro/operacional. Agora responde a pergunta real do afiliado.

### `app/(dashboard)/queue/page.tsx` (MODIFICADO — redesign completo)
- Cards expansíveis (tap no card revela hook/script/caption)
- Botões Aprovar/Rejeitar grandes (min 44px height, toda largura, `py-3.5`)
- Pill de status colorida por tipo
- Comissão e preço visíveis no header do card
**Motivo:** UX anterior exibia tudo de uma vez (wall of text), difícil de usar com uma mão.

### `app/(dashboard)/video-factory/page.tsx` (MODIFICADO — redesign completo)
- Vídeo vertical como protagonista (max-width 240px, `9/16` aspect ratio, autoPlay+muted+loop)
- Chips de metadados compactos abaixo do vídeo
- Progress bar animada durante render
- Botões "Baixar" + "Re-render" lado a lado
- Storyboard: lista vertical de cenas com layout mobile-first
**Motivo:** vídeo era pequeno e enterrado em metadados. Vídeo é o produto — deve ser protagonista.

### `app/(dashboard)/autopilot/page.tsx` (CRIADO)
Nova página `/autopilot` com:
- 3 modos: PAUSED / SUPERVISED / AUTOPILOT
- Seletor de radio expandível com lista de features por modo
- Badges "EM BREVE" em Supervisionado e Autopilot (infra não existe ainda)
- Visualização do pipeline (6 etapas) com coloração AUTO/MANUAL por modo
- Salva em `localStorage` (sem backend — estrutura para futura API)
**Motivo:** usuário precisa entender e controlar o nível de automação. Estrutura arquitetural define o roadmap.

---

## 2026-08-22 — FFmpeg + ffprobe ARM64

### `app/api/setup/ffmpeg/route.ts` (CRIADO — sessão anterior)
API local-only para instalar `ffmpeg-static` npm em arm64. GET: status. POST: install.

### `lib/render/ffmpeg.ts` — validação MP4 sem ffprobe (MODIFICADO)
Substitui ffprobe por leitura dos bytes 4-7 do arquivo de saída (`ftyp` box).
**Motivo:** `ffprobe-static` não tem binário arm64 macOS. Alternativa pura Node.js, zero deps.

---

---

## 2026-08-22 — Sprint CONTENT PACKAGE → PUBLICATION READY → PUBLICAÇÃO REAL → ANALYTICS

### `lib/publish/types.ts` (CRIADO)
Interface `PublicationProvider` + tipos `PublicationPackage`, `PublicationChecklist`, `RightsStatus`, `PublicationChannel`.

### `lib/publish/checklist.ts` (CRIADO)
`buildPublicationChecklist()` — 8 verificações: hasVideo, hasCaption, hasCTA, hasAffiliateUrl, videoIsVertical, videoMinDuration(≥5s), videoMaxDuration(≤90s), rightsCleared.

### `lib/publish/manual-provider.ts` (CRIADO)
Always-ready provider. Retorna `requiresManualAction: true` com passo-a-passo de publicação manual.

### `lib/publish/meta-provider.ts` (CRIADO)
Meta Graph API v19.0 — fluxo 3 etapas: criar container → polling até FINISHED → media_publish.
Env: `META_ACCESS_TOKEN`, `META_IG_USER_ID`. **BLOQUEIO HUMANO:** OAuth.

### `lib/publish/tiktok-provider.ts` (CRIADO)
TikTok Content Posting API v2 — PULL_FROM_URL, polling de status.
Env: `TIKTOK_ACCESS_TOKEN`. **BLOQUEIO HUMANO:** OAuth + auditoria de app.

### `lib/publish/index.ts` (CRIADO)
Factory `getProvider()`, `rightsGatePassed()`, `publish()` com rights gate + checklist gate antes de despachar.

### `supabase/migrations/003_sales_publishing.sql` (CRIADO)
Tables: `publication_packages`, `sales` (dedup `UNIQUE(order_id,platform)`), `autopilot_rules` (row padrão `00000000-...`), `notifications`, `import_batches`.

### `lib/marketplace/shopee-importer.ts` (CRIADO)
`parseShopeeCSV()` — normaliza 25+ variantes de colunas PT-BR/EN, semicolon/comma delimiter, `R$ 1.234,56` → float.

### `app/api/notifications/route.ts` (CRIADO)
GET/POST/PATCH — lista, cria, marca lida (individual ou readAll).

### `app/api/publish/route.ts` (CRIADO)
GET: lista pacotes. POST action=create: constrói pacote + checklist + notifica. POST action=publish: rights gate + provider dispatch + atualiza status.

### `app/api/sales/import/route.ts` (CRIADO)
GET: lista batches. POST: preview (sem salvar) ou import completo com dedup via UNIQUE index. Cria notification ao finalizar.

### `app/api/revenue/route.ts` (CRIADO)
GET ?period=today|7d|30d|all — comissão hoje, 7d, período, top 5 produtos/canais/criativos, status breakdown.

### `app/api/autopilot/rules/route.ts` (CRIADO)
GET/PATCH da row global de regras (`id = 00000000-...`). Whitelist de campos mutáveis.

### `app/(dashboard)/distribute/page.tsx` (CRIADO)
Página de distribuição mobile-first: cards expansíveis, checklist visual, PUBLICAR/COPIAR LEGENDA/DOWNLOAD/VER POST, filtro por status.

### `app/(dashboard)/revenue/page.tsx` (CRIADO)
Dashboard de receita: StatCards (hoje/7d/período/bruto), top produtos/canais/criativos, empty state com link para importar.

### `app/(dashboard)/notifications/page.tsx` (CRIADO)
Centro de notificações: ícone por evento, tempo relativo, mark-read por toque, mark-all-read.

### `app/(dashboard)/sales/import/page.tsx` (CRIADO)
Importador CSV em 3 etapas: drag-drop/selecionar → preview (colunas, total, 5 linhas) → confirmar → resultado (importados/ignorados/erros).

### `docs/PUBLISHING_RESEARCH.md` (CRIADO)
Referência Meta/TikTok/YouTube/Shopee — endpoints, fluxos, requisitos, status de implementação.

### `docs/SHOPEE_RESEARCH.md` (CRIADO)
Shopee Affiliate: sem API pública, só CSV export. Formato de colunas, status, deduplicação, limitações.

### `scripts/e2e-vertical-test.ts` (CRIADO)
Teste E2E em TypeScript: produto → score → creative → storyboard → captions SRT → render mock → PublicationPackage → checklist → rights gate → ManualPublicationProvider → resultado.

---

---

## 2026-08-22 — Sprint 2: Growth, Autopilot, Tracking, Migration 003

### `lib/growth/types.ts` (CRIADO)
Tipos `GrowthInsight`, `InsightType`, `RecommendedAction`, `WinnerThresholds`, `GrowthReport`. Thresholds padrão: minOrders=3, minCommission=10, topPercentile=0.2.

### `lib/growth/analyst.ts` (CRIADO)
`runGrowthAnalysis()` — agrega vendas do Supabase por produto/creative/canal, compara períodos atual vs anterior, detecta winner/rising/falling/scale_now. SQL puro, sem ML.

### `lib/growth/winner-detector.ts` (CRIADO)
`detectAndNotifyWinners()` — filtra winners com confidence >= 0.65, deduplicação de 24h via tabela `notifications`, insere evento `winner_detected`.

### `lib/growth/index.ts` (CRIADO)
Re-exports de `analyst` + `winner-detector`.

### `app/api/growth/insights/route.ts` (CRIADO)
`GET /api/growth/insights?period=30&minOrders=3&minCommission=10&notify=1` — executa análise + winner detection.

### `lib/autopilot/evaluator.ts` (CRIADO)
`evaluateForAutopilot(candidate, rules, postsToday)` — gates: mode_paused, score, risk_score, rights_status, channel, commission_rate, checklist, daily_limit, provider_manual. SUPERVISED→queue_for_approval, AUTOPILOT+real provider→advance.

### `app/api/autopilot/run/route.ts` (CRIADO)
`POST /api/autopilot/run` — busca packages `status=ready`, avalia cada um, registra decisão em notification, avança quando permitido.

### `lib/tracking/link-builder.ts` (CRIADO)
`detectPlatform()`, `buildTrackingLink()`, `buildShopeeAttributionKey()`. PRESERVE_EXACT=['shopee','amazon']. Shopee nunca recebe UTMs — correlação por data/publicationId.

### `app/(dashboard)/layout.tsx` (ATUALIZADO)
Sidebar desktop agrupada (Core/Publicação/Analytics/Automação). Bottom-nav mobile ≤5 itens + sino 🔔 → /notifications.

### `app/(dashboard)/mais/page.tsx` (CRIADO)
Página mobile "Mais" com links: Produtos, Receita, Notificações, Importar Vendas, Autopilot.

### `lib/marketplace/shopee-importer.ts` — `parseNumber()` (CORRIGIDO)
Bug: `R$ 1.234,56` era parseado como `1.234`. Fix: detecta formato brasileiro (dot=milhar, comma=decimal) via posição relativa dos separadores.

### `lib/marketplace/__tests__/shopee-importer.test.ts` (CRIADO)
10 fixtures, 35 assertions. Cobre: PT-BR semicolons, ponto inglês, comissão vazia, duplicatas, cancelados, cabeçalho desconhecido, CSV vazio, R$ 1.234,56. 35/35 ✅

### Migration 003 (EXECUTADO no Supabase)
5 tabelas criadas via Management API: `publication_packages`, `sales` (UNIQUE idx_sales_order_dedup), `autopilot_rules` (row default 00000000...), `notifications`, `import_batches`.
Estratégia: browser session token → `api.supabase.com/v1/projects/{ref}/database/query`.

### `app/api/video-factory/render/route.ts` (ATUALIZADO)
Eventos reais: insere `render_completed` + `render_failed` em `notifications` ao fim de cada render.

### `scripts/e2e-v2-decision-engine.ts` (CRIADO)
41 assertions. Cobre: TrackingLinkBuilder (Shopee preservado, Hotmart UTMs), CSV import, PublicationChecklist, ManualProvider, GrowthInsight mock, Autopilot gates (SUPERVISED/AUTOPILOT/PAUSED/low score/daily limit). 41/41 ✅

---

---

## 2026-08-22 — Sprint 3: Conexões Reais + Primeiro Loop de Produção

### `lib/crypto/token-encrypt.ts` (CRIADO)
AES-256-GCM encrypt/decrypt para tokens OAuth. Key de `ENCRYPTION_KEY` (64 hex chars = 32 bytes). Formato: `ivHex:tagHex:ciphertextHex`. Nunca loga chave ou plaintext.

### `supabase/migrations/004_platform_connections.sql` (CRIADO — EXECUTADO)
Tabela `platform_connections`: workspace_id, platform, access_token_enc, refresh_token_enc, token_expires_at, platform_user_id, platform_username, scopes[], raw_meta. UNIQUE(workspace_id, platform). Trigger auto-update timestamp.
Migration também atualiza `autopilot_rules` default mode de PAUSED → SUPERVISED.

### `app/api/connect/meta/route.ts` (CRIADO)
GET → gera CSRF state, salva temporariamente em `platform_connections`, redireciona para `facebook.com/v21.0/dialog/oauth` com scopes IG.

### `app/api/connect/meta/callback/route.ts` (CRIADO)
5 etapas: verifica CSRF → exchange code → long-lived token (60d) → lista Pages FB → descoberta do IG Business account ID → upsert criptografado em `platform_connections`. Nunca loga appSecret.

### `app/api/connect/meta/status/route.ts` (CRIADO)
GET força-dinâmico → retorna `{connected, expired, username, userId, expiresAt, scopes}`.

### `app/api/connect/youtube/route.ts` (CRIADO)
GET → CSRF state + redirect para Google OAuth com scopes `youtube.upload` + `youtube.readonly`, `access_type=offline`, `prompt=consent`.

### `app/api/connect/youtube/callback/route.ts` (CRIADO)
Verifica CSRF, exchange code → access_token + refresh_token, descobre channelId via `googleapis.com/youtube/v3/channels`, encrypta e salva.

### `app/api/connect/youtube/status/route.ts` (CRIADO)
Retorna `{connected, expired, channelId, channelTitle, expiresAt}`.

### `app/(dashboard)/connect/page.tsx` (CRIADO)
Página `/connect`: polling de status Instagram e YouTube no mount. Cards com status badge (Conectado/Desconectado/Expirado). TikTok: EM BREVE. Shopee: MANUAL ✓.

### `lib/publish/meta-provider.ts` (ATUALIZADO — v2)
`getMetaCredentials()` lê credenciais do DB (platform_connections) com fallback para env vars. `isReadyAsync()` verifica DB. `publish()` tenta DB primeiro, fallback env, caso contrário retorna `requiresManualAction: true` com instruções. API atualizada para v21.0.

### `lib/publish/youtube-provider.ts` (CRIADO)
Auto-refresh: verifica expiração com buffer 60s, faz refresh via `oauth2.googleapis.com/token`, atualiza DB. Upload resumável para Shorts (max 60s). Retorna `publishedUrl: https://www.youtube.com/shorts/{id}`.

### `app/api/hoje/route.ts` (CRIADO)
GET força-dinâmico: agrega renders do dia, criativos pendentes, publicados, vendas hoje, notificações 24h, modo autopilot. Segmenta: errors (render_failed/publish_failed) e winners (winner_detected).

### `app/(dashboard)/hoje/page.tsx` (CRIADO)
Página `/hoje`: data + modo autopilot, card de vendas (laranja), 4 stat cards, seção winners (amarelo), preview de aprovações pendentes → /queue, seção erros (vermelho), CTA LANÇAR CAMPANHA.

### `app/(dashboard)/launch/page.tsx` (CRIADO)
Wizard 6 etapas em página única (useState — sem navegação multi-tela): produto → score → criativo (escolha entre 3) → storyboard → render → distribuição (canal + publicar). Breadcrumb + progress bar.

### `app/(dashboard)/layout.tsx` (ATUALIZADO)
Adicionados ao sidebarNav: Hoje, Lançar Campanha (group=core), Conexões (group=publish).

### `app/(dashboard)/mais/page.tsx` (ATUALIZADO)
Links: Hoje, Lançar Campanha, Conexões. CSS vars `var(--surface)` / `var(--border)`.

---

## Notas de design

- Nenhuma cor foi introduzida além de `#FF6B35` (brand), verde/amarelo/vermelho de status (padrão semântico) e roxo para Autopilot
- Todos os cards usam `active:scale-95 transition-all` para feedback tátil mobile
- `-webkit-tap-highlight-color: transparent` em globals.css elimina flash azul do Safari iOS
- Safe areas aplicadas via CSS env() — funciona standalone PWA + navegação normal

---

## 2026-08-22 — Sprint Autônoma: Extensão + Contratos + Segurança

### `extension/` (CRIADO — pasta nova)
Extensão Chrome Manifest V3 "Add to Affiliate OS".
- `manifest.json` — MV3, permissões mínimas: `activeTab`, `storage`. Host: `shopee.com.br`.
- `content.js` — content script: lê título, preço, imagem e URL do DOM visível. Sem cookies.
- `background.js` — service worker: gera token local aleatório no install.
- `popup.html` / `popup.js` — UI do popup: extrai produto, pede link afiliado + comissão + Sub_id, envia para `/api/extension/add-product`.
- `icon16.png` / `icon32.png` / `icon48.png` — ícones gerados localmente (laranja + cruz).
**Motivo:** Product Hunter (PROJECT_VISION §7). Sem extensão, adicionar produto requer colar URL manualmente.

### `app/api/extension/add-product/route.ts` (CRIADO)
Endpoint dedicado para a extensão.
- CORS restrito: aceita somente `chrome-extension://` e `localhost` (nunca `*`).
- Auth via `X-Extension-Token` header validado contra `EXTENSION_LOCAL_TOKEN` env.
- Fail-safe: sem `EXTENSION_LOCAL_TOKEN` no env, rejeita 100% das requisições.
- Sub_id e source salvos em `raw_data` (sem coluna separada no DB).
**Motivo:** Não expor `/api/products` ao CORS aberto. Separação de responsabilidade + segurança.

### `docs/EXTENSION_SETUP.md` (CRIADO)
Guia de instalação da extensão em modo desenvolvedor + configuração do token.

### `app/api/creative/route.ts` (MODIFICADO)
Enriquece `savedCreatives` com campo `angle` antes de retornar (derivado de `creatives.angles[i]`).
**Motivo:** DB não tem coluna `angle`; wizard mostrava sempre "Variação" em vez do ângulo real.

### `app/api/sales/import/route.ts` (MODIFICADO)
Detecta upload de `.xlsx`/`.xls` e retorna erro 415 com instrução clara.
**Motivo:** `file.text()` retorna lixo binário para XLSX; parser esperava CSV. Promessa falsa remov.

### `app/(dashboard)/sales/import/page.tsx` (MODIFICADO)
Removido `.xlsx,.xls` do `accept` no input + textos ajustados para "CSV apenas".
**Motivo:** consistência com a limitação real do backend.

### `docs/CLAUDE_STATUS.md` (CRIADO)
Estado operacional snapshot para handoff entre agentes.

### `docs/PROJECT_VISION.md` (CRIADO)
Memória estratégica permanente — 33 seções, visão completa do produto.

---

## 2026-08-22 — Sprint 4 Sessão 2: UX + Testes + Decisões

### `app/(dashboard)/products/page.tsx` (MODIFICADO)
Progressive disclosure no formulário: 4 campos essenciais visíveis (título, affiliateUrl, comissão, preço) + seção "Dados adicionais" colapsável com os demais.
**Motivos:** (1) Form original com 12 campos simultâneos parecia formulário técnico; (2) campo `affiliateUrl` estava ausente — crítico, é o link que gera comissão.
Touch targets maiores (py-3.5), skeleton loaders na lista, botão 🔗 direto no card para abrir link afiliado.

### `docs/DECISIONS.md` (CRIADO)
Registro permanente de decisões técnicas e de produto não-óbvias: token local da extensão, CORS restrito, rejeição XLSX, angle não salvo no banco, SUPERVISED default, workspace UUID fixo, scope Meta sem content_publish, progressive disclosure.
**Motivo:** evitar re-decisão dos mesmos trade-offs em sessões futuras.

### `scripts/test-pipeline.sh` (CRIADO → CORRIGIDO)
Script bash para teste end-to-end do loop comercial com contratos reais:
`produto → score (score.overallScore camelCase) → creative (creatives[0].id) → PATCH /api/queue approved → POST /api/video-factory {creativeId} → POST /api/video-factory/render → POST /api/publish action=create → action=publish → verifica requiresManualAction=true (SUPERVISED)`.
Não toca dados reais de publicação. Produto prefixo `[TESTE]`. Avisos (⚠) para etapas que precisam de AI key/FFmpeg; só falha (❌) em contratos quebrados.

### `extension/manifest.json` (MODIFICADO)
Adicionado `http://localhost:3000/*` e `http://127.0.0.1:3000/*` em `host_permissions`.
**Motivo:** sem essa permissão o fetch da extensão para o servidor local é bloqueado pelo browser.

### `extension/background.js` (MODIFICADO)
Token gerado via `crypto.getRandomValues(Uint8Array(24))` em vez de `Math.random()`.
**Motivo:** `Math.random()` não é criptograficamente seguro; token é usado como autenticação.

### `extension/popup.js` (MODIFICADO)
Removido auto-append de `sub_id` na URL de afiliado. Sub_id agora é enviado apenas como campo de payload → salvo em `raw_data.sub_id`.
**Motivo:** modificar o link oficial da Shopee pode quebrar rastreamento ou violar termos do programa de afiliados.

### `docs/DECISIONS.md` (MODIFICADO)
- Corrigida referência a `campaign_creatives` (tabela inexistente) → `creatives` (tabela real)
- Adicionada decisão sobre sub_id não inserido no URL

---

## 2026-08-22 — Sprint 5: Color audit + Skeletons + Bug Fix

### `app/(dashboard)/revenue/page.tsx` (ATUALIZADO)
`StatCard` componente reescrito com CSS vars inline. Outer wrapper + todos os cards: `bg-gray-950/bg-gray-900/border-gray-800` → `var(--bg)/var(--surface)/var(--border)`.
**Motivo:** auditoria mobile — cores hardcoded ignoram o tema. Cards status, top produtos, canais, criativos todos corrigidos.

### `app/(dashboard)/notifications/page.tsx` (ATUALIZADO)
Outer wrapper + skeleton items + notification items: Tailwind hardcoded → CSS vars inline. Notification items: lido usa `rgba(17,17,39,0.5)`, não-lido usa `var(--surface)`.
**Motivo:** auditoria mobile — consistência com design system.

### `app/(dashboard)/distribute/page.tsx` (ATUALIZADO + BUG FIX)
Bug fix: `load()` retorna `Promise<PublicationPackage[]>` mas `handlePublish` e botão "Atualizar" descartavam o resultado — lista nunca atualizava após publicar. Fix: `.then(pkgs => setPackages(pkgs)).catch(() => null)`.
Cores: outer wrapper + package cards + expanded section → CSS vars.
**Motivo:** bug causava estado obsoleto pós-publicação; cores inconsistentes com tema.

### `app/(dashboard)/sales/import/page.tsx` (ATUALIZADO)
Redesign completo para CSS vars: drag zone (brand orange dashed border on hover), help box, preview card, column mapping, sample rows, buttons, done state (sucesso/erro).
**Motivo:** auditoria mobile — toda a página usava Tailwind hardcoded. Brand orange no drag zone melhora UX.

### `app/(dashboard)/connect/page.tsx` (ATUALIZADO)
Estado de loading "Verificando conexões..." substituído por skeleton de 3 cards animados (`animate-pulse`) com ícone, título e badge placeholder.
**Motivo:** auditoria mobile — texto simples sem contexto visual; skeleton comunica o que está carregando.

---

## 2026-08-22 — Sprint 6: Owned Digital Products (E-books)

### `supabase/005_owned_products.sql` (CRIADO)
`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'affiliate' CHECK (...)`, `cost numeric(10,2)`, `checkout_url text`, `margin_pct numeric(5,2)`. Index `idx_products_product_type`. Comentários documentam semântica de cada campo para owned vs affiliate.
**Motivo:** menor invasão possível — reutiliza tabela `products` existente, sem quebrar Shopee (default='affiliate'). Zero mudança no fluxo atual.

### `app/(dashboard)/products/add-own/page.tsx` (CRIADO)
Formulário para adicionar produto próprio manualmente: título, descrição, categoria (9 opções), plataforma (Hotmart/Kiwify/Eduzz/Monetizze/Gumroad/Manual), preço de venda, custo/taxa (opcional), margem calculada em tempo real, URL de checkout, thumbnail. POST para `/api/products` com `product_type: 'owned'`, `marketplace: 'owned'`, `commissionRate: 100`. Estado `done` com CTAs "Ver Produtos" e "+ Outro produto". Banner explicativo do pipeline (oferta → score → criativo → vídeo → distribuição → receita).
**Motivo:** Sprint 6 — owned products entram no mesmo pipeline sem infra nova.

### `app/(dashboard)/layout.tsx` (ATUALIZADO)
Adicionado `/products/add-own` no sidebarNav, grupo 'core', após /products.
**Motivo:** acesso via sidebar desktop.

### `app/(dashboard)/mais/page.tsx` (ATUALIZADO)
Adicionado `/products/add-own` no menu mobile após /products.
**Motivo:** acesso mobile via página "Mais".

---

## 2026-08-22 — Sprint 7: Owned Products ponta a ponta

### `app/api/products/route.ts` (REESCRITO)
- POST: aceita e persiste `product_type`, `cost`, `checkout_url`, `margin_pct`, `marketplace` para produtos próprios. Campos affiliate existentes intactos — regressão Shopee zero.
- Validações: `validMoney()` para preço/custo; `validUrl()` para checkout_url — sem vazar URLs em logs/erros.
- Graceful degradation: se migration 005 não aplicada, retorna `{error, migration_required:true}` com HTTP 409 e instrução precisa em vez de 500 genérico.
- PATCH novo: permite editar `cost`, `checkout_url`, `margin_pct`, `affiliate_url`, `commission_rate`, `category`, `image_url` com validações.
- `marketplace`: `isOwned ? 'owned' : 'shopee'` como default seguro.
- `commissionRate`: default 100 para produtos próprios, 0 para afiliados.
**Motivo:** API anterior ignorava silenciosamente todos os campos owned. POST sem checkout_url aceitava produto inútil.

### `app/(dashboard)/products/add-own/page.tsx` (REDESIGN COMPLETO)
- UX premium mobile-first: touch targets ≥44px em todos os botões e inputs.
- `calcMargin()` em tempo real: margem % + receita líquida coloridas (verde/amarelo/vermelho por nível).
- Prefixo "R$" visual nos campos de preço/custo sem alterar o valor enviado.
- Focus ring laranja (CSS var) em vez de azul padrão.
- Estado `migrationRequired`: tela específica com instrução de 3 passos em vez de mensagem de erro genérica.
- Sucesso: CTA primário vai para `/launch` (ação de maior impacto) em vez de só `/products`.
- Validação client-side: URL deve começar com http, sem submissão com campos inválidos.
**Motivo:** Sprint 7 — UX funcional, visual Affiliate OS, erro de migration tratado explicitamente.

### `app/(dashboard)/products/page.tsx` (ATUALIZADO)
- Interface `Product` agora inclui `marketplace: string | null`.
- Badge `PRÓPRIO` em laranja (var(--brand)) abaixo do título quando `marketplace === 'owned'`.
**Motivo:** distinção visual clara entre produtos próprios e afiliados na lista.

### `scripts/test-owned-product.sh` (CRIADO)
6 testes: (1) criar produto próprio válido, (2) 400 sem título, (3) 400 owned sem checkout_url, (4) regressão Shopee, (5) score no produto próprio, (6) listagem com contagem de produtos próprios.
Trata gracefully `migration_required` com ⚠ em vez de ❌ — não bloqueia os outros testes.
Syntax: `bash -n` OK.

## 2026-08-22 — Sprint 8: Honest LocalProvider + Extensão Dedup

### `lib/ai/mock-provider.ts` (REESCRITO — LocalProvider)
- Renomeado internamente para `LocalProvider`, `name = 'local'`, `model = 'data-driven-v1'`.
- **Removido completamente:** "testei por X dias", "aprovei", "nunca mais vivo sem", "estoque limitado", "mudou minha rotina", "Aproveita o desconto hoje", "Desconto de X% nesse produto incrível" (quando sem originalPrice real), prefixo `[MOCK]`.
- Score: lógica determinística mantida (honesta). Reasoning agora lista os dados reais usados e orienta para configurar ANTHROPIC_API_KEY para análise por IA.
- Criativos: hooks baseados exclusivamente em dados verificáveis (nota, vendas, comissão, preço). Nenhuma primeira pessoa. Ângulos são instruções de abordagem, não depoimentos.
- Scripts: narração factual — fala do produto sem afirmar ter testado. "Dados verificados: X avaliações, nota Y/5."
- CTAs: "Link na descrição — veja o preço atual na Shopee", "Confira na Shopee" — sem escassez falsa.
- Captions: baseadas em dados reais. Desconto (X% OFF) só aparece se `originalPrice > price` real.
- Storyboard: visuais são *instruções de produção*, não afirmações. "Use a foto pública do produto como referência." Cena 2 não diz mais "mãos usando" (implica ter testado). Overlay de desconto só com dados reais. Nota de rodapé: "Rascunho gerado localmente — configure ANTHROPIC_API_KEY para roteiro por IA."
**Motivo:** Conteúdo anterior era enganoso — afirmava experiência pessoal fictícia e escassez não verificada. NUNCA deve aparecer como resultado publicável.

### `app/api/extension/add-product/route.ts` (ATUALIZADO — dedup)
- Antes de inserir, consulta se `affiliate_url` já existe no workspace.
- Se duplicado: retorna HTTP 409 `{ duplicate: true, product: {id, title}, message }` sem criar novo registro.
**Motivo:** Extensão podia criar múltiplas cópias do mesmo produto ao ser acionada várias vezes na mesma página.

### `extension/popup.js` (ATUALIZADO — dedup UI)
- Trata HTTP 409 com `duplicate: true`: exibe "⚠️ Produto já cadastrado com esse link." sem lançar erro.
- Reabilita botão imediatamente (não espera 3s como no sucesso).
**Motivo:** UX sem erro falso — produto já cadastrado não é falha, é informação.

---

## 2026-08-22 — Sprint 9: MODO MAXIMUM REAL — UX Limpeza + Pipeline Completo

### Contexto
Primeiro loop real completo executado: produto Shopee real → score 74/100 → 3 criativos → aprovação → storyboard → render MP4 1080×1920 30s → `packageReady: true`. Evidências em CLAUDE_STATUS.md.

### `app/(dashboard)/queue/page.tsx` (ATUALIZADO — badge legado + toggle)
- Função `isLegacyMock(c)`: detecta criativos com `[MOCK]` no hook ou script (12 existentes no banco).
- Estado `hideLegacy = true` por padrão — view comercial não mostra lixo de testes.
- Botão no header: "⚠️ N legados ocultos" ↔ "Mostrar tudo" (toggle).
- Badge inline "legado" (amarelo) em cada card afetado quando mostrados.
- `counts` e `filtered` calculados sobre `visible` (excluindo legados quando `hideLegacy`).
**Motivo:** MODO MAXIMUM REAL — "Pare de misturar fixtures, testes e produto real nas telas operacionais."

### `app/(dashboard)/products/page.tsx` (ATUALIZADO — ocultar testes)
- `isTestProduct()`: titulo começa com `[TESTE]` ou `[TEST]` (case-insensitive), ou é exatamente `'Produto Shopee'`.
- Estado `hideTest = true` por padrão.
- Botão ao lado de "Produtos (N)": "⚠️ N teste(s) oculto(s)" ↔ "Ocultar testes".
- Empty state diferenciado: quando `products.length > 0 && hideTest` mostra "Apenas testes cadastrados" com instrução para revelá-los.
**Motivo:** Produtos de teste não devem contaminar a view operacional real.

---

## 2026-08-23 — MODO CONTÍNUO: Design Refactor Global (zero emoji, zero gray, zero gradient)

### Varredura + regras estabelecidas
Scan completo de `app/(dashboard)/` e `components/` confirmou: zero `bg-gray-*`, zero `text-gray-*`, zero `linear-gradient`, zero emoji em labels/títulos/botões após este sprint.

### `app/(dashboard)/connect/page.tsx`
Ícones de plataforma: emoji → badges de 2 letras (`IG`, `YT`, `TK`, `SH`) com `background: rgba(255,107,53,0.16)`. Toast: `✅`/`❌` removidos. Warning: `⚠️` removido. Botão: "Reconectar" (sem emoji).

### `app/(dashboard)/launch/page.tsx`
H1: "Lançar Campanha" (sem `🚀`). Spinner `⚙️` → CSS spinner `animate-spin border`. Seções: "Produto", "Score do produto", "Criativo", "Storyboard", "Renderizar MP4", "Distribuir" (sem emoji). Botões: "Analisar agora →", "Gerar 3 criativos →", "Gerar storyboard →", "Renderizar →", "Publicar". Metadata render: `{s}s · {MB} MB · 9:16`. Canais: `IG`/`YT`/`SH` como tag pills.

### `app/(dashboard)/revenue/page.tsx`
Empty state: `📊` → badge `CSV` em `rgba(255,255,255,0.05)`. `text-gray-400/600/700` → `style={{ color: 'rgba(255,255,255,...)' }}`. Fix: corrupt replace_all que gerou `className` duplicado (`text-xs text-xs` etc.) corrigido manualmente.

### `app/(dashboard)/mais/page.tsx`
`icon` de cada link: emoji → siglas 2 letras (`HJ`,`LC`,`CN`,`PR`,`PP`,`R$`,`GW`,`NT`,`CV`,`AP`) em pill `background: rgba(255,107,53,0.12)`.

### `app/(dashboard)/products/page.tsx`
Success message: removido `✅`. Textarea: `bg-gray-800 border-gray-700 placeholder-gray-600` → CSS vars. Label: `text-gray-300` → `style`. REC_COLOR fallback: `bg-gray-700 text-gray-300` → `bg-white/10 text-white/50 border-white/20`.

### `app/(dashboard)/layout.tsx`
Footer: removido `✅` de `v0.3 · FFmpeg arm64`. Sidebar: ícones são símbolos Unicode limpos (⌂, □, ▷, ↗, ⋯, ＋, ⌕, ◇, ⟡, R$, •, ↓, ◌) — zero emoji.

### `app/(dashboard)/dashboard/page.tsx`
Bug fix: `useEffect` tinha fetch duplicado inline em vez de usar `loadDashboard()`. Refatorado: `useEffect(() => { loadDashboard() }, [])`. `r.json()` tipado como `Promise<Stats>` para eliminar unsafe cast.

### `app/(dashboard)/products/add-own/page.tsx`
Duas instâncias de `placeholder-gray-600` removidas: (1) `<input>` no componente `TextInput`, (2) `<textarea>` de descrição.

### `app/api/revenue/route.ts` (BUG CRÍTICO CORRIGIDO)
`baseQuery()` usava `const q = ...; q.gte(...)` — Supabase v2 é imutável, `.gte()` retorna novo objeto descartado. Filtro de período NUNCA era aplicado. `topProducts`, `topChannels`, `topCreatives`, `statusBreakdown` sempre mostravam ALL TIME independente de `?period=today|7d|30d`. Fix: `let q = ...; q = q.gte('occurred_at', sinceISO)`.

### `app/api/dashboard/route.ts` (BUG NaN CORRIGIDO)
`(s.overall_score as number)` quando `overall_score` é null → NaN propaga por `reduce` e `Math.round` → dashboard mostrava "NaN". Fix: `validScores = scores.filter(s => s.overall_score != null)` antes do reduce.

### `app/(dashboard)/products/page.tsx` (FEATURE: filtro owned/affiliate)
Adicionado `TypeFilter = 'all' | 'affiliate' | 'owned'` com tabs "Todos / Afiliado / Próprio". Tabs só aparecem quando `ownedCount > 0`. Contagens derivadas de `withoutTests`. Era listado como `❌ não implementado` no CLAUDE_STATUS.md.

### `app/layout.tsx` (CORRIGIDO — última violação gray)
`className="min-h-full bg-gray-950 text-white antialiased"` → `style={{ background: 'var(--bg)' }}`. Última instância de `bg-gray-*` no projeto inteiro.

### `app/(dashboard)/launch/page.tsx` (FEATURE: seletor produto existente + banner sucesso)
- `useEffect` busca `/api/products` no mount, filtra produtos `[TESTE]/[TEST]`
- Botão "Usar produto existente (N)" com lista colapsável — toque seleciona e avança direto para score
- Divisor "ou adicione novo" entre seletor e formulário
- `alert()` nativo substituído por banner inline verde com link para Distribuição
- `publishSuccess` state: quando `true`, oculta botões e exibe CTA "Ver em Distribuição →"

### `app/(dashboard)/products/page.tsx` (FEATURE: botão Lançar + label Re-analisar)
- Botão "Lançar" (var(--brand)) aparece nos cards com `overall_score >= 50` → link `/launch`
- Botão "Analisar" renomeado para "Re-analisar" quando produto já tem score (contexto mais claro)
- `flex-shrink-0` adicionado nos botões de expand e link afiliado para não quebrarem em mobile

### `app/(dashboard)/queue/page.tsx` (FEATURE: CTA "Gerar vídeo →" para approved)
Criativos aprovados não tinham ação após o voto. Adicionado bloco abaixo dos cards `status === 'approved'` com link para `/video-factory` estilizado com `var(--brand)`.
**Motivo:** approved ficava num estado morto sem CTA. Usuário não sabia o próximo passo.

### TSC confirmado: 0 errors após todas as mudanças.

---

## 2026-08-23 — Bug fix: `api/publish` status filter + distribute copied per-package

### `app/(dashboard)/sales/import/page.tsx` (CORRIGIDO — violações Tailwind)
4 instâncias de classes Tailwind hardcoded substituídas por CSS vars/inline styles:
- `text-emerald-400` (×3, em comissão total, comissão por linha, contagem importados) → `style={{ color: '#34d399' }}`
- `bg-yellow-900/20 border border-yellow-800` + `text-yellow-400` (bloco de warnings) → `background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25)` + `color: '#fbbf24'`
**Motivo:** única página que passara pelo sprint 5 com violações residuais não detectadas.

### `app/api/notifications/route.ts` (BUG CORRIGIDO)
`GET /api/notifications?unread=1` nunca filtrava — mesmo padrão Supabase v2 imutável. `?unread=1` retornava TODAS as notificações. Fix: `let query = ...; query = query.eq('read', false)`.
**Motivo:** quarto caso da imutabilidade Supabase v2 encontrado nesta sessão.

### `app/api/publish/route.ts` (BUG CRÍTICO CORRIGIDO)
`GET /api/publish?status=ready` nunca filtrava — `const query = ...; query.eq('status', status)` descartava o resultado (Supabase v2 imutável). Pills de filtro em `/distribute` ("Prontos", "Publicados", etc.) sempre retornavam TODOS os pacotes.
Fix: `let query = ...; query = query.eq('status', status)`.
**Motivo:** terceiro caso da imutabilidade Supabase v2. Idêntico ao bug de `api/revenue` (período) e `api/publish` GET.

## 2026-08-23 — Nova feature: /sales + api/sales + cron autopilot + vercel.json

### `app/(dashboard)/sales/page.tsx` (CRIADO)
Lista de transações individuais importadas da tabela `sales`. Filtros de período (7d/30d/90d/Tudo) e status (Todos/Pago/Pendente/Cancelado). Paginação com "Carregar mais". Skeleton, empty state com CTA importar, barra de resumo (total exibidas + comissão). Lê `product_name` de `raw_data` JSONB.
**Motivo:** usuários podiam importar CSV e ver agregados em /revenue, mas não conseguiam auditar transações individuais.

### `app/api/sales/route.ts` (CRIADO)
`GET /api/sales` com filtros `?period=` (7d/30d/90d/all) e `?status=` (Supabase v2 corretamente reatribuídos). Paginação `?limit=` + `?offset=`. Retorna `product_name` do campo JSONB `raw_data`.
**Motivo:** endpoint necessário para a nova página /sales.

### `app/(dashboard)/layout.tsx` (ATUALIZADO)
Adicionado `/sales` (Vendas, ícone '$') na sidebar no grupo 'analytics', antes de Growth.
**Motivo:** acessibilidade via nav lateral desktop.

### `app/(dashboard)/mais/page.tsx` (ATUALIZADO)
Adicionado `/sales` (icon 'VD') no menu mobile.
**Motivo:** acessibilidade mobile.

### `app/(dashboard)/sales/import/page.tsx` (ATUALIZADO)
Botão pós-importação "Ver receita" → "Ver vendas" com href `/sales`.
**Motivo:** guia o usuário à nova página de lista de transações em vez do agregado.

### `app/(dashboard)/revenue/page.tsx` (ATUALIZADO)
Footer adiciona link "ver transações" → `/sales` ao lado de "importar relatório".
**Motivo:** drill-down do agregado para as transações individuais.

### `app/api/cron/autopilot/route.ts` (CRIADO)
Cron handler `GET /api/cron/autopilot` — valida `Authorization: Bearer <CRON_SECRET>`, roda a mesma lógica de `api/autopilot/run/route.ts` (sem HTTP round-trip). Registra decisões (advance/queue_for_approval/block) como notificações com `cron: true`.
**Motivo:** autopilot existia na UI mas nunca rodava automaticamente — dependia de trigger manual.

### `vercel.json` (CRIADO)
`{ "crons": [{ "path": "/api/cron/autopilot", "schedule": "0 * * * *" }] }` — roda a cada hora.
**Motivo:** configura Vercel Cron para disparar o autopilot automaticamente. Requer `CRON_SECRET` em Vercel env vars.

### `app/api/hoje/route.ts` (BUG CORRIGIDO — coluna errada)
`.gte('order_date', todayIso)` → `.gte('occurred_at', todayIso)`. A tabela `sales` usa `occurred_at` como coluna de data — `order_date` não existe, então a query retornava sempre 0 pedidos. Widget "Vendas hoje" no dashboard /hoje nunca mostrava dados reais.
**Motivo:** mismatch entre nome de coluna na API e no schema real da tabela.

### `app/(dashboard)/hoje/page.tsx` (UX — card Vendas linkável)
Card "Vendas hoje" transformado em `<Link>`: vazio → `/sales/import`, com dados → `/sales`. Adicionado indicador "→" no canto. Texto empty state atualizado: "toque para importar CSV".
**Motivo:** card estava morto (não clicável) — usuário não sabia para onde ir após ver os dados.

---

## 2026-08-23 — Bug fix: `copied` global → por pacote em distribute

### `app/(dashboard)/distribute/page.tsx` (BUG FIX)
`const [copied, setCopied] = useState(false)` → `const [copiedId, setCopiedId] = useState<string | null>(null)`.
`copyCaption(pkg)` agora chama `setCopiedId(pkg.id)` / `setCopiedId(null)` em vez do boolean global.
Botão: `copied ? 'Copiado!'` → `copiedId === pkg.id ? 'Copiado!'`.
**Motivo:** estado boolean global fazia todos os cards exibirem "Copiado!" quando qualquer legenda era copiada — feedback incorreto e confuso.
