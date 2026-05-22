import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardBadge } from '@/lib/badges'
import type { EditorialPick } from '@/types'

// GET /api/editorial-picks
// Returns top 3 projects by editorial score (last 7 days)
// Score = reactions×3 + reading_list_adds×2 + views×1
export async function GET() {
  const supabase = await createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, slug, cover_image_url, genre, owner_id, owner:profiles!projects_owner_id_fkey(display_name, username)')
    .eq('visibility', 'published')

  if (!projects || projects.length === 0) {
    return NextResponse.json({ picks: [] })
  }

  const projectIds = projects.map((p: any) => p.id)

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, project_id, view_count')
    .in('project_id', projectIds)
    .eq('status', 'final')

  if (!chapters || chapters.length === 0) {
    return NextResponse.json({ picks: [] })
  }

  const chapterIds = chapters.map((c: any) => c.id)

  const [
    { data: reactions },
    { data: readingLists },
  ] = await Promise.all([
    supabase
      .from('chapter_reactions')
      .select('chapter_id')
      .in('chapter_id', chapterIds)
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('reading_lists')
      .select('project_id')
      .in('project_id', projectIds)
      .gte('updated_at', sevenDaysAgo),
  ])

  const chapterToProject: Record<string, string> = {}
  const projectViewCount: Record<string, number> = {}
  for (const ch of chapters) {
    chapterToProject[ch.id] = ch.project_id
    projectViewCount[ch.project_id] = (projectViewCount[ch.project_id] ?? 0) + (ch.view_count ?? 0)
  }

  const scores: Record<string, number> = {}
  for (const p of projects) {
    scores[p.id] = (projectViewCount[p.id] ?? 0) * 1
  }
  for (const r of reactions ?? []) {
    const pid = chapterToProject[(r as any).chapter_id]
    if (pid) scores[pid] = (scores[pid] ?? 0) + 3
  }
  for (const rl of readingLists ?? []) {
    scores[(rl as any).project_id] = (scores[(rl as any).project_id] ?? 0) + 2
  }

  const ranked = projects
    .map((p: any) => ({ ...p, score: scores[p.id] ?? 0 }))
    .filter((p: any) => p.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3)

  // Award editorial_pick badge to owners of top picks
  for (const pick of ranked) {
    await awardBadge(supabase, pick.owner_id, 'editorial_pick')
  }

  const picks: EditorialPick[] = ranked.map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    cover_image_url: p.cover_image_url,
    genre: p.genre,
    owner_display_name: p.owner?.display_name ?? null,
    owner_username: p.owner?.username ?? '',
    score: p.score,
  }))

  return NextResponse.json({ picks })
}
