import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// GET /api/classroom/[classroomId]/assignments
export async function GET(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data, error } = await supabase
    .from('classroom_assignments')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignments: data ?? [] })
}

// POST /api/classroom/[classroomId]/assignments
// Body: { title, description?, due_date?, visibility }
export async function POST(req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Sadece öğretmen ödev oluşturabilir
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('owner_id', user.id)
    .single()

  if (!classroom) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

  const { title, description, due_date, visibility, min_word_count } = await req.json()
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    return NextResponse.json({ error: 'Başlık 3-200 karakter olmalı.' }, { status: 400 })
  }

  const minWords = Number(min_word_count)
  if (min_word_count != null && min_word_count !== '' && (!Number.isInteger(minWords) || minWords < 1 || minWords > 100000)) {
    return NextResponse.json({ error: 'Minimum kelime sayısı 1-100000 arasında olmalı.' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    classroom_id: classroomId,
    title: title.trim(),
    description: description?.trim() || null,
    due_date: due_date || null,
    visibility: visibility === 'class_visible' ? 'class_visible' : 'private',
  }
  // Kolon şemada yoksa insert patlamasın diye sadece değer verildiyse ekle
  if (min_word_count != null && min_word_count !== '') payload.min_word_count = minWords

  const { data, error } = await supabase
    .from('classroom_assignments')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data }, { status: 201 })
}
