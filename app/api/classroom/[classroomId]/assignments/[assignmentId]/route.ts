import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string; assignmentId: string }> }

// GET /api/classroom/[classroomId]/assignments/[assignmentId]
// Öğretmen: tüm teslimler + öğrenci profili; Öğrenci: kendi teslimi
export async function GET(_req: Request, { params }: Params) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const [{ data: assignment }, { data: myMembership }] = await Promise.all([
    supabase.from('classroom_assignments').select('*').eq('id', assignmentId).single(),
    supabase.from('classroom_members').select('role').eq('classroom_id', classroomId).eq('user_id', user.id).single(),
  ])

  if (!assignment || !myMembership) return NextResponse.json({ error: 'Erişim yok.' }, { status: 404 })

  const isTeacher = myMembership.role === 'teacher'

  if (isTeacher) {
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('*, student:profiles(id, username, display_name, avatar_url)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })
    return NextResponse.json({ assignment, submissions: submissions ?? [], myRole: 'teacher' })
  } else {
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()
    return NextResponse.json({ assignment, submission: submission ?? null, myRole: 'student' })
  }
}

// PATCH /api/classroom/[classroomId]/assignments/[assignmentId]
// Body: { title?, description?, due_date?, visibility? }
export async function PATCH(req: Request, { params }: Params) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('id')
    .eq('id', classroomId)
    .eq('owner_id', user.id)
    .single()
  if (!classroom) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.title) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.due_date !== undefined) updates.due_date = body.due_date || null
  if (body.visibility) updates.visibility = body.visibility

  const { data, error } = await supabase
    .from('classroom_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assignment: data })
}
