import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function isTeacher(supabase: Awaited<ReturnType<typeof createClient>>, magazineId: string, userId: string) {
  const { data } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()
  if (!data) return { ok: false, published: false }
  return {
    ok: (data.classroom as unknown as { owner_id: string }).owner_id === userId,
    published: data.status === 'published',
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string }> }) {
  const { magazineId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await isTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { error } = await supabase.from('magazine_sections').delete().eq('id', sectionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string }> }) {
  const { magazineId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await isTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { sort_order } = await req.json()
  const { error } = await supabase.from('magazine_sections').update({ sort_order }).eq('id', sectionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
