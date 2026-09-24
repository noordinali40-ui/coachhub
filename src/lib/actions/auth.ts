'use server'

import * as z from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/dal'
import { loginSchema, onboardingSchema, signupSchema } from '@/lib/validation'
import { fieldErrors, toActionError, type ActionState } from './types'

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    countryCode: formData.get('countryCode'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  const { fullName, email, password, countryCode } = parsed.data

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      // Supabase returns a generic message for an already-registered email when
      // email confirmation is on; surface whatever it gives us rather than
      // inventing a message that might leak whether the account exists.
      return { ok: false, message: error.message }
    }
    if (!data.user) {
      return { ok: false, message: 'Could not create your account. Try again.' }
    }

    // Mirror the auth user into our schema. Idempotent, because Supabase
    // returns the existing user for a repeated signup of an unconfirmed email.
    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email,
        role: 'CLIENT',
        profile: { create: { fullName, countryCode } },
      },
    })

    // With email confirmation enabled there is no session yet.
    if (!data.session) {
      return {
        ok: true,
        message: `Almost there — we sent a confirmation link to ${email}.`,
      }
    }
  } catch (error) {
    return toActionError(error)
  }

  redirect('/onboarding')
}

export async function logInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  const next = String(formData.get('next') ?? '')
  let destination = '/home'

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

    if (error) {
      // Deliberately does not distinguish "no such account" from "wrong
      // password" — that difference is an account-enumeration oracle.
      return { ok: false, message: 'That email and password do not match.' }
    }

    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { status: true, coach: { select: { status: true } }, profile: { select: { onboardedAt: true } } },
    })

    if (user?.status === 'SUSPENDED') {
      await supabase.auth.signOut()
      return {
        ok: false,
        message: 'This account is suspended. Contact support@coachhub.africa.',
      }
    }

    if (!user?.profile?.onboardedAt) destination = '/onboarding'
    else if (user.coach?.status === 'APPROVED') destination = '/coach'

    // Only follow `next` when it is a local path, so the parameter cannot be
    // used to bounce a freshly authenticated user to another origin.
    if (next.startsWith('/') && !next.startsWith('//')) destination = next
  } catch (error) {
    return toActionError(error)
  }

  redirect(destination)
}

export async function logOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function completeOnboardingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse({
    goals: formData.getAll('goals').map(String),
    city: formData.get('city') ?? '',
    lowDataMode: formData.get('lowDataMode') === 'on',
  })

  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(z.flattenError(parsed.error).fieldErrors) }
  }

  try {
    const user = await requireUser()
    const { goals, city, lowDataMode } = parsed.data

    // Guard against a crafted request naming a category that is not live yet.
    const valid = await prisma.category.findMany({
      where: { slug: { in: goals }, active: true },
      select: { slug: true },
    })
    if (valid.length === 0) {
      return { ok: false, errors: { goals: ['Pick at least one goal.'] } }
    }

    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        goals: valid.map((c) => c.slug),
        city: city || null,
        lowDataMode,
        onboardedAt: new Date(),
      },
    })
  } catch (error) {
    return toActionError(error)
  }

  revalidatePath('/', 'layout')
  redirect('/home')
}
