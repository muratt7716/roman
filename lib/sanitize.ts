import sanitize from 'sanitize-html'

/**
 * TipTap içeriğini DOM'a basmadan ÖNCE temizler. Sunucuda ve tarayıcıda çalışır.
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
 *
 * Neden sanitize-html, DOMPurify değil (27 Eyl 2026): isomorphic-dompurify
 * sunucuda jsdom çalıştırır ve jsdom Vercel'in sunucusuz paketlemesinde
 * kırılır — okuma, dışa aktarma ve öneri sayfaları 23 Eyl'den beri canlıda
 * 500 veriyordu; geçmiş, ödev inceleme ve dergi sayfalarındaki istemci
 * bileşenleri de SSR'da çöküp istemciye düşüyordu (React #419). Yerelde
 * çalıştığı için görünmedi. sanitize-html saf JS'tir.
 */

// TipTap'in ürettiği etiketler + tablo/görsel desteği. Liste beyaz listedir:
// burada olmayan her etiket düşer, beyaz listede olmayan her öznitelik (on* dahil) düşer.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup', 'code', 'pre',
  'blockquote', 'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

// style yalnızca TipTap'in kullandığı özelliklerle: hizalama ve renk. Serbest
// style, sayfanın üstüne binen sahte giriş kutusu gibi CSS saldırılarına açıktır.
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i]
const OPTIONS: sanitize.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    '*': ['class', 'style', 'title'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: COLOR,
      'background-color': COLOR,
      // Editörün yazı tipi seçici (TipTapEditor FONT_FAMILIES) — yalnızca ad listesi
      'font-family': [/^[\w\s"',-]+$/],
    },
  },
  // javascript:, data:text/html gibi şemalar düşer; göreli adresler kalır
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // Yeni sekmede açılan bağlantı, açan sayfayı window.opener ile yönetemesin
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank' ? { ...attribs, rel: 'noopener noreferrer' } : attribs,
    }),
  },
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  return sanitize(html, OPTIONS)
}
