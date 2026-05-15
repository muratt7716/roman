import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, CheckCircle, UserPlus, FileText, ThumbsUp, ThumbsDown, MessageSquare, AtSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/shared/EmptyState'
import { InviteActions } from '@/components/notifications/InviteActions'

export const metadata: Metadata = { title: 'Bildirimler — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  application: { label: 'Yeni başvuru aldın',        icon: FileText,      color: 'text-violet-400 bg-violet-500/15' },
  acceptance:  { label: 'Başvurun kabul edildi',      icon: ThumbsUp,      color: 'text-emerald-400 bg-emerald-500/15' },
  rejection:   { label: 'Başvurun reddedildi',        icon: ThumbsDown,    color: 'text-rose-400 bg-rose-500/15' },
  comment:     { label: 'Yeni yorum',                 icon: MessageSquare, color: 'text-sky-400 bg-sky-500/15' },
  mention:     { label: 'Bahsedildin',                icon: AtSign,        color: 'text-amber-400 bg-amber-500/15' },
  invite:      { label: 'Projeye davet edildin',      icon: UserPlus,      color: 'text-primary bg-primary/15' },
  suggestion:  { label: 'Yeni öneri taslağı var',     icon: Bell,          color: 'text-amber-400 bg-amber-500/15' },
}

function getNotifDetail(n: any): { title: string; subtitle?: string; link?: string } {
  const p = n.payload ?? {}
  switch (n.type) {
    case 'invite':
      return {
        title: `${p.inviter_display_name ?? p.inviter_username ?? 'Biri'} seni "${p.project_title}" projesine davet etti`,
        subtitle: p.role_name ? `Rol: ${p.role_name}` : undefined,
      }
    case 'application':
      return {
        title: `"${p.project_title ?? 'Bir proje'}" için yeni başvuru`,
        subtitle: [p.applicant_username ? `@${p.applicant_username}` : null, p.role_name ? `${p.role_name} rolü` : null].filter(Boolean).join(' · ') || undefined,
        link: p.project_id ? `/projects/${p.project_id}/overview` : undefined,
      }
    case 'suggestion':
      return {
        title: `${p.suggester_display_name ?? p.suggester_username ?? 'Biri'} "${p.chapter_title ?? 'bir bölüm'}" için öneri gönderdi`,
        subtitle: p.note ? `"${(p.note as string).slice(0, 80)}${(p.note as string).length > 80 ? '...' : ''}"` : undefined,
        link: p.chapter_id && p.project_id ? `/projects/${p.project_id}/write/${p.chapter_id}/suggestions-list` : undefined,
      }
    case 'acceptance':
      return {
        title: `"${p.project_title ?? 'Bir proje'}" projesine kabul edildin`,
        subtitle: p.role_name ? `Rol: ${p.role_name}` : undefined,
        link: p.project_id ? `/projects/${p.project_id}/overview` : undefined,
      }
    case 'rejection':
      return {
        title: `"${p.project_title ?? 'Bir proje'}" başvurun reddedildi`,
      }
    default:
      return { title: TYPE_META[n.type]?.label ?? n.type }
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)

  // Davet durumlarını çek (pending olanlar için butonlar gösterilecek)
  const inviteIds = (notifications ?? [])
    .filter(n => n.type === 'invite' && n.payload?.invite_id)
    .map(n => n.payload.invite_id as string)

  const inviteStatuses: Record<string, { status: string; role_id: string }> = {}
  if (inviteIds.length > 0) {
    const { data: invites } = await supabase
      .from('project_invites')
      .select('id, status, role_id')
      .in('id', inviteIds)
    ;(invites ?? []).forEach((inv: any) => {
      inviteStatuses[inv.id] = { status: inv.status, role_id: inv.role_id }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold">Bildirimler</h1>
      </div>

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Henüz bildirim yok"
          description="Başvurular, davetler ve yorumlar burada görünecek."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const meta = TYPE_META[n.type] ?? TYPE_META.application
            const Icon = meta.icon
            const detail = getNotifDetail(n)
            const isUnread = !n.read
            const isInvite = n.type === 'invite'
            const inviteId = n.payload?.invite_id as string | undefined
            const inviteInfo = inviteId ? inviteStatuses[inviteId] : undefined
            const inviteStatus = inviteInfo?.status
            const inviteRoleId = inviteInfo?.role_id

            return (
              <div
                key={n.id}
                className={`glass rounded-xl p-4 flex items-start gap-3 transition-colors ${isUnread ? 'border border-primary/20 bg-primary/[0.03]' : 'border border-white/[0.04]'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {detail.link ? (
                        <Link href={detail.link} className="text-sm font-medium hover:text-primary transition-colors">
                          {detail.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{detail.title}</p>
                      )}
                      {detail.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{detail.subtitle}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {n.read && <CheckCircle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                  </div>

                  {/* Davet aksiyon butonları */}
                  {isInvite && inviteId && n.payload?.project_id && inviteRoleId && inviteStatus === 'pending' && (
                    <InviteActions
                      inviteId={inviteId}
                      projectId={n.payload.project_id as string}
                      roleId={inviteRoleId}
                    />
                  )}
                  {isInvite && inviteStatus && inviteStatus !== 'pending' && (
                    <p className={`text-xs mt-2 font-medium ${inviteStatus === 'accepted' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                      {inviteStatus === 'accepted' ? '✓ Kabul edildi' : 'Reddedildi'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
