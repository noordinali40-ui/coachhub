import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { Avatar, EmptyState } from '@/components/ui/display'
import { ButtonLink } from '@/components/ui/button'
import { cn, relativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Messages' }

export default async function MessagesPage(props: PageProps<'/messages'>) {
  const user = await requireUser()
  const { with: withUserId } = await props.searchParams

  // `?with=<userId>` opens (or creates) the thread with that person, so a
  // "Message your coach" link elsewhere does not need its own action.
  if (typeof withUserId === 'string' && withUserId !== user.id) {
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: withUserId } } },
        ],
      },
      select: { id: true, _count: { select: { participants: true } } },
    })

    if (existing && existing._count.participants === 2) {
      redirect(`/messages/${existing.id}`)
    }

    const other = await prisma.user.findUnique({
      where: { id: withUserId },
      select: { id: true, status: true },
    })
    if (other?.status === 'ACTIVE') {
      const created = await prisma.conversation.create({
        data: {
          participants: { create: [{ userId: user.id }, { userId: withUserId }] },
        },
        select: { id: true },
      })
      redirect(`/messages/${created.id}`)
    }
  }

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    orderBy: { lastMessageAt: 'desc' },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        where: { userId: { not: user.id } },
        select: {
          user: {
            select: {
              id: true,
              profile: { select: { fullName: true, avatarUrl: true } },
              coach: { select: { headline: true } },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true, senderId: true, createdAt: true },
      },
    },
  })

  const myParticipation = await prisma.conversationParticipant.findMany({
    where: { userId: user.id },
    select: { conversationId: true, lastReadAt: true },
  })
  const lastReadByConversation = new Map(
    myParticipation.map((p) => [p.conversationId, p.lastReadAt] as const),
  )

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Messages</h1>

      {conversations.length > 0 ? (
        <ul className="space-y-1">
          {conversations.map((conversation) => {
            const other = conversation.participants[0]?.user
            const last = conversation.messages[0]
            const lastRead = lastReadByConversation.get(conversation.id)
            const isUnread =
              last !== undefined &&
              last.senderId !== user.id &&
              (!lastRead || last.createdAt > lastRead)

            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
                >
                  <Avatar
                    name={other?.profile?.fullName ?? 'Member'}
                    src={other?.profile?.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p
                        className={cn(
                          'truncate',
                          isUnread ? 'font-extrabold' : 'font-semibold',
                        )}
                      >
                        {other?.profile?.fullName ?? 'Member'}
                      </p>
                      {other?.coach ? (
                        <span className="shrink-0 text-xs text-[var(--color-brand)]">
                          Coach
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        'truncate text-sm',
                        isUnread
                          ? 'font-medium text-[var(--color-ink)]'
                          : 'text-[var(--color-ink-muted)]',
                      )}
                    >
                      {last
                        ? `${last.senderId === user.id ? 'You: ' : ''}${last.body}`
                        : 'No messages yet'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {relativeTime(conversation.lastMessageAt)}
                    </p>
                    {isUnread ? (
                      <span className="ml-auto mt-1 block size-2.5 rounded-full bg-[var(--color-brand)]" />
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<MessageCircle className="size-5" />}
          title="No conversations yet"
          description="Message a coach from their profile to ask about their programs."
          action={<ButtonLink href="/discover">Find a coach</ButtonLink>}
        />
      )}
    </div>
  )
}
