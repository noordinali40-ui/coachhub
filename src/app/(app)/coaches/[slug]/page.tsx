import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Globe, MapPin, MessageCircle, Star, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/dal'
import { ProgramCard } from '@/components/program/program-card'
import { VerificationBadge } from '@/components/coach/coach-card'
import { CoachActions } from '@/components/coach/coach-actions'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { Avatar, Badge, EmptyState, Stat } from '@/components/ui/display'
import { QueryTabs } from '@/components/ui/tabs'
import { countryLabel, HEALTH_DISCLAIMER } from '@/lib/constants'
import { formatCompact, relativeTime } from '@/lib/utils'

type Props = PageProps<'/coaches/[slug]'>

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const coach = await prisma.coach.findUnique({
    where: { slug },
    select: {
      headline: true,
      user: { select: { profile: { select: { fullName: true } } } },
    },
  })
  if (!coach) return { title: 'Coach not found' }

  const name = coach.user.profile?.fullName ?? 'Coach'
  return { title: name, description: `${name} — ${coach.headline}` }
}

export default async function CoachProfilePage(props: Props) {
  const { slug } = await props.params
  const { tab } = await props.searchParams
  const activeTab = typeof tab === 'string' ? tab : 'programs'

  const coach = await prisma.coach.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      headline: true,
      bio: true,
      yearsExperience: true,
      verification: true,
      status: true,
      credentials: true,
      offersOnline: true,
      offersInPerson: true,
      acceptingClients: true,
      ratingAvg: true,
      ratingCount: true,
      studentCount: true,
      followerCount: true,
      userId: true,
      user: {
        select: {
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              countryCode: true,
              city: true,
              languages: true,
            },
          },
        },
      },
      categories: {
        select: { category: { select: { name: true, emoji: true, slug: true } } },
      },
      communities: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          memberCount: true,
          isPrivate: true,
        },
      },
    },
  })

  // A pending or suspended coach has no public page.
  if (!coach || coach.status !== 'APPROVED') notFound()

  const viewer = await getSessionUser()
  const name = coach.user.profile?.fullName ?? 'Coach'

  const [programs, challenges, reviews, isFollowing, memberships] =
    await Promise.all([
      prisma.program.findMany({
        where: { coachId: coach.id, status: 'PUBLISHED' },
        orderBy: { enrollmentCount: 'desc' },
        select: {
          id: true,
          title: true,
          summary: true,
          durationDays: true,
          difficulty: true,
          priceCents: true,
          currency: true,
          enrollmentCount: true,
          ratingAvg: true,
          ratingCount: true,
          category: { select: { name: true, emoji: true } },
        },
      }),
      prisma.challenge.findMany({
        where: { coachId: coach.id, status: { in: ['UPCOMING', 'ACTIVE'] } },
        orderBy: { startsOn: 'asc' },
        select: {
          slug: true,
          title: true,
          description: true,
          memberCount: true,
          unit: true,
          goalValue: true,
          status: true,
        },
      }),
      prisma.review.findMany({
        where: { coachId: coach.id, hiddenAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          program: { select: { title: true } },
          user: {
            select: {
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
      }),
      viewer
        ? prisma.follow
            .findUnique({
              where: {
                followerId_coachId: { followerId: viewer.id, coachId: coach.id },
              },
              select: { coachId: true },
            })
            .then(Boolean)
        : false,
      viewer
        ? prisma.communityMember.findMany({
            where: {
              userId: viewer.id,
              communityId: { in: coach.communities.map((c) => c.id) },
            },
            select: { communityId: true },
          })
        : [],
    ])

  const joinedCommunityIds = new Set(memberships.map((m) => m.communityId))

  const tabs = [
    { key: 'programs', label: 'Programs', count: programs.length },
    { key: 'about', label: 'About' },
    { key: 'community', label: 'Community', count: coach.communities.length },
    { key: 'challenges', label: 'Challenges', count: challenges.length },
    { key: 'reviews', label: 'Reviews', count: coach.ratingCount },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar name={name} src={coach.user.profile?.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{name}</h1>
              <VerificationBadge level={coach.verification} />
            </div>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {coach.headline}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-ink-muted)]">
              {coach.user.profile?.countryCode ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {[coach.user.profile.city, countryLabel(coach.user.profile.countryCode)]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              ) : null}
              {coach.offersOnline ? (
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3.5" aria-hidden />
                  Coaches online
                </span>
              ) : null}
              <span>{coach.yearsExperience} yrs experience</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {coach.categories.map(({ category }) => (
                <Link key={category.slug} href={`/discover?category=${category.slug}`}>
                  <Badge tone="brand">
                    <span aria-hidden>{category.emoji}</span>
                    {category.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Rating"
            value={
              coach.ratingCount > 0 ? Number(coach.ratingAvg).toFixed(1) : '—'
            }
            hint={coach.ratingCount > 0 ? `${coach.ratingCount} reviews` : 'No reviews yet'}
          />
          <Stat label="Students" value={formatCompact(coach.studentCount)} />
          <Stat label="Followers" value={formatCompact(coach.followerCount)} />
        </div>

        <CoachActions
          coachId={coach.id}
          coachUserId={coach.userId}
          isFollowing={isFollowing}
          isSignedIn={Boolean(viewer)}
          isSelf={viewer?.id === coach.userId}
          primaryCommunity={
            coach.communities[0]
              ? {
                  id: coach.communities[0].id,
                  joined: joinedCommunityIds.has(coach.communities[0].id),
                  slug: coach.communities[0].slug,
                }
              : null
          }
        />
      </header>

      <QueryTabs tabs={tabs} />

      {activeTab === 'programs' ? (
        programs.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={{
                  ...program,
                  ratingAvg: Number(program.ratingAvg),
                  coachName: name,
                  coachAvatarUrl: coach.user.profile?.avatarUrl ?? null,
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No published programs yet"
            description={`${name} hasn’t published a program. Follow to hear when they do.`}
          />
        )
      ) : null}

      {activeTab === 'about' ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-bold">About {name.split(' ')[0]}</h2>
              <p className="text-sm whitespace-pre-line text-[var(--color-ink-muted)]">
                {coach.bio}
              </p>
            </CardContent>
          </Card>

          {coach.user.profile?.languages.length ? (
            <Card>
              <CardContent className="space-y-2 p-5">
                <h2 className="font-bold">Languages</h2>
                <div className="flex flex-wrap gap-1">
                  {coach.user.profile.languages.map((language) => (
                    <Badge key={language} tone="outline">
                      {language}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {coach.credentials.length > 0 ? (
            <Card>
              <CardContent className="space-y-2 p-5">
                <h2 className="font-bold">Experience and training</h2>
                <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-ink-muted)]">
                  {coach.credentials.map((credential) => (
                    <li key={credential}>{credential}</li>
                  ))}
                </ul>
                {coach.verification !== 'PROFESSIONAL' ? (
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Stated by the coach. CoachHub has not verified these
                    qualifications.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-xs text-[var(--color-ink-muted)]">
            {HEALTH_DISCLAIMER}
          </p>
        </div>
      ) : null}

      {activeTab === 'community' ? (
        coach.communities.length > 0 ? (
          <div className="space-y-3">
            {coach.communities.map((community) => (
              <Link
                key={community.id}
                href={`/community/${community.slug}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
              >
                <Users className="size-5 shrink-0 text-[var(--color-brand)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{community.name}</p>
                  <p className="truncate text-sm text-[var(--color-ink-muted)]">
                    {community.description}
                  </p>
                </div>
                <Badge tone="outline">
                  {formatCompact(community.memberCount)}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No community yet" />
        )
      ) : null}

      {activeTab === 'challenges' ? (
        challenges.length > 0 ? (
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <Link
                key={challenge.slug}
                href={`/challenges/${challenge.slug}`}
                className="block rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{challenge.title}</p>
                  <Badge tone={challenge.status === 'ACTIVE' ? 'success' : 'outline'}>
                    {challenge.status === 'ACTIVE' ? 'Live' : 'Starting soon'}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-muted)]">
                  {challenge.description}
                </p>
                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                  Goal {Number(challenge.goalValue).toLocaleString()}{' '}
                  {challenge.unit} · {challenge.memberCount} taking part
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No challenges running" />
        )
      ) : null}

      {activeTab === 'reviews' ? (
        reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={review.user.profile?.fullName ?? 'Member'}
                      src={review.user.profile?.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {review.user.profile?.fullName ?? 'Member'}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {review.program?.title} · {relativeTime(review.createdAt)}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 text-sm font-bold"
                      aria-label={`${review.rating} out of 5`}
                    >
                      <Star
                        className="size-4 fill-harvest-500 text-harvest-500"
                        aria-hidden
                      />
                      {review.rating}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{review.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reviews yet"
            description="Reviews appear once students have taken a program."
          />
        )
      ) : null}

      {!viewer ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <MessageCircle className="size-6 text-[var(--color-brand)]" aria-hidden />
            <p className="font-bold">Join to train with {name.split(' ')[0]}</p>
            <ButtonLink href="/signup">Create a free account</ButtonLink>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
