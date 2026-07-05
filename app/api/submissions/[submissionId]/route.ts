import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardBadge, checkAllBadges } from '@/lib/badges'

interface Params { params: Promise<{ submissionId: string }> }

// PATCH /api/submissions/[submissionId]
// Body: { action: 'submit' } | { action: 'grade', grade: number, comment?: string } | { action: 'reopen' }
export async function PATCH(req: Request, { params }: Params) {
  const { submissionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  if (action === 'submit') {
    // Minimum kelime şartı: ödevde tanımlıysa teslimden önce doğrula
    const { data: subInfo } = await supabase
      .from('assignment_submissions')
      .select('project_id, assignment:classroom_assignments(min_word_count)')
      .eq('id', submissionId)
      .eq('student_id', user.id)
      .single()

    const minWords = (subInfo as any)?.assignment?.min_word_count as number | null | undefined
    if (minWords && subInfo?.project_id) {
      const { data: chapterRows } = await supabase
        .from('chapters')
        .select('word_count')
        .eq('project_id', subInfo.project_id)
      const totalWords = (chapterRows ?? []).reduce((s: number, c: { word_count: number }) => s + (c.word_count ?? 0), 0)
      if (totalWords < minWords) {
        return NextResponse.json({
          error: `Bu ödev en az ${minWords} kelime istiyor — şu an ${totalWords} kelimen var. Yazmaya devam et (son yazdıkların otomatik kaydedilene kadar birkaç saniye sürebilir).`,
        }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', submissionId)
      .eq('student_id', user.id)
      .eq('status', 'draft')
      .select()
      .single()
    if (error || !data) return NextResponse.json({ error: 'Teslim edilemedi.' }, { status: 400 })
    // Rozet kontrolü
    await checkAllBadges(supabase, user.id)
    return NextResponse.json({ submission: data })
  }

  if (action === 'grade') {
    const { grade, comment } = body
    if (typeof grade !== 'number' || grade < 0 || grade > 100) {
      return NextResponse.json({ error: 'Not 0-100 arasında olmalı.' }, { status: 400 })
    }
    // Verify teacher ownership via submission → assignment → classroom
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('id', submissionId)
      .single()
    if (!submission) return NextResponse.json({ error: 'Teslim bulunamadı.' }, { status: 404 })

    const { data: ownerCheck } = await supabase
      .from('classroom_assignments')
      .select('classrooms!inner(owner_id)')
      .eq('id', submission.assignment_id)
      .single()
    const ownerId = (ownerCheck as any)?.classrooms?.owner_id
    if (ownerId !== user.id) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        grade,
        teacher_comment: comment?.trim() || null,
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // star_student rozeti: not >= 90 ise öğrenciye ver
    if (grade >= 90) {
      await awardBadge(supabase, data.student_id, 'star_student')
    }
    return NextResponse.json({ submission: data })
  }

  if (action === 'reopen') {
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('assignment_id')
      .eq('id', submissionId)
      .single()
    if (!submission) return NextResponse.json({ error: 'Teslim bulunamadı.' }, { status: 404 })

    const { data: ownerCheck } = await supabase
      .from('classroom_assignments')
      .select('classrooms!inner(owner_id)')
      .eq('id', submission.assignment_id)
      .single()
    const ownerId = (ownerCheck as any)?.classrooms?.owner_id
    if (ownerId !== user.id) return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({ status: 'draft', submitted_at: null })
      .eq('id', submissionId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ submission: data })
  }

  return NextResponse.json({ error: 'Geçersiz action.' }, { status: 400 })
}
