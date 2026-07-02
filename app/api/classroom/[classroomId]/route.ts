import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// GET /api/classroom/[classroomId] — sınıf detayı + üyeler
export async function GET(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const [{ data: classroom }, { data: members }] = await Promise.all([
    supabase.from('classrooms').select('*').eq('id', classroomId).single(),
    supabase
      .from('classroom_members')
      .select('*, profile:profiles!left(id, username, display_name, avatar_url)')
      .eq('classroom_id', classroomId),
  ])

  if (!classroom) return NextResponse.json({ error: 'Sınıf bulunamadı.' }, { status: 404 })

  const myRole = members?.find((m) => m.user_id === user.id)?.role ?? null
  if (!myRole) return NextResponse.json({ error: 'Bu sınıfa erişim yetkin yok.' }, { status: 403 })

  return NextResponse.json({ classroom, members: members ?? [], myRole })
}

// DELETE /api/classroom/[classroomId] — sınıfı sil (sadece owner)
export async function DELETE(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId)
    .eq('owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
