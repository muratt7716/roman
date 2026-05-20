import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VIS_LABELS: Record<string, string> = {
  private: 'Gizli',
  open: 'Açık',
  closed: 'Kapalı',
  published: 'Yayında',
}

const VIS_COLORS: Record<string, string> = {
  private: 'text-slate-400 bg-slate-400/10',
  open: 'text-emerald-400 bg-emerald-400/10',
  closed: 'text-amber-400 bg-amber-400/10',
  published: 'text-violet-400 bg-violet-400/10',
}

export default async function AdminProjectsPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, profiles(display_name, username), project_members(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Projeler</h1>
        <p className="text-sm text-muted-foreground mt-1">{projects?.length ?? 0} proje</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Proje</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Sahibi</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Durum</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Üye</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {(projects ?? []).map((p: any) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium line-clamp-1">{p.title}</p>
                    {p.genre && <p className="text-[11px] text-muted-foreground mt-0.5">{p.genre}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {(p.profiles as any)?.display_name ?? (p.profiles as any)?.username ?? '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${VIS_COLORS[p.visibility] ?? 'text-muted-foreground'}`}>
                    {VIS_LABELS[p.visibility] ?? p.visibility}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {Array.isArray(p.project_members) ? p.project_members.length : 0}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(p.created_at).toLocaleDateString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(projects ?? []).length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz proje yok.</div>
        )}
      </div>
    </div>
  )
}
