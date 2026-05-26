import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'

interface Params { params: Promise<{ sprintId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { word_count } = await req.json()
  const wc = Math.max(0, Number(word_count) || 0)

  const { error } = await supabase
    .from('sprint_participants')
    .update({ word_count: wc, finished_at: new Date().toISOString() })
    .eq('sprint_id', sprintId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Streak güncelle
  if (wc > 0) {
    const today = new Date().toISOString().slice(0, 10)
    await supabase
      .from('user_writing_goals')
      .upsert(
        { user_id: user.id, streak_last_date: today },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )
  }

  // Rozet kontrol
  const newBadges = await checkAllBadges(supabase, user.id)

  return NextResponse.json({ ok: true, newBadges })
}
