'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Sparkles, Calendar, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { use } from 'react'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ classroomId: string }>
}

export default function NewAssignmentPage({ params }: PageProps) {
  const { classroomId } = use(params)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'class_visible'>('private')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/${classroomId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          visibility,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Ödev başarıyla atandı! 📝')
        router.push(`/classroom/${classroomId}`)
        router.refresh()
      } else {
        toast.error(data.error || 'Ödev oluşturulamadı.')
      }
    } catch (err) {
      toast.error('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      
      {/* Back button */}
      <Link
        href={`/classroom/${classroomId}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Sınıf Paneline Dön
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-display font-black text-white flex items-center gap-2.5">
          <BookOpen className="w-8 h-8 text-primary" />
          <span>Yeni Ödev Ata</span>
        </h1>
        <p className="text-sm text-slate-400">
          Öğrenciler için yazma ödevi konusu, açıklaması, son teslim tarihi ve sınıf görünürlüğünü belirle.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-white/[0.05] space-y-6 relative overflow-hidden bg-gradient-to-br from-white/[0.01] to-transparent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ödev Başlığı *</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            placeholder="Örn: İlkbahar Rüzgarları Altında Bir Buluşma"
            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-slate-600 disabled:opacity-50"
          />
        </div>

        {/* Description / Instructions */}
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Yazma Yönergesi & Konu Detayları</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={6}
            maxLength={2000}
            placeholder="Öğrencilere yazma konusu hakkında ipuçları, aranan kelimeler veya kurgu yönlendirmeleri ver..."
            className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none transition-all placeholder:text-slate-600 disabled:opacity-50"
          />
        </div>

        {/* Date and Visibility Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Due date */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              Son Teslim Tarihi (Opsiyonel)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-slate-600 disabled:opacity-50 color-scheme-dark"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Gönderi Görünürlük Ayarı</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={loading}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                  visibility === 'private'
                    ? "bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.05)]"
                    : "bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-slate-300"
                )}
              >
                <EyeOff className="w-4 h-4" />
                Sadece Ben (Gizli)
              </button>
              
              <button
                type="button"
                onClick={() => setVisibility('class_visible')}
                disabled={loading}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                  visibility === 'class_visible'
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.05)]"
                    : "bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-slate-300"
                )}
              >
                <Eye className="w-4 h-4" />
                Tüm Sınıf Görsün
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(124,58,237,0.2)] hover:shadow-[0_0_28px_rgba(124,58,237,0.45)] transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer animate-pulse-subtle"
        >
          <Sparkles className="w-4.5 h-4.5" />
          <span>{loading ? 'Ödev Atanıyor...' : 'Görevi Sınıfa Gönder'}</span>
        </button>
      </form>

    </div>
  )
}
