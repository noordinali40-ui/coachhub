import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Trophy, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireOnboardedUser } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, Badge, ProgressBar, Stat } from '@/components/ui/display'
import { QueryTabs } from '@/components/ui/tabs'
import { ChallengeActions } from '@/components/challenge/challenge-actions'
import { LEADERBOARD_META } from '@/lib/constants'
import { cn, today } from '@/lib/utils'
import type { LeaderboardCategory } from '@/generated/prisma/client'

type Props = PageProps<'/challenges/[slug]'>

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { title: true, description: true },
  })
  return challenge
    ? { title: challenge.title, description: challenge.description }
    : { title: 'Challenge not found' }
}

const BOARDS: LeaderboardCategory[] = [
  'TOTAL',
  'CONSISTENCY',
  'STREAK',
  'MOST_IMPROVED',
  'COMPLETION',
]

export default async function ChallengePage(props: Props) {
  const { slug } = await props.params
  const { tab } = await props.searchParams
  const user = await requireOnboardedUser()

  const board = (
    BOARDS.includes(tab as LeaderboardCategory) ? tab : 'TOTAL'
  ) as LeaderboardCategory

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      description: true,
      rules: true,
      metric: true,
      unit: true,
      goalValue: true,
      startsOn: true,
      endsOn: true,
      status: true,
      memberCount: true,
      coach: {
        select: {
          slug: true,
          user: { select: { profile: { select: { fullName: true } } } },
        },
      },
    },
  })

  if (!challenge) notFound()

  const [membership, rows, myRank] = await Promise.all([
    prisma.challengeMember.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
      select: { totalValue: true, activeDays: true, bestStreak: true, completedAt: true },
    }),
    prisma.leaderboardRow.findMany({
      where: { challengeId: challenge.id, category: board },
      orderBy: { rank: 'asc' },
      take: 25,
      select: {
        rank: true,
        score: true,
        userId: true,
        user: {
          select: { profile: { select: { fullName: true, avatarUrl: true } } },
        },
      },
    }),
    prisma.leaderboardRow.findFirst({
      where: { challengeId: challenge.id, category: board, userId: user.id },
      select: { rank: true, score: true },
    }),
  ])

  const goal = Number(challenge.goalValue)
  const myTotal = membership ? Number(membership.totalValue) : 0
  const coachName = challenge.coach.user.profile?.fullName ?? 'Coach'

  // A Server Component renders once per request, so reading the clock here is
  // stable for that render — but only when it is read once, not inside JSX.
  const daysLeft = Math.max(
    0,
    Math.ceil((challenge.endsOn.getTime() - today().getTime()) / 86_400_000),
  )

  const tabs = BOARDS.map((key) => ({
    key,
    label: LEADERBOARD_META[key].label,
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-harvest-100 text-harvest-700 dark:bg-harvest-700/25 dark:text-harvest-300">
            <Trophy className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold tracking-tight text-balance">
              {challenge.title}
            </h1>
            <Link
              href={`/coaches/${challenge.coach.slug}`}
              className="text-sm text-[var(--color-ink-muted)] hover:underline"
            >
              by {coachName}
            </Link>
          </div>
          <Badge tone={challenge.status === 'ACTIVE' ? 'success' : 'outline'}>
            {challenge.status === 'ACTIVE'
              ? 'Live'
              : challenge.status === 'UPCOMING'
                ? 'Starting soon'
                : 'Finished'}
          </Badge>
        </div>

        <p className="text-sm text-[var(--color-ink-muted)]">
          {challenge.description}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Goal"
            value={goal.toLocaleString()}
            hint={challenge.unit}
          />
          <Stat label="Taking part" value={challenge.memberCount} />
          <Stat
            label="Ends"
            value={challenge.endsOn.toISOString().slice(5, 10)}
            hint={`${daysLeft} days left`}
          />
        </div>
      </header>

      {membership ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-bold">Your progress</p>
              {myRank ? (
                <Badge tone="gold">
                  #{myRank.rank} in {LEADERBOARD_META[board].label}
                </Badge>
              ) : null}
            </div>

            <div>
              <p className="text-sm tabular-nums text-[var(--color-ink-muted)]">
                {myTotal.toLocaleString()} / {goal.toLocaleString()}{' '}
                {challenge.unit}
              </p>
              <ProgressBar
                value={myTotal}
                total={goal}
                label="Your challenge progress"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Days active" value={membership.activeDays} />
              <Stat label="Best streak" value={`${membership.bestStreak}d`} />
              <Stat
                label="Status"
                value={membership.completedAt ? 'Done 🎉' : 'Going'}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ChallengeActions
        challengeId={challenge.id}
        unit={challenge.unit}
        isMember={Boolean(membership)}
        isOpen={challenge.status !== 'ENDED'}
      />

      {challenge.rules.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold tracking-tight">How it works</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-ink-muted)]">
            {challenge.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold tracking-tight">Leaderboard</h2>
          <Users className="size-4 text-[var(--color-ink-muted)]" aria-hidden />
        </div>

        <QueryTabs tabs={tabs} />

        <p className="text-sm text-[var(--color-ink-muted)]">
          {LEADERBOARD_META[board].blurb}.
        </p>

        {rows.length > 0 ? (
          <ol className="space-y-1.5">
            {rows.map((row) => {
              const isMe = row.userId === user.id
              return (
                <li
                  key={row.userId}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-control)] border p-3',
                    isMe
                      ? 'border-[var(--color-brand)] bg-clay-50 dark:bg-sand-800'
                      : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)]',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold tabular-nums',
                      row.rank === 1
                        ? 'bg-harvest-300 text-harvest-700'
                        : row.rank <= 3
                          ? 'bg-harvest-100 text-harvest-700'
                          : 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]',
                    )}
                  >
                    {row.rank}
                  </span>
                  <Avatar
                    name={row.user.profile?.fullName ?? 'Member'}
                    src={row.user.profile?.avatarUrl}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {row.user.profile?.fullName ?? 'Member'}
                    {isMe ? (
                      <span className="ml-1 text-xs text-[var(--color-brand)]">
                        you
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {formatScore(board, Number(row.score), challenge.unit)}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-ink-muted)]">
            {board === 'COMPLETION'
              ? 'Nobody has reached the goal yet. You could be first.'
              : 'No entries yet — log a day to get on the board.'}
          </p>
        )}
      </section>

      <p className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
        Runs {challenge.startsOn.toISOString().slice(0, 10)} to{' '}
        {challenge.endsOn.toISOString().slice(0, 10)}.
      </p>
    </div>
  )
}

function formatScore(
  board: LeaderboardCategory,
  score: number,
  unit: string,
): string {
  switch (board) {
    case 'CONSISTENCY':
      return `${score} days`
    case 'STREAK':
      return `${score}d 🔥`
    case 'MOST_IMPROVED':
      return `${score > 0 ? '+' : ''}${score.toFixed(0)}%`
    default:
      return `${score.toLocaleString()} ${unit}`
  }
}
