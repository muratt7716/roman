'use client'

import { useState } from 'react'
import { Star, Printer } from 'lucide-react'
import { MAGAZINE_SECTION_LABELS, type MagazineSection } from '@/types'

interface Props {
  title: string
  issueNumber: number
  classroomName: string
  schoolName: string
  publishedAt: string
  sections: MagazineSection[]
}

export function MagazineReader({ title, issueNumber, classroomName, schoolName, publishedAt, sections }: Props) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '')

  const current = sections.find(s => s.id === activeSection) ?? sections[0]

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
      {/* Kapak başlık */}
      <div className="border-b border-white/[0.06] bg-gradient-to-r from-primary/10 to-transparent px-6 py-6 print:py-12 print:border-none">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-1 print:text-black">{schoolName} · {classroomName}</p>
          <h1 className="text-3xl font-display font-black text-white print:text-black">{title}</h1>
          <p className="text-sm text-slate-400 mt-1 print:text-gray-600">
            Sayı #{issueNumber} · {new Date(publishedAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex flex-1 max-w-4xl mx-auto w-full px-4 py-6 gap-6">
        {/* Sidebar — bölüm nav */}
        <nav className="w-40 shrink-0 print:hidden">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Bölümler</p>
          <div className="space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${s.id === activeSection ? 'bg-primary/15 text-primary font-medium' : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'}`}
              >
                {MAGAZINE_SECTION_LABELS[s.type]}
                <span className="text-[10px] text-slate-500 ml-1">({s.entries?.length ?? 0})</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="mt-6 w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/[0.12] transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> PDF / Çıktı
          </button>
        </nav>

        {/* İçerik */}
        <div className="flex-1 min-w-0 space-y-8 print:space-y-12">
          {current && (
            <>
              <h2 className="text-lg font-display font-bold text-white print:text-black border-b border-white/[0.06] pb-3">
                {MAGAZINE_SECTION_LABELS[current.type]}
              </h2>

              {/* Öne çıkanlar önce */}
              {(current.entries ?? []).filter(e => e.is_featured).map(entry => (
                <article key={entry.id} className="space-y-3 print:break-after-page">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" />
                    <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Öne Çıkan</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white print:text-black">
                    {entry.submission?.assignment?.title}
                  </h3>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    {entry.display_name ?? 'Anonim'}
                  </p>
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed print:text-black print:prose-neutral"
                    dangerouslySetInnerHTML={{ __html: entry.submission?.latest_content ?? '<p><em>İçerik bulunamadı.</em></p>' }}
                  />
                </article>
              ))}

              {/* Diğerleri */}
              {(current.entries ?? []).filter(e => !e.is_featured).map(entry => (
                <article key={entry.id} className="space-y-2 border-t border-white/[0.04] pt-6 print:break-before-page">
                  <h3 className="text-base font-display font-semibold text-white print:text-black">
                    {entry.submission?.assignment?.title}
                  </h3>
                  <p className="text-xs text-slate-400 print:text-gray-600">{entry.display_name ?? 'Anonim'}</p>
                  <div
                    className="prose prose-invert max-w-none text-sm leading-relaxed print:text-black print:prose-neutral"
                    dangerouslySetInnerHTML={{ __html: entry.submission?.latest_content ?? '<p><em>İçerik bulunamadı.</em></p>' }}
                  />
                </article>
              ))}

              {(current.entries ?? []).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">Bu bölümde yazı yok.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
