'use client'

import { useActionState } from 'react'
import { signUpAction } from '@/lib/actions/auth'
import { Field, FormMessage, Input, Select } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { COUNTRIES } from '@/lib/constants'

export function SignupForm() {
  const [state, action] = useActionState(signUpAction, null)

  // On success without a session, the account exists but needs email
  // confirmation — show that instead of the form.
  if (state?.ok && state.message) {
    return <FormMessage tone="success">{state.message}</FormMessage>
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}

      <Field label="Your name" htmlFor="fullName" error={state?.errors?.fullName}>
        <Input
          name="fullName"
          autoComplete="name"
          required
          placeholder="Ahmed Hassan"
        />
      </Field>

      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={state?.errors?.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="Country" htmlFor="countryCode" error={state?.errors?.countryCode}>
        <Select name="countryCode" required defaultValue="">
          <option value="" disabled>
            Choose your country
          </option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton block size="lg" pendingLabel="Creating your account…">
        Create account
      </SubmitButton>

      <p className="text-xs text-[var(--color-ink-muted)]">
        Coaching on CoachHub is general wellness guidance, not medical care.
      </p>
    </form>
  )
}
