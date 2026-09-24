'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { sendMessageAction } from '@/lib/actions/messaging'
import { FormMessage, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'

export function MessageComposer({
  conversationId,
}: {
  conversationId: string
}) {
  const [state, action] = useActionState(sendMessageAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <div className="sticky bottom-16 space-y-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-background)] pt-3 md:bottom-0">
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}

      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <Input
          name="body"
          required
          maxLength={4000}
          autoComplete="off"
          placeholder="Write a message…"
          aria-label="Message"
          className="flex-1"
        />
        <SubmitButton size="icon" aria-label="Send" pendingLabel="">
          <Send aria-hidden />
        </SubmitButton>
      </form>

      <p className="text-xs text-[var(--color-ink-muted)]">
        Text-first so it works on a weak connection. Voice notes are coming.
      </p>
    </div>
  )
}
