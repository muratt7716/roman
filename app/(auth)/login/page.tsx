import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Giriş Yap' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams

  // Oturumu olan kullanıcıya giriş ekranı göstermenin anlamı yok.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(safeNext(next))

  return <LoginForm error={error} next={next ? safeNext(next) : undefined} />
}
