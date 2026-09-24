import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, EmptyState, Stat } from '@/components/ui/display'
import { formatPrice, percent } from '@/lib/utils'

export const metadata: Metadata = { title: 'Your programs' }

export default async function CoachProgramsPage() {
  const { coach } = await requireCoach()

  const programs = await prisma.program.findMany({
    where: { coachId: coach.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      durationDays: true,
      priceCents: true,
      currency: true,
      enrollmentCount: true,
      ratingAvg: true,
      ratingCount: true,
      category: { select: { name: true, emoji: true } },
      _count: { select: { tasks: true, modules: true } },
      enrollments: {
        select: { completedTasks: true, totalTasks: true, status: true },
      },
    },
  })

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Programs</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          The structured plans your students follow.
        </p>
      </header>

      {programs.length > 0 ? (
        <div className="space-y-3">
          {programs.map((program) => {
            const active = program.enrollments.filter(
              (e) => e.status === 'ACTIVE',
            )
            const avgCompletion =
              active.length > 0
                ? Math.round(
                    active.reduce(
                      (sum, e) => sum + percent(e.completedTasks, e.totalTasks),
                      0,
                    ) / active.length,
                  )
                : 0

            return (
              <Card key={program.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/programs/${program.id}`}
                        className="font-bold hover:underline"
                      >
                        {program.title}
                      </Link>
                      <p className="line-clamp-1 text-sm text-[var(--color-ink-muted)]">
                        {program.summary}
                      </p>
                    </div>
                    <Badge
                      tone={
                        program.status === 'PUBLISHED' ? 'success' : 'neutral'
                      }
                    >
                      {program.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="brand">
                      <span aria-hidden>{program.category.emoji}</span>
                      {program.category.name}
                    </Badge>
                    <Badge tone="outline">{program.durationDays} days</Badge>
                    <Badge tone="outline">
                      {formatPrice(program.priceCents, program.currency)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="Enrolled" value={program.enrollmentCount} />
                    <Stat label="Active" value={active.length} />
                    <Stat label="Avg. done" value={`${avgCompletion}%`} />
                    <Stat
                      label="Rating"
                      value={
                        program.ratingCount > 0
                          ? Number(program.ratingAvg).toFixed(1)
                          : '—'
                      }
                    />
                  </div>

                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {program._count.modules} weeks · {program._count.tasks}{' '}
                    tasks
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="No programs yet"
          description="Programs are seeded for the demo. The in-app program builder is the next thing to build."
        />
      )}

      <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-ink-muted)]">
        The visual program builder (add weeks, lessons and tasks in the app)
        isn’t built yet — programs currently come from the seed script.
      </p>
    </div>
  )
}
