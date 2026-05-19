'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function NewIdeaForm() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [seed, setSeed] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 5) { setError('Başlık en az 5 karakter olmalı'); return }
    if (seed.trim().length < 10) { setError('Fikir açıklaması en az 10 karakter olmalı'); return }

    setLoading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error: err } = await supabase
      .from('idea_threads')
      .insert({ user_id: user.id, title: title.trim(), seed: seed.trim() })
      .select('id')
      .single()

    setLoading(false)
    if (err || !data) { setError('Bir hata oluştu, tekrar dene.'); return }
    setOpen(false)
    setTitle('')
    setSeed('')
    router.push(`/fikir-odasi/${data.id}`)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 text-sm font-medium transition-colors shrink-0"
      >
        <Lightbulb className="w-4 h-4" />
        Fikir At
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative glass-strong rounded-2xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-md space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" /> Fikrini At
              </h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Başlık
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="örn. Savaş sonrası bir şehirde geçen aşk hikayesi"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground text-right">{title.length}/100</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Aklındaki fikir
                </label>
                <textarea
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  placeholder="Ne anlatmak istiyorsun? Hangi temayı işlemek istiyorsun? Kafanda ne var?"
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground text-right">{seed.length}/500</p>
              </div>

              {error && <p className="text-destructive text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Odaya At
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
