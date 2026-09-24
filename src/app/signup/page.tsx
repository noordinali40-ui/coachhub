import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/dal'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Create your account' }

export default async function SignupPage() {
  if (await getSessionUser()) redirect('/home')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="space-y-2">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Coach<span className="text-[var(--color-brand)]">Hub</span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          Start with a goal. Find someone to help you reach it.
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Free to join. Browse coaches across Africa and train from anywhere.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--color-brand)]">
          Log in
        </Link>
      </p>
    </main>
  )
}
