import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { MagazineEditor } from '@/components/magazine/MagazineEditor'

export const dynamic = 'force-dynamic'

export default async function MagazineEditPage({
  params,
}: {
  params: Promise<{ classroomId: string; magazineId: string }>
}) {
  const { classroomId, magazineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: magazine } = await supabase.from('class_magazines').select('*').eq('id', magazineId).single()
  if (!magazine) notFound()

  const { data: classroom } = await supabase.from('classrooms').select('owner_id, name').eq('id', classroomId).single()
  if (!classroom || classroom.owner_id !== user.id) redirect(`/classroom/${classroomId}/magazine`)
  if (magazine.status === 'published') redirect(`/classroom/${classroomId}/magazine/${magazineId}`)

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const sectionIds = (sections ?? []).map((s: any) => s.id as string)
  const { data: entries } = sectionIds.length > 0
    ? await supabase.from('magazine_entries').select('*').in('section_id', sectionIds).order('sort_order')
    : { data: [] }

  const sectionsWithEntries = (sections ?? []).map((s: any) => ({
    ...s,
    entries: (entries ?? []).filter((e: any) => e.section_id === s.id),
  }))

  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select(`
      id, project_id, status,
      student:profiles!assignment_submissions_student_id_fkey(display_name, username),
      assignment:classroom_assignments!assignment_submissions_assignment_id_fkey(title, classroom_id)
    `)
    .in('status', ['submitted', 'graded'])
    .not('project_id', 'is', null)

  const classSubmissions = (submissions ?? []).filter(
    (s: any) => (s.assignment as any)?.classroom_id === classroomId
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/classroom/${classroomId}/magazine`} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {magazine.title}
          </h1>
          <p className="text-xs text-slate-400">Sayı #{magazine.issue_number} · Taslak</p>
        </div>
      </div>

      <MagazineEditor
        magazine={magazine as import('@/types').ClassMagazine}
        initialSections={sectionsWithEntries as import('@/types').MagazineSection[]}
        submissions={classSubmissions as unknown as Parameters<typeof MagazineEditor>[0]['submissions']}
        classroomId={classroomId}
      />
    </div>
  )
}
