import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { SwRegister } from '@/components/sw-register'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Affiliate OS',
  description: 'Shopee Performance Machine — criativos e vídeos com IA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Affiliate OS',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full text-white antialiased" style={{ background: 'var(--bg)' }}>
        <SwRegister />
        {children}
      </body>
    </html>
  )
}
