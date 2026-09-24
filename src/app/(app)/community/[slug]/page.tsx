import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Lock, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireOnboardedUser } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge, EmptyState } from '@/components/ui/display'
import { PostComposer } from '@/components/community/post-composer'
import { PostCard } from '@/components/community/post-card'
import { JoinCommunityButton } from '@/components/community/join-community-button'
import { formatCompact } from '@/lib/utils'

type Props = PageProps<'/community/[slug]'>

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const community = await prisma.community.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })
  return community
    ? { title: community.name, description: community.description }
    : { title: 'Community not found' }
}

export default async function CommunityPage(props: Props) {
  const { slug } = await props.params
  const user = await requireOnboardedUser()

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      isPrivate: true,
      memberCount: true,
      coach: {
        select: {
          slug: true,
          userId: true,
          user: { select: { profile: { select: { fullName: true } } } },
        },
      },
    },
  })

  if (!community) notFound()

  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId: community.id, userId: user.id } },
    select: { role: true },
  })

  const isMember = Boolean(membership)
  const isOwner = community.coach.userId === user.id

  // Private communities show only the header to non-members.
  const canRead = isMember || !community.isPrivate

  const posts = canRead
    ? await prisma.post.findMany({
        where: { communityId: community.id, hiddenAt: null },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 30,
        select: {
          id: true,
          body: true,
          type: true,
          likeCount: true,
          commentCount: true,
          isPinned: true,
          createdAt: true,
          authorId: true,
          author: {
            select: {
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
          likes: { where: { userId: user.id }, select: { id: true } },
          comments: {
            orderBy: { createdAt: 'asc' },
            take: 3,
            where: { hiddenAt: null },
            select: {
              id: true,
              body: true,
              createdAt: true,
              author: {
                select: {
                  profile: { select: { fullName: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      })
    : []

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-clay-50 text-[var(--color-brand)] dark:bg-sand-800">
            <Users className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold tracking-tight text-balance">
              {community.name}
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {community.description}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              <Badge tone="outline">
                {formatCompact(community.memberCount)} members
              </Badge>
              {community.isPrivate ? (
                <Badge tone="neutral">
                  <Lock className="size-3" aria-hidden />
                  Students only
                </Badge>
              ) : null}
              <Link
                href={`/coaches/${community.coach.slug}`}
                className="font-semibold hover:underline"
              >
                by {community.coach.user.profile?.fullName ?? 'the coach'}
              </Link>
            </div>
          </div>
        </div>

        {!isMember ? (
          <JoinCommunityButton communityId={community.id} />
        ) : null}
      </header>

      {isMember ? (
        <PostComposer communityId={community.id} canAnnounce={isOwner} />
      ) : null}

      {!canRead ? (
        <EmptyState
          icon={<Lock className="size-5" />}
          title="This community is for the coach’s students"
          description="Join one of their programs to take part."
        />
      ) : posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                id: post.id,
                body: post.body,
                type: post.type,
                likeCount: post.likeCount,
                commentCount: post.commentCount,
                isPinned: post.isPinned,
                createdAt: post.createdAt,
                likedByMe: post.likes.length > 0,
                authorName: post.author.profile?.fullName ?? 'Member',
                authorAvatarUrl: post.author.profile?.avatarUrl ?? null,
                isCoach: post.authorId === community.coach.userId,
                comments: post.comments.map((comment) => ({
                  id: comment.id,
                  body: comment.body,
                  createdAt: comment.createdAt,
                  authorName: comment.author.profile?.fullName ?? 'Member',
                  authorAvatarUrl: comment.author.profile?.avatarUrl ?? null,
                })),
              }}
              canInteract={isMember}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-bold">No posts yet</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {isMember
                ? 'Be the first — share what you did today.'
                : 'Join to start the conversation.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
