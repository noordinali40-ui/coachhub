import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeMemberStats,
  rankLeaderboard,
  type EntryInput,
} from './leaderboard.ts'

const DAY = 86_400_000
const D0 = Date.UTC(2026, 0, 1)

/** Entries on consecutive days starting at D0. */
function series(userId: string, values: number[]): EntryInput[] {
  return values
    .map((value, index) => ({ userId, value, day: D0 + index * DAY }))
    .filter((entry) => entry.value > 0)
}

describe('computeMemberStats', () => {
  it('totals entries and counts distinct active days', () => {
    const stats = computeMemberStats(
      [{ userId: 'a', baseline: null }],
      series('a', [100, 200, 300]),
      1000,
    )

    assert.equal(stats[0].total, 600)
    assert.equal(stats[0].activeDays, 3)
    assert.equal(stats[0].completed, false)
  })

  it('marks a member complete once the goal is reached', () => {
    const stats = computeMemberStats(
      [{ userId: 'a', baseline: null }],
      series('a', [600, 500]),
      1000,
    )
    assert.equal(stats[0].completed, true)
  })

  it('breaks the streak on a skipped day', () => {
    // Days 1,2 then a gap, then 4,5,6 — longest run is 3.
    const entries = [
      { userId: 'a', value: 10, day: D0 },
      { userId: 'a', value: 10, day: D0 + DAY },
      { userId: 'a', value: 10, day: D0 + 3 * DAY },
      { userId: 'a', value: 10, day: D0 + 4 * DAY },
      { userId: 'a', value: 10, day: D0 + 5 * DAY },
    ]
    const stats = computeMemberStats([{ userId: 'a', baseline: null }], entries, 1000)

    assert.equal(stats[0].streak, 3)
    assert.equal(stats[0].activeDays, 5)
  })

  it('measures improvement against the baseline, not the single best day', () => {
    // Starts at 1000, finishes averaging 2000 over the last three days.
    const stats = computeMemberStats(
      [{ userId: 'a', baseline: 1000 }],
      series('a', [1000, 1500, 2000, 2000, 2000]),
      99_999,
    )
    assert.equal(Math.round(stats[0].improvement), 100)
  })

  it('reports zero improvement when there is no baseline to compare against', () => {
    const stats = computeMemberStats([{ userId: 'a', baseline: null }], [], 1000)
    assert.equal(stats[0].improvement, 0)
    assert.equal(stats[0].total, 0)
    assert.equal(stats[0].streak, 0)
  })
})

describe('rankLeaderboard', () => {
  // Three deliberately different shapes:
  //   volume  — big numbers, misses days
  //   steady  — small numbers, never misses
  //   riser   — starts tiny, climbs hard
  const members = [
    { userId: 'volume', baseline: null },
    { userId: 'steady', baseline: null },
    { userId: 'riser', baseline: null },
  ]

  const entries = [
    ...series('volume', [12000, 0, 13000, 0, 14000, 0, 12000]),
    ...series('steady', [5000, 5000, 5000, 5000, 5000, 5000, 5000]),
    ...series('riser', [1000, 2000, 3000, 4000, 6000, 8000, 10000]),
  ]

  const stats = computeMemberStats(members, entries, 100_000)
  const rows = rankLeaderboard(stats)

  function winner(category: string) {
    return rows.find((r) => r.category === category && r.rank === 1)?.userId
  }

  it('ranks the highest total on the overall board', () => {
    assert.equal(winner('TOTAL'), 'volume')
  })

  it('rewards showing up on the consistency board, not the biggest numbers', () => {
    assert.equal(winner('CONSISTENCY'), 'steady')
  })

  it('ranks the longest unbroken run on the streak board', () => {
    // `volume` skips days, so it cannot win this one.
    assert.notEqual(winner('STREAK'), 'volume')
  })

  it('lets a beginner who climbed the most win most-improved', () => {
    assert.equal(winner('MOST_IMPROVED'), 'riser')
  })

  it('lists only members who reached the goal on the completion board', () => {
    const completion = rows.filter((r) => r.category === 'COMPLETION')
    assert.equal(completion.length, 0, 'nobody reached 100,000 here')
  })

  it('produces a dense 1..n ranking per board', () => {
    const total = rows
      .filter((r) => r.category === 'TOTAL')
      .map((r) => r.rank)
      .sort((a, b) => a - b)
    assert.deepEqual(total, [1, 2, 3])
  })

  it('gives every member a row on every non-completion board', () => {
    for (const category of ['TOTAL', 'CONSISTENCY', 'STREAK', 'MOST_IMPROVED']) {
      assert.equal(
        rows.filter((r) => r.category === category).length,
        members.length,
        `${category} should rank all members`,
      )
    }
  })
})
