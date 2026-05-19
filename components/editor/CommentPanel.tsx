'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, CheckCircle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Comment, Profile } from '@/types'

interface CommentWithAuthor extends Comment {
  author: Profile
}

interface Props {
  chapterId: string
  projectId: string
  currentUserId: string
  projectMemberIds?: string[]
  isOwner?: boolean
  hideBorder?: boolean
}

export function CommentPanel({ chapterId, projectId, currentUserId, projectMemberIds = [], isOwner = false, hideBorder = false }: Props) {
  const supabase = createClient()
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('comments')
        .select('*, author:profiles!author_id(*)')
        .eq('chapter_id', chapterId)
        .eq('resolved', false)
        .order('created_at')
      if (data) setComments(data as CommentWithAuthor[])
    }
    load()

    const channel = supabase
      .channel(`comments:${chapterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `chapter_id=eq.${chapterId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chapterId, supabase])

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)

    await supabase.from('comments').insert({
      chapter_id: chapterId,
      author_id: currentUserId,
      content: input.trim(),
    })

    const others = projectMemberIds.filter(id => id !== currentUserId)
    if (others.length > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', currentUserId)
        .single()

      await supabase.from('notifications').insert(
        others.map(uid => ({
          user_id: uid,
          type: 'comment',
          payload: {
            project_id: projectId,
            chapter_id: chapterId,
            commenter_username: profile?.username,
            commenter_display_name: profile?.display_name,
            preview: input.trim().slice(0, 100),
          },
        }))
      )
    }

    setInput('')
    setSending(false)
  }

  async function resolve(id: string) {
    await supabase.from('comments').update({ resolved: true }).eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function deleteComment(id: string) {
    await supabase.from('comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className={`w-72 flex flex-col bg-surface shrink-0 ${hideBorder ? '' : 'border-l border-border'}`}>
      <div className="p-4 border-b border-border flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Yorumlar</span>
        {comments.length > 0 && (
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">{comments.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-8">Henüz yorum yok</p>
        ) : comments.map(c => (
          <div key={c.id} className="glass rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-primary truncate">
                {c.author.display_name ?? c.author.username}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {c.author_id === currentUserId && (
                  <button
                    onClick={() => resolve(c.id)}
                    className="text-muted-foreground hover:text-emerald-400 transition-colors"
                    title="Çözüldü olarak işaretle"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                {(isOwner && c.author_id !== currentUserId) && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Yorumu sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{c.content}</p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(c.created_at).toLocaleString('tr', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Yorum ekle..."
          className="flex-1 text-xs bg-surface-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary/50 placeholder:text-muted-foreground"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
