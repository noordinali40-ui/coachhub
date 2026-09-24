import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Flame, Trophy, Users, Wifi } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/dal'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default async function LandingPage() {
  const user = await getSessionUser()
  if (user) redirect(user.coachId ? '/coach' : '/home')

  const categories = await prisma.category
    .findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true, emoji: true },
    })
    // The landing page must render before the database exists, otherwise a
    // fresh clone shows a stack trace instead of the product.
    .catch(() => [])

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-5xl items-center px-5">
        <Link href="/" className="font-extrabold tracking-tight">
          Coach<span className="text-[var(--color-brand)]">Hub</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Join free
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-5 py-10">
        <section className="space-y-5">
          <p className="text-sm font-bold text-[var(--color-brand)]">
            Built for Africa 🌍
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Find a coach. Follow a program.{' '}
            <span className="text-[var(--color-brand)]">Grow together.</span>
          </h1>
          <p className="max-w-xl text-lg text-[var(--color-ink-muted)]">
            Fitness, nutrition, weight, running and everyday habits — coached by
            real people across the continent, with a community keeping you
            honest.
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/signup" size="lg">
              Start free
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="/discover" variant="outline" size="lg">
              Browse coaches
            </ButtonLink>
          </div>
        </section>

        {categories.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--color-ink-muted)]">
              What do you want to improve?
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/discover?category=${category.slug}`}
                  className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold hover:border-[var(--color-brand)]"
                >
                  <span aria-hidden>{category.emoji}</span> {category.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: Flame,
              title: 'Daily tasks, not lectures',
              body: 'Your coach sets what to do today. Tick it off, build a streak, watch the number move.',
            },
            {
              icon: Users,
              title: 'A community, not a feed',
              body: 'Every coach runs their own community. People training for the same thing, cheering each other on.',
            },
            {
              icon: Trophy,
              title: 'Challenges that reward showing up',
              body: 'Boards rank consistency, streaks and improvement — not just whoever is already the fittest.',
            },
            {
              icon: Wifi,
              title: 'Works on a weak connection',
              body: 'Text-first lessons, light pages and a low-data mode. Train from a village or a city.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="space-y-2 p-5">
                <Icon className="size-5 text-[var(--color-brand)]" aria-hidden />
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-[var(--color-ink-muted)]">{body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-6">
          <h2 className="text-xl font-extrabold tracking-tight">
            Do you coach people?
          </h2>
          <p className="mt-2 max-w-xl text-[var(--color-ink-muted)]">
            Get a profile, programs, a community, student progress tracking,
            messaging, challenges and a place to sell — your own coaching
            business inside CoachHub.
          </p>
          <ButtonLink href="/signup" variant="outline" className="mt-4">
            Set up your coaching space
          </ButtonLink>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border-subtle)] px-5 py-6">
        <p className="mx-auto max-w-5xl text-xs text-[var(--color-ink-muted)]">
          Coaching on CoachHub is general wellness guidance, not medical,
          nutritional or psychological treatment. Speak to a licensed
          professional about symptoms, diagnoses, medication or a health
          condition.
        </p>
      </footer>
    </div>
  )
}
