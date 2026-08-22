# CLAUDE_STATUS
_Atualizado: 2026-08-22 — Sessão 2 Sprint 4_

## Correções aplicadas (Codex review)
- `scripts/test-pipeline.sh`: contratos reais (`creativeId`, `PATCH /api/queue`, `score.overallScore`, `POST /api/publish action=create/publish`)
- `extension/manifest.json`: localhost host_permissions adicionados
- `extension/background.js`: `crypto.getRandomValues` em vez de `Math.random`
- `extension/popup.js`: sub_id removido do URL; salvo só em raw_data
- `docs/DECISIONS.md`: `campaign_creatives` → `creatives` + decisão sub_id documentada

---

# CLAUDE_STATUS (original) — Affiliate OS

_Última atualização: 2026-08-22 — Claude (Cowork)_

## Estado encontrado ao iniciar sessão

- Branch: `main`
- Último commit: `f7d1d74` — `docs: atualiza CLAUDE_ADDITIONS + AI_HANDOFF para Sprint 3 (v0.4)`
- `tsc --noEmit`: **0 erros**
- `npm run build` via sandbox: falha com EPERM (FUSE mount — `.next` pertence ao macOS). Build real funciona via `npm run dev` no Mac.

### Mudanças não commitadas encontradas (preservadas):
| Arquivo | Origem |
|---|---|
| `app/(dashboard)/connect/page.tsx` | Agente anterior — erro `no_ig_business` com guia de 4 passos |
| `app/api/connect/meta/callback/route.ts` | Agente anterior — fix page token vs user token |
| `app/api/connect/meta/route.ts` | Agente anterior — scope sem `instagram_content_publish` |
| `app/(dashboard)/launch/page.tsx` | Agente anterior — wizard LANÇAR CAMPANHA |
| `docs/AI_HANDOFF.md` | Agente anterior — linha apontando para PROJECT_VISION |
| `docs/PROJECT_VISION.md` (untracked) | Esta sessão — memória estratégica permanente |

## Bloqueio humano ativo
- Meta OAuth: usuário precisa converter Instagram para Business/Creator e vincular à Página do Facebook antes de reconectar.
- YouTube OAuth: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` ainda não configurados.

## O que esta sessão fez / está fazendo
1. Commit de visão estratégica (`PROJECT_VISION.md`) — aguarda duplo-clique no `affiliate-os-vision-commit.command`
2. Audit de contratos do wizard `/launch`
3. Extensão Chrome "Add to Affiliate OS" (Manifest V3)
4. Audit/fix importador Shopee CSV/XLSX
5. Auditoria de segurança (CORS, rights_status, SUPERVISED)
6. Mobile audit
7. Documentação + commit limpo

## Próximo gargalo após esta sessão
- Configurar Instagram Business → fazer OAuth real
- Configurar Google Cloud Console → YouTube OAuth
