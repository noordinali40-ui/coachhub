'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createPostAction } from '@/lib/actions/community'
import { FormMessage, Select, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'

export function PostComposer({
  communityId,
  canAnnounce,
}: {
  communityId: string
  canAnnounce: boolean
}) {
  const [state, action] = useActionState(createPostAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the box once the post lands, so the text does not sit there looking
  // unsent after the feed above has already updated.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
    >
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <input type="hidden" name="communityId" value={communityId} />

      <Textarea
        name="body"
        rows={3}
        required
        maxLength={2000}
        placeholder="Share your progress, ask a question, cheer someone on…"
        aria-label="Write a post"
      />
      {state?.errors?.body ? (
        <p className="text-xs text-red-600">{state.errors.body[0]}</p>
      ) : null}

      <div className="flex gap-2">
        <Select name="type" defaultValue="UPDATE" aria-label="Post type" className="flex-1">
          <option value="UPDATE">Progress update</option>
          <option value="QUESTION">Question</option>
          <option value="ACHIEVEMENT">Achievement 🎉</option>
          {canAnnounce ? <option value="ANNOUNCEMENT">Announcement</option> : null}
        </Select>
        <SubmitButton pendingLabel="Posting…">Post</SubmitButton>
      </div>
    </form>
  )
}
