'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass,
  Dumbbell,
  Home,
  MessageCircle,
  User,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: React.ElementType }

const CLIENT_NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

const COACH_NAV: NavItem[] = [
  { href: '/coach', label: 'Dashboard', icon: Home },
  { href: '/coach/students', label: 'Students', icon: Users },
  { href: '/coach/programs', label: 'Programs', icon: Dumbbell },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav({
  mode,
  unreadCount = 0,
}: {
  mode: 'client' | 'coach'
  unreadCount?: number
}) {
  const pathname = usePathname()
  const items = mode === 'coach' ? COACH_NAV : CLIENT_NAV

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          // Exact match for section roots, prefix match for their children, so
          // /coach does not stay highlighted on /coach/students.
          const isActive =
            pathname === href ||
            (href !== '/coach' && href !== '/home' && pathname.startsWith(`${href}/`))
          const showBadge = href === '/messages' && unreadCount > 0

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                  isActive
                    ? 'text-[var(--color-brand)]'
                    : 'text-[var(--color-ink-muted)]',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
                {showBadge ? (
                  <span className="absolute top-2.5 right-[22%] grid min-w-4 place-items-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] leading-4 text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function SideNav({
  mode,
  unreadCount = 0,
}: {
  mode: 'client' | 'coach'
  unreadCount?: number
}) {
  const pathname = usePathname()
  const items = mode === 'coach' ? COACH_NAV : CLIENT_NAV

  return (
    <nav
      aria-label="Primary"
      className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col gap-1 border-r border-[var(--color-border-subtle)] p-3 md:flex"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href ||
          (href !== '/coach' && href !== '/home' && pathname.startsWith(`${href}/`))
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-semibold',
              isActive
                ? 'bg-clay-50 text-[var(--color-brand)] dark:bg-sand-800'
                : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {href === '/messages' && unreadCount > 0 ? (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-[var(--color-brand)] px-1.5 text-[11px] text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
