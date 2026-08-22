# Publishing API Research

Pesquisa realizada para o sprint PUBLICATION ENGINE. Sem chaves reais — apenas referência técnica.

---

## Instagram / Meta Reels

**API**: Meta Graph API v19.0
**Endpoint de upload**: `POST /{ig-user-id}/media`
**Endpoint de publicação**: `POST /{ig-user-id}/media_publish`

### Fluxo de 3 etapas

1. **Criar container**
   ```
   POST /{ig-user-id}/media
     media_type=REELS
     video_url=<URL público do vídeo>
     caption=<texto>
     share_to_feed=true
   → retorna container_id
   ```

2. **Aguardar processamento** (polling)
   ```
   GET /{container-id}?fields=status_code
   → EXPIRED | ERROR | FINISHED | IN_PROGRESS | PUBLISHED
   ```
   Timeout recomendado: 10 × 15s = 2m30s.

3. **Publicar**
   ```
   POST /{ig-user-id}/media_publish
     creation_id=<container_id>
   → retorna media_id
   ```

### Requisitos
- Conta Business ou Creator no Instagram
- App aprovado pela Meta com permissões `instagram_basic`, `instagram_content_publish`
- **Env vars**: `META_ACCESS_TOKEN`, `META_IG_USER_ID`
- Limite de taxa: 50 posts/24h por usuário

### Upload de vídeo grande
Para vídeos > 100MB, usar Resumable Upload API via `rupload.facebook.com`.

### Status atual
**Implementado** em `lib/publish/meta-provider.ts`. Aguardando OAuth tokens reais (BLOQUEIO HUMANO).

---

## TikTok Content Posting API

**API**: TikTok Content Posting API v2
**Endpoint**: `POST https://open.tiktokapis.com/v2/post/publish/video/init/`

### Fluxo

```json
{
  "post_info": {
    "title": "...",
    "privacy_level": "PUBLIC_TO_EVERYONE",
    "disable_duet": false,
    "disable_comment": false
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "video_url": "https://...",
    "video_cover_timestamp_ms": 0
  }
}
```

Retorna `publish_id`. Verificar status:
```
POST https://open.tiktokapis.com/v2/post/publish/status/fetch/
  { "publish_id": "..." }
```

### Requisitos
- Scopes: `video.upload`, `video.publish`
- App submetido para auditoria TikTok para posts públicos
- Limite: 25 vídeos/dia
- **Env var**: `TIKTOK_ACCESS_TOKEN`

### Status atual
**Implementado** em `lib/publish/tiktok-provider.ts`. Requer OAuth + auditoria de app (BLOQUEIO HUMANO).

---

## YouTube Shorts

**API**: YouTube Data API v3
**Endpoint**: `POST https://www.googleapis.com/upload/youtube/v3/videos`

### Upload em duas etapas
1. Iniciar upload resumível → retorna `upload_url`
2. `PUT <upload_url>` com bytes do vídeo

### Parâmetros para Shorts
- Dimensões: 9:16 (vertical), ≤ 60s
- `snippet.title` ≤ 100 chars
- `status.privacyStatus`: public | private | unlisted

### Requisitos
- OAuth 2.0 com scopes `youtube.upload`, `youtube.force-ssl`
- Quota: 10.000 unidades/dia (upload = 1.600 unidades)
- **Env vars**: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

### Status atual
**Pendente** — não implementado neste sprint. Provider placeholder marcado no `lib/publish/index.ts`.

---

## Shopee Video

Shopee não tem API pública de postagem de vídeo para afiliados.
Publicação apenas via app/web manual.

**Status**: ManualPublicationProvider usado como fallback.

---

## Provider Status Summary

| Canal | Implementado | Precisa OAuth | Pronto para produção |
|-------|-------------|---------------|---------------------|
| Manual | ✅ | ❌ | ✅ |
| Instagram/Meta | ✅ | ✅ (BLOQUEIO) | ❌ |
| TikTok | ✅ | ✅ (BLOQUEIO) | ❌ |
| YouTube Shorts | ❌ | ✅ (BLOQUEIO) | ❌ |
| Shopee Video | N/A | N/A | Manual only |
