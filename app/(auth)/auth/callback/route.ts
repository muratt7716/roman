import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
