import Link from 'next/link'
import { Compass, BookOpen } from 'lucide-react'

export const metadata = { title: 'Sayfa bulunamadı' }

/**
 * Kodda 26 yerde `notFound()` çağrılıyor — silinmiş proje, yanlış kullanıcı
 * adı, yetkisiz admin sayfası. Bu dosya olmadan hepsi Next'in varsayılan
 * 404'üne düşüyordu: İngilizce ve çıkışsız.
 *
 * Boş ekran yön göstermek için bir fırsattır: kullanıcıyı kaybolduğu yerden
 * içeriğe götüren iki bağlantı veriyoruz.
 */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <p className="font-display text-7xl font-bold text-primary/25">404</p>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">Bu sayfa yok</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Aradığın sayfa taşınmış, silinmiş ya da adresi yanlış yazılmış olabilir.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/explore"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-sm font-medium transition-colors"
          >
            <Compass className="w-4 h-4" />
            Projeleri keşfet
          </Link>
          <Link
            href="/kitaplik"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg ring-1 ring-border text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Kütüphane
          </Link>
        </div>
      </div>
    </div>
  )
}
