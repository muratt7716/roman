import { describe, it, expect } from 'vitest'
import { requiresConsent, TERMS_VERSION } from '@/lib/legal'

describe('requiresConsent', () => {
  it('hiç rıza yoksa kapı', () => {
    expect(requiresConsent({ consent_at: null, consent_version: null })).toBe(true)
  })

  it('eski metin sürümüne verilmiş rıza yetmez (yurt dışı aktarım rızası içermez)', () => {
    expect(requiresConsent({ consent_at: '2026-07-20T00:00:00Z', consent_version: '2026-07-05' })).toBe(true)
  })

  it('güncel sürüme verilmiş rıza geçer', () => {
    expect(requiresConsent({ consent_at: '2026-09-26T00:00:00Z', consent_version: TERMS_VERSION })).toBe(false)
  })
})
