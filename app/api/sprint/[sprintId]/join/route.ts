import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ sprintId: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Sprint var mı ve katılılabilir mi?
  const { data: sprint } = await supabase
    .from('writing_sprints')
    .select('id, status, starts_at')
    .eq('id', sprintId)
    .single()

  if (!sprint) return NextResponse.json({ error: 'Sprint bulunamadı.' }, { status: 404 })
  if (sprint.status === 'finished') return NextResponse.json({ error: 'Sprint sona erdi.' }, { status: 400 })

  // Kullanıcının en son kelime sayısını referans al
  const { data: latestVersion } = await supabase
    .from('chapter_versions')
    .select('word_count')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const start_word_ref = latestVersion?.word_count ?? 0

  const { error } = await supabase
    .from('sprint_participants')
    .upsert(
      { sprint_id: sprintId, user_id: user.id, start_word_ref, word_count: 0 },
      { onConflict: 'sprint_id,user_id', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, start_word_ref })
}
