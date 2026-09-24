import { NextResponse } from 'next/server'

// GEÇİCİ TANI UCU — 24 Eyl 2026. Vercel'de SUPABASE_SERVICE_ROLE_KEY eklendiği
// hâlde runtime'ın onu görmemesi araştırılıyor. Sır DÖNMEZ: yalnızca değişkenin
// var olup olmadığı, uzunluğu ve ilk/son birkaç karakteri.
// Teşhis biter bitmez bu dosya silinecek.
export const dynamic = 'force-dynamic'

function probe(name: string) {
  const v = process.env[name]
  if (v === undefined) return { durum: 'TANIMSIZ' }
  if (v === '') return { durum: 'BOŞ' }
  return {
    durum: 'VAR',
    uzunluk: v.length,
    bas: v.slice(0, 6),
    son: v.slice(-4),
    bosluk_var_mi: v !== v.trim(),
    tirnak_var_mi: /^["']|["']$/.test(v),
  }
}

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: probe('NEXT_PUBLIC_SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: probe('SUPABASE_SERVICE_ROLE_KEY'),
    GEMINI_API_KEY: probe('GEMINI_API_KEY').durum,
    CRON_SECRET: probe('CRON_SECRET').durum,
    vercel_ortam: process.env.VERCEL_ENV ?? 'yok',
    deploy_id: process.env.VERCEL_DEPLOYMENT_ID?.slice(-8) ?? 'yok',
  })
}
