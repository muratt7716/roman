import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

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
// Body: { name: string, description?: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name || name.trim().length < 2 || name.trim().length > 100) {
    return NextResponse.json({ error: 'Sınıf adı 2-100 karakter olmalı.' }, { status: 400 })
  }

  const join_code = generateJoinCode()

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .insert({ owner_id: user.id, name: name.trim(), description: description?.trim() || null, join_code })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Öğretmeni üye olarak ekle
  const { error: memberError } = await supabase.from('classroom_members').insert({
    classroom_id: classroom.id,
    user_id: user.id,
    role: 'teacher',
  })
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json({ classroom }, { status: 201 })
}
