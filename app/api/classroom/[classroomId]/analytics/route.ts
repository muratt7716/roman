import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// GET /api/classroom/[classroomId]/analytics
// Returns: submission rates, streak table, grade distribution
// Only teacher can access
export async function GET(_req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Teacher check
  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()
  if (!membership || membership.role !== 'teacher') {
    return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
  }

  const [
    { data: members },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from('classroom_members')
      .select('user_id, role, profile:profiles(id, username, display_name, avatar_url)')
      .eq('classroom_id', classroomId)
      .eq('role', 'student'),
    supabase
      .from('classroom_assignments')
      .select('id, title')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false }),
  ])

  const assignmentIds = (assignments ?? []).map((a: { id: string }) => a.id)
  const studentIds = (members ?? []).map((m: { user_id: string }) => m.user_id)

  const [
    { data: allSubmissions },
    { data: streakData },
  ] = await Promise.all([
    supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, status, grade, project_id')
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('user_writing_goals')
      .select('user_id, streak_current')
      .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
      .gt('streak_current', 0),
  ])

  // Grade distribution (graded submissions only)
  const gradedSubs = (allSubmissions ?? []).filter((s: { status: string; grade: number | null }) => s.status === 'graded' && s.grade !== null)
  const gradeDistribution = {
    '0-49':   gradedSubs.filter((s: { grade: number }) => s.grade < 50).length,
    '50-69':  gradedSubs.filter((s: { grade: number }) => s.grade >= 50 && s.grade < 70).length,
    '70-84':  gradedSubs.filter((s: { grade: number }) => s.grade >= 70 && s.grade < 85).length,
    '85-100': gradedSubs.filter((s: { grade: number }) => s.grade >= 85).length,
  }

  // Submission rate per assignment
  const submissionRate = (assignments ?? []).map((a: { id: string; title: string }) => {
    const total = studentIds.length
    const submitted = (allSubmissions ?? []).filter(
      (s: { assignment_id: string; status: string }) => s.assignment_id === a.id && s.status !== 'draft'
    ).length
    return {
      assignment_id: a.id,
      title: a.title,
      submitted,
      total,
      rate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    }
  })

  return NextResponse.json({
    members: members ?? [],
    assignments: assignments ?? [],
    submissionRate,
    streaks: streakData ?? [],
    gradeDistribution,
    totalStudents: studentIds.length,
  })
}
