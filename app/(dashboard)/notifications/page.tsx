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

const EVENT_ICONS: Record<string, string> = {
  creative_ready: '✨',
  approval_required: '⏳',
  render_completed: '🎬',
  render_failed: '❌',
  publication_ready: '📦',
  publication_failed: '❌',
  winner_detected: '🏆',
  import_completed: '📊',
  import_failed: '❌',
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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Notificações</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">
              Marcar todas como lidas
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-gray-400 text-sm">Nenhuma notificação ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(n => (
              <div
                key={n.id}
                className={`rounded-xl border p-4 transition cursor-pointer ${
                  n.read
                    ? 'border-gray-800 bg-gray-900/40'
                    : 'border-gray-700 bg-gray-900 shadow-sm'
                }`}
                onClick={() => !n.read && markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {EVENT_ICONS[n.event] ?? '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight ${n.read ? 'text-gray-400' : 'text-white'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                        <span className="text-xs text-gray-600">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    {n.body && (
                      <p className={`text-xs mt-1 leading-relaxed ${n.read ? 'text-gray-600' : 'text-gray-400'}`}>
                        {n.body}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
