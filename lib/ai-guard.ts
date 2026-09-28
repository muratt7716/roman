import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Yapay zekâ rotalarının kapısı. Eskiden rotalar giriş kontrolü yapmıyordu:
 * internetteki herkes hesapsız çağırıp Gemini kotasını (günde ~500) tüketebilir,
 * rotayı bedava LLM olarak kullanabilirdi. Günde 5 sınırı yalnızca tarayıcının
 * localStorage'ında — güvenlik değil, kullanıcıya nezaket.
 *
 * Döner: giriş yoksa 401 yanıtı; varsa null (devam et).
 */
export async function requireUserForAi(): Promise<NextResponse | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ suggestion: null, error: 'Giriş yapman gerekiyor.' }, { status: 401 })
  return null
}

/** İstem şişirmeyi önle — editör son 5 paragrafı, jeneratör kısa bir profil yollar */
export function clip(text: unknown, max: number): string {
  return typeof text === 'string' ? text.slice(0, max) : ''
}
