'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, CheckCircle, Trash2, CornerDownRight, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Comment, Profile } from '@/types'

interface CommentWithAuthor extends Comment {
  author: Profile
  parent_id: string | null
  replies?: CommentWithAuthor[]
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('comments')
        .select('*, author:profiles!author_id(*)')
        .eq('chapter_id', chapterId)
        .eq('resolved', false)
        .order('created_at')
      if (data) {
        const all = data as CommentWithAuthor[]
        // group: parent comments + attach replies
        const parents = all.filter(c => !c.parent_id)
        const replies = all.filter(c => c.parent_id)
        parents.forEach(p => {
          p.replies = replies.filter(r => r.parent_id === p.id)
        })
        setComments(parents)
      }
    }
    load()

    const channel = supabase
      .channel(`comments:${chapterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `chapter_id=eq.${chapterId}` }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chapterId, supabase])

  async function notifyMembers(content: string, parentAuthorId?: string) {
    const others = new Set([
      ...projectMemberIds.filter(id => id !== currentUserId),
      ...(parentAuthorId && parentAuthorId !== currentUserId ? [parentAuthorId] : []),
    ])
    if (others.size === 0) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', currentUserId)
      .single()

    await supabase.from('notifications').insert(
      [...others].map(uid => ({
        user_id: uid,
        type: 'comment',
        payload: {
          project_id: projectId,
          chapter_id: chapterId,
          commenter_username: profile?.username,
          commenter_display_name: profile?.display_name,
          preview: content.slice(0, 100),
        },
      }))
    )
  }

  async function send() {
    if (!input.trim() || sending) return
    setSending(true)
    await supabase.from('comments').insert({
      chapter_id: chapterId,
      author_id: currentUserId,
      content: input.trim(),
    })
    await notifyMembers(input.trim())
    setInput('')
    setSending(false)
  }

  async function sendReply(parentId: string, parentAuthorId: string) {
    if (!replyInput.trim() || sending) return
    setSending(true)
    await supabase.from('comments').insert({
      chapter_id: chapterId,
      author_id: currentUserId,
      content: replyInput.trim(),
      parent_id: parentId,
    })
    await notifyMembers(replyInput.trim(), parentAuthorId)
    setReplyInput('')
    setReplyingTo(null)
    setSending(false)
  }

  async function resolve(id: string) {
    // resolving a parent also resolves its replies (cascade via resolved flag)
    await supabase.from('comments').update({ resolved: true }).eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function deleteComment(id: string) {
    await supabase.from('comments').delete().eq('id', id)
  }

  function toggleCollapse(id: string) {
    setCollapsedThreads(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)

  return (
    <div className={`w-72 flex flex-col bg-surface shrink-0 ${hideBorder ? '' : 'border-l border-border'}`}>
      <div className="p-4 border-b border-border flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Yorumlar</span>
        {totalCount > 0 && (
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">{totalCount}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-8">Henüz yorum yok</p>
        ) : comments.map(c => {
          const isCollapsed = collapsedThreads.has(c.id)
          const hasReplies = (c.replies?.length ?? 0) > 0

          return (
            <div key={c.id} className="space-y-1.5">
              {/* Parent comment */}
              <div className="glass rounded-lg p-3 space-y-2">
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
                    {isOwner && c.author_id !== currentUserId && (
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
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString('tr', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center gap-2">
                    {hasReplies && (
                      <button
                        onClick={() => toggleCollapse(c.id)}
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {c.replies!.length} yanıt
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (replyingTo === c.id) { setReplyingTo(null); setReplyInput('') }
                        else { setReplyingTo(c.id); setReplyInput('') }
                      }}
                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <CornerDownRight className="w-3 h-3" />
                      Yanıtla
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {!isCollapsed && hasReplies && (
                <div className="ml-3 pl-2 border-l border-border/50 space-y-1.5">
                  {c.replies!.map(r => (
                    <div key={r.id} className="glass rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-primary truncate">
                          {r.author.display_name ?? r.author.username}
                        </span>
                        {isOwner && r.author_id !== currentUserId && (
                          <button
                            onClick={() => deleteComment(r.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Yanıtı sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{r.content}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString('tr', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === c.id && (
                <div className="ml-3 pl-2 border-l border-primary/30 flex gap-2">
                  <input
                    value={replyInput}
                    onChange={e => setReplyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply(c.id, c.author_id)}
                    placeholder="Yanıt yaz..."
                    autoFocus
                    className="flex-1 text-xs bg-surface-2 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => sendReply(c.id, c.author_id)}
                    disabled={!replyInput.trim() || sending}
                    className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-40"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
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
