import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/Navbar'
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

    profile = (upserted as Profile | null) ?? {
      id: user.id,
      username,
      display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
      bio: null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      portfolio_url: null,
      writing_status: 'open',
      reputation_score: 0,
      created_at: user.created_at,
    }
  }

  return (
    <div className="min-h-dvh">
      <Navbar profile={profile} unreadCount={unreadCount ?? 0} isAdmin={isAdmin} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
