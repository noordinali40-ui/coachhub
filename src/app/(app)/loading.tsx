import { Skeleton } from '@/components/ui/display'

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
      </div>
    </div>
  )
}
