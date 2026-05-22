'use client'

import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import type { AssignmentSubmission } from '@/types'

interface Props {
  submission: AssignmentSubmission
  onGraded: (updated: AssignmentSubmission) => void
}

export function GradePanel({ submission, onGraded }: Props) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? '')
  const [comment, setComment] = useState(submission.teacher_comment ?? '')
  const [saving, setSaving] = useState(false)
  const [reopening, setReopening] = useState(false)

  async function saveGrade() {
    const g = parseInt(grade)
    if (isNaN(g) || g < 0 || g > 100) return
    setSaving(true)
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grade', grade: g, comment }),
    })
    if (res.ok) {
      const { submission: updated } = await res.json()
      onGraded(updated)
    }
    setSaving(false)
  }

  async function reopen() {
    setReopening(true)
    const res = await fetch(`/api/submissions/${submission.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen' }),
    })
    if (res.ok) {
      const { submission: updated } = await res.json()
      onGraded(updated)
    }
    setReopening(false)
  }

  return (
    <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Not (0-100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="85"
          />
        </div>
        <button
          onClick={saveGrade}
          disabled={saving || !grade}
          className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Yorum (opsiyonel)</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          maxLength={1000}
          className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Öğrenciye geri bildirim..."
        />
      </div>

      {(submission.status === 'submitted' || submission.status === 'graded') && (
        <button
          onClick={reopen}
          disabled={reopening}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          {reopening ? 'Açılıyor...' : "Revize Et (Draft'a Döndür)"}
        </button>
      )}
    </div>
  )
}
