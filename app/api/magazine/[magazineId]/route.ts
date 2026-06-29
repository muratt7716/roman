import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ magazineId: string }> }) {
  const { magazineId } = await params
  const supabase = await createClient()

  const { data: magazine, error } = await supabase
    .from('class_magazines')
    .select('*')
    .eq('id', magazineId)
    .single()

  if (error || !magazine) return NextResponse.json({ error: 'Dergi bulunamadı.' }, { status: 404 })

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const { data: entries } = await supabase
    .from('magazine_entries')
    .select(`
      *,
      submission:assignment_submissions(
        id, student_id, project_id, status,
        student:profiles!assignment_submissions_student_id_fkey(display_name, username),
        assignment:classroom_assignments(title)
      )
    `)
    .in('section_id', (sections ?? []).map(s => s.id))
    .order('sort_order')

  const sectionsWithEntries = (sections ?? []).map(s => ({
    ...s,
    entries: (entries ?? []).filter(e => e.section_id === s.id),
  }))

  // Fetch latest chapter content for each entry's project
  const projectIds = [...new Set((entries ?? []).map(e => e.submission?.project_id).filter(Boolean))]
  const contentMap: Record<string, string> = {}

  if (projectIds.length > 0) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('project_id, id')
      .in('project_id', projectIds)
      .order('created_at')

    if (chapters?.length) {
      const chapterIds = chapters.map(c => c.id)
      const { data: versions } = await supabase
        .from('chapter_versions')
        .select('chapter_id, content, created_at')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false })

      const latestPerChapter: Record<string, string> = {}
      for (const v of versions ?? []) {
        if (!latestPerChapter[v.chapter_id]) latestPerChapter[v.chapter_id] = v.content
      }
      for (const ch of chapters) {
        if (latestPerChapter[ch.id]) contentMap[ch.project_id] = latestPerChapter[ch.id]
      }
    }
  }

  const sectionsWithContent = sectionsWithEntries.map(s => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entries: s.entries.map((e: any) => ({
      ...e,
      submission: e.submission ? {
        ...e.submission,
        latest_content: contentMap[e.submission.project_id ?? ''] ?? null,
      } : null,
    })),
  }))

  // Classroom info for school display
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name, school_name, owner_id')
    .eq('id', magazine.classroom_id)
    .single()

  return NextResponse.json({ magazine, sections: sectionsWithContent, classroom })
}
