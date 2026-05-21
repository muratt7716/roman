import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/reactions?chapter_id=xxx
// Returns: { counts: { fire: N, drop: N, bolt: N }, userReactions: string[] }
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
// Body: { chapter_id: string, reaction: 'fire'|'drop'|'bolt' }
// Toggles: adds if not present, removes if present
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
    await supabase.from('chapter_reactions').delete().eq('id', existing.id)
    return NextResponse.json({ active: false })
  } else {
    await supabase.from('chapter_reactions').insert({ chapter_id, user_id: user.id, reaction })
    return NextResponse.json({ active: true })
  }
}
