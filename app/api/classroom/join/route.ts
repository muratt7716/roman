import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/classroom/join?school=... — sınıf ara (auth gerektirmez)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const school = searchParams.get('school')?.trim()
  const name = searchParams.get('name')?.trim() || null

  if (!school || school.length < 2)
    return NextResponse.json({ error: 'En az 2 karakter gir.' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_classrooms', {
    p_school: school,
    p_name: name,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ classrooms: data ?? [] })
}

// POST /api/classroom/join — şifreyle sınıfa katıl
// Body: { classroom_id, password }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { classroom_id, password } = await req.json()
  if (!classroom_id || !password)
    return NextResponse.json({ error: 'Sınıf ve şifre gerekli.' }, { status: 400 })

  const { data, error } = await supabase.rpc('join_classroom_by_password', {
    p_classroom_id: classroom_id,
    p_password: password.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 })

  return NextResponse.json({
    classroom_id: data.classroom_id,
    already_member: data.already_member,
  })
}
