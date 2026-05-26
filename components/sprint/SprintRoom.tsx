'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, PenLine, CheckCircle2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SprintLeaderboard } from './SprintLeaderboard'
import { cn } from '@/lib/utils'
import type { WritingSprint, SprintParticipant } from '@/types'

interface Props {
  sprint: WritingSprint
  initialParticipants: SprintParticipant[]
  currentUserId: string
  isJoined: boolean
  userProjects: { id: string; title: string; defaultChapterId?: string }[]
}

export function SprintRoom({ sprint, initialParticipants, currentUserId, isJoined: isJoinedProp, userProjects }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const endTime   = new Date(sprint.ends_at).getTime()
  const startTime = new Date(sprint.starts_at).getTime()
  const nowMs     = Date.now()
  const isActiveNow   = nowMs >= startTime && nowMs < endTime
  const isFinishedNow = nowMs >= endTime

  const [timeLeft, setTimeLeft]           = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)))
  const [participants, setParticipants]   = useState<SprintParticipant[]>(initialParticipants)
  const [joined, setJoined]               = useState(isJoinedProp)
  const [joining, setJoining]             = useState(false)
  const [finished, setFinished]           = useState(isFinishedNow)
  const [wordCount, setWordCount]         = useState(0)
  const [submitting, setSubmitting]       = useState(false)
  const [done, setDone]                   = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(userProjects[0]?.id ?? '')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    if (finished) return
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        setFinished(true)
        clearInterval(timerRef.current!)
      }
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [endTime, finished])

  // Realtime participant count
  useEffect(() => {
    const channel = supabase
      .channel(`sprint:${sprint.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sprint_participants',
        filter: `sprint_id=eq.${sprint.id}`,
      }, () => {
        supabase
          .from('sprint_participants')
          .select('*, profile:profiles(id, username, display_name, avatar_url)')
          .eq('sprint_id', sprint.id)
          .then(({ data }) => { if (data) setParticipants(data as SprintParticipant[]) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprint.id])

  async function handleJoin() {
    setJoining(true)
    const res = await fetch(`/api/sprint/${sprint.id}/join`, { method: 'POST' })
    if (res.ok) setJoined(true)
    setJoining(false)
  }

  async function handleFinish() {
    setSubmitting(true)
    const res = await fetch(`/api/sprint/${sprint.id}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_count: wordCount }),
    })
    if (res.ok) {
      setDone(true)
      router.refresh()
    }
    setSubmitting(false)
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  const selectedProject = userProjects.find(p => p.id === selectedProjectId)
  const editorHref = selectedProject?.defaultChapterId
    ? `/projects/${selectedProjectId}/write/${selectedProject.defaultChapterId}`
    : `/projects/${selectedProjectId}/write`

  if (done || (isFinishedNow && !joined)) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 border border-white/[0.05] text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-white font-bold text-lg">Sprint Bitti!</p>
          <p className="text-slate-400 text-sm">{wordCount > 0 ? `${wordCount} kelime yazdın 🔥` : 'Sprint sona erdi.'}</p>
        </div>
        <SprintLeaderboard participants={participants} currentUserId={currentUserId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className={cn(
        'glass-card rounded-2xl p-8 border text-center space-y-4',
        isActiveNow ? 'border-violet-500/30 shadow-[0_0_30px_rgba(124,58,237,0.1)]' : 'border-white/[0.05]'
      )}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{sprint.title}</p>
        <div className="font-display text-7xl font-black text-white tracking-tight tabular-nums">
          {isActiveNow
            ? `${mins}:${secs}`
            : isFinishedNow
            ? '00:00'
            : new Date(sprint.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
          <Users className="w-3.5 h-3.5" />
          {participants.length} katılımcı yazıyor
        </p>
      </div>

      {/* Henüz başlamadı */}
      {!isActiveNow && !isFinishedNow && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.05] text-center text-sm text-slate-400">
          Sprint {new Date(sprint.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} tarihinde başlıyor.
          {!joined && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-3 block mx-auto px-5 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {joining ? 'Katılınıyor…' : 'Şimdiden Katıl'}
            </button>
          )}
        </div>
      )}

      {/* Aktif sprint */}
      {isActiveNow && (
        <div className="space-y-4">
          {!joined ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              {joining ? 'Katılınıyor…' : 'Sprinte Katıl!'}
            </button>
          ) : (
            <div className="glass-card rounded-xl p-4 border border-emerald-500/20 space-y-4">
              <p className="text-sm text-emerald-400 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Katıldın! Şimdi yaz.
              </p>

              {userProjects.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Proje Seç</label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    {userProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <a
                href={editorHref}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.07] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.12] transition-colors cursor-pointer"
              >
                <PenLine className="w-4 h-4 text-primary" /> Editöre Git →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Sprint bitti, kelime gir */}
      {finished && joined && !done && (
        <div className="glass-card rounded-2xl p-6 border border-amber-500/20 space-y-4">
          <p className="text-amber-400 font-bold text-sm">⏰ Sprint bitti! Kaç kelime yazdın?</p>
          <input
            type="number"
            min={0}
            value={wordCount}
            onChange={e => setWordCount(Number(e.target.value))}
            placeholder="Kelime sayısı"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleFinish}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Kaydediliyor…' : 'Sonucu Kaydet'}
          </button>
        </div>
      )}

      {/* Sıralama (aktifken de göster) */}
      {participants.some(p => p.finished_at) && (
        <SprintLeaderboard participants={participants} currentUserId={currentUserId} />
      )}
    </div>
  )
}
