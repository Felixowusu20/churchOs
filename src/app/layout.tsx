import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChurchOS',
  description: 'Church management — members, check-in, finance',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#1F2D4D',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})});if(window.caches){caches.keys().then(function(k){k.forEach(function(c){caches.delete(c)})})}}",
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
