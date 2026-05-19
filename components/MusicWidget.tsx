'use client'

import { useEffect, useRef, useState } from 'react'
import { Music, X, Volume2, VolumeX } from 'lucide-react'

// SomaFM — free, public, no auth required
const STATIONS = [
  { name: 'Groove Salad (Ambient)', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
  { name: 'Drone Zone (Dark)', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
  { name: 'Deep Space One', url: 'https://ice1.somafm.com/deepspaceone-128-mp3' },
  { name: 'Lush (Easy Listening)', url: 'https://ice1.somafm.com/lush-128-mp3' },
]

export function MusicWidget() {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (activeIdx === null) {
      audioRef.current?.pause()
      audioRef.current = null
      return
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setLoading(true)
    const audio = new Audio(STATIONS[activeIdx].url)
    audio.volume = muted ? 0 : 0.5
    audio.oncanplay = () => setLoading(false)
    audio.onerror = () => setLoading(false)
    audio.play().catch(() => setLoading(false))
    audioRef.current = audio

    return () => {
      audio.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : 0.5
  }, [muted])

  function select(idx: number) {
    setActiveIdx(prev => (prev === idx ? null : idx))
  }

  const playing = activeIdx !== null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="glass-strong rounded-xl p-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-56 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Fon Müziği</span>
            </div>
            <div className="flex items-center gap-1">
              {playing && (
                <button
                  onClick={() => setMuted(v => !v)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title={muted ? 'Sesi aç' : 'Sesi kapat'}
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {STATIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => select(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                  activeIdx === i
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-[10px] w-3 shrink-0">
                  {activeIdx === i ? (loading ? '…' : '▶') : '○'}
                </span>
                {s.name}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/60">SomaFM — ücretsiz internet radyosu</p>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        title={playing ? 'Müzik çalıyor — ayarlar' : 'Fon müziği'}
        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
          playing
            ? 'bg-primary text-white shadow-[0_0_16px_rgba(124,58,237,0.4)]'
            : 'glass border border-white/15 text-muted-foreground hover:text-foreground hover:border-white/25'
        }`}
      >
        <Music className="w-4 h-4" />
      </button>
    </div>
  )
}
