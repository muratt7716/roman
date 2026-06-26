import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const REACTION_EMOJI: Record<string, string> = { fire: '🔥', drop: '💧', bolt: '⚡' }

// GET /api/reactions?chapter_id=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const chapterId = searchParams.get('chapter_id')
  if (!chapterId) return NextResponse.json({ error: 'chapter_id gerekli' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: reactions } = await supabase
    .from('chapter_reactions')
    .select('reaction, user_id')
    .eq('chapter_id', chapterId)

  const counts = { fire: 0, drop: 0, bolt: 0 }
  const userReactions: string[] = []

  for (const r of reactions ?? []) {
    if (r.reaction in counts) counts[r.reaction as keyof typeof counts]++
    if (user && r.user_id === user.id) userReactions.push(r.reaction)
  }

  return NextResponse.json({ counts, userReactions })
}

// POST /api/reactions
// Body: { chapter_id, reaction: 'fire'|'drop'|'bolt' }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { chapter_id, reaction } = await req.json()
  if (!chapter_id || !['fire', 'drop', 'bolt'].includes(reaction)) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('chapter_reactions')
    .select('id')
    .eq('chapter_id', chapter_id)
    .eq('user_id', user.id)
    .eq('reaction', reaction)
    .single()

  if (existing) {
    const { error } = await supabase.from('chapter_reactions').delete().eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ active: false })
  }

  const { error } = await supabase.from('chapter_reactions').insert({ chapter_id, user_id: user.id, reaction })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Yazar farklıysa bildirim gönder
  const { data: chapter } = await supabase
    .from('chapters')
    .select('title, created_by, project:projects(id, slug)')
    .eq('id', chapter_id)
    .single()

  if (chapter && chapter.created_by && chapter.created_by !== user.id) {
    const { data: reactor } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    const project = (Array.isArray(chapter.project) ? chapter.project[0] : chapter.project) as { id: string; slug: string } | null

    await supabase.from('notifications').insert({
      user_id: chapter.created_by,
      type: 'reaction',
      payload: {
        chapter_id,
        chapter_title: chapter.title,
        project_id: project?.id,
        project_slug: project?.slug,
        reactor_display_name: reactor?.display_name,
        reactor_username: reactor?.username,
        reaction,
        emoji: REACTION_EMOJI[reaction],
      },
    })
  }

  return NextResponse.json({ active: true })
}
