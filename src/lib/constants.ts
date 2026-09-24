/**
 * Launch configuration.
 *
 * Categories are seeded into the `categories` table; this file is the source
 * used by the seed and by the onboarding goal picker. Only the fitness cluster
 * ships active for v1 — the remaining categories exist in the data model but
 * stay inactive until the core coaching engine is proven.
 */

export type CategorySeed = {
  slug: string
  name: string
  emoji: string
  description: string
  /** Plain-language goal shown in onboarding ("What do you want to improve?"). */
  goal: string
  active: boolean
}

export const CATEGORIES: CategorySeed[] = [
  {
    slug: 'fitness',
    name: 'Fitness',
    emoji: '🏋️',
    description: 'Gym, strength and general conditioning.',
    goal: 'Get fitter and stronger',
    active: true,
  },
  {
    slug: 'nutrition',
    name: 'Nutrition',
    emoji: '🥗',
    description: 'Healthy eating and meal planning with local foods.',
    goal: 'Eat healthier',
    active: true,
  },
  {
    slug: 'weight-loss',
    name: 'Weight Loss',
    emoji: '⚖️',
    description: 'Lose weight steadily and keep it off.',
    goal: 'Lose weight',
    active: true,
  },
  {
    slug: 'weight-gain',
    name: 'Weight Gain',
    emoji: '💪',
    description: 'Gain healthy weight and build muscle.',
    goal: 'Gain healthy weight',
    active: true,
  },
  {
    slug: 'running',
    name: 'Running',
    emoji: '🏃',
    description: 'From first 5K to marathon pace.',
    goal: 'Start running',
    active: true,
  },
  {
    slug: 'home-workout',
    name: 'Home Workout',
    emoji: '🏠',
    description: 'No equipment, no gym, no excuses.',
    goal: 'Train at home',
    active: true,
  },
  {
    slug: 'healthy-lifestyle',
    name: 'Healthy Lifestyle',
    emoji: '🌱',
    description: 'Daily habits, sleep and energy.',
    goal: 'Build healthy habits',
    active: true,
  },
  // Post-launch categories. Present so coaches and programs can be migrated
  // without a schema change, hidden until the fitness cluster is working.
  {
    slug: 'sports',
    name: 'Sports',
    emoji: '⚽',
    description: 'Football, basketball and athletics conditioning.',
    goal: 'Train for my sport',
    active: false,
  },
  {
    slug: 'wellness',
    name: 'Wellness',
    emoji: '🧘',
    description: 'Recovery, sleep and everyday wellbeing.',
    goal: 'Feel better day to day',
    active: false,
  },
  {
    slug: 'style',
    name: 'Style',
    emoji: '👗',
    description: 'Personal style, grooming and presentation.',
    goal: 'Improve my personal style',
    active: false,
  },
  {
    slug: 'mental-wellness',
    name: 'Mental Wellness',
    emoji: '🧠',
    description:
      'General wellbeing coaching. Not therapy and not clinical care.',
    goal: 'Look after my wellbeing',
    active: false,
  },
]

export const ACTIVE_CATEGORIES = CATEGORIES.filter((c) => c.active)

export type Country = { code: string; name: string; flag: string }

/** Launch markets. Online programs are never restricted by country. */
export const COUNTRIES: Country[] = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
]

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

export function countryLabel(code: string | null | undefined) {
  if (!code) return null
  const country = COUNTRY_BY_CODE.get(code)
  return country ? `${country.flag} ${country.name}` : code
}

export const LANGUAGES = [
  'English',
  'Swahili',
  'Somali',
  'Amharic',
  'Luganda',
  'Kinyarwanda',
  'Hausa',
  'Yoruba',
  'Zulu',
  'Afrikaans',
  'French',
  'Arabic',
]

/** Units paired with each tracked metric, for display and entry forms. */
export const METRIC_META = {
  WEIGHT_KG: { label: 'Weight', unit: 'kg', higherIsBetter: false },
  STEPS: { label: 'Steps', unit: 'steps', higherIsBetter: true },
  DISTANCE_KM: { label: 'Distance', unit: 'km', higherIsBetter: true },
  WORKOUTS: { label: 'Workouts', unit: 'sessions', higherIsBetter: true },
  ACTIVE_MINUTES: { label: 'Active time', unit: 'min', higherIsBetter: true },
  WATER_LITRES: { label: 'Water', unit: 'L', higherIsBetter: true },
  HABIT_DAYS: { label: 'Habit days', unit: 'days', higherIsBetter: true },
  CUSTOM: { label: 'Custom', unit: '', higherIsBetter: true },
} as const

export const LEADERBOARD_META = {
  TOTAL: {
    label: 'Overall',
    blurb: 'Total logged towards the goal',
  },
  CONSISTENCY: {
    label: 'Most consistent',
    blurb: 'Days showed up, not size of the numbers',
  },
  STREAK: {
    label: 'Best streak',
    blurb: 'Longest run of consecutive days',
  },
  MOST_IMPROVED: {
    label: 'Most improved',
    blurb: 'Biggest change from where they started',
  },
  COMPLETION: {
    label: 'Finishers',
    blurb: 'Reached the challenge goal',
  },
} as const

/**
 * Shown wherever coaching could be mistaken for clinical care. Coaches are not
 * licensed practitioners unless a credential has actually been verified.
 */
export const HEALTH_DISCLAIMER =
  'Coaching on CoachHub is general wellness guidance, not medical, nutritional or psychological treatment. Speak to a licensed professional about symptoms, diagnoses, medication or a health condition.'
