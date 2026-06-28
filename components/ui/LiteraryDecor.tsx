const SVG_PROPS = {
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  className: 'w-full h-full select-none',
  style: { pointerEvents: 'none' as const },
}

/* Tüy kalem */
export function QuillSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 140" {...SVG_PROPS}>
      <path d="M30 135 Q28 90 15 20" />
      <path d="M26 135 Q30 125 34 135" />
      <path d="M27 120 Q14 108 6 95" />
      <path d="M25 104 Q10 90 4 75" />
      <path d="M23 88 Q10 76 5 60" />
      <path d="M20 72 Q10 60 8 46" />
      <path d="M17 56 Q10 44 12 30" />
      <path d="M30 118 Q44 108 50 95" />
      <path d="M28 102 Q44 90 52 77" />
      <path d="M26 86 Q42 75 50 62" />
      <path d="M24 70 Q38 60 44 48" />
      <path d="M21 54 Q34 44 38 32" />
      <path d="M15 20 Q22 5 35 2 Q48 0 50 10 Q40 18 30 135" />
    </svg>
  )
}

/* Açık kitap */
export function OpenBookSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70" {...SVG_PROPS}>
      <path d="M50 10 Q30 8 10 14 L8 58 Q28 52 50 56 Z" />
      <path d="M50 10 Q70 8 90 14 L92 58 Q72 52 50 56 Z" />
      <line x1="50" y1="10" x2="50" y2="56" />
      <path d="M18 22 Q32 19 46 21" />
      <path d="M17 30 Q31 27 45 29" />
      <path d="M16 38 Q30 35 44 37" />
      <path d="M16 46 Q29 43 43 45" />
      <path d="M54 21 Q68 19 82 22" />
      <path d="M55 29 Q69 27 83 30" />
      <path d="M56 37 Q70 35 84 38" />
      <path d="M56 45 Q70 43 84 46" />
    </svg>
  )
}

/* Hokka */
export function InkwellSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70" {...SVG_PROPS}>
      <path d="M12 28 Q10 62 8 65 Q30 68 52 65 Q50 62 48 28" />
      <path d="M12 28 Q18 22 30 20 Q42 22 48 28" />
      <path d="M22 20 Q22 14 30 12 Q38 14 38 20" />
      <ellipse cx="30" cy="12" rx="8" ry="3" />
      <path d="M18 34 Q30 38 42 34" />
      <path d="M14 44 Q16 42 18 44" />
    </svg>
  )
}

/* Kalem ucu */
export function PenNibSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80" {...SVG_PROPS}>
      <path d="M25 75 L5 32 Q14 16 25 12" />
      <path d="M25 75 L45 32 Q36 16 25 12" />
      <line x1="25" y1="75" x2="25" y2="36" />
      <circle cx="25" cy="32" r="3" />
      <path d="M10 30 Q25 26 40 30" />
    </svg>
  )
}

/* Dolmakalem (tam gövde) */
export function FountainPenSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 130" {...SVG_PROPS}>
      {/* Kapak */}
      <rect x="5" y="2" width="12" height="45" rx="6" />
      <line x1="5" y1="44" x2="17" y2="44" />
      {/* Gövde */}
      <rect x="6" y="47" width="10" height="52" rx="5" />
      {/* Grip bölümü */}
      <path d="M6 99 Q4 104 5 110 L11 125 L17 110 Q18 104 16 99" />
      {/* Uç */}
      <path d="M8 110 L11 125 L14 110" />
      {/* Orta çizgi (slit) */}
      <line x1="11" y1="125" x2="11" y2="112" />
      {/* Kapak klibi */}
      <path d="M17 8 Q20 8 20 12 L20 40 Q20 44 17 44" />
    </svg>
  )
}

/* Defter */
export function NotebookSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" {...SVG_PROPS}>
      {/* Kapak */}
      <rect x="14" y="4" width="62" height="92" rx="4" />
      {/* Spiral bağlama */}
      <circle cx="14" cy="18" r="4" />
      <circle cx="14" cy="32" r="4" />
      <circle cx="14" cy="46" r="4" />
      <circle cx="14" cy="60" r="4" />
      <circle cx="14" cy="74" r="4" />
      <circle cx="14" cy="88" r="4" />
      <line x1="14" y1="4" x2="14" y2="96" />
      {/* Satırlar */}
      <path d="M24 26 L70 26" />
      <path d="M24 36 L70 36" />
      <path d="M24 46 L70 46" />
      <path d="M24 56 L70 56" />
      <path d="M24 66 L70 66" />
      <path d="M24 76 L70 76" />
      {/* Sol kenar çizgisi */}
      <line x1="30" y1="20" x2="30" y2="82" />
    </svg>
  )
}

/* Mürekkep damlası */
export function InkDropSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" {...SVG_PROPS}>
      <path d="M14 2 Q22 12 22 22 Q22 34 14 36 Q6 34 6 22 Q6 12 14 2 Z" />
      <path d="M10 26 Q14 22 18 26" />
    </svg>
  )
}
