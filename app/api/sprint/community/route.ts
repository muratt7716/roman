import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'mmuratb77@gmail.com'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })
  }

  const { title, duration_minutes, starts_at } = await req.json()

  if (![15, 25, 45].includes(duration_minutes)) {
    return NextResponse.json({ error: 'Geçersiz süre.' }, { status: 400 })
  }

  if (!starts_at) {
    return NextResponse.json({ error: 'Başlangıç zamanı gerekli.' }, { status: 400 })
  }

  const startsAtDate = new Date(starts_at)
  const ends_at = new Date(startsAtDate.getTime() + duration_minutes * 60 * 1000)

  const { data: sprint, error } = await supabase
    .from('writing_sprints')
    .insert({
      title: title || 'Topluluk Yazı Sprinti',
      duration_minutes,
      starts_at: startsAtDate.toISOString(),
      ends_at: ends_at.toISOString(),
      status: 'scheduled',
      created_by: user.id,
      is_community: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sprint }, { status: 201 })
}
