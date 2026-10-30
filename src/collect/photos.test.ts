import { describe, expect, it } from 'vitest'
import { THUMB_SIZE, computeTargetSize } from './photos'

describe('computeTargetSize', () => {
  it('réduit le côté le plus long à 1600 px en conservant les proportions', () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(computeTargetSize(3024, 4032)).toEqual({ width: 1200, height: 1600 })
  })

  it('n’agrandit jamais une petite image', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('calcule la taille des miniatures (480 px)', () => {
    expect(computeTargetSize(4000, 3000, THUMB_SIZE)).toEqual({ width: 480, height: 360 })
  })

  it('refuse des dimensions invalides', () => {
    expect(() => computeTargetSize(0, 100)).toThrow()
  })
})
