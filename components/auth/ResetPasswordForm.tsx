'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'ready' | 'no_session' | 'done'

/**
 * Şifre sıfırlama emaili /auth/callback?next=/reset-password üzerinden gelir;
 * callback recovery session'ı kurar. Burada session doğrulanır ve yeni
 * şifre supabase.auth.updateUser ile kaydedilir.
 */
export function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user ? 'ready' : 'no_session')
    })
  }, [supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.')
      return
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) {
      if (err.message.toLowerCase().includes('different from the old')) {
        setError('Yeni şifre eskisiyle aynı olamaz.')
      } else if (err.message.toLowerCase().includes('at least')) {
        setError('Şifre yeterince güçlü değil — en az 8 karakter kullan.')
      } else {
        setError('Şifre güncellenemedi: ' + err.message)
      }
      return
    }
    setStatus('done')
    setTimeout(() => { router.push('/dashboard'); router.refresh() }, 2000)
  }

  if (status === 'checking') {
    return (
      <div className="glass rounded-xl p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Doğrulanıyor…
      </div>
    )
  }

  if (status === 'no_session') {
    return (
      <div className="glass rounded-xl p-8 space-y-4 text-center">
        <h1 className="font-display text-xl font-bold">Bağlantı geçersiz veya süresi dolmuş</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Şifre sıfırlama bağlantıları tek kullanımlıktır ve kısa sürede geçersiz olur.
          Yeni bir bağlantı isteyebilirsin.
        </p>
        <Link href="/forgot-password" className="inline-block text-sm text-primary hover:underline">
          Yeni sıfırlama bağlantısı iste →
        </Link>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="glass rounded-xl p-8 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="font-display text-xl font-bold">Şifren güncellendi ✓</h1>
        <p className="text-sm text-muted-foreground">Panele yönlendiriliyorsun…</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Yeni şifreni belirle</h1>
        <p className="text-muted-foreground text-sm">En az 8 karakter kullan.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">Yeni Şifre</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-surface-2 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="bg-surface-2 border-border"
          />
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm text-center">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Şifreyi Güncelle
        </Button>
      </form>
    </div>
  )
}
