import Link from 'next/link'
import { Users, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ProjectWithOwner } from '@/types'

interface ProjectCardProps {
  project: ProjectWithOwner
}

const GENRE_GRADIENTS: Record<string, { cover: string; badge: string }> = {
  'Fantastik':    { cover: 'from-violet-600/30 via-purple-900/20 to-background',  badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
  'Bilim Kurgu':  { cover: 'from-cyan-600/30 via-blue-900/20 to-background',      badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
  'Romantik':     { cover: 'from-pink-600/30 via-rose-900/20 to-background',      badge: 'bg-pink-500/15 text-pink-300 border-pink-500/25' },
  'Gerilim':      { cover: 'from-red-700/30 via-red-900/20 to-background',        badge: 'bg-red-500/15 text-red-300 border-red-500/25' },
  'Macera':       { cover: 'from-orange-600/30 via-amber-900/20 to-background',   badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25' },
  'Tarihi':       { cover: 'from-amber-700/30 via-yellow-900/20 to-background',   badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  'Distopya':     { cover: 'from-slate-600/30 via-zinc-900/20 to-background',     badge: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
}

const DEFAULT_GENRE = {
  cover: 'from-primary/20 via-surface to-background',
  badge: 'bg-primary/15 text-primary border-primary/25',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const genre = GENRE_GRADIENTS[project.genre ?? ''] ?? DEFAULT_GENRE

  return (
    <Link href={`/projects/${project.slug}`} className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
      <div className="glass-card rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:shadow-[0_24px_48px_-8px_rgba(0,0,0,0.6),0_0_30px_rgba(124,58,237,0.12)]">

        {/* Cover gradient */}
        <div className={`h-40 bg-gradient-to-br ${genre.cover} relative overflow-hidden`}>
          {project.cover_image_url ? (
            <img src={project.cover_image_url} alt={project.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            /* Decorative pattern */
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)',
            }} />
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[hsl(245_22%_7%)] to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            {project.genre && (
              <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${genre.badge}`}>
                {project.genre}
              </span>
            )}
            {project.collaboration_status === 'recruiting' && (
              <span className="ml-auto text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Üye Aranıyor
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className="font-semibold text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors duration-200">
            {project.title}
          </h3>

          {project.synopsis && (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {project.synopsis}
            </p>
          )}

          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/8">
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{project.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 ring-1 ring-white/10">
                <AvatarImage src={project.owner?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                  {project.owner?.display_name?.[0] ?? project.owner?.username?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {project.owner?.display_name ?? project.owner?.username}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {project.member_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {project.member_count}
                </span>
              )}
              {project.current_word_count > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {(project.current_word_count / 1000).toFixed(1)}K
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
