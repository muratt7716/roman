import type { Profile } from '@/types'

/**
 * Hukuki metinlerin sürümü. Rıza kaydı bu sürümle birlikte saklanır — böylece
 * bir kullanıcının metnin HANGİ halini kabul ettiği geriye dönük olarak belli olur.
 *
 * Kullanım Koşulları, Aydınlatma Metni (gizlilik-politikasi) veya Açık Rıza
 * Metni'ni değiştirdiğinde ikisini birlikte güncelle. Sürüm değişince herkes
 * bir sonraki girişte /onay kapısına düşer (bkz. requiresConsent).
 */
export const TERMS_VERSION = '2026-09-26'
export const TERMS_UPDATED_LABEL = '26 Eylül 2026'

/**
 * KVKK m.10 — aydınlatma metninde veri sorumlusunun kimliği yer almalı.
 * Başvuru kanalı (m.13): Başvuru Tebliği m.5, veri sorumlusunun bu amaçla
 * sunduğu bir yazılım/uygulama üzerinden başvuruyu kabul eder — platform içi
 * geri bildirim formu bu kanal.
 */
export const DATA_CONTROLLER = {
  name: 'Kalem Birliği',
  channel: 'Platform içindeki "Geri Bildirim Gönder" formu ("Diğer / KVKK" kategorisi)',
}

/**
 * Onay kapısı politikası — kullanıcı `/onay` ekranına yönlendirilir mi?
 *
 * Katı sürüm: rıza hiç yoksa VEYA metnin eski bir sürümüne verilmişse kapı.
 * 26 Eyl 2026'da gevşek sürümden (`!consent_at`) buna geçildi; sebebi o tarihte
 * eklenen yurt dışı aktarım açık rızası. Eski kayıtlar bu rızayı içermiyor, yani
 * gevşek sürümde mevcut kullanıcılardan hiç alınamazdı.
 *
 * Bedeli: metin her güncellendiğinde herkes bir kez daha onay verir. Yazım
 * düzeltmesi gibi önemsiz değişikliklerde TERMS_VERSION'a dokunma.
 */
export function requiresConsent(
  profile: Pick<Profile, 'consent_at' | 'consent_version'>
): boolean {
  return !profile.consent_at || profile.consent_version !== TERMS_VERSION
}
