# Shopee Affiliate Research

## Shopee Affiliate Portal (affiliate.shopee.com.br)

### API pública para comissões/pedidos
**Não existe.** O Shopee Affiliate Portal não expõe API para afiliados consultarem seus pedidos ou comissões programaticamente. Confirmado por:
- Documentação oficial não lista endpoints de relatório para afiliados
- Portal usa sessão autenticada — sem OAuth público para afiliados
- Única forma de acesso programático seria web scraping (não recomendado, viola ToS)

### Exportação de relatório (método suportado)
1. Acessar `affiliate.shopee.com.br`
2. Menu Relatórios → Relatório de Comissões
3. Selecionar período (máximo 90 dias por exportação)
4. Clicar Exportar → download CSV

### Formato do CSV exportado (PT-BR)

Colunas observadas no portal BR:

| Coluna PT | Coluna EN (variante) | Campo interno |
|-----------|----------------------|---------------|
| Data do pedido | Order Date | `occurred_at` |
| ID do pedido | Order ID | `order_id` |
| Nome do produto | Product Name | `product_name` |
| Preço do produto | Product Price | `gross_value` |
| Quantidade | Quantity | — |
| Receita | Revenue / Gross Value | `gross_value` |
| Taxa de comissão | Commission Rate | `commission_rate` |
| Comissão | Commission | `commission_value` |
| Status do pedido | Order Status | `status` |
| Data de pagamento | Payout Date | `payout_date` |

### Status de pedidos

| Status Shopee | Interno |
|---------------|---------|
| Pago / Paid | `paid` |
| Aprovado / Approved / Confirmed | `approved` |
| Cancelado / Cancelled / Canceled | `cancelled` |
| Inválido / Invalid | `invalid` |
| (outros) | `pending` |

### Formato de valores
- Separador decimal: vírgula (pt-BR) — ex: `R$ 1.234,56`
- Parser normaliza `R$`, pontos de milhar, vírgula decimal → float

### Delimitadores
- Padrão: semicolon (`;`) no portal BR
- Fallback: comma (`,`) para exports em inglês

### Deduplicação
- Chave única: `(order_id, platform)` — index UNIQUE na tabela `sales`
- Reimportação segura: pedidos existentes são ignorados (skipped), não duplicados

### Limitações conhecidas
- Sem atribuição automática de `creative_id` via CSV (Shopee não expõe UTM tracking por afiliado)
- Atribuição criativo → venda futura: via `source_channel` + janela de tempo (não implementado)
- XLSX export: `app/api/sales/import` aceita `.xlsx` mas parseia como texto — para XLSX real, adicionar SheetJS na rota

### Geração oficial de link + Sub_id (validado no portal em 2026-08-22)
O fluxo legítimo está em **Oferta → Link personalizado** no Portal de Afiliados autenticado.

- Aceita até **5 URLs Shopee** por vez (produto, loja, campanha, categoria ou página inicial).
- Aceita até **5 Sub_id(s)** alfanuméricos para rastreamento no próprio link gerado pela Shopee.
- O Affiliate OS não deve anexar parâmetros manualmente a um link de afiliado já gerado; a conversão deve ocorrer no portal oficial.
- A Open API do Portal estava indisponível para esta conta (sem AppID/Secret liberados), portanto o produto deve operar pelo portal, extensão local e importação de CSV.

### Shopee Affiliate API (para lojistas, não afiliados)
Shopee tem Open Platform API para lojistas (`open.shopee.com`), mas afiliados não têm acesso a esses endpoints.

### Próximos passos (quando disponível)
- Se Shopee lançar API de afiliados: criar `ShopeeApiProvider` implementando `MarketplaceDataProvider`
- Monitorar: `open.shopee.com/affiliate` (não existe em ago/2026, mas pode surgir)
