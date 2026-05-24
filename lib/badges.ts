import type { SupabaseClient } from '@supabase/supabase-js'
import type { BadgeCode } from '@/types'

export const BADGE_META: Record<BadgeCode, { label: string; icon: string; desc: string }> = {
  first_chapter:    { label: 'İlk Adım',       icon: '🖊️', desc: 'İlk bölümünü yayınladın' },
  thousand_words:   { label: 'Bin Kelime',      icon: '📖', desc: 'Toplam 1.000 kelime yazdın' },
  seven_day_streak: { label: 'Ateş Yazar',      icon: '🔥', desc: '7 gün üst üste yazdın' },
  team_player:      { label: 'Ekip Oyuncusu',   icon: '👥', desc: 'Bir projeye üye oldun' },
  beloved:          { label: 'Sevildi',          icon: '❤️', desc: '10 alkış aldın' },
  followed:         { label: 'Takip Edildi',     icon: '🌟', desc: '5 takipçiye ulaştın' },
  reader_friend:    { label: 'Okur Dostu',       icon: '📚', desc: 'Projen 10 kez listeye eklendi' },
  editorial_pick:   { label: 'Editör Seçkisi',   icon: '🏆', desc: 'Editöryal seçkiye girdin' },
  first_submission: { label: 'İlk Teslim',       icon: '📝', desc: 'İlk ödevini teslim ettin' },
  consistent_writer:{ label: 'Düzenli Yazar',    icon: '📅', desc: '3 ödevi zamanında teslim ettin' },
  star_student:     { label: 'Yıldız Öğrenci',   icon: '⭐', desc: 'Bir ödevden tam puan aldın' },
  peer_reader:      { label: 'Okur Arkadaş',     icon: '🤝', desc: 'Sınıf arkadaşının yazısını okudun' },
}

export const ALL_BADGE_CODES = Object.keys(BADGE_META) as BadgeCode[]

export async function awardBadge(
  supabase: SupabaseClient,
  userId: string,
  badgeCode: BadgeCode
): Promise<boolean> {
  const { error } = await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_code: badgeCode })
  // error code 23505 = unique_violation (already has badge) — ignore it
  return !error || error.code === '23505'
}

export async function checkAllBadges(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCode[]> {
  // Get already earned badges
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_code')
    .eq('user_id', userId)
  const earned = new Set((existing ?? []).map((b: { badge_code: string }) => b.badge_code))

  const newlyAwarded: BadgeCode[] = []

  async function maybeAward(code: BadgeCode, check: () => Promise<boolean>) {
    if (earned.has(code)) return
    if (await check()) {
      await awardBadge(supabase, userId, code)
      newlyAwarded.push(code)
    }
  }

  // first_chapter: has at least one final chapter created by user
  await maybeAward('first_chapter', async () => {
    const { count } = await supabase
      .from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', 'final')
    return (count ?? 0) >= 1
  })

  // thousand_words: total words across all versions authored by user >= 1000
  await maybeAward('thousand_words', async () => {
    const { data } = await supabase
      .from('chapter_versions')
      .select('word_count')
      .eq('author_id', userId)
    const total = (data ?? []).reduce((s: number, v: { word_count: number }) => s + (v.word_count ?? 0), 0)
    return total >= 1000
  })

  // seven_day_streak: streak_current >= 7
  await maybeAward('seven_day_streak', async () => {
    const { data } = await supabase
      .from('user_writing_goals')
      .select('streak_current')
      .eq('user_id', userId)
      .single()
    return (data?.streak_current ?? 0) >= 7
  })

  // team_player: member of a project they don't own
  await maybeAward('team_player', async () => {
    const { data } = await supabase
      .from('project_members')
      .select('project_id, projects!inner(owner_id)')
      .eq('user_id', userId)
    const notOwned = (data ?? []).filter((m: any) => m.projects?.owner_id !== userId)
    return notOwned.length >= 1
  })

  // beloved: total reactions on user's chapters >= 10
  await maybeAward('beloved', async () => {
    const { data: userChapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('created_by', userId)
    const chapterIds = (userChapters ?? []).map((c: { id: string }) => c.id)
    if (chapterIds.length === 0) return false
    const { count } = await supabase
      .from('chapter_reactions')
      .select('id', { count: 'exact', head: true })
      .in('chapter_id', chapterIds)
    return (count ?? 0) >= 10
  })

  // followed: has 5+ followers
  await maybeAward('followed', async () => {
    const { count } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId)
    return (count ?? 0) >= 5
  })

  // reader_friend: user's projects added to reading lists 10+ times total
  await maybeAward('reader_friend', async () => {
    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
    const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id)
    if (projectIds.length === 0) return false
    const { count } = await supabase
      .from('reading_lists')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds)
    return (count ?? 0) >= 10
  })

  // editorial_pick: checked separately in editorial-picks API — skip here
  return newlyAwarded
}
