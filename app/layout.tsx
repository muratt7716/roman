import type { Metadata } from 'next'
import { Inter, Playfair_Display, Lora } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kalem Birliği — Birlikte Yaz',
  description: 'Stories were never meant to be written alone.',
  openGraph: {
    title: 'Kalem Birliği',
    description: 'Stories were never meant to be written alone.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${inter.variable} ${playfair.variable} ${lora.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  )
}
