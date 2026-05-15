'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { TipTapEditor } from './TipTapEditor'
import { CommentPanel } from './CommentPanel'
import { PresenceBar } from './PresenceBar'
import { createClient } from '@/lib/supabase/client'
import type { Chapter } from '@/types'

interface Props {
  chapter: Chapter
  projectId: string
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  initialContent: string
  memberIds?: string[]
}

export function ChapterEditorClient({ chapter, projectId, currentUser, initialContent, memberIds = [] }: Props) {
  const [wordCount, setWordCount] = useState(chapter.word_count)
  const [pendingSuggestions, setPendingSuggestions] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('chapter_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('chapter_id', chapter.id)
      .eq('status', 'pending')
      .then(({ count }) => setPendingSuggestions(count ?? 0))

    const channel = supabase
      .channel(`suggestions:${chapter.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chapter_suggestions',
        filter: `chapter_id=eq.${chapter.id}`,
      }, () => {
        supabase
          .from('chapter_suggestions')
          .select('id', { count: 'exact', head: true })
          .eq('chapter_id', chapter.id)
          .eq('status', 'pending')
          .then(({ count }) => setPendingSuggestions(count ?? 0))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chapter.id, supabase])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Chapter title bar */}
      <div className="px-8 py-3 border-b border-border bg-surface flex items-center gap-4">
        <h1 className="font-display text-lg font-semibold truncate flex-1">{chapter.title}</h1>

        <div className="flex items-center gap-2">
          {/* Bekleyen öneriler */}
          {pendingSuggestions > 0 && (
            <Link
              href={`/projects/${projectId}/write/${chapter.id}/suggestions-list`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/25 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              {pendingSuggestions} öneri var
            </Link>
          )}

          {/* Öneri yap */}
          <Link
            href={`/projects/${projectId}/write/${chapter.id}/suggest`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-white/20 text-xs transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Öneri Yap
          </Link>
        </div>
      </div>

      {/* Presence + word count */}
      <PresenceBar
        chapterId={chapter.id}
        currentUser={currentUser}
        wordCount={wordCount}
      />

      {/* Editor + Comments */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <TipTapEditor
            chapterId={chapter.id}
            projectId={projectId}
            initialContent={initialContent}
            onWordCountChange={setWordCount}
          />
        </div>
        <CommentPanel chapterId={chapter.id} currentUserId={currentUser.id} projectMemberIds={memberIds} />
      </div>
    </div>
  )
}
