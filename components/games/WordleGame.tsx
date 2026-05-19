'use client'

import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Tam Türkçe karakter desteğiyle 5 harfli kelimeler
const WORDS = [
  'KALEM', 'ROMAN', 'SAYFA', 'YAZAR', 'MASAL', 'HAYAL', 'BULUT', 'DENİZ',
  'SABAH', 'ORMAN', 'KONAK', 'ALTIN', 'ASLAN', 'KUZEY', 'GÜNEY', 'MUTLU',
  'CESUR', 'KORKU', 'NEHİR', 'DEMİR', 'YOLCU', 'BALIK', 'ERKEK', 'BEBEK',
  'KADIN', 'ÇOCUK', 'GÜNEŞ', 'ÇİÇEK', 'ŞAFAK', 'ŞEHİR', 'ÖZLEM', 'DUMAN',
  'TARAF', 'HAPİS', 'KADER', 'SEFER', 'BEDEN', 'NİYET', 'GÜÇLÜ', 'YÜREK',
  'DÜNYA', 'BOĞAZ', 'KÖPRÜ', 'KANAT', 'ÜZGÜN', 'ÖZGÜR', 'KAVGA', 'KANUN',
  'SILAH', 'SABIR', 'DEVİR', 'KALIP', 'YILAN', 'KILIÇ', 'ÇELIK', 'TAKIN',
  'KARGI', 'SOLUK', 'DÖNEM', 'ÖZÜM', 'YENIK', 'AKILI', 'SARAY', 'BÜYÜK',
  'KÜÇÜK', 'UZAKTA', 'YAKIN', 'DERIN', 'YÜZME', 'KOŞMA', 'OKUMA', 'YAZMA',
].filter(w => [...w].length === 5) // spread to correctly count multi-byte Turkish chars

type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'tbd'

function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

function getDailyWord(): string {
  const start = new Date('2026-01-01').getTime()
  const now = new Date().setHours(0, 0, 0, 0)
  const dayIndex = Math.floor((now - start) / 86400000)
  return WORDS[dayIndex % WORDS.length]
}

function evaluate(guess: string, answer: string): LetterState[] {
  const gChars = [...guess]
  const aChars = [...answer]
  const result: LetterState[] = Array(5).fill('absent')

  // Pass 1: correct
  gChars.forEach((ch, i) => {
    if (ch === aChars[i]) {
      result[i] = 'correct'
      aChars[i] = '#'
      gChars[i] = '*'
    }
  })

  // Pass 2: present
  gChars.forEach((ch, i) => {
    if (result[i] !== 'correct') {
      const idx = aChars.indexOf(ch)
      if (idx !== -1) {
        result[i] = 'present'
        aChars[idx] = '#'
      }
    }
  })

  return result
}

const STATE_COLORS: Record<LetterState, string> = {
  correct: 'bg-emerald-500 border-emerald-500 text-white',
  present: 'bg-amber-500 border-amber-500 text-white',
  absent: 'bg-surface-2 border-surface-2 text-muted-foreground',
  empty: 'border-border',
  tbd: 'border-primary/50',
}

// Tüm geçerli Türkçe harfler
const VALID_CHARS = new Set([
  'A','B','C','Ç','D','E','F','G','Ğ','H','I','İ','J','K','L','M',
  'N','O','Ö','P','R','S','Ş','T','U','Ü','V','Y','Z',
])

const KEYBOARD_ROWS = [
  ['E','R','T','Y','U','I','İ','O','P','Ğ','Ü'],
  ['A','S','D','F','G','H','J','K','L','Ş'],
  ['ENTER','Z','C','V','B','N','M','Ö','Ç','SİL'],
]

export function WordleGame() {
  const [answer, setAnswer] = useState(getDailyWord)
  const [guesses, setGuesses] = useState<string[]>([])
  const [evaluations, setEvaluations] = useState<LetterState[][]>([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [shake, setShake] = useState(false)
  const [isDaily, setIsDaily] = useState(true)

  const MAX_GUESSES = 6
  const currentChars = [...current]

  // Letter state map for keyboard coloring
  const letterStates = evaluations.reduce<Record<string, LetterState>>((acc, eval_, gi) => {
    ;[...guesses[gi]].forEach((ch, i) => {
      const cur = acc[ch]
      const next = eval_[i]
      if (cur === 'correct') return
      if (next === 'correct' || cur !== 'present') acc[ch] = next
    })
    return acc
  }, {})

  const submit = useCallback(() => {
    if (currentChars.length !== 5) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }

    const eval_ = evaluate(current, answer)
    const newGuesses = [...guesses, current]
    const newEvals = [...evaluations, eval_]

    setGuesses(newGuesses)
    setEvaluations(newEvals)
    setCurrent('')

    if (current === answer) {
      setStatus('won')
    } else if (newGuesses.length >= MAX_GUESSES) {
      setStatus('lost')
    }
  }, [current, currentChars.length, answer, guesses, evaluations])

  const handleKey = useCallback((key: string) => {
    if (status !== 'playing') return
    if (key === 'ENTER') { submit(); return }
    if (key === 'BACKSPACE' || key === 'SİL') {
      setCurrent(p => [...p].slice(0, -1).join(''))
      return
    }
    const up = key.toLocaleUpperCase('tr-TR')
    if (VALID_CHARS.has(up) && currentChars.length < 5) {
      setCurrent(p => p + up)
    }
  }, [status, currentChars.length, submit])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') { handleKey('ENTER'); return }
      if (e.key === 'Backspace') { handleKey('BACKSPACE'); return }
      handleKey(e.key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  function reset(useRandom = true) {
    setGuesses([])
    setEvaluations([])
    setCurrent('')
    setStatus('playing')
    if (useRandom) {
      setAnswer(randomWord())
      setIsDaily(false)
    } else {
      setAnswer(getDailyWord())
      setIsDaily(true)
    }
  }

  // Build display grid
  const rows: { letters: string[]; states: LetterState[] }[] = []
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      rows.push({ letters: [...guesses[i]], states: evaluations[i] })
    } else if (i === guesses.length && status === 'playing') {
      const letters = [...currentChars, ...Array(5 - currentChars.length).fill(' ')]
      rows.push({ letters, states: letters.map(l => l !== ' ' ? 'tbd' : 'empty') })
    } else {
      rows.push({ letters: [' ', ' ', ' ', ' ', ' '], states: Array(5).fill('empty') })
    }
  }

  return (
    <div className="space-y-5">
      {isDaily && (
        <p className="text-center text-xs text-muted-foreground">
          Günün kelimesi — <button onClick={() => reset(true)} className="underline hover:no-underline">rastgele kelime</button>
        </p>
      )}

      {/* Grid */}
      <div className={`grid gap-1.5 mx-auto w-fit ${shake ? 'animate-bounce' : ''}`}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.letters.map((letter, li) => (
              <div
                key={li}
                className={`w-14 h-14 border-2 flex items-center justify-center text-xl font-bold uppercase rounded transition-all duration-300 ${STATE_COLORS[row.states[li]]}`}
                style={{ transitionDelay: ri < guesses.length ? `${li * 80}ms` : '0ms' }}
              >
                {letter.trim()}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Status */}
      {status === 'won' && (
        <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-1">
          <p className="font-bold text-lg">Tebrikler! 🎉</p>
          <p className="text-sm">{guesses.length}. denemede buldun!</p>
          <Link href="/dashboard" className="inline-block mt-2 text-xs underline hover:no-underline">
            Yazmaya geri dön →
          </Link>
        </div>
      )}
      {status === 'lost' && (
        <div className="text-center p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive space-y-1">
          <p className="font-bold text-lg">Olmadı bu sefer.</p>
          <p className="text-sm">Cevap: <span className="font-bold text-foreground">{answer}</span></p>
        </div>
      )}

      {/* Keyboard */}
      <div className="space-y-1.5 select-none">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map(key => {
              const state = letterStates[key]
              const isSpecial = key === 'ENTER' || key === 'SİL'
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className={`${isSpecial ? 'px-2 min-w-[44px] text-[10px]' : 'w-8 sm:w-9'} h-12 rounded font-bold transition-colors ${
                    state === 'correct' ? 'bg-emerald-500 text-white text-xs' :
                    state === 'present' ? 'bg-amber-500 text-white text-xs' :
                    state === 'absent' ? 'bg-surface-2 text-muted-foreground text-xs' :
                    'glass text-foreground hover:bg-white/10 text-xs'
                  }`}
                >
                  {key === 'SİL' ? <ArrowLeft className="w-4 h-4 mx-auto" /> : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {status !== 'playing' && (
          <button
            onClick={() => reset(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/15 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Yeni Kelime
          </button>
        )}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Yazmaya dön
        </Link>
      </div>
    </div>
  )
}
