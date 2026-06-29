import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data, error } = await supabase
    .from('class_magazines')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ magazines: data ?? [] })
}

export async function POST(req: Request, { params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: classroom } = await supabase.from('classrooms').select('owner_id').eq('id', classroomId).single()
  if (!classroom || classroom.owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })

  const { title, sections } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Başlık zorunlu.' }, { status: 400 })
  if (!sections?.length) return NextResponse.json({ error: 'En az bir bölüm ekle.' }, { status: 400 })

  const { count } = await supabase
    .from('class_magazines')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', classroomId)

  const { data: magazine, error } = await supabase
    .from('class_magazines')
    .insert({ classroom_id: classroomId, title: title.trim(), issue_number: (count ?? 0) + 1 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sectionRows = (sections as string[]).map((type, i) => ({
    magazine_id: magazine.id, type, sort_order: i,
  }))
  const { error: secErr } = await supabase.from('magazine_sections').insert(sectionRows)
  if (secErr) return NextResponse.json({ error: secErr.message }, { status: 500 })

  return NextResponse.json({ magazine }, { status: 201 })
}
