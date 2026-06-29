'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  classroomId: string
  classroomName: string
}

export function DeleteClassroomButton({ classroomId, classroomName }: Props) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (confirm !== classroomName) return
    setDeleting(true)
    const res = await fetch(`/api/classroom/${classroomId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error('Silinemedi: ' + (data.error ?? 'Bilinmeyen hata'))
      setDeleting(false)
      return
    }
    toast.success('Sınıf silindi.')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className="absolute top-3 right-3 z-20 p-1.5 rounded-lg bg-black/40 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        title="Sınıfı sil"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !deleting && setOpen(false)}
          />
          <div className="relative w-full max-w-md glass-strong rounded-2xl border border-red-500/30 shadow-[0_40px_80px_rgba(0,0,0,0.8)] p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-white">Sınıfı Sil</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Bu işlem geri alınamaz. Tüm ödevler, teslimler ve üye verileri kalıcı olarak silinir.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">
                Onaylamak için sınıf adını tam olarak yaz:{' '}
                <span className="text-white font-medium">"{classroomName}"</span>
              </label>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={classroomName}
                autoFocus
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder:text-slate-600"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOpen(false); setConfirm('') }}
                disabled={deleting}
                className="flex-1"
              >
                İptal
              </Button>
              <Button
                type="button"
                disabled={confirm !== classroomName || deleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white gap-2 disabled:opacity-40"
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
