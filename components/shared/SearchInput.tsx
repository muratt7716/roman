'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  placeholder?: string
}

export function SearchInput({ placeholder = 'Ara...' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''

  const update = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('q', value)
    else params.delete('q')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }, [router, pathname, searchParams])

  return (
    <div className="relative flex items-center">
      <Search className={`absolute left-3 w-3.5 h-3.5 pointer-events-none transition-colors ${isPending ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
      <input
        type="search"
        defaultValue={q}
        onChange={e => update(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-64 bg-white/[0.02] border border-white/[0.06] rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 focus:bg-white/[0.04] transition-all duration-200"
      />
      {q && (
        <button
          onClick={() => update('')}
          className="absolute right-2.5 text-muted-foreground hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
