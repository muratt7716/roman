'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, PenLine, Plus, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ease = [0.16, 1, 0.3, 1] as const

const titleContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.3 },
  },
}

const titleLetter = {
  hidden: { opacity: 0, y: '0.55em', rotateX: -70, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: '0em',
    rotateX: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.9, ease },
  },
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease, delay },
})

interface AnimatedHeroProps {
  isLoggedIn: boolean
}

export function AnimatedHero({ isLoggedIn }: AnimatedHeroProps) {
  const words = ['Kalem', 'Birliği']

  return (
    <section className="relative min-h-[calc(100svh-4rem)] flex flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* ── Animated mesh gradient background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{ x: [0, 80, -60, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.95, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[15%] left-[15%] w-[50vw] h-[50vw] max-w-[720px] max-h-[720px] rounded-full bg-violet-700/15 blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -70, 50, 0], y: [0, 50, -40, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[35%] right-[5%] w-[42vw] h-[42vw] max-w-[560px] max-h-[560px] rounded-full bg-indigo-600/10 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 60, -50, 0], y: [0, -40, 60, 0], scale: [1, 1.1, 0.92, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-[0%] left-[8%] w-[38vw] h-[38vw] max-w-[520px] max-h-[520px] rounded-full bg-amber-500/[0.06] blur-[110px]"
        />
        {/* Fine grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
        {/* Bottom fade into next section */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center">
        {/* Eyebrow badge */}
        <motion.div {...fadeUp(0.1)} className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wide bg-white/[0.03] border border-white/[0.08] text-violet-300 backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Türkiye&apos;nin Ortak Hikâye Yazma Platformu
          </span>
        </motion.div>

        {/* Giant staggered title */}
        <motion.h1
          variants={titleContainer}
          initial="hidden"
          animate="visible"
          className="font-display font-bold tracking-tight leading-[0.95] text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white [perspective:800px]"
          aria-label="Kalem Birliği"
        >
          {words.map((word, wi) => (
            <span key={word} className="inline-block whitespace-nowrap">
              {[...word].map((ch, ci) => (
                <motion.span
                  key={`${wi}-${ci}`}
                  variants={titleLetter}
                  className={cn(
                    'inline-block will-change-transform',
                    wi === 1 && 'text-gradient'
                  )}
                >
                  {ch}
                </motion.span>
              ))}
              {wi === 0 && <span className="inline-block">&nbsp;</span>}
            </span>
          ))}
        </motion.h1>

        {/* Thin-weight contrast line */}
        <motion.p
          {...fadeUp(0.9)}
          className="mt-6 font-display font-light text-xl sm:text-2xl md:text-3xl text-white/70 tracking-wide"
        >
          Hikâyeler birlikte daha güçlü yazılır.
        </motion.p>

        <motion.p
          {...fadeUp(1.05)}
          className="mt-6 text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed"
        >
          Ekibinizi kurun, canlı kurgu evreninizi tasarlayın ve gerçek zamanlı
          ortak yazarlık deneyimiyle kelimelerinizi tek bir hikâyede birleştirin.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          {...fadeUp(1.2)}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4"
        >
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-medium shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] transition-all duration-300 gap-2 text-base'
                )}
              >
                <PenLine className="w-4 h-4" /> Yazmaya Devam Et
              </Link>
              <Link
                href="/projects/new"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full sm:w-auto text-muted-foreground hover:text-white px-8 py-6 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300 gap-2 text-base backdrop-blur-md'
                )}
              >
                <Plus className="w-4 h-4" /> Yeni Proje
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-medium shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] transition-all duration-300 gap-2 text-base'
                )}
              >
                Ücretsiz Başla <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/explore"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full sm:w-auto text-muted-foreground hover:text-white px-8 py-6 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300 text-base backdrop-blur-md'
                )}
              >
                Evrenleri Keşfet
              </Link>
            </>
          )}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/60"
      >
        <span>Keşfet</span>
        <div className="w-5 h-9 rounded-full border border-white/[0.12] flex items-start justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 10, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1 h-2 rounded-full bg-primary"
          />
        </div>
      </motion.div>
    </section>
  )
}
