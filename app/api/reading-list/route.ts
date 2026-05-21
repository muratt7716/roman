import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['want', 'reading', 'done']

// POST /api/reading-list
// Body: { project_id: string, status: 'want'|'reading'|'done' }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { project_id, status } = await req.json()
  if (!project_id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { error } = await supabase.from('reading_lists').upsert(
    { user_id: user.id, project_id, status, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,project_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}

// DELETE /api/reading-list?project_id=xxx
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'project_id gerekli' }, { status: 400 })

  await supabase.from('reading_lists').delete().eq('user_id', user.id).eq('project_id', project_id)
  return NextResponse.json({ ok: true })
}
