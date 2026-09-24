'use client'

import { useEffect } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Something went wrong
      </h1>
      <p className="text-sm text-[var(--color-ink-muted)]">
        That’s on us, not you. Try again — if it keeps happening, go back home.
      </p>
      {error.digest ? (
        <p className="text-xs text-[var(--color-ink-muted)]">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/home" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </main>
  )
}
