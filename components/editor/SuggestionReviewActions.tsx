'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

  // Değerlendirme sunucuda (bkz. /api/suggestions/[id]): yeni versiyon önerici
  // adına yazılmalı, bunu RLS tarayıcıya izin vermez. Eskiden bu hata yutulup
  // "kabul edildi" deniyordu — hiçbir kabul bölüme yansımadı.
  async function decide(decision: 'accepted' | 'rejected') {
    setLoading(decision === 'accepted' ? 'accept' : 'reject')
    const res = await fetch(`/api/suggestions/${suggestionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? 'İşlem tamamlanamadı.')
      setLoading(null)
      return
    }
    await notifySuggester(decision)
    toast.success(decision === 'accepted'
      ? `${suggestorName}'in önerisi kabul edildi ve yeni versiyon oluşturuldu.`
      : 'Öneri reddedildi.')
    setLoading(null)
    router.push(`/projects/${projectId}/write/${chapterId}`)
    router.refresh()
  }
  const accept = () => decide('accepted')
  const reject = () => decide('rejected')

  // Öneriyi gönderene sonucu bildir. Alıcıyı ve yetkiyi sunucu doğrular:
  // yalnızca proje sahibi değerlendirebilir, alıcı da önerinin sahibidir.
  async function notifySuggester(decision: 'accepted' | 'rejected') {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'suggestion_reviewed', suggestion_id: suggestionId, decision }),
    }).catch(() => null)
  }

  return (
    <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{suggestorName}</span>&apos;in önerisini ne yapacaksın?
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
