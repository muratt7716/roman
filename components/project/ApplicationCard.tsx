'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { createApplicationSchema, type CreateApplicationInput } from '@/lib/validations/application'
import type { ProjectRole } from '@/types'

interface ApplicationFormProps {
  projectId: string
  role: ProjectRole
  userId: string
}

export function ApplicationForm({ projectId, role, userId }: ApplicationFormProps) {
  const supabase = createClient()
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { portfolio_links: [] },
  })

  async function onSubmit(data: CreateApplicationInput) {
    setServerError(null)
    const { error } = await supabase.from('applications').insert({
      project_id: projectId,
      applicant_id: userId,
      role_id: role.id,
      intro: data.intro,
      writing_sample: data.writing_sample,
      portfolio_links: [],
    })

    if (error) {
      setServerError('Başvuru gönderilirken bir hata oluştu.')
      return
    }

    // Proje sahibine bildirim gönder
    const [{ data: project }, { data: applicant }] = await Promise.all([
      supabase.from('projects').select('owner_id, title').eq('id', projectId).single(),
      supabase.from('profiles').select('username, display_name').eq('id', userId).single(),
    ])

    if (project && project.owner_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: project.owner_id,
        type: 'application',
        payload: {
          project_id: projectId,
          project_title: project.title,
          applicant_id: userId,
          applicant_username: applicant?.username,
          role_name: role.name,
        },
      })
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="w-10 h-10 text-success" />
        <p className="font-medium">Başvurun gönderildi!</p>
        <p className="text-sm text-muted-foreground">Proje sahibi inceleyecek ve sana bildirim göndereceğiz.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">
          <span className="text-primary">{role.name}</span> rolü için başvuru
        </p>
        {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="intro">Tanıtım * <span className="text-muted-foreground text-xs">(min. 50 karakter)</span></Label>
        <textarea
          id="intro"
          rows={3}
          placeholder="Kendinizi tanıtın, neden bu rolü istediğinizi anlatın..."
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          aria-describedby={errors.intro ? 'intro-error' : undefined}
          aria-invalid={!!errors.intro}
          {...register('intro')}
        />
        {errors.intro && <p id="intro-error" role="alert" className="text-destructive text-xs">{errors.intro.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sample">Yazı Örneği</Label>
        <textarea
          id="sample"
          rows={4}
          placeholder="Kısa bir yazı örneği paylaşın (isteğe bağlı)..."
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          {...register('writing_sample')}
        />
      </div>

      {serverError && <p role="alert" className="text-destructive text-sm">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white">
        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Başvuruyu Gönder
      </Button>
    </form>
  )
}
