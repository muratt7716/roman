'use client'

import { useState, useRef } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  currentUrl: string | null
}

export function CoverImageUpload({ projectId, currentUrl }: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Maksimum dosya boyutu 10 MB'); return }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${projectId}.${ext}`

    const { error: uploadError } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
    if (uploadError) { toast.error('Yükleme başarısız: ' + uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`
    const { error } = await supabase.from('projects').update({ cover_image_url: urlWithCacheBust }).eq('id', projectId)
    if (error) { toast.error('Proje güncellenemedi') } else { setUrl(urlWithCacheBust); toast.success('Kapak görseli güncellendi!') }
    setUploading(false)
  }

  async function removeCover() {
    await supabase.from('projects').update({ cover_image_url: null }).eq('id', projectId)
    setUrl(null)
    toast.success('Kapak görseli kaldırıldı')
  }

  return (
    <div className="space-y-3">
      <div
        className="relative h-36 rounded-xl overflow-hidden border border-border cursor-pointer group"
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {url ? (
          <>
            <img src={url} alt="Kapak görseli" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <span className="text-sm text-white font-medium flex items-center gap-1.5">
                <ImagePlus className="w-4 h-4" /> Değiştir
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-surface-2 flex flex-col items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
            <span className="text-xs">{uploading ? 'Yükleniyor...' : 'Kapak görseli yükle'}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {url && (
        <button
          type="button"
          onClick={removeCover}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="w-3 h-3" /> Görseli kaldır
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG veya WebP · Maks. 10 MB</p>
    </div>
  )
}
