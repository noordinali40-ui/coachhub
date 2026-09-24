import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, Flame, MessageCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireOnboardedUser } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { Badge, ProgressBar, ProgressRing, Stat } from '@/components/ui/display'
import { TaskList, type TaskView } from '@/components/program/task-list'
import { MetricLogger } from '@/components/program/metric-logger'
import { METRIC_META } from '@/lib/constants'
import { daysBetween, percent, today } from '@/lib/utils'

export const metadata: Metadata = { title: 'Your program' }

export default async function MyProgramPage(props: PageProps<'/my/[enrollmentId]'>) {
  const { enrollmentId } = await props.params
  const user = await requireOnboardedUser()

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      startedOn: true,
      status: true,
      completedTasks: true,
      totalTasks: true,
      streakDays: true,
      longestStreak: true,
      program: {
        select: {
          id: true,
          title: true,
          durationDays: true,
          trackedMetrics: true,
          coach: {
            select: {
              slug: true,
              userId: true,
              user: { select: { profile: { select: { fullName: true } } } },
            },
          },
        },
      },
    },
  })

  // Reading someone else's enrollment must 404, not 403 — an enrollment id
  // should not be confirmable by a stranger.
  if (!enrollment || enrollment.userId !== user.id) notFound()

  const dayNumber = Math.min(
    enrollment.program.durationDays,
    Math.max(1, daysBetween(enrollment.startedOn, today()) + 1),
  )

  const [lesson, tasks, recentMetrics] = await Promise.all([
    prisma.lesson.findFirst({
      where: { module: { programId: enrollment.program.id }, dayNumber },
      select: {
        id: true,
        title: true,
        body: true,
        videoUrl: true,
        estimatedMinutes: true,
        isDownloadable: true,
        module: { select: { title: true } },
      },
    }),
    prisma.task.findMany({
      where: { programId: enrollment.program.id, dayNumber },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        targetValue: true,
        unit: true,
        required: true,
        progress: { where: { enrollmentId }, select: { id: true } },
      },
    }),
    prisma.metricEntry.findMany({
      where: { userId: user.id, metric: { in: enrollment.program.trackedMetrics } },
      orderBy: { recordedOn: 'desc' },
      take: 20,
      select: { metric: true, value: true, unit: true, recordedOn: true },
    }),
  ])

  const taskViews: TaskView[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    targetValue: task.targetValue ? Number(task.targetValue) : null,
    unit: task.unit,
    required: task.required,
    done: task.progress.length > 0,
  }))

  const coachName = enrollment.program.coach.user.profile?.fullName ?? 'your coach'

  // Latest reading per tracked metric, for the summary row.
  const latestByMetric = new Map<string, (typeof recentMetrics)[number]>()
  for (const entry of recentMetrics) {
    if (!latestByMetric.has(entry.metric)) latestByMetric.set(entry.metric, entry)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/coaches/${enrollment.program.coach.slug}`}
          className="text-sm text-[var(--color-ink-muted)] hover:underline"
        >
          with {coachName}
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          {enrollment.program.title}
        </h1>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="outline">
            Day {dayNumber} of {enrollment.program.durationDays}
          </Badge>
          {enrollment.streakDays > 0 ? (
            <Badge tone="gold">
              <Flame className="size-3" aria-hidden />
              {enrollment.streakDays} day streak
            </Badge>
          ) : null}
          {enrollment.status === 'COMPLETED' ? (
            <Badge tone="success">Completed 🎉</Badge>
          ) : null}
        </div>
      </header>

      <Card>
        <CardContent className="flex items-center gap-5 p-5">
          <ProgressRing
            value={enrollment.completedTasks}
            total={enrollment.totalTasks}
            label="Program progress"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {enrollment.completedTasks} of {enrollment.totalTasks} tasks
                completed
              </p>
              <ProgressBar
                value={enrollment.completedTasks}
                total={enrollment.totalTasks}
                label="Program progress"
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Current streak" value={`${enrollment.streakDays}d`} />
              <Stat label="Best streak" value={`${enrollment.longestStreak}d`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {lesson ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">
              Today’s lesson
            </h2>
            <span className="text-sm text-[var(--color-ink-muted)]">
              {lesson.estimatedMinutes} min
            </span>
          </div>

          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-xs font-bold text-[var(--color-brand)]">
                {lesson.module.title}
              </p>
              <h3 className="font-bold">{lesson.title}</h3>
              <p className="text-sm whitespace-pre-line text-[var(--color-ink-muted)]">
                {lesson.body}
              </p>

              {lesson.isDownloadable ? (
                <p className="flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-ink-muted)]">
                  <Download className="size-4 shrink-0" aria-hidden />
                  This lesson is text-first so it loads on a slow connection and
                  stays readable offline once opened.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-extrabold tracking-tight">
            Today’s tasks
          </h2>
          <span className="text-sm text-[var(--color-ink-muted)] tabular-nums">
            {taskViews.filter((t) => t.done).length}/{taskViews.length}
          </span>
        </div>

        {taskViews.length > 0 ? (
          <TaskList enrollmentId={enrollment.id} tasks={taskViews} />
        ) : (
          <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-ink-muted)]">
            Rest day — nothing scheduled. Recovery is part of the program.
          </p>
        )}
      </section>

      {enrollment.program.trackedMetrics.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold tracking-tight">
            Your measurements
          </h2>

          {latestByMetric.size > 0 ? (
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
          ) : null}

          <MetricLogger
            enrollmentId={enrollment.id}
            metrics={enrollment.program.trackedMetrics}
          />
        </section>
      ) : null}

      <ButtonLink
        href={`/messages?with=${enrollment.program.coach.userId}`}
        variant="outline"
        block
      >
        <MessageCircle aria-hidden />
        Message {coachName.split(' ')[0]}
      </ButtonLink>

      {percent(enrollment.completedTasks, enrollment.totalTasks) >= 80 ? (
        <Card>
          <CardContent className="space-y-2 p-5 text-center">
            <p className="font-bold">Nearly there 🎉</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              When you finish, you can leave {coachName.split(' ')[0]} a review.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
