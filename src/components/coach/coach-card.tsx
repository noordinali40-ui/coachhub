import Link from 'next/link'
import { MapPin, Star, Users } from 'lucide-react'
import { Avatar, Badge } from '@/components/ui/display'
import { countryLabel } from '@/lib/constants'
import { formatCompact } from '@/lib/utils'

export type CoachCardData = {
  slug: string
  headline: string
  verification: 'COMMUNITY' | 'VERIFIED' | 'PROFESSIONAL'
  ratingAvg: number
  ratingCount: number
  studentCount: number
  fullName: string
  avatarUrl: string | null
  countryCode: string | null
  categories: { name: string; emoji: string }[]
}

export function CoachCard({ coach }: { coach: CoachCardData }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      <Avatar name={coach.fullName} src={coach.avatarUrl} size="lg" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-bold">{coach.fullName}</p>
          <VerificationBadge level={coach.verification} />
        </div>

        <p className="truncate text-sm text-[var(--color-ink-muted)]">
          {coach.headline}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-ink-muted)]">
          {coach.ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink)]">
              <Star
                className="size-3.5 fill-harvest-500 text-harvest-500"
                aria-hidden
              />
              {coach.ratingAvg.toFixed(1)}
              <span className="font-normal text-[var(--color-ink-muted)]">
                ({coach.ratingCount})
              </span>
            </span>
          ) : (
            <span>New coach</span>
          )}

          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            {formatCompact(coach.studentCount)}
          </span>

          {coach.countryCode ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {countryLabel(coach.countryCode)}
            </span>
          ) : null}
        </div>

        {coach.categories.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {coach.categories.slice(0, 3).map((category) => (
              <Badge key={category.name} tone="brand">
                <span aria-hidden>{category.emoji}</span>
                {category.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

/**
 * The badge distinguishes a self-declared coach from one whose identity or
 * credential was actually checked. "Professional" is never shown unless an
 * admin verified a real qualification.
 */
export function VerificationBadge({
  level,
}: {
  level: 'COMMUNITY' | 'VERIFIED' | 'PROFESSIONAL'
}) {
  if (level === 'COMMUNITY') return null

  return level === 'PROFESSIONAL' ? (
    <Badge
      tone="brand"
      title="A relevant professional qualification has been verified."
    >
      ✓ Professional
    </Badge>
  ) : (
    <Badge tone="success" title="Identity and experience verified.">
      ✓ Verified
    </Badge>
  )
}
