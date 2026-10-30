import { describe, expect, it } from 'vitest'
import { formatIsoDate, parseIsoDate, todayIso } from './dates'

describe('dates', () => {
  it('lit une date AAAA-MM-JJ en heure locale', () => {
    const date = parseIsoDate('2026-10-03')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(3)
    expect(parseIsoDate('03/10/2026')).toBeNull()
  })

  it('formate selon la langue', () => {
    expect(formatIsoDate('2026-10-03', 'fr')).toBe('3 octobre 2026')
    expect(formatIsoDate('2026-10-03', 'en')).toBe('October 3, 2026')
    expect(formatIsoDate('n/a', 'fr')).toBe('n/a')
  })

  it('donne la date du jour locale', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})
