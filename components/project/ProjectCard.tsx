import Link from 'next/link'
import { Users, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ProjectWithOwner } from '@/types'

interface ProjectCardProps {
  project: ProjectWithOwner
  /**
   * 'poster'  — keşfet / kütüphane / profil: 4:5 sinematik kart, okura kitabı tanıtır.
   * 'compact' — panel: 3:4, daraltılmış tipografi. Sinopsis ve etiketler gizlenir;
   *             küçük yüzeyde bilgi değil gürültü olurlar.
   */
  variant?: 'poster' | 'compact'
}

const GENRE_GRADIENTS: Record<string, { cover: string; badge: string }> = {
  'Fantastik':    { cover: 'from-violet-600/40 via-purple-950/60 to-black',  badge: 'bg-violet-500/20 text-violet-200 border-violet-400/30' },
  'Bilim Kurgu':  { cover: 'from-cyan-600/40 via-blue-950/60 to-black',      badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30' },
  'Romantik':     { cover: 'from-pink-600/40 via-rose-950/60 to-black',      badge: 'bg-pink-500/20 text-pink-200 border-pink-400/30' },
  'Gerilim':      { cover: 'from-red-700/40 via-red-950/60 to-black',        badge: 'bg-red-500/20 text-red-200 border-red-400/30' },
  'Macera':       { cover: 'from-orange-600/40 via-amber-950/60 to-black',   badge: 'bg-orange-500/20 text-orange-200 border-orange-400/30' },
  'Tarihi':       { cover: 'from-amber-700/40 via-yellow-950/60 to-black',   badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
  'Distopya':     { cover: 'from-slate-600/40 via-zinc-950/60 to-black',     badge: 'bg-slate-500/20 text-slate-200 border-slate-400/30' },
}

const DEFAULT_GENRE = {
  cover: 'from-primary/30 via-violet-950/50 to-black',
  badge: 'bg-primary/20 text-accent border-primary/30',
}

export function ProjectCard({ project, variant = 'poster' }: ProjectCardProps) {
  const genre = GENRE_GRADIENTS[project.genre ?? ''] ?? DEFAULT_GENRE
  const compact = variant === 'compact'

  // Küçülen yüzey kendi ölçeğini ister: sabit bir köşe yarıçapı küçük kartta
  // orantısal olarak büyür ve kartı şişkin gösterir.
  const s = compact
    ? {
        ratio: 'aspect-[3/4]', radius: 'rounded-xl', lift: 'group-hover:-translate-y-1',
        badgeInset: 'top-2 left-2 right-2', badgeText: 'text-[9px] px-2 py-0.5',
        pad: 'p-3.5', title: 'text-sm sm:text-base', footer: 'mt-2.5 pt-2.5',
        avatar: 'w-5 h-5', meta: 'text-[11px]', metaGap: 'gap-2', nameWidth: 'max-w-[80px]',
      }
    : {
        ratio: 'aspect-[4/5]', radius: 'rounded-2xl', lift: 'group-hover:-translate-y-1.5',
        badgeInset: 'top-3 left-3 right-3', badgeText: 'text-[10px] px-2.5 py-1',
        pad: 'p-5', title: 'text-lg', footer: 'mt-3.5 pt-3',
        avatar: 'w-6 h-6', meta: 'text-xs', metaGap: 'gap-3', nameWidth: 'max-w-[110px]',
      }

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${s.radius}`}
    >
      <div className={`relative ${s.ratio} ${s.radius} overflow-hidden border border-white/[0.07] bg-surface transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${s.lift} group-hover:border-white/[0.16] group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.14)]`}>

        {/* ── Sinematik cover ── */}
        <div className="absolute inset-0 overflow-hidden">
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={project.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${genre.cover} transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]`}>
              {/* Decorative light pattern */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 25% 35%, rgba(255,255,255,0.12) 0%, transparent 45%), radial-gradient(circle at 80% 15%, rgba(255,255,255,0.06) 0%, transparent 40%)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-white/[0.08]`} />
              </div>
            </div>
          )}
        </div>

        {/* ── Overlay gradient (cinematic bottom fade) ── */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/5 transition-opacity duration-500" />

        {/* ── Üst badge'lar — glassmorphism ── */}
        <div className={`absolute ${s.badgeInset} flex items-start justify-between gap-2`}>
          {project.genre && (
            <span className={`${s.badgeText} rounded-full border font-medium backdrop-blur-md ${genre.badge}`}>
              {project.genre}
            </span>
          )}
          {project.collaboration_status === 'recruiting' && (
            <span className={`ml-auto ${s.badgeText} rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 backdrop-blur-md font-medium flex items-center gap-1.5 shrink-0 whitespace-nowrap`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Üye Aranıyor
            </span>
          )}
        </div>

        {/* ── Alt içerik — hover'da yukarı kayar ── */}
        <div className={`absolute inset-x-0 bottom-0 ${s.pad} transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1`}>
          <h3 className={`font-display font-semibold ${s.title} text-white leading-snug line-clamp-2 group-hover:text-accent transition-colors duration-300`}>
            {project.title}
          </h3>

          {!compact && project.synopsis && (
            <p className="mt-2 text-xs text-white/60 leading-relaxed line-clamp-2 max-h-0 opacity-0 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:max-h-16 group-hover:opacity-100">
              {project.synopsis}
            </p>
          )}

          {!compact && project.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.07] text-white/60 border border-white/[0.1] backdrop-blur-md shrink-0 whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[10px] text-white/50">+{project.tags.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer meta */}
          <div className={`${s.footer} border-t border-white/[0.08] flex items-center justify-between`}>
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className={`${s.avatar} ring-1 ring-white/15 shrink-0`}>
                <AvatarImage src={project.owner?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-primary/25 text-accent font-semibold">
                  {project.owner?.display_name?.[0] ?? project.owner?.username?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className={`${s.meta} text-white/60 truncate ${s.nameWidth}`}>
                {project.owner?.display_name ?? project.owner?.username}
              </span>
            </div>
            <div className={`flex items-center ${s.metaGap} ${s.meta} text-white/55 shrink-0`}>
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
