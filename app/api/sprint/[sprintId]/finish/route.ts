import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'
import { bumpStreak } from '@/lib/streak'

interface Params { params: Promise<{ sprintId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { word_count } = await req.json()

  // Kelime sayısı kullanıcının beyanı. Sınırsız olunca `999999` ile rozet ve
  // sıralama bedavaya alınabiliyordu; dakikada 100 kelime insan üst sınırı.
  const { data: sprint } = await supabase.from('writing_sprints').select('duration_minutes').eq('id', sprintId).single()
  const cap = (sprint?.duration_minutes ?? 45) * 100
  const wc = Math.min(cap, Math.max(0, Math.floor(Number(word_count) || 0)))

  const { data: updated, error } = await supabase
    .from('sprint_participants')
    .update({ word_count: wc, finished_at: new Date().toISOString() })
    .eq('sprint_id', sprintId)
    .eq('user_id', user.id)
    .select('user_id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Bu sprinte katılmamışsın.' }, { status: 400 })

  if (wc > 0) await bumpStreak(supabase, user.id)

  // Rozet kontrol
  const newBadges = await checkAllBadges(supabase, user.id)

  return NextResponse.json({ ok: true, newBadges })
}
