import { Skeleton } from '@/components/ui/skeleton'

/**
 * (app) altındaki her sayfa `force-dynamic` ve veri çekiyor; yükleme sınırı
 * olmadan gezinme sırasında ekran donuk kalıyordu. Bu iskelet panelin
 * yapısını taklit eder — başlık, istatistik satırı, liste.
 */
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 bg-surface-2" />
        <Skeleton className="h-4 w-72 bg-surface-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
            <Skeleton className="h-4 w-4 bg-surface-2" />
            <Skeleton className="h-7 w-12 bg-surface-2" />
            <Skeleton className="h-3 w-20 bg-surface-2" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-40 bg-surface-2" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-2/40 p-2.5">
            <Skeleton className="w-11 h-14 rounded-md bg-surface-2 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48 bg-surface-2" />
              <Skeleton className="h-3 w-24 bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
