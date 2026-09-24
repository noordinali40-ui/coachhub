import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Flame, Search, Trophy } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireOnboardedUser } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import {
  Badge,
  EmptyState,
  ProgressRing,
  SectionHeading,
  Stat,
} from '@/components/ui/display'
import { TaskList, type TaskView } from '@/components/program/task-list'
import { CoachCard } from '@/components/coach/coach-card'
import { daysBetween, percent, today } from '@/lib/utils'

export const metadata: Metadata = { title: 'Home' }

export default async function HomePage() {
  const user = await requireOnboardedUser()

  const [enrollments, goals, challenges] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        startedOn: true,
        currentDay: true,
        completedTasks: true,
        totalTasks: true,
        streakDays: true,
        status: true,
        program: {
          select: {
            id: true,
            title: true,
            durationDays: true,
            coach: {
              select: {
                slug: true,
                user: { select: { profile: { select: { fullName: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: { goals: true },
    }),
    prisma.challengeMember.findMany({
      where: { userId: user.id, challenge: { status: 'ACTIVE' } },
      take: 3,
      select: {
        totalValue: true,
        challenge: {
          select: { slug: true, title: true, goalValue: true, unit: true },
        },
      },
    }),
  ])

  const active = enrollments.filter((e) => e.status === 'ACTIVE')
  const primary = active[0]

  // "Today" is a day offset into the program, so a student who started three
  // days ago sees day 3 rather than the calendar date.
  const dayNumber = primary
    ? Math.min(
        primary.program.durationDays,
        Math.max(1, daysBetween(primary.startedOn, today()) + 1),
      )
    : 0

  const todaysTasks: TaskView[] = primary
    ? await prisma.task
        .findMany({
          where: { programId: primary.program.id, dayNumber },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            targetValue: true,
            unit: true,
            required: true,
            progress: {
              where: { enrollmentId: primary.id },
              select: { id: true },
            },
          },
        })
        .then((tasks) =>
          tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            targetValue: task.targetValue ? Number(task.targetValue) : null,
            unit: task.unit,
            required: task.required,
            done: task.progress.length > 0,
          })),
        )
    : []

  const recommendedCoaches = await prisma.coach.findMany({
    where: {
      status: 'APPROVED',
      ...(goals?.goals.length
        ? { categories: { some: { categorySlug: { in: goals.goals } } } }
        : {}),
    },
    orderBy: [{ ratingAvg: 'desc' }, { studentCount: 'desc' }],
    take: 4,
    select: {
      slug: true,
      headline: true,
      verification: true,
      ratingAvg: true,
      ratingCount: true,
      studentCount: true,
      user: {
        select: {
          profile: {
            select: { fullName: true, avatarUrl: true, countryCode: true },
          },
        },
      },
      categories: {
        select: { category: { select: { name: true, emoji: true } } },
      },
    },
  })

  const doneToday = todaysTasks.filter((t) => t.done).length

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Hello, {user.fullName.split(' ')[0]} 👋
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {primary ? 'Here’s today.' : 'What do you want to improve?'}
          </h1>
        </div>

        <Link
          href="/discover"
          className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink-muted)]"
        >
          <Search className="size-4" aria-hidden />
          <span className="text-sm">Search coaches, programs…</span>
        </Link>
      </header>

      {primary ? (
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-start gap-4">
              <ProgressRing
                value={primary.completedTasks}
                total={primary.totalTasks}
                label={`${primary.program.title} progress`}
              >
                <span className="text-center leading-tight">
                  <span className="block text-lg font-extrabold">
                    {percent(primary.completedTasks, primary.totalTasks)}%
                  </span>
                  <span className="block text-[10px] text-[var(--color-ink-muted)]">
                    done
                  </span>
                </span>
              </ProgressRing>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/my/${primary.id}`}
                  className="block truncate font-bold hover:underline"
                >
                  {primary.program.title}
                </Link>
                <p className="truncate text-sm text-[var(--color-ink-muted)]">
                  with{' '}
                  {primary.program.coach.user.profile?.fullName ?? 'your coach'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="outline">
                    Day {dayNumber} of {primary.program.durationDays}
                  </Badge>
                  {primary.streakDays > 0 ? (
                    <Badge tone="gold">
                      <Flame className="size-3" aria-hidden />
                      {primary.streakDays} day streak
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-bold">Today’s tasks</h2>
                <span className="text-sm text-[var(--color-ink-muted)] tabular-nums">
                  {doneToday}/{todaysTasks.length}
                </span>
              </div>

              {todaysTasks.length > 0 ? (
                <TaskList enrollmentId={primary.id} tasks={todaysTasks} />
              ) : (
                <p className="rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-ink-muted)]">
                  Nothing scheduled for today — a rest day. Keep your streak by
                  logging a metric on your{' '}
                  <Link href={`/my/${primary.id}`} className="font-semibold underline">
                    program page
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Streak" value={`${primary.streakDays}d`} />
              <Stat
                label="Completed"
                value={`${primary.completedTasks}/${primary.totalTasks}`}
              />
              <Stat label="Programs" value={active.length} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="You haven’t joined a program yet"
          description="Find a coach who works on what you want to improve, and start with their program."
          action={<ButtonLink href="/discover">Find a coach</ButtonLink>}
        />
      )}

      {challenges.length > 0 ? (
        <section>
          <SectionHeading title="Your challenges" />
          <div className="space-y-2">
            {challenges.map(({ challenge, totalValue }) => (
              <Link
                key={challenge.slug}
                href={`/challenges/${challenge.slug}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
              >
                <Trophy
                  className="size-5 shrink-0 text-harvest-500"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{challenge.title}</p>
                  <p className="text-sm text-[var(--color-ink-muted)] tabular-nums">
                    {Number(totalValue).toLocaleString()} /{' '}
                    {Number(challenge.goalValue).toLocaleString()}{' '}
                    {challenge.unit}
                  </p>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-[var(--color-ink-muted)]"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recommendedCoaches.length > 0 ? (
        <section>
          <SectionHeading
            title="Coaches for your goals"
            action={
              <Link
                href="/discover"
                className="text-sm font-semibold text-[var(--color-brand)]"
              >
                See all
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendedCoaches.map((coach) => (
              <CoachCard
                key={coach.slug}
                coach={{
                  slug: coach.slug,
                  headline: coach.headline,
                  verification: coach.verification,
                  ratingAvg: Number(coach.ratingAvg),
                  ratingCount: coach.ratingCount,
                  studentCount: coach.studentCount,
                  fullName: coach.user.profile?.fullName ?? 'Coach',
                  avatarUrl: coach.user.profile?.avatarUrl ?? null,
                  countryCode: coach.user.profile?.countryCode ?? null,
                  categories: coach.categories.map((c) => c.category),
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
