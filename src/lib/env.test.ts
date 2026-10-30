import { describe, expect, it } from 'vitest'
import { isSecretSupabaseKey, readPublicEnv } from './env'

function fakeJwt(payload: object): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('readPublicEnv', () => {
  it('lit l’URL et la clé publique', () => {
    expect(
      readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc' }),
    ).toEqual({ supabaseUrl: 'https://x.supabase.co', supabasePublishableKey: 'sb_publishable_abc' })
  })

  it('accepte l’ancienne variable VITE_SUPABASE_ANON_KEY', () => {
    const anon = fakeJwt({ role: 'anon' })
    expect(readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: anon })).toEqual({
      supabaseUrl: 'https://x.supabase.co',
      supabasePublishableKey: anon,
    })
  })

  it('échoue si une variable manque', () => {
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toThrow(/Configuration manquante/)
  })

  it('échoue si l’URL est invalide', () => {
    expect(() => readPublicEnv({ VITE_SUPABASE_URL: 'pas une url', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_a' })).toThrow(
      /URL valide/,
    )
  })

  it('refuse une clé secrète ou service_role', () => {
    expect(() =>
      readPublicEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' }),
    ).toThrow(/clé secrète/)
    expect(() =>
      readPublicEnv({
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_ANON_KEY: fakeJwt({ role: 'service_role' }),
      }),
    ).toThrow(/clé secrète/)
  })
})

describe('isSecretSupabaseKey', () => {
  it('distingue les clés publiques des clés secrètes', () => {
    expect(isSecretSupabaseKey('sb_publishable_abc')).toBe(false)
    expect(isSecretSupabaseKey(fakeJwt({ role: 'anon' }))).toBe(false)
    expect(isSecretSupabaseKey(fakeJwt({ role: 'service_role' }))).toBe(true)
    expect(isSecretSupabaseKey('sb_secret_abc')).toBe(true)
    expect(isSecretSupabaseKey('a.!!!.c')).toBe(false)
  })
})
