import * as z from 'zod'

/**
 * Server-side validation schemas. These run inside Server Actions, so they are
 * the real gate — any client-side checking is only there to save a round trip.
 */

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your name.')
    .max(80, 'That name is too long.'),
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Use at most 72 characters.')
    .regex(/[a-zA-Z]/, 'Include at least one letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
  countryCode: z
    .string()
    .length(2, 'Choose your country.')
    .regex(/^[A-Z]{2}$/, 'Choose your country.'),
})

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password.'),
})

export const onboardingSchema = z.object({
  goals: z
    .array(z.string().min(1))
    .min(1, 'Pick at least one thing you want to improve.')
    .max(4, 'Pick up to four to start with.'),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  lowDataMode: z.boolean(),
})

export const postSchema = z.object({
  communityId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(2, 'Write something first.')
    .max(2000, 'Keep posts under 2000 characters.'),
  type: z.enum(['UPDATE', 'QUESTION', 'ACHIEVEMENT', 'ANNOUNCEMENT']),
})

export const commentSchema = z.object({
  postId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Write a comment first.')
    .max(1000, 'Keep comments under 1000 characters.'),
})

export const messageSchema = z.object({
  conversationId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Write a message first.')
    .max(4000, 'That message is too long.'),
})

export const completeTaskSchema = z.object({
  enrollmentId: z.uuid(),
  taskId: z.uuid(),
  value: z.coerce.number().min(0).max(1_000_000).optional(),
  note: z.string().trim().max(500).optional(),
})

export const metricSchema = z.object({
  enrollmentId: z.uuid().optional(),
  metric: z.enum([
    'WEIGHT_KG',
    'STEPS',
    'DISTANCE_KM',
    'WORKOUTS',
    'ACTIVE_MINUTES',
    'WATER_LITRES',
    'HABIT_DAYS',
    'CUSTOM',
  ]),
  value: z.coerce
    .number({ error: 'Enter a number.' })
    .positive('Enter a number greater than zero.')
    .max(1_000_000),
})

export const challengeSchema = z
  .object({
    title: z.string().trim().min(4, 'Give the challenge a title.').max(90),
    description: z
      .string()
      .trim()
      .min(10, 'Describe what taking part involves.')
      .max(1500),
    metric: z.enum([
      'STEPS',
      'DISTANCE_KM',
      'WORKOUTS',
      'ACTIVE_MINUTES',
      'WATER_LITRES',
      'HABIT_DAYS',
    ]),
    goalValue: z.coerce
      .number({ error: 'Enter a target.' })
      .positive('The target must be greater than zero.'),
    startsOn: z.iso.date('Pick a start date.'),
    endsOn: z.iso.date('Pick an end date.'),
    communityId: z.uuid().optional().or(z.literal('')),
  })
  .refine((data) => new Date(data.endsOn) > new Date(data.startsOn), {
    error: 'The end date must come after the start date.',
    path: ['endsOn'],
  })

export const challengeEntrySchema = z.object({
  challengeId: z.uuid(),
  value: z.coerce
    .number({ error: 'Enter a number.' })
    .positive('Enter a number greater than zero.')
    .max(1_000_000),
})

export const coachNoteSchema = z.object({
  studentId: z.uuid(),
  body: z.string().trim().min(1, 'Write a note first.').max(2000),
})

export const reviewSchema = z.object({
  programId: z.uuid(),
  rating: z.coerce.number().int().min(1, 'Choose a rating.').max(5),
  body: z.string().trim().min(10, 'Say a little about your experience.').max(1500),
})

export const reportSchema = z.object({
  targetType: z.enum([
    'USER',
    'COACH',
    'POST',
    'COMMENT',
    'MESSAGE',
    'COMMUNITY',
    'PROGRAM',
  ]),
  targetId: z.string().min(1),
  reason: z.enum([
    'SPAM',
    'HARASSMENT',
    'MISLEADING_HEALTH_CLAIMS',
    'IMPERSONATION',
    'INAPPROPRIATE_CONTENT',
    'OTHER',
  ]),
  details: z.string().trim().max(1000).optional(),
})

export const becomeCoachSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(8, 'Describe what you coach in a short line.')
    .max(90),
  bio: z.string().trim().min(40, 'Tell people about your coaching.').max(2000),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  categories: z
    .array(z.string().min(1))
    .min(1, 'Choose at least one specialisation.')
    .max(3, 'Choose up to three.'),
  credentials: z.string().trim().max(500).optional(),
})
