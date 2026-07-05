'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Users, Check, X, ChevronLeft, Loader2, Rocket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Profile { id: string; username: string; display_name: string | null; avatar_url: string | null }
interface Message { id: string; content: string; created_at: string; user_id: string; author: Profile }
interface JoinRequest { id: string; user_id: string; status: string; requester: Profile }
interface Thread {
  id: string; title: string; seed: string; status: string; user_id: string
  author: Profile; project_id: string | null
}

interface Props {
  thread: Thread
  initialMessages: Message[]
  initialJoinRequests: JoinRequest[]
  currentUserId: string
}

export function IdeaRoomClient({ thread, initialMessages, initialJoinRequests, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(initialJoinRequests)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(thread.status)
  const [converting, setConverting] = useState(false)
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(
    initialJoinRequests.find(r => r.user_id === currentUserId) ?? null
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const isOwner = thread.user_id === currentUserId

  // Realtime: yeni mesajları dinle
  useEffect(() => {
    const channel = supabase
      .channel(`idea_room:${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'idea_messages',
        filter: `thread_id=eq.${thread.id}`,
      }, async (payload) => {
        const { data: msg } = await supabase
          .from('idea_messages')
          .select('*, author:profiles!idea_messages_user_id_fkey(*)')
          .eq('id', payload.new.id)
          .single()
        if (msg) setMessages(prev => [...prev, msg as Message])
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'idea_join_requests',
        filter: `thread_id=eq.${thread.id}`,
      }, async (payload) => {
        const { data: req } = await supabase
          .from('idea_join_requests')
          .select('*, requester:profiles!idea_join_requests_user_id_fkey(*)')
          .eq('id', payload.new.id)
          .single()
        if (req) {
          setJoinRequests(prev => [...prev, req as JoinRequest])
          if ((req as JoinRequest).user_id === currentUserId) setMyRequest(req as JoinRequest)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'idea_join_requests',
        filter: `thread_id=eq.${thread.id}`,
      }, (payload) => {
        setJoinRequests(prev => prev.map(r => r.id === payload.new.id ? { ...r, status: payload.new.status } : r))
        if (payload.new.user_id === currentUserId) {
          setMyRequest(prev => prev ? { ...prev, status: payload.new.status } : prev)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [thread.id, currentUserId, supabase])

  // Yeni mesajda alta scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    await supabase.from('idea_messages').insert({
      thread_id: thread.id, user_id: currentUserId, content: input.trim(),
    })
    setInput('')
    setSending(false)
  }

  async function toggleTeamForming() {
    const newStatus = status === 'team_forming' ? 'active' : 'team_forming'
    await supabase.from('idea_threads').update({ status: newStatus }).eq('id', thread.id)
    setStatus(newStatus)
    router.refresh()
  }

  async function closeThread() {
    await supabase.from('idea_threads').update({ status: 'closed' }).eq('id', thread.id)
    setStatus('closed')
    router.refresh()
  }

  // Fikri gerçek bir projeye dönüştür: başlık → proje adı, tohum → özet.
  // Kabul edilen ekip üyeleri projeye başvurabilir/davet edilebilir.
  async function convertToProject() {
    if (!confirm('Bu fikir bir projeye dönüştürülecek. Başlık proje adı, tohum fikir de özet olacak. Devam edilsin mi?')) return
    setConverting(true)

    const slug = thread.title
      .toLowerCase()
      .replace(/[çğıöşü]/g, c => ({ 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u' }[c] ?? c))
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Math.random().toString(36).slice(2, 6)

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        owner_id: currentUserId,
        title: thread.title,
        slug,
        synopsis: thread.seed,
        visibility: 'open',
      })
      .select('id')
      .single()

    if (error || !project) {
      alert('Proje oluşturulamadı, tekrar dene.')
      setConverting(false)
      return
    }

    await supabase.from('idea_threads').update({ project_id: project.id, status: 'closed' }).eq('id', thread.id)
    router.push(`/projects/${project.id}/overview`)
  }

  async function requestJoin() {
    const { data } = await supabase
      .from('idea_join_requests')
      .insert({ thread_id: thread.id, user_id: currentUserId })
      .select('*, requester:profiles!idea_join_requests_user_id_fkey(*)')
      .single()
    if (data) setMyRequest(data as JoinRequest)
  }

  async function handleJoinRequest(reqId: string, accept: boolean) {
    await supabase
      .from('idea_join_requests')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', reqId)
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  const pendingRequests = joinRequests.filter(r => r.status === 'pending')
  const acceptedRequests = joinRequests.filter(r => r.status === 'accepted')

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface px-4 py-3 space-y-2 shrink-0">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/fikir-odasi')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors mt-0.5"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-semibold truncate">{thread.title}</h1>
              {status === 'team_forming' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0">
                  <Users className="w-3 h-3" /> Ekip Aranıyor
                </span>
              )}
              {status === 'closed' && (
                <span className="px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground text-[11px] shrink-0">Kapalı</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{thread.seed}</p>
          </div>

          {/* Owner controls */}
          {isOwner && status !== 'closed' && (
            <div className="flex items-center gap-2 shrink-0">
              {!thread.project_id && (
                <button
                  onClick={convertToProject}
                  disabled={converting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors disabled:opacity-50"
                  title="Fikri gerçek bir projeye dönüştür"
                >
                  {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{converting ? 'Oluşturuluyor…' : 'Projeye Dönüştür'}</span>
                </button>
              )}
              <button
                onClick={toggleTeamForming}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === 'team_forming'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-surface-2 text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{status === 'team_forming' ? 'Aramayı Durdur' : 'Ekip Ara'}</span>
              </button>
              <button
                onClick={closeThread}
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-colors"
              >
                Kapat
              </button>
            </div>
          )}
        </div>

        {/* Join requests panel (owner only) */}
        {isOwner && pendingRequests.length > 0 && (
          <div className="ml-9 space-y-1.5">
            <p className="text-[11px] text-muted-foreground font-medium">Katılmak isteyen ({pendingRequests.length})</p>
            <div className="flex flex-wrap gap-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-border text-xs">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={req.requester?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                      {(req.requester?.display_name ?? req.requester?.username ?? '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{req.requester?.display_name ?? req.requester?.username}</span>
                  <button onClick={() => handleJoinRequest(req.id, true)} className="p-0.5 text-emerald-400 hover:text-emerald-300">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleJoinRequest(req.id, false)} className="p-0.5 text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted members */}
        {acceptedRequests.length > 0 && (
          <div className="ml-9 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground">Ekipte:</span>
            {acceptedRequests.map(req => (
              <div key={req.id} className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={req.requester?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-emerald-500/20 text-emerald-400">
                    {(req.requester?.display_name ?? req.requester?.username ?? '?')[0]}
                  </AvatarFallback>
                </Avatar>
                {req.requester?.display_name ?? req.requester?.username}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            Henüz mesaj yok. İlk fikri sen ver!
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.user_id === currentUserId
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                <AvatarImage src={msg.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {(msg.author?.display_name ?? msg.author?.username ?? '?')[0]}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-medium">
                    {isMe ? 'Sen' : (msg.author?.display_name ?? msg.author?.username)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                </div>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-primary/20 text-foreground rounded-tr-sm'
                    : 'bg-surface-2 text-foreground rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-surface px-4 py-3 shrink-0 space-y-2">
        {/* Join button (non-owner, team_forming) */}
        {!isOwner && status === 'team_forming' && !myRequest && (
          <button
            onClick={requestJoin}
            className="w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4" /> Ekibe Katılmak İstiyorum
          </button>
        )}
        {!isOwner && myRequest && (
          <p className={`text-center text-xs py-1 ${
            myRequest.status === 'accepted' ? 'text-emerald-400' :
            myRequest.status === 'rejected' ? 'text-destructive' :
            'text-muted-foreground'
          }`}>
            {myRequest.status === 'accepted' && '✓ Ekibe kabul edildin!'}
            {myRequest.status === 'rejected' && 'Talebiniz reddedildi.'}
            {myRequest.status === 'pending' && 'Talebiniz bekleniyor…'}
          </p>
        )}

        {/* Message input */}
        {status !== 'closed' && (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Fikrine katkı yaz…"
              maxLength={1000}
              className="flex-1 px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
        {status === 'closed' && (
          <p className="text-center text-xs text-muted-foreground py-1">Bu fikir odası kapatılmış.</p>
        )}
      </div>
    </div>
  )
}
