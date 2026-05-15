'use client'

import { useState, useRef } from 'react'
import { Loader2, Check, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const WRITING_STATUS_OPTIONS = [
  { value: 'open',   label: 'İşbirliğine Açık',  desc: 'Yeni projelere katılmaya hazırım',   dot: 'bg-emerald-400' },
  { value: 'active', label: 'Aktif Yazıyor',      desc: 'Şu an bir projede yoğun çalışıyorum', dot: 'bg-sky-400' },
  { value: 'busy',   label: 'Meşgul',             desc: 'Şu an müsait değilim',               dot: 'bg-orange-400' },
]

interface Props {
  profile: {
    id: string
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    portfolio_url: string | null
    writing_status?: string | null
  }
}

export function SettingsForm({ profile }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolio_url ?? '')
  const [writingStatus, setWritingStatus] = useState(profile.writing_status ?? 'open')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Maksimum dosya boyutu 5 MB'); return }

    setAvatarUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { toast.error('Yükleme başarısız: ' + uploadError.message); setAvatarUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlWithCacheBust }).eq('id', profile.id)
    if (updateError) { toast.error('Profil güncellenemedi'); } else { setAvatarUrl(urlWithCacheBust); toast.success('Avatar güncellendi!') }
    setAvatarUploading(false)
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        writing_status: writingStatus,
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Kayıt başarısız: ' + error.message)
    } else {
      toast.success('Profil güncellendi!')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display font-semibold text-lg mb-4">Profil Fotoğrafı</h2>
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            <Avatar className="w-20 h-20 ring-2 ring-border">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {profile.display_name?.[0] ?? profile.username[0]}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              aria-label="Avatar yükle"
            >
              {avatarUploading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
            </button>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Fotoğrafı değiştir</p>
            <p className="text-xs text-muted-foreground mb-3">JPG, PNG veya WebP · Maks. 5 MB</p>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading} className="border-border">
              {avatarUploading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Yükleniyor...</> : 'Dosya Seç'}
            </Button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Profil Bilgileri */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <h2 className="font-display font-semibold text-lg">Profil Bilgileri</h2>

        <div className="space-y-1.5">
          <Label htmlFor="username">Kullanıcı Adı</Label>
          <Input
            id="username"
            defaultValue={profile.username}
            disabled
            className="bg-surface-2 border-border opacity-50 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Kullanıcı adı değiştirilemez.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="display_name">Görünen Ad</Label>
          <Input
            id="display_name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Adın nasıl görünsün?"
            className="bg-surface-2 border-border"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Biyografi</Label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={500}
            placeholder="Kendinden kısaca bahset. Hangi türleri yazıyorsun, ne kadar süredir yazarlık yapıyorsun?"
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="portfolio_url">Portfolyo URL</Label>
          <Input
            id="portfolio_url"
            type="url"
            value={portfolioUrl}
            onChange={e => setPortfolioUrl(e.target.value)}
            placeholder="https://..."
            className="bg-surface-2 border-border"
          />
        </div>
      </div>

      {/* Yazarlık Durumu */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Yazarlık Durumu</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Diğer yazarlar seni Yazarlar Rehberi'nde bu durumla görür.</p>
        </div>

        <div className="space-y-2">
          {WRITING_STATUS_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                writingStatus === opt.value
                  ? 'border-primary/50 bg-primary/8'
                  : 'border-border hover:border-white/15 hover:bg-white/[0.02]'
              }`}
            >
              <input
                type="radio"
                name="writing_status"
                value={opt.value}
                checked={writingStatus === opt.value}
                onChange={() => setWritingStatus(opt.value)}
                className="sr-only"
              />
              <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              {writingStatus === opt.value && (
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              )}
            </label>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_28px_rgba(124,58,237,0.5)] transition-shadow"
      >
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </div>
  )
}
