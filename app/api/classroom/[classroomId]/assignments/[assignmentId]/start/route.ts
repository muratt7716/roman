import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string; assignmentId: string }> }

// POST /api/classroom/[classroomId]/assignments/[assignmentId]/start
// Creates project + chapter + submission for a student
// If already started, returns existing submission
export async function POST(_req: Request, { params }: Params) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Verify student membership
  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()
  if (!membership || membership.role !== 'student') {
    return NextResponse.json({ error: 'Sadece öğrenciler başlayabilir.' }, { status: 403 })
  }

  // Check if already started
  const { data: existing } = await supabase
    .from('assignment_submissions')
    .select('id, project_id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing?.project_id) {
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('project_id', existing.project_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    return NextResponse.json({
      submission_id: existing.id,
      project_id: existing.project_id,
      chapter_id: chapter?.id,
    })
  }

  // Get assignment title
  const { data: assignment } = await supabase
    .from('classroom_assignments')
    .select('title')
    .eq('id', assignmentId)
    .single()
  if (!assignment) return NextResponse.json({ error: 'Ödev bulunamadı.' }, { status: 404 })

  const slug = `odev-${assignmentId.slice(0, 8)}-${user.id.slice(0, 8)}`

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: assignment.title,
      slug,
      visibility: 'closed',
      collaboration_status: 'active',
    })
    .select()
    .single()
  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })

  // Create chapter
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      project_id: project.id,
      title: assignment.title,
      status: 'draft',
      order_index: 1,
      created_by: user.id,
    })
    .select()
    .single()
  if (chapterError) return NextResponse.json({ error: chapterError.message }, { status: 500 })

  // Create submission record
  const { data: submission, error: subError } = await supabase
    .from('assignment_submissions')
    .insert({
      assignment_id: assignmentId,
      student_id: user.id,
      project_id: project.id,
      status: 'draft',
    })
    .select()
    .single()
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })

  return NextResponse.json({
    submission_id: submission.id,
    project_id: project.id,
    chapter_id: chapter.id,
  }, { status: 201 })
}
