import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MagazineReader } from '@/components/magazine/MagazineReader'
import type { MagazineSection } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MagazineReaderPage({
  params,
}: {
  params: Promise<{ classroomId: string; magazineId: string }>
}) {
  const { classroomId, magazineId } = await params
  const supabase = await createClient()

  const { data: magazine } = await supabase.from('class_magazines').select('*').eq('id', magazineId).single()
  if (!magazine) notFound()

  const { data: classroom } = await supabase.from('classrooms').select('name, school_name').eq('id', classroomId).single()
  if (!classroom) notFound()

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const sectionIds = (sections ?? []).map(s => s.id)
  const { data: entries } = sectionIds.length > 0
    ? await supabase.from('magazine_entries').select(`
        *,
        submission:assignment_submissions(
          id, project_id, status,
          student:profiles!assignment_submissions_student_id_fkey(display_name, username),
          assignment:classroom_assignments!assignment_submissions_assignment_id_fkey(title)
        )
      `).in('section_id', sectionIds).order('sort_order')
    : { data: [] }

  // İçerikleri çek
  const projectIds = [...new Set((entries ?? []).map((e: { submission?: { project_id?: string } }) => e.submission?.project_id).filter(Boolean) as string[])]
  let contentMap: Record<string, string> = {}

  if (projectIds.length > 0) {
    const { data: chapters } = await supabase.from('chapters').select('project_id, id').in('project_id', projectIds)
    const chapterIds = (chapters ?? []).map(c => c.id)
    if (chapterIds.length > 0) {
      const { data: versions } = await supabase
        .from('chapter_versions')
        .select('chapter_id, content, created_at')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false })

      const latestPerChapter: Record<string, string> = {}
      for (const v of versions ?? []) {
        if (!latestPerChapter[v.chapter_id]) latestPerChapter[v.chapter_id] = v.content
      }
      for (const ch of chapters ?? []) {
        if (latestPerChapter[ch.id]) contentMap[ch.project_id] = latestPerChapter[ch.id]
      }
    }
  }

  const sectionsWithEntries: MagazineSection[] = (sections ?? []).map(s => ({
    ...s,
    entries: (entries ?? [])
      .filter((e: { section_id: string }) => e.section_id === s.id)
      .map((e: Record<string, unknown>) => ({
        ...e,
        submission: e.submission ? {
          ...(e.submission as Record<string, unknown>),
          latest_content: contentMap[(e.submission as { project_id?: string }).project_id ?? ''] ?? null,
        } : null,
      })),
  }))

  return (
    <MagazineReader
      title={magazine.title}
      issueNumber={magazine.issue_number}
      classroomName={classroom.name}
      schoolName={classroom.school_name}
      publishedAt={magazine.published_at ?? magazine.created_at}
      sections={sectionsWithEntries}
    />
  )
}
