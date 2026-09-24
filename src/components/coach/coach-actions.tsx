'use client'

import { useActionState } from 'react'
import { Heart, MessageCircle, Users } from 'lucide-react'
import { followCoachAction } from '@/lib/actions/coach'
import { startConversationAction } from '@/lib/actions/messaging'
import { joinCommunityAction } from '@/lib/actions/community'
import { ButtonLink } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { FormMessage } from '@/components/ui/field'

/**
 * Follow / Message / Join community, each its own form so one failing action
 * does not block the others.
 */
export function CoachActions({
  coachId,
  coachUserId,
  isFollowing,
  isSignedIn,
  isSelf,
  primaryCommunity,
}: {
  coachId: string
  coachUserId: string
  isFollowing: boolean
  isSignedIn: boolean
  isSelf: boolean
  primaryCommunity: { id: string; slug: string; joined: boolean } | null
}) {
  const [followState, followAction] = useActionState(followCoachAction, null)
  const [messageState, messageAction] = useActionState(
    startConversationAction,
    null,
  )
  const [joinState, joinAction] = useActionState(joinCommunityAction, null)

  if (!isSignedIn) {
    return (
      <div className="flex gap-2">
        <ButtonLink href="/signup" block>
          Join free to start
        </ButtonLink>
      </div>
    )
  }

  if (isSelf) {
    return (
      <div className="flex gap-2">
        <ButtonLink href="/coach" variant="outline" block>
          Go to your dashboard
        </ButtonLink>
      </div>
    )
  }

  const error =
    followState?.message ?? messageState?.message ?? joinState?.message

  return (
    <div className="space-y-2">
      {error && !joinState?.ok ? <FormMessage>{error}</FormMessage> : null}

      <div className="flex flex-wrap gap-2">
        <form action={followAction}>
          <input type="hidden" name="coachId" value={coachId} />
          <SubmitButton
            variant={isFollowing ? 'secondary' : 'outline'}
            pendingLabel="…"
          >
            <Heart
              className={isFollowing ? 'fill-current' : undefined}
              aria-hidden
            />
            {isFollowing ? 'Following' : 'Follow'}
          </SubmitButton>
        </form>

        <form action={messageAction}>
          <input type="hidden" name="userId" value={coachUserId} />
          <SubmitButton variant="outline" pendingLabel="Opening…">
            <MessageCircle aria-hidden />
            Message
          </SubmitButton>
        </form>

        {primaryCommunity ? (
          primaryCommunity.joined ? (
            <ButtonLink
              href={`/community/${primaryCommunity.slug}`}
              variant="outline"
            >
              <Users aria-hidden />
              Open community
            </ButtonLink>
          ) : (
            <form action={joinAction}>
              <input
                type="hidden"
                name="communityId"
                value={primaryCommunity.id}
              />
              <SubmitButton variant="outline" pendingLabel="Joining…">
                <Users aria-hidden />
                Join community
              </SubmitButton>
            </form>
          )
        ) : null}
      </div>
    </div>
  )
}
