'use client'

import { useActionState, useState } from 'react'
import { createChallengeAction } from '@/lib/actions/challenges'
import {
  Field,
  FormMessage,
  Input,
  Select,
  Textarea,
} from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { METRIC_META } from '@/lib/constants'

const METRICS = [
  'STEPS',
  'DISTANCE_KM',
  'WORKOUTS',
  'ACTIVE_MINUTES',
  'WATER_LITRES',
  'HABIT_DAYS',
] as const

export function ChallengeForm({
  communities,
}: {
  communities: { id: string; name: string }[]
}) {
  const [state, action] = useActionState(createChallengeAction, null)

  // Read the clock once on mount rather than on every render, so the default
  // dates stay put while the coach is filling the form in.
  const [startDefault] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDefault] = useState(() =>
    new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  )

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message ? <FormMessage>{state.message}</FormMessage> : null}

      <Field label="Title" htmlFor="title" error={state?.errors?.title}>
        <Input
          name="title"
          required
          maxLength={90}
          placeholder="30-Day Walking Challenge"
        />
      </Field>

      <Field
        label="What it involves"
        htmlFor="description"
        error={state?.errors?.description}
      >
        <Textarea
          name="description"
          rows={4}
          required
          maxLength={1500}
          placeholder="Walk every day and log your steps. Anyone can take part — it's about showing up, not speed."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Measure" htmlFor="metric" error={state?.errors?.metric}>
          <Select name="metric" defaultValue="STEPS">
            {METRICS.map((metric) => (
              <option key={metric} value={metric}>
                {METRIC_META[metric].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Goal per person"
          htmlFor="goalValue"
          error={state?.errors?.goalValue}
        >
          <Input
            name="goalValue"
            type="number"
            inputMode="numeric"
            min="1"
            required
            defaultValue={100000}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="startsOn" error={state?.errors?.startsOn}>
          <Input
            name="startsOn"
            type="date"
            required
            defaultValue={startDefault}
          />
        </Field>

        <Field label="Ends" htmlFor="endsOn" error={state?.errors?.endsOn}>
          <Input name="endsOn" type="date" required defaultValue={endDefault} />
        </Field>
      </div>

      {communities.length > 0 ? (
        <Field
          label="Community"
          htmlFor="communityId"
          error={state?.errors?.communityId}
          hint="Members get notified when you publish."
        >
          <Select name="communityId" defaultValue={communities[0].id}>
            <option value="">No community — open to everyone</option>
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <SubmitButton block size="lg" pendingLabel="Creating…">
        Create challenge
      </SubmitButton>
    </form>
  )
}
