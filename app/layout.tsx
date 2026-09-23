import type { Metadata } from 'next'
import { Inter, Playfair_Display, Lora } from 'next/font/google'
import { Toaster } from 'sonner'
import { MusicWidget } from '@/components/MusicWidget'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'
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
  // metadataBase olmadan OG görselleri ve canonical adresler göreli kalır;
  // paylaşım önizlemeleri de arama motoru kayıtları da bozulur.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Birlikte Yaz`,
    // Alt sayfalar yalnızca kendi adını verir, site adı otomatik eklenir
    template: `%s — ${SITE_NAME}`,
  },
  // Açıklama arama sonuçlarında görünen metindir; Türkçe bir platformda
  // İngilizce durması hem yanlış kitleye hitap eder hem eşleşmeyi düşürür.
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'tr_TR',
    url: SITE_URL,
    title: `${SITE_NAME} — Birlikte Yaz`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Birlikte Yaz`,
    description: SITE_DESCRIPTION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${inter.variable} ${playfair.variable} ${lora.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <MusicWidget />
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  )
}
