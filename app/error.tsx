'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Sayfa render'ında yakalanmamış bir hata olursa devreye girer. Bu dosya
 * yokken kullanıcı Next'in ham hata ekranını görüyordu — üretimde bu, hiçbir
 * bağlam vermeyen boş bir "Application error" sayfasıdır.
 *
 * Next 16'da prop `retry` (eski sürümlerdeki `reset` değil): `retry()` veriyi
 * yeniden çekip alt ağacı yeniden render eder, `reset()` yalnızca hata
 * durumunu temizler. Burada sorun büyük ihtimalle veri tarafında olduğu için
 * `retry` doğru olan.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Üretimde hata izleme servisi yok; en azından tarayıcı konsoluna düşsün.
    console.error('[sayfa hatası]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">Bir şeyler ters gitti</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Yazdıkların kaybolmadı —
            tekrar denemek çoğu zaman yeterli oluyor.
          </p>
        </div>

        {error.digest && (
          <p className="text-[11px] text-muted-foreground/70 font-mono">
            Hata kodu: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Tekrar dene
          </button>
          <Link
            href="/"
            className="flex items-center justify-center px-4 py-2 rounded-lg ring-1 ring-border text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Anasayfaya dön
          </Link>
        </div>
      </div>
    </div>
  )
}
