'use client'

import { useActionState } from 'react'
import { saveCoachNoteAction } from '@/lib/actions/coach'
import { FormMessage, Textarea } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'

export function CoachNoteForm({
  studentId,
  initialBody,
}: {
  studentId: string
  initialBody: string
}) {
  const [state, action] = useActionState(saveCoachNoteAction, null)

  return (
    <form action={action} className="space-y-2">
      {state?.message ? (
        <FormMessage tone={state.ok ? 'success' : 'error'}>
          {state.message}
        </FormMessage>
      ) : null}

      <input type="hidden" name="studentId" value={studentId} />
      <Textarea
        name="body"
        rows={4}
        defaultValue={initialBody}
        maxLength={2000}
        placeholder="Injuries to work around, what motivates them, what to check next session…"
        aria-label="Private notes about this student"
      />
      {state?.errors?.body ? (
        <p className="text-xs text-red-600">{state.errors.body[0]}</p>
      ) : null}

      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save note
      </SubmitButton>
    </form>
  )
}
