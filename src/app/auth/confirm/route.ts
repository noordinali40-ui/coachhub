import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Handles the link in a Supabase confirmation email.
 *
 * The profile row is created at signup, but a user who confirms from a
 * different device may not have one yet (for example if signup was retried), so
 * this backfills it before sending them into onboarding.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`)
  }

  await prisma.user.upsert({
    where: { id: data.user.id },
    update: {},
    create: {
      id: data.user.id,
      email: data.user.email,
      profile: {
        create: { fullName: data.user.email.split('@')[0] },
      },
    },
  })

  const profile = await prisma.profile.findUnique({
    where: { userId: data.user.id },
    select: { onboardedAt: true },
  })

  return NextResponse.redirect(
    `${origin}${profile?.onboardedAt ? '/home' : '/onboarding'}`,
  )
}
