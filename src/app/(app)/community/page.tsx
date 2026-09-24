import type { Metadata } from 'next'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireOnboardedUser } from '@/lib/dal'
import { ButtonLink } from '@/components/ui/button'
import { Badge, EmptyState, SectionHeading } from '@/components/ui/display'
import { formatCompact } from '@/lib/utils'

export const metadata: Metadata = { title: 'Communities' }

export default async function CommunityIndexPage() {
  const user = await requireOnboardedUser()

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { goals: true },
  })

  const [mine, suggested] = await Promise.all([
    prisma.communityMember.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: 'desc' },
      select: {
        community: {
          select: {
            slug: true,
            name: true,
            description: true,
            memberCount: true,
            _count: { select: { posts: true } },
          },
        },
      },
    }),
    prisma.community.findMany({
      where: {
        isPrivate: false,
        members: { none: { userId: user.id } },
        ...(profile?.goals.length
          ? {
              coach: {
                categories: { some: { categorySlug: { in: profile.goals } } },
              },
            }
          : {}),
      },
      orderBy: { memberCount: 'desc' },
      take: 6,
      select: {
        slug: true,
        name: true,
        description: true,
        memberCount: true,
        coach: {
          select: {
            user: { select: { profile: { select: { fullName: true } } } },
          },
        },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Community</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          The people training alongside you.
        </p>
      </header>

      <section>
        <SectionHeading title="Your communities" />
        {mine.length > 0 ? (
          <div className="space-y-2">
            {mine.map(({ community }) => (
              <Link
                key={community.slug}
                href={`/community/${community.slug}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
              >
                <Users
                  className="size-5 shrink-0 text-[var(--color-brand)]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{community.name}</p>
                  <p className="truncate text-sm text-[var(--color-ink-muted)]">
                    {formatCompact(community.memberCount)} members ·{' '}
                    {community._count.posts} posts
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="You haven’t joined a community yet"
            description="Communities belong to coaches. Join one to swap progress, ask questions and cheer people on."
            action={<ButtonLink href="/discover">Find a coach</ButtonLink>}
          />
        )}
      </section>

      {suggested.length > 0 ? (
        <section>
          <SectionHeading title="Suggested for your goals" />
          <div className="space-y-2">
            {suggested.map((community) => (
              <Link
                key={community.slug}
                href={`/community/${community.slug}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
              >
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
        </section>
      ) : null}
    </div>
  )
}
