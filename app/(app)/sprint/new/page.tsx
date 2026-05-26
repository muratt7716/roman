import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ duration?: string }> }

export default async function NewSprintPage({ searchParams }: Props) {
  const { duration } = await searchParams
  const d = Number(duration)
  if (![15, 25, 45].includes(d)) redirect('/sprint')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const starts_at = new Date()
  const ends_at   = new Date(starts_at.getTime() + d * 60 * 1000)

  const { data: sprint } = await supabase
    .from('writing_sprints')
    .insert({
      title: `${d} Dk Sprint`,
      duration_minutes: d,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      status: 'active',
      created_by: user.id,
      is_community: false,
    })
    .select('id')
    .single()

  if (!sprint) redirect('/sprint')
  redirect(`/sprint/${sprint.id}`)
}
