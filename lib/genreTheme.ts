/**
 * Tür başına kapak gradyanı ve rozet rengi. Kapak görseli olmayan projelerde
 * kimliği bu taşır — hem poster kartta (keşfet/kütüphane/profil) hem panel
 * satırındaki küçük kapak çipinde aynı renk kullanılır ki aynı proje iki
 * yüzeyde de aynı görünsün.
 */
export const GENRE_GRADIENTS: Record<string, { cover: string; badge: string }> = {
  'Fantastik':    { cover: 'from-violet-600/40 via-purple-950/60 to-black',  badge: 'bg-violet-500/20 text-violet-200 border-violet-400/30' },
  'Bilim Kurgu':  { cover: 'from-cyan-600/40 via-blue-950/60 to-black',      badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30' },
  'Romantik':     { cover: 'from-pink-600/40 via-rose-950/60 to-black',      badge: 'bg-pink-500/20 text-pink-200 border-pink-400/30' },
  'Gerilim':      { cover: 'from-red-700/40 via-red-950/60 to-black',        badge: 'bg-red-500/20 text-red-200 border-red-400/30' },
  'Macera':       { cover: 'from-orange-600/40 via-amber-950/60 to-black',   badge: 'bg-orange-500/20 text-orange-200 border-orange-400/30' },
  'Tarihi':       { cover: 'from-amber-700/40 via-yellow-950/60 to-black',   badge: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
  'Distopya':     { cover: 'from-slate-600/40 via-zinc-950/60 to-black',     badge: 'bg-slate-500/20 text-slate-200 border-slate-400/30' },
}

export const DEFAULT_GENRE = {
  cover: 'from-primary/30 via-violet-950/50 to-black',
  badge: 'bg-primary/20 text-accent border-primary/30',
}

export function genreTheme(genre: string | null | undefined) {
  return GENRE_GRADIENTS[genre ?? ''] ?? DEFAULT_GENRE
}
