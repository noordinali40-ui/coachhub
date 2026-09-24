import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { BecomeCoachForm } from './become-coach-form'

export const metadata: Metadata = { title: 'Become a coach' }

export default async function BecomeCoachPage() {
  const user = await requireUser()
  if (user.coachId) redirect('/coach')

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { slug: true, name: true, emoji: true },
  })

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-10">
      <div className="mb-6 space-y-2">
        <Link href="/profile" className="text-sm text-[var(--color-ink-muted)]">
          ← Back
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          Build your coaching business
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          You get a profile, programs, a community, student progress tracking,
          messaging and challenges — one space, yours.
        </p>
      </div>

      <BecomeCoachForm categories={categories} />
    </main>
  )
}
