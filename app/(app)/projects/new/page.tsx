import type { Metadata } from 'next'
import { ProjectForm } from '@/components/project/ProjectForm'

export const metadata: Metadata = { title: 'Yeni Proje — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Yeni Proje Oluştur</h1>
        <p className="text-muted-foreground">Ekibini kur, hikayeni yaz.</p>
      </div>
      <div className="glass rounded-xl p-6">
        <ProjectForm />
      </div>
    </div>
  )
}
