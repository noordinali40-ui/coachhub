/**
 * Development seed for CoachHub Africa.
 *
 * Creates real Supabase Auth users (so every seeded account can actually log
 * in) and a dataset with enough history that streaks, progress rollups and all
 * five leaderboards have something meaningful to show.
 *
 * Run with: npm run db:seed
 */

import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { computeMemberStats, rankLeaderboard } from '../src/lib/leaderboard.ts'
import { CATEGORIES } from '../src/lib/constants.ts'

loadEnv({ path: '.env.local', quiet: true })
loadEnv({ path: '.env', quiet: true })

const DEMO_PASSWORD = 'CoachHub2026!'
const DAY_MS = 86_400_000

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Set DATABASE_URL (and ideally DIRECT_URL) in .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.\n' +
      'The seed creates real auth users so the demo accounts can log in.',
  )
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- date helpers ----------------------------------------------------------

function today(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function daysAgo(n: number): Date {
  return new Date(today().getTime() - n * DAY_MS)
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS)
}

// --- auth ------------------------------------------------------------------

/** Creates the auth user, or returns the existing one so re-seeding works. */
async function ensureAuthUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  if (data?.user) return data.user.id

  // Already registered — look the id up instead of failing the whole seed.
  const existing = await findAuthUserByEmail(email)
  if (existing) return existing

  throw new Error(`Could not create or find auth user ${email}: ${error?.message}`)
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (match) return match.id
    if (data.users.length < 200) return null
  }
  return null
}

// --- seed data -------------------------------------------------------------

const COACHES = [
  {
    email: 'mohamed@coachhub.test',
    fullName: 'Mohamed Abdi',
    slug: 'mohamed-abdi',
    countryCode: 'KE',
    city: 'Nairobi',
    languages: ['English', 'Swahili', 'Somali'],
    headline: 'Fitness & Weight Management Coach',
    bio: 'Six years coaching people in Nairobi who want to lose weight and keep it off. I work with beginners — no gym required, no extreme diets. We start where you are, build habits that survive a busy week, and track what actually matters.\n\nI coach in person around Eastlands and online everywhere else.',
    yearsExperience: 6,
    verification: 'VERIFIED' as const,
    credentials: ['Certified Personal Trainer, 2019', 'Coached 1,200+ clients'],
    categories: ['weight-loss', 'fitness'],
    rating: 4.8,
    ratingCount: 184,
  },
  {
    email: 'amina@coachhub.test',
    fullName: 'Amina Yusuf',
    slug: 'amina-yusuf',
    countryCode: 'SO',
    city: 'Mogadishu',
    languages: ['Somali', 'English', 'Arabic'],
    headline: 'Nutrition Coach — eating well on a real budget',
    bio: 'I help families eat better using food you can actually buy at the local market. No imported supplements, no meal plans built around ingredients nobody sells here.\n\nMost of my clients are women balancing work, children and a tight budget. We plan around that, not against it.',
    yearsExperience: 4,
    verification: 'PROFESSIONAL' as const,
    credentials: ['BSc Nutrition & Dietetics', 'Registered Nutritionist'],
    categories: ['nutrition', 'healthy-lifestyle'],
    rating: 4.9,
    ratingCount: 97,
  },
  {
    email: 'grace@coachhub.test',
    fullName: 'Grace Wanjiku',
    slug: 'grace-wanjiku',
    countryCode: 'KE',
    city: 'Eldoret',
    languages: ['English', 'Swahili'],
    headline: 'Running Coach — from first 5K to marathon',
    bio: 'Former national-level 10,000m runner, now coaching ordinary people to run. Half my athletes had never run a kilometre when we started.\n\nWe build slowly. Most injuries I see come from doing too much too soon, so the first month is deliberately easy.',
    yearsExperience: 9,
    verification: 'VERIFIED' as const,
    credentials: ['Athletics Kenya Level 2 Coach', 'Former national 10,000m'],
    categories: ['running', 'fitness'],
    rating: 4.7,
    ratingCount: 143,
  },
  {
    email: 'tunde@coachhub.test',
    fullName: 'Tunde Bakare',
    slug: 'tunde-bakare',
    countryCode: 'NG',
    city: 'Lagos',
    languages: ['English', 'Yoruba'],
    headline: 'Home Workout Coach — no equipment, no excuses',
    bio: 'Everything I teach can be done in a small room with no equipment. I built this after years of telling clients to "just join a gym" and watching them quit because the commute made it impossible.\n\nTwenty minutes, your own bodyweight, done before the day starts.',
    yearsExperience: 5,
    verification: 'COMMUNITY' as const,
    credentials: ['Bodyweight strength specialist'],
    categories: ['home-workout', 'fitness'],
    rating: 4.6,
    ratingCount: 61,
  },
]

const STUDENTS = [
  { email: 'ahmed@coachhub.test', fullName: 'Ahmed Hassan', countryCode: 'KE', city: 'Nairobi' },
  { email: 'fatima@coachhub.test', fullName: 'Fatima Noor', countryCode: 'SO', city: 'Mogadishu' },
  { email: 'james@coachhub.test', fullName: 'James Otieno', countryCode: 'KE', city: 'Kisumu' },
  { email: 'sarah@coachhub.test', fullName: 'Sarah Achieng', countryCode: 'KE', city: 'Nakuru' },
  { email: 'ibrahim@coachhub.test', fullName: 'Ibrahim Farah', countryCode: 'ET', city: 'Dire Dawa' },
  { email: 'chidi@coachhub.test', fullName: 'Chidi Okonkwo', countryCode: 'NG', city: 'Lagos' },
  { email: 'mary@coachhub.test', fullName: 'Mary Nakato', countryCode: 'UG', city: 'Kampala' },
  { email: 'zainab@coachhub.test', fullName: 'Zainab Ali', countryCode: 'TZ', city: 'Dar es Salaam' },
]

type ProgramSeed = {
  coachSlug: string
  slug: string
  title: string
  summary: string
  description: string
  categorySlug: string
  durationDays: number
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  priceCents: number
  currency: string
  requirements: string[]
  outcomes: string[]
  trackedMetrics: ('WEIGHT_KG' | 'STEPS' | 'DISTANCE_KM' | 'WORKOUTS' | 'ACTIVE_MINUTES' | 'WATER_LITRES' | 'HABIT_DAYS')[]
  weeks: { title: string; summary: string }[]
  dailyTasks: {
    title: string
    description: string
    type: 'WORKOUT' | 'WALK' | 'RUN' | 'MEAL' | 'HYDRATION' | 'HABIT' | 'REFLECTION' | 'MEASUREMENT' | 'CHECK_IN'
    targetValue?: number
    unit?: string
    metric?: 'WEIGHT_KG' | 'STEPS' | 'DISTANCE_KM' | 'WORKOUTS' | 'ACTIVE_MINUTES' | 'WATER_LITRES' | 'HABIT_DAYS'
  }[]
}

const PROGRAMS: ProgramSeed[] = [
  {
    coachSlug: 'mohamed-abdi',
    slug: '30-day-beginner-fitness',
    title: '30-Day Beginner Fitness Challenge',
    summary:
      'Four weeks to build the habit of moving every day. No gym, no equipment, no previous experience.',
    description:
      'This is the program I give everyone who tells me they want to get fit but have never trained before.\n\nThe first week is deliberately easy — the point is to prove to yourself that you will show up, not to exhaust you. Volume goes up in week two, and by week four you are doing real work.\n\nEverything is bodyweight. If you have twenty minutes and a patch of floor, you can do this.',
    categorySlug: 'fitness',
    durationDays: 28,
    difficulty: 'BEGINNER',
    priceCents: 0,
    currency: 'KES',
    requirements: ['Twenty minutes a day', 'A little floor space', 'Water'],
    outcomes: [
      'Move every day without it feeling like a chore',
      'Build a streak you actually want to protect',
      'Finish able to do a full bodyweight circuit',
    ],
    trackedMetrics: ['WEIGHT_KG', 'STEPS', 'ACTIVE_MINUTES'],
    weeks: [
      { title: 'Week 1 — Showing up', summary: 'Short and easy. The habit matters more than the effort.' },
      { title: 'Week 2 — Building', summary: 'A little more volume, same simple movements.' },
      { title: 'Week 3 — Getting stronger', summary: 'Longer circuits and your first real challenge.' },
      { title: 'Week 4 — Putting it together', summary: 'Full sessions. You will notice the difference.' },
    ],
    dailyTasks: [
      { title: '20-minute walk', description: 'Brisk enough that talking is slightly hard.', type: 'WALK', targetValue: 20, unit: 'min', metric: 'ACTIVE_MINUTES' },
      { title: 'Drink 2L of water', description: 'Spread through the day, not all at once.', type: 'HYDRATION', targetValue: 2, unit: 'L' },
      { title: "Today's workout", description: 'Follow the circuit in the lesson above.', type: 'WORKOUT' },
    ],
  },
  {
    coachSlug: 'amina-yusuf',
    slug: 'eat-well-4-weeks',
    title: 'Eat Well in 4 Weeks',
    summary:
      'Rebuild your everyday meals around food from your local market. Practical, affordable, no supplements.',
    description:
      'Most nutrition advice online assumes a supermarket full of imported food. This does not.\n\nWe work with what your market actually sells, week by week, changing one meal at a time. By the end you are not following a meal plan — you are cooking differently.',
    categorySlug: 'nutrition',
    durationDays: 28,
    difficulty: 'BEGINNER',
    priceCents: 0,
    currency: 'KES',
    requirements: ['Access to a local market', 'Somewhere to cook'],
    outcomes: [
      'Plan a week of meals in under ten minutes',
      'Cut ultra-processed food without cutting enjoyment',
      'Understand portions without weighing anything',
    ],
    trackedMetrics: ['WEIGHT_KG', 'WATER_LITRES', 'HABIT_DAYS'],
    weeks: [
      { title: 'Week 1 — Breakfast', summary: 'Fix the first meal of the day.' },
      { title: 'Week 2 — Lunch', summary: 'Build a plate that holds you until evening.' },
      { title: 'Week 3 — Dinner', summary: 'Simple evening meals that cook fast.' },
      { title: 'Week 4 — Your own week', summary: 'Plan and cook a full week yourself.' },
    ],
    dailyTasks: [
      { title: 'Follow today’s meal guide', description: 'The lesson has the plan and a market list.', type: 'MEAL' },
      { title: 'Drink 2L of water', description: 'Before sunset if you are fasting.', type: 'HYDRATION', targetValue: 2, unit: 'L', metric: 'WATER_LITRES' },
      { title: 'Evening check-in', description: 'What did you actually eat? No judgement, just notice.', type: 'REFLECTION' },
    ],
  },
  {
    coachSlug: 'grace-wanjiku',
    slug: 'couch-to-5k',
    title: 'Your First 5K',
    summary:
      'Eight weeks from not running at all to finishing five kilometres without stopping.',
    description:
      'Run-walk intervals that get gradually longer. You will not run fast and you should not try to.\n\nThe most common way to fail at this is to go too hard in week one, get sore, and stop. Trust the easy weeks.',
    categorySlug: 'running',
    durationDays: 28,
    difficulty: 'BEGINNER',
    priceCents: 150000,
    currency: 'KES',
    requirements: ['Running shoes that fit', 'Somewhere safe to run'],
    outcomes: [
      'Run 5K continuously',
      'Know how to pace by feel',
      'Avoid the injuries that stop most beginners',
    ],
    trackedMetrics: ['DISTANCE_KM', 'ACTIVE_MINUTES', 'WORKOUTS'],
    weeks: [
      { title: 'Week 1 — Run and walk', summary: 'One minute running, two walking.' },
      { title: 'Week 2 — Longer intervals', summary: 'The running blocks get longer.' },
      { title: 'Week 3 — Less walking', summary: 'Walking breaks shrink.' },
      { title: 'Week 4 — Your first 5K', summary: 'Continuous running, then the distance.' },
    ],
    dailyTasks: [
      { title: 'Today’s run session', description: 'Intervals are in the lesson. Easy means easy.', type: 'RUN', targetValue: 3, unit: 'km', metric: 'DISTANCE_KM' },
      { title: 'Stretch for 5 minutes', description: 'Calves and hips especially.', type: 'HABIT', targetValue: 5, unit: 'min' },
    ],
  },
  {
    coachSlug: 'tunde-bakare',
    slug: '20-minute-home-strength',
    title: '20-Minute Home Strength',
    summary:
      'A four-week bodyweight strength block you can do in a small room before work.',
    description:
      'Push, pull, legs, core — four simple patterns, progressively harder each week.\n\nNo equipment. If you can do a press-up against a wall, you can start here.',
    categorySlug: 'home-workout',
    durationDays: 28,
    difficulty: 'INTERMEDIATE',
    priceCents: 0,
    currency: 'NGN',
    requirements: ['A small room', 'Twenty minutes'],
    outcomes: [
      'Get measurably stronger without a gym',
      'Train consistently around a full-time job',
      'Learn progressions you can keep using',
    ],
    trackedMetrics: ['WORKOUTS', 'ACTIVE_MINUTES'],
    weeks: [
      { title: 'Week 1 — Foundations', summary: 'Learn the four patterns properly.' },
      { title: 'Week 2 — Adding volume', summary: 'More rounds, same movements.' },
      { title: 'Week 3 — Harder variations', summary: 'Progress each pattern.' },
      { title: 'Week 4 — Full sessions', summary: 'Everything together, twenty minutes.' },
    ],
    dailyTasks: [
      { title: 'Today’s 20-minute session', description: 'Four rounds. Rest as needed.', type: 'WORKOUT', targetValue: 20, unit: 'min', metric: 'ACTIVE_MINUTES' },
      { title: 'Log how it felt', description: 'Easy, right, or too hard?', type: 'CHECK_IN' },
    ],
  },
]

// --- main ------------------------------------------------------------------

async function main() {
  console.log('Seeding CoachHub Africa…\n')

  // Clear app data. Auth users are left alone — they are reused on re-seed.
  console.log('  clearing existing data')
  await prisma.$transaction([
    prisma.leaderboardRow.deleteMany(),
    prisma.challengeEntry.deleteMany(),
    prisma.challengeMember.deleteMany(),
    prisma.challenge.deleteMany(),
    prisma.like.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.post.deleteMany(),
    prisma.communityMember.deleteMany(),
    prisma.community.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.review.deleteMany(),
    prisma.progress.deleteMany(),
    prisma.metricEntry.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.order.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.product.deleteMany(),
    prisma.task.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.programModule.deleteMany(),
    prisma.program.deleteMany(),
    prisma.coachNote.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.coachCategory.deleteMany(),
    prisma.coach.deleteMany(),
    prisma.report.deleteMany(),
    prisma.block.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ])

  // 1. Categories
  console.log('  categories')
  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        emoji: category.emoji,
        description: category.description,
        active: category.active,
        sortOrder: index,
      },
      create: {
        slug: category.slug,
        name: category.name,
        emoji: category.emoji,
        description: category.description,
        active: category.active,
        sortOrder: index,
      },
    })
  }

  // 2. Admin
  console.log('  admin account')
  const adminId = await ensureAuthUser('admin@coachhub.test')
  await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@coachhub.test',
      role: 'ADMIN',
      profile: {
        create: {
          fullName: 'Platform Admin',
          countryCode: 'KE',
          onboardedAt: new Date(),
          goals: ['fitness'],
        },
      },
    },
  })

  // 3. Coaches
  console.log('  coaches')
  const coachIdBySlug = new Map<string, string>()
  const coachUserIdBySlug = new Map<string, string>()
  const communityIdByCoachSlug = new Map<string, string>()

  for (const coach of COACHES) {
    const userId = await ensureAuthUser(coach.email)
    coachUserIdBySlug.set(coach.slug, userId)

    const created = await prisma.user.create({
      data: {
        id: userId,
        email: coach.email,
        role: 'COACH',
        profile: {
          create: {
            fullName: coach.fullName,
            countryCode: coach.countryCode,
            city: coach.city,
            languages: coach.languages,
            goals: coach.categories,
            onboardedAt: daysAgo(400),
          },
        },
        coach: {
          create: {
            slug: coach.slug,
            headline: coach.headline,
            bio: coach.bio,
            yearsExperience: coach.yearsExperience,
            verification: coach.verification,
            status: 'APPROVED',
            credentials: coach.credentials,
            ratingAvg: coach.rating,
            ratingCount: coach.ratingCount,
            followerCount: 40 + coach.ratingCount,
            categories: {
              create: coach.categories.map((slug, index) => ({
                categorySlug: slug,
                isPrimary: index === 0,
              })),
            },
          },
        },
      },
      select: { coach: { select: { id: true } } },
    })

    const coachId = created.coach!.id
    coachIdBySlug.set(coach.slug, coachId)

    const community = await prisma.community.create({
      data: {
        coachId,
        slug: `${coach.slug}-community`,
        name: `${coach.fullName.split(' ')[0]}’s Community`,
        description: coach.headline,
        memberCount: 1,
        members: { create: { userId, role: 'OWNER' } },
      },
      select: { id: true },
    })
    communityIdByCoachSlug.set(coach.slug, community.id)
  }

  // 4. Programs, weeks, lessons, tasks
  console.log('  programs, lessons and tasks')
  const programIdBySlug = new Map<string, string>()

  for (const program of PROGRAMS) {
    const coachId = coachIdBySlug.get(program.coachSlug)!

    const created = await prisma.program.create({
      data: {
        coachId,
        categorySlug: program.categorySlug,
        slug: program.slug,
        title: program.title,
        summary: program.summary,
        description: program.description,
        durationDays: program.durationDays,
        difficulty: program.difficulty,
        priceCents: program.priceCents,
        currency: program.currency,
        isFree: program.priceCents === 0,
        status: 'PUBLISHED',
        requirements: program.requirements,
        outcomes: program.outcomes,
        trackedMetrics: program.trackedMetrics,
        publishedAt: daysAgo(90),
      },
      select: { id: true },
    })
    programIdBySlug.set(program.slug, created.id)

    for (const [weekIndex, week] of program.weeks.entries()) {
      // Not named `module` — that identifier is reserved in this file's scope.
      const weekModule = await prisma.programModule.create({
        data: {
          programId: created.id,
          title: week.title,
          summary: week.summary,
          position: weekIndex + 1,
        },
        select: { id: true },
      })

      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
        const dayNumber = weekIndex * 7 + dayOfWeek

        const lesson = await prisma.lesson.create({
          data: {
            moduleId: weekModule.id,
            title: `Day ${dayNumber}: ${lessonTitle(program, dayNumber)}`,
            body: lessonBody(program, dayNumber),
            dayNumber,
            position: dayOfWeek,
            estimatedMinutes: 10 + weekIndex * 3,
            isDownloadable: true,
          },
          select: { id: true },
        })

        await prisma.task.createMany({
          data: program.dailyTasks.map((task, taskIndex) => ({
            programId: created.id,
            lessonId: lesson.id,
            title: task.title,
            description: task.description,
            type: task.type,
            dayNumber,
            position: taskIndex,
            targetValue: task.targetValue ?? null,
            unit: task.unit ?? null,
            metric: task.metric ?? null,
            required: taskIndex === 0,
          })),
        })
      }
    }

    const taskCount = await prisma.task.count({ where: { programId: created.id } })
    console.log(`    ${program.title}: ${taskCount} tasks`)
  }

  // 5. Students
  console.log('  students')
  const studentIds: string[] = []
  for (const student of STUDENTS) {
    const userId = await ensureAuthUser(student.email)
    studentIds.push(userId)

    await prisma.user.create({
      data: {
        id: userId,
        email: student.email,
        role: 'CLIENT',
        profile: {
          create: {
            fullName: student.fullName,
            countryCode: student.countryCode,
            city: student.city,
            languages: ['English'],
            goals: ['fitness', 'weight-loss'],
            onboardedAt: daysAgo(30),
            lowDataMode: student.email === 'mary@coachhub.test',
          },
        },
      },
    })
  }

  // 6. Enrollments with real completion history
  console.log('  enrollments and progress')
  const fitnessProgramId = programIdBySlug.get('30-day-beginner-fitness')!
  const nutritionProgramId = programIdBySlug.get('eat-well-4-weeks')!
  const homeProgramId = programIdBySlug.get('20-minute-home-strength')!

  // [studentIndex, programId, daysSinceStart, daysCompleted]
  const ENROLLMENT_PLAN: [number, string, number, number][] = [
    [0, fitnessProgramId, 12, 12], // Ahmed — strong 12-day streak
    [1, nutritionProgramId, 9, 7], // Fatima — missed the last two days
    [2, fitnessProgramId, 20, 18],
    [3, fitnessProgramId, 5, 5],
    [4, nutritionProgramId, 14, 11],
    [5, homeProgramId, 8, 8],
    [6, fitnessProgramId, 3, 1],
    [7, homeProgramId, 16, 12],
  ]

  for (const [studentIndex, programId, daysSinceStart, daysCompleted] of ENROLLMENT_PLAN) {
    const userId = studentIds[studentIndex]
    const startedOn = daysAgo(daysSinceStart - 1)

    const program = await prisma.program.findUniqueOrThrow({
      where: { id: programId },
      select: { id: true, coachId: true, trackedMetrics: true, _count: { select: { tasks: true } } },
    })

    const enrollment = await prisma.enrollment.create({
      data: {
        userId,
        programId,
        startedOn,
        totalTasks: program._count.tasks,
        currentDay: daysSinceStart,
      },
      select: { id: true },
    })

    // Complete every task for each finished day, so the rollups below are real.
    let completed = 0
    const activeDays: Date[] = []

    for (let day = 1; day <= daysCompleted; day++) {
      const completedOn = addDays(startedOn, day - 1)
      const tasks = await prisma.task.findMany({
        where: { programId, dayNumber: day },
        select: { id: true, targetValue: true },
      })

      // Leave the final (today) partially done, so "today's tasks" has
      // something left to tick in the demo.
      const slice =
        day === daysCompleted && daysCompleted === daysSinceStart
          ? tasks.slice(0, 1)
          : tasks

      if (slice.length > 0) activeDays.push(completedOn)

      await prisma.progress.createMany({
        data: slice.map((task) => ({
          enrollmentId: enrollment.id,
          taskId: task.id,
          userId,
          completedOn,
          value: task.targetValue,
        })),
      })
      completed += slice.length
    }

    const streak = currentStreak(activeDays)

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        completedTasks: completed,
        streakDays: streak,
        longestStreak: Math.max(streak, longestStreak(activeDays)),
        lastActivityOn: activeDays.at(-1) ?? null,
      },
    })

    await prisma.coach.update({
      where: { id: program.coachId },
      data: { studentCount: { increment: 1 } },
    })
    await prisma.program.update({
      where: { id: programId },
      data: { enrollmentCount: { increment: 1 } },
    })

    // A weight trend for programs that track it.
    if (program.trackedMetrics.includes('WEIGHT_KG')) {
      const start = 78 + studentIndex
      for (let day = 0; day < daysCompleted; day += 3) {
        await prisma.metricEntry.create({
          data: {
            userId,
            enrollmentId: enrollment.id,
            metric: 'WEIGHT_KG',
            value: Number((start - day * 0.15).toFixed(1)),
            unit: 'kg',
            recordedOn: addDays(startedOn, day),
          },
        })
      }
    }
  }

  // 7. Community membership and posts
  console.log('  communities and posts')
  const mohamedCommunityId = communityIdByCoachSlug.get('mohamed-abdi')!
  const aminaCommunityId = communityIdByCoachSlug.get('amina-yusuf')!

  const COMMUNITY_MEMBERS: [string, number[]][] = [
    [mohamedCommunityId, [0, 2, 3, 6, 5]],
    [aminaCommunityId, [1, 4, 7]],
  ]

  for (const [communityId, members] of COMMUNITY_MEMBERS) {
    await prisma.communityMember.createMany({
      data: members.map((index) => ({ communityId, userId: studentIds[index] })),
    })
    await prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: members.length } },
    })
  }

  const POSTS: {
    communityId: string
    authorId: string
    body: string
    type: 'UPDATE' | 'QUESTION' | 'ACHIEVEMENT' | 'ANNOUNCEMENT'
    daysAgo: number
    likes: number[]
    comments: { authorId: string; body: string }[]
  }[] = [
    {
      communityId: mohamedCommunityId,
      authorId: coachUserIdBySlug.get('mohamed-abdi')!,
      body: 'New week, new block. Week 2 adds a round to every circuit — if last week felt manageable, this is where it starts to count.\n\nIf you missed days last week, do not try to catch up. Just start today.',
      type: 'ANNOUNCEMENT',
      daysAgo: 6,
      likes: [0, 2, 3],
      comments: [],
    },
    {
      communityId: mohamedCommunityId,
      authorId: studentIds[0],
      body: 'Day 10 done 🔥 Walked 5km this morning before work. Two weeks ago I could not do 2km without stopping.',
      type: 'ACHIEVEMENT',
      daysAgo: 2,
      likes: [2, 3, 5, 6],
      comments: [
        { authorId: coachUserIdBySlug.get('mohamed-abdi')!, body: 'This is exactly it. Consistency first, distance follows.' },
        { authorId: studentIds[2], body: 'Well done Ahmed 👏' },
      ],
    },
    {
      communityId: mohamedCommunityId,
      authorId: studentIds[6],
      body: 'Question — I work nights and mostly sleep during the day. Does it matter what time I do the workout?',
      type: 'QUESTION',
      daysAgo: 1,
      likes: [0],
      comments: [
        {
          authorId: coachUserIdBySlug.get('mohamed-abdi')!,
          body: 'Not at all. Pick whatever time you can repeat. A session you actually do at 3am beats a perfect one at 6am you skip.',
        },
      ],
    },
    {
      communityId: aminaCommunityId,
      authorId: studentIds[1],
      body: 'Made the week 2 lunch plate for the whole family and nobody complained. Counting that as a win.',
      type: 'UPDATE',
      daysAgo: 3,
      likes: [4, 7],
      comments: [
        { authorId: coachUserIdBySlug.get('amina-yusuf')!, body: 'That is the real test 😄 Send me the photo next time.' },
      ],
    },
  ]

  for (const post of POSTS) {
    const created = await prisma.post.create({
      data: {
        communityId: post.communityId,
        authorId: post.authorId,
        body: post.body,
        type: post.type,
        isPinned: post.type === 'ANNOUNCEMENT',
        likeCount: post.likes.length,
        commentCount: post.comments.length,
        createdAt: daysAgo(post.daysAgo),
      },
      select: { id: true },
    })

    await prisma.like.createMany({
      data: post.likes.map((index) => ({
        postId: created.id,
        userId: studentIds[index],
      })),
    })

    for (const comment of post.comments) {
      await prisma.comment.create({
        data: {
          postId: created.id,
          authorId: comment.authorId,
          body: comment.body,
          createdAt: daysAgo(post.daysAgo),
        },
      })
    }
  }

  // 8. Challenge with history, then the real leaderboard
  console.log('  challenge and leaderboards')
  const challenge = await prisma.challenge.create({
    data: {
      coachId: coachIdBySlug.get('mohamed-abdi')!,
      communityId: mohamedCommunityId,
      slug: '100k-steps-challenge',
      title: '100,000 Steps in 30 Days',
      description:
        'Walk every day and log your steps. It is not a race — the boards also rank who showed up most often and who improved the most from where they started.',
      rules: [
        'Log your steps once a day',
        'Any walking counts, including to work',
        'Missing a day is fine. Stopping is not.',
      ],
      metric: 'STEPS',
      unit: 'steps',
      goalValue: 100000,
      startsOn: daysAgo(11),
      endsOn: addDays(today(), 19),
      status: 'ACTIVE',
      memberCount: 6,
    },
    select: { id: true },
  })

  // Varied shapes so each board has a different winner: a high-volume walker,
  // a very consistent one, and someone who started low and improved a lot.
  const CHALLENGE_PLAN: { studentIndex: number; days: number[] }[] = [
    { studentIndex: 0, days: [7200, 8100, 7600, 9000, 8400, 9500, 10200, 9800, 11000, 10500, 12000] },
    { studentIndex: 2, days: [12000, 11500, 13000, 12500, 0, 0, 14000, 13500, 12800, 0, 13200] },
    { studentIndex: 3, days: [4000, 4200, 4500, 4300, 4800, 5000, 5200, 5100, 5400, 5600, 5800] },
    { studentIndex: 5, days: [3000, 3500, 4000, 5000, 6500, 7000, 8500, 9000, 10000, 11000, 12500] },
    { studentIndex: 6, days: [6000, 0, 6500, 0, 7000, 0, 7200, 0, 7500, 0, 7800] },
    { studentIndex: 4, days: [9000, 9200, 8800, 9100, 9400, 9000, 9300, 9500, 9200, 9600, 9800] },
  ]

  const memberInputs: { userId: string; baseline: number | null }[] = []
  const entryInputs: { userId: string; value: number; day: number }[] = []

  for (const plan of CHALLENGE_PLAN) {
    const userId = studentIds[plan.studentIndex]
    const firstValue = plan.days.find((v) => v > 0) ?? null

    await prisma.challengeMember.create({
      data: {
        challengeId: challenge.id,
        userId,
        baseline: firstValue,
        joinedAt: daysAgo(11),
      },
    })
    memberInputs.push({ userId, baseline: firstValue })

    for (const [index, value] of plan.days.entries()) {
      if (value <= 0) continue
      const recordedOn = daysAgo(11 - index)
      await prisma.challengeEntry.create({
        data: { challengeId: challenge.id, userId, value, recordedOn },
      })
      entryInputs.push({ userId, value, day: recordedOn.getTime() })
    }
  }

  const stats = computeMemberStats(memberInputs, entryInputs, 100000)
  const ranked = rankLeaderboard(stats)

  await prisma.leaderboardRow.createMany({
    data: ranked.map((row) => ({
      challengeId: challenge.id,
      category: row.category,
      userId: row.userId,
      rank: row.rank,
      score: row.score,
    })),
  })

  for (const stat of stats) {
    await prisma.challengeMember.update({
      where: { challengeId_userId: { challengeId: challenge.id, userId: stat.userId } },
      data: {
        totalValue: stat.total,
        activeDays: stat.activeDays,
        bestStreak: stat.streak,
        completedAt: stat.completed ? new Date() : null,
      },
    })
  }

  // 9. Conversations
  console.log('  messages')
  const mohamedUserId = coachUserIdBySlug.get('mohamed-abdi')!
  const conversation = await prisma.conversation.create({
    data: {
      lastMessageAt: daysAgo(1),
      participants: {
        create: [{ userId: mohamedUserId }, { userId: studentIds[0] }],
      },
    },
    select: { id: true },
  })

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: studentIds[0],
        body: 'Coach, my knees ache a bit after the day 8 circuit. Should I stop?',
        createdAt: daysAgo(2),
        readAt: daysAgo(2),
      },
      {
        conversationId: conversation.id,
        senderId: mohamedUserId,
        body: 'Not stop — swap. Do the walk and skip the squats for two days, then tell me how it feels. Aching after new work is normal; sharp pain is not.',
        createdAt: daysAgo(2),
        readAt: daysAgo(2),
      },
      {
        conversationId: conversation.id,
        senderId: mohamedUserId,
        body: 'Saw your day 10 post — 5km is real progress. Keep the pace easy this week.',
        createdAt: daysAgo(1),
      },
    ],
  })

  await prisma.notification.create({
    data: {
      userId: studentIds[0],
      actorId: mohamedUserId,
      type: 'MESSAGE',
      title: 'New message from Mohamed Abdi',
      body: 'Saw your day 10 post — 5km is real progress.',
      url: `/messages/${conversation.id}`,
    },
  })

  // 10. Reviews and products
  console.log('  reviews and products')
  await prisma.review.createMany({
    data: [
      {
        userId: studentIds[2],
        coachId: coachIdBySlug.get('mohamed-abdi')!,
        programId: fitnessProgramId,
        rating: 5,
        body: 'I have started and quit four fitness programs. This is the first one I am still doing after three weeks. The first week being easy is what made the difference.',
        createdAt: daysAgo(4),
      },
      {
        userId: studentIds[4],
        coachId: coachIdBySlug.get('amina-yusuf')!,
        programId: nutritionProgramId,
        rating: 5,
        body: 'Finally advice that does not assume I shop in a supermarket. Everything on the list was at my market.',
        createdAt: daysAgo(7),
      },
    ],
  })

  await prisma.product.createMany({
    data: [
      {
        coachId: coachIdBySlug.get('mohamed-abdi')!,
        type: 'COACHING_PLAN',
        title: '1-to-1 coaching — monthly',
        description: 'Weekly check-in call, a plan adjusted to you, and messaging between sessions.',
        priceCents: 450000,
        currency: 'KES',
      },
      {
        coachId: coachIdBySlug.get('amina-yusuf')!,
        type: 'MEAL_PLAN',
        title: 'Four-week market meal plan (PDF)',
        description: 'Shopping lists and recipes built around East African markets.',
        priceCents: 120000,
        currency: 'KES',
      },
    ],
  })

  // 11. Follows
  await prisma.follow.createMany({
    data: studentIds.slice(0, 5).map((userId) => ({
      followerId: userId,
      coachId: coachIdBySlug.get('mohamed-abdi')!,
    })),
  })

  console.log('\nDone.\n')
  console.log('Log in with any of these — password: ' + DEMO_PASSWORD)
  console.log('  Student (rich data): ahmed@coachhub.test')
  console.log('  Coach   (4 students): mohamed@coachhub.test')
  console.log('  Admin:                admin@coachhub.test')
}

// --- streak helpers --------------------------------------------------------

function currentStreak(days: Date[]): number {
  if (days.length === 0) return 0
  const sorted = [...new Set(days.map((d) => d.getTime()))].sort((a, b) => b - a)
  const todayMs = today().getTime()
  if (sorted[0] !== todayMs && sorted[0] !== todayMs - DAY_MS) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1] - sorted[i] === DAY_MS) streak++
    else break
  }
  return streak
}

function longestStreak(days: Date[]): number {
  if (days.length === 0) return 0
  const sorted = [...new Set(days.map((d) => d.getTime()))].sort((a, b) => a - b)
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] - sorted[i - 1] === DAY_MS ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}

// --- lesson content --------------------------------------------------------

function lessonTitle(program: ProgramSeed, day: number): string {
  const week = Math.ceil(day / 7)
  const titles: Record<string, string[]> = {
    '30-day-beginner-fitness': ['Getting moving', 'Building the circuit', 'Adding load', 'Full sessions'],
    'eat-well-4-weeks': ['Breakfast', 'Lunch', 'Dinner', 'Your own week'],
    'couch-to-5k': ['Run and walk', 'Longer intervals', 'Less walking', 'Toward 5K'],
    '20-minute-home-strength': ['Foundations', 'More volume', 'Harder variations', 'Putting it together'],
  }
  return titles[program.slug]?.[week - 1] ?? 'Today'
}

function lessonBody(program: ProgramSeed, day: number): string {
  const week = Math.ceil(day / 7)
  const rounds = 2 + week

  if (program.slug === 'eat-well-4-weeks') {
    return `Today's focus is the same meal you worked on all week — the aim is repetition, not variety.\n\nBuild the plate: half vegetables, a quarter protein, a quarter starch. Use whatever your market had cheapest this morning.\n\nIf you only do one thing today, drink the water. Most people I coach are mildly dehydrated and read it as hunger.`
  }

  if (program.slug === 'couch-to-5k') {
    const runMinutes = week
    return `Warm up with five minutes of easy walking.\n\nThen ${8 - week} rounds of: ${runMinutes} minute${runMinutes > 1 ? 's' : ''} running, 2 minutes walking.\n\nFinish with five minutes walking and stretch your calves.\n\nEasy means you could hold a conversation. If you cannot, slow down — this week is not supposed to be hard.`
  }

  return `Warm up: two minutes marching on the spot, then arm circles and hip circles.\n\nMain set — ${rounds} rounds of:\n• 10 squats\n• 5 press-ups (against a wall or on your knees is fine)\n• 20 seconds plank\n• 15 seconds rest\n\nCool down: stretch your legs and shoulders for two minutes.\n\nDay ${day}. If a movement hurts sharply, stop it and do the rest — tell me in the community and we will swap it.`
}

main()
  .catch((error) => {
    console.error('\nSeed failed:\n', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
