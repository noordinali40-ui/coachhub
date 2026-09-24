import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Flame, Lock, MessageCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { assertCoachOwnsStudent, ForbiddenError, requireCoach } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { Avatar, Badge, ProgressBar, Stat } from '@/components/ui/display'
import { CoachNoteForm } from '@/components/coach/coach-note-form'
import { METRIC_META, countryLabel } from '@/lib/constants'
import { daysBetween, percent, relativeTime, today } from '@/lib/utils'

export const metadata: Metadata = { title: 'Student' }

export default async function CoachStudentPage(
  props: PageProps<'/coach/students/[studentId]'>,
) {
  const { studentId } = await props.params
  const { user: coachUser, coach } = await requireCoach()

  // A student id in the URL proves nothing — this is what ties the record to
  // *this* coach, and it is why one coach cannot read another's students.
  try {
    await assertCoachOwnsStudent(coach.id, studentId)
  } catch (error) {
    if (error instanceof ForbiddenError) notFound()
    throw error
  }

  const [student, enrollments, note, metrics, conversation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            avatarUrl: true,
            countryCode: true,
            city: true,
            goals: true,
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { userId: studentId, program: { coachId: coach.id } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startedOn: true,
        completedTasks: true,
        totalTasks: true,
        streakDays: true,
        longestStreak: true,
        lastActivityOn: true,
        currentDay: true,
        program: { select: { title: true, durationDays: true } },
      },
    }),
    prisma.coachNote.findFirst({
      where: { coachId: coach.id, studentId },
      select: { body: true, updatedAt: true },
    }),
    // Metric history is scoped to enrollments on this coach's programs, so a
    // coach sees the measurements from their own coaching and nothing else.
    prisma.metricEntry.findMany({
      where: {
        userId: studentId,
        enrollment: { program: { coachId: coach.id } },
      },
      orderBy: { recordedOn: 'desc' },
      take: 30,
      select: { metric: true, value: true, unit: true, recordedOn: true },
    }),
    prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: studentId } } },
          // The coach's *user* id — `coach.id` is the Coach row, not a user.
          { participants: { some: { userId: coachUser.id } } },
        ],
      },
      select: { id: true },
    }),
  ])

  if (!student) notFound()

  const name = student.profile?.fullName ?? 'Student'
  const primary = enrollments[0]

  // First and latest reading per metric, so the coach sees the direction of travel.
  const byMetric = new Map<string, typeof metrics>()
  for (const entry of metrics) {
    const list = byMetric.get(entry.metric) ?? []
    list.push(entry)
    byMetric.set(entry.metric, list)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <Avatar name={name} src={student.profile?.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold tracking-tight">{name}</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {[student.profile?.city, countryLabel(student.profile?.countryCode)]
              .filter(Boolean)
              .join(', ') || 'Location not set'}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Joined {relativeTime(student.createdAt)}
          </p>
        </div>
      </header>

      {primary ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-bold">{primary.program.title}</p>
              <Badge
                tone={primary.status === 'COMPLETED' ? 'success' : 'outline'}
              >
                {primary.status === 'COMPLETED'
                  ? 'Completed'
                  : `Day ${primary.currentDay}/${primary.program.durationDays}`}
              </Badge>
            </div>

            <ProgressBar
              value={primary.completedTasks}
              total={primary.totalTasks}
              label={`${name} progress`}
            />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat
                label="Tasks"
                value={`${primary.completedTasks}/${primary.totalTasks}`}
                hint={`${percent(primary.completedTasks, primary.totalTasks)}%`}
              />
              <Stat label="Streak" value={`${primary.streakDays}d`} />
              <Stat label="Best" value={`${primary.longestStreak}d`} />
              <Stat
                label="Last active"
                value={
                  primary.lastActivityOn
                    ? `${daysBetween(primary.lastActivityOn, today())}d ago`
                    : 'Never'
                }
              />
            </div>

            {primary.streakDays >= 7 ? (
              <p className="flex items-center gap-2 rounded-[var(--radius-control)] bg-harvest-100 p-3 text-sm text-harvest-700 dark:bg-harvest-700/20 dark:text-harvest-300">
                <Flame className="size-4 shrink-0" aria-hidden />
                {primary.streakDays}-day streak — a good moment to say well
                done.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {enrollments.length > 1 ? (
        <section className="space-y-2">
          <h2 className="font-bold">Other programs with you</h2>
          {enrollments.slice(1).map((enrollment) => (
            <div
              key={enrollment.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
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
            </div>
          ))}
        </section>
      ) : null}

      {byMetric.size > 0 ? (
        <section className="space-y-2">
          <h2 className="font-bold">Measurements</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[...byMetric.entries()].map(([metric, entries]) => {
              const latest = entries[0]
              const first = entries[entries.length - 1]
              const delta = Number(latest.value) - Number(first.value)
              const meta = METRIC_META[metric as keyof typeof METRIC_META]

              return (
                <Stat
                  key={metric}
                  label={meta.label}
                  value={`${Number(latest.value)} ${latest.unit}`}
                  hint={
                    entries.length > 1
                      ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} since ${first.recordedOn.toISOString().slice(5, 10)}`
                      : 'First reading'
                  }
                />
              )
            })}
          </div>
        </section>
      ) : null}

      <ButtonLink
        href={conversation ? `/messages/${conversation.id}` : `/messages?with=${studentId}`}
        block
      >
        <MessageCircle aria-hidden />
        Message {name.split(' ')[0]}
      </ButtonLink>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">Private notes</h2>
          <Lock className="size-3.5 text-[var(--color-ink-muted)]" aria-hidden />
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Only you can see these. {name.split(' ')[0]} never sees them.
        </p>
        <CoachNoteForm studentId={studentId} initialBody={note?.body ?? ''} />
      </section>
    </div>
  )
}
