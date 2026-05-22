'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lightbulb, Lock, MessageSquare, X } from 'lucide-react'
import { TipTapEditor } from './TipTapEditor'
import { SubmitButton } from './SubmitButton'
import { CommentPanel } from './CommentPanel'
import { PresenceBar } from './PresenceBar'
import { PomodoroTimer } from './PomodoroTimer'
import { createClient } from '@/lib/supabase/client'
import type { Chapter } from '@/types'

interface Props {
  chapter: Chapter
  projectId: string
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  initialContent: string
  memberIds?: string[]
  isOwner?: boolean
  locked?: boolean
  submissionId?: string
}

export function ChapterEditorClient({ chapter, projectId, currentUser, initialContent, memberIds = [], isOwner = false, locked = false, submissionId }: Props) {
  const [wordCount, setWordCount] = useState(chapter.word_count)
  const initialWordCount = chapter.word_count ?? 0
  const [pendingSuggestions, setPendingSuggestions] = useState(0)
  const [showComments, setShowComments] = useState(false)
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
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Chapter title bar */}
      <div className="px-3 sm:px-8 py-2.5 sm:py-3 border-b border-border bg-surface flex items-center gap-2 sm:gap-4">
        <h1 className="font-display text-sm sm:text-lg font-semibold truncate flex-1 min-w-0">{chapter.title}</h1>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {submissionId && !locked && (
            <SubmitButton submissionId={submissionId} />
          )}
          {locked && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <Lock className="w-3 h-3" /> Kilitli
            </span>
          )}
          {/* Pomodoro timer */}
          <div className="hidden sm:flex">
            <PomodoroTimer />
          </div>

          {/* Bekleyen öneriler */}
          {pendingSuggestions > 0 && (
            <Link
              href={`/projects/${projectId}/write/${chapter.id}/suggestions-list`}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/25 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{pendingSuggestions} öneri var</span>
              <span className="sm:hidden">{pendingSuggestions}</span>
            </Link>
          )}

          {/* Öneri yap */}
          <Link
            href={`/projects/${projectId}/write/${chapter.id}/suggest`}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-white/20 text-xs transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Öneri Yap</span>
          </Link>

          {/* Mobil: yorum toggle */}
          <button
            onClick={() => setShowComments(v => !v)}
            className="lg:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-white/20 text-xs transition-colors"
            title="Yorumlar"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Presence + word count */}
      <PresenceBar
        chapterId={chapter.id}
        currentUser={currentUser}
        wordCount={wordCount}
        initialWordCount={initialWordCount}
      />

      {/* Editor + Comments */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-hidden">
          <TipTapEditor
            chapterId={chapter.id}
            projectId={projectId}
            initialContent={initialContent}
            chapterTitle={chapter.title}
            onWordCountChange={setWordCount}
            editable={!locked}
          />
        </div>

        {/* Desktop: always visible comment panel */}
        <div className="hidden lg:flex">
          <CommentPanel
            chapterId={chapter.id}
            projectId={projectId}
            currentUserId={currentUser.id}
            projectMemberIds={memberIds}
            isOwner={isOwner}
          />
        </div>

        {/* Mobile: overlay comment panel */}
        {showComments && (
          <div className="lg:hidden absolute inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowComments(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-xs flex flex-col bg-surface border-l border-border">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium">Yorumlar</span>
                <button onClick={() => setShowComments(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <CommentPanel
                  chapterId={chapter.id}
                  projectId={projectId}
                  currentUserId={currentUser.id}
                  projectMemberIds={memberIds}
                  isOwner={isOwner}
                  hideBorder
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
