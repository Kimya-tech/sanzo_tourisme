import { describe, expect, it } from 'vitest'
import { errorKey } from './errors'

describe('errorKey', () => {
  it('traduit les codes des fonctions SQL', () => {
    expect(errorKey({ message: 'too_many_attempts', code: 'P0001' })).toBe('errors.tooManyAttempts')
    expect(errorKey({ message: 'collector_disabled', code: '42501' })).toBe('errors.collectorDisabled')
    expect(errorKey({ message: 'invalid_name', code: 'P0001' })).toBe('errors.invalidName')
  })

  it('traduit les refus de sécurité et les données invalides', () => {
    expect(errorKey({ message: 'new row violates row-level security policy', code: '42501' })).toBe(
      'errors.forbidden',
    )
    expect(errorKey({ message: 'violates check constraint', code: '23514' })).toBe('errors.invalidData')
  })

  it('traduit les erreurs d’authentification anonyme', () => {
    expect(errorKey({ code: 'over_request_rate_limit' })).toBe('errors.rateLimited')
    expect(errorKey({ code: 'anonymous_provider_disabled' })).toBe('errors.collectDisabled')
  })

  it('détecte les erreurs réseau et retombe sur un message générique', () => {
    expect(errorKey(new TypeError('Failed to fetch'))).toBe('errors.network')
    expect(errorKey({ name: 'AuthRetryableFetchError', message: '' })).toBe('errors.network')
    expect(errorKey('???')).toBe('errors.generic')
    expect(errorKey(null)).toBe('errors.generic')
  })
})
