import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/dal'
import { Avatar, Badge, EmptyState, ProgressBar } from '@/components/ui/display'
import { QueryTabs } from '@/components/ui/tabs'
import { daysBetween, percent, today } from '@/lib/utils'

export const metadata: Metadata = { title: 'Your students' }

export default async function CoachStudentsPage(
  props: PageProps<'/coach/students'>,
) {
  const { coach } = await requireCoach()
  const { tab } = await props.searchParams
  const filter = typeof tab === 'string' ? tab : 'active'

  // Scoped to this coach's programs. This filter is the only thing standing
  // between one coach and another coach's student list.
  const enrollments = await prisma.enrollment.findMany({
    where: {
      program: { coachId: coach.id },
      ...(filter === 'completed' ? { status: 'COMPLETED' } : {}),
      ...(filter === 'active' ? { status: 'ACTIVE' } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      status: true,
      userId: true,
      completedTasks: true,
      totalTasks: true,
      streakDays: true,
      lastActivityOn: true,
      startedOn: true,
      user: {
        select: {
          profile: {
            select: { fullName: true, avatarUrl: true, countryCode: true },
          },
        },
      },
      program: { select: { title: true } },
    },
  })

  const inactive =
    filter === 'inactive'
      ? enrollments.filter(
          (e) =>
            !e.lastActivityOn || daysBetween(e.lastActivityOn, today()) >= 3,
        )
      : enrollments

  const [activeCount, completedCount] = await Promise.all([
    prisma.enrollment.count({
      where: { program: { coachId: coach.id }, status: 'ACTIVE' },
    }),
    prisma.enrollment.count({
      where: { program: { coachId: coach.id }, status: 'COMPLETED' },
    }),
  ])

  const rows = filter === 'inactive' ? inactive : enrollments

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Students</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Everyone enrolled on one of your programs.
        </p>
      </header>

      <QueryTabs
        tabs={[
          { key: 'active', label: 'Active', count: activeCount },
          { key: 'inactive', label: 'Gone quiet' },
          { key: 'completed', label: 'Completed', count: completedCount },
          { key: 'all', label: 'All' },
        ]}
      />

      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((enrollment) => {
            const name = enrollment.user.profile?.fullName ?? 'Student'
            const daysQuiet = enrollment.lastActivityOn
              ? daysBetween(enrollment.lastActivityOn, today())
              : null

            return (
              <li key={enrollment.id}>
                <Link
                  href={`/coach/students/${enrollment.userId}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
                >
                  <Avatar
                    name={name}
                    src={enrollment.user.profile?.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{name}</p>
                    <p className="truncate text-xs text-[var(--color-ink-muted)]">
                      {enrollment.program.title}
                    </p>
                    <ProgressBar
                      value={enrollment.completedTasks}
                      total={enrollment.totalTasks}
                      label={`${name} progress`}
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)] tabular-nums">
                      {enrollment.completedTasks}/{enrollment.totalTasks} tasks ·{' '}
                      {percent(enrollment.completedTasks, enrollment.totalTasks)}
                      %
                      {daysQuiet !== null && daysQuiet >= 3
                        ? ` · quiet ${daysQuiet}d`
                        : ''}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    {enrollment.streakDays > 0 ? (
                      <Badge tone="gold">{enrollment.streakDays}d 🔥</Badge>
                    ) : null}
                    {enrollment.status === 'COMPLETED' ? (
                      <Badge tone="success">Done</Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          title={
            filter === 'inactive'
              ? 'Everyone is active'
              : 'No students in this view'
          }
          description={
            filter === 'inactive'
              ? 'Nobody has been quiet for three days or more.'
              : undefined
          }
        />
      )}
    </div>
  )
}
