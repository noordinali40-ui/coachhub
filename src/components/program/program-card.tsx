import Link from 'next/link'
import { CalendarDays, Star, Users } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui/display'
import { formatCompact, formatPrice } from '@/lib/utils'

export type ProgramCardData = {
  id: string
  title: string
  summary: string
  durationDays: number
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  priceCents: number
  currency: string
  enrollmentCount: number
  ratingAvg: number
  ratingCount: number
  category: { name: string; emoji: string }
  coachName: string
  coachAvatarUrl: string | null
}

const DIFFICULTY_LABEL = {
  BEGINNER: 'Beginner friendly',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
} as const

export function ProgramCard({ program }: { program: ProgramCardData }) {
  return (
    <Link
      href={`/programs/${program.id}`}
      className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start justify-between gap-2">
        <Badge tone="brand">
          <span aria-hidden>{program.category.emoji}</span>
          {program.category.name}
        </Badge>
        <span className="shrink-0 font-extrabold text-[var(--color-brand)]">
          {formatPrice(program.priceCents, program.currency)}
        </span>
      </div>

      <p className="font-bold text-balance">{program.title}</p>
      <p className="line-clamp-2 text-sm text-[var(--color-ink-muted)]">
        {program.summary}
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-muted)]">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" aria-hidden />
          {program.durationDays} days
        </span>
        <span>{DIFFICULTY_LABEL[program.difficulty]}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden />
          {formatCompact(program.enrollmentCount)}
        </span>
        {program.ratingCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Star
              className="size-3.5 fill-harvest-500 text-harvest-500"
              aria-hidden
            />
            {program.ratingAvg.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <Avatar
          name={program.coachName}
          src={program.coachAvatarUrl}
          size="sm"
        />
        <span className="truncate text-sm text-[var(--color-ink-muted)]">
          {program.coachName}
        </span>
      </div>
    </Link>
  )
}
