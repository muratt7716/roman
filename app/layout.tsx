import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Writer Squad — Birlikte Yaz',
  description: 'Stories were never meant to be written alone.',
  openGraph: {
    title: 'Writer Squad',
    description: 'Stories were never meant to be written alone.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
