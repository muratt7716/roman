import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/account/delete — kalıcı hesap silme (KVKK m.7/m.11 silme hakkı)
// auth.users satırı silinince profiles.id FK cascade ile profil, sahip
// olunan projeler, üyelikler, yorumlar vb. otomatik silinir. Başkasının
// projesindeki yazım katkıları SET NULL ile projede kalır (bkz.
// supabase/migrations/2026-09-25-account-delete-set-null.sql).
//
// Depodaki dosyalar FK'ya bağlı değildir, cascade onlara ulaşmaz: profil
// fotoğrafı (avatars/{userId}.*) ve projelerin kapakları (covers/{projectId}.*)
// herkese açık bucket'larda kalırdı. Onları burada ayrıca siliyoruz.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  // Cascade projeleri götürmeden önce kapak dosyalarının adlarını bilmemiz gerek
  const { data: ownedProjects } = await admin.from('projects').select('id').eq('owner_id', user.id)

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Hesap silindi — dosya temizliği başarısız olsa bile kullanıcıya hata
  // dönmeyiz (hesap geri gelmez), ama sessizce de geçmeyiz.
  await Promise.all([
    removeByPrefix(admin, 'avatars', user.id),
    ...(ownedProjects ?? []).map(p => removeByPrefix(admin, 'covers', p.id as string)),
  ])

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}

/** Dosyalar `${id}.${ext}` adıyla, bucket kökünde duruyor (SettingsForm, CoverImageUpload) */
async function removeByPrefix(admin: SupabaseClient, bucket: string, id: string) {
  const { data: files, error } = await admin.storage.from(bucket).list('', { search: id })
  if (error) return console.error(`[account/delete] ${bucket} listelenemedi:`, error.message)

  const names = (files ?? []).map(f => f.name).filter(n => n.startsWith(`${id}.`))
  if (names.length === 0) return

  const { error: rmError } = await admin.storage.from(bucket).remove(names)
  if (rmError) console.error(`[account/delete] ${bucket} silinemedi:`, rmError.message)
}
