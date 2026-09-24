'use client'

import { useActionState } from 'react'
import { becomeCoachAction } from '@/lib/actions/coach'
import {
  Field,
  FormMessage,
  Input,
  Textarea,
} from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'

export function BecomeCoachForm({
  categories,
}: {
  categories: { slug: string; name: string; emoji: string }[]
}) {
  const [state, action] = useActionState(becomeCoachAction, null)

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}

      <Field
        label="One-line headline"
        htmlFor="headline"
        error={state?.errors?.headline}
        hint="What you coach, in a sentence."
      >
        <Input
          name="headline"
          required
          maxLength={90}
          placeholder="Fitness & Weight Management Coach"
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          What do you coach? (up to 3)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <label
              key={category.slug}
              className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3"
            >
              <input
                type="checkbox"
                name="categories"
                value={category.slug}
                className="size-4 accent-[var(--color-brand)]"
              />
              <span className="text-sm font-semibold">
                <span aria-hidden>{category.emoji}</span> {category.name}
              </span>
            </label>
          ))}
        </div>
        {state?.errors?.categories ? (
          <p className="text-xs text-red-600">{state.errors.categories[0]}</p>
        ) : null}
      </fieldset>

      <Field
        label="Years coaching"
        htmlFor="yearsExperience"
        error={state?.errors?.yearsExperience}
      >
        <Input
          name="yearsExperience"
          type="number"
          inputMode="numeric"
          min="0"
          max="60"
          required
          defaultValue={1}
        />
      </Field>

      <Field label="About you" htmlFor="bio" error={state?.errors?.bio}>
        <Textarea
          name="bio"
          rows={5}
          required
          maxLength={2000}
          placeholder="How you coach, who you work with, and what people can expect."
        />
      </Field>

      <Field
        label="Experience and training"
        htmlFor="credentials"
        error={state?.errors?.credentials}
        hint="One per line. Shown as your own claims until CoachHub verifies them."
      >
        <Textarea
          name="credentials"
          rows={3}
          maxLength={500}
          placeholder={'Certified personal trainer, 2019\nCoached 200+ clients'}
        />
      </Field>

      <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-xs text-[var(--color-ink-muted)]">
        <p className="font-semibold text-[var(--color-ink)]">
          Before you apply
        </p>
        <p className="mt-1">
          Coaching on CoachHub is general wellness guidance. Do not present
          yourself as a doctor, dietitian, physiotherapist or psychologist
          unless you hold that licence and it has been verified. Accounts that
          do are removed.
        </p>
      </div>

      <SubmitButton block size="lg" pendingLabel="Submitting…">
        Apply to coach
      </SubmitButton>
    </form>
  )
}
