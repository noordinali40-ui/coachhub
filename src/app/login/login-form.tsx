'use client'

import { useActionState } from 'react'
import { logInAction } from '@/lib/actions/auth'
import { Field, FormMessage, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(logInAction, null)

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}
      <input type="hidden" name="next" value={next ?? ''} />

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state?.errors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton block size="lg" pendingLabel="Logging in…">
        Log in
      </SubmitButton>
    </form>
  )
}
