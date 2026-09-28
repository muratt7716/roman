import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ suggestionId: string }> }

/**
 * POST /api/suggestions/[id]  { decision: 'accepted' | 'rejected' }
 *
 * Öneriyi değerlendirmenin tek yolu. Eskiden tarayıcı, kabulde yeni versiyonu
 * önerinin SAHİBİ adına (author_id = önerici) ekliyordu; RLS kişinin yalnızca
 * kendi adına eklemesine izin verdiği için ekleme reddediliyor, hata
 * kontrol edilmiyor, öneri yine de "kabul edildi" işaretlenip bildirim
 * gidiyordu — hiçbir kabul bölüme yansımadı (29 Eyl 2026, tarayıcıda kanıtlandı).
 *
 * Emek önericiye yazılmalı (katkı analizi author_id'ye bakar), bu yüzden yazma
 * service-role ile, yetki ise burada kontrol edilir: yalnızca proje sahibi.
 */
export async function POST(req: Request, { params }: Params) {
  const { suggestionId } = await params
  const { decision } = await req.json().catch(() => ({}))
  if (decision !== 'accepted' && decision !== 'rejected')
    return NextResponse.json({ error: 'Geçersiz karar.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  let admin
  try { admin = createAdminClient() } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const { data: s } = await admin
    .from('chapter_suggestions')
    .select('id, status, content, author_id, chapter:chapters!inner(id, project:projects!inner(owner_id))')
    .eq('id', suggestionId)
    .maybeSingle()
  if (!s) return NextResponse.json({ error: 'Öneri bulunamadı.' }, { status: 404 })

  const chapter = s.chapter as unknown as { id: string; project: { owner_id: string } }
  if (chapter.project.owner_id !== user.id)
    return NextResponse.json({ error: 'Öneriyi yalnızca proje sahibi değerlendirebilir.' }, { status: 403 })
  if (s.status !== 'pending')
    return NextResponse.json({ error: 'Bu öneri zaten değerlendirildi.' }, { status: 409 })

  if (decision === 'accepted') {
    const wordCount = countWords(s.content)
    const { error } = await admin.from('chapter_versions').insert({
      chapter_id: chapter.id,
      author_id: s.author_id,
      content: s.content,
      word_count: wordCount,
    })
    if (error) return NextResponse.json({ error: 'Yeni versiyon oluşturulamadı.' }, { status: 500 })
    await admin.from('chapters').update({ word_count: wordCount }).eq('id', chapter.id)
  }

  const { error: stErr } = await admin.from('chapter_suggestions').update({ status: decision }).eq('id', suggestionId)
  if (stErr) return NextResponse.json({ error: 'Öneri güncellenemedi.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}

function countWords(html: string | null): number {
  const text = (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
  return text ? text.split(/\s+/).length : 0
}
