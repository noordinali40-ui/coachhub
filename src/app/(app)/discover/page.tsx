import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/dal'
import { CoachCard } from '@/components/coach/coach-card'
import { ProgramCard } from '@/components/program/program-card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Badge, EmptyState, SectionHeading } from '@/components/ui/display'
import { COUNTRIES } from '@/lib/constants'
import type { Prisma } from '@/generated/prisma/client'

export const metadata: Metadata = {
  title: 'Discover coaches',
  description:
    'Search coaches and programs across Africa by goal, country, price and level.',
}

export default async function DiscoverPage(props: PageProps<'/discover'>) {
  const params = await props.searchParams
  const q = str(params.q)
  const category = str(params.category)
  const country = str(params.country)
  const price = str(params.price)
  const level = str(params.level)

  const user = await getSessionUser()

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { slug: true, name: true, emoji: true },
  })

  // Search matches a coach's own text and their programs, so "weight loss
  // coach" finds someone whose programs are about weight loss even if their
  // headline does not use the phrase.
  const coachWhere: Prisma.CoachWhereInput = {
    status: 'APPROVED',
    ...(category ? { categories: { some: { categorySlug: category } } } : {}),
    ...(country ? { user: { profile: { countryCode: country } } } : {}),
    ...(q
      ? {
          OR: [
            { headline: { contains: q, mode: 'insensitive' } },
            { bio: { contains: q, mode: 'insensitive' } },
            {
              user: {
                profile: { fullName: { contains: q, mode: 'insensitive' } },
              },
            },
            {
              programs: {
                some: {
                  status: 'PUBLISHED',
                  OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { summary: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            },
            { categories: { some: { category: { name: { contains: q, mode: 'insensitive' } } } } },
          ],
        }
      : {}),
  }

  const programWhere: Prisma.ProgramWhereInput = {
    status: 'PUBLISHED',
    ...(category ? { categorySlug: category } : {}),
    ...(price === 'free' ? { isFree: true } : {}),
    ...(price === 'paid' ? { isFree: false } : {}),
    ...(level ? { difficulty: level as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' } : {}),
    ...(country ? { coach: { user: { profile: { countryCode: country } } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [coaches, programs] = await Promise.all([
    prisma.coach.findMany({
      where: coachWhere,
      orderBy: [{ ratingAvg: 'desc' }, { studentCount: 'desc' }],
      take: 12,
      select: {
        slug: true,
        headline: true,
        verification: true,
        ratingAvg: true,
        ratingCount: true,
        studentCount: true,
        user: {
          select: {
            profile: {
              select: { fullName: true, avatarUrl: true, countryCode: true },
            },
          },
        },
        categories: {
          select: { category: { select: { name: true, emoji: true } } },
        },
      },
    }),
    prisma.program.findMany({
      where: programWhere,
      orderBy: [{ enrollmentCount: 'desc' }, { ratingAvg: 'desc' }],
      take: 12,
      select: {
        id: true,
        title: true,
        summary: true,
        durationDays: true,
        difficulty: true,
        priceCents: true,
        currency: true,
        isFree: true,
        enrollmentCount: true,
        ratingAvg: true,
        ratingCount: true,
        category: { select: { name: true, emoji: true } },
        coach: {
          select: {
            slug: true,
            user: {
              select: {
                profile: { select: { fullName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    }),
  ])

  const hasFilters = Boolean(q || category || country || price || level)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Discover</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Coaches across Africa. Online programs work from anywhere.
        </p>
      </header>

      {/* A GET form: every search is a shareable URL and works without JS. */}
      <form className="space-y-3" role="search">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-ink-muted)]"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Try “lose weight” or “running coach”"
              aria-label="Search coaches and programs"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select name="category" defaultValue={category} aria-label="Category">
            <option value="">All goals</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.emoji} {c.name}
              </option>
            ))}
          </Select>

          <Select name="country" defaultValue={country} aria-label="Country">
            <option value="">Anywhere in Africa</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </Select>

          <Select name="price" defaultValue={price} aria-label="Price">
            <option value="">Any price</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </Select>

          <Select name="level" defaultValue={level} aria-label="Level">
            <option value="">Any level</option>
            <option value="BEGINNER">Beginner friendly</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </Select>
        </div>

        {hasFilters ? (
          <Link
            href="/discover"
            className="inline-block text-sm font-semibold text-[var(--color-brand)]"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {!hasFilters ? (
        <section>
          <SectionHeading title="Browse by goal" />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/discover?category=${c.slug}`}
                className="flex w-28 shrink-0 flex-col items-center gap-1 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-center"
              >
                <span className="text-2xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-xs font-bold">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeading
          title={q ? `Coaches matching “${q}”` : 'Coaches'}
          action={<Badge tone="outline">{coaches.length}</Badge>}
        />
        {coaches.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {coaches.map((coach) => (
              <CoachCard
                key={coach.slug}
                coach={{
                  slug: coach.slug,
                  headline: coach.headline,
                  verification: coach.verification,
                  ratingAvg: Number(coach.ratingAvg),
                  ratingCount: coach.ratingCount,
                  studentCount: coach.studentCount,
                  fullName: coach.user.profile?.fullName ?? 'Coach',
                  avatarUrl: coach.user.profile?.avatarUrl ?? null,
                  countryCode: coach.user.profile?.countryCode ?? null,
                  categories: coach.categories.map((c) => c.category),
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No coaches match that yet"
            description="Try a different goal, or clear the country filter — most programs are online and work from anywhere."
          />
        )}
      </section>

      <section>
        <SectionHeading
          title="Programs"
          action={<Badge tone="outline">{programs.length}</Badge>}
        />
        {programs.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={{
                  id: program.id,
                  title: program.title,
                  summary: program.summary,
                  durationDays: program.durationDays,
                  difficulty: program.difficulty,
                  priceCents: program.priceCents,
                  currency: program.currency,
                  enrollmentCount: program.enrollmentCount,
                  ratingAvg: Number(program.ratingAvg),
                  ratingCount: program.ratingCount,
                  category: program.category,
                  coachName: program.coach.user.profile?.fullName ?? 'Coach',
                  coachAvatarUrl: program.coach.user.profile?.avatarUrl ?? null,
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No programs match those filters" />
        )}
      </section>

      {!user ? (
        <p className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4 text-center text-sm">
          <Link href="/signup" className="font-bold text-[var(--color-brand)]">
            Create a free account
          </Link>{' '}
          to join a program and track your progress.
        </p>
      ) : null}
    </div>
  )
}

function str(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : ''
}
