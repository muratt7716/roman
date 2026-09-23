import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Bildirim yazmanın tek yolu — ve yalnızca sunucuda.
 *
 * Canlıdaki `notifications_insert_service` politikası kullanıcıya SADECE
 * kendine bildirim yazma izni verir. Bu doğru bir kısıt: gevşetilirse herkes
 * herkese bildirim yazabilir (spam + kimlik avı). Dolayısıyla başkasına
 * bildirim yazmak service-role ile, sunucu tarafında yapılmalıdır.
 *
 * 23 Eyl 2026'da bulundu: kodda 9 yer bunu tarayıcıdan denemekteydi, hepsi
 * sessizce 403 alıyordu (dönen hata hiç kontrol edilmiyordu) ve 2 Tem 2026'dan
 * beri tek bir bildirim bile teslim edilmemişti. Bu yüzden `insertNotifications`
 * hata YUTMAZ — çağıran ya yakalar ya da patlar; sessiz kalmaz.
 */

export interface NotificationRow {
  user_id: string
  type: string
  payload: Record<string, unknown>
}

export async function insertNotifications(rows: NotificationRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const admin = createAdminClient()
  const { data, error } = await admin.from('notifications').insert(rows).select('id')

  if (error) throw new Error(`Bildirim yazılamadı: ${error.message}`)
  return data?.length ?? 0
}

/**
 * Sunucu tarafı çağıranlar için: bildirim gönderilemezse asıl işlem (yorum,
 * alkış, yayın) geri alınmamalı — ama sessizce de kaybolmamalı.
 */
export async function insertNotificationsSafe(rows: NotificationRow[]): Promise<number> {
  try {
    return await insertNotifications(rows)
  } catch (e) {
    console.error('[notifications]', (e as Error).message)
    return 0
  }
}
