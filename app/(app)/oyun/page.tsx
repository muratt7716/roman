import type { Metadata } from 'next'
import { WordleGame } from '@/components/games/WordleGame'

export const metadata: Metadata = { title: 'Kelime Oyunu — Kalem Birliği' }

export default function GamePage() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold font-display">Kelime Oyunu</h1>
          <p className="text-muted-foreground text-sm">
            5 harfli Türkçe kelimeyi 6 denemede bul. Kafanı temizle, sonra yazmaya dön!
          </p>
        </div>
        <WordleGame />
      </div>
    </div>
  )
}
