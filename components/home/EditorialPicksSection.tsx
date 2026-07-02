'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { HorizontalProjectScroll } from '@/components/home/HorizontalProjectScroll'
import type { EditorialPick } from '@/types'

const ease = [0.16, 1, 0.3, 1] as const

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
    <section className="relative w-full py-20 sm:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease }}
          className="px-4 sm:px-6 mb-10 sm:mb-12 flex items-end justify-between gap-4"
        >
          <div>
            <span className="inline-flex items-center gap-2 text-amber-400 text-[11px] font-semibold tracking-[0.2em] uppercase">
              <Trophy className="w-3.5 h-3.5" /> Editöryal Seçki
            </span>
            <h2 className="mt-3 font-display font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
              Bu Hafta <span className="text-gradient-gold">Öne Çıkanlar</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
              Okuyucular tarafından en çok beğenilen, alkışlanan ve okuma listelerine eklenen hikâyeler.
            </p>
          </div>
        </motion.div>

        <HorizontalProjectScroll picks={picks} />
      </div>
    </section>
  )
}
