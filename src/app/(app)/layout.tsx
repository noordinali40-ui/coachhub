import Link from 'next/link'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/dal'
import { TopBar } from '@/components/shell/top-bar'
import { BottomNav, SideNav } from '@/components/shell/bottom-nav'
import { ButtonLink } from '@/components/ui/button'

/**
 * Shared shell for the signed-in product and for the publicly browsable
 * discovery pages.
 *
 * This layout is not an auth boundary — layouts do not re-render on every
 * navigation and do not control whether nested segments run. Each page calls
 * `requireUser()` itself; the shell only decides which chrome to show.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    return (
      <div className="min-h-dvh">
        <header className="sticky top-0 z-40 h-16 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 backdrop-blur">
          <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4">
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
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    )
  }

  const mode = user.coachId ? 'coach' : 'client'

  const [unreadNotifications, unreadMessages] = await Promise.all([
    prisma.notification.count({
      where: { userId: user.id, readAt: null, type: { not: 'MESSAGE' } },
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null, type: 'MESSAGE' },
    }),
  ])

  return (
    <div className="min-h-dvh">
      <TopBar user={user} unreadNotifications={unreadNotifications} />
      <div className="mx-auto flex max-w-6xl gap-6 px-4">
        <SideNav mode={mode} unreadCount={unreadMessages} />
        {/* pb-20 keeps content clear of the fixed mobile tab bar. */}
        <main className="min-w-0 flex-1 py-5 pb-24 md:pb-8">
          <Suspense>{children}</Suspense>
        </main>
      </div>
      <BottomNav mode={mode} unreadCount={unreadMessages} />
    </div>
  )
}
