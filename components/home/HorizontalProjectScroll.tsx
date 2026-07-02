'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import type { EditorialPick } from '@/types'

const ease = [0.16, 1, 0.3, 1] as const

interface HorizontalProjectScrollProps {
  picks: EditorialPick[]
}

/**
 * Editöryal seçkiler için yatay scroll carousel.
 * Snap noktalı, ok butonlu, hover'da cover scale animasyonlu sinematik kartlar.
 */
export function HorizontalProjectScroll({ picks }: HorizontalProjectScrollProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollByDir = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' })
  }

  return (
    <div className="relative group/scroller">
      {/* Edge fades */}
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 bottom-4 w-10 sm:w-16 z-10 bg-gradient-to-r from-background to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 bottom-4 w-10 sm:w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      {/* Arrow controls */}
      <button
        type="button"
        onClick={() => scrollByDir(-1)}
        aria-label="Önceki projeler"
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-black/60 border border-white/[0.1] text-white/70 backdrop-blur-md opacity-0 group-hover/scroller:opacity-100 hover:text-white hover:border-primary/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => scrollByDir(1)}
        aria-label="Sonraki projeler"
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-black/60 border border-white/[0.1] text-white/70 backdrop-blur-md opacity-0 group-hover/scroller:opacity-100 hover:text-white hover:border-primary/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        className="flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-4 px-4 sm:px-6 no-scrollbar scroll-smooth"
      >
        {picks.map((pick, i) => (
          <motion.div
            key={pick.id}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease, delay: i * 0.1 }}
            className="snap-start shrink-0 w-[260px] sm:w-[320px] md:w-[360px]"
          >
            <Link
              href={`/projects/${pick.slug}/read`}
              className="group block relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/[0.07] bg-surface transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/[0.16] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Cover */}
              <div className="absolute inset-0 overflow-hidden">
                {pick.cover_image_url ? (
                  <img
                    src={pick.cover_image_url}
                    alt={pick.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-900/50 via-indigo-950/40 to-background flex items-center justify-center transition-transform duration-700 group-hover:scale-[1.07]">
                    <BookOpen className="w-14 h-14 text-white/10" />
                  </div>
                )}
              </div>

              {/* Cinematic overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

              {/* Rank badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 border border-white/[0.12] backdrop-blur-md text-[11px] font-bold text-white">
                {i === 0 ? (
                  <span className="text-amber-400">🏆 #1</span>
                ) : (
                  <span className="text-white/70">#{i + 1}</span>
                )}
              </div>

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5">
                {pick.genre && (
                  <span className="inline-block mb-2 text-[10px] px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/80 backdrop-blur-md font-medium tracking-wide">
                    {pick.genre}
                  </span>
                )}
                <h3 className="font-display font-semibold text-lg sm:text-xl text-white leading-snug line-clamp-2">
                  {pick.title}
                </h3>
                <p className="mt-1.5 text-xs text-white/60">
                  {pick.owner_display_name ?? pick.owner_username}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                  Okumaya Başla <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
