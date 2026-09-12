'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

/**
 * Onay kapısı — profilinde rıza kaydı olmayan kullanıcı buraya düşer.
 * Google ile açılan hesaplar kayıt formundaki onay kutusunu hiç görmez;
 * rıza tek noktada, sunucu zaman damgasıyla burada alınır.
 */
export function ConsentGate() {
  const router = useRouter()
  const supabase = createClient()
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function accept() {
    setSaving(true)
    const res = await fetch('/api/account/consent', { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? 'Onay kaydedilemedi.')
      setSaving(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function declineAndSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Son bir adım</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Devam etmek için Kullanım Koşulları ve Gizlilik Politikası&apos;nı onaylaman gerekiyor.
          Onayın, tarihi ve metin sürümüyle birlikte hesabına kaydedilir.
        </p>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-surface-2 accent-primary cursor-pointer"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          En az 13 yaşında olduğumu,{' '}
          <Link href="/kullanim-kosullari" className="text-primary hover:underline" target="_blank">Kullanım Koşulları</Link>
          {' '}ve{' '}
          <Link href="/gizlilik-politikasi" className="text-primary hover:underline" target="_blank">Gizlilik Politikası</Link>
          &apos;nı okuduğumu ve kabul ettiğimi onaylıyorum.
        </span>
      </label>

      <div className="space-y-3">
        <Button type="button" className="w-full" disabled={!consent || saving} onClick={accept}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Onayla ve Devam Et
        </Button>

        <button
          type="button"
          onClick={declineAndSignOut}
          disabled={saving}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Kabul etmiyorum — çıkış yap
        </button>
      </div>
    </div>
  )
}
