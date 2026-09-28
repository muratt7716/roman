import type { SupabaseClient } from '@supabase/supabase-js'
import { istanbulDate, daysBetween } from '@/lib/time'

/**
 * Yazı serisini bugün için bir kez işler: dün yazdıysa +1, ara verdiyse 1'den başlar.
 * Seriyi değiştiren TEK yer burası olmalı.
 *
 * Eskiden sprint bitirme ve ödeve başlama `streak_last_date`'i doğrudan bugüne
 * çekiyor ama seriyi artırmıyordu; /api/writing-goal da "bugün zaten sayılmış"
 * sanıp atlıyordu — o gün seri hiç artmıyordu.
 */
export async function bumpStreak(supabase: SupabaseClient, userId: string) {
  const today = istanbulDate()
  const { data: goal } = await supabase
    .from('user_writing_goals')
    .select('daily_target, streak_current, streak_best, streak_last_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (goal?.streak_last_date === today) return goal

  const last = goal?.streak_last_date as string | null | undefined
  const current = last && daysBetween(last, today) === 1 ? (goal?.streak_current ?? 0) + 1 : 1
  const row = {
    user_id: userId,
    daily_target: goal?.daily_target ?? 500,
    streak_current: current,
    streak_best: Math.max(current, goal?.streak_best ?? 0),
    streak_last_date: today,
    updated_at: new Date().toISOString(),
  }
  await supabase.from('user_writing_goals').upsert(row)
  return row
}
