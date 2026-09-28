import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ magazineId: string; sectionId: string }> }) {
  const { magazineId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: magazine } = await supabase
    .from('class_magazines')
    .select('status, classroom_id, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()

  if (!magazine || (magazine.classroom as unknown as { owner_id: string }).owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (magazine.status === 'published')
    return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { submission_id, display_name, sort_order } = await req.json()
  if (!submission_id) return NextResponse.json({ error: 'submission_id zorunlu.' }, { status: 400 })

  // Teslim bu sınıfın bir ödevine ait mi, bölüm bu dergiye mi? Kontrol edilmezse
  // başka bir sınıfın öğrenci metni yayımlanan (herkese açık) dergiye taşınabilir.
  const [{ data: sub }, { data: section }] = await Promise.all([
    supabase.from('assignment_submissions').select('assignment:classroom_assignments(classroom_id)').eq('id', submission_id).maybeSingle(),
    supabase.from('magazine_sections').select('id').eq('id', sectionId).eq('magazine_id', magazineId).maybeSingle(),
  ])
  const subClassroom = (sub?.assignment as unknown as { classroom_id: string } | null)?.classroom_id
  if (!section || subClassroom !== magazine.classroom_id)
    return NextResponse.json({ error: 'Bu teslim bu sınıfa ait değil.' }, { status: 403 })

  const { data, error } = await supabase
    .from('magazine_entries')
    .insert({ section_id: sectionId, submission_id, display_name: display_name ?? null, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
