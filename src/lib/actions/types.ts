import { ForbiddenError } from '@/lib/dal'

/**
 * Shape returned by every Server Action, so forms can drive `useActionState`
 * uniformly: field-level errors for validation, a single message for anything
 * else, and an optional success flag.
 */
export type ActionState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string[]>
} | null

/**
 * Converts a thrown error into an ActionState.
 *
 * `redirect()` and `notFound()` work by throwing, so those must be rethrown or
 * navigation silently turns into an error message.
 */
export function toActionError(error: unknown): ActionState {
  if (isNextControlFlowError(error)) throw error

  if (error instanceof ForbiddenError) {
    return { ok: false, message: error.message }
  }

  console.error('[action]', error)
  return {
    ok: false,
    message: 'Something went wrong. Please try again.',
  }
}

function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    ((error as { digest: string }).digest.startsWith('NEXT_REDIRECT') ||
      (error as { digest: string }).digest === 'NEXT_HTTP_ERROR_FALLBACK;404')
  )
}

/** Flattens a Zod error into the ActionState error shape. */
export function fieldErrors(
  flattened: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(flattened)) {
    if (value?.length) result[key] = value
  }
  return result
}
