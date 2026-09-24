'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export type TabItem = { key: string; label: string; count?: number }

/**
 * Tabs implemented as links with a `?tab=` query param rather than client
 * state. Each tab is a real URL — shareable, back-button friendly, and the
 * content is rendered on the server so a tab switch ships markup instead of a
 * JSON payload plus a client render.
 */
export function QueryTabs({
  tabs,
  param = 'tab',
  className,
}: {
  tabs: TabItem[]
  param?: string
  className?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get(param) ?? tabs[0]?.key

  function hrefFor(key: string) {
    const next = new URLSearchParams(searchParams)
    if (key === tabs[0]?.key) next.delete(param)
    else next.set(param, key)
    const query = next.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div
      role="tablist"
      className={cn(
        'no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-[var(--color-border-subtle)] px-4',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive
                ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
                : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
