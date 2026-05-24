'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'

interface Student {
  user_id: string
  name: string
}

interface Props {
  classroomId: string
  students: Student[]
  onAdded: () => void
}

export function AddParentForm({ classroomId, students, onAdded }: Props) {
  const [username, setUsername] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !studentId) return
    setLoading(true)
    setMsg(null)
    const res = await fetch(`/api/classroom/${classroomId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username.trim(), student_id: studentId }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setMsg({ type: 'success', text: 'Veli eklendi.' })
      setUsername('')
      setStudentId('')
      onAdded()
    } else {
      setMsg({ type: 'error', text: data.error ?? 'Hata oluştu.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 border border-white/[0.05] space-y-4">
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-violet-400" /> Veli Ekle
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Veli Kullanıcı Adı</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Platformdaki kullanıcı adı (örn: ahmetyilmaz)"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40"
          />
          <p className="text-xs text-slate-500 mt-1">Veli önce platforma kayıt olmuş olmalı.</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Öğrenci</label>
          <select
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/40"
          >
            <option value="">Öğrenci seç...</option>
            {students.map(s => (
              <option key={s.user_id} value={s.user_id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      {msg && (
        <p className={`text-xs font-medium ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !username.trim() || !studentId}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Ekleniyor...' : 'Veli Ekle'}
      </button>
    </form>
  )
}
