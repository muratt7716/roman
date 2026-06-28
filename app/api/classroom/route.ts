import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/classroom — kullanıcının öğretmen/öğrenci olduğu sınıflar
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data, error } = await supabase
    .from('classroom_members')
    .select('role, classroom:classrooms(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ classrooms: data ?? [] })
}

// POST /api/classroom — sınıf oluştur
// Body: { name, school_name, password, description? }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { name, school_name, password, description } = await req.json()

  if (!name || name.trim().length < 2 || name.trim().length > 100)
    return NextResponse.json({ error: 'Sınıf adı 2-100 karakter olmalı.' }, { status: 400 })
  if (!school_name || school_name.trim().length < 2 || school_name.trim().length > 100)
    return NextResponse.json({ error: 'Okul adı 2-100 karakter olmalı.' }, { status: 400 })
  if (!password || password.trim().length < 3 || password.trim().length > 50)
    return NextResponse.json({ error: 'Şifre 3-50 karakter olmalı.' }, { status: 400 })

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      school_name: school_name.trim(),
      password: password.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: memberError } = await supabase.from('classroom_members').insert({
    classroom_id: classroom.id,
    user_id: user.id,
    role: 'teacher',
  })
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json({ classroom }, { status: 201 })
}
