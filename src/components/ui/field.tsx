import * as React from 'react'
import { cn } from '@/lib/utils'

const controlBase =
  'w-full rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] disabled:opacity-60 aria-[invalid=true]:border-red-500'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(controlBase, 'h-11 text-base', className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(controlBase, 'min-h-24 py-2.5 text-base', className)}
      {...props}
    />
  )
}

export function Select({
  className,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <select className={cn(controlBase, 'h-11 text-base', className)} {...props} />
  )
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      className={cn('text-sm font-semibold text-[var(--color-ink)]', className)}
      {...props}
    />
  )
}

/**
 * Wires a label, control and error message together. The control reads its
 * `id`, `aria-invalid` and `aria-describedby` from here so screen readers
 * announce the error with the field rather than in isolation.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor: string
  error?: string[] | string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  const messages = Array.isArray(error) ? error : error ? [error] : []
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--color-ink-muted)]">
          {hint}
        </p>
      ) : null}
      {React.isValidElement<Record<string, unknown>>(children)
        ? React.cloneElement(children, {
            id: htmlFor,
            'aria-invalid': messages.length > 0 || undefined,
            'aria-describedby':
              [hint ? hintId : null, messages.length ? errorId : null]
                .filter(Boolean)
                .join(' ') || undefined,
          })
        : children}
      {messages.length > 0 ? (
        <ul id={errorId} className="space-y-0.5 text-xs text-red-600">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Form-level error, for failures that are not tied to one field. */
export function FormMessage({
  children,
  tone = 'error',
}: {
  children: React.ReactNode
  tone?: 'error' | 'success'
}) {
  if (!children) return null
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[var(--radius-control)] px-3 py-2 text-sm',
        tone === 'error'
          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
          : 'bg-savanna-50 text-savanna-700 dark:bg-savanna-900/40 dark:text-savanna-300',
      )}
    >
      {children}
    </p>
  )
}
