'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  code: string
}

export function JoinCodeDisplay({ code }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Katılım Kodu</p>
        <p className="text-3xl font-display font-bold tracking-[0.2em] text-white">{code}</p>
      </div>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-muted-foreground hover:text-white transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  )
}
