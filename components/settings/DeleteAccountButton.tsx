'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  username: string
}

export function DeleteAccountButton({ username }: Props) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (confirm !== username) return
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? 'Hesap silinemedi.')
      setDeleting(false)
      return
    }
    toast.success('Hesabın kalıcı olarak silindi.')
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-destructive border border-destructive/20 hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Hesabımı Sil
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setOpen(false)} />
          <div className="relative w-full max-w-md glass-strong rounded-2xl border border-destructive/30 shadow-[0_40px_80px_rgba(0,0,0,0.8)] p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Hesabı Kalıcı Olarak Sil</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Bu işlem geri alınamaz. Hesabın, sahip olduğun tüm projeler, bölümler, yorumlar ve profil bilgilerin kalıcı olarak silinir. Ortak olduğun projelerdeki katkıların, projeler ayakta kaldığı sürece görünmeye devam eder.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Onaylamak için kullanıcı adını tam olarak yaz:{' '}
                <span className="text-foreground font-medium">&quot;{username}&quot;</span>
              </label>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={username}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                type="button"
                disabled={confirm !== username || deleting}
                onClick={handleDelete}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white gap-2 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Kalıcı Olarak Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
