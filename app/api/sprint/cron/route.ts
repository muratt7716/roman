import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Vercel Cron — her gün 00:00 UTC (vercel.json), ertesi günün 3 topluluk sprintini açar.
 * TR saatleri 10:00, 14:00, 21:00 (UTC 07:00, 11:00, 18:00).
 *
 * 29 Eyl 2026'ya kadar HİÇ çalışmadı: rota POST + `x-cron-secret` bekliyordu, Vercel
 * Cron ise GET + `Authorization: Bearer <CRON_SECRET>` gönderir → her çağrı 405.
 * Ayrıca oturumsuz istemciyle yazıyordu (RLS'e takılırdı). Canlıda bir tane bile
 * topluluk sprinti oluşmamıştı.
 *
 * CRON_SECRET Vercel ortam değişkenlerinde tanımlı olmalı; Vercel onu bu başlıkla yollar.
 */
const SLOTS = [
  { hourUtc: 7, title: 'Sabah Sprinti ☀️' },
  { hourUtc: 11, title: 'Öğle Sprinti 🌤️' },
  { hourUtc: 18, title: 'Akşam Sprinti 🌙' },
]

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const dateStr = tomorrow.toISOString().slice(0, 10)

  const created: string[] = []
  const skipped: string[] = []
  for (const slot of SLOTS) {
    const starts_at = new Date(`${dateStr}T${String(slot.hourUtc).padStart(2, '0')}:00:00Z`).toISOString()

    // Cron yeniden denenirse (Vercel bunu yapabilir) aynı sprinti ikinci kez açma
    const { data: existing } = await admin
      .from('writing_sprints')
      .select('id')
      .eq('is_community', true)
      .eq('starts_at', starts_at)
      .maybeSingle()
    if (existing) { skipped.push(existing.id); continue }

    const { data, error } = await admin
      .from('writing_sprints')
      .insert({
        title: slot.title,
        duration_minutes: 25,
        starts_at,
        ends_at: new Date(new Date(starts_at).getTime() + 25 * 60 * 1000).toISOString(),
        status: 'scheduled',
        is_community: true,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message, created }, { status: 500 })
    created.push(data.id)
  }

  return NextResponse.json({ created, skipped })
}
