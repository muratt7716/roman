'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RoleForm } from './RoleForm'
import { createClient } from '@/lib/supabase/client'
import { createProjectSchema, type CreateProjectInput } from '@/lib/validations/project'

const GENRES = ['Fantastik', 'Bilim Kurgu', 'Romantik', 'Gerilim', 'Macera', 'Tarihi', 'Distopya', 'Diğer']

interface Role {
  id: string
  name: string
  description?: string
  max_members: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-' + Math.random().toString(36).slice(2, 6)
}

export function ProjectForm() {
  const router = useRouter()
  const supabase = createClient()
  const [roles, setRoles] = useState<Role[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [step, setStep] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, watch, trigger, getValues, formState: { errors } } = useForm<CreateProjectInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues: { visibility: 'open', tags: [] },
  })

  async function goToStep2() {
    const valid = await trigger(['title'])
    if (valid) setStep(2)
  }

  async function goToStep3() {
    setStep(3)
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim()) && tags.length < 10) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  async function onSubmit(data: CreateProjectInput) {
    setServerError(null)
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = slugify(data.title)

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        title: data.title,
        slug,
        genre: data.genre,
        synopsis: data.synopsis,
        tags,
        target_word_count: data.target_word_count,
        visibility: data.visibility,
      })
      .select()
      .single()

    if (error) {
      setServerError('Proje oluşturulurken bir hata oluştu.')
      setSubmitting(false)
      return
    }

    if (roles.length > 0) {
      await supabase.from('project_roles').insert(
        roles.map(r => ({
          project_id: project.id,
          name: r.name,
          description: r.description,
          max_members: r.max_members,
        }))
      )
    }

    const { data: firstRole } = await supabase
      .from('project_roles')
      .select('id')
      .eq('project_id', project.id)
      .limit(1)
      .single()

    if (firstRole) {
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: user.id,
        role_id: firstRole.id,
      })
    }

    router.push(`/projects/${project.id}/overview`)
  }

  return (
    <form onSubmit={e => e.preventDefault()} className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s === step ? 'bg-primary text-white' : s < step ? 'bg-primary/30 text-primary' : 'bg-surface-2 text-muted-foreground'
            }`}>{s}</div>
            {s < 3 && <div className={`w-12 h-px ${s < step ? 'bg-primary/50' : 'bg-border'}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-muted-foreground">
          {step === 1 ? 'Temel Bilgiler' : step === 2 ? 'Detaylar' : 'Roller'}
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Proje Başlığı *</Label>
            <Input id="title" placeholder="örn. Gölge Krallığı" className="bg-surface-2 border-border text-lg" {...register('title')} />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genre">Tür <span className="text-muted-foreground text-xs">(isteğe bağlı)</span></Label>
            <select
              id="genre"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('genre')}
            >
              <option value="">Tür seçin</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="synopsis">Özet <span className="text-muted-foreground text-xs">(isteğe bağlı)</span></Label>
            <textarea
              id="synopsis"
              rows={5}
              placeholder="Projenin kısa açıklaması... Sonra da ekleyebilirsin."
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              {...register('synopsis')}
            />
          </div>

          <Button type="button" onClick={goToStep2} className="w-full bg-primary text-white">
            Devam Et
          </Button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Etiketler</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-surface-2 border border-border min-h-[44px]">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive">×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder={tags.length < 10 ? "Etiket ekle, Enter'a bas" : "Maks. 10 etiket"}
                disabled={tags.length >= 10}
                className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target_word_count">Hedef Kelime Sayısı</Label>
            <Input
              id="target_word_count"
              type="number"
              placeholder="örn. 80000"
              className="bg-surface-2 border-border"
              {...register('target_word_count', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">Ortalama roman ≈ 80.000 kelime</p>
          </div>

          <div className="space-y-1.5">
            <Label>Görünürlük</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'open', label: 'Açık', desc: 'Herkes başvurabilir' },
                { value: 'draft', label: 'Taslak', desc: 'Sadece sen görebilirsin' },
              ].map(opt => (
                <label key={opt.value} className="cursor-pointer">
                  <input type="radio" value={opt.value} className="sr-only" {...register('visibility')} />
                  <div className={`p-3 rounded-lg border transition-colors ${
                    watch('visibility') === opt.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'
                  }`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Geri</Button>
            <Button type="button" onClick={goToStep3} className="flex-1 bg-primary text-white">Devam Et</Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Ekip Rolleri <span className="text-muted-foreground text-xs">(isteğe bağlı)</span></Label>
            <p className="text-xs text-muted-foreground">Tek başına yazıyorsan boş bırakabilirsin. Ekip kurmak istersen rol ekle.</p>
          </div>

          <RoleForm roles={roles} onChange={setRoles} />

          {serverError && (
            <p role="alert" className="text-destructive text-sm">{serverError}</p>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">Geri</Button>
            <Button type="button" disabled={submitting} onClick={() => onSubmit(getValues())} className="flex-1 bg-primary text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Projeyi Oluştur
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
