'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export function ForgotPasswordForm() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Geçerli bir email adresi gir.')
      return
    }
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (err && err.message.toLowerCase().includes('too many')) {
      setError('Çok fazla deneme yapıldı. Lütfen birkaç dakika bekle.')
      return
    }
    // Hesap var/yok bilgisini sızdırmamak için her durumda başarı göster
    setSent(true)
  }

  if (sent) {
    return (
      <div className="glass rounded-xl p-8 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
          <MailCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="font-display text-xl font-bold">Emailini kontrol et</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Eğer <strong className="text-foreground">{email.trim()}</strong> adresine kayıtlı bir hesap varsa,
          şifre sıfırlama bağlantısı gönderdik. Linke tıklayıp yeni şifreni belirleyebilirsin.
        </p>
        <p className="text-xs text-muted-foreground">
          Email gelmediyse spam klasörünü kontrol et.
        </p>
        <Link href="/login" className="inline-block text-sm text-primary hover:underline">
          ← Girişe dön
        </Link>
      </div>
    )
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-6 h-6 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Şifreni mi unuttun?</h1>
        <p className="text-muted-foreground text-sm">
          Email adresini gir, sana sıfırlama bağlantısı gönderelim.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-surface-2 border-border"
          />
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm text-center">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Sıfırlama Bağlantısı Gönder
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Şifreni hatırladın mı?{' '}
        <Link href="/login" className="text-primary hover:underline">Giriş yap</Link>
      </p>
    </div>
  )
}
