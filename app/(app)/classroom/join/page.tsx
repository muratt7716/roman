'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Key, Sparkles, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function JoinClassroomPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length !== 6) {
      toast.error('Giriş kodu tam olarak 6 haneli olmalıdır!')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/classroom/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: cleanCode }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.already_member ? 'Zaten üyesin, sınıfa yönlendiriliyorsun! ⚡' : 'Sınıfa başarıyla katıldın! Hoş geldin 🚀')
        router.push(`/classroom/${data.classroom_id}`)
        router.refresh()
      } else {
        toast.error(data.error || 'Geçersiz sınıf kodu veya bağlantı sorunu.')
      }
    } catch (err) {
      toast.error('Sunucu bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(val: string) {
    // Only permit letters and numbers, restrict to max 6 chars
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
    setCode(cleaned)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-8 relative min-h-[70vh] flex flex-col justify-center">
      
      {/* Absolute background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back button */}
      <Link
        href="/classroom"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider relative z-10 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 text-sky-400" />
        Akademiye Dön
      </Link>

      <div className="space-y-3 text-center relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(14,165,233,0.15)] animate-pulse">
          <Key className="w-6 h-6 text-sky-400" />
        </div>
        <h1 className="text-3xl font-display font-black text-white tracking-tight">
          Portal Anahtarı 🔑
        </h1>
        <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          Öğretmeninin verdiği 6 haneli gizli katılım kodunu girerek sınıfa giriş yap.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-sky-500/20 space-y-6 relative z-10 shadow-[0_0_30px_rgba(14,165,233,0.05)] bg-slate-950/60 backdrop-blur-md">
        <div className="space-y-3">
          <label className="text-[10px] text-sky-400 font-bold uppercase tracking-widest block text-center">
            Giriş Kodu (6 Hane)
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Örn: AX7K2M"
            value={code}
            onChange={(e) => handleInputChange(e.target.value)}
            disabled={loading}
            className="w-full bg-black/45 border-2 border-slate-800 focus:border-sky-500 rounded-xl px-4 py-4 text-2xl font-display font-black tracking-[0.4em] text-center text-white focus:outline-none focus:ring-4 focus:ring-sky-500/15 transition-all placeholder:text-slate-700 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(14,165,233,0.25)] hover:shadow-[0_0_28px_rgba(14,165,233,0.5)] transition-all duration-300 disabled:opacity-40 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          <span>{loading ? 'Portal Açılıyor...' : 'Sınıfa Katıl'}</span>
        </button>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-white/[0.04] text-[10px] text-slate-500 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <p>
            Kod büyük/küçük harf duyarlı değildir. Yanlış kod girerseniz hata uyarısı alırsınız.
          </p>
        </div>
      </form>

    </div>
  )
}
