import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/Navbar'
import { requiresConsent } from '@/lib/legal'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === 'mmuratb77@gmail.com'

  const [{ data: profileData }, { count: unreadCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
  ])

  let profile: Profile
  // DB'de gerçek bir profil satırı var mı? Aşağıdaki fallback nesnesi bellekte
  // yaşar; ona rıza yazılamaz, dolayısıyla kapı da uygulanamaz.
  let profileRowExists = !!profileData

  if (profileData) {
    profile = profileData as Profile
  } else {
    const username = (
      user.user_metadata?.username ??
      user.email?.split('@')[0] ??
      'kullanici'
    ).toLowerCase().replace(/[^a-z0-9_]/g, '') + '_' + user.id.slice(0, 4)

    const { data: upserted } = await supabase.from('profiles').upsert({
      id: user.id,
      username,
      display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true }).select().single()

    profileRowExists = !!upserted

    profile = (upserted as Profile | null) ?? {
      id: user.id,
      username,
      display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
      bio: null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      portfolio_url: null,
      writing_status: 'open',
      reputation_score: 0,
      consent_at: null,
      consent_version: null,
      created_at: user.created_at,
    }
  }

  // KVKK onay kapısı — hangi yoldan hesap açıldığından bağımsız çalışır.
  // Google ile gelen kullanıcı kayıt formundaki onay kutusunu hiç görmez
  // (üstelik /login'deki Google butonu da yeni hesap açar), bu yüzden onay
  // istemcide değil burada zorunlu kılınır. /onay sayfası (auth) grubunda
  // durur — bu layout'un altında olsaydı döngüye girerdi.
  //
  // Fail-open: profil satırı yoksa kapı uygulanmaz. Aksi halde satırı
  // oluşturulamayan hesap (profiles_insert_own politikası eksikken) rızasını
  // da kaydettiremez ve uygulamadan tamamen kilitlenirdi. Politika uygulanınca
  // bu hesaplar ilk yüklemede satırlarını alır ve kapı kendiliğinden devreye girer.
  if (profileRowExists && requiresConsent(profile)) redirect('/onay')

  return (
    <div className="min-h-dvh">
      <Navbar profile={profile} unreadCount={unreadCount ?? 0} isAdmin={isAdmin} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
