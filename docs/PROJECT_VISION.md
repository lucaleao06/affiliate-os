# PROJECT_VISION — Affiliate OS
_Memória estratégica permanente. Não é log de sprint. Ver `AI_HANDOFF.md` para estado operacional._

---

## 1. ORIGEM

Affiliate OS nasceu como uma operação própria para automatizar afiliados da Shopee.
O fundador já é afiliado da Shopee e quer começar a gerar receita usando IA e automação com intervenção humana mínima.

A ideia original foi:
```
produto → análise → score → campanha → criativo → vídeo → aprovação → publicação → venda → comissão → análise → novos criativos
```

O sistema deve evoluir para uma **AFFILIATE PERFORMANCE MACHINE**.

---

## 2. OBJETIVO PRINCIPAL

O objetivo não é criar um dashboard bonito.
O objetivo é: **GERAR RECEITA E LUCRO COM O MÍNIMO DE TRABALHO HUMANO.**

North Stars iniciais:
1. comissão gerada
2. lucro líquido
3. vendas
4. eficiência por criativo
5. eficiência por canal

Toda feature deve ser avaliada por: **"Isso ajuda a vender, operar, medir ou escalar?"**
Se não → baixa prioridade.

---

## 3. FILOSOFIA

Princípio operacional: **BUILD → RUN → SELL → MEASURE → LEARN → SCALE**

- Não construir meses antes de testar.
- Não overengineering.
- Não gambiarra frágil.
- Criar vertical slices funcionais.

Cada milestone: IMPLEMENTAR → TESTAR → CORRIGIR → RETESTAR → COMMIT → AVANÇAR

---

## 4. SHOPEE COMO PRIMEIRO CAMPO DE PROVA

Shopee é a primeira marketplace. Objetivo:
- encontrar/importar produto
- gerar link afiliado legítimo
- utilizar Sub_id oficial quando aplicável
- criar conteúdo → publicar → importar vendas → medir comissão → identificar winners → escalar winners

Shopee NÃO deve ficar profundamente acoplada ao core. Criar marketplace/provider abstractions.

Futuro: TikTok Shop, Amazon, outras redes de afiliados, produtos próprios.

---

## 5. SOCIAL DISTRIBUTION

Prioridades de canal:
1. Instagram Reels
2. Facebook Reels
3. Shopee Video
4. TikTok
5. YouTube Shorts

O mesmo core gera múltiplos criativos e distribui.
- Quando API oficial permitir → publicação automática.
- Quando não permitir → automação até o último passo humano seguro.
- **Nunca colocar conta em risco apenas para atingir "100% automático".**

---

## 6. MODOS DE AUTONOMIA

**PAUSED** — nenhuma publicação automática.

**SUPERVISED** — sistema trabalha sozinho, publicação final depende de aprovação humana. _(Modo padrão inicial.)_

**AUTOPILOT** — publica sozinho somente quando:
- provider está validado e integração oficial operacional
- direitos de mídia corretos
- Affiliate Score atende mínimo
- risk score, comissão e quantidade diária atendem regras
- todos os gates aprovados

Nunca permitir Autopilot ignorar compliance.

---

## 7. PRODUCT HUNTER

MVP: URL, manual, extensão Chrome própria.

Direção futura: **ADD TO AFFILIATE OS** — usuário navega num produto e envia para o sistema; a partir daí IA trabalha.

Não usar scraping agressivo.

---

## 8. AFFILIATE SCORE

Produtos recebem Score 0–100. Sinais incluem:
comissão, comissão extra, preço, desconto, vendas, reviews, rating, seller, visual, impulso, clareza do benefício, problema resolvido, antes/depois, potencial criativo, tendência, concorrência, risco.

Score é inicialmente heurístico + IA. Futuramente deve aprender com resultados reais.

---

## 9. CREATIVE ENGINE

Um produto vencedor deve gerar 3 → 5 → 10 → 20+ variações. Variar:
hooks, ângulos, scripts, CTA, duração, edição, voz, texto, ordem dos takes, canal.

Formatos: curiosidade, problema/solução, demonstração, antes/depois, UGC, lista, comparação, review, satisfying, ASMR, utilidade, surpresa.

---

## 10. VIDEO FACTORY

Pipeline: `creative → storyboard → captions → render → MP4 → content package`

Prioridade: baixo custo, automação, local quando possível, FFmpeg, providers opcionais.
Não depender de APIs caras para funcionar.

---

## 11. MEDIA RIGHTS

Nunca roubar vídeo aleatório e republicar automaticamente. Cada asset deve conhecer origem/direito.
Status: `owned`, `seller_provided`, `licensed`, `generated`, `test`, `unknown`.

**Autopilot NÃO deve publicar `unknown`.**

---

## 12. PUBLICATION ENGINE

Abstração por provider: `content package → publication ready → publish`.

Registrar: product, creative, campaign, channel, caption, affiliate link, external post id, status, published_at.

Nunca fingir que publicação aconteceu.

---

## 13. SALES / COMMISSION INTELLIGENCE

Central para o negócio. O sistema deve entender: vendas, comissão, pending/approved/invalid/cancelled, produto, canal, creative, campaign, data.

Objetivo: ligar quando possível → `PUBLICATION → CLICK → SALE → COMMISSION`

---

## 14. GROWTH ANALYST

O sistema aprende com dinheiro. Deve responder:
- Qual produto vende mais? Qual dá mais comissão?
- Qual hook mais vende? Qual creative? Qual canal converte melhor?
- O que está crescendo? Caindo? O que escalar? Pausar?

Winners devem gerar novas ações. Exemplo: `winner detectado → criar +10 variações`.

---

## 15. CONTEÚDO E PERFIS PRÓPRIOS

A operação deverá criar ativos de mídia próprios. Possíveis verticais: casa, carro, tech, pets, beleza, pais, utilidades.

Não queremos apenas links. Queremos construir audiências. Mesmo quando um produto morrer, a audiência continua sendo um ativo nosso.

---

## 16. PRODUTOS DIGITAIS / SHOPIFY

Visão: Affiliate OS deve futuramente operar produtos próprios.

O fundador já possui produtos digitais/e-books vendidos via Shopify. A mesma máquina deve conseguir operar:
`produto próprio → campanha → criativo → publicação → clique → checkout → venda → margem → análise → novos criativos`

Arquitetura futura deve suportar `OWN PRODUCTS` e integrações Shopify.

---

## 17. REVENUE OS

Direção futura possível: Affiliate OS evolui para **REVENUE OS**.

Fontes de receita:
- **Afiliados** — Shopee e outros
- **Produtos próprios** — Shopify / digitais
- **LOTTA** — captação de leads, clientes e campanhas

O core é o mesmo: `oportunidade → oferta → conteúdo → distribuição → conversão → receita → aprendizado`

---

## 18. LOTTA OS

Existe outro produto: `~/Desktop/lotta-os/`

LOTTA OS está: **PAUSADO, NÃO CANCELADO.**
- Não alterar. Não apagar. Não tratar como abandonado.
- Affiliate OS pode aproveitar conceitos e arquitetura como referência.

Possíveis módulos reutilizáveis: AI router, campaign engine, creative engine, analytics, approval queue, media pipeline, automation engine, cost tracker, notification center.

Registrar reutilizações em: `docs/LOTTA_REUSE.md`

---

## 19. AI PROVIDERS

Não ficar preso a um único modelo. Arquitetura provider-based.
Possíveis providers: Claude, Gemini, OpenAI, futuros.

Se provider acabar → o sistema não deve parar inteiro. Fallbacks são importantes.

---

## 20. CUSTOS

Antes da receita: **CUSTO MÍNIMO.**

Priorizar: tiers gratuitos, processamento local, ferramentas open source, serviços já disponíveis.

Nenhum agente está autorizado a comprar créditos, colocar cartão, assinar serviço ou fazer upgrade sem autorização humana explícita.

Futuramente acompanhar: custo por produto, por creative, por venda, custo de IA, custo de render, lucro líquido.

---

## 21. MOBILE FIRST

O fundador deve conseguir pelo iPhone: ver receita, ver winners, aprovar/rejeitar, assistir vídeo, adicionar produto, controlar Autopilot, ver alertas, acompanhar operação.

Direção: responsive web app + PWA. App nativo somente se houver necessidade futura.

---

## 22. DESIGN

Affiliate OS NÃO deve parecer "app padrão feito por IA". Evitar: cards demais, shadcn padrão, gradiente AI roxo, glow, sidebar genérica, Lucide em todo lugar, quatro stat cards idênticos, aparência de template.

Queremos: premium, autoral, hierarquia forte, performance, confiança, dinheiro como protagonista, UI rápida, ótima tipografia, poucos elementos com intenção.

Benchmark conceitual: Linear, Stripe, Vercel, Raycast, fintech/performance tools. Sem copiar.

---

## 23. EXPERIÊNCIA IDEAL

O fundador NÃO é obrigado a entender código. Experiência ideal:
`abre → vê resultado → escolhe produto → IA trabalha → aprova → publica → vende → sistema aprende`

Complexidade deve ficar por trás.

---

## 24. AUTONOMIA DOS AGENTES

Claude e futuros agentes possuem ampla autonomia técnica. Podem usar: terminal, Chrome, DevTools, criar arquivos, programar, instalar dependências gratuitas, Homebrew, FFmpeg, Git, banco, Supabase, n8n, extensões gratuitas confiáveis, scripts, APIs, pesquisar documentação, testar, corrigir, retestar.

**Não perguntar coisas óbvias.** Somente interromper humano para:
login, senha, 2FA, CAPTCHA, OAuth, pagamento, cartão, secret realmente ausente, decisão comercial crítica, ação irreversível, risco relevante de conta.

---

## 25. AUTONOMIA DE PRODUTO

Agentes podem adicionar boas ideias que melhorem receita, produtividade, UX, segurança, conversão, custo, inteligência ou automação — com bom senso.

Mas precisam registrar em `docs/CLAUDE_ADDITIONS.md` ou equivalente. Nada de feature creep.

---

## 26. TOKEN ECONOMY

Claude deve economizar tokens agressivamente. Gastar principalmente em: código, debug, execução, pesquisa necessária, testes. Não em longos relatórios de chat. Comunicação: curta e operacional.

---

## 27. CHATGPT + CLAUDE

**CHATGPT = SALA DE ESTRATÉGIA** — ideias, decisões, direção, brainstorming, prioridades, revisão, novos caminhos, registro de insights. Usado no dia a dia, inclusive pelo celular.

**CLAUDE / COWORK = OFICINA DE EXECUÇÃO** — código, terminal, arquivos, implementação, testes, automações, browser/computer access.

**GIT + DOCS = MEMÓRIA PERMANENTE** — nenhuma conversa específica deve ser o único lugar onde existe a visão do projeto.

---

## 28. MOBILE / DIA A DIA

O fundador frequentemente poderá estar longe do Mac. Pode abrir o ChatGPT no celular e dizer: "salva essa ideia para o Affiliate OS." Essas ideias devem ser preservadas e posteriormente implementadas/documentadas no repositório. Por isso `PROJECT_VISION.md` funciona como memória estratégica persistente.

---

## 29. ARQUIVOS DE MEMÓRIA

| Arquivo | Conteúdo |
|---|---|
| `PROJECT_VISION.md` | Estratégia permanente (este arquivo) |
| `AI_HANDOFF.md` | Estado operacional atual |
| `DECISIONS.md` | Decisões arquiteturais relevantes |
| `CLAUDE_ADDITIONS.md` | Features adicionadas autonomamente |
| `LOTTA_REUSE.md` | Possíveis reutilizações futuras |
| `SHOPEE_RESEARCH.md` | Pesquisa oficial Shopee |
| `PUBLISHING_RESEARCH.md` | Pesquisa de APIs/publicação |

---

## 30. SEGURANÇA

Nunca armazenar secrets em documentação. Secrets ficam em `.env.local`, secret managers, Keychain quando aplicável.

`.env.example`: nomes somente. Nunca commitar credenciais.

---

## 31. O QUE NÃO FAZER

- Arriscar conta Shopee
- Roubar conteúdo
- Burlar CAPTCHA / contornar anti-bot / scraping agressivo
- Criar depoimento falso / inventar métricas / inventar API
- Contratar serviço sem autorização
- Destruir LOTTA OS
- Transformar tudo em feature sem receita

---

## 32. NOSSA VISÃO DE SUCESSO

Estado futuro desejado — o fundador abre o Affiliate OS e vê:
- produtos analisados e selecionados
- conteúdos produzidos e publicados
- vendas, comissão, lucro
- winners, alertas, recomendações

E o sistema trabalha continuamente. Exemplo:
> "Produto X está convertendo 4.8x acima da média." → "Gerando +10 variações."

O fundador deixa de ser operador manual. Vira: **DONO DA OPERAÇÃO.**

---

## 33. PRINCÍPIO FINAL

Não construir tecnologia pela tecnologia.

**Nosso objetivo é: IA TRABALHANDO PARA GERAR RECEITA REAL.**

Sempre preservar: velocidade · segurança · qualidade · baixo custo · inteligência · autonomia.

**BUILD → RUN → SELL → MEASURE → LEARN → SCALE.**
