import { Skeleton } from '@/components/ui/skeleton'

export function ProjectCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <Skeleton className="h-40 w-full rounded-lg bg-surface-2" />
      <Skeleton className="h-5 w-3/4 bg-surface-2" />
      <Skeleton className="h-4 w-full bg-surface-2" />
      <Skeleton className="h-4 w-2/3 bg-surface-2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-full bg-surface-2" />
        <Skeleton className="h-6 w-20 rounded-full bg-surface-2" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full bg-surface-2" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32 bg-surface-2" />
        <Skeleton className="h-3 w-24 bg-surface-2" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48 bg-surface-2" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
