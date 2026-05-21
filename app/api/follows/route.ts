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
    const { error } = await supabase.from('follows').delete()
      .eq('follower_id', user.id).eq('following_id', following_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ following: false })
  } else {
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ following: true })
  }
}
