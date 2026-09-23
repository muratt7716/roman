/**
 * Sitenin kanonik adresi. Metadata, sitemap ve robots aynı kaynağı kullanır ki
 * paylaşım önizlemeleri ve arama motoru kayıtları birbirini tutsun.
 *
 * Vercel önizleme dağıtımlarında VERCEL_URL farklıdır; canonical'ın her zaman
 * production'ı göstermesi için önce açık değişkene bakılır.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://writersquad.vercel.app'

export const SITE_NAME = 'Kalem Birliği'

export const SITE_DESCRIPTION =
  'Yazarların birlikte roman yazdığı Türkçe ortak kurgu ağı. Projene ekip kur, bölüm bölüm yaz, okurlarınla buluş.'
