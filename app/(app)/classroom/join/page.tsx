'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, School, Lock, Users, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ClassroomResult {
  id: string
  name: string
  school_name: string
  member_count: number
}

type Step = 'search' | 'select' | 'password'

export default function JoinClassroomPage() {
  const [step, setStep] = useState<Step>('search')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [results, setResults] = useState<ClassroomResult[]>([])
  const [selected, setSelected] = useState<ClassroomResult | null>(null)
  const [password, setPassword] = useState('')
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState(false)
  const router = useRouter()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (schoolQuery.trim().length < 2) return
    setSearching(true)
    try {
      const params = new URLSearchParams({ school: schoolQuery.trim() })
      if (nameQuery.trim()) params.set('name', nameQuery.trim())
      const res = await fetch(`/api/classroom/join?${params}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setResults(data.classrooms ?? [])
      setStep('select')
    } catch {
      toast.error('Bağlantı hatası.')
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(cls: ClassroomResult) {
    setSelected(cls)
    setPassword('')
    setStep('password')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !password.trim()) return
    setJoining(true)
    try {
      const res = await fetch('/api/classroom/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: selected.id, password: password.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.already_member ? 'Zaten bu sınıftasın!' : 'Sınıfa katıldın!')
        router.push(`/classroom/${data.classroom_id}`)
        router.refresh()
      } else {
        toast.error(data.error || 'Şifre yanlış.')
      }
    } catch {
      toast.error('Bağlantı hatası.')
    } finally {
      setJoining(false)
    }
  }

  const inputClass = "w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-slate-600 disabled:opacity-50"

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-8">

      <Link href="/classroom" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" />
        Akademiye Dön
      </Link>

      {/* Adım göstergesi */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {(['search', 'select', 'password'] as Step[]).map((s, i) => (
          <>
            <span key={s} className={step === s ? 'text-primary font-semibold' : 'text-slate-500'}>
              {i + 1}. {s === 'search' ? 'Ara' : s === 'select' ? 'Sınıf Seç' : 'Şifre Gir'}
            </span>
            {i < 2 && <ChevronRight key={s + '-arrow'} className="w-3 h-3" />}
          </>
        ))}
      </div>

      {/* Adım 1: Arama */}
      {step === 'search' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
              <School className="w-6 h-6 text-primary" />
              Sınıfını Bul
            </h1>
            <p className="text-sm text-slate-400">Okulunun adını yazarak sınıfını ara.</p>
          </div>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Okul Adı *</label>
              <input
                type="text"
                required
                minLength={2}
                autoFocus
                value={schoolQuery}
                onChange={(e) => setSchoolQuery(e.target.value)}
                placeholder="Örn: Atatürk Anadolu"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sınıf Adı (Opsiyonel)</label>
              <input
                type="text"
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Örn: 10-B Edebiyat"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={searching || schoolQuery.trim().length < 2}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? 'Aranıyor...' : 'Sınıfları Ara'}
            </button>
          </form>
        </div>
      )}

      {/* Adım 2: Sınıf seçimi */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-white">
              {results.length > 0 ? `${results.length} sınıf bulundu` : 'Sınıf bulunamadı'}
            </h2>
            <button onClick={() => setStep('search')} className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Tekrar Ara
            </button>
          </div>
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <School className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm">Bu okulda kayıtlı sınıf bulunamadı.</p>
              <p className="text-xs">Okul adını tam yazdığından emin ol.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleSelect(cls)}
                  className="w-full text-left p-4 rounded-xl border border-white/[0.06] hover:border-primary/40 bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{cls.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{cls.school_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        {cls.member_count}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Adım 3: Şifre */}
      {step === 'password' && selected && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Şifre Gir
            </h2>
            <p className="text-sm text-slate-400">
              <span className="text-white font-medium">{selected.name}</span>
              <span className="text-slate-500"> · {selected.school_name}</span>
            </p>
          </div>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Katılım Şifresi</label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Öğretmeninin verdiği şifre"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={joining || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {joining ? 'Katılınıyor...' : 'Sınıfa Katıl'}
            </button>
            <button type="button" onClick={() => setStep('select')} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-2">
              ← Farklı sınıf seç
            </button>
          </form>
        </div>
      )}

    </div>
  )
}
