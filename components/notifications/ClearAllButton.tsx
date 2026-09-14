'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * İki adımlı temizleme. Tek tıkla silmiyoruz — silme geri alınamaz — ama
 * ayrı bir modal da açmıyoruz; buton yerinde onay haline geliyor.
 */
export function ClearAllButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function clearAll() {
    setClearing(true)
    const res = await fetch('/api/notifications', { method: 'DELETE' })
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      toast.error(body?.error ?? 'Bildirimler silinemedi.')
      setClearing(false)
      setConfirming(false)
      return
    }

    toast.success(
      body?.kept > 0
        ? `${body.deleted} bildirim silindi. ${body.kept} bekleyen davet korundu.`
        : `${body.deleted} bildirim silindi.`
    )
    setClearing(false)
    setConfirming(false)
    router.refresh()
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground ring-1 ring-border hover:ring-white/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Tümünü temizle
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">Emin misin?</span>
      <button
        type="button"
        onClick={clearAll}
        disabled={clearing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive ring-1 ring-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        Temizle
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={clearing}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        Vazgeç
      </button>
    </div>
  )
}
