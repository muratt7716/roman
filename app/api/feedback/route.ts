import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { type, message } = await req.json()

  const VALID_TYPES = ['bug', 'suggestion', 'feature', 'other']
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Geçersiz kategori.' }, { status: 400 })
  if (!message || message.trim().length < 20) return NextResponse.json({ error: 'Mesaj en az 20 karakter olmalı.' }, { status: 400 })
  if (message.trim().length > 2000) return NextResponse.json({ error: 'Mesaj en fazla 2000 karakter olabilir.' }, { status: 400 })

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    type,
    message: message.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
