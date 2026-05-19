import { GoogleGenerativeAI } from '@google/generative-ai'

// RPD'ye göre sıralı — 3.1-flash-lite önce (500/gün), sonra 20/gün olanlar
const MODEL_FALLBACKS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3-flash',
]

export async function generateWithFallback(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const genAI = new GoogleGenerativeAI(apiKey)

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      if (text) {
        console.log(`[AI] ${modelName} kullanıldı`)
        return text
      }
    } catch (err: any) {
      console.warn(`[AI] ${modelName} başarısız: ${err?.message ?? err}`)
      // Bir sonraki modele geç (rate limit, model bulunamadı, vs.)
    }
  }

  console.error('[AI] Tüm modeller başarısız oldu')
  return null
}
