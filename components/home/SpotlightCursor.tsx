'use client'

import { useEffect } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'

/**
 * Mouse'u takip eden yumuşak spotlight ışık efekti.
 * Sadece fare (pointer: fine) olan cihazlarda dinleyici eklenir;
 * dokunmatik cihazlarda gradient ekran dışında kalır ve görünmez.
 */
export function SpotlightCursor() {
  const x = useMotionValue(-1000)
  const y = useMotionValue(-1000)
  const springX = useSpring(x, { damping: 28, stiffness: 220, mass: 0.6 })
  const springY = useSpring(y, { damping: 28, stiffness: 220, mass: 0.6 })

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const handleMove = (e: MouseEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [x, y])

  const background = useMotionTemplate`radial-gradient(650px circle at ${springX}px ${springY}px, rgba(139, 92, 246, 0.07), transparent 70%)`

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[4] hidden md:block"
      style={{ background }}
    />
  )
}
