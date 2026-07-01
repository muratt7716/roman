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
// create_classroom RPC kullanır — PostgREST schema cache sorununu bypass eder,
// join_code üretimini ve üyelik eklemeyi DB fonksiyonu içinde güvenle halleder.
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

  const { data, error } = await supabase.rpc('create_classroom', {
    p_name:        name.trim(),
    p_school_name: school_name.trim(),
    p_password:    password.trim(),
    p_description: description?.trim() || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 })

  return NextResponse.json({ classroom: data }, { status: 201 })
}
