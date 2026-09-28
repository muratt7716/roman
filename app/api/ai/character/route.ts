import { NextResponse } from 'next/server'
import { generateWithFallback } from '@/lib/gemini'
import { requireUserForAi, clip } from '@/lib/ai-guard'

export async function POST(req: Request) {
  const denied = await requireUserForAi()
  if (denied) return denied
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ suggestion: null }, { status: 200 })

  try {
    const character = clip((await req.json()).character, 3000)

    const prompt = `Sen deneyimli bir Türk roman editörüsün. Aşağıdaki karakter profilini okuduktan sonra şunları yap:
1. Bu karakterin en güçlü dramatik potansiyelini 1-2 cümlede belirt
2. Bu karakterin sesi nasıl olur? (konuşma tarzı, kelime seçimi)
3. Bu karakteri hangi tür sahnede ilk tanıtırsın ve neden?

Karakter profili:
${character}

Cevabını kısa ve pratik tut, maksimum 150 kelime.`

    const suggestion = await generateWithFallback(prompt)
    return NextResponse.json({ suggestion })
  } catch {
    return NextResponse.json({ suggestion: null }, { status: 500 })
  }
}
