import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/Navbar'
import type { Profile } from '@/types'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let profile: Profile | null = null
  let unreadCount = 0

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const [{ data }, { count }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
      ])
      profile = data as Profile | null
      unreadCount = count ?? 0
    }
  } catch {
    // Supabase not configured yet
  }

  return (
    <div className="min-h-dvh">
      <Navbar profile={profile} unreadCount={unreadCount} />
      <main className="pt-14">{children}</main>
    </div>
  )
}
