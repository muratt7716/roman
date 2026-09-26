'use client'

import { useState, useEffect, useRef } from 'react'
import { Timer, Play, Pause, RotateCcw, Coffee } from 'lucide-react'

type Phase = 'idle' | 'focus' | 'break'

const FOCUS_SECS = 25 * 60
const BREAK_SECS = 5 * 60

function notify(body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification('Kalem Birliği', { body })
  }
}

/**
 * Süre, saniye saymak yerine bitiş anından hesaplanır. İki sebep:
 *  - Arka plandaki sekmede tarayıcı setInterval'i dakikada bire kadar
 *    yavaşlatır; saniye sayan sayaç yazar başka sekmedeyken geri kalırdı.
 *  - Eski sürüm faz bitince interval'i durduruyor ama `running` true kaldığı
 *    için effect yeniden başlamıyordu: mola sayacı 5:00'te donuyordu.
 */
export function PomodoroTimer() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(FOCUS_SECS)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const phaseRef = useRef<Phase>('idle')
  const deadlineRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = Math.ceil((deadlineRef.current - Date.now()) / 1000)
      if (left > 0) { setSeconds(left); return }

      // Faz bitti — bir sonrakine geç, sayaç kesintisiz devam eder
      if (phaseRef.current === 'focus') {
        setSessions(s => s + 1)
        phaseRef.current = 'break'
        setPhase('break')
        deadlineRef.current = Date.now() + BREAK_SECS * 1000
        setSeconds(BREAK_SECS)
        notify('Mola zamanı! 5 dakika dinlen. ☕')
      } else {
        phaseRef.current = 'focus'
        setPhase('focus')
        deadlineRef.current = Date.now() + FOCUS_SECS * 1000
        setSeconds(FOCUS_SECS)
        notify('Odaklanma süresi başladı! ✍️')
      }
    }, 500)
    return () => clearInterval(id)
  }, [running])

  function start() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    if (phaseRef.current === 'idle') {
      phaseRef.current = 'focus'
      setPhase('focus')
    }
    // Duraklatılmışsa kalan süreden devam et
    deadlineRef.current = Date.now() + seconds * 1000
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
