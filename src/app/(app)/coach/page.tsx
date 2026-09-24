import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Plus, TrendingUp, Trophy, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import {
  Avatar,
  Badge,
  EmptyState,
  ProgressBar,
  SectionHeading,
  Stat,
} from '@/components/ui/display'
import { daysBetween, percent, today } from '@/lib/utils'

export const metadata: Metadata = { title: 'Coach dashboard' }

export default async function CoachDashboardPage() {
  const { user, coach } = await requireCoach()

  const [enrollments, programs, challenges, community, pendingOrders] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { program: { coachId: coach.id } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          status: true,
          completedTasks: true,
          totalTasks: true,
          streakDays: true,
          lastActivityOn: true,
          userId: true,
          user: {
            select: { profile: { select: { fullName: true, avatarUrl: true } } },
          },
          program: { select: { title: true } },
        },
      }),
      prisma.program.findMany({
        where: { coachId: coach.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          enrollmentCount: true,
          durationDays: true,
        },
      }),
      prisma.challenge.count({
        where: { coachId: coach.id, status: 'ACTIVE' },
      }),
      prisma.community.findFirst({
        where: { coachId: coach.id },
        select: { slug: true, name: true, memberCount: true },
      }),
      prisma.order.count({
        where: { coachId: coach.id, status: 'PENDING' },
      }),
    ])

  const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE')

  // "Needs a nudge" is the dashboard's most useful signal: who has gone quiet.
  const needsAttention = activeEnrollments.filter((e) => {
    if (!e.lastActivityOn) return true
    return daysBetween(e.lastActivityOn, today()) >= 3
  })

  const averageCompletion =
    activeEnrollments.length > 0
      ? Math.round(
          activeEnrollments.reduce(
            (sum, e) => sum + percent(e.completedTasks, e.totalTasks),
            0,
          ) / activeEnrollments.length,
        )
      : 0

  const uniqueStudents = new Set(enrollments.map((e) => e.userId)).size

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Hello, {user.fullName.split(' ')[0]} 👋
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Your coaching space
        </h1>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Students" value={uniqueStudents} />
        <Stat label="Active now" value={activeEnrollments.length} />
        <Stat label="Avg. completion" value={`${averageCompletion}%`} />
        <Stat label="Live challenges" value={challenges} />
      </div>

      {pendingOrders > 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle
              className="size-5 shrink-0 text-harvest-700"
              aria-hidden
            />
            <p className="text-sm">
              {pendingOrders} pending {pendingOrders === 1 ? 'order' : 'orders'}.
              Payments aren’t connected yet, so paid programs can’t be completed.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <ButtonLink href="/coach/challenges/new" variant="outline">
          <Trophy aria-hidden />
          Create a challenge
        </ButtonLink>
        <ButtonLink href="/coach/programs" variant="outline">
          <Plus aria-hidden />
          Manage programs
        </ButtonLink>
      </div>

      {needsAttention.length > 0 ? (
        <section>
          <SectionHeading
            title="Needs a nudge"
            action={<Badge tone="gold">{needsAttention.length}</Badge>}
          />
          <div className="space-y-2">
            {needsAttention.slice(0, 5).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/coach/students/${enrollment.userId}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
              >
                <Avatar
                  name={enrollment.user.profile?.fullName ?? 'Student'}
                  src={enrollment.user.profile?.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {enrollment.user.profile?.fullName ?? 'Student'}
                  </p>
                  <p className="truncate text-sm text-[var(--color-ink-muted)]">
                    {enrollment.lastActivityOn
                      ? `Last active ${daysBetween(enrollment.lastActivityOn, today())} days ago`
                      : 'Hasn’t started yet'}
                  </p>
                </div>
                <Badge tone="outline">
                  {percent(enrollment.completedTasks, enrollment.totalTasks)}%
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeading
          title="Recent students"
          action={
            <Link
              href="/coach/students"
              className="text-sm font-semibold text-[var(--color-brand)]"
            >
              See all
            </Link>
          }
        />
        {activeEnrollments.length > 0 ? (
          <div className="space-y-2">
            {activeEnrollments.slice(0, 6).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/coach/students/${enrollment.userId}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
              >
                <Avatar
                  name={enrollment.user.profile?.fullName ?? 'Student'}
                  src={enrollment.user.profile?.avatarUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {enrollment.user.profile?.fullName ?? 'Student'}
                  </p>
                  <p className="truncate text-xs text-[var(--color-ink-muted)]">
                    {enrollment.program.title}
                  </p>
                  <ProgressBar
                    value={enrollment.completedTasks}
                    total={enrollment.totalTasks}
                    label="Student progress"
                    className="mt-1.5"
                  />
                </div>
                {enrollment.streakDays > 0 ? (
                  <Badge tone="gold">{enrollment.streakDays}d 🔥</Badge>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No students yet"
            description="Publish a program and share your coach page — students join from there."
            action={<ButtonLink href="/coach/programs">Your programs</ButtonLink>}
          />
        )}
      </section>

      <section>
        <SectionHeading title="Your programs" />
        {programs.length > 0 ? (
          <div className="space-y-2">
            {programs.map((program) => (
              <Link
                key={program.id}
                href={`/programs/${program.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
              >
                <TrendingUp
                  className="size-5 shrink-0 text-[var(--color-brand)]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{program.title}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {program.durationDays} days · {program.enrollmentCount}{' '}
                    joined
                  </p>
                </div>
                <Badge
                  tone={program.status === 'PUBLISHED' ? 'success' : 'neutral'}
                >
                  {program.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No programs yet" />
        )}
      </section>

      {community ? (
        <Link
          href={`/community/${community.slug}`}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
        >
          <Users className="size-5 shrink-0 text-[var(--color-brand)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{community.name}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {community.memberCount} members
            </p>
          </div>
        </Link>
      ) : null}
    </div>
  )
}
