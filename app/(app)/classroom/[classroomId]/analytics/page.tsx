import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsPanel } from '@/components/classroom/AnalyticsPanel'

export const metadata: Metadata = { title: 'Sınıf İstatistikleri — Kalem Birliği' }
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ classroomId: string }>
}

export default async function ClassroomAnalyticsPage({ params }: PageProps) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: classroom },
    { data: membership },
  ] = await Promise.all([
    supabase.from('classrooms').select('name').eq('id', classroomId).single(),
    supabase.from('classroom_members').select('role').eq('classroom_id', classroomId).eq('user_id', user.id).single(),
  ])

  if (!classroom || !membership || membership.role !== 'teacher') notFound()

  const { data: assignmentsData } = await supabase
    .from('classroom_assignments')
    .select('id, title')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  const assignmentIds = (assignmentsData ?? []).map((a: { id: string }) => a.id)

  const { data: membersData } = await supabase
    .from('classroom_members')
    .select('user_id, role, profile:profiles!left(id, username, display_name)')
    .eq('classroom_id', classroomId)
    .eq('role', 'student')

  const studentIds = (membersData ?? []).map((m: { user_id: string }) => m.user_id)

  const [
    { data: allSubmissions },
    { data: streakData },
  ] = await Promise.all([
    supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, status, grade')
      .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('user_writing_goals')
      .select('user_id, streak_current')
      .in('user_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])
      .gt('streak_current', 0),
  ])

  const submissionRate = (assignmentsData ?? []).map((a: { id: string; title: string }) => {
    const total = studentIds.length
    const submitted = (allSubmissions ?? []).filter(
      (s: { assignment_id: string; status: string }) => s.assignment_id === a.id && s.status !== 'draft'
    ).length
    return { assignment_id: a.id, title: a.title, submitted, total, rate: total > 0 ? Math.round((submitted / total) * 100) : 0 }
  })

  const gradedSubs = (allSubmissions ?? []).filter((s: { status: string; grade: number | null }) => s.status === 'graded' && s.grade !== null)
  const gradeDistribution = {
    '0-49':   gradedSubs.filter((s: { grade: number }) => s.grade < 50).length,
    '50-69':  gradedSubs.filter((s: { grade: number }) => s.grade >= 50 && s.grade < 70).length,
    '70-84':  gradedSubs.filter((s: { grade: number }) => s.grade >= 70 && s.grade < 85).length,
    '85-100': gradedSubs.filter((s: { grade: number }) => s.grade >= 85).length,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href={`/classroom/${classroomId}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
      >
        ← {classroom.name}
      </Link>

      <div>
        <h1 className="text-2xl font-display font-black text-white">Sınıf İstatistikleri</h1>
        <p className="text-sm text-slate-400 mt-1">{classroom.name}</p>
      </div>

      <AnalyticsPanel
        submissionRate={submissionRate}
        streaks={streakData ?? []}
        gradeDistribution={gradeDistribution}
        members={(membersData ?? []) as any}
      />
    </div>
  )
}
