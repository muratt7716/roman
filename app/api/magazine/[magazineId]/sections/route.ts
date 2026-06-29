import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ magazineId: string }> }) {
  const { magazineId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: magazine } = await supabase
    .from('class_magazines')
    .select('status, classroom:classrooms(owner_id)')
    .eq('id', magazineId)
    .single()

  if (!magazine || (magazine.classroom as unknown as { owner_id: string }).owner_id !== user.id)
    return NextResponse.json({ error: 'Yetkin yok.' }, { status: 403 })
  if (magazine.status === 'published')
    return NextResponse.json({ error: 'Yayımlanmış dergi değiştirilemez.' }, { status: 400 })

  const { type, sort_order } = await req.json()
  const valid = ['hikaye', 'siir', 'makale', 'senaryo', 'serbest']
  if (!valid.includes(type)) return NextResponse.json({ error: 'Geçersiz bölüm tipi.' }, { status: 400 })

  const { data, error } = await supabase
    .from('magazine_sections')
    .insert({ magazine_id: magazineId, type, sort_order: sort_order ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ section: data }, { status: 201 })
}
