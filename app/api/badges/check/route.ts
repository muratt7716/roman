import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'

// POST /api/badges/check
// Checks all badge conditions for current user, awards any newly earned
// Returns: { newly_awarded: BadgeCode[] }
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const newlyAwarded = await checkAllBadges(supabase, user.id)
  return NextResponse.json({ newly_awarded: newlyAwarded })
}
