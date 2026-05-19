import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/gemini'

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ suggestion: null }, { status: 200 })

  try {
    const { content, chapterTitle } = await req.json()
    const lastParagraphs = content?.split('\n').filter(Boolean).slice(-5).join('\n') ?? ''

    const prompt = `Sen deneyimli bir Türk roman editörüsün. Yazar tıkandı ve devam için fikir istiyor.

Bölüm başlığı: ${chapterTitle ?? 'Bilinmiyor'}

Son yazılan paragraflar:
${lastParagraphs || '(Henüz hiçbir şey yazılmamış)'}

Yazara şunları sun:
1. **Bu sahneyi nereye götürebilirsin?** — 2-3 farklı yön öner (tek cümlelik)
2. **Bir sonraki cümle için başlangıç** — 2 farklı seçenek yaz (direkt kullanılabilir)
3. **Küçük bir ipucu** — sahneyi canlandıracak bir detay ya da duygu

Cevabını kısa tut, maksimum 120 kelime. Türkçe yaz.`

    const suggestion = await generateWithFallback(prompt)
    return NextResponse.json({ suggestion })
  } catch (err: any) {
    const msg = err?.message ?? 'Bilinmeyen hata'
    console.error('[AI suggest]', msg)
    return NextResponse.json({ suggestion: null, error: msg }, { status: 500 })
  }
}
