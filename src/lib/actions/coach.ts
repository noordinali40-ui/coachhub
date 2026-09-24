'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { assertCoachOwnsStudent, requireCoach, requireUser } from '@/lib/dal'
import { becomeCoachSchema, coachNoteSchema } from '@/lib/validation'
import { slugify } from '@/lib/utils'
import { fieldErrors, toActionError, type ActionState } from './types'

/**
 * Creates a coach profile for the signed-in user.
 *
 * The coach starts PENDING and at COMMUNITY verification. Nothing here can
 * grant VERIFIED or PROFESSIONAL — those require an admin to check a real
 * credential, so a self-service form must never be able to set them.
 */
export async function becomeCoachAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = becomeCoachSchema.safeParse({
    headline: formData.get('headline'),
    bio: formData.get('bio'),
    yearsExperience: formData.get('yearsExperience'),
    categories: formData.getAll('categories').map(String),
    credentials: formData.get('credentials') ?? undefined,
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireUser()
    if (user.coachId) redirect('/coach')

    const data = parsed.data

    const categories = await prisma.category.findMany({
      where: { slug: { in: data.categories }, active: true },
      select: { slug: true },
    })
    if (categories.length === 0) {
      return { ok: false, errors: { categories: ['Choose a specialisation.'] } }
    }

    const slug = await uniqueCoachSlug(slugify(user.fullName))

    await prisma.$transaction(async (tx) => {
      const coach = await tx.coach.create({
        data: {
          userId: user.id,
          slug,
          headline: data.headline,
          bio: data.bio,
          yearsExperience: data.yearsExperience,
          status: 'PENDING',
          verification: 'COMMUNITY',
          credentials: data.credentials
            ? data.credentials.split('\n').map((s) => s.trim()).filter(Boolean)
            : [],
          categories: {
            create: categories.map((category, index) => ({
              categorySlug: category.slug,
              isPrimary: index === 0,
            })),
          },
        },
        select: { id: true },
      })

      await tx.user.update({ where: { id: user.id }, data: { role: 'COACH' } })

      // Every coach gets a community — it is the core of their digital space.
      await tx.community.create({
        data: {
          coachId: coach.id,
          slug: `${slug}-community`,
          name: `${user.fullName}'s Community`,
          description: data.headline,
          memberCount: 1,
          members: { create: { userId: user.id, role: 'OWNER' } },
        },
      })
    })
  } catch (error) {
    return toActionError(error)
  }

  revalidatePath('/', 'layout')
  redirect('/become-a-coach/pending')
}

/**
 * Saves a private note about a student.
 *
 * Notes live in `coach_notes` and are only ever read through a query filtered
 * by the owning coach id — the student they describe must never see them.
 */
export async function saveCoachNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = coachNoteSchema.safeParse({
    studentId: formData.get('studentId'),
    body: formData.get('body'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const { coach } = await requireCoach()
    const { studentId, body } = parsed.data

    await assertCoachOwnsStudent(coach.id, studentId)

    const existing = await prisma.coachNote.findFirst({
      where: { coachId: coach.id, studentId },
      select: { id: true },
    })

    if (existing) {
      await prisma.coachNote.update({ where: { id: existing.id }, data: { body } })
    } else {
      await prisma.coachNote.create({ data: { coachId: coach.id, studentId, body } })
    }

    revalidatePath(`/coach/students/${studentId}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true, message: 'Note saved.' }
}

export async function followCoachAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const coachId = String(formData.get('coachId') ?? '')
  if (!z.uuid().safeParse(coachId).success) {
    return { ok: false, message: 'That coach could not be found.' }
  }

  try {
    const user = await requireUser()

    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { slug: true },
    })
    if (!coach) return { ok: false, message: 'That coach could not be found.' }

    const existing = await prisma.follow.findUnique({
      where: { followerId_coachId: { followerId: user.id, coachId } },
      select: { coachId: true },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.follow.delete({
          where: { followerId_coachId: { followerId: user.id, coachId } },
        }),
        prisma.coach.update({
          where: { id: coachId },
          data: { followerCount: { decrement: 1 } },
        }),
      ])
    } else {
      await prisma.$transaction([
        prisma.follow.create({ data: { followerId: user.id, coachId } }),
        prisma.coach.update({
          where: { id: coachId },
          data: { followerCount: { increment: 1 } },
        }),
      ])
    }

    revalidatePath(`/coaches/${coach.slug}`)
  } catch (error) {
    return toActionError(error)
  }

  return { ok: true }
}

async function uniqueCoachSlug(base: string): Promise<string> {
  const candidate = base || 'coach'
  const taken = await prisma.coach.findUnique({
    where: { slug: candidate },
    select: { slug: true },
  })
  if (!taken) return candidate
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`
}
