import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ classroomId: string }> }

// POST /api/classroom/[classroomId]/members
// Body: { email: string (actually username), student_id: string }
// Teacher adds a user as parent for a specific student
export async function POST(req: Request, { params }: Params) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Teacher check
  const { data: membership } = await supabase
    .from('classroom_members')
    .select('role')
    .eq('classroom_id', classroomId)
    .eq('user_id', user.id)
    .single()
  if (!membership || membership.role !== 'teacher') {
    return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
  }

  const { email: username, student_id } = await req.json()
  if (!username || !student_id) {
    return NextResponse.json({ error: 'Kullanıcı adı ve öğrenci seçimi zorunlu.' }, { status: 400 })
  }

  // Look up parent profile by username
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', username.trim())
    .single()

  if (!parentProfile) {
    return NextResponse.json({
      error: 'Bu kullanıcı adıyla kayıtlı biri bulunamadı. Önce platforma kayıt olması gerekiyor.',
    }, { status: 404 })
  }

  // Verify student is in this classroom
  const { data: studentMember } = await supabase
    .from('classroom_members')
    .select('user_id')
    .eq('classroom_id', classroomId)
    .eq('user_id', student_id)
    .eq('role', 'student')
    .single()
  if (!studentMember) {
    return NextResponse.json({ error: 'Seçilen öğrenci bu sınıfta değil.' }, { status: 400 })
  }

  // Add parent
  const { error } = await supabase
    .from('classroom_members')
    .upsert({
      classroom_id: classroomId,
      user_id: parentProfile.id,
      role: 'parent',
      student_id,
    }, { onConflict: 'classroom_id,user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ parent: parentProfile }, { status: 201 })
}
