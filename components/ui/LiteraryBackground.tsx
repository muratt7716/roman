'use client'

import { QuillSVG, OpenBookSVG, InkwellSVG, PenNibSVG, FountainPenSVG, NotebookSVG, InkDropSVG } from './LiteraryDecor'

export function LiteraryBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden hidden sm:block"
    >
      {/* Sol üst — tüy kalem */}
      <div className="absolute -left-6 top-24 w-16 h-[150px] text-white/[0.10] rotate-[20deg]">
        <QuillSVG />
      </div>

      {/* Sağ üst — dolmakalem */}
      <div className="absolute right-10 top-16 w-5 h-[120px] text-white/[0.11] -rotate-[25deg]">
        <FountainPenSVG />
      </div>

      {/* Sol orta — açık kitap */}
      <div className="absolute -left-4 top-[42%] w-24 h-[70px] text-white/[0.09] rotate-[-8deg] hidden md:block">
        <OpenBookSVG />
      </div>

      {/* Sağ orta — defter */}
      <div className="absolute -right-4 top-[38%] w-20 h-[100px] text-white/[0.09] rotate-[12deg] hidden md:block">
        <NotebookSVG />
      </div>

      {/* Sol alt — hokka */}
      <div className="absolute left-10 bottom-24 w-14 h-[65px] text-white/[0.11] rotate-[-10deg]">
        <InkwellSVG />
      </div>

      {/* Sağ alt — kalem ucu */}
      <div className="absolute right-16 bottom-20 w-10 h-[64px] text-white/[0.12] rotate-[15deg]">
        <PenNibSVG />
      </div>

      {/* Mürekkep damlaları — köşelere dağılmış */}
      <div className="absolute left-[22%] top-[18%] w-5 h-7 text-white/[0.10] rotate-[30deg]">
        <InkDropSVG />
      </div>
      <div className="absolute right-[20%] top-[30%] w-4 h-6 text-white/[0.09] -rotate-[20deg] hidden lg:block">
        <InkDropSVG />
      </div>
      <div className="absolute left-[40%] bottom-[22%] w-3 h-5 text-white/[0.08] rotate-[45deg] hidden lg:block">
        <InkDropSVG />
      </div>
    </div>
  )
}
