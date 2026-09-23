import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/site'

export const alt = `${SITE_NAME} — Ortak Kurgu Ağı`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Link paylaşıldığında görünen kart. Statik bir PNG yerine üretilmesinin
 * sebebi: metin ve renkler tek yerden geliyor, marka değişince görsel de
 * değişiyor — ayrıca depoya 1200×630 bir ikili dosya girmiyor.
 *
 * Not: Google Fonts burada kullanılmıyor. ImageResponse yazı tipini çalışma
 * anında indirmek zorunda kalırdı; sistem yazı tipiyle kalmak görselin her
 * koşulda üretilmesini garantiler.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0a14 0%, #1a1030 55%, #2a1550 100%)',
          color: 'white',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #7c3aed 0%, #a78bfa 50%, #7c3aed 100%)',
            display: 'flex',
          }}
        />
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2, display: 'flex' }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 20,
            color: '#c4b5fd',
            letterSpacing: 6,
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          Ortak Kurgu Ağı
        </div>
        <div
          style={{
            fontSize: 26,
            marginTop: 44,
            color: 'rgba(255,255,255,0.62)',
            maxWidth: 780,
            textAlign: 'center',
            lineHeight: 1.45,
            display: 'flex',
          }}
        >
          Bir romanı tek başına yazmak zorunda değilsin.
        </div>
      </div>
    ),
    size
  )
}
