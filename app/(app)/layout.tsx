import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/Navbar'
import type { Profile } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profileData }, { count: unreadCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
  ])

  const profile: Profile = (profileData as Profile | null) ?? {
    id: user.id,
    username: user.email?.split('@')[0] ?? 'kullanici',
    display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
    bio: null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    portfolio_url: null,
    writing_status: 'open',
    reputation_score: 0,
    created_at: user.created_at,
  }

  return (
    <div className="min-h-dvh">
      <Navbar profile={profile} unreadCount={unreadCount ?? 0} />
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
