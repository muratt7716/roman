import type { Metadata } from 'next'
import { CharacterGenerator } from '@/components/CharacterGenerator'

export const metadata: Metadata = { title: 'Karakter Jeneratörü — Kalem Birliği' }

export default function GeneratorPage() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display">Karakter Jeneratörü</h1>
          <p className="text-muted-foreground text-sm">
            Boş sayfayla baş başa kaldıysan burası seni kurtarır. Bir karakter üret,
            beğenmediğin özellikleri yenile, Gemini&apos;ye derinleştir.
          </p>
        </div>
        <CharacterGenerator />
      </div>
    </div>
  )
}
