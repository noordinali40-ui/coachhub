'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Heart, MessageSquare, Pin } from 'lucide-react'
import { addCommentAction, toggleLikeAction } from '@/lib/actions/community'
import { Avatar, Badge } from '@/components/ui/display'
import { Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn, relativeTime } from '@/lib/utils'

type CommentView = {
  id: string
  body: string
  createdAt: Date
  authorName: string
  authorAvatarUrl: string | null
}

export type PostView = {
  id: string
  body: string
  type: 'UPDATE' | 'QUESTION' | 'ACHIEVEMENT' | 'ANNOUNCEMENT'
  likeCount: number
  commentCount: number
  isPinned: boolean
  createdAt: Date
  likedByMe: boolean
  authorName: string
  authorAvatarUrl: string | null
  isCoach: boolean
  comments: CommentView[]
}

const TYPE_BADGE = {
  UPDATE: null,
  QUESTION: { tone: 'outline' as const, label: 'Question' },
  ACHIEVEMENT: { tone: 'gold' as const, label: 'Achievement 🎉' },
  ANNOUNCEMENT: { tone: 'brand' as const, label: 'Announcement' },
}

export function PostCard({
  post,
  canInteract,
}: {
  post: PostView
  canInteract: boolean
}) {
  const [likeState, likeAction] = useActionState(toggleLikeAction, null)
  const [commentState, commentAction] = useActionState(addCommentAction, null)
  const [showComments, setShowComments] = useState(false)
  const commentRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (commentState?.ok) commentRef.current?.reset()
  }, [commentState])

  const badge = TYPE_BADGE[post.type]

  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
      <header className="flex items-center gap-2">
        <Avatar name={post.authorName} src={post.authorAvatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-bold">{post.authorName}</p>
            {post.isCoach ? <Badge tone="brand">Coach</Badge> : null}
            {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
            {post.isPinned ? (
              <Pin className="size-3.5 text-[var(--color-ink-muted)]" aria-hidden />
            ) : null}
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {relativeTime(post.createdAt)}
          </p>
        </div>
      </header>

      <p className="mt-3 whitespace-pre-line">{post.body}</p>

      <div className="mt-3 flex items-center gap-1 border-t border-[var(--color-border-subtle)] pt-2">
        <form action={likeAction}>
          <input type="hidden" name="postId" value={post.id} />
          <button
            type="submit"
            disabled={!canInteract}
            aria-pressed={post.likedByMe}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-sm font-semibold disabled:opacity-50',
              post.likedByMe
                ? 'text-[var(--color-brand)]'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]',
            )}
          >
            <Heart
              className={cn('size-4', post.likedByMe && 'fill-current')}
              aria-hidden
            />
            {post.likeCount}
            <span className="sr-only">likes</span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowComments((open) => !open)}
          aria-expanded={showComments}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-sm font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
        >
          <MessageSquare className="size-4" aria-hidden />
          {post.commentCount}
          <span className="sr-only">comments</span>
        </button>
      </div>

      {likeState?.message && !likeState.ok ? (
        <p className="mt-1 text-xs text-red-600">{likeState.message}</p>
      ) : null}

      {showComments ? (
        <div className="mt-3 space-y-3 border-t border-[var(--color-border-subtle)] pt-3">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar
                name={comment.authorName}
                src={comment.authorAvatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] px-3 py-2">
                <p className="text-sm font-bold">{comment.authorName}</p>
                <p className="text-sm">{comment.body}</p>
              </div>
            </div>
          ))}

          {post.commentCount > post.comments.length ? (
            <p className="text-xs text-[var(--color-ink-muted)]">
              Showing {post.comments.length} of {post.commentCount} comments.
            </p>
          ) : null}

          {canInteract ? (
            <form ref={commentRef} action={commentAction} className="flex gap-2">
              <input type="hidden" name="postId" value={post.id} />
              <Input
                name="body"
                required
                maxLength={1000}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className="flex-1"
              />
              <SubmitButton size="md" variant="secondary" pendingLabel="…">
                Send
              </SubmitButton>
            </form>
          ) : null}

          {commentState?.errors?.body ? (
            <p className="text-xs text-red-600">{commentState.errors.body[0]}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
