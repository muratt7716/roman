'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  suggestionId: string
  chapterId: string
  projectId: string
  suggestionContent: string
  suggestorId: string
  suggestorName: string
  wordCount: number
}

export function SuggestionReviewActions({
  suggestionId, chapterId, projectId, suggestionContent, suggestorId, suggestorName, wordCount,
}: Props) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function accept() {
    setLoading('accept')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(null); return }

    // Yeni versiyon oluştur (orijinal kaybolmaz)
    await supabase.from('chapter_versions').insert({
      chapter_id: chapterId,
      author_id: suggestorId,
      content: suggestionContent,
      word_count: wordCount,
    })

    // Kelime sayısını güncelle
    await supabase.from('chapters').update({ word_count: wordCount }).eq('id', chapterId)

    // Öneri durumunu güncelle
    await supabase.from('chapter_suggestions').update({ status: 'accepted' }).eq('id', suggestionId)

    // Öneri sahibine bildirim
    await supabase.from('notifications').insert({
      user_id: suggestorId,
      type: 'acceptance',
      payload: {
        chapter_id: chapterId,
        project_id: projectId,
        context: 'suggestion_accepted',
        chapter_title: '',
      },
    })

    toast.success(`${suggestorName}'in önerisi kabul edildi ve yeni versiyon oluşturuldu.`)
    setLoading(null)
    router.push(`/projects/${projectId}/write/${chapterId}`)
    router.refresh()
  }

  async function reject() {
    setLoading('reject')
    await supabase.from('chapter_suggestions').update({ status: 'rejected' }).eq('id', suggestionId)
    toast.success('Öneri reddedildi.')
    setLoading(null)
    router.push(`/projects/${projectId}/write/${chapterId}`)
    router.refresh()
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{suggestorName}</span>'in önerisini ne yapacaksın?
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={reject}
            disabled={!!loading}
            className="gap-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          >
            {loading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Reddet
          </Button>
          <Button
            type="button"
            onClick={accept}
            disabled={!!loading}
            className="gap-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
          >
            {loading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Kabul Et & Yeni Versiyon Oluştur
          </Button>
        </div>
      </div>
    </div>
  )
}
