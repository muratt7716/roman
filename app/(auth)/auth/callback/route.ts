import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  // Google'da "İptal" → ?error=access_denied (code yok). Giriş sayfası bunu
  // ayrı bir mesajla gösterir; genel "başarısız" demek kullanıcıyı yanıltır.
  const oauthError = searchParams.get('error')
  if (!code) {
    const reason = oauthError === 'access_denied' ? 'access_denied' : 'auth_callback_failed'
    return NextResponse.redirect(`${origin}/login?error=${reason}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const fallbackUsername = (
      user.user_metadata?.username ??
      user.email?.split('@')[0] ??
      'kullanici'
    ).toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + user.id.slice(0, 4)

    await supabase.from('profiles').upsert({
      id: user.id,
      username: fallbackUsername,
      display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  // Rıza yoksa (app) layout'u buradan /onay'a yönlendirir — callback'in
  // ayrıca kontrol etmesine gerek yok, kapı tek yerde durur.
  return NextResponse.redirect(`${origin}${next}`)
}
