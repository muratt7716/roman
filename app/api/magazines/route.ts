import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 12
  const offset = (page - 1) * limit

  const supabase = await createClient()

  const { data, count, error } = await supabase
    .from('class_magazines')
    .select(`
      id, title, issue_number, published_at,
      classroom:classrooms(name, school_name)
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ magazines: data ?? [], total: count ?? 0, page, limit })
}
