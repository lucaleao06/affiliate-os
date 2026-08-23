# AI_HANDOFF — Affiliate OS v0.4

> **Visão estratégica permanente do projeto:** ver `docs/PROJECT_VISION.md`.

_Última atualização: 2026-08-22 (Sprint 10 — pipeline real fechado: distribute auto-populado)_

## Sprint 10 (2026-08-22) — Pipeline real fechado

### O que foi entregue

**Problema raiz:** `/distribute` ficava vazio porque `/api/video-factory/render` nunca escrevia em `publication_packages`.

**Fixes:**
- `app/api/video-factory/render/route.ts`: auto-insere em `publication_packages` após render (non-fatal). Status `pending_rights` quando `rights_status='unknown'` (padrão).
- `app/api/video-factory/route.ts`: GET retorna `{ creatives, storyboards, renders }` — storyboards e renders lidos de `automation_runs` → UI sobrevive navegação.
- `app/(dashboard)/video-factory/page.tsx`: pré-popula `storyboards`/`renders` do GET; botão "📦 Ver na Distribuição →" após render.

**Pipeline validado (creative `c6170a5e`, pending, Calça Jeans Gaven):**
- Storyboard: 5 cenas, `provider='local'`, sem `[MOCK]` ✅
- Render: `1080×1920`, `h264`, `30s`, `0.57MB`, `7.7s` ✅
- `/api/publish`: 1 pacote, `pending_rights` ✅
- TSC: 0 erros | Lint: 0 erros ✅

**Commit pendente:** `~/Desktop/affiliate-os-sprint10-commit.command`

### Próximos passos sugeridos

1. Luca roda os commits pendentes: sprint8 → sprint9 → sprint10
2. Aprovar creative `c6170a5e` em `/queue` → renderizar via UI → verificar `/distribute`
3. Implementar `rights_status` flow para que pacotes atinjam `status='ready'`

---

## Sprints 5–7 (2026-08-22)

### O que foi entregue

**Sprint 5 — Color audit + CSS vars:**
- 5 páginas migradas para variáveis CSS: `var(--bg)=#0d0d1a`, `var(--surface)`, `var(--surface-2)`, `var(--border)`, `var(--brand)=#FF6B35`
- Nenhum hex hardcoded restante nas páginas auditadas

**Sprint 6 — Owned products + migration:**
- `supabase/005_owned_products.sql` criado (NÃO APLICADO — requer ação humana)
- `/products/add-own` criado: formulário para cadastrar produto próprio
- Sidebar e `/mais` atualizados com link para Produto Próprio
- Commit scripts Sprint 5/6 em `~/Desktop/`

**Sprint 7 — API + UX + badge + testes:**
- `app/api/products/route.ts` reescrito: POST persiste `product_type`, `cost`, `checkout_url`, `margin_pct`, `marketplace`; PATCH novo; validações `validMoney()` + `validUrl()` sem vazar dados; graceful 409 se migration 005 ausente; regressão Shopee zero
- `/products/add-own` redesign UX: touch ≥44px, margem em tempo real colorida, focus ring laranja, tela migration graceful, sucesso → /launch
- `/products` lista: badge PRÓPRIO laranja quando `marketplace === 'owned'`
- `scripts/test-owned-product.sh`: 6 testes (owned válido, validações, regressão Shopee, score, listagem)
- Commit script Sprint 7 em `~/Desktop/`
- Lint clean, tsc 0 erros

### Pipeline owned products — status

| Etapa | Status |
|---|---|
| Adicionar produto próprio (`/products/add-own`) | ✅ funcional (requer migration 005) |
| Score (`/api/score`) | ✅ sem alteração — lê campos existentes |
| Criativo (`/api/creative`) | ✅ usa title/description/price |
| Storyboard + Render | ✅ usa creative, não acessa product_type |
| Publication Package | ✅ usa affiliate_url (= checkout_url para owned) |

### Banco — migration 005 pendente

Adiciona 4 colunas à tabela `products`:
```
product_type  text NOT NULL DEFAULT 'affiliate' CHECK (IN ('affiliate','owned'))
cost          numeric(10,2)
checkout_url  text
margin_pct    numeric(5,2)
```
Arquivo: `supabase/005_owned_products.sql` — **NÃO EXECUTAR sem confirmação do Luca**

### Bloqueios humanos (Sprint 7)
1. Executar `supabase/005_owned_products.sql` no SQL Editor do Supabase
2. Rodar `~/Desktop/affiliate-os-sprint5-commit.command`
3. Rodar `~/Desktop/affiliate-os-sprint6-commit.command`
4. Rodar `~/Desktop/affiliate-os-sprint7-commit.command`
5. `npm run dev` → `bash scripts/test-owned-product.sh`
6. Extensão Chrome em `extension/` — carregar em `chrome://extensions` > Modo desenvolvedor > Carregar sem compactação

---

## Correções Sprint 4 (Sessão 2)
- **Contratos reais documentados:** `/api/score` retorna `score.overallScore` (camelCase); `/api/video-factory` aceita `creativeId`; fila é `PATCH /api/queue {id, status}`; publicação é `POST /api/publish {action: 'create'|'publish'}`
- **Extensão Chrome:** host_permissions localhost adicionados; token via `crypto.getRandomValues`; sub_id não modifica URL de afiliado
- **DECISIONS.md:** tabela real é `creatives` (não `campaign_creatives`); sub_id policy documentada
- **test-pipeline.sh:** reescrito com contratos reais; ⚠ para deps externas, ❌ só em contratos quebrados

## Estado atual
Pipeline completo: Produto → Score → Criativo → Aprovação → Storyboard → **MP4 renderizado** → **SRT captions** → **ContentPackage** → **PublicationPackage** → **Distribution** → **Growth Analysis** → **Winner Detection** → **Autopilot Evaluation** → **Publicação Real (IG/YouTube)**.

**Sprint 3 entregue:**
- Migration 004 executada ✅ (`platform_connections` + SUPERVISED default)
- AES-256-GCM token storage (`lib/crypto/token-encrypt.ts`)
- Meta OAuth completo: redirect → callback → long-lived token → IG Business account discovery → DB encrypted storage (`app/api/connect/meta/`)
- YouTube OAuth completo: redirect → callback → channel discovery → auto-refresh token (`app/api/connect/youtube/`)
- MetaProvider v2: lê credenciais do DB, fallback env vars, `requiresManualAction` se nenhum disponível
- YouTubeProvider: upload resumável Shorts, auto-refresh, poll status
- Página `/connect` — status Instagram/YouTube/TikTok(EM BREVE)/Shopee(MANUAL)
- Wizard "LANÇAR CAMPANHA" (`/launch`) — 6 etapas em página única
- Página "Hoje" (`/hoje`) — visão diária: renders, aprovações, vendas, winners, erros
- Autopilot default: SUPERVISED (era PAUSED)
- `tsc --noEmit` → 0 erros. E2E V2: 41/41 ✅

**BLOQUEIOS HUMANOS PENDENTES:**
- Meta: configurar `META_APP_ID`, `META_APP_SECRET`, `ENCRYPTION_KEY` em `.env.local`, depois acessar `/connect` e fazer OAuth
- YouTube: configurar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` em `.env.local`, depois OAuth

**Commits:** Sprint 3 commitado via `affiliate-os-sprint3-commit.command`

## Banco de dados — tabelas ativas (Supabase)
`workspaces`, `products`, `product_scores`, `campaigns`, `creative_angles`, `creatives`, `automation_runs`, `publications` — Sprint 1
`publication_packages`, `sales`, `autopilot_rules`, `notifications`, `import_batches` — Sprint 2 (migration 003)
`platform_connections` — Sprint 3 (migration 004) — tokens OAuth criptografados AES-256-GCM

## TTS
- `lib/tts/types.ts` — TTSProvider interface
- `lib/tts/no-voice-provider.ts` — NoVoiceProvider (audioPath: null) — fallback sempre ativo
- `lib/tts/elevenlabs-provider.ts` — ElevenLabs real (ativo se ELEVENLABS_API_KEY)
- `lib/tts/index.ts` — getTTSProvider() factory
- **Débito técnico:** ElevenLabs não testado E2E — requer chave + crédito.

## Captions
- `lib/render/captions.ts` — buildCaptions() → CaptionEntry[] com timestamps, toSRT(), saveCaptions()
- Geradas automaticamente após cada render: `<runId>.srt` + `<runId>.captions.json` ao lado do .mp4

## Content Package
- `lib/render/content-package.ts` — ContentPackage + PublicationChecklist (8 checks, ready: bool)
- Salvo como `<runId>.package.json` após cada render
- Inclui: videoPath, srtPath, caption, cta, affiliateUrl, channel, checklist

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind · Supabase · Anthropic/Gemini/Mock · **FFmpeg**

## Estrutura de arquivos
```
app/
  (dashboard)/
    layout.tsx              — sidebar: Dashboard, Produtos, Fila, Video Factory
    dashboard/page.tsx      — stats cards + creative status breakdown
    products/page.tsx       — Product Hunter UI
    queue/page.tsx          — Approval Queue (+ regenerar criativo rejeitado)
    video-factory/page.tsx  — Storyboard + Render + Video Player
  api/
    products/route.ts       — GET list + POST create
    score/route.ts          — POST: score produto via AI
    creative/route.ts       — POST: gera criativos + salva campanha
    queue/route.ts          — GET list + PATCH status
    queue/regenerate/route.ts — POST: regenera criativo rejeitado
    video-factory/route.ts  — GET approved creatives · POST generate storyboard
    video-factory/render/route.ts   — POST: FFmpeg render → MP4 (maxDuration=300)
    video-factory/output/[filename]/route.ts — GET: serve MP4 seguro (sem path traversal)
lib/
  supabase/
    client.ts               — browser client
    server.ts               — server client + admin (service role)
  ai/
    types.ts                — ScoreInput, ScoreOutput, CreativeOutput, StoryboardOutput, AIProvider
    index.ts                — getAIProvider(): Claude → Gemini → Mock
    mock-provider.ts        — score + storyboard determinísticos marcados [MOCK]
    providers/claude.ts     — ClaudeProvider (claude-haiku-4-5)
    providers/gemini.ts     — GeminiProvider (gemini-2.0-flash-lite)
  render/
    ffmpeg.ts               — renderVideo(): filtros drawbox+drawtext, ffprobe validation
lib/render/ffmpeg.ts exports: renderVideo(opts), getFontPath(), getRendersDir(), RenderResult
supabase/
  001_initial.sql           — schema base + RLS MVP
  002_media_assets.sql      — tabelas media_assets + render_jobs
scripts/
  render.mjs                — CLI: node scripts/render.mjs <creative_id> | --list
                              Requer ffmpeg no PATH + .env.local + acesso à internet (Supabase)
public/
  fonts/DejaVuSans-Bold.ttf — bundled para render cross-platform
  fonts/DejaVuSans.ttf
storage/
  renders/                  — MP4s gerados (gitignored)
docs/
  AI_HANDOFF.md
```

## Provider fallback
`ANTHROPIC_API_KEY` → Claude · `GEMINI_API_KEY` → Gemini · nenhuma → Mock.
App funciona em modo mock sem nenhuma env, sem erros.

## Supabase
Projeto: `tlbmgahbtwwoojaobygx`. Rodar `001_initial.sql` + `002_media_assets.sql` no SQL Editor.
Workspace default: `00000000-0000-0000-0000-000000000001`. RLS: anon tem acesso total (MVP local).

## Fluxo MVP completo (E2E validado)
1. **Produto** → `POST /api/products` → salvo em `products`
2. **Score** → `POST /api/score` → salvo em `product_scores`
3. **Criativo** → `POST /api/creative` → cria `campaign` + 3 `creatives` (status: pending)
4. **Fila** → `PATCH /api/queue` → status: approved | rejected
5. **Storyboard** → `POST /api/video-factory` → 5 cenas · salvo em `automation_runs` (type=video_storyboard)
6. **Render** → `POST /api/video-factory/render` → FFmpeg 1080×1920 H.264 MP4 · salvo em `automation_runs` (type=video_render)
7. **Preview** → `GET /api/video-factory/output/[filename]` → stream seguro do MP4

## Video Spec (validado ✅)
- Resolução: 1080×1920 (9:16 vertical)
- Codec: H.264 (libx264), CRF 23, preset fast, yuv420p, +faststart
- Duração: ~30s (depende do storyboard — soma de cenas)
- Taxa: 30fps
- Áudio: nenhum (vídeo-only nesta fase)
- Filtros: drawbox (fundos por cena) + drawtext (overlays com enable='between(t,...)')
- Cena 1 (hook): fundo laranja + texto grande branco
- Cenas 2–4: fundo escuro + texto centralizado com caixa semitransparente
- Cena 5 (CTA): fundo laranja + CTA grande + shopee.com.br
- Fonte: DejaVuSans-Bold.ttf bundled em `public/fonts/`

## Segurança de arquivo (output endpoint)
- Regex: `/^render_[a-zA-Z0-9_-]+\.mp4$/` — rejeita qualquer path traversal
- Serve apenas de `storage/renders/` (nunca de path externo)

## FFmpeg no Mac (necessário para o render via UI)

### Status atual ✅
- `bin/ffmpeg`: arm64 Mach-O 6.0, instalado via `ffmpeg-static` npm. Funciona via execSync.
- `bin/ffprobe`: **não usado** — `ffprobe-static` não tem binário arm64 macOS. `renderVideo()` valida o arquivo via header MP4 (`ftyp` box nos bytes 4-7) e retorna metadados fixos (1080×1920, h264). Solução sem deps, funciona arm64.
- Setup: `GET /api/setup/ffmpeg` verifica; `POST /api/setup/ffmpeg` instala via npm se ausente.
- `lib/render/ffmpeg.ts` usa `execSync()` em vez de `spawn()` — evita EBADARCH do macOS em binários npm.

### Para novo Mac de desenvolvimento
Abrir `http://localhost:3000/api/setup/ffmpeg` (GET para status, POST para instalar).
Sem ffmpeg no PATH/bin/, o botão "Renderizar MP4" retorna erro 500.

## CLI script (para render fora da UI)
```bash
node scripts/render.mjs --list                      # lista criativos aprovados + storyboard status
node scripts/render.mjs <creative_id_completo_ou_prefixo>  # renderiza
```
Requer: ffmpeg instalado, .env.local configurado, rede para Supabase.

## Tabelas DB relevantes
- `products` · `product_scores` · `campaigns` · `creatives`
- `automation_runs` — usado para storyboards (type=video_storyboard) e renders (type=video_render)
- `media_assets` — arquivos de mídia com rights_status (migration 002)
- `render_jobs` — fila de renders estruturada (migration 002, não usada pela API ainda — usa automation_runs)

## Fluxo MVP validado E2E ✅ (2026-08-22)
Render end-to-end confirmado: `POST /api/video-factory/render` → MP4 1080×1920 h264 30s 172KB em 5.6s.

## Próximos passos (em ordem de prioridade)
1. **Mobile-first + PWA** — bottom nav, dashboard "ESTOU GANHANDO?", Approval Queue e Video Factory mobile, Autopilot states, PWA manifest/icons
2. **TTS** — interface `TTSProvider` com fallback sem voz · Gemini TTS ou ElevenLabs
3. **Captions** — legendas sincronizadas com duração de cena (SRT/JSON → drawtext)
4. **Variantes** — render A/B de hooks/CTAs diferentes em lote
5. **Content Package** — `video.mp4 + caption + CTA + affiliate_url + product_id + channel`
6. **Auth** — bloquear rotas com sessão Supabase (agora MVP local aberto)

## Restrições de segurança (NUNCA violar)
- Nunca colocar chaves/tokens em código ou logs
- Não ativar Stripe live, alterar produção ou fazer deploy sem confirmação explícita
- Não usar reset destrutivo, não apagar tabelas, não sobrescrever mudanças do usuário
- Nenhuma ação de demo deve tocar dados reais, enviar mensagens, publicar ou gerar cobrança
- `~/Desktop/lotta-os/` é READ-ONLY — não alterar nada
