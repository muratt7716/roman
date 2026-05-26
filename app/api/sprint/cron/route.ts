import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel Cron: çalışır her gün 00:00 UTC
// Ertesi gün için TR saatleri: 10:00, 14:00, 21:00 (UTC: 07:00, 11:00, 18:00)
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })
  }

  const supabase = await createClient()

  // Ertesi günün sprintlerini oluştur
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const dateStr = tomorrow.toISOString().slice(0, 10)

  const hours = [7, 11, 18] // UTC (TR: 10, 14, 21)
  const labels = ['Sabah Sprinti ☀️', 'Öğle Sprinti 🌤️', 'Akşam Sprinti 🌙']
  const created: string[] = []

  for (let i = 0; i < hours.length; i++) {
    const starts_at = new Date(`${dateStr}T${String(hours[i]).padStart(2, '0')}:00:00Z`)
    const ends_at = new Date(starts_at.getTime() + 25 * 60 * 1000)

    const { data } = await supabase
      .from('writing_sprints')
      .insert({
        title: labels[i],
        duration_minutes: 25,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        status: 'scheduled',
        is_community: true,
      })
      .select('id')
      .single()

    if (data) {
      created.push(data.id)
    }
  }

  return NextResponse.json({ created })
}
