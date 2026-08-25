@AGENTS.md

# Affiliate OS — Contexto para Claude Code

> Memória completa em: `~/Desktop/LEON/memory/affiliate-os.md`
> Registry global: `~/Desktop/LEON/registry/projects.md`

## IDENTIDADE

- **Objetivo:** Automação de afiliados Shopee → receita com mínimo esforço humano
- **Stack:** Next.js, Supabase (banco separado do LOTTA OS), FFmpeg ARM64, Chrome Extension
- **Docs:** `docs/AI_HANDOFF.md` (ler PRIMEIRO), `docs/PROJECT_VISION.md`

## REGRAS DE SEGURANÇA

- Nunca misturar schema/credenciais com LOTTA OS
- SUPERVISED mode em todas as ações automáticas
- Claim guard ativo — não publicar duplicado
- Não ativar Meta API para publicação real sem aprovação do Luca

## ESTADO ATUAL

Pipeline real fechado e validado (Sprint 10).
Commits pendentes: sprint2 → sprint11 + missao-noturna + modo-continuo (scripts .command no Desktop).
Migration 005 (owned_products) criada mas não aplicada ao Supabase.

## ANTES DE QUALQUER TAREFA

1. Ler `~/Desktop/LEON/memory/affiliate-os.md`
2. Ler `docs/AI_HANDOFF.md` para estado operacional
3. tsc + lint antes de declarar concluído
