'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface ConnectionStatus {
  connected: boolean
  expired?: boolean
  username?: string
  channelTitle?: string
  userId?: string
  channelId?: string
  expiresAt?: string
  connectedAt?: string
}

function ConnectPageInner() {
  const params = useSearchParams()
  const success = params.get('success')
  const error = params.get('error')
  const igHandle = params.get('ig')
  const ytChannel = params.get('channel')

  const [ig, setIg] = useState<ConnectionStatus | null>(null)
  const [yt, setYt] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [igRes, ytRes] = await Promise.all([
        fetch('/api/connect/meta/status').then(r => r.json()).catch(() => ({ connected: false })),
        fetch('/api/connect/youtube/status').then(r => r.json()).catch(() => ({ connected: false })),
      ])
      setIg(igRes as ConnectionStatus)
      setYt(ytRes as ConnectionStatus)
      setLoading(false)
    }
    load()
  }, [])

  function relDate(iso?: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>
          Conexões
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Conecte suas redes para publicação automática
        </p>
      </div>

      {/* Toast messages */}
      {success === 'instagram' && (
        <div className="rounded-xl p-4 text-sm font-medium"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
          ✅ Instagram conectado{igHandle ? ` como @${igHandle}` : ''}!
        </div>
      )}
      {success === 'youtube' && (
        <div className="rounded-xl p-4 text-sm font-medium"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
          ✅ YouTube conectado{ytChannel ? ` — ${ytChannel}` : ''}!
        </div>
      )}
      {error && (
        <div className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
          ❌ Erro: {decodeURIComponent(error).replace(/_/g, ' ')}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Verificando conexões...
        </div>
      ) : (
        <div className="space-y-3">
          {/* Instagram */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' }}>
                  📸
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Instagram Reels
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Meta Graph API v21.0
                  </p>
                </div>
              </div>
              <StatusBadge status={ig} />
            </div>

            {ig?.connected ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span>👤</span>
                  <span>@{ig.username} · ID {ig.userId?.slice(0, 8)}…</span>
                </div>
                {ig.expiresAt && (
                  <div className="text-xs" style={{ color: ig.expired ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                    {ig.expired ? '⚠️ Token expirado — reconecte' : `Expira em ${relDate(ig.expiresAt)}`}
                  </div>
                )}
                <a href="/api/connect/meta"
                  className="block text-center text-xs py-2 rounded-lg mt-3 transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  🔄 Reconectar
                </a>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Necessário: conta Instagram Business ou Creator vinculada a uma Página do Facebook.
                </p>
                <a href="/api/connect/meta"
                  className="block text-center py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#833ab4,#fd1d1d)', color: '#fff' }}>
                  Conectar Instagram →
                </a>
              </div>
            )}
          </div>

          {/* YouTube */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: '#ff0000' }}>
                  ▶️
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    YouTube Shorts
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Data API v3 · max 60s
                  </p>
                </div>
              </div>
              <StatusBadge status={yt} />
            </div>

            {yt?.connected ? (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <span>📺</span>
                  <span>{yt.channelTitle}</span>
                </div>
                {yt.expiresAt && (
                  <div className="text-xs" style={{ color: yt.expired ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>
                    {yt.expired ? '⚠️ Token expirado — reconecte' : `Token expira em ${relDate(yt.expiresAt)} (renovado automaticamente)`}
                  </div>
                )}
                <a href="/api/connect/youtube"
                  className="block text-center text-xs py-2 rounded-lg mt-3 transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  🔄 Reconectar
                </a>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Necessário: conta Google com canal YouTube ativo.
                </p>
                <a href="/api/connect/youtube"
                  className="block text-center py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ background: '#ff0000', color: '#fff' }}>
                  Conectar YouTube →
                </a>
              </div>
            )}
          </div>

          {/* TikTok — lower priority */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.6 }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: '#000' }}>
                🎵
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  TikTok
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Em breve · requer auditoria de app
                </p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                EM BREVE
              </span>
            </div>
          </div>

          {/* Shopee */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: '#f63' }}>
                🛍️
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Shopee Afiliados
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Publicação manual · CSV import de vendas
                </p>
              </div>
              <span className="ml-auto text-[11px] px-2 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                MANUAL ✓
              </span>
            </div>
          </div>

          {/* Setup instructions */}
          <div className="rounded-xl p-4 text-xs space-y-1.5"
            style={{ background: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.15)', color: 'rgba(255,255,255,0.4)' }}>
            <p className="font-semibold" style={{ color: 'rgba(255,107,53,0.7)' }}>⚠️ Para conectar Instagram/YouTube</p>
            <p>1. Configure META_APP_ID + META_APP_SECRET no .env.local</p>
            <p>2. Configure GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET no .env.local</p>
            <p>3. Gere ENCRYPTION_KEY: <code>node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</code></p>
            <p>4. Adicione ao .env.local e reinicie o servidor</p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ConnectionStatus | null }) {
  if (!status) return null
  if (!status.connected) {
    return (
      <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
        Desconectado
      </span>
    )
  }
  if (status.expired) {
    return (
      <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0"
        style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>
        Expirado
      </span>
    )
  }
  return (
    <span className="text-[10px] px-2 py-1 rounded-full font-semibold shrink-0"
      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
      Conectado ✓
    </span>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Carregando...
      </div>
    }>
      <ConnectPageInner />
    </Suspense>
  )
}
