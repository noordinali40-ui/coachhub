import { ButtonLink } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-5xl font-extrabold text-[var(--color-brand)]">404</p>
      <h1 className="text-2xl font-extrabold tracking-tight">
        We couldn’t find that
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        The page may have moved, or you may not have access to it.
      </p>
      <div className="flex gap-2">
        <ButtonLink href="/home">Go home</ButtonLink>
        <ButtonLink href="/discover" variant="outline">
          Find a coach
        </ButtonLink>
      </div>
    </main>
  )
}
