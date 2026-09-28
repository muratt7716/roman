import { describe, it, expect } from 'vitest'
import { istanbulDate, istanbulDayStart, daysBetween } from '@/lib/time'

describe('İstanbul günü', () => {
  it('gece 01:30 (TR) önceki UTC gününe DÜŞMEZ', () => {
    // 2026-09-29 01:30 İstanbul = 2026-09-28 22:30 UTC
    expect(istanbulDate(new Date('2026-09-28T22:30:00Z'))).toBe('2026-09-29')
  })

  it('gün başı UTC 21:00 olarak hesaplanır', () => {
    expect(istanbulDayStart('2026-09-29').toISOString()).toBe('2026-09-28T21:00:00.000Z')
  })

  it('gün farkı', () => {
    expect(daysBetween('2026-09-28', '2026-09-29')).toBe(1)
    expect(daysBetween('2026-09-27', '2026-09-29')).toBe(2)
  })
})
