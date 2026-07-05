import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { FileText, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SubmissionReview, type ReviewComment } from '@/components/classroom/SubmissionReview'

export const metadata: Metadata = { title: 'Teslim İncelemesi — Kalem Birliği' }
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ classroomId: string; assignmentId: string; submissionId: string }>
}

/** TipTap HTML'ini blok bazında paragraflara ayırır (p, h1-6, blockquote, ul, ol, pre). */
function splitIntoBlocks(html: string): string[] {
  const matches = html.match(/<(p|h[1-6]|blockquote|ul|ol|pre)[^>]*>[\s\S]*?<\/\1>/g)
  if (!matches || matches.length === 0) return html.trim() ? [html] : []
  // Boş paragrafları at
  return matches.filter(b => b.replace(/<[^>]+>/g, '').trim().length > 0)
}

export default async function SubmissionReviewPage({ params }: PageProps) {
  const { classroomId, assignmentId, submissionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: classroom },
    { data: assignment },
    { data: submission },
  ] = await Promise.all([
    supabase.from('classrooms').select('id, name, owner_id').eq('id', classroomId).single(),
    supabase.from('classroom_assignments').select('id, title, min_word_count').eq('id', assignmentId).eq('classroom_id', classroomId).single(),
    supabase
      .from('assignment_submissions')
      .select('*, student:profiles(id, username, display_name)')
      .eq('id', submissionId)
      .eq('assignment_id', assignmentId)
      .single(),
  ])

  if (!classroom || !assignment || !submission) notFound()

  const isTeacher = classroom.owner_id === user.id
  const isStudentOwner = submission.student_id === user.id
  if (!isTeacher && !isStudentOwner) notFound()

  // Teslim edilen metni topla: projenin bölümleri → her bölümün son versiyonu
  let blocks: string[] = []
  if (submission.project_id) {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title, order_index')
      .eq('project_id', submission.project_id)
      .order('order_index', { ascending: true })

    for (const ch of chapters ?? []) {
      const { data: version } = await supabase
        .from('chapter_versions')
        .select('content')
        .eq('chapter_id', ch.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (version?.content) {
        blocks = blocks.concat(splitIntoBlocks(version.content))
      }
    }
  }

  // Mevcut paragraf yorumları (tablo henüz yoksa sessizce boş)
  let comments: ReviewComment[] = []
  try {
    const { data } = await supabase
      .from('submission_comments')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })
    comments = (data ?? []) as ReviewComment[]
  } catch {
    comments = []
  }

  const studentName = (submission.student as { display_name: string | null; username: string } | null)
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', classroom.owner_id)
    .single()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href={`/classroom/${classroomId}/assignments/${assignmentId}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
      >
        ← Ödev Sayfasına Dön
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-display font-black text-white flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-primary" />
          {assignment.title}
        </h1>
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-400" />
          {studentName?.display_name ?? studentName?.username ?? 'Öğrenci'} teslimi
          {submission.grade !== null && (
            <span className="text-emerald-400 font-bold">· {submission.grade}/100</span>
          )}
        </p>
        {isTeacher && (
          <p className="text-xs text-muted-foreground">
            Bir paragrafın üzerine gel ve 💬 simgesine tıklayarak o paragrafa özel geri bildirim bırak.
          </p>
        )}
      </div>

      {blocks.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Henüz yazılmış içerik yok.
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/[0.05]">
          <SubmissionReview
            submissionId={submissionId}
            blocks={blocks}
            initialComments={comments}
            canComment={isTeacher}
            currentUserId={user.id}
            teacherName={teacherProfile?.display_name ?? teacherProfile?.username ?? 'Öğretmen'}
          />
        </div>
      )}
    </div>
  )
}
