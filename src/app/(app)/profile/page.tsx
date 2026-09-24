import type { Metadata } from 'next'
import Link from 'next/link'
import { Flame, LogOut, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { logOutAction } from '@/lib/actions/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button, ButtonLink } from '@/components/ui/button'
import { Avatar, Badge, ProgressBar, Stat } from '@/components/ui/display'
import { countryLabel, HEALTH_DISCLAIMER, METRIC_META } from '@/lib/constants'
import { percent } from '@/lib/utils'

export const metadata: Metadata = { title: 'Your profile' }

export default async function ProfilePage() {
  const user = await requireUser()

  const [profile, enrollments, metrics, challengeCount] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        fullName: true,
        avatarUrl: true,
        city: true,
        countryCode: true,
        goals: true,
        lowDataMode: true,
      },
    }),
    prisma.enrollment.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        completedTasks: true,
        totalTasks: true,
        streakDays: true,
        longestStreak: true,
        program: { select: { title: true } },
      },
    }),
    prisma.metricEntry.findMany({
      where: { userId: user.id },
      orderBy: { recordedOn: 'desc' },
      take: 40,
      select: { metric: true, value: true, unit: true, recordedOn: true },
    }),
    prisma.challengeMember.count({ where: { userId: user.id } }),
  ])

  const bestStreak = Math.max(0, ...enrollments.map((e) => e.longestStreak))
  const completed = enrollments.filter((e) => e.status === 'COMPLETED').length

  const latestByMetric = new Map<string, (typeof metrics)[number]>()
  for (const entry of metrics) {
    if (!latestByMetric.has(entry.metric)) latestByMetric.set(entry.metric, entry)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-4">
        <Avatar
          name={profile?.fullName ?? user.fullName}
          src={profile?.avatarUrl}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight">
            {profile?.fullName ?? user.fullName}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{user.email}</p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {[profile?.city, countryLabel(profile?.countryCode)]
              .filter(Boolean)
              .join(', ')}
          </p>
          {profile?.lowDataMode ? (
            <Badge tone="outline" className="mt-1.5">
              Low-data mode on
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Programs" value={enrollments.length} />
        <Stat label="Completed" value={completed} />
        <Stat label="Best streak" value={`${bestStreak}d`} />
        <Stat label="Challenges" value={challengeCount} />
      </div>

      {profile?.goals.length ? (
        <section className="space-y-2">
          <h2 className="font-bold">Your goals</h2>
          <div className="flex flex-wrap gap-1.5">
            {profile.goals.map((goal) => (
              <Link key={goal} href={`/discover?category=${goal}`}>
                <Badge tone="brand">{goal.replace(/-/g, ' ')}</Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {enrollments.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-bold">Your programs</h2>
          {enrollments.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/my/${enrollment.id}`}
              className="block rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold">
                  {enrollment.program.title}
                </p>
                <span className="shrink-0 text-sm tabular-nums text-[var(--color-ink-muted)]">
                  {percent(enrollment.completedTasks, enrollment.totalTasks)}%
                </span>
              </div>
              <ProgressBar
                value={enrollment.completedTasks}
                total={enrollment.totalTasks}
                label={enrollment.program.title}
                className="mt-1.5"
              />
              {enrollment.streakDays > 0 ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-harvest-700 dark:text-harvest-300">
                  <Flame className="size-3" aria-hidden />
                  {enrollment.streakDays} day streak
                </p>
              ) : null}
            </Link>
          ))}
        </section>
      ) : null}

      {latestByMetric.size > 0 ? (
        <section className="space-y-2">
          <h2 className="font-bold">Latest measurements</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[...latestByMetric.values()].map((entry) => (
              <Stat
                key={entry.metric}
                label={METRIC_META[entry.metric].label}
                value={`${Number(entry.value)} ${entry.unit}`}
                hint={entry.recordedOn.toISOString().slice(0, 10)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!user.coachId ? (
        <Card>
          <CardContent className="space-y-2 p-5">
            <p className="font-bold">Do you coach?</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Build your own coaching space: programs, a community, students and
              challenges — all in one place.
            </p>
            <ButtonLink href="/become-a-coach" variant="outline">
              Become a coach
            </ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <ButtonLink href="/coach" variant="outline" block>
          <ShieldCheck aria-hidden />
          Coach dashboard
        </ButtonLink>
      )}

      <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-xs text-[var(--color-ink-muted)]">
        {HEALTH_DISCLAIMER}
      </p>

      <form action={logOutAction}>
        <Button type="submit" variant="ghost" block>
          <LogOut aria-hidden />
          Log out
        </Button>
      </form>
    </div>
  )
}
