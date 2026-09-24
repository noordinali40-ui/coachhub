'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Check, Loader2 } from 'lucide-react'
import { toggleTaskAction } from '@/lib/actions/enrollment'
import { FormMessage } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export type TaskView = {
  id: string
  title: string
  description: string | null
  targetValue: number | null
  unit: string | null
  required: boolean
  done: boolean
}

export function TaskList({
  enrollmentId,
  tasks,
}: {
  enrollmentId: string
  tasks: TaskView[]
}) {
  const [state, action] = useActionState(toggleTaskAction, null)

  return (
    <div className="space-y-2">
      {state?.message && !state.ok ? (
        <FormMessage>{state.message}</FormMessage>
      ) : null}

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <form action={action}>
              <input type="hidden" name="enrollmentId" value={enrollmentId} />
              <input type="hidden" name="taskId" value={task.id} />
              {task.targetValue !== null ? (
                <input type="hidden" name="value" value={task.targetValue} />
              ) : null}
              <TaskRow task={task} />
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TaskRow({ task }: { task: TaskView }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={task.done}
      className={cn(
        'flex w-full items-center gap-3 rounded-[var(--radius-control)] border p-3 text-left transition-colors',
        task.done
          ? 'border-savanna-500/40 bg-savanna-50 dark:bg-savanna-900/20'
          : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
        pending && 'opacity-60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-md border-2',
          task.done
            ? 'border-savanna-600 bg-savanna-600 text-white'
            : 'border-sand-300 dark:border-sand-600',
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : task.done ? (
          <Check className="size-4" />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block font-semibold',
            task.done && 'text-[var(--color-ink-muted)] line-through',
          )}
        >
          {task.title}
        </span>
        {task.description ? (
          <span className="block text-sm text-[var(--color-ink-muted)]">
            {task.description}
          </span>
        ) : null}
      </span>

      {task.targetValue !== null ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-ink-muted)]">
          {task.targetValue}
          {task.unit ? ` ${task.unit}` : ''}
        </span>
      ) : null}
    </button>
  )
}
