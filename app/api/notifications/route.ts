import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertNotifications } from '@/lib/notifications'
import { buildEventNotifications } from './events'

const RLS_HINT =
  'Bildirimler silinemedi. Supabase\'de notifications_delete_own politikası uygulanmamış olabilir.'

/**
 * POST /api/notifications — tarayıcıdan tetiklenen bildirimler.
 *
 * İstemci yalnızca olay kimliğini yollar; alıcıyı ve metni sunucu DB'den
 * türetir (bkz. events.ts). Yazma service-role ile yapılır, çünkü RLS
 * kullanıcıyı yalnızca kendine yazmaya bırakır — ve öyle kalmalı.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { rows, denied } = await buildEventNotifications(supabase, user.id, body)
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })

  try {
    const sent = await insertNotifications(rows)
    return NextResponse.json({ sent })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/**
 * DELETE /api/notifications        → tümünü sil (bekleyen davetler hariç)
 * DELETE /api/notifications?id=... → tek bildirimi sil
 *
 * Bekleyen davet koruması sunucuda yapılır, istemciye bırakılmaz: daveti kabul
 * etmenin tek yolu bildirim kartındaki InviteActions olduğu için, toplu temizlik
 * cevap bekleyen bir daveti yok etmemeli.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')

  if (id) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')

    if (error) return NextResponse.json({ error: RLS_HINT }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: RLS_HINT }, { status: 500 })
    }
    return NextResponse.json({ deleted: 1, kept: 0 })
  }

  // Korunacaklar: payload'ı hâlâ 'pending' bir davete işaret eden bildirimler
  const { data: inviteNotifs } = await supabase
    .from('notifications')
    .select('id, payload')
    .eq('user_id', user.id)
    .eq('type', 'invite')

  const inviteIds = (inviteNotifs ?? [])
    .map(n => (n.payload as { invite_id?: string } | null)?.invite_id)
    .filter(Boolean) as string[]

  let keptIds: string[] = []
  if (inviteIds.length > 0) {
    const { data: pendingInvites } = await supabase
      .from('project_invites')
      .select('id')
      .in('id', inviteIds)
      .eq('status', 'pending')

    const pending = new Set((pendingInvites ?? []).map(i => i.id as string))
    keptIds = (inviteNotifs ?? [])
      .filter(n => pending.has((n.payload as { invite_id?: string } | null)?.invite_id ?? ''))
      .map(n => n.id as string)
  }

  // Silinmesi beklenen satır sayısı — 0 satır silindiyse "silecek bir şey yoktu"
  // ile "RLS engelledi" arasındaki farkı ayırt etmek için gerekli.
  const { count: totalCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const expected = (totalCount ?? 0) - keptIds.length
  if (expected <= 0) return NextResponse.json({ deleted: 0, kept: keptIds.length })

  let query = supabase.from('notifications').delete().eq('user_id', user.id)
  if (keptIds.length > 0) query = query.not('id', 'in', `(${keptIds.join(',')})`)

  const { data, error } = await query.select('id')

  if (error) return NextResponse.json({ error: RLS_HINT }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: RLS_HINT }, { status: 500 })
  }

  return NextResponse.json({ deleted: data.length, kept: keptIds.length })
}
