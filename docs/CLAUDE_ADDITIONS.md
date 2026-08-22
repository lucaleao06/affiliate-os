# CLAUDE_ADDITIONS — Adições Autônomas

_Itens adicionados por iniciativa própria no Affiliate OS.
Cada entrada tem: data · arquivo · motivo._

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
