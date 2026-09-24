'use client'

import { useActionState, useState } from 'react'
import { logMetricAction } from '@/lib/actions/enrollment'
import { Field, FormMessage, Input, Select } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { METRIC_META } from '@/lib/constants'

type Metric = keyof typeof METRIC_META

export function MetricLogger({
  enrollmentId,
  metrics,
}: {
  enrollmentId: string
  metrics: Metric[]
}) {
  const [state, action] = useActionState(logMetricAction, null)
  const [metric, setMetric] = useState<Metric>(metrics[0])

  return (
    <form
      action={action}
      className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
    >
      {state?.message ? (
        <FormMessage tone={state.ok ? 'success' : 'error'}>
          {state.message}
        </FormMessage>
      ) : null}

      <input type="hidden" name="enrollmentId" value={enrollmentId} />

      <div className="flex gap-2">
        <Field label="Measure" htmlFor="metric" className="flex-1">
          <Select
            name="metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {METRIC_META[m].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={`Today (${METRIC_META[metric].unit})`}
          htmlFor="value"
          error={state?.errors?.value}
          className="flex-1"
        >
          <Input
            name="value"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
          />
        </Field>
      </div>

      <SubmitButton variant="secondary" block pendingLabel="Saving…">
        Log today
      </SubmitButton>

      <p className="text-xs text-[var(--color-ink-muted)]">
        One reading per day. Logging again replaces today’s value.
      </p>
    </form>
  )
}
