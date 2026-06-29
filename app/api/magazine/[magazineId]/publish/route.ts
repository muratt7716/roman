import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_: Request, { params }: { params: Promise<{ magazineId: string }> }) {
  const { magazineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: magazine } = await supabase
    .from('class_magazines')
    .select('*, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()

  if (!magazine) return NextResponse.json({ error: 'Dergi bulunamadı.' }, { status: 404 })
  if ((magazine.classroom as unknown as { owner_id: string }).owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (magazine.status === 'published')
    return NextResponse.json({ error: 'Dergi zaten yayımlandı.' }, { status: 400 })

  const { error } = await supabase
    .from('class_magazines')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', magazineId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Öğrencilere bildirim gönder
  const { data: members } = await supabase
    .from('classroom_members')
    .select('user_id')
    .eq('classroom_id', magazine.classroom_id)
    .eq('role', 'student')

  if (members?.length) {
    const notifications = members.map(m => ({
      user_id: m.user_id,
      type: 'magazine_published' as const,
      payload: {
        magazine_id: magazineId,
        magazine_title: magazine.title,
        classroom_id: magazine.classroom_id,
      },
    }))
    await supabase.from('notifications').insert(notifications)
  }

  return NextResponse.json({ ok: true })
}
