'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { isBlockedBetween, requireUser } from '@/lib/dal'
import { messageSchema } from '@/lib/validation'
import { fieldErrors, toActionError, type ActionState } from './types'

/**
 * Finds the existing 1:1 thread between two people, or creates it.
 *
 * Returns the conversation id rather than redirecting, so both the "Message"
 * button on a coach profile and the coach's student view can reuse it.
 */
async function findOrCreateConversation(
  userId: string,
  otherUserId: string,
): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    select: { id: true, _count: { select: { participants: true } } },
  })

  // Guard against matching a future group thread that happens to contain both.
  if (existing && existing._count.participants === 2) return existing.id

  const created = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId }, { userId: otherUserId }],
      },
    },
    select: { id: true },
  })
  return created.id
}

export async function startConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const otherUserId = String(formData.get('userId') ?? '')
  if (!z.uuid().safeParse(otherUserId).success) {
    return { ok: false, message: 'That person could not be found.' }
  }

  let conversationId: string

  try {
    const user = await requireUser()
    if (user.id === otherUserId) {
      return { ok: false, message: 'You cannot message yourself.' }
    }

    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, status: true },
    })
    if (!other || other.status !== 'ACTIVE') {
      return { ok: false, message: 'That person is not available.' }
    }

    if (await isBlockedBetween(user.id, otherUserId)) {
      return { ok: false, message: 'You cannot message this person.' }
    }

    conversationId = await findOrCreateConversation(user.id, otherUserId)
  } catch (error) {
    return toActionError(error)
  }

  redirect(`/messages/${conversationId}`)
}

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = messageSchema.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireUser()
    const { conversationId, body } = parsed.data

    // Membership of the thread is the authorization check — without it, any
    // conversation id would read and write someone else's private messages.
    const participation = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      select: { conversationId: true },
    })
    if (!participation) {
      return { ok: false, message: 'That conversation is not yours.' }
    }

    const others = await prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: user.id } },
      select: { userId: true },
    })

    for (const other of others) {
      if (await isBlockedBetween(user.id, other.userId)) {
        return { ok: false, message: 'You cannot message this person.' }
      }
    }

    await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: user.id, body, type: 'TEXT' },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      prisma.notification.createMany({
        data: others.map((other) => ({
          userId: other.userId,
          actorId: user.id,
          type: 'MESSAGE' as const,
          title: `New message from ${user.fullName}`,
          body: body.slice(0, 120),
          url: `/messages/${conversationId}`,
        })),
      }),
    ])

    revalidatePath(`/messages/${conversationId}`)
    revalidatePath('/messages')
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true }
}

/** Marks the thread read up to now. Called when the thread page renders. */
export async function markConversationReadAction(conversationId: string) {
  const user = await requireUser()

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: user.id },
    data: { lastReadAt: new Date() },
  })

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      type: 'MESSAGE',
      url: `/messages/${conversationId}`,
      readAt: null,
    },
    data: { readAt: new Date() },
  })
}
