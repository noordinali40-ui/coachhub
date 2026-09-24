import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { markConversationReadAction } from '@/lib/actions/messaging'
import { Avatar } from '@/components/ui/display'
import { MessageComposer } from '@/components/messaging/message-composer'
import { cn, relativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Conversation' }

export default async function ConversationPage(
  props: PageProps<'/messages/[conversationId]'>,
) {
  const { conversationId } = await props.params
  const user = await requireUser()

  // Membership of the thread is checked here and again inside the send action
  // — the page check controls what renders, the action check controls what the
  // server will accept.
  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { conversationId: true },
  })
  if (!participation) notFound()

  const [conversation, messages] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participants: {
          where: { userId: { not: user.id } },
          select: {
            user: {
              select: {
                id: true,
                profile: { select: { fullName: true, avatarUrl: true } },
                coach: { select: { slug: true, headline: true } },
              },
            },
          },
        },
      },
    }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
      },
    }),
  ])

  if (!conversation) notFound()

  await markConversationReadAction(conversationId)

  const other = conversation.participants[0]?.user
  const otherName = other?.profile?.fullName ?? 'Member'

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-3">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-[var(--color-surface-muted)] md:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar name={otherName} src={other?.profile?.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          {other?.coach ? (
            <Link
              href={`/coaches/${other.coach.slug}`}
              className="truncate font-bold hover:underline"
            >
              {otherName}
            </Link>
          ) : (
            <p className="truncate font-bold">{otherName}</p>
          )}
          <p className="truncate text-xs text-[var(--color-ink-muted)]">
            {other?.coach?.headline ?? 'Member'}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-2 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === user.id
            return (
              <div
                key={message.id}
                className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2',
                    isMine
                      ? 'rounded-br-sm bg-[var(--color-brand)] text-white'
                      : 'rounded-bl-sm bg-[var(--color-surface-muted)]',
                  )}
                >
                  <p className="whitespace-pre-line">{message.body}</p>
                  <p
                    className={cn(
                      'mt-0.5 text-[10px]',
                      isMine ? 'text-white/70' : 'text-[var(--color-ink-muted)]',
                    )}
                  >
                    {relativeTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <MessageComposer conversationId={conversationId} />
    </div>
  )
}
