import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, CheckCircle2, ListChecks, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { Avatar, Badge, Stat } from '@/components/ui/display'
import { JoinProgramButton } from '@/components/program/join-program-button'
import { HEALTH_DISCLAIMER, METRIC_META } from '@/lib/constants'
import { formatCompact, formatPrice } from '@/lib/utils'

type Props = PageProps<'/programs/[id]'>

const DIFFICULTY_LABEL = {
  BEGINNER: 'Beginner friendly',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  const program = await prisma.program.findUnique({
    where: { id },
    select: { title: true, summary: true, status: true },
  })
  if (!program || program.status !== 'PUBLISHED') {
    return { title: 'Program not found' }
  }
  return { title: program.title, description: program.summary }
}

export default async function ProgramPage(props: Props) {
  const { id } = await props.params

  const program = await prisma.program.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      summary: true,
      description: true,
      durationDays: true,
      difficulty: true,
      priceCents: true,
      currency: true,
      isFree: true,
      status: true,
      requirements: true,
      outcomes: true,
      trackedMetrics: true,
      enrollmentCount: true,
      ratingAvg: true,
      ratingCount: true,
      category: { select: { name: true, emoji: true } },
      coach: {
        select: {
          id: true,
          slug: true,
          headline: true,
          user: {
            select: {
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      },
      modules: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          summary: true,
          lessons: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              dayNumber: true,
              estimatedMinutes: true,
              _count: { select: { tasks: true } },
            },
          },
        },
      },
      _count: { select: { tasks: true } },
    },
  })

  if (!program || program.status !== 'PUBLISHED') notFound()

  const viewer = await getSessionUser()
  const coachName = program.coach.user.profile?.fullName ?? 'Coach'

  const enrollment = viewer
    ? await prisma.enrollment.findUnique({
        where: { userId_programId: { userId: viewer.id, programId: program.id } },
        select: { id: true },
      })
    : null

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            <span aria-hidden>{program.category.emoji}</span>
            {program.category.name}
          </Badge>
          <Badge tone="outline">{DIFFICULTY_LABEL[program.difficulty]}</Badge>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          {program.title}
        </h1>
        <p className="text-[var(--color-ink-muted)]">{program.summary}</p>

        <Link
          href={`/coaches/${program.coach.slug}`}
          className="inline-flex items-center gap-2"
        >
          <Avatar
            name={coachName}
            src={program.coach.user.profile?.avatarUrl}
            size="sm"
          />
          <span className="text-sm">
            <span className="font-bold">{coachName}</span>
            <span className="block text-xs text-[var(--color-ink-muted)]">
              {program.coach.headline}
            </span>
          </span>
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Length" value={`${program.durationDays} days`} />
        <Stat label="Tasks" value={program._count.tasks} />
        <Stat label="Joined" value={formatCompact(program.enrollmentCount)} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-[var(--color-brand)]">
              {formatPrice(program.priceCents, program.currency)}
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {program.isFree
                ? 'Free to join. Start today.'
                : 'One-off payment for the whole program.'}
            </p>
          </div>

          {enrollment ? (
            <ButtonLink href={`/my/${enrollment.id}`} size="lg">
              <CheckCircle2 aria-hidden />
              Continue program
            </ButtonLink>
          ) : viewer ? (
            <JoinProgramButton programId={program.id} isFree={program.isFree} />
          ) : (
            <ButtonLink href={`/login?next=/programs/${program.id}`} size="lg">
              Log in to join
            </ButtonLink>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold tracking-tight">
          What this program does
        </h2>
        <p className="text-sm whitespace-pre-line text-[var(--color-ink-muted)]">
          {program.description}
        </p>

        {program.outcomes.length > 0 ? (
          <ul className="space-y-1.5">
            {program.outcomes.map((outcome) => (
              <li key={outcome} className="flex gap-2 text-sm">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-savanna-600"
                  aria-hidden
                />
                {outcome}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {program.requirements.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold tracking-tight">
            What you need
          </h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-ink-muted)]">
            {program.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {program.trackedMetrics.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold tracking-tight">
            What you’ll track
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {program.trackedMetrics.map((metric) => (
              <Badge key={metric} tone="outline">
                {METRIC_META[metric].label}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold tracking-tight">
          Inside the program
        </h2>
        {program.modules.map((module, index) => (
          <Card key={module.id}>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-[var(--color-brand)]">
                Week {index + 1}
              </p>
              <p className="font-bold">{module.title}</p>
              {module.summary ? (
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                  {module.summary}
                </p>
              ) : null}

              <ul className="mt-3 space-y-1.5">
                {module.lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--color-surface-muted)] text-[10px] font-bold">
                      {lesson.dayNumber}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {lesson.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3" aria-hidden />
                        {lesson.estimatedMinutes}m
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="size-3" aria-hidden />
                        {lesson._count.tasks}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4">
        <Users className="size-5 shrink-0 text-[var(--color-brand)]" aria-hidden />
        <p className="text-sm">
          Everyone on this program trains alongside{' '}
          <Link
            href={`/coaches/${program.coach.slug}?tab=community`}
            className="font-semibold underline"
          >
            {coachName.split(' ')[0]}’s community
          </Link>
          .
        </p>
      </section>

      <p className="text-xs text-[var(--color-ink-muted)]">
        {HEALTH_DISCLAIMER}
      </p>
    </div>
  )
}
