'use client'

import { useEffect, useRef, useState } from 'react'
import { Music, X, Volume2, VolumeX } from 'lucide-react'

// SomaFM — free, public, no auth required
const CATEGORIES = [
  {
    label: '🌿 Lofi / Ambient',
    stations: [
      { name: 'Groove Salad',    url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
      { name: 'Lush',            url: 'https://ice1.somafm.com/lush-128-mp3' },
      { name: 'Drone Zone',      url: 'https://ice1.somafm.com/dronezone-128-mp3' },
      { name: 'Deep Space One',  url: 'https://ice1.somafm.com/deepspaceone-128-mp3' },
      { name: 'Digitalis',       url: 'https://ice1.somafm.com/digitalis-128-mp3' },
    ],
  },
  {
    label: '🎷 Jazz / Lounge',
    stations: [
      { name: 'Secret Agent',           url: 'https://ice1.somafm.com/secretagent-128-mp3' },
      { name: 'Illinois Street Lounge', url: 'https://ice1.somafm.com/illstreet-128-mp3' },
      { name: 'Left Coast 70s',         url: 'https://ice1.somafm.com/seventies-128-mp3' },
      { name: 'Folk Forward',           url: 'https://ice1.somafm.com/folkfwd-128-mp3' },
    ],
  },
  {
    label: '⚡ Electronic / Beat',
    stations: [
      { name: 'Beat Blender',    url: 'https://ice1.somafm.com/beatblender-128-mp3' },
      { name: 'Cliqhop IDM',    url: 'https://ice1.somafm.com/cliqhop-128-mp3' },
      { name: 'Fluid',          url: 'https://ice1.somafm.com/fluid-128-mp3' },
      { name: 'The Trip',       url: 'https://ice1.somafm.com/thetrip-128-mp3' },
    ],
  },
  {
    label: '🌌 Space / Chill',
    stations: [
      { name: 'Space Station Soma', url: 'https://ice1.somafm.com/spacestation-128-mp3' },
      { name: 'Suburbs of Goa',     url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3' },
      { name: 'Indie Pop Rocks',    url: 'https://ice1.somafm.com/indiepop-128-mp3' },
    ],
  },
]

// Flat list for index-based playback
const STATIONS = CATEGORIES.flatMap(c => c.stations)

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
        <div className="glass-strong rounded-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-60 animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
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

          {/* Station list — scrollable */}
          <div className="max-h-72 overflow-y-auto px-2 py-2 space-y-3">
            {CATEGORIES.map(cat => {
              const catOffset = STATIONS.indexOf(cat.stations[0])
              return (
                <div key={cat.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">{cat.label}</p>
                  <div className="space-y-0.5">
                    {cat.stations.map((s, j) => {
                      const idx = catOffset + j
                      const isActive = activeIdx === idx
                      return (
                        <button
                          key={idx}
                          onClick={() => select(idx)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                            isActive
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="text-[10px] w-3 shrink-0">
                            {isActive ? (loading ? '…' : '▶') : '○'}
                          </span>
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-muted-foreground/50 px-4 py-2 border-t border-white/[0.06]">SomaFM — ücretsiz internet radyosu</p>
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
