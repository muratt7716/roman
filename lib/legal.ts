import type { Profile } from '@/types'

/**
 * Kullanım Koşulları ve Gizlilik Politikası sayfalarında görünen "Son güncelleme"
 * tarihi. Rıza kaydı bu sürümle birlikte saklanır — böylece bir kullanıcının
 * metnin HANGİ halini kabul ettiği geriye dönük olarak belli olur.
 *
 * Metinleri değiştirdiğinde burayı da güncelle.
 */
export const TERMS_VERSION = '2026-07-05'

/**
 * Onay kapısı politikası — kullanıcı `/onay` ekranına yönlendirilir mi?
 *
 * `consent_at` NULL olan her hesap kapıya düşer. Bu iki grubu kapsar:
 *   1. Google ile açılan hesaplar (kayıt formundaki onay kutusunu hiç görmezler)
 *   2. Onay kutusu eklenmeden önce (20 Temmuz 2026) açılmış eski hesaplar
 *
 * Daha katı alternatif — metin her güncellendiğinde herkesten yeniden rıza almak:
 *   return !profile.consent_at || profile.consent_version !== TERMS_VERSION
 * KVKK ispat yükümlülüğü açısından daha güçlü, ama her küçük metin düzeltmesinde
 * tüm kullanıcıları kapıya düşürür.
 */
export function requiresConsent(
  profile: Pick<Profile, 'consent_at'>
): boolean {
  return !profile.consent_at
}
