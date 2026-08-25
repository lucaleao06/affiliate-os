'use client'

import { useEffect, useState } from 'react'

interface Notification {
  id: string
  event: string
  title: string
  body: string | null
  data: Record<string, string> | null
  read: boolean
  created_at: string
}

/** Short text indicator instead of emoji */
const EVENT_TAG: Record<string, { label: string; color: string; bg: string }> = {
  creative_ready:      { label: 'Criativo', color: 'var(--brand)',  bg: 'rgba(255,107,53,0.12)' },
  approval_required:   { label: 'Aprovação', color: '#fbbf24',     bg: 'rgba(251,191,36,0.1)' },
  render_completed:    { label: 'Render OK', color: '#4ade80',      bg: 'rgba(74,222,128,0.08)' },
  render_failed:       { label: 'Render !',  color: '#f87171',      bg: 'rgba(248,113,113,0.1)' },
  publication_ready:   { label: 'Pacote',    color: '#60a5fa',      bg: 'rgba(96,165,250,0.08)' },
  publication_failed:  { label: 'Pub. !',   color: '#f87171',      bg: 'rgba(248,113,113,0.1)' },
  winner_detected:     { label: 'Winner',    color: '#fbbf24',      bg: 'rgba(251,191,36,0.1)' },
  import_completed:    { label: 'Import OK', color: '#4ade80',      bg: 'rgba(74,222,128,0.08)' },
  import_failed:       { label: 'Import !',  color: '#f87171',      bg: 'rgba(248,113,113,0.1)' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json() as Promise<{ notifications: Notification[] }>)
      .then(j => { setItems(j.notifications ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readAll: true }),
    })
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = items.filter(n => !n.read).length

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black text-white">Notificações</h1>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(255,107,53,0.2)', color: 'var(--brand)' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95"
            style={{ background: 'var(--surface)', color: 'rgba(255,255,255,0.45)', border: '1px solid var(--border)' }}>
            Marcar todas lidas
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-4 animate-pulse"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex gap-3 items-center">
                <div className="w-12 h-5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl p-10 text-center space-y-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>–</div>
          <p className="text-sm font-semibold text-white">Nenhuma notificação ainda</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Avisos de render, aprovação e winners aparecem aqui.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map(n => {
            const tag = EVENT_TAG[n.event]
            return (
              <div key={n.id}
                className="rounded-2xl p-4 transition-all cursor-pointer active:scale-[0.99]"
                style={{
                  background: n.read ? 'rgba(17,17,39,0.4)' : 'var(--surface)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'}`,
                  opacity: n.read ? 0.65 : 1,
                }}
                onClick={() => !n.read && void markRead(n.id)}>

                <div className="flex items-start gap-3">
                  {/* Tag pill instead of emoji */}
                  {tag ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: tag.bg, color: tag.color }}>
                      {tag.label}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                      {n.event}
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight"
                        style={{ color: n.read ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)' }}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: 'var(--brand)' }} />
                        )}
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                    {n.body && (
                      <p className="text-xs mt-1 leading-relaxed"
                        style={{ color: n.read ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)' }}>
                        {n.body}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
