import { sanitizeHtml } from '@/lib/sanitize'
import { describe, it, expect } from 'vitest'
describe('TipTap çıktısı', () => {
  it('editörün ürettiği renk, vurgu ve yazı tipi korunur', () => {
    const html = '<p style="text-align: center"><span style="color: #f87171; font-family: Lora, Georgia, serif">a</span><mark data-color="#fbbf2440" style="background-color: #fbbf2440; color: inherit">b</mark></p>'
    const out = sanitizeHtml(html)
    console.log(out)
    expect(out).toContain('color:#f87171')
    expect(out).toContain('font-family:Lora, Georgia, serif')
    expect(out).toContain('background-color:#fbbf2440')
    expect(out).toContain('text-align:center')
  })
})
