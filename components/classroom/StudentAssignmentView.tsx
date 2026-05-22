'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Lock } from 'lucide-react'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  assignment: ClassroomAssignment
  classroomId: string
  initialSubmission: AssignmentSubmission | null
}

export function StudentAssignmentView({ assignment, classroomId, initialSubmission }: Props) {
  const [submission, setSubmission] = useState(initialSubmission)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function startWriting() {
    setLoading(true)
    const res = await fetch(
      `/api/classroom/${classroomId}/assignments/${assignment.id}/start`,
      { method: 'POST' }
    )
    if (res.ok) {
      const { submission_id, project_id, chapter_id } = await res.json()
      router.push(`/projects/${project_id}/write/${chapter_id}?submission_id=${submission_id}`)
    }
    setLoading(false)
  }

  async function continueWriting() {
    setLoading(true)
    const res = await fetch(
      `/api/classroom/${classroomId}/assignments/${assignment.id}/start`,
      { method: 'POST' }
    )
    if (res.ok) {
      const { submission_id, project_id, chapter_id } = await res.json()
      router.push(`/projects/${project_id}/write/${chapter_id}?submission_id=${submission_id}`)
    }
    setLoading(false)
  }

  const isLocked = submission?.status === 'submitted' || submission?.status === 'graded'

  return (
    <div className="space-y-4">
      {assignment.description && (
        <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {assignment.description}
        </div>
      )}

      {!submission && (
        <button
          onClick={startWriting}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <PenLine className="w-4 h-4" />
          {loading ? 'Hazırlanıyor...' : 'Yazmaya Başla'}
        </button>
      )}

      {submission?.status === 'draft' && (
        <button
          onClick={continueWriting}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          <PenLine className="w-4 h-4" /> {loading ? 'Yükleniyor...' : 'Yazmaya Devam Et'}
        </button>
      )}

      {isLocked && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          {submission.status === 'submitted' ? 'Teslim edildi — öğretmen değerlendiriyor.' : 'Değerlendirildi.'}
        </div>
      )}

      {submission?.status === 'graded' && (
        <div className="glass-card rounded-xl p-4 space-y-2 border-l-2 border-emerald-500/50">
          <p className="text-2xl font-display font-bold text-emerald-400">{submission.grade}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
          {submission.teacher_comment && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{submission.teacher_comment}</p>
          )}
        </div>
      )}
    </div>
  )
}
