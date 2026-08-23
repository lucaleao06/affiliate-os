# Decisões técnicas e de produto

Registro de escolhas não-óbvias feitas durante o desenvolvimento. Cada decisão inclui contexto, alternativas consideradas e justificativa.

---

## [2026-08-22] Sprint 10 — Auto-criar `publication_packages` no fim do render

**Decisão:** O endpoint `/api/video-factory/render` insere automaticamente em `publication_packages` após cada render bem-sucedido. Wrapped em try/catch não-fatal.

**Contexto:** `/distribute` lê `/api/publish` que consulta `publication_packages`. Antes, essa tabela nunca era populada automaticamente, então a página de distribuição ficava vazia mesmo após um render completo.

**Alternativas consideradas:**
- Criar endpoint separado `/api/publish/create` chamado pelo front — rejeitado: adiciona um passo manual desnecessário.
- Trigger Postgres na tabela `automation_runs` — rejeitado: lógica de negócio no banco, mais difícil de debugar.

**Justificativa:** Render bem-sucedido sempre deve produzir um pacote distribuível. A inserção automática mantém o invariante sem exigir ação extra do usuário.

**Status derivado:** `ready` se `checklist.ready`, `pending_rights` se `rights_status='unknown'` (padrão atual), `draft` caso contrário.

---

## [2026-08] Produto próprio — reutilizar tabela `products` com discriminador marketplace

**Decisão:** Produtos próprios (e-books, cursos, templates) entram na mesma tabela `products` com `marketplace = 'owned'` e `product_type = 'owned'`. Não foi criada uma tabela separada.

**Alternativas descartadas:**
- Tabela `owned_products` separada → duplicaria toda a lógica de score, criativo, storyboard, render e publicação
- Campo booleano `is_owned` → menos expressivo; `marketplace` já distingue a origem do produto

**Justificativa:** O pipeline (score → creative → storyboard → render → publication_ready) opera sobre `products` sem diferenciação. Owned products entram no mesmo loop com `commission_rate = 100` e `affiliate_url = checkout_url`. Migration 005 adiciona as 4 colunas extras sem quebrar Shopee (defaults conservadores).

---

## [2026-08] checkout_url obrigatório para owned, affiliate_url para Shopee

**Decisão:** Para `product_type = 'owned'`, `checkout_url` é obrigatório e validado via `validUrl()`. Para Shopee/afiliados, `affiliateUrl` é o campo equivalente. O pipeline usa `affiliate_url` da tabela — ao salvar owned products, `checkout_url` é gravado também em `affiliate_url`.

**Justificativa:** Preserva compatibilidade: todos os consumers do pipeline leem `affiliate_url` sem saber o tipo do produto.

---

## [2026-08] Extensão Chrome — token local em vez de OAuth

**Decisão:** A extensão Chrome usa um token aleatório gerado localmente (`Math.random().toString(36)`), sincronizado manualmente pelo usuário via `.env.local`.

**Alternativas descartadas:**
- OAuth completo entre extensão e servidor → exigiria redirect_uri para extensão + servidor de autorização rodando
- Cookie de sessão → exigiria que o servidor Next.js e a extensão compartilhem domínio (não se aplica a localhost)
- Hardcoded token → inseguro, vaza em source da extensão

**Justificativa:** Extensão é local-first, uso exclusivo do Luca. Fricção de configurar o token uma vez é aceitável. CORS restrito a `chrome-extension://` + `localhost` garante que o endpoint não seja acessível externamente.

---

## [2026-08] CORS nunca `*` no endpoint da extensão

**Decisão:** `Access-Control-Allow-Origin` é sempre definido com o `Origin` exato da requisição, nunca `*`. Se o origin não é `chrome-extension://` nem `localhost`, retorna 403.

**Justificativa:** Evitar que o endpoint seja chamável por qualquer site aberto no browser. Com `*` qualquer página maliciosa poderia fazer POST para `/api/extension/add-product`.

---

## [2026-08] XLSX rejeitado com HTTP 415 em vez de fallback silencioso

**Decisão:** Se o arquivo enviado para `/api/sales/import` tem extensão `.xlsx` ou `.xls`, retorna HTTP 415 com instrução clara. Não tenta parsear.

**Alternativas descartadas:**
- Instalar `xlsx` library → adiciona ~500kb ao bundle, parsing de planilha complexo, manutenção extra
- Parsear binário como texto → retorna lixo, importa zero linhas, usuário não entende o erro

**Justificativa:** Erro explícito é melhor que falha silenciosa. Shopee Affiliate Portal já oferece export CSV nativo.

---

## [2026-08] `angle` não salvo no banco de `creatives`

**Decisão:** O campo `angle` (ex: "Urgência", "Transformação") é gerado dinamicamente na resposta da API e não persistido como coluna separada no banco. Os criativos são salvos na tabela `creatives` (sem coluna `angle`); o índice do ângulo (`angle_id`) referencia a posição no array `creatives.angles` da campanha.

**Consequência:** API `/api/creative` enriquece os criativos do banco com `angle` do array `creatives.angles[i]` antes de retornar.

**Justificativa:** Evitar migração de schema. O texto dos ângulos é parte do JSON de configuração da campanha, não dos criativos individuais.

---

## [2026-08] Sub_id NÃO é inserido automaticamente no link de afiliado

**Decisão:** O campo `sub_id` da extensão Chrome é salvo somente em `raw_data.sub_id` (JSONB). O link de afiliado (`affiliateUrl`) é enviado exatamente como o usuário colou — nunca modificado pelo sistema.

**Motivo:** Links oficiais da Shopee têm formato próprio de tracking. Modificar o URL poderia quebrar o rastreamento da Shopee, gerar links inválidos ou violar os termos do programa de afiliados. O usuário deve gerar o link já com sub_id pelo Portal Shopee Affiliate quando necessário.

**Sub_id no sistema:** salvo em `raw_data` na tabela `products`, exibido como metadado na UI. Não entra em nenhuma URL enviada à Shopee.

---

## [2026-08] Publication mode default: SUPERVISED

**Decisão:** O sistema nunca publica automaticamente sem confirmação humana a menos que explicitamente configurado para AUTOPILOT.

**Regra de negócio:**
- `rights_status = 'unknown'` → bloqueado, não entra nem em SUPERVISED
- SUPERVISED → gera `approval_required` notification, status `manual_required`
- AUTOPILOT → só com `rights_status` confirmado + provider configurado

**Justificativa:** Evitar publicação acidental, gastos com API de publicação, problemas de direitos autorais. Segurança > velocidade.

---

## [2026-08] Workspace fixo `00000000-0000-0000-0000-000000000001`

**Decisão:** Todas as inserções usam `workspace_id` hardcoded como UUID zero.

**Motivo:** Ainda não há sistema de multi-workspace ou autenticação de usuário. Placeholder que permite adicionar multi-tenancy depois sem alterar schema.

**Risco:** Se autenticação for implementada, todos os dados precisam ser migrados para o workspace real do usuário.

---

## [2026-08] Instagram sem `instagram_content_publish` no scope OAuth

**Decisão:** O scope do Meta OAuth não inclui `instagram_content_publish`.

**Motivo:** O app Meta está configurado no modelo "casos de uso" (Instagram Graph API via Business Suite), que não suporta `content_publish` sem revisão de app aprovada pela Meta. Publicação é feita via `ManualPublicationProvider` (modo manual).

**Caminho para mudar:** Submeter app para revisão Meta com caso de uso "Publicar conteúdo", aguardar aprovação (~2-4 semanas).

---

## [2026-08] Product Hunter UX — progressive disclosure

**Decisão:** Formulário de produto mostra apenas 4 campos essenciais (título, link afiliado, comissão %, preço). Demais campos ficam em seção colapsável "Dados adicionais".

**Motivo:** Form original com 12 campos expostos simultaneamente parecia formulário técnico, alta fricção especialmente em mobile.

**Campos obrigatórios:**
- `title` (único required na API)

**Campos essenciais (visíveis por padrão):**
- `affiliateUrl` — sem ele o produto não tem link clicável
- `commissionRate` — necessário para o score
- `price` — necessário para cálculo de ganho estimado

---

## [2026-08] Git via `.command` script em vez de sandbox

**Decisão:** Commits são feitos via arquivos `.command` no Desktop que o usuário executa com duplo-clique, em vez de `git commit` direto do sandbox.

**Motivo:** O `.git/index.lock` do repositório pertence ao processo macOS (FUSE mount). O sandbox Linux não tem permissão para remover o lock file nem para escrever no index.

**Workaround permanente:** Qualquer comando git que modifique o repositório (`add`, `commit`, `push`) deve ser executado no terminal macOS nativo ou via `.command` script.
