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

  const { title, description, due_date, visibility } = await req.json()
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    return NextResponse.json({ error: 'Başlık 3-200 karakter olmalı.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('classroom_assignments')
    .insert({
      classroom_id: classroomId,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: due_date || null,
      visibility: visibility === 'class_visible' ? 'class_visible' : 'private',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data }, { status: 201 })
}
