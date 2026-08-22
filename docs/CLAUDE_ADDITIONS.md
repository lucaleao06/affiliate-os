# CLAUDE_ADDITIONS — Adições Autônomas

_Itens adicionados por iniciativa própria no Affiliate OS.
Cada entrada tem: data · arquivo · motivo._

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

## Notas de design

- Nenhuma cor foi introduzida além de `#FF6B35` (brand), verde/amarelo/vermelho de status (padrão semântico) e roxo para Autopilot
- Todos os cards usam `active:scale-95 transition-all` para feedback tátil mobile
- `-webkit-tap-highlight-color: transparent` em globals.css elimina flash azul do Safari iOS
- Safe areas aplicadas via CSS env() — funciona standalone PWA + navegação normal
