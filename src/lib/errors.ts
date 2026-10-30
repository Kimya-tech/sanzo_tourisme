// Traduit les erreurs Supabase (Auth, PostgREST, fonctions RPC) en clés i18n.

export type ErrorKey =
  | 'errors.generic'
  | 'errors.network'
  | 'errors.forbidden'
  | 'errors.invalidCode'
  | 'errors.tooManyAttempts'
  | 'errors.collectDisabled'
  | 'errors.collectorDisabled'
  | 'errors.invalidName'
  | 'errors.invalidData'
  | 'errors.rateLimited'

interface ErrorLike {
  message?: unknown
  code?: unknown
  name?: unknown
}

const RPC_MESSAGES: Record<string, ErrorKey> = {
  too_many_attempts: 'errors.tooManyAttempts',
  collector_disabled: 'errors.collectorDisabled',
  invalid_name: 'errors.invalidName',
}

const CODES: Record<string, ErrorKey> = {
  '42501': 'errors.forbidden',
  '23514': 'errors.invalidData',
  '23502': 'errors.invalidData',
  '22P02': 'errors.invalidData',
  over_request_rate_limit: 'errors.rateLimited',
  anonymous_provider_disabled: 'errors.collectDisabled',
}

export function errorKey(error: unknown): ErrorKey {
  const e: ErrorLike = typeof error === 'object' && error !== null ? (error as ErrorLike) : {}
  const message = typeof e.message === 'string' ? e.message : ''
  const code = typeof e.code === 'string' ? e.code : ''

  if (message in RPC_MESSAGES) return RPC_MESSAGES[message] as ErrorKey
  if (code in CODES) return CODES[code] as ErrorKey
  if (e.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|load failed/i.test(message)) {
    return 'errors.network'
  }
  return 'errors.generic'
}
