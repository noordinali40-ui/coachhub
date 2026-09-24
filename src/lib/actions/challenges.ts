'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireCoach, requireOnboardedUser } from '@/lib/dal'
import { challengeEntrySchema, challengeSchema } from '@/lib/validation'
import { METRIC_META } from '@/lib/constants'
import { computeMemberStats, rankLeaderboard } from '@/lib/leaderboard'
import { slugify, today, toDateOnly } from '@/lib/utils'
import type { LeaderboardCategory } from '@/generated/prisma/client'
import { fieldErrors, toActionError, type ActionState } from './types'

export async function createChallengeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = challengeSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    metric: formData.get('metric'),
    goalValue: formData.get('goalValue'),
    startsOn: formData.get('startsOn'),
    endsOn: formData.get('endsOn'),
    communityId: formData.get('communityId') ?? '',
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  let slug: string

  try {
    const { coach } = await requireCoach()
    const data = parsed.data

    // The community must belong to this coach, or a crafted id would attach a
    // challenge to someone else's community.
    let communityId: string | null = null
    if (data.communityId) {
      const community = await prisma.community.findFirst({
        where: { id: data.communityId, coachId: coach.id },
        select: { id: true },
      })
      if (!community) {
        return { ok: false, errors: { communityId: ['Pick one of your communities.'] } }
      }
      communityId = community.id
    }

    const startsOn = new Date(`${data.startsOn}T00:00:00.000Z`)
    const endsOn = new Date(`${data.endsOn}T00:00:00.000Z`)
    const now = today()

    slug = await uniqueSlug(slugify(data.title))

    await prisma.challenge.create({
      data: {
        coachId: coach.id,
        communityId,
        slug,
        title: data.title,
        description: data.description,
        metric: data.metric,
        unit: METRIC_META[data.metric].unit,
        goalValue: data.goalValue,
        startsOn,
        endsOn,
        status: startsOn > now ? 'UPCOMING' : 'ACTIVE',
      },
    })

    // Tell the coach's community members there is something to join.
    if (communityId) {
      const members = await prisma.communityMember.findMany({
        where: { communityId },
        select: { userId: true },
      })
      if (members.length > 0) {
        await prisma.notification.createMany({
          data: members.map((m) => ({
            userId: m.userId,
            type: 'CHALLENGE_UPDATE' as const,
            title: `New challenge: ${data.title}`,
            url: `/challenges/${slug}`,
          })),
        })
      }
    }

    revalidatePath('/coach')
  } catch (error) {
    return toActionError(error)
  }

  redirect(`/challenges/${slug}`)
}

export async function joinChallengeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const challengeId = String(formData.get('challengeId') ?? '')
  if (!z.uuid().safeParse(challengeId).success) {
    return { ok: false, message: 'That challenge could not be found.' }
  }

  try {
    const user = await requireOnboardedUser()

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, slug: true, status: true, isPublic: true, communityId: true },
    })
    if (!challenge) {
      return { ok: false, message: 'That challenge could not be found.' }
    }
    if (challenge.status === 'ENDED') {
      return { ok: false, message: 'This challenge has already finished.' }
    }

    if (!challenge.isPublic && challenge.communityId) {
      const member = await prisma.communityMember.findUnique({
        where: {
          communityId_userId: { communityId: challenge.communityId, userId: user.id },
        },
        select: { userId: true },
      })
      if (!member) {
        return { ok: false, message: 'Join the community to take part.' }
      }
    }

    const existing = await prisma.challengeMember.findUnique({
      where: { challengeId_userId: { challengeId, userId: user.id } },
      select: { userId: true },
    })
    if (existing) return { ok: true }

    await prisma.$transaction([
      prisma.challengeMember.create({ data: { challengeId, userId: user.id } }),
      prisma.challenge.update({
        where: { id: challengeId },
        data: { memberCount: { increment: 1 } },
      }),
    ])

    await recomputeLeaderboard(challengeId)
    revalidatePath(`/challenges/${challenge.slug}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true, message: 'You’re in. Log your first day to get on the board.' }
}

export async function logChallengeEntryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = challengeEntrySchema.safeParse({
    challengeId: formData.get('challengeId'),
    value: formData.get('value'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireOnboardedUser()
    const { challengeId, value } = parsed.data

    const membership = await prisma.challengeMember.findUnique({
      where: { challengeId_userId: { challengeId, userId: user.id } },
      select: {
        baseline: true,
        challenge: {
          select: { id: true, slug: true, status: true, startsOn: true, endsOn: true },
        },
      },
    })
    if (!membership) {
      return { ok: false, message: 'Join the challenge before logging.' }
    }

    const challenge = membership.challenge
    if (challenge.status === 'ENDED') {
      return { ok: false, message: 'This challenge has finished.' }
    }

    const recordedOn = today()
    if (
      recordedOn < toDateOnly(challenge.startsOn) ||
      recordedOn > toDateOnly(challenge.endsOn)
    ) {
      return { ok: false, message: 'Today is outside the challenge dates.' }
    }

    // One entry per day: logging again replaces the day rather than stacking,
    // which also makes the offline replay safe.
    await prisma.challengeEntry.upsert({
      where: {
        challengeId_userId_recordedOn: { challengeId, userId: user.id, recordedOn },
      },
      update: { value },
      create: { challengeId, userId: user.id, value, recordedOn },
    })

    // First entry doubles as the baseline for the "most improved" board.
    if (membership.baseline === null) {
      await prisma.challengeMember.update({
        where: { challengeId_userId: { challengeId, userId: user.id } },
        data: { baseline: value },
      })
    }

    await recomputeLeaderboard(challengeId)
    revalidatePath(`/challenges/${challenge.slug}`)
    revalidatePath('/home')
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true, message: 'Logged.' }
}

/**
 * Rebuilds all five leaderboards for a challenge.
 *
 * Ranking on more than raw output is deliberate (spec §12): a beginner who
 * shows up every day should be able to top a board, so consistency, streak and
 * improvement are ranked alongside the total.
 */
export async function recomputeLeaderboard(challengeId: string): Promise<void> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, goalValue: true },
  })
  if (!challenge) return

  const [members, entries] = await Promise.all([
    prisma.challengeMember.findMany({
      where: { challengeId },
      select: { userId: true, baseline: true, completedAt: true },
    }),
    prisma.challengeEntry.findMany({
      where: { challengeId },
      select: { userId: true, value: true, recordedOn: true },
      orderBy: { recordedOn: 'asc' },
    }),
  ])

  const completedAtByUser = new Map(
    members.map((m) => [m.userId, m.completedAt] as const),
  )

  const stats = computeMemberStats(
    members.map((m) => ({
      userId: m.userId,
      baseline: m.baseline !== null ? Number(m.baseline) : null,
    })),
    entries.map((e) => ({
      userId: e.userId,
      value: Number(e.value),
      day: toDateOnly(e.recordedOn).getTime(),
    })),
    Number(challenge.goalValue),
  )

  const payload = rankLeaderboard(stats).map((row) => ({
    challengeId,
    category: row.category as LeaderboardCategory,
    userId: row.userId,
    rank: row.rank,
    score: row.score,
  }))

  // Replace wholesale: ranks shift for everyone when one person logs, so an
  // upsert per row would leave stale ranks behind for anyone who dropped off.
  await prisma.$transaction([
    prisma.leaderboardRow.deleteMany({ where: { challengeId } }),
    prisma.leaderboardRow.createMany({ data: payload }),
    ...stats.map((row) =>
      prisma.challengeMember.update({
        where: { challengeId_userId: { challengeId, userId: row.userId } },
        data: {
          totalValue: row.total,
          activeDays: row.activeDays,
          bestStreak: row.streak,
          // Keep the original finish time — recomputing must not reset it.
          completedAt: row.completed
            ? (completedAtByUser.get(row.userId) ?? new Date())
            : null,
        },
      }),
    ),
  ])
}

async function uniqueSlug(base: string): Promise<string> {
  const candidate = base || 'challenge'
  const taken = await prisma.challenge.findUnique({
    where: { slug: candidate },
    select: { slug: true },
  })
  if (!taken) return candidate
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`
}
