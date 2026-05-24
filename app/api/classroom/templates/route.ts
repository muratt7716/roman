import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLATFORM_TEMPLATES } from '@/lib/assignmentTemplates'

// GET /api/classroom/templates
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { data: myTemplates } = await supabase
    .from('assignment_templates')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    platform: PLATFORM_TEMPLATES,
    mine: myTemplates ?? [],
  })
}

// POST /api/classroom/templates
// Body: { title: string, description?: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { title, description } = await req.json()
  if (!title || title.trim().length < 3 || title.trim().length > 200) {
    return NextResponse.json({ error: 'Başlık 3-200 karakter olmalı.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('assignment_templates')
    .insert({ owner_id: user.id, title: title.trim(), description: description?.trim() || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data }, { status: 201 })
}
