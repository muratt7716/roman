import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'

// GET /api/writing-goal
// Returns: { daily_target, streak_current, streak_best, today_words }
// Also updates streak server-side
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Fetch today's words written (UTC day)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setUTCHours(23, 59, 59, 999)

  const { data: versions } = await supabase
    .from('chapter_versions')
    .select('word_count')
    .eq('author_id', user.id)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())

  const todayWords = (versions ?? []).reduce(
    (s: number, v: { word_count: number }) => s + (v.word_count ?? 0),
    0
  )

  // Fetch or create goal row
  const { data: existing } = await supabase
    .from('user_writing_goals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const goal = existing ?? {
    user_id: user.id,
    daily_target: 500,
    streak_current: 0,
    streak_best: 0,
    streak_last_date: null,
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  let { streak_current, streak_best, streak_last_date } = goal
  let streakUpdated = false

  if (todayWords > 0 && streak_last_date !== todayStr) {
    // User wrote today — update streak
    if (!streak_last_date) {
      streak_current = 1
    } else {
      const last = new Date(streak_last_date)
      const now = new Date(todayStr)
      const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000)
      streak_current = diffDays <= 1 ? streak_current + 1 : 1
    }
    streak_best = Math.max(streak_current, streak_best)
    streak_last_date = todayStr
    streakUpdated = true
  } else if (streak_last_date && streak_last_date !== todayStr) {
    // Check for streak break (more than 1 day gap)
    const last = new Date(streak_last_date)
    const now = new Date(todayStr)
    const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000)
    if (diffDays > 1 && streak_current > 0) {
      streak_current = 0
      streakUpdated = true
    }
  }

  if (streakUpdated || !existing) {
    await supabase.from('user_writing_goals').upsert({
      user_id: user.id,
      daily_target: goal.daily_target,
      streak_current,
      streak_best,
      streak_last_date,
      updated_at: new Date().toISOString(),
    })

    // Check streak-related badges after update
    await checkAllBadges(supabase, user.id)
  }

  return NextResponse.json({
    daily_target: goal.daily_target,
    streak_current,
    streak_best,
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
