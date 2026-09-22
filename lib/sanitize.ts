import DOMPurify from 'isomorphic-dompurify'

/**
 * TipTap içeriğini DOM'a basmadan ÖNCE temizler.
 *
 * Neden gerekli: bölüm içeriği `chapter_versions.content` sütununda ham HTML
 * olarak durur ve editör tek yazma yolu DEĞİLDİR — kullanıcı kendi oturum
 * anahtarıyla doğrudan PostgREST'e yazabilir (RLS satırı ona ait olduğu için
 * izin verir). Yani "TipTap böyle bir şey üretmez" bir güvenlik garantisi
 * değil; 23 Eyl 2026'da `<img onerror=...>` yükünün veritabanına olduğu gibi
 * girip geri geldiği doğrulandı.
 *
 * React'in dangerouslySetInnerHTML'i `<script>` etiketini çalıştırmaz, ama
 * olay yakalayıcıları (`onerror`, `onload`) ve `<iframe>` çalışır — oturum
 * çerezi tarayıcı istemcisinde JS'e açık olduğu için bu hesap devralmaya kadar
 * gider. Bu yüzden temizlik her render noktasında yapılır, yazma anında değil:
 * yazma yolu baypas edilebilir, render yolu edilemez.
 */

// TipTap'in ürettiği etiketler + tablo/görsel desteği. Liste beyaz listedir:
// burada olmayan her etiket düşer, her olay yakalayıcı (on*) düşer.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style', 'colspan', 'rowspan']

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // javascript:, data:text/html gibi şemaları engeller
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):|^[^a-z]|^\/(?!\/)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'formaction', 'srcdoc'],
  })
}
