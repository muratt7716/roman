import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/classroom/join
// Body: { join_code: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { join_code } = await req.json()
  if (!join_code || typeof join_code !== 'string') {
    return NextResponse.json({ error: 'Geçersiz kod.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('join_classroom_by_code', {
    p_code: join_code.trim().toUpperCase(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 })

  return NextResponse.json({
    classroom_id: data.classroom_id,
    already_member: data.already_member,
  })
}
