'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ConsentChecks, consentComplete, type ConsentState } from '@/components/auth/ConsentChecks'

/**
 * Onay kapısı — profilinde güncel rıza kaydı olmayan kullanıcı buraya düşer.
 * Google ile açılan hesaplar kayıt formundaki onay kutularını hiç görmez;
 * metinler güncellendiğinde mevcut kullanıcılar da buraya bir kez daha gelir.
 * Rıza tek noktada, sunucu zaman damgasıyla burada alınır.
 */
export function ConsentGate({ renewal = false }: { renewal?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [consent, setConsent] = useState<ConsentState>({ terms: false, transfer: false })
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
        <h1 className="font-display text-2xl font-bold">{renewal ? 'Metinlerimiz güncellendi' : 'Son bir adım'}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {renewal
            ? 'Kullanım Koşulları ve gizlilik metinlerimizi güncelledik. Devam etmek için yeniden onay vermen gerekiyor.'
            : 'Devam etmek için aşağıdaki metinleri onaylaman gerekiyor.'}
          {' '}Onayın, tarihi ve metin sürümüyle birlikte hesabına kaydedilir.
        </p>
      </div>

      <ConsentChecks value={consent} onChange={setConsent} />

      <div className="space-y-3">
        <Button type="button" className="w-full" disabled={!consentComplete(consent) || saving} onClick={accept}>
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
        <p className="text-[11px] text-center text-muted-foreground/70 leading-relaxed">
          Kabul etmezsen hesabını Ayarlar&apos;dan dilediğin zaman kalıcı olarak silebilirsin.
        </p>
      </div>
    </div>
  )
}
