import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/sprint — aktif + yaklaşan + son 5 topluluk sprinti
export async function GET() {
  const supabase = await createClient()
  const now = new Date()

  const { data: sprints, error } = await supabase
    .from('writing_sprints')
    .select('*, participant_count:sprint_participants(count)')
    .gte('ends_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withStatus = (sprints ?? []).map(s => {
    const start = new Date(s.starts_at)
    const end   = new Date(s.ends_at)
    let status: string = s.status
    if (now >= start && now < end) status = 'active'
    else if (now >= end) status = 'finished'
    return { ...s, status, participant_count: (s.participant_count as unknown as { count: number }[])?.[0]?.count ?? 0 }
  })

  const active   = withStatus.filter(s => s.status === 'active')
  const upcoming = withStatus.filter(s => s.status === 'scheduled')
  const finished = withStatus.filter(s => s.status === 'finished').slice(-5).reverse()

  return NextResponse.json({ active, upcoming, finished })
}

// POST /api/sprint — bireysel sprint oluştur
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { duration_minutes } = await req.json()
  if (![15, 25, 45].includes(duration_minutes)) {
    return NextResponse.json({ error: 'Geçersiz süre. 15, 25 veya 45 dk olmalı.' }, { status: 400 })
  }

  const starts_at = new Date()
  const ends_at   = new Date(starts_at.getTime() + duration_minutes * 60 * 1000)

  const { data: sprint, error } = await supabase
    .from('writing_sprints')
    .insert({
      title: `${duration_minutes} Dk Sprint`,
      duration_minutes,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      status: 'active',
      created_by: user.id,
      is_community: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sprint }, { status: 201 })
}
