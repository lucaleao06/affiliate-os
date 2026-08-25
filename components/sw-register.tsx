'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => {}) // falha silenciosa — não bloquear o app
    }
  }, [])

  return null
}
