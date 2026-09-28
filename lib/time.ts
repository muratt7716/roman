/**
 * Türkiye takvim günü. Sunucu (Vercel) UTC'de çalışır: `toISOString().slice(0, 10)`
 * gece 00:00–03:00 arasını önceki güne sayar — seri ve günlük hedef bu yüzden
 * yanlış güne yazılıyordu.
 *
 * Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok), gün sınırı hesabı buna dayanır.
 */
const TR_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' })

/** 'YYYY-MM-DD' — İstanbul'a göre bugün (veya verilen an) */
export function istanbulDate(d: Date = new Date()): string {
  return TR_DAY.format(d)
}

/** İstanbul'da o günün 00:00'ı, UTC an olarak */
export function istanbulDayStart(dateStr: string = istanbulDate()): Date {
  return new Date(`${dateStr}T00:00:00+03:00`)
}

/** İki 'YYYY-MM-DD' arasındaki gün farkı (b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}
