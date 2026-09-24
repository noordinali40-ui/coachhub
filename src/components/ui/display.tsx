import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn, initials, percent } from '@/lib/utils'

// --- Badge -----------------------------------------------------------------

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      tone: {
        neutral:
          'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]',
        brand: 'bg-clay-50 text-clay-700 dark:bg-clay-900/40 dark:text-clay-200',
        success:
          'bg-savanna-50 text-savanna-700 dark:bg-savanna-900/40 dark:text-savanna-300',
        gold: 'bg-harvest-100 text-harvest-700 dark:bg-harvest-700/25 dark:text-harvest-300',
        outline:
          'border border-[var(--color-border-subtle)] text-[var(--color-ink-muted)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

// --- Avatar ----------------------------------------------------------------

const avatarSizes = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
} as const

/**
 * Renders initials rather than a remote placeholder image. On a slow
 * connection an avatar grid should cost zero extra requests.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof avatarSizes
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-clay-100 font-bold text-clay-700 dark:bg-sand-800 dark:text-clay-200',
        avatarSizes[size],
        className,
      )}
    >
      {src ? (
        // Avatars come from arbitrary user-supplied hosts, so next/image would
        // need every one allow-listed in next.config. They are also small and
        // lazy-loaded, so the optimizer buys little here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}

// --- Progress --------------------------------------------------------------

export function ProgressBar({
  value,
  total,
  label,
  className,
}: {
  value: number
  total: number
  label?: string
  className?: string
}) {
  const pct = percent(value, total)
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-savanna-500 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * Progress ring drawn with a single SVG circle and `stroke-dasharray`, so it
 * costs no JavaScript and animates with CSS only.
 */
export function ProgressRing({
  value,
  total,
  size = 88,
  stroke = 8,
  children,
  label,
}: {
  value: number
  total: number
  size?: number
  stroke?: number
  children?: React.ReactNode
  label?: string
}) {
  const pct = percent(value, total)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Progress'}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-[var(--color-surface-muted)]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="stroke-savanna-500 transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute grid place-items-center text-center leading-none">
        {children ?? <span className="text-lg font-bold">{pct}%</span>}
      </span>
    </div>
  )
}

// --- Layout helpers --------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-subtle)] px-6 py-12 text-center">
      {icon ? (
        <span className="grid size-12 place-items-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-bold">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-control)] bg-[var(--color-surface-muted)]',
        className,
      )}
      {...props}
    />
  )
}

export function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      {action}
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] p-3">
      <p className="text-xs font-medium text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</p>
      {hint ? (
        <p className="text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
