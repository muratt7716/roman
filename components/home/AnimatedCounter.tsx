'use client'

import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  className?: string
}

/**
 * Scroll'a girince 0'dan hedefe sayan animasyonlu sayaç.
 * Intl.NumberFormat('tr-TR') ile binlik ayraçlı gösterim.
 */
export function AnimatedCounter({ value, suffix = '', className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 45, stiffness: 100 })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, value, motionValue])

  useEffect(() => {
    const format = new Intl.NumberFormat('tr-TR')
    const unsubscribe = spring.on('change', latest => {
      if (ref.current) {
        ref.current.textContent = format.format(Math.round(latest)) + suffix
      }
    })
    return unsubscribe
  }, [spring, suffix])

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  )
}
