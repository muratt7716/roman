import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/follows
// Body: { following_id: string }
// Toggles: follows if not following, unfollows if already following
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { following_id } = await req.json()
  if (!following_id || following_id === user.id) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', following_id)
    .single()

  if (existing) {
    await supabase.from('follows').delete()
      .eq('follower_id', user.id).eq('following_id', following_id)
    return NextResponse.json({ following: false })
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id })
    return NextResponse.json({ following: true })
  }
}
