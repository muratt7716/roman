'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, Sparkles, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function NewClassroomPage() {
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !schoolName.trim() || !password.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/classroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          school_name: schoolName.trim(),
          password: password.trim(),
          description: description.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Sınıf başarıyla oluşturuldu!')
        router.push(`/classroom/${data.classroom.id}`)
        router.refresh()
      } else {
        toast.error(data.error || 'Bir sorun oluştu.')
      }
    } catch {
      toast.error('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-slate-600 disabled:opacity-50"

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

      <Link
        href="/classroom"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4" />
        Sınıflara Dön
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-display font-black text-white flex items-center gap-2.5">
          <GraduationCap className="w-8 h-8 text-primary" />
          <span>Yeni Yazarlık Sınıfı</span>
        </h1>
        <p className="text-sm text-slate-400">
          Okul adı ve sınıf adını gir. Öğrenciler bu bilgilerle sınıfı arayıp bulacak, şifreyle katılacak.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-white/[0.05] space-y-6 relative overflow-hidden bg-gradient-to-br from-white/[0.01] to-transparent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Okul Adı *</label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            disabled={loading}
            placeholder="Örn: Atatürk Anadolu Lisesi"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sınıf Adı *</label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            placeholder="Örn: 10-B Türk Edebiyatı"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Katılım Şifresi *
            <span className="ml-2 normal-case font-normal text-slate-500">Öğrencilerle paylaşacağın şifre</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={3}
              maxLength={50}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Örn: edebiyat2025"
              className={inputClass + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Açıklama (Opsiyonel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={3}
            maxLength={500}
            placeholder="Sınıf hakkında kısa bilgi..."
            className={inputClass + ' resize-none'}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !schoolName.trim() || !password.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_28px_rgba(124,58,237,0.45)] transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Sınıf Kuruluyor...' : 'Sınıfı Oluştur'}</span>
        </button>
      </form>

    </div>
  )
}
