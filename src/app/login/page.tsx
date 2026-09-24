import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/dal'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Log in' }

export default async function LoginPage(props: PageProps<'/login'>) {
  if (await getSessionUser()) redirect('/home')

  const { next } = await props.searchParams
  const nextPath = typeof next === 'string' ? next : ''

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="space-y-2">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Coach<span className="text-[var(--color-brand)]">Hub</span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Pick up where you left off.
        </p>
      </div>

      <LoginForm next={nextPath} />

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-[var(--color-brand)]">
          Create an account
        </Link>
      </p>
    </main>
  )
}
