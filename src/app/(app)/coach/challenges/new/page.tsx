import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/dal'
import { ChallengeForm } from './challenge-form'

export const metadata: Metadata = { title: 'Create a challenge' }

export default async function NewChallengePage() {
  const { coach } = await requireCoach()

  const communities = await prisma.community.findMany({
    where: { coachId: coach.id },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Create a challenge
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Challenges give your community something to do together. Boards rank
          consistency and improvement, not just the biggest numbers.
        </p>
      </header>

      <ChallengeForm communities={communities} />
    </div>
  )
}
