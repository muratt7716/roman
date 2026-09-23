'use client'

/**
 * Kök layout'un kendisi patlarsa devreye girer — error.tsx o noktada
 * yardım edemez, çünkü kendi üstündeki layout'u sarmalamaz.
 *
 * Bu dosya kök layout'un YERİNE geçtiği için kendi <html>/<body> etiketlerini
 * kurmak zorunda ve global stiller buraya ULAŞMAZ. Dolayısıyla renkler
 * satır içi yazılıyor; Tailwind sınıfı burada işe yaramaz.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0a14',
          color: '#f5f3ff',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          padding: 24,
        }}
      >
        <title>Bir şeyler ters gitti — Kalem Birliği</title>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px' }}>
            Bir şeyler ters gitti
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(245,243,255,0.65)', margin: '0 0 24px' }}>
            Uygulama beklenmeyen bir hatayla karşılaştı. Sayfayı yenilemeyi deneyebilirsin.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(245,243,255,0.4)', margin: '0 0 20px' }}>
              Hata kodu: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(167,139,250,0.4)',
              background: 'rgba(124,58,237,0.18)',
              color: '#c4b5fd',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  )
}
