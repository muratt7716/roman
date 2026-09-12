import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ConsentGate } from '@/components/auth/ConsentGate'
import { requiresConsent } from '@/lib/legal'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Onay — Kalem Birliği' }

/**
 * (auth) grubunda duruyor — (app) layout'undaki onay kapısı bu sayfayı
 * hedef aldığı için, sayfanın kendisi o layout'un ALTINDA olmamalı;
 * aksi halde sonsuz yönlendirme döngüsü oluşur.
 */
export default async function ConsentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('consent_at')
    .eq('id', user.id)
    .single()

  // Rıza zaten varsa kapıda bekletme. Profil satırı yoksa (eski hesap) kapı
  // gösterilir; rıza yazma sırasında (app) layout profili çoktan upsert etmiştir.
  if (profile && !requiresConsent(profile)) redirect('/dashboard')

  return <ConsentGate />
}
