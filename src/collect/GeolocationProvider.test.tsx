import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGeolocation } from './geolocation-context'
import { GeolocationProvider } from './GeolocationProvider'

type Success = (position: GeolocationPosition) => void
type Failure = (error: GeolocationPositionError) => void

function mockGeolocation() {
  const handlers: { success?: Success; failure?: Failure } = {}
  const geolocation = {
    watchPosition: vi.fn((success: Success, failure: Failure) => {
      handlers.success = success
      handlers.failure = failure
      return 1
    }),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  }
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
  return { geolocation, handlers }
}

function Probe() {
  const { status, position, request } = useGeolocation()
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="position">{position ? `${position.latitude},${position.longitude},${position.accuracy}` : ''}</p>
      <button type="button" onClick={request}>
        retry
      </button>
    </div>
  )
}

const error = (code: number) =>
  ({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' }) as GeolocationPositionError

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
})

describe('GeolocationProvider', () => {
  it('demande la position dès l’ouverture et la suit', () => {
    const { geolocation, handlers } = mockGeolocation()
    render(
      <GeolocationProvider>
        <Probe />
      </GeolocationProvider>,
    )
    expect(geolocation.watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 30000,
    })
    expect(screen.getByTestId('status')).toHaveTextContent('locating')
    act(() =>
      handlers.success!({ coords: { latitude: 5.28, longitude: 9.98, accuracy: 7 }, timestamp: 1 } as GeolocationPosition),
    )
    expect(screen.getByTestId('status')).toHaveTextContent('ready')
    expect(screen.getByTestId('position')).toHaveTextContent('5.28,9.98,7')
  })

  it('signale un refus et permet de relancer la demande', () => {
    const { geolocation, handlers } = mockGeolocation()
    render(
      <GeolocationProvider>
        <Probe />
      </GeolocationProvider>,
    )
    act(() => handlers.failure!(error(1)))
    expect(screen.getByTestId('status')).toHaveTextContent('denied')
    act(() => screen.getByRole('button', { name: 'retry' }).click())
    expect(screen.getByTestId('status')).toHaveTextContent('locating')
    expect(geolocation.clearWatch).toHaveBeenCalledWith(1)
    expect(geolocation.watchPosition).toHaveBeenCalledTimes(2)
  })

  it('garde la dernière position lors d’une perte passagère du signal', () => {
    const { handlers } = mockGeolocation()
    render(
      <GeolocationProvider>
        <Probe />
      </GeolocationProvider>,
    )
    act(() =>
      handlers.success!({ coords: { latitude: 5.3, longitude: 9.9, accuracy: 20 }, timestamp: 1 } as GeolocationPosition),
    )
    act(() => handlers.failure!(error(2)))
    expect(screen.getByTestId('status')).toHaveTextContent('ready')
    expect(screen.getByTestId('position')).toHaveTextContent('5.3,9.9,20')
  })

  it('indique un navigateur sans géolocalisation', () => {
    render(
      <GeolocationProvider>
        <Probe />
      </GeolocationProvider>,
    )
    expect(screen.getByTestId('status')).toHaveTextContent('unsupported')
  })
})
