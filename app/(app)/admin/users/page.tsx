import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  open: 'Müsait',
  busy: 'Meşgul',
  closed: 'Kapalı',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-emerald-400 bg-emerald-400/10',
  busy: 'text-amber-400 bg-amber-400/10',
  closed: 'text-slate-400 bg-slate-400/10',
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Kullanıcılar</h1>
        <p className="text-sm text-muted-foreground mt-1">{users?.length ?? 0} kayıtlı kullanıcı</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Kullanıcı</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Kullanıcı adı</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Durum</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Puan</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Katılım</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(users ?? []).map((u: any) => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} alt="" width={28} height={28} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-xs text-white/60">
                        {(u.display_name ?? u.username ?? '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-white text-sm">{u.display_name ?? u.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">@{u.username}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[u.writing_status] ?? 'text-muted-foreground'}`}>
                    {STATUS_LABELS[u.writing_status] ?? u.writing_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{u.reputation_score ?? 0}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(u.created_at).toLocaleDateString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(users ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz kullanıcı yok.</div>
        )}
      </div>
    </div>
  )
}
