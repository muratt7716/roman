import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { DeleteAccountButton } from '@/components/settings/DeleteAccountButton'

export const metadata: Metadata = { title: 'Ayarlar — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id,username,display_name,bio,avatar_url,portfolio_url,writing_status').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">Profil bilgilerini ve yazarlık durumunu yönet.</p>
      </div>
      <SettingsForm profile={profile} />

      <div className="glass-card rounded-2xl p-6 space-y-3 border border-destructive/20">
        <h2 className="font-display font-semibold text-lg text-destructive">Tehlikeli Bölge</h2>
        <p className="text-sm text-muted-foreground">
          Hesabını ve tüm verilerini kalıcı olarak silebilirsin. Bu işlem geri alınamaz.
        </p>
        <DeleteAccountButton username={profile.username} />
      </div>
    </div>
  )
}
