import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'
import { bumpStreak } from '@/lib/streak'
import { istanbulDate, istanbulDayStart, daysBetween } from '@/lib/time'
import { wordsWrittenSince } from '@/lib/wordsWritten'

// GET /api/writing-goal
// Returns: { daily_target, streak_current, streak_best, today_words }
// Also updates streak server-side
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Bugün (İstanbul günü) yazılan kelime — bölüm başına fark, toplam değil
  const today = istanbulDate()
  const todayWords = await wordsWrittenSince(supabase, user.id, istanbulDayStart(today))

  const { data: existing } = await supabase
    .from('user_writing_goals')
    .select('daily_target, streak_current, streak_best, streak_last_date')
    .eq('user_id', user.id)
    .maybeSingle()

  let goal = existing ?? { daily_target: 500, streak_current: 0, streak_best: 0, streak_last_date: null }

  if (todayWords > 0 && goal.streak_last_date !== today) {
    goal = await bumpStreak(supabase, user.id)
    await checkAllBadges(supabase, user.id)
  } else if (goal.streak_last_date && daysBetween(goal.streak_last_date, today) > 1 && goal.streak_current > 0) {
    // Dün yazmadı → seri koptu
    goal = { ...goal, streak_current: 0 }
    await supabase.from('user_writing_goals').update({ streak_current: 0, updated_at: new Date().toISOString() }).eq('user_id', user.id)
  } else if (!existing) {
    await supabase.from('user_writing_goals').upsert({ user_id: user.id, daily_target: 500 })
  }

  return NextResponse.json({
    daily_target: goal.daily_target,
    streak_current: goal.streak_current,
    streak_best: goal.streak_best,
    today_words: todayWords,
  })
}

// POST /api/writing-goal
// Body: { daily_target: number }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { daily_target } = await req.json()
  if (typeof daily_target !== 'number' || daily_target < 50 || daily_target > 10000) {
    return NextResponse.json({ error: 'Hedef 50-10000 arasında olmalı.' }, { status: 400 })
  }

  const { error } = await supabase.from('user_writing_goals').upsert({
    user_id: user.id,
    daily_target,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, daily_target })
}
