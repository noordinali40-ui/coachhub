'use client'

import { useActionState, useState } from 'react'
import { Check } from 'lucide-react'
import { completeOnboardingAction } from '@/lib/actions/auth'
import { Field, FormMessage, Input } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { cn } from '@/lib/utils'

const MAX_GOALS = 4

type Category = {
  slug: string
  name: string
  emoji: string
  description: string
}

export function OnboardingForm({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState(completeOnboardingAction, null)
  const [selected, setSelected] = useState<string[]>([])

  function toggle(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : current.length >= MAX_GOALS
          ? current
          : [...current, slug],
    )
  }

  return (
    <form action={action} className="space-y-6">
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}

      <fieldset>
        <legend className="sr-only">Choose your goals</legend>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => {
            const isSelected = selected.includes(category.slug)
            const atLimit = !isSelected && selected.length >= MAX_GOALS

            return (
              <label
                key={category.slug}
                className={cn(
                  'relative flex cursor-pointer flex-col gap-1 rounded-[var(--radius-card)] border-2 p-4 transition-colors',
                  isSelected
                    ? 'border-[var(--color-brand)] bg-clay-50 dark:bg-sand-800'
                    : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)]',
                  atLimit && 'opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  name="goals"
                  value={category.slug}
                  checked={isSelected}
                  onChange={() => toggle(category.slug)}
                  disabled={atLimit}
                  className="sr-only"
                />
                <span className="text-2xl" aria-hidden>
                  {category.emoji}
                </span>
                <span className="font-bold">{category.name}</span>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {category.description}
                </span>
                {isSelected ? (
                  <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-[var(--color-brand)] text-white">
                    <Check className="size-3" aria-hidden />
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>
        {state?.errors?.goals ? (
          <p className="mt-2 text-xs text-red-600">{state.errors.goals[0]}</p>
        ) : null}
      </fieldset>

      <Field
        label="Where are you based?"
        htmlFor="city"
        error={state?.errors?.city}
        hint="Optional. Helps us show coaches near you — online programs work from anywhere."
      >
        <Input name="city" placeholder="Nairobi" autoComplete="address-level2" />
      </Field>

      <label className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-4">
        <input
          type="checkbox"
          name="lowDataMode"
          className="mt-0.5 size-5 accent-[var(--color-brand)]"
        />
        <span>
          <span className="block font-bold">Low-data mode</span>
          <span className="block text-sm text-[var(--color-ink-muted)]">
            Skip images and video previews. Best on a slow or metered
            connection.
          </span>
        </span>
      </label>

      <SubmitButton block size="lg" pendingLabel="Setting up…">
        {selected.length > 0
          ? `Continue with ${selected.length} goal${selected.length > 1 ? 's' : ''}`
          : 'Continue'}
      </SubmitButton>
    </form>
  )
}
