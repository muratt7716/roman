'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

interface Props {
  submissionId: string
}

export function SubmitButton({ submissionId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit() {
    if (!confirm('Teslim etmek istediğine emin misin? Teslim sonrası düzenleme kilitlenir.')) return
    setLoading(true)
    const res = await fetch(`/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit' }),
    })
    if (res.ok) {
      router.back()
    } else {
      alert('Teslim edilemedi, tekrar dene.')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={submit}
      disabled={loading}
      className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
    >
      <Send className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{loading ? 'Teslim ediliyor...' : 'Teslim Et'}</span>
    </button>
  )
}
