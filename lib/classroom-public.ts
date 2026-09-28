import { createAdminClient } from '@/lib/supabase/admin'

export interface ClassroomPublicInfo { name: string; school_name: string }

/**
 * Yayımlanmış dergilerin künyesi için sınıf ve okul adı. `classrooms` RLS'i
 * yalnızca üyelere açık; bu yüzden herkese açık dergi listesinde künye boş
 * çıkıyor, okuma sayfası da sınıf dışındaki herkese 404 veriyordu — yayımlanan
 * dergiyi sınıf dışından kimse okuyamıyordu (29 Eyl 2026).
 *
 * Yalnızca bu iki alan döner (şifre, katılım kodu, üyeler asla). Aynı bilgi
 * search_classrooms ile zaten herkese açık: öğrenci sınıfı bu adlarla arar.
 */
export async function publicClassroomInfo(ids: string[]): Promise<Map<string, ClassroomPublicInfo>> {
  const out = new Map<string, ClassroomPublicInfo>()
  if (ids.length === 0) return out
  try {
    const { data } = await createAdminClient().from('classrooms').select('id, name, school_name').in('id', [...new Set(ids)])
    for (const c of data ?? []) out.set(c.id as string, { name: c.name as string, school_name: c.school_name as string })
  } catch {
    // service-role anahtarı yoksa künyesiz göster, sayfayı düşürme
  }
  return out
}
