'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Trophy } from 'lucide-react'
import {
  joinChallengeAction,
  logChallengeEntryAction,
} from '@/lib/actions/challenges'
import { FormMessage, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'

export function ChallengeActions({
  challengeId,
  unit,
  isMember,
  isOpen,
}: {
  challengeId: string
  unit: string
  isMember: boolean
  isOpen: boolean
}) {
  const [joinState, joinAction] = useActionState(joinChallengeAction, null)
  const [logState, logAction] = useActionState(logChallengeEntryAction, null)
  const logRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (logState?.ok) logRef.current?.reset()
  }, [logState])

  if (!isOpen) {
    return (
      <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-ink-muted)]">
        This challenge has finished. The final board is below.
      </p>
    )
  }

  if (!isMember) {
    return (
      <form action={joinAction} className="space-y-2">
        {joinState?.message ? (
          <FormMessage tone={joinState.ok ? 'success' : 'error'}>
            {joinState.message}
          </FormMessage>
        ) : null}
        <input type="hidden" name="challengeId" value={challengeId} />
        <SubmitButton block size="lg" pendingLabel="Joining…">
          <Trophy aria-hidden />
          Join this challenge
        </SubmitButton>
      </form>
    )
  }

  return (
    <form
      ref={logRef}
      action={logAction}
      className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
    >
      {logState?.message ? (
        <FormMessage tone={logState.ok ? 'success' : 'error'}>
          {logState.message}
        </FormMessage>
      ) : null}

      <input type="hidden" name="challengeId" value={challengeId} />

      <label htmlFor="value" className="block text-sm font-semibold">
        Log today ({unit})
      </label>
      <div className="flex gap-2">
        <Input
          id="value"
          name="value"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          placeholder={`e.g. 6500`}
          className="flex-1"
        />
        <SubmitButton pendingLabel="Saving…">Log</SubmitButton>
      </div>

      {logState?.errors?.value ? (
        <p className="text-xs text-red-600">{logState.errors.value[0]}</p>
      ) : null}

      <p className="text-xs text-[var(--color-ink-muted)]">
        One entry per day. Logging again replaces today’s number.
      </p>
    </form>
  )
}
