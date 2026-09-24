import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Avatar } from '@/components/ui/display'
import type { SessionUser } from '@/lib/dal'

export function TopBar({
  user,
  unreadNotifications,
}: {
  user: SessionUser
  unreadNotifications: number
}) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4">
        <Link href={user.coachId ? '/coach' : '/home'} className="font-extrabold tracking-tight">
          Coach<span className="text-[var(--color-brand)]">Hub</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative grid size-11 place-items-center rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
            aria-label={
              unreadNotifications > 0
                ? `Notifications, ${unreadNotifications} unread`
                : 'Notifications'
            }
          >
            <Bell className="size-5" aria-hidden />
            {unreadNotifications > 0 ? (
              <span className="absolute top-2 right-2 grid min-w-4 place-items-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] leading-4 text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            ) : null}
          </Link>
          <Link href="/profile" aria-label="Your profile">
            <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  )
}
