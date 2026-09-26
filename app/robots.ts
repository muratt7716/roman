import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Oturum gerektiren her şey taranmaya kapalı. Bunlar zaten giriş isteyen
 * adresler; taranmaları hem boşa kota harcar hem arama sonuçlarında
 * kullanıcıyı giriş ekranına çarptırır.
 *
 * /projects altındaki yazma adresleri tek tek kapatılır — okuma adresleri
 * (/projects/[slug]/read/...) açık kalmalı, asıl içerik onlar.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/settings',
        '/notifications',
        '/admin',
        '/onay',
        '/login',
        '/signup',
        '/reset-password',
        '/forgot-password',
        '/classroom',
        '/sprint',
        '/fikir-odasi',
        '/jenerator',
        '/projects/*/write',
        '/projects/*/overview',
        '/projects/*/brainstorm',
        '/projects/*/wiki',
        '/projects/*/timeline',
        '/projects/*/history',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
