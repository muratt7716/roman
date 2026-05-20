'use client'

import { useState } from 'react'
import { X, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: 'bug',        label: '🐛 Hata Bildirimi',  desc: 'Bir şey beklendiği gibi çalışmıyor' },
  { value: 'suggestion', label: '💡 Öneri',            desc: 'Mevcut bir şeyi iyileştir' },
  { value: 'feature',    label: '✨ Özellik İsteği',   desc: 'Yeni bir şey eklemek istiyorum' },
  { value: 'other',      label: '💬 Diğer',            desc: 'Aklındaki her şey' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: Props) {
  const [type, setType] = useState<string>('suggestion')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (message.trim().length < 20) { setError('Mesaj en az 20 karakter olmalı.'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Gönderilemedi') }
      setDone(true)
      setMessage('')
      setTimeout(() => { setDone(false); onClose() }, 2500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function close() {
    if (loading) return
    setDone(false); setError(null); onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg bg-background border border-white/[0.08] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)] p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Geri Bildirim Gönder</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Platformu birlikte geliştirelim.</p>
          </div>
          <button onClick={close} className="text-muted-foreground hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-white font-medium">Teşekkürler!</p>
            <p className="text-xs text-muted-foreground">Geri bildirimin alındı. İnceleyip dönüş yapacağız.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    'text-left p-3 rounded-xl border text-xs transition-all duration-200',
                    type === t.value
                      ? 'border-primary/40 bg-primary/10 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.1] hover:text-white'
                  )}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{t.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mesajın</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ne düşünüyorsun? Ne gördün, ne eksik, ne harika?"
                rows={4}
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div className="flex items-center justify-between">
                <span className={cn('text-[10px]', message.length < 20 ? 'text-muted-foreground/50' : 'text-emerald-400')}>
                  {message.length} / 2000 {message.length < 20 && `(min. 20)`}
                </span>
                {error && <span className="text-[10px] text-destructive">{error}</span>}
              </div>
            </div>

            <Button onClick={submit} disabled={loading || message.trim().length < 20} className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gönderiliyor...</> : <><Send className="w-4 h-4 mr-2" />Gönder</>}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
