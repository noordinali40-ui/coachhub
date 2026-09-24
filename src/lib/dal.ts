import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Role } from '@/generated/prisma/client'

/**
 * The authorization boundary.
 *
 * Prisma connects as the database owner, so RLS does not apply to our queries.
 * Every check that decides who may see or change what is therefore made here,
 * as close to the data as possible, and re-run inside each Server Action rather
 * than being inferred from the UI that called it.
 *
 * Each helper is wrapped in React `cache` so a render pass that needs the
 * session in five places still issues one token verification and one user read.
 */

export type SessionUser = {
  id: string
  email: string
  role: Role
  fullName: string
  avatarUrl: string | null
  countryCode: string | null
  lowDataMode: boolean
  onboarded: boolean
  coachId: string | null
}

/** Returns the signed-in user, or null. Never throws or redirects. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient()

  // getClaims verifies the JWT signature rather than trusting the cookie body.
  const { data, error } = await supabase.auth.getClaims()
  const authId = data?.claims?.sub
  if (error || !authId) return null

  const user = await prisma.user.findUnique({
    where: { id: authId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      profile: {
        select: {
          fullName: true,
          avatarUrl: true,
          countryCode: true,
          lowDataMode: true,
          onboardedAt: true,
        },
      },
      coach: { select: { id: true } },
    },
  })

  // A suspended account keeps a valid token until it expires, so the check has
  // to happen here rather than only at sign-in.
  if (!user || user.status !== 'ACTIVE') return null

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.profile?.fullName ?? user.email.split('@')[0],
    avatarUrl: user.profile?.avatarUrl ?? null,
    countryCode: user.profile?.countryCode ?? null,
    lowDataMode: user.profile?.lowDataMode ?? false,
    onboarded: Boolean(user.profile?.onboardedAt),
    coachId: user.coach?.id ?? null,
  }
})

/** Signed-in user or a redirect to login. Use at the top of private pages. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
})

/** Requires onboarding to be finished, so downstream code can trust `goals`. */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await requireUser()
  if (!user.onboarded) redirect('/onboarding')
  return user
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/')
  return user
}

/**
 * The signed-in user as an approved coach. Returns the coach id, which every
 * coach-scoped query must filter on — that filter is what stops one coach
 * reading another coach's students.
 */
export const requireCoach = cache(async () => {
  const user = await requireUser()
  if (!user.coachId) redirect('/become-a-coach')

  const coach = await prisma.coach.findUnique({
    where: { id: user.coachId },
    select: { id: true, slug: true, status: true, headline: true },
  })
  if (!coach || coach.status !== 'APPROVED') redirect('/become-a-coach/pending')

  return { user, coach }
})

/**
 * Throws unless `studentId` is actually enrolled in one of `coachId`'s programs.
 * Called before reading any per-student progress, note or message thread.
 */
export async function assertCoachOwnsStudent(
  coachId: string,
  studentId: string,
): Promise<void> {
  const link = await prisma.enrollment.findFirst({
    where: { userId: studentId, program: { coachId } },
    select: { id: true },
  })
  if (!link) {
    throw new ForbiddenError('This student is not enrolled with you.')
  }
}

/** Throws unless the user is enrolled in the program. */
export async function assertEnrolled(
  userId: string,
  programId: string,
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_programId: { userId, programId } },
    select: { id: true },
  })
  if (!enrollment) {
    throw new ForbiddenError('You are not enrolled in this program.')
  }
}

/** Throws unless the user is a member of the community. */
export async function assertCommunityMember(
  userId: string,
  communityId: string,
): Promise<void> {
  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { userId: true },
  })
  if (!membership) {
    throw new ForbiddenError('Join this community to take part.')
  }
}

/**
 * True when either user has blocked the other. Checked before creating a
 * conversation or delivering a message.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  })
  return block !== null
}

/** Signals a failed authorization check to the Server Action wrapper. */
export class ForbiddenError extends Error {
  constructor(message = 'You do not have access to this.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}
