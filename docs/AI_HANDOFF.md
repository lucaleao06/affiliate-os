# AI_HANDOFF — Affiliate OS v0.2

_Última atualização: 2026-08-21_

## Estado atual
Pipeline completo: Produto → Score → Criativo → Aprovação → Storyboard → **MP4 renderizado e validado**.
`npx tsc --noEmit` → exit 0.

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
