# CoachHub Africa

A mobile-first coaching platform: people find a coach, join their program, do the
daily work, track progress, and stay accountable inside that coach's community.

The core loop the whole product is built around:

> **Goal → Coach → Program → Action → Progress → Community → Accountability**

This is not a course platform. There are no lessons-for-their-own-sake, no exams
and no certificates — a lesson exists to tell you what to do today, and the
tasks under it are the point.

---

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com/dashboard), create a project, then collect:

| Value | Where |
| --- | --- |
| Project URL, anon key | Project Settings → API |
| Service role key | Project Settings → API keys |
| Connection strings | Project Settings → Database → Connection string |

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`. Two database URLs are needed and they are not
interchangeable:

- `DATABASE_URL` — the **pooled** connection (port 6543, `?pgbouncer=true`).
  The running app uses this.
- `DIRECT_URL` — the **direct** connection (port 5432). Prisma Migrate needs
  it, because advisory locks and DDL do not survive pgBouncer's transaction
  pooling.

### 3. Create the schema and seed it

```bash
npm install
npm run db:deploy   # applies prisma/migrations
npm run db:seed     # creates auth users + demo data
npm run dev
```

`db:seed` creates **real Supabase Auth users**, so every demo account can
actually log in. Password for all of them: `CoachHub2026!`

| Account | What it shows |
| --- | --- |
| `ahmed@coachhub.test` | Student mid-program, 12-day streak, in a community and a challenge |
| `mohamed@coachhub.test` | Coach with 4 students, a community, a live challenge |
| `amina@coachhub.test` | Coach — nutrition, `PROFESSIONAL` verification |
| `admin@coachhub.test` | Platform admin |

---

## Walking the core flow

Everything below actually works against the database — no mocked screens.

1. **Sign up** at `/signup` → **pick goals** at `/onboarding`
2. **Search** at `/discover` — try `weight loss`, filter by country or price
3. **Coach profile** at `/coaches/mohamed-abdi` — programs, about, community,
   challenges, reviews
4. **Program** → **Join** → lands on `/my/<enrollmentId>`
5. **Today's lesson and tasks** — tick one; the streak, ring and rollups update
6. **Join the community** → **write a post**, like and comment
7. Log in as the coach → `/coach` shows the student, their progress and who has
   gone quiet
8. `/coach/students/<id>` → student detail, measurements, **private notes**
9. **Message** the student; they receive it at `/messages`
10. `/coach/challenges/new` → create a challenge
11. As the student, **join** it and **log a day** → all five leaderboards recompute

---

## Architecture

```
src/
  app/
    (app)/            product shell — signed-in pages + public discovery
    login, signup, onboarding, become-a-coach
    auth/confirm      Supabase email-link handler
  components/         UI primitives + feature components
  lib/
    dal.ts            THE authorization boundary
    prisma.ts         Prisma client (pg driver adapter)
    actions/          Server Actions, one file per domain
    leaderboard.ts    pure ranking maths (unit-tested)
    validation.ts     Zod schemas — server-side, always
  proxy.ts            session refresh + optimistic redirects
prisma/
  schema.prisma       34 tables
  seed.ts             demo data with real history
```

### Where authorization lives

**`src/lib/dal.ts`, and nowhere else.**

Prisma connects as the database owner, so it bypasses RLS. Every check that
decides who may see or change what is made in the DAL, next to the data, and
re-run inside each Server Action rather than inferred from the UI that called
it.

Two rules this codebase follows:

- **Layouts are not auth boundaries.** They do not re-render on navigation and
  do not control whether nested segments run. `(app)/layout.tsx` only decides
  which chrome to show; each page calls `requireUser()` itself.
- **`proxy.ts` is not an auth boundary.** It runs on prefetches too, so it only
  reads the session cookie and never touches the database.

Specific guarantees, each enforced by a query filter rather than a UI condition:

- A coach can only read students enrolled on **their own** programs
  (`assertCoachOwnsStudent`).
- Private coach notes are only ever read through a query filtered by the owning
  coach id. The student they describe cannot reach them.
- Reading someone else's enrollment returns **404, not 403** — an enrollment id
  should not be confirmable by a stranger.
- Message threads are gated on participation, checked both when rendering and
  when sending.

### RLS

Migration `00000000000001_enable_rls` revokes privileges from `anon` and
`authenticated` and enables RLS with **no policies** on every table.

This matters because Supabase auto-exposes `public` over PostgREST. Without it,
anyone holding the anon key — which ships to the browser by design — could read
every table directly, bypassing the app. Prisma is unaffected: an owner bypasses
RLS unless `FORCE` is set.

### Designed for a weak connection

- Lessons are text-first and stay readable once opened
- Avatars render as initials — an avatar grid costs zero extra requests
- Tabs are links with a `?tab=` param: real URLs, server-rendered, no client
  state
- Search is a plain GET form — shareable, and works before hydration
- `lowDataMode` on the profile, set during onboarding
- Task completion is idempotent on `(enrollmentId, taskId)`, so an offline
  queue can replay safely without double-counting

### Leaderboards rank more than output

Five boards: **overall, most consistent, best streak, most improved,
finishers**. A beginner who shows up daily can top a board. The ranking maths is
a pure module (`src/lib/leaderboard.ts`) shared by the Server Action and the
seed, with tests asserting that consistency and improvement pick *different*
winners than raw volume.

### Health and safety

Coaching here is general wellness guidance, not clinical care, and the product
says so where it matters. Verification has three levels; `PROFESSIONAL` can only
be set by an admin after checking a real credential — the self-service coach
form cannot grant it, and unverified credentials are labelled as the coach's own
claims.

---

## Commands

```bash
npm run dev         # Turbopack dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # node:test — leaderboard + streak logic
npm run db:migrate  # create a migration from schema changes
npm run db:deploy   # apply migrations
npm run db:seed     # reseed demo data
npm run db:studio   # browse the database
```

---

## Stack

Next.js 16 (App Router, Turbopack) · React 19.2 · TypeScript strict ·
Tailwind v4 · Prisma 7 + `@prisma/adapter-pg` · Supabase (Auth + Postgres)

Two version notes that will bite if you rely on older docs:

- Next 16 renamed Middleware to **Proxy** (`src/proxy.ts`), and `cookies()`,
  `params` and `searchParams` are all async.
- Prisma 7 removed the Rust query engine and moved connection URLs out of
  `schema.prisma` into `prisma.config.ts`; the client needs a driver adapter.

---

## Not built yet

Stated plainly so nothing here looks more finished than it is:

- **Payments.** Joining a paid program creates a `PENDING` order and stops at a
  checkout page that says so. The schema is provider-agnostic
  (`provider` + `providerRef` + raw `payload`) so M-Pesa, mobile money or cards
  can be added without reshaping the money tables.
- **Program builder.** Programs come from the seed; coaches cannot yet create
  weeks, lessons and tasks in the app.
- **Admin and moderation UI.** `reports` and `blocks` are written by the app and
  the actions exist, but there is no queue to review them in.
- **Image and voice upload.** Supabase Storage is not wired up; the schema and
  message types are ready for it.
- **Reviews UI.** Reviews display on coach profiles but there is no form to
  leave one yet.
- **Push notifications.** In-app notifications work; there is no delivery
  channel.
- **AI features.** Deliberately deferred — the spec places them in phase 2, and
  the core loop should be proven first.

### Launch scope

Only the fitness cluster is active (`fitness`, `nutrition`, `weight-loss`,
`weight-gain`, `running`, `home-workout`, `healthy-lifestyle`). Sports,
wellness, style and mental-wellness exist in `categories` with `active = false`,
so they can be switched on without a migration once the coaching engine is
proven.
