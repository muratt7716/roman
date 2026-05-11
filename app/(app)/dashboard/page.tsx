import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard — Writer Squad' }

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground">Projeleriniz ve aktiviteleriniz burada görünecek.</p>
    </div>
  )
}
