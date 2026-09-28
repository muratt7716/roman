import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/gemini'
import { requireUserForAi, clip } from '@/lib/ai-guard'

export async function POST(req: Request) {
  const denied = await requireUserForAi()
  if (denied) return denied
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ suggestion: null }, { status: 200 })

  try {
    const body = await req.json()
    const content = clip(body.content, 20000)
    const chapterTitle = clip(body.chapterTitle, 200)
    const lastParagraphs = content.split('\n').filter(Boolean).slice(-5).join('\n').slice(-4000)

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
  } catch (err) {
    // İç hata metnini (model adları, kota ayrıntısı) istemciye sızdırma
    console.error('[AI suggest]', (err as Error)?.message)
    return NextResponse.json({ suggestion: null, error: 'Öneri şu an alınamıyor.' }, { status: 500 })
  }
}
