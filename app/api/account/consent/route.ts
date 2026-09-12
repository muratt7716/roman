import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TERMS_VERSION } from '@/lib/legal'

// POST /api/account/consent — KVKK açık rıza kaydı (m.5/1 açık rıza + ispat yükü)
//
// Rıza yazmanın TEK yolu burasıdır: zaman damgası sunucudan gelir, istemci
// saatine güvenilmez. Hem kayıt formundaki onay kutusu hem /onay kapısı bu
// endpoint'i çağırır.
//
// RLS: profiles_update_own (id = auth.uid()) — kullanıcı yalnızca kendi
// satırını güncelleyebilir, service-role gerekmez.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Profil upsert'i (CLAUDE.md: her auth giriş noktasında zorunlu) — trigger'dan
  // önce açılmış eski hesaplarda satır yoktur. Satır yoksa aşağıdaki UPDATE
  // sessizce 0 satır etkiler, rıza kaybolur ve kullanıcı onay kapısında döner.
  const fallbackUsername = (
    user.user_metadata?.username ??
    user.email?.split('@')[0] ??
    'kullanici'
  ).toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + user.id.slice(0, 4)

  await supabase.from('profiles').upsert({
    id: user.id,
    username: fallbackUsername,
    display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id', ignoreDuplicates: true })

  const { data, error } = await supabase
    .from('profiles')
    .update({ consent_at: new Date().toISOString(), consent_version: TERMS_VERSION })
    .eq('id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: 'Onay kaydedilemedi. Lütfen tekrar dene.' }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Profil bulunamadı, onay kaydedilemedi.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
