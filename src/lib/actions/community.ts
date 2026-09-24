'use server'

import * as z from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  assertCommunityMember,
  requireOnboardedUser,
  requireUser,
} from '@/lib/dal'
import { commentSchema, postSchema, reportSchema } from '@/lib/validation'
import { fieldErrors, toActionError, type ActionState } from './types'

export async function joinCommunityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const communityId = String(formData.get('communityId') ?? '')
  if (!z.uuid().safeParse(communityId).success) {
    return { ok: false, message: 'That community could not be found.' }
  }

  try {
    const user = await requireOnboardedUser()

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, isPrivate: true, coach: { select: { userId: true } } },
    })
    if (!community) {
      return { ok: false, message: 'That community could not be found.' }
    }

    // Private communities are for a coach's own students only.
    if (community.isPrivate) {
      const enrolled = await prisma.enrollment.findFirst({
        where: { userId: user.id, program: { coach: { userId: community.coach.userId } } },
        select: { id: true },
      })
      if (!enrolled) {
        return {
          ok: false,
          message: 'This community is for the coach’s students. Join a program first.',
        }
      }
    }

    const existing = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
      select: { userId: true },
    })
    if (existing) return { ok: true }

    await prisma.$transaction([
      prisma.communityMember.create({
        data: { communityId, userId: user.id },
      }),
      prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } },
      }),
    ])

    revalidatePath(`/community/${community.slug}`)
    revalidatePath('/community')
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true, message: 'You’re in.' }
}

export async function leaveCommunityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const communityId = String(formData.get('communityId') ?? '')
  if (!z.uuid().safeParse(communityId).success) {
    return { ok: false, message: 'That community could not be found.' }
  }

  try {
    const user = await requireUser()

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: user.id } },
      select: { role: true, community: { select: { slug: true } } },
    })
    if (!membership) return { ok: true }
    if (membership.role === 'OWNER') {
      return { ok: false, message: 'A coach cannot leave their own community.' }
    }

    await prisma.$transaction([
      prisma.communityMember.delete({
        where: { communityId_userId: { communityId, userId: user.id } },
      }),
      prisma.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      }),
    ])

    revalidatePath(`/community/${membership.community.slug}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true }
}

export async function createPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = postSchema.safeParse({
    communityId: formData.get('communityId'),
    body: formData.get('body'),
    type: formData.get('type') ?? 'UPDATE',
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireOnboardedUser()
    const { communityId, body, type } = parsed.data

    await assertCommunityMember(user.id, communityId)

    const community = await prisma.community.findUniqueOrThrow({
      where: { id: communityId },
      select: { slug: true, coach: { select: { userId: true } } },
    })

    // Only the coach who owns the community may post an announcement.
    const effectiveType =
      type === 'ANNOUNCEMENT' && community.coach.userId !== user.id
        ? 'UPDATE'
        : type

    await prisma.post.create({
      data: { communityId, authorId: user.id, body, type: effectiveType },
    })

    revalidatePath(`/community/${community.slug}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true }
}

export async function toggleLikeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const postId = String(formData.get('postId') ?? '')
  if (!z.uuid().safeParse(postId).success) {
    return { ok: false, message: 'That post could not be found.' }
  }

  try {
    const user = await requireOnboardedUser()

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        communityId: true,
        authorId: true,
        community: { select: { slug: true } },
      },
    })
    if (!post) return { ok: false, message: 'That post could not be found.' }

    await assertCommunityMember(user.id, post.communityId)

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
      select: { id: true },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ])
    } else {
      await prisma.$transaction([
        prisma.like.create({ data: { userId: user.id, postId } }),
        prisma.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        }),
      ])

      if (post.authorId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            actorId: user.id,
            type: 'COMMUNITY_LIKE',
            title: `${user.fullName} liked your post`,
            url: `/community/${post.community.slug}`,
          },
        })
      }
    }

    revalidatePath(`/community/${post.community.slug}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true }
}

export async function addCommentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = commentSchema.safeParse({
    postId: formData.get('postId'),
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireOnboardedUser()
    const { postId, body } = parsed.data

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        communityId: true,
        authorId: true,
        community: { select: { slug: true } },
      },
    })
    if (!post) return { ok: false, message: 'That post could not be found.' }

    await assertCommunityMember(user.id, post.communityId)

    await prisma.$transaction([
      prisma.comment.create({ data: { postId, authorId: user.id, body } }),
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ])

    if (post.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          actorId: user.id,
          type: 'COMMUNITY_COMMENT',
          title: `${user.fullName} commented on your post`,
          body: body.slice(0, 120),
          url: `/community/${post.community.slug}`,
        },
      })
    }

    revalidatePath(`/community/${post.community.slug}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true }
}

export async function reportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = reportSchema.safeParse({
    targetType: formData.get('targetType'),
    targetId: formData.get('targetId'),
    reason: formData.get('reason'),
    details: formData.get('details') ?? undefined,
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireUser()

    // One open report per person per target, so repeat submissions do not
    // flood the moderation queue.
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
      select: { id: true },
    })
    if (existing) {
      return { ok: true, message: 'You already reported this. We’re on it.' }
    }

    await prisma.report.create({
      data: { reporterId: user.id, ...parsed.data },
    })
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true, message: 'Reported. Thank you — a moderator will review it.' }
}

export async function blockUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const blockedId = String(formData.get('userId') ?? '')
  if (!z.uuid().safeParse(blockedId).success) {
    return { ok: false, message: 'That person could not be found.' }
  }

  try {
    const user = await requireUser()
    if (user.id === blockedId) {
      return { ok: false, message: 'You cannot block yourself.' }
    }

    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
      update: {},
      create: { blockerId: user.id, blockedId },
    })

    revalidatePath('/messages')
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true, message: 'Blocked.' }
}
