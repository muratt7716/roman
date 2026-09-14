import Link from 'next/link'
import { Settings, PenLine } from 'lucide-react'
import { genreTheme } from '@/lib/genreTheme'
import type { ProjectWithOwner } from '@/types'

interface ProjectRowProps {
  project: ProjectWithOwner
  /** Proje sahibi mi? Sahibe "Yönet" de gösterilir. */
  canManage?: boolean
}

/** 0.0K anlamsız — bin altında ham sayı, üstünde Türkçe ondalık virgülüyle K. */
function formatWords(n: number) {
  if (n < 1000) return `${n}`
  return `${(n / 1000).toFixed(1).replace('.', ',')}K`
}

/** "Hangisine en son dokundum?" — masadaki asıl soru. */
function lastTouched(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'bugün'
  if (days === 1) return 'dün'
  if (days < 7) return `${days} gün önce`
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`
  if (days < 365) return `${Math.floor(days / 30)} ay önce`
  return `${Math.floor(days / 365)} yıl önce`
}

/**
 * Panel satırı. Poster kart (ProjectCard) okura kitabı tanıtır; bu satır
 * yazarın kendi masası için: nerede kaldım, ne kadar ilerledim, beni yazıya
 * geri götür. Kapak kimliği taşıyan küçük bir çipe iner, satırın taşıdığı
 * bilgi ilerleme olur.
 *
 * (app) route'ları UUID ile çalışır — slug değil, project.id kullanılır.
 */
export function ProjectRow({ project, canManage = false }: ProjectRowProps) {
  const genre = genreTheme(project.genre)
  const words = project.current_word_count ?? 0
  const target = project.target_word_count ?? 0
  const pct = target > 0 ? Math.min(100, Math.round((words / target) * 100)) : null
  const initial = (project.title.trim()[0] ?? '?').toLocaleUpperCase('tr')

  return (
    <div className="group relative flex items-center gap-3 rounded-xl bg-surface-2/40 ring-1 ring-white/[0.06] p-2.5 transition-all duration-300 hover:bg-surface-2/70 hover:ring-white/[0.14]">
      {/* Satırın tamamı yazı odasına götürür; aksiyonlar z-10 ile üstte durur */}
      <Link
        href={`/projects/${project.id}/write`}
        aria-label={`${project.title} — yazı odası`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {/* Kapak çipi — kitap sırtı ölçeğinde */}
      <div className="w-11 h-14 rounded-md overflow-hidden shrink-0 ring-1 ring-white/[0.08]">
        {project.cover_image_url ? (
          <img
            src={project.cover_image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${genre.cover} flex items-center justify-center`}>
            <span className="font-display text-base text-white/35">{initial}</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold text-sm text-white truncate group-hover:text-accent transition-colors duration-300">
            {project.title}
          </h3>
          {project.collaboration_status === 'recruiting' && (
            <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[10px] text-emerald-300/90">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline">Üye aranıyor</span>
            </span>
          )}
        </div>

        {pct !== null ? (
          <div className="mt-1.5 flex items-center gap-2.5">
            <div className="h-1 w-full max-w-[160px] rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
              {formatWords(words)} / {formatWords(target)}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {words > 0 ? `${formatWords(words)} kelime` : 'Henüz yazılmadı'}
          </p>
        )}
      </div>

      <span className="hidden md:block text-[11px] text-muted-foreground/70 shrink-0 mr-1">
        {lastTouched(project.updated_at)}
      </span>

      <div className="relative z-10 flex items-center gap-1.5 shrink-0">
        <Link
          href={`/projects/${project.id}/write`}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium transition-colors"
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Yaz</span>
        </Link>
        {canManage && (
          <Link
            href={`/projects/${project.id}/overview`}
            aria-label={`${project.title} — yönet`}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-surface-2 ring-1 ring-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yönet</span>
          </Link>
        )}
      </div>
    </div>
  )
}
