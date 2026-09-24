import type { Metadata } from 'next'
import { Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Application received' }

export default async function CoachPendingPage() {
  const user = await requireUser()

  const coach = user.coachId
    ? await prisma.coach.findUnique({
        where: { id: user.coachId },
        select: { status: true, slug: true },
      })
    : null

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-clay-50 text-[var(--color-brand)] dark:bg-sand-800">
        <Clock className="size-6" aria-hidden />
      </span>

      {coach?.status === 'APPROVED' ? (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            You’re approved 🎉
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Your coach page is live. Set up a program and invite your first
            students.
          </p>
          <ButtonLink href="/coach" size="lg">
            Go to your dashboard
          </ButtonLink>
        </>
      ) : coach?.status === 'REJECTED' ? (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            We couldn’t approve this application
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Reply to the email we sent if you think this was a mistake.
          </p>
          <ButtonLink href="/home" variant="outline">
            Back to home
          </ButtonLink>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Application received
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            We review every coach before their page goes live, so students know
            who they’re training with. This usually takes a day or two.
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Your community has already been created — it appears once you’re
            approved.
          </p>
          <ButtonLink href="/home" variant="outline">
            Back to home
          </ButtonLink>
        </>
      )}
    </main>
  )
}
