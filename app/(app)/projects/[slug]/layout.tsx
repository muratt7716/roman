import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PenLine, Lightbulb, BookOpen, Clock, Users, BarChart2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: 'overview', label: 'Genel Bakış', icon: BarChart2 },
  { href: 'write', label: 'Yaz', icon: PenLine },
  { href: 'brainstorm', label: 'Fikirler', icon: Lightbulb },
  { href: 'wiki', label: 'Karakterler', icon: Users },
  { href: 'timeline', label: 'Zaman Çizelgesi', icon: Clock },
  { href: 'history', label: 'Geçmiş', icon: BookOpen },
]

interface Props {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, slug, owner_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .single()

  const isOwner = project.owner_id === user.id
  const hasAccess = isOwner || !!member
  if (!hasAccess) redirect(`/projects/${project.slug}`)

  return (
    <div className="flex flex-col md:flex-row min-h-dvh pt-16">
      
      {/* Mobile Sticky Sub-Nav (only visible on mobile screens below md) */}
      <div className="md:hidden sticky top-16 z-30 w-full overflow-x-auto flex-nowrap shrink-0 bg-background/80 backdrop-blur-md border-b border-white/[0.06] px-4 py-2.5 flex gap-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={`/projects/${id}/${item.href}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-white/[0.02] border border-white/[0.06] text-muted-foreground hover:text-white transition-all duration-200"
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Sidebar - Desktop only (hidden on mobile below md) */}
      <aside className="hidden md:flex w-56 border-r border-white/[0.06] bg-[hsl(245_25%_5%)] shrink-0 flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 font-medium">Proje</p>
          <p className="font-display font-semibold text-sm line-clamp-2 leading-snug">{project.title}</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Proje navigasyonu">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={`/projects/${id}/${item.href}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150 group"
            >
              <item.icon className="w-4 h-4 shrink-0 group-hover:text-primary transition-colors" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-[hsl(245_25%_4%)] w-full">
        {children}
      </main>
    </div>
  )
}
