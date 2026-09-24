'use client'

import { useActionState } from 'react'
import { joinProgramAction } from '@/lib/actions/enrollment'
import { SubmitButton } from '@/components/ui/submit-button'
import { FormMessage } from '@/components/ui/field'

export function JoinProgramButton({
  programId,
  isFree,
}: {
  programId: string
  isFree: boolean
}) {
  const [state, action] = useActionState(joinProgramAction, null)

  return (
    <form action={action} className="space-y-2">
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <input type="hidden" name="programId" value={programId} />
      <SubmitButton size="lg" block pendingLabel="Joining…">
        {isFree ? 'Join this program' : 'Get this program'}
      </SubmitButton>
    </form>
  )
}
