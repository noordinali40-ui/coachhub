'use client'

import { useActionState } from 'react'
import { Users } from 'lucide-react'
import { joinCommunityAction } from '@/lib/actions/community'
import { SubmitButton } from '@/components/ui/submit-button'
import { FormMessage } from '@/components/ui/field'

export function JoinCommunityButton({ communityId }: { communityId: string }) {
  const [state, action] = useActionState(joinCommunityAction, null)

  return (
    <form action={action} className="space-y-2">
      {state?.message ? (
        <FormMessage tone={state.ok ? 'success' : 'error'}>
          {state.message}
        </FormMessage>
      ) : null}
      <input type="hidden" name="communityId" value={communityId} />
      <SubmitButton block pendingLabel="Joining…">
        <Users aria-hidden />
        Join this community
      </SubmitButton>
    </form>
  )
}
