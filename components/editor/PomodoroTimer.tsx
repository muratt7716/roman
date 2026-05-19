'use client'

import { useState, useEffect, useRef } from 'react'
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react'

type Phase = 'idle' | 'focus' | 'break'

const FOCUS_SECS = 25 * 60
const BREAK_SECS = 5 * 60

export function PomodoroTimer() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(FOCUS_SECS)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const phaseRef = useRef<Phase>('idle')
  const sessionsRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSeconds(prev => {
        if (prev > 1) return prev - 1
        clearInterval(id)
        setTimeout(() => handlePhaseComplete(), 0)
        return 0
      })
    }, 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function handlePhaseComplete() {
    if (phaseRef.current === 'focus') {
      sessionsRef.current += 1
      setSessions(sessionsRef.current)
      phaseRef.current = 'break'
      setPhase('break')
      setSeconds(BREAK_SECS)
      notify('Mola zamanı! 5 dakika dinlen. ☕')
    } else {
      phaseRef.current = 'focus'
      setPhase('focus')
      setSeconds(FOCUS_SECS)
      notify('Odaklanma süresi başladı! ✍️')
    }
  }

  function notify(body: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification('Kalem Birliği', { body })
    }
  }

  function start() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    if (phaseRef.current === 'idle') {
      phaseRef.current = 'focus'
      setPhase('focus')
    }
    setRunning(true)
  }

  function pause() { setRunning(false) }

  function reset() {
    setRunning(false)
    phaseRef.current = 'idle'
    setPhase('idle')
    setSeconds(FOCUS_SECS)
  }

  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')

  return (
    <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs transition-colors ${
      phase === 'focus'
        ? 'border-primary/40 bg-primary/10 text-primary'
        : phase === 'break'
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
        : 'border-border text-muted-foreground hover:text-foreground hover:border-white/20'
    }`}>
      {phase === 'break'
        ? <Coffee className="w-3.5 h-3.5 shrink-0" />
        : <Timer className="w-3.5 h-3.5 shrink-0" />
      }

      {phase !== 'idle' && (
        <span className="tabular-nums font-medium w-9 text-center">{mins}:{secs}</span>
      )}

      {!running ? (
        <button
          onClick={start}
          className="hover:opacity-80 transition-opacity"
          title={phase !== 'idle' ? 'Devam et' : 'Pomodoro başlat (25 dk)'}
        >
          <Play className="w-3 h-3" />
        </button>
      ) : (
        <button onClick={pause} className="hover:opacity-80 transition-opacity" title="Duraklat">
          <Pause className="w-3 h-3" />
        </button>
      )}

      {phase !== 'idle' && (
        <button onClick={reset} className="hover:opacity-80 transition-opacity" title="Sıfırla">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}

      {sessions > 0 && (
        <span className="text-[10px] opacity-60 ml-0.5">{sessions}×</span>
      )}
    </div>
  )
}
