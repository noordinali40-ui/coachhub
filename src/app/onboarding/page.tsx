import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = { title: 'What do you want to improve?' }

export default async function OnboardingPage() {
  const user = await requireUser()
  if (user.onboarded) redirect('/home')

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { slug: true, name: true, emoji: true, description: true },
  })

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-10">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold text-[var(--color-brand)]">
          Hello, {user.fullName.split(' ')[0]} 👋
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          What do you want to improve?
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Pick up to four. We’ll use these to suggest coaches and programs — you
          can change them any time.
        </p>
      </div>

      <OnboardingForm categories={categories} />
    </main>
  )
}
