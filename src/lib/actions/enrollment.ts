'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireOnboardedUser } from '@/lib/dal'
import { completeTaskSchema, metricSchema } from '@/lib/validation'
import { METRIC_META } from '@/lib/constants'
import { daysBetween, today, toDateOnly } from '@/lib/utils'
import { fieldErrors, toActionError, type ActionState } from './types'

/**
 * Joins a program.
 *
 * Free programs enroll immediately. Paid programs create a PENDING order and
 * stop there — no payment rail is wired up yet, so enrolling on a paid program
 * would hand out content that was never paid for.
 */
export async function joinProgramAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const programId = String(formData.get('programId') ?? '')
  if (!z.uuid().safeParse(programId).success) {
    return { ok: false, message: 'That program could not be found.' }
  }

  let destination: string

  try {
    const user = await requireOnboardedUser()

    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        title: true,
        status: true,
        isFree: true,
        priceCents: true,
        currency: true,
        coachId: true,
        coach: { select: { userId: true } },
        _count: { select: { tasks: true } },
      },
    })

    if (!program || program.status !== 'PUBLISHED') {
      return { ok: false, message: 'That program is not available.' }
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_programId: { userId: user.id, programId } },
      select: { id: true },
    })

    if (existing) {
      destination = `/my/${existing.id}`
    } else if (!program.isFree) {
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          coachId: program.coachId,
          programId: program.id,
          amountCents: program.priceCents,
          currency: program.currency,
          status: 'PENDING',
        },
        select: { id: true },
      })
      destination = `/checkout/${order.id}`
    } else {
      const enrollment = await prisma.$transaction(async (tx) => {
        const created = await tx.enrollment.create({
          data: {
            userId: user.id,
            programId: program.id,
            startedOn: today(),
            totalTasks: program._count.tasks,
          },
          select: { id: true },
        })

        await tx.program.update({
          where: { id: program.id },
          data: { enrollmentCount: { increment: 1 } },
        })
        await tx.coach.update({
          where: { id: program.coachId },
          data: { studentCount: { increment: 1 } },
        })
        await tx.notification.create({
          data: {
            userId: program.coach.userId,
            actorId: user.id,
            type: 'ENROLLMENT',
            title: `${user.fullName} joined ${program.title}`,
            url: '/coach/students',
          },
        })

        return created
      })

      destination = `/my/${enrollment.id}`
    }

    revalidatePath('/home')
  } catch (error) {
    return toActionError(error)
  }

  redirect(destination)
}

/**
 * Marks a task done, or undoes it when it was already done.
 *
 * Idempotent by design: the offline queue replays completions on reconnect, and
 * a replayed completion must not double-count. The `(enrollmentId, taskId)`
 * unique constraint is what makes that safe.
 */
export async function toggleTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = completeTaskSchema.safeParse({
    enrollmentId: formData.get('enrollmentId'),
    taskId: formData.get('taskId'),
    value: formData.get('value') ?? undefined,
    note: formData.get('note') ?? undefined,
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireOnboardedUser()
    const { enrollmentId, taskId, value, note } = parsed.data

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, userId: true, programId: true, status: true },
    })

    // Ownership check on the enrollment itself — an enrollment id in a form
    // field is attacker-controlled, so it can never be trusted on its own.
    if (!enrollment || enrollment.userId !== user.id) {
      return { ok: false, message: 'That program is not in your list.' }
    }
    if (enrollment.status === 'CANCELLED') {
      return { ok: false, message: 'This enrollment is no longer active.' }
    }

    // The task must belong to the same program as the enrollment.
    const task = await prisma.task.findFirst({
      where: { id: taskId, programId: enrollment.programId },
      select: { id: true, metric: true, unit: true },
    })
    if (!task) {
      return { ok: false, message: 'That task is not part of this program.' }
    }

    const done = await prisma.progress.findUnique({
      where: { enrollmentId_taskId: { enrollmentId, taskId } },
      select: { id: true },
    })

    if (done) {
      await prisma.progress.delete({ where: { id: done.id } })
    } else {
      await prisma.progress.create({
        data: {
          enrollmentId,
          taskId,
          userId: user.id,
          completedOn: today(),
          value: value ?? null,
          note: note || null,
        },
      })

      // A task that carries a metric also writes a metric entry, so the
      // progress chart reflects it without the student logging twice.
      if (task.metric && value) {
        const recordedOn = today()
        await prisma.metricEntry.upsert({
          where: {
            userId_metric_recordedOn: {
              userId: user.id,
              metric: task.metric,
              recordedOn,
            },
          },
          update: { value },
          create: {
            userId: user.id,
            enrollmentId,
            metric: task.metric,
            value,
            unit: task.unit ?? METRIC_META[task.metric].unit,
            recordedOn,
          },
        })
      }
    }

    await recalculateEnrollment(enrollmentId)
  } catch (error) {
    return toActionError(error)
  }

  revalidatePath('/home')
  revalidatePath(`/my/${parsed.data.enrollmentId}`)
  return { ok: true }
}

export async function logMetricAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = metricSchema.safeParse({
    enrollmentId: formData.get('enrollmentId') || undefined,
    metric: formData.get('metric'),
    value: formData.get('value'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireOnboardedUser()
    const { enrollmentId, metric, value } = parsed.data

    if (enrollmentId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { userId: true },
      })
      if (!enrollment || enrollment.userId !== user.id) {
        return { ok: false, message: 'That program is not in your list.' }
      }
    }

    const recordedOn = today()
    // One reading per metric per day: logging again corrects the day's value
    // rather than appending a second point to the chart.
    await prisma.metricEntry.upsert({
      where: {
        userId_metric_recordedOn: { userId: user.id, metric, recordedOn },
      },
      update: { value, enrollmentId: enrollmentId ?? null },
      create: {
        userId: user.id,
        enrollmentId: enrollmentId ?? null,
        metric,
        value,
        unit: METRIC_META[metric].unit,
        recordedOn,
      },
    })
  } catch (error) {
    return toActionError(error)
  }

  revalidatePath('/home')
  revalidatePath('/profile')
  return { ok: true, message: 'Logged.' }
}

/**
 * Recomputes the cached rollups on an enrollment.
 *
 * These are denormalised onto `enrollments` so the home screen is one row read
 * instead of an aggregate over every completion — the difference is visible on
 * a slow connection.
 */
async function recalculateEnrollment(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      startedOn: true,
      status: true,
      program: { select: { durationDays: true, _count: { select: { tasks: true } } } },
    },
  })
  if (!enrollment) return

  const completions = await prisma.progress.findMany({
    where: { enrollmentId },
    select: { completedOn: true },
    orderBy: { completedOn: 'desc' },
  })

  const completedTasks = completions.length
  const totalTasks = enrollment.program._count.tasks

  // Distinct active days, newest first.
  const days = [
    ...new Set(completions.map((c) => toDateOnly(c.completedOn).getTime())),
  ].sort((a, b) => b - a)

  const { current, longest } = streaksFrom(days)

  const currentDay = Math.min(
    enrollment.program.durationDays,
    Math.max(1, daysBetween(enrollment.startedOn, today()) + 1),
  )

  const finished = totalTasks > 0 && completedTasks >= totalTasks

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      completedTasks,
      totalTasks,
      currentDay,
      streakDays: current,
      longestStreak: longest,
      lastActivityOn: days.length ? new Date(days[0]) : null,
      status: finished ? 'COMPLETED' : enrollment.status === 'COMPLETED' ? 'ACTIVE' : enrollment.status,
      completedAt: finished ? new Date() : null,
    },
  })
}

/**
 * Current streak counts back from today, allowing yesterday as the anchor so a
 * streak is not broken until a whole day has been missed. Longest streak is the
 * best run anywhere in the history.
 */
function streaksFrom(daysDesc: number[]): { current: number; longest: number } {
  if (daysDesc.length === 0) return { current: 0, longest: 0 }

  const DAY = 86_400_000
  const todayMs = today().getTime()

  let current = 0
  if (daysDesc[0] === todayMs || daysDesc[0] === todayMs - DAY) {
    current = 1
    for (let i = 1; i < daysDesc.length; i++) {
      if (daysDesc[i - 1] - daysDesc[i] === DAY) current++
      else break
    }
  }

  let longest = 1
  let run = 1
  for (let i = 1; i < daysDesc.length; i++) {
    if (daysDesc[i - 1] - daysDesc[i] === DAY) run++
    else run = 1
    if (run > longest) longest = run
  }

  return { current, longest }
}
