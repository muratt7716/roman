'use client'

import Link from 'next/link'

export interface ConsentState {
  terms: boolean
  transfer: boolean
}

export const consentComplete = (c: ConsentState) => c.terms && c.transfer

/**
 * İki ayrı onay — KVKK Kurulu açık rızanın sözleşme/aydınlatma metnine gömülü
 * alınmamasını istiyor. Bu yüzden:
 *   1. Koşulları KABUL + aydınlatma metnini OKUDUM (aydınlatma kabul edilmez, okunur)
 *   2. Yurt dışı aktarıma AÇIK RIZA — ayrı kutu, ayrı metin
 * Kayıt formu ve /onay kapısı aynı bileşeni kullanır; metinler tek yerde durur.
 */
export function ConsentChecks({ value, onChange, compact = false }: {
  value: ConsentState
  onChange: (v: ConsentState) => void
  compact?: boolean
}) {
  const text = compact ? 'text-[11px]' : 'text-xs'
  const box = 'mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-surface-2 accent-primary cursor-pointer'
  const link = 'text-primary hover:underline'

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={value.terms} onChange={e => onChange({ ...value, terms: e.target.checked })} className={box} />
        <span className={`${text} text-muted-foreground leading-relaxed`}>
          <Link href="/kullanim-kosullari" className={link} target="_blank">Kullanım Koşulları</Link>&apos;nı kabul ediyorum,{' '}
          <Link href="/gizlilik-politikasi" className={link} target="_blank">Aydınlatma Metni</Link>&apos;ni okudum.
          18 yaşından küçüksem velimin bu metinleri okuyup onay verdiğini beyan ederim.
        </span>
      </label>
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={value.transfer} onChange={e => onChange({ ...value, transfer: e.target.checked })} className={box} />
        <span className={`${text} text-muted-foreground leading-relaxed`}>
          Kişisel verilerimin{' '}
          <Link href="/acik-riza" className={link} target="_blank">Açık Rıza Metni</Link>
          &apos;nde açıklandığı şekilde yurt dışındaki sunuculara aktarılmasına açık rıza veriyorum.
        </span>
      </label>
    </div>
  )
}
