/**
 * Leaderboard scoring.
 *
 * Pure functions with no database or framework imports, so the Server Action
 * and the seed script share one definition of "who is winning" — and so the
 * ranking rules can be tested on their own.
 *
 * Ranking on more than raw output is deliberate: a beginner who shows up every
 * day should be able to top a board, which is why consistency, streak and
 * improvement are ranked alongside the total.
 */

export type LeaderboardCategoryKey =
  | 'TOTAL'
  | 'CONSISTENCY'
  | 'STREAK'
  | 'MOST_IMPROVED'
  | 'COMPLETION'

export const LEADERBOARD_CATEGORIES: LeaderboardCategoryKey[] = [
  'TOTAL',
  'CONSISTENCY',
  'STREAK',
  'MOST_IMPROVED',
  'COMPLETION',
]

export type MemberInput = {
  userId: string
  /** First logged value, used as the improvement baseline. */
  baseline: number | null
}

export type EntryInput = {
  userId: string
  value: number
  /** Calendar day as a UTC-midnight epoch milliseconds value. */
  day: number
}

export type MemberStats = {
  userId: string
  total: number
  activeDays: number
  streak: number
  improvement: number
  completed: boolean
}

export type RankedRow = {
  category: LeaderboardCategoryKey
  userId: string
  rank: number
  score: number
}

const DAY_MS = 86_400_000

export function computeMemberStats(
  members: MemberInput[],
  entries: EntryInput[],
  goal: number,
): MemberStats[] {
  const byUser = new Map<string, EntryInput[]>()
  for (const entry of entries) {
    const list = byUser.get(entry.userId) ?? []
    list.push(entry)
    byUser.set(entry.userId, list)
  }

  return members.map((member) => {
    const list = (byUser.get(member.userId) ?? []).sort((a, b) => a.day - b.day)
    const total = list.reduce((sum, e) => sum + e.value, 0)
    const days = [...new Set(list.map((e) => e.day))].sort((a, b) => a - b)

    let streak = 0
    let run = 0
    for (let i = 0; i < days.length; i++) {
      run = i > 0 && days[i] - days[i - 1] === DAY_MS ? run + 1 : 1
      if (run > streak) streak = run
    }

    // Compare the opening day against the average of the last three, so one
    // strong day does not dominate the "most improved" board.
    const baseline = member.baseline ?? list[0]?.value ?? 0
    const recent = list.slice(-3)
    const recentAvg = recent.length
      ? recent.reduce((sum, e) => sum + e.value, 0) / recent.length
      : 0
    const improvement =
      baseline > 0 ? ((recentAvg - baseline) / baseline) * 100 : 0

    return {
      userId: member.userId,
      total,
      activeDays: days.length,
      streak,
      improvement,
      completed: goal > 0 && total >= goal,
    }
  })
}

export function rankLeaderboard(stats: MemberStats[]): RankedRow[] {
  const boards: Record<LeaderboardCategoryKey, MemberStats[]> = {
    TOTAL: [...stats].sort((a, b) => b.total - a.total),
    CONSISTENCY: [...stats].sort(
      (a, b) => b.activeDays - a.activeDays || b.total - a.total,
    ),
    STREAK: [...stats].sort(
      (a, b) => b.streak - a.streak || b.activeDays - a.activeDays,
    ),
    MOST_IMPROVED: [...stats].sort((a, b) => b.improvement - a.improvement),
    COMPLETION: stats.filter((s) => s.completed).sort((a, b) => b.total - a.total),
  }

  const score: Record<LeaderboardCategoryKey, (s: MemberStats) => number> = {
    TOTAL: (s) => s.total,
    CONSISTENCY: (s) => s.activeDays,
    STREAK: (s) => s.streak,
    MOST_IMPROVED: (s) => Math.round(s.improvement * 100) / 100,
    COMPLETION: (s) => s.total,
  }

  return LEADERBOARD_CATEGORIES.flatMap((category) =>
    boards[category].map((row, index) => ({
      category,
      userId: row.userId,
      rank: index + 1,
      score: score[category](row),
    })),
  )
}
