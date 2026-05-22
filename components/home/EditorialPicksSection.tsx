'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, BookOpen } from 'lucide-react'
import type { EditorialPick } from '@/types'

export function EditorialPicksSection() {
  const [picks, setPicks] = useState<EditorialPick[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/editorial-picks')
      .then(r => r.json())
      .then(d => { setPicks(d.picks ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || picks.length === 0) return null

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white">Bu Hafta Öne Çıkanlar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Okuyucular tarafından en çok beğenilen hikâyeler</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {picks.map((pick, i) => (
          <Link
            key={pick.id}
            href={`/projects/${pick.slug}/read`}
            className="group block glass-card rounded-2xl overflow-hidden hover:border-white/[0.15] transition-colors"
          >
            <div className="aspect-[3/2] bg-gradient-to-br from-violet-900/30 to-indigo-900/20 relative overflow-hidden">
              {pick.cover_image_url ? (
                <img
                  src={pick.cover_image_url}
                  alt={pick.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white/10" />
                </div>
              )}
              {i === 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-[10px] font-bold text-black">
                  🏆 #1
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="font-semibold text-white line-clamp-1">{pick.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pick.owner_display_name ?? pick.owner_username}
                {pick.genre && <span className="ml-1.5 text-muted-foreground/60">· {pick.genre}</span>}
              </p>
              <span className="inline-block mt-3 text-xs text-primary font-medium group-hover:text-accent transition-colors">
                Okumaya Başla →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
