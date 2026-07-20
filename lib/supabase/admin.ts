import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client — RLS bypass. Sadece sunucu tarafı (API route/server
 * action) kodunda kullanılır, asla client'a sızdırılmaz. auth.admin.*
 * çağrıları (örn. hesap silme) için gereklidir; anon key ile yapılamaz.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!url.startsWith('http') || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil — Supabase Dashboard > Settings > API > service_role key değerini .env.local ve Vercel ortam değişkenlerine ekle.')
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
