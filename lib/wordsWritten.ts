import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Kullanıcının `since` anından bu yana YAZDIĞI kelime.
 *
 * Her versiyon bölümün o anki TOPLAM kelime sayısını taşır, fark değil. Eskiden
 * bu toplamlar toplanıyordu: 1000 kelimelik bölüme 50 kelime ekleyip üç kez
 * kaydeden yazar "3150 kelime yazdın" görüyordu. Doğrusu bölüm başına
 * (dönemdeki son hali − dönem başındaki hali).
 */
export async function wordsWrittenSince(supabase: SupabaseClient, userId: string, since: Date): Promise<number> {
  const sinceIso = since.toISOString()
  const { data: recent } = await supabase
    .from('chapter_versions')
    .select('chapter_id, word_count, created_at')
    .eq('author_id', userId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })

  if (!recent?.length) return 0

  // Bölüm başına dönemdeki son hal
  const latest = new Map<string, number>()
  for (const v of recent) if (!latest.has(v.chapter_id)) latest.set(v.chapter_id, v.word_count ?? 0)

  // Bölüm başına dönem başındaki hal (kim yazmış olursa olsun, son versiyon)
  const { data: before } = await supabase
    .from('chapter_versions')
    .select('chapter_id, word_count, created_at')
    .in('chapter_id', [...latest.keys()])
    .lt('created_at', sinceIso)
    .order('created_at', { ascending: false })
  const baseline = new Map<string, number>()
  for (const v of before ?? []) if (!baseline.has(v.chapter_id)) baseline.set(v.chapter_id, v.word_count ?? 0)

  let total = 0
  for (const [chapterId, wc] of latest) total += Math.max(0, wc - (baseline.get(chapterId) ?? 0))
  return total
}
