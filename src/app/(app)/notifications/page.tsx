import type { Metadata } from 'next'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { Avatar, EmptyState } from '@/components/ui/display'
import { cn, relativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const user = await requireUser()

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      url: true,
      readAt: true,
      createdAt: true,
      actor: {
        select: { profile: { select: { fullName: true, avatarUrl: true } } },
      },
    },
  })

  // Opening the page is the read receipt. Done after the read so the unread
  // styling is still visible on this render.
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>

      {notifications.length > 0 ? (
        <ul className="space-y-1">
          {notifications.map((notification) => {
            const content = (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-[var(--radius-card)] border p-3',
                  notification.readAt
                    ? 'border-[var(--color-border-subtle)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-brand)]/30 bg-clay-50 dark:bg-sand-800',
                )}
              >
                {notification.actor ? (
                  <Avatar
                    name={notification.actor.profile?.fullName ?? 'Member'}
                    src={notification.actor.profile?.avatarUrl}
                    size="sm"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
                    <Bell className="size-4" aria-hidden />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{notification.title}</p>
                  {notification.body ? (
                    <p className="line-clamp-2 text-sm text-[var(--color-ink-muted)]">
                      {notification.body}
                    </p>
                  ) : null}
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {relativeTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            )

            return (
              <li key={notification.id}>
                {notification.url ? (
                  <Link href={notification.url}>{content}</Link>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="Nothing yet"
          description="Streaks, coach messages, challenge updates and community replies show up here."
        />
      )}
    </div>
  )
}
