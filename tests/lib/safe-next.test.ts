import { describe, it, expect } from 'vitest'
import { safeNext } from '@/lib/safe-next'

describe('safeNext', () => {
  it('site içi yolları olduğu gibi geçirir', () => {
    expect(safeNext('/projects/abc/write?x=1')).toBe('/projects/abc/write?x=1')
  })

  it('boş değerde varsayılana düşer', () => {
    expect(safeNext(null)).toBe('/dashboard')
    expect(safeNext('')).toBe('/dashboard')
  })

  it.each([
    ['@evil.com'],            // origin + next → https://site@evil.com
    ['//evil.com'],           // protokolsüz dış adres
    ['/\\evil.com'],          // tarayıcı \ işaretini / sayar
    ['https://evil.com'],
    ['javascript:alert(1)'],
  ])('dış adresi reddeder: %s', next => {
    expect(safeNext(next)).toBe('/dashboard')
  })
})
