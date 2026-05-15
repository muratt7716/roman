'use client'

import { useState } from 'react'
import { UserPlus, ChevronDown, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Role { id: string; name: string }
interface Project { id: string; title: string; roles: Role[] }

interface Props {
  targetUserId: string
  targetUsername: string
  className?: string
}

export function InviteButton({ targetUserId, targetUsername, className }: Props) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  async function openModal() {
    setFetching(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Giriş yapmalısın'); setFetching(false); return }
    if (user.id === targetUserId) { toast.error('Kendinizi davet edemezsiniz'); setFetching(false); return }

    const { data } = await supabase
      .from('projects')
      .select('id, title, roles:project_roles(id, name)')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })

    setProjects((data ?? []) as Project[])
    setSelectedProjectId('')
    setSelectedRoleId('')
    setMessage('')
    setFetching(false)
    setOpen(true)
  }

  async function sendInvite() {
    if (!selectedProjectId || !selectedRoleId) {
      toast.error('Proje ve rol seçmelisin')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: invite, error } = await supabase
      .from('project_invites')
      .insert({ project_id: selectedProjectId, inviter_id: user.id, invitee_id: targetUserId, role_id: selectedRoleId, message: message || null })
      .select()
      .single()

    if (error) {
      toast.error(error.code === '23505' ? 'Bu yazara zaten davet gönderildi' : 'Davet gönderilemedi')
      setLoading(false)
      return
    }

    const [{ data: inviterProfile }] = await Promise.all([
      supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
    ])

    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'invite',
      payload: {
        invite_id: invite.id,
        project_id: selectedProjectId,
        project_title: selectedProject?.title,
        role_name: selectedProject?.roles.find(r => r.id === selectedRoleId)?.name,
        inviter_username: inviterProfile?.username,
        inviter_display_name: inviterProfile?.display_name,
      },
    })

    toast.success(`@${targetUsername} kullanıcısına davet gönderildi!`)
    setOpen(false)
    setLoading(false)
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={fetching}
        onClick={openModal}
        className={cn('gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60', className)}
      >
        {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
        Davet Gönder
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md glass-strong rounded-2xl border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] p-6 space-y-5">
            <div>
              <h2 className="text-lg font-display font-semibold">Projeye Davet Et</h2>
              <p className="text-sm text-muted-foreground mt-0.5">@{targetUsername} kullanıcısını projena davet ediyorsun</p>
            </div>

            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Henüz projen yok. Önce bir proje oluştur.
              </p>
            ) : (
              <>
                {/* Proje seçimi */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Proje</label>
                  <div className="relative">
                    <select
                      value={selectedProjectId}
                      onChange={e => { setSelectedProjectId(e.target.value); setSelectedRoleId('') }}
                      className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    >
                      <option value="">Proje seçin</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Rol seçimi */}
                {selectedProject && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Rol</label>
                    {selectedProject.roles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Bu projede henüz rol tanımlı değil.</p>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedRoleId}
                          onChange={e => setSelectedRoleId(e.target.value)}
                          className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                        >
                          <option value="">Rol seçin</option>
                          {selectedProject.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    )}
                  </div>
                )}

                {/* Mesaj */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mesaj <span className="text-muted-foreground font-normal">(isteğe bağlı)</span></label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Neden bu kişiyi davet etmek istiyorsun?"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">İptal</Button>
              {projects.length > 0 && (
                <Button
                  type="button"
                  disabled={loading || !selectedProjectId || !selectedRoleId}
                  onClick={sendInvite}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Gönder
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
