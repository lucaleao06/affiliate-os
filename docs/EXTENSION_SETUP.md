# Extensão Chrome — Add to Affiliate OS

Extensão Manifest V3 local. Adiciona produtos Shopee ao Affiliate OS com um clique.

## Instalação (modo desenvolvedor)

1. Abra Chrome → `chrome://extensions`
2. Ative **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta: `~/Desktop/affiliate-os/extension/`
5. A extensão aparece na barra do Chrome

## Configuração do token

A extensão usa um token local para autenticar com o Affiliate OS.

### 1. Ver o token gerado pela extensão:
- Clique no ícone da extensão
- Clique em **⚙️ configurações**
- Copie o valor de **Token local**

### 2. Adicionar ao .env.local:
```
EXTENSION_LOCAL_TOKEN=<token-copiado>
```

### 3. Reiniciar o servidor:
```bash
# No terminal do projeto
npm run dev
```

## Uso

1. Abra uma página de produto no Shopee (`shopee.com.br`)
2. Clique no ícone 🎯 da extensão na barra do Chrome
3. O título e preço são extraídos automaticamente da página
4. Cole o **link de afiliado oficial** da Shopee
5. Preencha **comissão** e **Sub_id** (opcional)
6. Clique em **Adicionar ao Affiliate OS**
7. O produto aparece em `/products`

## Segurança

- Permissões mínimas: `activeTab`, `storage`
- Sem acesso a cookies, histórico ou outras abas
- CORS restrito: endpoint só aceita origens `chrome-extension://` e `localhost`
- Token necessário: sem `EXTENSION_LOCAL_TOKEN` no `.env.local`, nenhuma requisição é aceita
- Sub_id salvo em `raw_data` no banco (sem coluna separada)
- Sem scraping agressivo: lê apenas DOM visível da página atual

## Endpoint dedicado

`POST /api/extension/add-product`  
Não expõe o `/api/products` público. Endpoint próprio com:
- Verificação de token (`X-Extension-Token`)
- CORS restrito por `Origin`
- Preflight OPTIONS suportado
