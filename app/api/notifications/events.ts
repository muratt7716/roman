import { createClient } from '@/lib/supabase/server'
import type { NotificationRow } from '@/lib/notifications'

/**
 * Tarayıcıdan tetiklenen bildirim olayları.
 *
 * Tasarım kuralı: istemci yalnızca OLAYIN KİMLİĞİNİ gönderir (suggestion_id,
 * invite_id, chapter_id...). Alıcıyı da metni de sunucu, o kimliğin işaret
 * ettiği satırdan türetir. Sebebi: istemci alıcı listesi veya payload
 * gönderebilseydi, "X seni projeye davet etti" diyen sahte bir bildirim
 * üretebilirdi — bildirim kartları tıklanabilir ve davet kabul butonu taşıyor.
 *
 * Her olay, çağıranın o olayla gerçekten ilişkili olduğunu DB'den doğrular.
 * Doğrulanamayan her şey null döner ve endpoint 403 verir.
 */

type Supa = Awaited<ReturnType<typeof createClient>>

export interface EventResult {
  rows: NotificationRow[]
  /** Yetki reddi sebebi — doluysa endpoint 403 döner */
  denied?: string
}

async function profileOf(supabase: Supa, id: string) {
  const { data } = await supabase.from('profiles').select('username, display_name').eq('id', id).single()
  return data
}

/** Projenin sahibi + üyeleri (çağıran hariç) */
async function projectAudience(supabase: Supa, projectId: string, exceptUserId: string) {
  const [{ data: project }, { data: members }] = await Promise.all([
    supabase.from('projects').select('owner_id, title').eq('id', projectId).single(),
    supabase.from('project_members').select('user_id').eq('project_id', projectId),
  ])
  const ids = new Set<string>()
  if (project?.owner_id) ids.add(project.owner_id)
  for (const m of members ?? []) if (m.user_id) ids.add(m.user_id as string)
  ids.delete(exceptUserId)
  return { project, recipients: [...ids] }
}

/** Çağıran bu projenin sahibi ya da üyesi mi? */
async function isProjectInsider(supabase: Supa, projectId: string, userId: string) {
  const [{ data: project }, { data: membership }] = await Promise.all([
    supabase.from('projects').select('owner_id').eq('id', projectId).single(),
    supabase.from('project_members').select('user_id').eq('project_id', projectId).eq('user_id', userId).maybeSingle(),
  ])
  return project?.owner_id === userId || !!membership
}

// ── comment ────────────────────────────────────────────────────────────────
// Girdi: chapter_id, preview. Alıcılar: projedeki diğer herkes.
async function commentEvent(supabase: Supa, userId: string, body: Record<string, unknown>): Promise<EventResult> {
  const chapterId = String(body.chapter_id ?? '')
  const preview = String(body.preview ?? '').slice(0, 100)
  if (!chapterId) return { rows: [], denied: 'chapter_id gerekli' }

  const { data: chapter } = await supabase.from('chapters').select('id, project_id').eq('id', chapterId).single()
  if (!chapter) return { rows: [], denied: 'Bölüm bulunamadı' }
  if (!(await isProjectInsider(supabase, chapter.project_id, userId))) {
    return { rows: [], denied: 'Bu projede yorum yapamazsın' }
  }

  const [{ recipients }, me] = await Promise.all([
    projectAudience(supabase, chapter.project_id, userId),
    profileOf(supabase, userId),
  ])

  return {
    rows: recipients.map(uid => ({
      user_id: uid,
      type: 'comment',
      payload: {
        project_id: chapter.project_id,
        chapter_id: chapterId,
        commenter_username: me?.username,
        commenter_display_name: me?.display_name,
        preview,
      },
    })),
  }
}

// ── suggestion ─────────────────────────────────────────────────────────────
// Girdi: suggestion_id. Alıcı: bölümü yazan + proje sahibi.
async function suggestionEvent(supabase: Supa, userId: string, body: Record<string, unknown>): Promise<EventResult> {
  const suggestionId = String(body.suggestion_id ?? '')
  if (!suggestionId) return { rows: [], denied: 'suggestion_id gerekli' }

  const { data: suggestion } = await supabase
    .from('chapter_suggestions')
    .select('id, author_id, note, chapter_id')
    .eq('id', suggestionId)
    .single()
  if (!suggestion) return { rows: [], denied: 'Öneri bulunamadı' }
  if (suggestion.author_id !== userId) return { rows: [], denied: 'Bu öneri senin değil' }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, title, project_id, created_by')
    .eq('id', suggestion.chapter_id)
    .single()
  if (!chapter) return { rows: [], denied: 'Bölüm bulunamadı' }

  const { data: project } = await supabase.from('projects').select('owner_id').eq('id', chapter.project_id).single()
  const me = await profileOf(supabase, userId)

  const ids = new Set<string>()
  if (chapter.created_by) ids.add(chapter.created_by)
  if (project?.owner_id) ids.add(project.owner_id)
  ids.delete(userId)

  return {
    rows: [...ids].map(uid => ({
      user_id: uid,
      type: 'suggestion',
      payload: {
        suggestion_id: suggestionId,
        chapter_id: chapter.id,
        chapter_title: chapter.title,
        project_id: chapter.project_id,
        suggester_username: me?.username,
        suggester_display_name: me?.display_name,
        note: suggestion.note,
      },
    })),
  }
}

// ── suggestion_reviewed ────────────────────────────────────────────────────
// Girdi: suggestion_id + decision. Alıcı: öneriyi gönderen. Yetki: proje sahibi.
async function suggestionReviewedEvent(supabase: Supa, userId: string, body: Record<string, unknown>): Promise<EventResult> {
  const suggestionId = String(body.suggestion_id ?? '')
  const decision = body.decision === 'rejected' ? 'rejected' : 'accepted'
  if (!suggestionId) return { rows: [], denied: 'suggestion_id gerekli' }

  const { data: suggestion } = await supabase
    .from('chapter_suggestions')
    .select('id, author_id, chapter_id')
    .eq('id', suggestionId)
    .single()
  if (!suggestion) return { rows: [], denied: 'Öneri bulunamadı' }

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, title, project_id')
    .eq('id', suggestion.chapter_id)
    .single()
  if (!chapter) return { rows: [], denied: 'Bölüm bulunamadı' }

  const { data: project } = await supabase.from('projects').select('owner_id').eq('id', chapter.project_id).single()
  if (project?.owner_id !== userId) return { rows: [], denied: 'Öneriyi yalnızca proje sahibi değerlendirebilir' }
  if (suggestion.author_id === userId) return { rows: [] }

  return {
    rows: [{
      user_id: suggestion.author_id,
      type: decision === 'accepted' ? 'acceptance' : 'rejection',
      payload: {
        chapter_id: chapter.id,
        chapter_title: chapter.title,
        project_id: chapter.project_id,
        context: decision === 'accepted' ? 'suggestion_accepted' : 'suggestion_rejected',
      },
    }],
  }
}

// ── invite ─────────────────────────────────────────────────────────────────
// Girdi: invite_id. Alıcı: davet edilen. Yetki: daveti gönderen proje sahibi.
async function inviteEvent(supabase: Supa, userId: string, body: Record<string, unknown>): Promise<EventResult> {
  const inviteId = String(body.invite_id ?? '')
  if (!inviteId) return { rows: [], denied: 'invite_id gerekli' }

  const { data: invite } = await supabase
    .from('project_invites')
    .select('id, project_id, inviter_id, invitee_id, role_id')
    .eq('id', inviteId)
    .single()
  if (!invite) return { rows: [], denied: 'Davet bulunamadı' }
  if (invite.inviter_id !== userId) return { rows: [], denied: 'Bu daveti sen göndermedin' }

  const [{ data: project }, { data: role }, me] = await Promise.all([
    supabase.from('projects').select('id, title, owner_id').eq('id', invite.project_id).single(),
    supabase.from('project_roles').select('name').eq('id', invite.role_id).single(),
    profileOf(supabase, userId),
  ])
  if (project?.owner_id !== userId) return { rows: [], denied: 'Yalnızca proje sahibi davet edebilir' }

  return {
    rows: [{
      user_id: invite.invitee_id,
      type: 'invite',
      payload: {
        invite_id: invite.id,
        project_id: invite.project_id,
        project_title: project?.title,
        role_name: role?.name,
        inviter_username: me?.username,
        inviter_display_name: me?.display_name,
      },
    }],
  }
}

// ── application ────────────────────────────────────────────────────────────
// Girdi: application_id. Alıcı: proje sahibi. Yetki: başvuran.
async function applicationEvent(supabase: Supa, userId: string, body: Record<string, unknown>): Promise<EventResult> {
  const applicationId = String(body.application_id ?? '')
  if (!applicationId) return { rows: [], denied: 'application_id gerekli' }

  const { data: application } = await supabase
    .from('applications')
    .select('id, project_id, applicant_id, role_id')
    .eq('id', applicationId)
    .single()
  if (!application) return { rows: [], denied: 'Başvuru bulunamadı' }
  if (application.applicant_id !== userId) return { rows: [], denied: 'Bu başvuru senin değil' }

  const [{ data: project }, { data: role }, me] = await Promise.all([
    supabase.from('projects').select('id, title, owner_id').eq('id', application.project_id).single(),
    supabase.from('project_roles').select('name').eq('id', application.role_id).single(),
    profileOf(supabase, userId),
  ])
  if (!project?.owner_id || project.owner_id === userId) return { rows: [] }

  return {
    rows: [{
      user_id: project.owner_id,
      type: 'application',
      payload: {
        project_id: project.id,
        project_title: project.title,
        applicant_id: userId,
        applicant_username: me?.username,
        role_name: role?.name,
      },
    }],
  }
}

const HANDLERS: Record<string, (s: Supa, u: string, b: Record<string, unknown>) => Promise<EventResult>> = {
  comment: commentEvent,
  suggestion: suggestionEvent,
  suggestion_reviewed: suggestionReviewedEvent,
  invite: inviteEvent,
  application: applicationEvent,
}

export async function buildEventNotifications(
  supabase: Supa,
  userId: string,
  body: Record<string, unknown>
): Promise<EventResult> {
  const handler = HANDLERS[String(body.event ?? '')]
  if (!handler) return { rows: [], denied: 'Bilinmeyen olay' }
  return handler(supabase, userId, body)
}
