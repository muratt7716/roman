import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MagazineReader } from '@/components/magazine/MagazineReader'
import { publicClassroomInfo } from '@/lib/classroom-public'
import type { MagazineSection } from '@/types'

export const dynamic = 'force-dynamic'

export default async function MagazineReaderPage({
  params,
}: {
  params: Promise<{ classroomId: string; magazineId: string }>
}) {
  const { classroomId, magazineId } = await params
  const supabase = await createClient()

  // Dergiyi görüp göremeyeceğine magazines_select karar verir (yayımlanmışsa
  // herkes, taslaksa yalnızca sınıf). Künye sınıf dışındakiler için RLS'e
  // takılır — eskiden bu yüzden yayımlanmış dergi dışarıya 404 veriyordu.
  const { data: magazine } = await supabase.from('class_magazines').select('*').eq('id', magazineId).eq('classroom_id', classroomId).single()
  if (!magazine) notFound()

  const { data: memberView } = await supabase.from('classrooms').select('name, school_name').eq('id', classroomId).maybeSingle()
  const classroom = memberView
    ?? (magazine.status === 'published' ? (await publicClassroomInfo([classroomId])).get(classroomId) : null)
    ?? { name: 'Sınıf dergisi', school_name: '' }

  const { data: sections } = await supabase
    .from('magazine_sections')
    .select('*')
    .eq('magazine_id', magazineId)
    .order('sort_order')

  const sectionIds = (sections ?? []).map(s => s.id)
  const [{ data: entries }, { data: contents }] = await Promise.all([
    sectionIds.length > 0
      ? supabase.from('magazine_entries').select('*').in('section_id', sectionIds).order('sort_order')
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    // Öğrenci projeleri özel — metin ve ödev başlığı SECURITY DEFINER RPC'den
    // gelir (erişim kuralı magazines_select ile aynı). İsim bilerek gelmez:
    // okuyucu öğretmenin seçtiği display_name'i ya da "Anonim"i gösterir.
    supabase.rpc('get_magazine_content', { p_magazine_id: magazineId }),
  ])

  const byEntry = new Map(
    ((contents ?? []) as { entry_id: string; assignment_title: string; content: string | null }[])
      .map(c => [c.entry_id, c])
  )

  const sectionsWithEntries: MagazineSection[] = (sections ?? []).map(s => ({
    ...s,
    entries: (entries ?? [])
      .filter(e => e.section_id === s.id)
      .map(e => {
        const c = byEntry.get(e.id as string)
        return {
          ...e,
          submission: c ? { assignment: { title: c.assignment_title }, latest_content: c.content } : null,
        }
      }),
  })) as MagazineSection[]

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
