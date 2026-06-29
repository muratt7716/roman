import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function guardTeacher(supabase: Awaited<ReturnType<typeof createClient>>, magazineId: string, userId: string) {
  const { data } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()
  if (!data) return { ok: false, published: true }
  return {
    ok: (data.classroom as unknown as { owner_id: string }).owner_id === userId,
    published: data.status === 'published',
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string; entryId: string }> }) {
  const { magazineId, entryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await guardTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if ('display_name' in body) updates.display_name = body.display_name
  if ('is_featured' in body) updates.is_featured = body.is_featured
  if ('sort_order' in body) updates.sort_order = body.sort_order

  const { error } = await supabase.from('magazine_entries').update(updates).eq('id', entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string; entryId: string }> }) {
  const { magazineId, entryId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { ok, published } = await guardTeacher(supabase, magazineId, user.id)
  if (!ok) return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (published) return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { error } = await supabase.from('magazine_entries').delete().eq('id', entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
