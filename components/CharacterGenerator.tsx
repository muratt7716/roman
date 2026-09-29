'use client'

import { useState } from 'react'
import { Shuffle, Copy, Check, User } from 'lucide-react'
import { generateCharacter, type GeneratedCharacter } from '@/lib/characterData'
import { pick, MALE_NAMES, FEMALE_NAMES, SURNAMES, AGES, PERSONALITIES, BACKGROUNDS, MOTIVATIONS, FLAWS, APPEARANCES } from '@/lib/characterData'

interface Props {
  onUseCharacter?: (text: string) => void
}

export function CharacterGenerator({ onUseCharacter }: Props) {
  const [char, setChar] = useState<GeneratedCharacter | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  function generate() {
    setLoading(true)
    setTimeout(() => {
      setChar(generateCharacter())
      setLoading(false)
    }, 300)
  }

  function regenerateField(field: keyof GeneratedCharacter) {
    if (!char) return
    setChar(prev => {
      if (!prev) return prev
      switch (field) {
        case 'firstName': return { ...prev, firstName: pick(prev.isMale ? MALE_NAMES : FEMALE_NAMES) }
        case 'lastName': return { ...prev, lastName: pick(SURNAMES) }
        case 'age': return { ...prev, age: pick(AGES) }
        case 'personality': return { ...prev, personality: pick(PERSONALITIES) }
        case 'background': return { ...prev, background: pick(BACKGROUNDS) }
        case 'motivation': return { ...prev, motivation: pick(MOTIVATIONS) }
        case 'flaw': return { ...prev, flaw: pick(FLAWS) }
        case 'appearance': return { ...prev, appearance: pick(APPEARANCES) }
        default: return prev
      }
    })
  }

  function toText(c: GeneratedCharacter): string {
    return `## ${c.firstName} ${c.lastName} (${c.age})

**Kişilik:** ${c.personality.label} — ${c.personality.detail}

**Görünüş:** ${c.appearance}

**Geçmiş:** ${c.background}

**Motivasyon:** ${c.motivation}

**Kusur:** ${c.flaw}`
  }

  async function copy() {
    if (!char) return
    await navigator.clipboard.writeText(toText(char))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Generate button */}
      {!char ? (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <User className="w-5 h-5" />
          {loading ? 'Oluşturuluyor…' : 'Rastgele Karakter Üret'}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold font-display">
                {char.firstName} {char.lastName}
              </h2>
              <p className="text-muted-foreground text-sm">{char.age} yaşında</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copy}
                title="Kopyala"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/15 text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
              <button
                onClick={generate}
                title="Yeni karakter"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/15 text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Yeni
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Kişilik" value={char.personality.label} detail={char.personality.detail} onReroll={() => regenerateField('personality')} />
            <Field label="Görünüş" value={char.appearance} onReroll={() => regenerateField('appearance')} />
            <Field label="Geçmiş" value={char.background} onReroll={() => regenerateField('background')} />
            <Field label="Motivasyon" value={char.motivation} onReroll={() => regenerateField('motivation')} />
            <Field label="Kusur" value={char.flaw} onReroll={() => regenerateField('flaw')} className="sm:col-span-2" />
          </div>

          {/* Use in wiki hint */}
          {onUseCharacter && (
            <button
              onClick={() => onUseCharacter(toText(char))}
              className="w-full py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm transition-colors"
            >
              Karakter Wikisine Ekle
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, detail, onReroll, className = '' }: {
  label: string
  value: string
  detail?: string
  onReroll: () => void
  className?: string
}) {
  return (
    <div className={`glass rounded-xl p-3 space-y-1 group ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <button
          onClick={onReroll}
          title="Yeniden üret"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground"
        >
          <Shuffle className="w-3 h-3" />
        </button>
      </div>
      <p className="text-sm font-medium leading-snug">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}
